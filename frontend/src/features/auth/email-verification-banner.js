/**
 * email-verification-banner.js — Lembrete global de verificação de e-mail.
 *
 * A verificação por e-mail é OPCIONAL (não bloqueia o app — ver
 * [[verify-email-page]]). Este banner aparece no topo quando o usuário está
 * autenticado mas com o e-mail ainda não verificado, levando-o a /verify-email.
 *
 * Pode ser dispensado por sessão (sessionStorage) para não ser intrusivo;
 * reaparece em uma nova sessão enquanto o e-mail não for confirmado.
 *
 * @module features/auth/email-verification-banner
 */

import { stateManager } from '../../state/state-manager.js';
import { eventBus, EVENTS } from '../../core/event-bus.js';


const DISMISS_KEY = 'suplilist:emailBannerDismissed';
const BANNER_ID = 'email-verification-banner';

function shouldShow() {
  if (sessionStorage.getItem(DISMISS_KEY)) return false;
  const user = stateManager.get('user');
  return !!(user?.isAuthenticated && user.emailVerified === false);
}

function removeBanner() {
  document.getElementById(BANNER_ID)?.remove();
  document.body.classList.remove('has-email-banner');
}

function renderBanner() {
  if (document.getElementById(BANNER_ID)) return;

  const bar = document.createElement('div');
  bar.id = BANNER_ID;
  bar.setAttribute('role', 'status');
  bar.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:1200',
    'display:flex', 'align-items:center', 'justify-content:center', 'gap:0.75rem',
    'padding:0.6rem 1rem', 'font-size:0.875rem', 'text-align:center',
    'background:var(--color-brand,#8b5cf6)', 'color:#fff',
    'box-shadow:0 2px 10px rgba(0,0,0,0.25)',
  ].join(';');

  bar.innerHTML = `
    <span style="opacity:0.95;">Confirme seu e-mail para proteger sua conta e habilitar a recuperação de acesso.</span>
    <button id="evb-verify" type="button" style="text-decoration:none;background:#fff;color:var(--color-brand,#8b5cf6);border:none;border-radius:6px;padding:0.35rem 0.8rem;font-weight:700;cursor:pointer;white-space:nowrap;display:inline-block;">Verificar agora</button>
    <button id="evb-dismiss" type="button" aria-label="Dispensar" style="background:transparent;border:none;color:#fff;font-size:1.1rem;line-height:1;cursor:pointer;padding:0.25rem 0.4rem;">×</button>
  `;

  document.body.prepend(bar);
  document.body.classList.add('has-email-banner');

  bar.querySelector('#evb-verify')?.addEventListener('click', () => {
    eventBus.emit(EVENTS.ROUTER_NAVIGATE, { path: '/verify-email' });
  });

  bar.querySelector('#evb-dismiss')?.addEventListener('click', () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    removeBanner();
  });
}

function sync() {
  if (shouldShow()) renderBanner();
  else removeBanner();
}

/**
 * Inicializa o banner: avalia o estado atual e reage a mudanças de auth.
 * Idempotente — seguro chamar uma vez no boot.
 */
export function initEmailVerificationBanner() {
  sync();
  // Reage a login/logout e à transição emailVerified false→true.
  stateManager.subscribe(() => sync());
}
