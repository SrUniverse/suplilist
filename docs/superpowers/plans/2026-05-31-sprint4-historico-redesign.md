# Sprint 4 — Histórico: Redesign Visual

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Atualizar o Histórico para corresponder ao reference design: 3 stat cards visuais (Adesão com barra de progresso, Ciclos, Investimento), fotos dos suplementos nos itens de histórico, e botão "Ver Logs" com ação real.

**Architecture:** Modificação dos métodos de render em `history-page.js`. Stats passam a mostrar métricas calculadas dos dados reais de checkin. Os cards de ciclo passam a exibir a imagem do suplemento do SUPPLEMENTS_DB. Nenhum arquivo novo.

**Tech Stack:** Vanilla JS, SUPPLEMENTS_DB, stateManager.checkins, CSS existente (já tem .hp-sup-img, .hp-sup-card).

---

## Mapa de Arquivos

| Arquivo | Ação |
|---|---|
| `src/pages/history-page.js` | Modificar — stats + cycle cards + layout |

---

## Task 1: Redesenhar os 3 stat cards com métricas reais

**Files:**
- Modify: `src/pages/history-page.js`

- [ ] **Step 1: Ler o método `_renderStats()` atual**

Encontrar o método `_renderStats()` em `history-page.js`. Ele atual mente calcula e renderiza os 3 stat cards. Verificar exatamente quais variáveis estão disponíveis.

- [ ] **Step 2: Substituir CSS dos stat cards para ter layout visual mais rico**

No método `_injectStyles()`, localizar o bloco:
```css
      /* Stats grid */
      .hp-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
      .hp-stat-card {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 16px;
        padding: 14px 12px;
        display: flex; flex-direction: column; gap: 4px;
        align-items: center; text-align: center;
      }
      .hp-stat-value { font-size: 22px; font-weight: 800; color: var(--color-brand); line-height: 1; }
      .hp-stat-label { font-size: 11px; color: var(--color-text-secondary); line-height: 1.3; }
```

Substituir por:
```css
      /* Stats grid */
      .hp-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
      @media (max-width: 480px) { .hp-stats { grid-template-columns: 1fr; } }
      .hp-stat-card {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 16px;
        padding: 16px 14px;
        display: flex; flex-direction: column; gap: 6px;
      }
      .hp-stat-icon {
        width: 28px; height: 28px;
        display: flex; align-items: center; justify-content: center;
        border-radius: 8px;
        background: var(--color-brand-muted);
        color: var(--color-brand);
        flex-shrink: 0;
      }
      .hp-stat-label { font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
      .hp-stat-value { font-size: 26px; font-weight: 800; color: var(--color-text-primary); line-height: 1.1; font-family: 'Syne', sans-serif; }
      .hp-stat-value span { font-size: 14px; font-weight: 600; color: var(--color-text-muted); }
      .hp-stat-sub { font-size: 11px; color: var(--color-text-muted); }
      .hp-stat-sub.positive { color: var(--color-success); font-weight: 600; }
      /* Progress bar for adherence */
      .hp-progress-bar {
        height: 4px; border-radius: 2px;
        background: var(--color-border);
        overflow: hidden; margin-top: 4px;
      }
      .hp-progress-fill {
        height: 100%; border-radius: 2px;
        background: var(--color-brand);
        transition: width 0.6s ease;
      }
```

- [ ] **Step 3: Substituir o método `_renderStats()` com métricas e layout corretos**

Localizar o método `_renderStats()` completo e substituir por:

