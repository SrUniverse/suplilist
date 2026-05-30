# Landing UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refinar a UI da landing page e do catálogo para alinhar com o mockup `assets/visuais/home.png`, resolvendo 8 problemas priorizados na avaliação de design.

**Architecture:** Todas as mudanças estão em `src/pages/home-page.js` (landing) e `src/pages/list-page.js` (catálogo). O roteador já suporta query params (`#/list?objective=Hipertrofia`), então filtro por objetivo não exige mudança no router. Nenhum novo arquivo precisa ser criado.

**Tech Stack:** Vanilla JS, CSS-in-JS (estilos injetados via `<style>` tag), design tokens via CSS custom properties em `src/css/design-system.css`.

---

## Mapa de Arquivos

| Arquivo | O que muda |
|---|---|
| `src/pages/home-page.js` | Hero 2-col, ícones SVG, chips com query param, marketplaces com logos, CTA diferenciado, copyright 2026 |
| `src/pages/list-page.js` | Ler `params.objective` no `mount()` para pré-filtrar; empty state nos stats |

---

## Task 1: Copyright 2026 + diferenciar CTAs do Hero

**Files:**
- Modify: `src/pages/home-page.js`

- [ ] **Step 1: Atualizar copyright**

Em `home-page.js`, linha com `© 2025 SupliList`, alterar para:
```js
<p class="lp-copyright">© 2026 SupliList · Feito com ciência</p>
```

- [ ] **Step 2: Diferenciar os dois CTAs do hero**

O botão outline "Ver Catálogo" deve ancorar para a seção de features na mesma página, não navegar para `#/list`. Alterar o botão de outline:
```html
<button class="lp-btn lp-btn--outline lp-btn--lg" onclick="document.getElementById('lp-features').scrollIntoView({behavior:'smooth'})" type="button">Ver Recursos ↓</button>
```

E adicionar `id="lp-features"` na seção de recursos:
```html
<section class="lp-section" id="lp-features" aria-label="Recursos">
```

- [ ] **Step 3: Verificar no browser**

Navegar para `http://localhost:5173/#/home`. Confirmar:
- Footer mostra "© 2026"
- Botão "Ver Recursos ↓" faz scroll suave para a seção de features sem trocar a URL

- [ ] **Step 4: Commit**
```bash
git add src/pages/home-page.js
git commit -m "fix(landing): update copyright to 2026; differentiate hero CTAs"
```

---

## Task 2: Ícones SVG nas Feature Cards

**Files:**
- Modify: `src/pages/home-page.js`

Os ícones `💰`, `⚗️`, `⭐` são emojis — inconsistentes cross-platform. Substituir por SVGs inline no estilo do design system (stroke purpura brand).

- [ ] **Step 1: Definir os 3 SVGs inline**

