/**
 * SubscriptionResultPage — landing for Stripe Hosted Checkout redirects.
 *
 * Handles both outcomes based on the current route:
 *   /subscription/success — payment completed; re-fetch the profile so the
 *     tier granted by the Stripe webhook lands in app state.
 *   /subscription/cancel  — user abandoned checkout; gentle return path.
 *
 * The webhook may take a few seconds to process after redirect, so success
 * polls /api/profile/me a few times before declaring the tier active.
 */
import { stateManager, ACTIONS } from '../../state/state-manager.js';
import { apiFetch } from '../../platform/api-client.js';
import { logger } from '../../utils/logger.js';

const POLL_ATTEMPTS = 6;
const POLL_INTERVAL_MS = 2000;

export default class SubscriptionResultPage {
  constructor(container, params) {
    this.container = container;
    this.params = params || {};
    this._disposed = false;
  }

  async mount() {
    this._injectStyles();
    const isSuccess = window.location.pathname.startsWith('/subscription/success');

    if (!isSuccess) {
      this._renderCancel();
      return;
    }

    this._renderPending();
    await this._confirmUpgrade();
  }

  unmount() {
    this._disposed = true;
    this.container.innerHTML = '';
  }

  /** Poll the profile until the webhook has applied the new tier. */
  async _confirmUpgrade() {
    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
      if (this._disposed) return;
      try {
        const profile = await apiFetch('/api/profile/me');
        const tier = profile?.tier;
        if (tier === 'pro' || tier === 'elite') {
          stateManager.dispatch(ACTIONS.SET_TIER, { tier });
          this._renderSuccess(tier);
          return;
        }
      } catch (error) {
        logger.warn('[SubscriptionResult] Profile poll failed:', error);
      }
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
      if (this._disposed) return;
    }
    if (!this._disposed) this._renderSlow();
  }

  _renderPending() {
    this.container.innerHTML = `
      <div class="subr-wrap">
        <div class="subr-card">
          <div class="subr-spinner" role="status" aria-label="Confirmando pagamento"></div>
          <h1 class="subr-title">Confirmando seu pagamento…</h1>
          <p class="subr-text">Estamos ativando sua assinatura. Isso leva só alguns segundos.</p>
        </div>
      </div>`;
  }

  _renderSuccess(tier) {
    const planName = tier === 'elite' ? 'ELITE' : 'PRO';
    this.container.innerHTML = `
      <div class="subr-wrap">
        <div class="subr-card subr-card--success">
          <div class="subr-icon" aria-hidden="true">✓</div>
          <span class="subr-badge">ASSINATURA ATIVA</span>
          <h1 class="subr-title">Bem-vindo ao SupliList ${planName}!</h1>
          <p class="subr-text">Seu plano está ativo. Histórico avançado, relatórios e experiência sem anúncios já estão liberados.</p>
          <a class="subr-btn" href="/my-stack" data-link>Ir para meu Stack →</a>
        </div>
      </div>`;
    this._bindNav();
  }

  _renderSlow() {
    this.container.innerHTML = `
      <div class="subr-wrap">
        <div class="subr-card">
          <div class="subr-icon subr-icon--wait" aria-hidden="true">⏱</div>
          <h1 class="subr-title">Pagamento recebido</h1>
          <p class="subr-text">A ativação está demorando um pouco mais que o normal. Sua assinatura será aplicada automaticamente em instantes — você pode continuar usando o app.</p>
          <a class="subr-btn" href="/my-stack" data-link>Continuar →</a>
        </div>
      </div>`;
    this._bindNav();
  }

  _renderCancel() {
    this.container.innerHTML = `
      <div class="subr-wrap">
        <div class="subr-card">
          <div class="subr-icon subr-icon--cancel" aria-hidden="true">✕</div>
          <h1 class="subr-title">Pagamento cancelado</h1>
          <p class="subr-text">Sem problemas — nada foi cobrado. Você pode assinar quando quiser nas Configurações.</p>
          <a class="subr-btn subr-btn--ghost" href="/settings" data-link>Ver planos</a>
          <a class="subr-btn" href="/my-stack" data-link>Voltar ao app →</a>
        </div>
      </div>`;
    this._bindNav();
  }

  _bindNav() {
    this.container.querySelectorAll('a[data-link]').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        window.history.pushState(null, null, a.getAttribute('href'));
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
    });
  }

  _injectStyles() {
    if (document.getElementById('subr-styles')) return;
    const style = document.createElement('style');
    style.id = 'subr-styles';
    style.textContent = `
      .subr-wrap {
        min-height: 70vh;
        display: flex; align-items: center; justify-content: center;
        padding: 24px;
      }
      .subr-card {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-2xl, 24px);
        box-shadow: var(--shadow-elevated, 0 16px 48px -12px rgba(0,0,0,0.4));
        max-width: 440px; width: 100%;
        padding: 40px 32px;
        display: flex; flex-direction: column; align-items: center; gap: 14px;
        text-align: center;
      }
      .subr-card--success { border-color: var(--color-border-brand, rgba(139,92,246,0.3)); }
      .subr-icon {
        width: 64px; height: 64px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 28px; font-weight: 800;
        background: var(--color-brand-muted, rgba(139,92,246,0.12));
        color: var(--color-brand, #8B5CF6);
      }
      .subr-icon--cancel { background: rgba(148,163,184,0.12); color: var(--color-text-secondary); }
      .subr-icon--wait { background: rgba(251,191,36,0.12); color: var(--ev-b, #FBBF24); }
      .subr-badge {
        font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
        color: var(--color-brand, #8B5CF6);
        background: var(--color-brand-muted, rgba(139,92,246,0.12));
        border: 1px solid var(--color-border-brand, rgba(139,92,246,0.3));
        padding: 4px 10px; border-radius: 6px;
      }
      .subr-title {
        font-size: 22px; font-weight: 800; letter-spacing: -0.02em;
        color: var(--color-text-primary); margin: 0;
      }
      .subr-text {
        font-size: 14px; line-height: 1.6;
        color: var(--color-text-secondary); margin: 0;
      }
      .subr-btn {
        display: inline-block; width: 100%;
        padding: 12px 20px; margin-top: 6px;
        background: var(--color-brand, #8B5CF6); color: #fff;
        border-radius: var(--radius-md, 10px);
        font-size: 14px; font-weight: 600; text-decoration: none;
        transition: background 0.15s ease;
      }
      .subr-btn:hover { background: var(--color-brand-hover, #7C3AED); }
      .subr-btn--ghost {
        background: transparent; color: var(--color-brand, #8B5CF6);
        border: 1px solid var(--color-border-brand, rgba(139,92,246,0.3));
      }
      .subr-btn--ghost:hover { background: var(--color-brand-muted, rgba(139,92,246,0.12)); }
      .subr-spinner {
        width: 44px; height: 44px; border-radius: 50%;
        border: 3px solid var(--color-brand-muted, rgba(139,92,246,0.15));
        border-top-color: var(--color-brand, #8B5CF6);
        animation: subr-spin 0.8s linear infinite;
      }
      @keyframes subr-spin { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) {
        .subr-spinner { animation: none; }
      }
    `;
    document.head.appendChild(style);
  }
}
