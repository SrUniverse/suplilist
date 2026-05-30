/**
 * OnboardingPage v4.0 — SupliList
 * Componente de página para onboarding de novos usuários.
 */

export default class OnboardingPage {
  /**
   * @param {HTMLElement} container - O elemento de montagem
   */
  constructor(container) {
    this.container = container;
  }

  async mount() {
    this.container.innerHTML = `
      <div class="page" style="padding: 24px; display: flex; flex-direction: column; gap: 24px; max-width: 480px; margin: 0 auto; min-height: 80dvh; justify-content: center;">
        <header style="text-align: center;">
          <div style="font-size: 40px; margin-bottom: 12px;">🌿</div>
          <h1 style="font-size: 26px; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 8px;">Bem-vindo ao SupliList</h1>
          <p style="color: var(--color-text-secondary); font-size: 14px; line-height: 1.5;">O sistema operacional de suplementação inteligente de altíssima performance.</p>
        </header>

        <section class="card" style="background: var(--color-surface-primary); border: 1px solid var(--color-border); padding: 24px; border-radius: 20px; display: flex; flex-direction: column; gap: 16px;">
          <p style="color: var(--color-text-secondary); font-size: 13px; line-height: 1.6; text-align: center;">
            Vamos personalizar seu perfil com base no seu objetivo e biologia. Seus dados estão 100% seguros e salvos localmente.
          </p>
          <button id="btn-onboarding-start" class="btn btn-primary" style="background: var(--color-primary); color: white; border: none; padding: 14px 20px; border-radius: 12px; font-weight: 700; font-size: 14px; cursor: pointer; transition: background 0.2s; width: 100%;">
            Iniciar Configuração
          </button>
        </section>
      </div>
    `;

    const startBtn = this.container.querySelector('#btn-onboarding-start');
    if (startBtn) {
      startBtn.addEventListener('click', () => this._completeOnboarding());
    }
  }

  async _completeOnboarding() {
    try {
      const { stateManager, ACTIONS } = await import('../state/state-manager.js');
      // Marcar onboarding como concluído no estado global
      stateManager.dispatch({
        type: ACTIONS.COMPLETE_ONBOARDING
      });
      // Ir para a Home
      window.location.hash = '/home';
    } catch (e) {
      console.warn('[OnboardingPage] Erro ao completar onboarding:', e);
      window.location.hash = '/home';
    }
  }

  unmount() {
    console.log('[OnboardingPage] Unmounted');
  }
}