Substituir o array `features` em `_template()`:
```js
const features = [
  {
    icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v2m0 8v2M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5m0 1h.01"/></svg>`,
    title: 'Comparação de Preços',
    text: 'Amazon, Mercado Livre e Shopee lado a lado. Compre sempre pelo melhor preço, sem sair do app.',
  },
  {
    icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/></svg>`,
    title: 'Dosagem Científica',
    text: 'Doses calculadas pelo seu peso, objetivo e biometria — sem chute, baseadas em evidência.',
  },
  {
    icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
    title: 'Stack Personalizado',
    text: 'Monte, monitore e evolua seu protocolo de suplementação ao longo do tempo.',
  },
];
```

- [ ] **Step 2: Atualizar o CSS do ícone**

No CSS injetado, trocar `.lp-card__icon { font-size: 30px; ... }` por:
```css
.lp-card__icon {
  width: 52px; height: 52px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  background: var(--color-brand-muted, rgba(124,58,237,0.12));
  margin-bottom: 20px;
}
```

- [ ] **Step 3: Atualizar o template do card para usar div wrapper**

O `${f.icon}` já renderiza o SVG diretamente dentro de `.lp-card__icon` — confirmar que o template de card usa:
```js
<div class="lp-card__icon">${f.icon}</div>
```
(já está assim, sem mudança necessária)

- [ ] **Step 4: Verificar no browser**

Navegar para `#/home`. Confirmar que as 3 feature cards mostram ícones SVG purpura em fundo translúcido, sem emojis.

- [ ] **Step 5: Commit**
```bash
git add src/pages/home-page.js
git commit -m "feat(landing): replace emoji icons with SVG in feature cards"
```

---

## Task 3: Chips de objetivo com filtro ao navegar

**Files:**
- Modify: `src/pages/home-page.js`
- Modify: `src/pages/list-page.js`

O router já parseia query params de `#/list?objective=Hipertrofia` e passa como `params.objective` para `ListPage`. Só falta: (a) chips da landing enviarem o query param; (b) ListPage ler `params.objective` no `mount()`.

- [ ] **Step 1: Chips da landing com query param**

Em `home-page.js`, no template dos chips de objetivo, alterar o `data-nav`:
```js
${goals
  .map(
    (g) => `<button class="lp-chip" data-nav="#/list?objective=${encodeURIComponent(g)}" type="button">${g}</button>`
  )
  .join('')}
```

- [ ] **Step 2: ListPage ler objective do params**

Em `list-page.js`, no construtor, já há `this._objective = ''`. O construtor recebe `params` como segundo argumento. Adicionar leitura:
```js
constructor(container, params = {}) {
  this.container = container;
  // ... demais props existentes ...
  this._objective = params.objective || '';
  // ... resto igual
}
```

- [ ] **Step 3: Verificar no browser**

1. Clicar em "Hipertrofia" na landing → deve navegar para `#/list?objective=Hipertrofia`
2. O catálogo deve abrir já filtrado por Hipertrofia (chips de objetivo mostrando "Hipertrofia" ativo)

- [ ] **Step 4: Commit**
```bash
git add src/pages/home-page.js src/pages/list-page.js
git commit -m "feat(landing): goal chips pass objective query param; list-page reads it on mount"
```

---

## Task 4: Empty state nos stats zerados do Catálogo

**Files:**
- Modify: `src/pages/list-page.js`

Na tela do catálogo, "0 Na Stack" e "0 Favoritos" no primeiro acesso parecem app vazio. Os stat cards devem mostrar uma chamada para ação quando o valor é zero.

- [ ] **Step 1: Localizar a função `_renderStats`**

Em `list-page.js`, encontrar `_renderStats()`. Ela popula os elementos de stat com valores numéricos. Identificar os seletores dos elementos de label/valor para "Na Stack" e "Favoritos".

- [ ] **Step 2: Adicionar classe modificadora quando zero**

Os IDs reais são `#lp-stat-stack` e `#lp-stat-favs` (spans de valor), dentro de `.lp-stat-box`.
Substituir `_renderStats()` inteiro por:
```js
_renderStats() {
  const total   = this.container.querySelector('#lp-stat-total');
  const stackEl = this.container.querySelector('#lp-stat-stack');
  const favsEl  = this.container.querySelector('#lp-stat-favs');
  if (total)   total.textContent   = SUPPLEMENTS_DB.length;

  const stackCount = (stateManager.stack || []).length;
  const favsCount  = getFavoritesFromState().size;

  if (stackEl) {
    stackEl.textContent = stackCount;
    stackEl.closest('.lp-stat-box')?.classList.toggle('stat--empty', stackCount === 0);
  }
  if (favsEl) {
    favsEl.textContent = favsCount;
    favsEl.closest('.lp-stat-box')?.classList.toggle('stat--empty', favsCount === 0);
  }
}
```

- [ ] **Step 3: Estilizar empty state**

No CSS injetado da ListPage, adicionar:
```css
.stat--empty .stat-value { color: var(--color-text-muted); }
.stat--empty .stat-label::after { content: ' · toque + Stack'; font-size: 10px; color: var(--color-brand); font-weight: 600; }
```

- [ ] **Step 4: Verificar no browser**

Abrir catálogo sem nenhum item na stack/favoritos. Confirmar que os stats zerados mostram o hint "· toque + Stack" em purpura.

- [ ] **Step 5: Commit**
```bash
git add src/pages/list-page.js
git commit -m "feat(list): empty state hint on zero stack/favorites stats"
```

---

## Task 5: Hero com layout 2 colunas + visual do produto

**Files:**
- Modify: `src/pages/home-page.js`

Este é o item de maior impacto visual. O mockup `assets/visuais/home.png` mostra o hero dividido: esquerda com headline + CTAs, direita com um preview dos cards de suplemento. Implementar com HTML/CSS puro — sem imagem externa, usando cards "mockup" com dados reais do DB.

- [ ] **Step 1: Alterar estrutura do hero para 2 colunas**

Substituir o `.lp-hero__inner` atual (max-width: 760px, text-align: center) por layout split:

```html
<div class="lp-hero__inner">
  <div class="lp-hero__left">
    <span class="lp-pill lp-anim" style="--d:0s">✦ Suplementação com Ciência</span>
    <h1 class="lp-hero__title lp-anim" style="--d:.08s">
      SUPLEMENTAÇÃO BASEADA EM <span class="lp-accent">EVIDÊNCIAS.</span>
    </h1>
    <p class="lp-hero__sub lp-anim" style="--d:.16s">
      Compare preços, calcule dosagens personalizadas e monitore sua adesão.
      100% offline, sem assinatura.
    </p>
    <div class="lp-hero__cta lp-anim" style="--d:.24s">
      <button class="lp-btn lp-btn--primary lp-btn--lg" data-nav="#/list" type="button">Começar Agora →</button>
      <button class="lp-btn lp-btn--outline lp-btn--lg" onclick="document.getElementById('lp-features').scrollIntoView({behavior:'smooth'})" type="button">Ver Recursos ↓</button>
    </div>
    <p class="lp-hero__stats lp-anim" style="--d:.32s">
      ${count}+ Suplementos · 3 Marketplaces · 100% Offline · Evidência Clínica
    </p>
  </div>
  <div class="lp-hero__right lp-anim" style="--d:.2s" aria-hidden="true">
    ${this._heroMockupCards()}
  </div>
</div>
```

- [ ] **Step 2: Implementar `_heroMockupCards()`**

Adicionar método que renderiza 3 supplement cards em miniatura (primeiros 3 do DB):
```js
_heroMockupCards() {
  const items = SUPPLEMENTS_DB.slice(0, 3);
  const cards = items.map(item => `
    <div class="lp-mock-card">
      <div class="lp-mock-card__ev">EV. ${item.evidenceLevel || 'A'}</div>
      <div class="lp-mock-card__name">${escapeHtml(item.name)}</div>
      <div class="lp-mock-card__cat">${escapeHtml(item.category || '')}</div>
      <div class="lp-mock-card__price">
        R$ ${((item.dosage?.maintenance ?? 5) * (item.pricePerGram ?? 0.3) * 30).toFixed(2).replace('.', ',')}
        <span class="lp-mock-card__dose">/ mês</span>
      </div>
    </div>
  `).join('');
  return `<div class="lp-mock-stack">${cards}</div>`;
}
```

Adicionar import de `escapeHtml` no topo do arquivo (linha 1, após o import existente de `SUPPLEMENTS_DB`):
```js
import { SUPPLEMENTS_DB } from '../ai/stack-recommender.js';
import { escapeHtml } from '../utils/escape.js';
```

- [ ] **Step 3: CSS do layout 2 colunas e mock cards**

Adicionar ao CSS injetado:
```css
/* Hero 2-col */
.lp-hero__inner {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
  align-items: center;
  text-align: left;
  max-width: 1160px;
}
.lp-hero__left { display: flex; flex-direction: column; align-items: flex-start; }
.lp-hero__cta { justify-content: flex-start; }

/* Mock cards */
.lp-mock-stack {
  display: flex; flex-direction: column; gap: 12px;
  perspective: 800px;
}
.lp-mock-card {
  background: var(--color-surface-primary, #111111);
  border: 1px solid var(--color-border, rgba(255,255,255,0.07));
  border-radius: 14px; padding: 20px 22px;
  display: flex; flex-direction: column; gap: 6px;
  transition: transform .3s ease, border-color .3s ease;
}
.lp-mock-card:hover {
  transform: translateX(-4px);
  border-color: var(--color-border-strong, rgba(255,255,255,0.14));
}
.lp-mock-card__ev {
  font-size: 10px; font-weight: 700; letter-spacing: .08em;
  color: var(--color-success, #22C55E);
  background: rgba(34,197,94,0.12);
  padding: 2px 8px; border-radius: 999px;
  width: fit-content;
}
.lp-mock-card__name { font-size: 16px; font-weight: 700; color: var(--color-text-primary); }
.lp-mock-card__cat  { font-size: 12px; color: var(--color-text-muted); }
.lp-mock-card__price { font-size: 15px; font-weight: 600; color: var(--color-brand); margin-top: 4px; }
.lp-mock-card__dose  { font-size: 11px; color: var(--color-text-muted); font-weight: 400; }

/* Responsivo: volta para 1 col em mobile */
@media (max-width: 860px) {
  .lp-hero__inner {
    grid-template-columns: 1fr;
    text-align: center;
  }
  .lp-hero__left { align-items: center; }
  .lp-hero__cta  { justify-content: center; }
  .lp-hero__right { display: none; }
}
```

- [ ] **Step 4: Verificar layout no browser**

Desktop (`> 860px`): hero mostra 2 colunas — texto à esquerda, 3 mock cards à direita.
Mobile (`< 860px`): coluna única, mock cards ocultos (não quebram layout).

- [ ] **Step 5: Commit**
```bash
git add src/pages/home-page.js
git commit -m "feat(landing): hero 2-col layout with product preview mock cards"
```

---

## Task 6: Seção Marketplaces com logos visuais

**Files:**
- Modify: `src/pages/home-page.js`

Substituir os cards de marketplace (só texto + badge "Integrado") por cards com logotipo SVG de cada plataforma e cor da marca.

- [ ] **Step 1: Substituir array `markets` por objetos com SVG e cor**

```js
const markets = [
  {
    name: 'Amazon',
    color: '#FF9900',
    svg: `<svg width="80" height="24" viewBox="0 0 120 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Amazon"><text x="0" y="28" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#FF9900">amazon</text></svg>`,
  },
  {
    name: 'Mercado Livre',
    color: '#FFE600',
    svg: `<svg width="100" height="24" viewBox="0 0 160 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Mercado Livre"><text x="0" y="28" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#FFE600">Mercado Livre</text></svg>`,
  },
  {
    name: 'Shopee',
    color: '#EE4D2D',
    svg: `<svg width="80" height="24" viewBox="0 0 120 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Shopee"><text x="0" y="28" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#EE4D2D">shopee</text></svg>`,
  },
];
```

- [ ] **Step 2: Atualizar template do card de marketplace**

```js
${markets
  .map(
    (m) => `
  <article class="lp-market" style="--mk-color: ${m.color}">
    <div class="lp-market__logo">${m.svg}</div>
    <span class="lp-market__badge">Integrado</span>
  </article>`
  )
  .join('')}
