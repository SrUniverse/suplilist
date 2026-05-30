export function render() {
  return `
    <div class="page" style="padding: 24px; display: flex; flex-direction: column; gap: 20px;">
      <header>
        <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 4px;">Meu Stack</h1>
        <p style="color: var(--color-text-secondary); font-size: 14px;">Gerencie seus suplementos e doses ativas.</p>
      </header>

      <section style="display: flex; flex-direction: column; gap: 16px; width: 100%;">
        <div class="card" style="background: var(--color-surface-primary); border: 1px solid var(--color-border); padding: 20px; border-radius: 16px;">
          <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
            <span>Creatina Monohidratada</span>
            <span style="font-size: 13px; font-weight: 500; padding: 4px 8px; border-radius: 6px; background: rgba(124, 58, 237, 0.15); color: var(--color-brand);">Ativo</span>
          </h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px; color: var(--color-text-secondary); margin-bottom: 12px;">
            <div>Dose diária: <strong style="color: var(--color-text-primary)">5g</strong></div>
            <div>Horário: <strong style="color: var(--color-text-primary)">Pós-treino</strong></div>
            <div>Dias restantes: <strong style="color: var(--color-text-primary)">18 dias</strong></div>
          </div>
          <div style="height: 6px; background: var(--color-border); border-radius: 3px; overflow: hidden; margin-bottom: 8px;">
            <div style="height: 100%; width: 70%; background: var(--color-brand); border-radius: 3px;"></div>
          </div>
          <div style="font-size: 11px; color: var(--color-text-secondary); text-align: right;">70% restante no pote</div>
        </div>
      </section>
    </div>
  `;
}
