/**
 * HistoryPage v4.0 — SupliList
 * Componente de página para exibir o histórico de check-ins e constância.
 */

export default class HistoryPage {
  /**
   * @param {HTMLElement} container - O elemento de montagem
   */
  constructor(container) {
    this.container = container;
  }

  async mount() {
    this.container.innerHTML = `
      <div class="page" style="padding: 24px; display: flex; flex-direction: column; gap: 20px;">
        <header>
          <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 4px;">Histórico de Check-ins</h1>
          <p style="color: var(--color-text-secondary); font-size: 14px;">Acompanhe sua constância de suplementação ao longo do tempo.</p>
        </header>

        <section class="card" style="background: var(--color-surface-primary); border: 1px solid var(--color-border); padding: 24px; border-radius: 16px;">
          <p style="color: var(--color-text-secondary); font-size: 14px; line-height: 1.6; text-align: center; padding: 20px 0;">
            Seu calendário de check-ins e gráficos de consistência semanal/mensal aparecerão aqui.
          </p>
        </section>
      </div>
    `;
  }

  unmount() {
    console.log('[HistoryPage] Unmounted');
  }
}
