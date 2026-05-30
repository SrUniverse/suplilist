/**
 * SupplementDetailPage v4.0 — SupliList
 * Componente de página para exibição detalhada de um suplemento específico.
 */

export default class SupplementDetailPage {
  /**
   * @param {HTMLElement} container - O elemento de montagem
   */
  constructor(container) {
    this.container = container;
  }

  async mount() {
    const hash = window.location.hash;
    const segments = hash.split('/');
    const supplementId = segments[segments.length - 1] || 'desconhecido';

    this.container.innerHTML = `
      <div class="page" style="padding: 24px; display: flex; flex-direction: column; gap: 20px;">
        <header>
          <a href="#/list" style="color: var(--color-primary); font-size: 14px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; margin-bottom: 12px; font-weight: 500;">
            ← Voltar para o Catálogo
          </a>
          <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 4px;">Detalhes do Suplemento</h1>
          <p style="color: var(--color-text-secondary); font-size: 14px;">Identificador carregado: <strong id="detail-supplement-id"></strong></p>
        </header>

        <section class="card" style="background: var(--color-surface-primary); border: 1px solid var(--color-border); padding: 24px; border-radius: 16px;">
          <p style="color: var(--color-text-secondary); font-size: 14px; line-height: 1.6;">
            A análise clínica, evidências científicas e o comparador de preços dinâmicos em Shopee, Mercado Livre e Amazon estarão disponíveis aqui.
          </p>
        </section>
      </div>
    `;

    // textContent nunca interpreta HTML — XSS impossível independente do valor
    const idEl = this.container.querySelector('#detail-supplement-id');
    if (idEl) idEl.textContent = supplementId;
  }

  unmount() {
    console.log('[SupplementDetailPage] Unmounted');
  }
}
