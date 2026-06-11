// Stub de firebase/auth para testes — sem rede, sem validação de API key.
import { vi } from 'vitest';

const authInstance = {
  currentUser: null,
  authStateReady: vi.fn(() => Promise.resolve()),
  onAuthStateChanged: vi.fn((cb) => {
    if (typeof cb === 'function') cb(null);
    return () => {};
  }),
  signOut: vi.fn(() => Promise.resolve()),
};

export function getAuth() {
  return authInstance;
}

export const onAuthStateChanged = vi.fn((auth, cb) => {
  if (typeof cb === 'function') cb(null);
  return () => {};
});

export const signInWithEmailAndPassword = vi.fn(() =>
  Promise.resolve({ user: { uid: 'test-uid', email: 'test@test.com', getIdToken: () => Promise.resolve('test-token') } })
);

export const createUserWithEmailAndPassword = vi.fn(() =>
  Promise.resolve({ user: { uid: 'test-uid', email: 'test@test.com', getIdToken: () => Promise.resolve('test-token') } })
);

export const signInWithCredential = vi.fn(() =>
  Promise.resolve({ user: { uid: 'test-uid', email: 'test@test.com', getIdToken: () => Promise.resolve('test-token') } })
);

export const signOut = vi.fn(() => Promise.resolve());
export const sendPasswordResetEmail = vi.fn(() => Promise.resolve());
export const confirmPasswordReset = vi.fn(() => Promise.resolve());
export const sendEmailVerification = vi.fn(() => Promise.resolve());
export const signInWithPopup = vi.fn(() =>
  Promise.resolve({ user: { uid: 'test-uid', email: 'test@test.com', getIdToken: () => Promise.resolve('test-token') } })
);

export class GoogleAuthProvider {
  static credential() {
    return { providerId: 'google.com' };
  }
  static credentialFromResult() {
    return { accessToken: 'test-access-token' };
  }
  addScope() {}
  setCustomParameters() {}
}
