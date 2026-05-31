# Sprint 2 — Lista: Visual Polish

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgradar visualmente a página Lista para corresponder ao reference design: stats com anéis circulares SVG e botão principal dos cards renomeado para "VER PREÇOS →".

**Architecture:** Mudanças puramente CSS + HTML dentro de `list-page.js`. Sem novos arquivos. Stats passam de 3 para 4 boxes (adicionando Evidência A). Cards perdem os dois botões (fav + stack) e ganham um botão único "VER PREÇOS →" que abre o modal já existente.

**Tech Stack:** Vanilla JS, CSS injetado via `_attachStyles()`, SVG inline.

---

## Mapa de Arquivos

| Arquivo | Ação |
|---|---|
| `src/pages/list-page.js` | Modificar — stats HTML + CSS, card HTML + CSS |

---

## Task 1: Upgradar stats para 4 cards com anéis circulares

**Files:**
- Modify: `src/pages/list-page.js`

- [ ] **Step 1: Substituir o CSS do stats row**

Localizar no `_attachStyles()` o bloco:
```css
      /* ── Stats row ── */
      #lp-stats-row {
        display: flex; gap: 12px; padding: 0 16px 0;
        margin-top: 4px;
      }
      .lp-stat-box {
        flex: 1;
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 12px; padding: 10px 14px;
        display: flex; flex-direction: column; gap: 2px;
      }
      .lp-stat-val {
        font-size: 20px; font-weight: 700;
        color: var(--color-text-primary);
        font-family: 'Syne', sans-serif;
      }
      .lp-stat-lbl {
        font-size: 11px; color: var(--color-text-muted); font-weight: 500;
      }
      .stat--empty .lp-stat-val { color: var(--color-text-muted); }
      .stat--empty .lp-stat-lbl::after {
        content: ' · adicione';
        font-size: 10px;
        color: var(--color-brand);
        font-weight: 600;
      }
```

Substituir por:
```css
      /* ── Stats row ── */
      #lp-stats-row {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        padding: 12px 16px 0;
      }
      @media (max-width: 480px) {
        #lp-stats-row { grid-template-columns: repeat(2, 1fr); }
      }
      .lp-stat-box {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 14px;
        padding: 12px 10px 10px;
        display: flex; flex-direction: column;
        align-items: center; gap: 4px;
        position: relative; overflow: hidden;
      }
      .lp-stat-ring-wrap {
        position: relative; width: 52px; height: 52px;
        display: flex; align-items: center; justify-content: center;
      }
      .lp-stat-ring-wrap svg {
        position: absolute; top: 0; left: 0;
        transform: rotate(-90deg);
      }
      .lp-stat-val {
        position: relative; z-index: 1;
        font-size: 16px; font-weight: 800;
        color: var(--color-text-primary);
        font-family: 'Syne', sans-serif;
        line-height: 1;
      }
      .lp-stat-lbl {
        font-size: 10px; color: var(--color-text-muted);
        font-weight: 600; text-transform: uppercase;
        letter-spacing: 0.04em; text-align: center;
        line-height: 1.2;
      }
      .stat--empty .lp-stat-val { color: var(--color-text-muted); }
```

- [ ] **Step 2: Substituir o HTML do stats row em `_render()`**

Localizar:
```html
        <div id="lp-stats-row">
          <div class="lp-stat-box">
            <span class="lp-stat-val" id="lp-stat-total">—</span>
            <span class="lp-stat-lbl">Total</span>
          </div>
          <div class="lp-stat-box">
            <span class="lp-stat-val" id="lp-stat-stack">—</span>
            <span class="lp-stat-lbl">Na Stack</span>
          </div>
          <div class="lp-stat-box">
            <span class="lp-stat-val" id="lp-stat-favs">—</span>
            <span class="lp-stat-lbl">Favoritos</span>
          </div>
        </div>
```