```

- [ ] **Step 3: Atualizar CSS do marketplace card**

```css
.lp-market {
  background: var(--color-surface-primary, #111111);
  border: 1px solid var(--color-border, rgba(255,255,255,0.07));
  border-radius: 16px; padding: 32px;
  display: flex; flex-direction: column;
  align-items: flex-start; gap: 20px;
  transition: border-color .2s ease, transform .2s ease;
}
.lp-market:hover {
  border-color: var(--mk-color, rgba(255,255,255,0.14));
  transform: translateY(-2px);
}
.lp-market__logo { display: flex; align-items: center; }
.lp-market__badge {
  font-size: 12px; font-weight: 600;
  color: var(--color-success, #22C55E);
  background: rgba(34, 197, 94, 0.12);
  padding: 5px 12px; border-radius: 999px;
  align-self: flex-start;
}
```

- [ ] **Step 4: Verificar no browser**

Seção de marketplaces mostra 3 cards com logotipo colorido de cada plataforma. Hover destaca a borda com a cor da marca.

- [ ] **Step 5: Commit**
```bash
git add src/pages/home-page.js
git commit -m "feat(landing): marketplace cards with brand-colored logo treatment"
```

---

## Task 7: Separadores visuais entre seções

**Files:**
- Modify: `src/pages/home-page.js`

Seções da landing se empilham sem ritmo. Alternância de background entre `--color-bg-primary` e `--color-bg-secondary` cria cadência de leitura.

- [ ] **Step 1: Aplicar background alternado**

No CSS injetado, adicionar:
```css
.lp-section--alt {
  background: var(--color-bg-secondary, #0F0F0F);
  width: 100%;
}
.lp-section--alt .lp-section {
  /* inner já tem max-width e padding */
}
```

- [ ] **Step 2: Envolver as seções pares em wrapper**

No template HTML, envolver as seções alternadas com wrapper:
```html
<!-- Seção "3 Passos" — usa fundo alternado -->
<div class="lp-section--alt">
  <section class="lp-section" aria-label="Como funciona">
    ...
  </section>
</div>

<!-- Seção "Marketplaces" — usa fundo alternado -->
<div class="lp-section--alt">
  <section class="lp-section" aria-label="Marketplaces">
    ...
  </section>
</div>
```

- [ ] **Step 3: Verificar no browser**

Landing alterna entre fundo `#080808` e `#0F0F0F` entre seções. Transição visual sutil mas perceptível.

- [ ] **Step 4: Commit**
```bash
git add src/pages/home-page.js
git commit -m "feat(landing): alternating section backgrounds for visual rhythm"
```

---

## Self-Review

**Spec coverage:**
| Item da prioridade | Task |
|---|---|
| P1 — Hero com visual do produto | Task 5 |
| P2 — Chips de objetivo filtrar | Task 3 |
| P3 — SVG icons nas features | Task 2 |
| P4 — Empty state nos stats | Task 4 |
| P5 — Marketplaces com logos | Task 6 |
| P6 — Separadores visuais | Task 7 |
| P7 — Copyright 2026 | Task 1 |
| P8 — Diferenciar CTAs | Task 1 |

**Placeholder scan:** Nenhum "TBD" ou "TODO" presente. Task 4 tem uma nota de inspeção (seletores reais) — o implementador deve confirmar os IDs antes de escrever o código.

**Type consistency:** `escapeHtml` importado em Task 5 é o mesmo de `src/utils/escape.js` já usado em `list-page.js`. `SUPPLEMENTS_DB` já importado em `home-page.js`. `params.objective` alinha com o nome do query param enviado pelos chips (Task 3 step 1).
