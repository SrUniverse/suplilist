/**
 * identity-service.js — Session Orchestrator for SupliList.
 */

import { apiFetch } from './api-client.js';
import { stateManager, ACTIONS, STORAGE_KEY } from '../state/state-manager.js';
import { eventBus, EVENTS } from '../core/event-bus.js';
import { logger } from '../utils/logger.js';
import { migrationService } from './migration-service.js';
import { auth, signOut, createUserWithEmailAndPassword } from '../features/auth/firebase-client.js';
import { StorageManager } from './storage-manager.js';

const API = Object.freeze({
  PROFILE:  '/api/profile/me',
  SYNC:     '/api/auth/sync'
});

const ROUTE = Object.freeze({
  ONBOARDING: '/onboarding',
  HOME:       '/home',
});

class IdentityService {
  #handlingExpiry = false;
  #initPromise = null;
  #initSettled = false;

  constructor() {
    this.#registerApocalypseListener();
  }

  isReady() {
    return this.#initPromise ?? Promise.resolve(false);
  }

  isInitializing() {
    return this.#initPromise !== null && !this.#initSettled;
  }

  initializeSession() {
    if (this.#initPromise) return this.#initPromise;

    logger.info('[IdentityService] Probing session on cold start…');
    this.#initSettled = false;

    this.#initPromise = new Promise((resolve) => {
      auth.authStateReady().then(async () => {
        if (!auth.currentUser) {
          logger.info('[IdentityService] No Firebase user found.');
          this.#initSettled = true;
          return resolve(false);
        }

        try {
          const fetchPromise = apiFetch(API.PROFILE);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Session probe timed out after 10s')), 10000)
          );
          const identity = await Promise.race([fetchPromise, timeoutPromise]);
          this.#commitLogin(identity);
          logger.info('[IdentityService] Session restored for', identity.email);

          try {
            const userId = identity.userId || identity.id;
            if (userId) {
              await migrationService.checkAndMigrate(userId, identity.migrationVersion);
            }
          } catch (migrationErr) {
            logger.error('[IdentityService] Cold start migration check failed:', migrationErr);
          }

          this.#initSettled = true;
          resolve(true);
        } catch (err) {
          logger.warn('[IdentityService] Could not fetch profile on boot, signing out.');
          await signOut(auth).catch(() => {});
          this.#commitLogout();
          this.#initSettled = true;
          resolve(false);
        }
      });
    });

    return this.#initPromise;
  }

  async register(email, password) {
    // 1. Register with Firebase
    await createUserWithEmailAndPassword(auth, email, password);
    // 2. Sync to MongoDB
    await apiFetch(API.SYNC, { method: 'POST' });
    
    // We fetch the profile immediately to log the user in locally
    const identity = await apiFetch(API.PROFILE);
    this.#commitLogin(identity);
    eventBus.emit(EVENTS.AUTH_LOGIN_SUCCESS, { user: identity });
    
    return identity;
  }

  async login(email, password) {
    // Already handled by login-page.js but keeping it for compatibility if tests call it
    // Cannot be executed cleanly here since we want to avoid circular dependencies
    throw new Error('Use Firebase Auth directly for login.');
  }

  async logout() {
    // 1. Firebase signOut
    try {
      await signOut(auth);
    } catch (e) {
      logger.warn('[IdentityService] Firebase signOut failed', e);
    }

    this.#commitLogout();
    logger.info('[IdentityService] User logged out.');
  }

  #commitLogin(identity) {
    stateManager.dispatch(ACTIONS.AUTH_LOGIN, {
      id:            identity.userId || identity.id,
      email:         identity.email,
      role:          identity.role,
      isMfaEnabled:  identity.isMfaEnabled,
      emailVerified: identity.emailVerified,
    });
  }

  #commitLogout() {
    stateManager.dispatch(ACTIONS.AUTH_LOGOUT);
    stateManager.dispatch(ACTIONS.INVALIDATE_RECOMMENDATIONS);

    // Apagar estado persistido (IndexedDB/localStorage) para não vazar dados entre sessões
    try {
      StorageManager.removeItem(STORAGE_KEY);
    } catch (_) {}

    eventBus.emit(EVENTS.AUTH_LOGOUT, null);
    eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: ROUTE.ONBOARDING });
  }

  #registerApocalypseListener() {
    eventBus.on(EVENTS.AUTH_EXPIRED, async (payload) => {
      if (this.#handlingExpiry) return;
      this.#handlingExpiry = true;

      logger.warn('[IdentityService] AUTH_EXPIRED received');
      
      try {
        await signOut(auth);
      } catch (e) { /* ignore */ }

      eventBus.emit(EVENTS.TOAST_SHOW, {
        message: 'Sua sessão expirou. Por favor, entre novamente.',
        type: 'warning',
        duration: 5000,
      });

      this.#commitLogout();

      setTimeout(() => { this.#handlingExpiry = false; }, 5000);
    });
  }
}

export const identityService = new IdentityService();