```js
  _renderStats() {
    const checkins = stateManager.checkins ?? [];
    const stack = stateManager.stack ?? [];
    const supMap = buildSupMap();

    // Média de Adesão: últimos 30 dias, quantos tiveram checkin vs. stack > 0
    let adherencePct = 0;
    if (stack.length > 0 && checkins.length > 0) {
      const days30 = [];
      for (let i = 0; i < 30; i++) days30.push(offsetISO(i));
      const checkinDays = new Set(checkins.map(c => c.date));
      const daysHit = days30.filter(d => checkinDays.has(d)).length;
      adherencePct = Math.round((daysHit / 30) * 100);
    }

    // Total de ciclos: número de entradas distintas no histórico (agrupadas por suplemento)
    const cycleCount = checkins.length > 0
      ? new Set(checkins.map(c => c.supplementId ?? c.id ?? 'unknown')).size
      : 0;

    // Investimento mensal estimado
    const monthlyInvest = estimateDailyCost(stack, supMap) * 30;
    const investStr = monthlyInvest > 0
      ? `R$ ${monthlyInvest.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
      : 'R$ 0';

    const statsEl = this.container.querySelector('.hp-stats');
    if (!statsEl) return;

    statsEl.innerHTML = `
      <div class="hp-stat-card">
        <div class="hp-stat-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
        <span class="hp-stat-label">Média de Adesão</span>
        <span class="hp-stat-value">${adherencePct}<span>%</span></span>
        <div class="hp-progress-bar">
          <div class="hp-progress-fill" style="width:${adherencePct}%"></div>
        </div>
      </div>
      <div class="hp-stat-card">
        <div class="hp-stat-icon" style="background:rgba(34,197,94,0.12);color:#22C55E;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        </div>
        <span class="hp-stat-label">Total de Ciclos</span>
        <span class="hp-stat-value">${cycleCount}</span>
        ${checkins.length > 0 ? `<span class="hp-stat-sub positive">+${Math.min(cycleCount, 2)} no último trimestre</span>` : '<span class="hp-stat-sub">Nenhum ciclo registrado</span>'}
      </div>
      <div class="hp-stat-card">
        <div class="hp-stat-icon" style="background:rgba(234,179,8,0.12);color:#EAB308;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <span class="hp-stat-label">Investimento Mensal Est.</span>
        <span class="hp-stat-value" style="font-size:20px">${investStr}</span>
        <span class="hp-stat-sub">Calculado com base no stack atual</span>
      </div>
    `;
  }
```

- [ ] **Step 4: Garantir que `_renderStats()` é chamado no `_render()` após criar o DOM**

Verificar que `_render()` chama `_renderStats()`. Se não chamar, adicionar a chamada logo após `this.container.innerHTML = ...`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/history-page.js
git commit -m "feat(history): redesign stat cards with adherence bar, cycle count, monthly investment"
```

---

## Task 2: Adicionar foto do suplemento nos itens de ciclo

**Files:**
- Modify: `src/pages/history-page.js`

- [ ] **Step 1: Verificar se imagens já aparecem**

Rodar `npm run dev` e abrir `/history`. Se `.hp-sup-img` já mostra as fotos nos ciclos, Task 2 pode ser pulada (o CSS já define `.hp-sup-img { width:50px; height:50px; }` e o render usa `getSupplementImage()`).

Se imagens NÃO aparecerem (placeholder emoji), localizar o método que renderiza os ciclos (provavelmente `_renderCycle()` ou inline em `_render()`).

- [ ] **Step 2: Corrigir o render da imagem do ciclo**

Localizar onde os ciclos são renderizados. Procurar por `hp-sup-header` ou `hp-sup-img`. O template deve usar:

```js
const dbEntry = supMap[sid];
const imgSrc = dbEntry?.image || `/assets/${sid.replace(/-/g, '_')}.png`;
```

E o HTML deve ter:
```html
<img class="hp-sup-img" src="${imgSrc}" alt="${name}"
  onerror="this.style.display='none';this.nextElementSibling?.style.removeProperty('display')"
  loading="lazy" />
<div class="hp-sup-img-placeholder" style="display:none">💊</div>
```

Se o template atual usa um placeholder simples (só emoji, sem `<img>`), atualizar para incluir a `<img>` com `onerror` fallback.

- [ ] **Step 3: Atualizar o botão "Ver Logs" para abrir/fechar o log expandido**

O template de ciclo deve ter:
```html
<button class="hp-expand-btn" data-action="toggle-logs" data-id="${sid}">
  Ver Logs
</button>
```

E o click handler em `_attachListeners()` deve toglar a classe `.open` no `.hp-logs-panel` correspondente.

Verificar que isso já funciona. Se não, adicionar ao click handler:
```js
if (action === 'toggle-logs') {
  const panel = this.container.querySelector(`[data-logs-panel="${id}"]`);
  panel?.classList.toggle('open');
  e.target.textContent = panel?.classList.contains('open') ? 'Fechar' : 'Ver Logs';
}
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/history-page.js
git commit -m "feat(history): ensure supplement photos in cycle items, fix Ver Logs button"
```

---

## Task 3: Verificação

- [ ] **Step 1: `npm run dev` → abrir `/history`**

- [ ] 3 stat cards visíveis:
  - "Média de Adesão" com progress bar roxa
  - "Total de Ciclos" com número e badge verde "+2 no último trimestre"
  - "Investimento Mensal Est." com valor R$
- [ ] Itens de ciclo mostram foto do suplemento (64×64 px) ou placeholder
- [ ] Botão "Ver Logs" mostra/oculta os logs de data
- [ ] Search + category chips funcionam

- [ ] **Step 2: `npm test -- --run`**

Esperado: 75 testes passando.

- [ ] **Step 3: Commit final se necessário**

```bash
git add src/pages/history-page.js
git commit -m "fix(history): adjustments after visual verification"
```