Substituir por:
```html
        <div id="lp-stats-row">
          <div class="lp-stat-box">
            <div class="lp-stat-ring-wrap">
              <svg width="52" height="52" viewBox="0 0 52 52">
                <circle cx="26" cy="26" r="22" fill="none" stroke="var(--color-border)" stroke-width="3"/>
                <circle id="lp-ring-total" cx="26" cy="26" r="22" fill="none"
                  stroke="var(--color-brand)" stroke-width="3"
                  stroke-dasharray="138.2" stroke-dashoffset="0"
                  stroke-linecap="round"/>
              </svg>
              <span class="lp-stat-val" id="lp-stat-total">—</span>
            </div>
            <span class="lp-stat-lbl">Total</span>
          </div>
          <div class="lp-stat-box">
            <div class="lp-stat-ring-wrap">
              <svg width="52" height="52" viewBox="0 0 52 52">
                <circle cx="26" cy="26" r="22" fill="none" stroke="var(--color-border)" stroke-width="3"/>
                <circle id="lp-ring-stack" cx="26" cy="26" r="22" fill="none"
                  stroke="#8B5CF6" stroke-width="3"
                  stroke-dasharray="138.2" stroke-dashoffset="138.2"
                  stroke-linecap="round"/>
              </svg>
              <span class="lp-stat-val" id="lp-stat-stack">—</span>
            </div>
            <span class="lp-stat-lbl">Na Stack</span>
          </div>
          <div class="lp-stat-box">
            <div class="lp-stat-ring-wrap">
              <svg width="52" height="52" viewBox="0 0 52 52">
                <circle cx="26" cy="26" r="22" fill="none" stroke="var(--color-border)" stroke-width="3"/>
                <circle id="lp-ring-favs" cx="26" cy="26" r="22" fill="none"
                  stroke="#EF4444" stroke-width="3"
                  stroke-dasharray="138.2" stroke-dashoffset="138.2"
                  stroke-linecap="round"/>
              </svg>
              <span class="lp-stat-val" id="lp-stat-favs">—</span>
            </div>
            <span class="lp-stat-lbl">Favoritos</span>
          </div>
          <div class="lp-stat-box">
            <div class="lp-stat-ring-wrap">
              <svg width="52" height="52" viewBox="0 0 52 52">
                <circle cx="26" cy="26" r="22" fill="none" stroke="var(--color-border)" stroke-width="3"/>
                <circle id="lp-ring-eva" cx="26" cy="26" r="22" fill="none"
                  stroke="#22C55E" stroke-width="3"
                  stroke-dasharray="138.2" stroke-dashoffset="69.1"
                  stroke-linecap="round"/>
              </svg>
              <span class="lp-stat-val" id="lp-stat-eva">—</span>
            </div>
            <span class="lp-stat-lbl">Evidência<br>A</span>
          </div>
        </div>
```

- [ ] **Step 3: Atualizar `_renderStats()` para os 4 valores e animar os anéis**

Localizar o método `_renderStats()` completo e substituir por:

```js
  _renderStats() {
    const total = SUPPLEMENTS_DB.length;
    const stackCount = (stateManager.stack || []).length;
    const favsCount = getFavoritesFromState().size;
    const evaCount = SUPPLEMENTS_DB.filter(s => s.evidenceLevel === 'A').length;

    const CIRCUMFERENCE = 138.2; // 2 * Math.PI * 22

    const setRing = (id, valId, count, max, color) => {
      const ring = this.container.querySelector(id);
      const valEl = this.container.querySelector(valId);
      if (!ring || !valEl) return;
      valEl.textContent = count;
      const pct = max > 0 ? Math.min(1, count / max) : 0;
      ring.style.stroke = color;
      ring.style.strokeDashoffset = CIRCUMFERENCE * (1 - pct);
    };

    setRing('#lp-ring-total', '#lp-stat-total', total, total, 'var(--color-brand)');
    setRing('#lp-ring-stack', '#lp-stat-stack', stackCount, total, '#8B5CF6');
    setRing('#lp-ring-favs', '#lp-stat-favs', favsCount, total, '#EF4444');
    setRing('#lp-ring-eva', '#lp-stat-eva', evaCount, total, '#22C55E');

    // Empty state classes (legacy — keep for stack)
    const stackBox = this.container.querySelector('#lp-stat-stack')?.closest('.lp-stat-box');
    stackBox?.classList.toggle('stat--empty', stackCount === 0);
  }
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/list-page.js
git commit -m "feat(list): circular ring stats — Total, Na Stack, Favoritos, Evidência A"
```

---

## Task 2: Simplificar botões do card → "VER PREÇOS →"

**Files:**
- Modify: `src/pages/list-page.js`

- [ ] **Step 1: Substituir CSS dos botões de card**

No `_attachStyles()`, localizar e substituir os estilos `.lp-btn-fav`, `.lp-btn-stack`:

```css
      .lp-btn-fav {
        width: 32px; height: 32px; flex-shrink: 0;
        background: transparent;
        border: 1px solid var(--color-border-strong);
        border-radius: 8px; cursor: pointer;
        font-size: 15px; display: flex; align-items: center; justify-content: center;
        transition: background 0.15s, border-color 0.15s;
      }
      .lp-btn-fav:hover { background: var(--color-surface-hover); }
      .lp-btn-fav.faved { border-color: #EF4444; color: #EF4444; }
      .lp-btn-stack {
        flex: 1; height: 32px;
        background: var(--color-brand); color: #fff;
        border: none; border-radius: 8px;
        font-size: 11px; font-weight: 700;
        cursor: pointer; font-family: 'Inter', sans-serif;
        transition: background 0.15s, opacity 0.15s;
        display: flex; align-items: center; justify-content: center; gap: 4px;
      }
      .lp-btn-stack:hover { background: var(--color-brand-hover); }
      .lp-btn-stack.in-stack {
        background: var(--color-success-bg);
        color: var(--color-success);
        border: 1px solid rgba(34,197,94,0.25);
      }
```

Substituir por:
```css
      .lp-btn-fav {
        width: 28px; height: 28px; flex-shrink: 0;
        background: rgba(0,0,0,0.4);
        border: 1px solid var(--color-border);
        border-radius: 8px; cursor: pointer;
        font-size: 13px; display: flex; align-items: center; justify-content: center;
        transition: background 0.15s, border-color 0.15s;
      }
      .lp-btn-fav:hover { background: var(--color-surface-hover); }
      .lp-btn-fav.faved { border-color: #EF4444; color: #EF4444; }
      .lp-btn-ver-precos {
        flex: 1; height: 32px;
        background: transparent;
        border: 1px solid var(--color-brand);
        color: var(--color-brand);
        border-radius: 8px;
        font-size: 11px; font-weight: 700;
        cursor: pointer; font-family: 'Inter', sans-serif;
        transition: background 0.15s, color 0.15s;
        display: flex; align-items: center; justify-content: center;
        letter-spacing: 0.03em;
      }
      .lp-btn-ver-precos:hover {
        background: var(--color-brand);
        color: #fff;
      }
```

- [ ] **Step 2: Atualizar o HTML do card em `_buildFragment()`**

Localizar:
```html
          <div class="lp-card-actions">
            <button class="lp-btn-fav${isFav ? ' faved' : ''}" data-action="toggle-fav" data-id="${item.id}" aria-label="Favoritar" type="button">
              ${isFav ? '♥' : '♡'}
            </button>
            <button class="lp-btn-stack${inStack ? ' in-stack' : ''}" data-action="toggle-stack" data-id="${item.id}" type="button">
              ${inStack ? '✓ No Stack' : '+ Stack'}
            </button>
          </div>
```

Substituir por:
```html
          <div class="lp-card-actions">
            <button class="lp-btn-fav${isFav ? ' faved' : ''}" data-action="toggle-fav" data-id="${item.id}" aria-label="${isFav ? 'Remover dos favoritos' : 'Favoritar'}" type="button">
              ${isFav ? '♥' : '♡'}
            </button>
            <button class="lp-btn-ver-precos" data-action="open-modal" data-id="${item.id}" type="button">
              VER PREÇOS →
            </button>
          </div>
```

- [ ] **Step 3: Verificar que o event handler `open-modal` já existe**

Rodar:
```bash
grep -n "open-modal\|data-action" src/pages/list-page.js | head -20
```

Se `open-modal` não estiver nos handlers, localizar o click handler que trata `data-action` e adicionar:
```js
if (action === 'open-modal') {
  this._openModal(id);
  return;
}
```

O método `_openModal(id)` já existe na classe.

- [ ] **Step 4: Commit**

```bash
git add src/pages/list-page.js
git commit -m "feat(list): simplify card CTA to VER PREÇOS button"
```

---

## Task 3: Verificação

- [ ] **Step 1: Rodar dev server**

```bash
npm run dev
```

Abrir `http://localhost:5173/list`.

- [ ] **Step 2: Verificar stats**

- [ ] 4 stat boxes visíveis em grid 4 colunas (2×2 em mobile)
- [ ] Total mostra 57 com anel roxo completo
- [ ] Na Stack mostra número com anel roxo proporcional (0 se não tiver stack)
- [ ] Favoritos mostra número com anel vermelho proporcional
- [ ] Evidência A mostra ~número com anel verde

- [ ] **Step 3: Verificar cards**

- [ ] Botão "VER PREÇOS →" visível em cada card (outline roxo)
- [ ] Botão ♡ menor, à esquerda
- [ ] Ao clicar "VER PREÇOS →", modal abre com preços

- [ ] **Step 4: Rodar testes**

```bash
npm test -- --run
```

Esperado: todos os 75 testes passando (o list-page não tem testes unitários diretos).

- [ ] **Step 5: Commit final se necessário**

```bash
git add src/pages/list-page.js
git commit -m "fix(list): adjustments after visual verification"
```
