# AffiliateEngine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `AffiliateEngine` — a singleton that generates affiliate-tagged marketplace search URLs and tracks clicks — then wire it into the supplement modal (list-page) and My Stack "Recomprar" button.

**Architecture:** Two new files in `src/monetization/`: `affiliate.config.js` (IDs only) and `affiliate-engine.js` (class + singleton export). `list-page.js` and `my-stack-page.js` import the singleton and call `getLinks(name)` when building HTML; click tracking uses a delegated listener that calls `trackClick(id, marketplace)` which emits `AFFILIATE_CLICK` via eventBus.

**Tech Stack:** Vanilla JS, existing `eventBus` / `EVENTS` (`EVENTS.AFFILIATE_CLICK = 'affiliate_click'`), Vitest + jsdom for tests.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/monetization/affiliate.config.js` | Create | Affiliate IDs — only place to update them |
| `src/monetization/affiliate-engine.js` | Create | `getLinks(name)` + `trackClick(id, mp)` + singleton export |
| `src/monetization/affiliate-engine.test.js` | Create | 8 unit tests covering URL shape + event emission |
| `src/pages/list-page.js` | Modify | Import engine; replace `href="#"` with affiliate URLs; add click tracking |
| `src/pages/my-stack-page.js` | Modify | Import engine; add 🛒 Recomprar link per item; add click tracking |

---

## Task 1: Create affiliate.config.js + affiliate-engine.js (TDD)

**Files:**
- Create: `src/monetization/affiliate.config.js`
- Create: `src/monetization/affiliate-engine.js`
- Create: `src/monetization/affiliate-engine.test.js`

---

- [ ] **Step 1: Write the failing tests**

Create `src/monetization/affiliate-engine.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock eventBus before importing engine
vi.mock('../core/event-bus.js', () => ({
  eventBus: { emit: vi.fn() },
  EVENTS: { AFFILIATE_CLICK: 'affiliate_click' },
}));

import { eventBus, EVENTS } from '../core/event-bus.js';
import affiliateEngine from './affiliate-engine.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AffiliateEngine.getLinks', () => {
  it('returns amazon, mercadolivre, and shopee keys', () => {
    const links = affiliateEngine.getLinks('Creatina Monoidratada');
    expect(links).toHaveProperty('amazon');
    expect(links).toHaveProperty('mercadolivre');
    expect(links).toHaveProperty('shopee');
  });

  it('Amazon URL contains affiliate tag suplilist01-20', () => {
    const { amazon } = affiliateEngine.getLinks('Creatina Monoidratada');
    expect(amazon).toContain('tag=suplilist01-20');
  });

  it('Amazon URL encodes supplement name in query', () => {
    const { amazon } = affiliateEngine.getLinks('Creatina Monoidratada');
    expect(amazon).toContain('Creatina%20Monoidratada');
  });

  it('Mercado Livre URL contains ML placeholder ID', () => {
    const { mercadolivre } = affiliateEngine.getLinks('Creatina Monoidratada');
    expect(mercadolivre).toContain('partner_id=SUPLILIST_ML');
  });

  it('Shopee URL contains Shopee placeholder ID', () => {
    const { shopee } = affiliateEngine.getLinks('Creatina Monoidratada');
    expect(shopee).toContain('af_id=SUPLILIST_SHOPEE');
  });

  it('encodes special characters in supplement name correctly', () => {
    const { amazon } = affiliateEngine.getLinks('Vitamina C 1000mg + Zinco');
    expect(amazon).toContain(encodeURIComponent('Vitamina C 1000mg + Zinco'));
    expect(amazon).not.toContain(' ');
  });
});

describe('AffiliateEngine.trackClick', () => {
  it('emits AFFILIATE_CLICK event with supplementId and marketplace', () => {
    affiliateEngine.trackClick('creatina-monohidratada', 'amazon');
    expect(eventBus.emit).toHaveBeenCalledWith(
      EVENTS.AFFILIATE_CLICK,
      { supplementId: 'creatina-monohidratada', marketplace: 'amazon' }
    );
  });

  it('emits the event on each call (no dedup)', () => {
    affiliateEngine.trackClick('whey-protein', 'shopee');
    affiliateEngine.trackClick('whey-protein', 'shopee');
    expect(eventBus.emit).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```
npm test -- affiliate-engine
```

Expected: FAIL — `Cannot find module './affiliate-engine.js'`

- [ ] **Step 3: Create `src/monetization/affiliate.config.js`**

```js
export const AFFILIATE_CONFIG = {
  amazon:       'suplilist01-20',
  mercadolivre: 'SUPLILIST_ML',
  shopee:       'SUPLILIST_SHOPEE',
};
```

- [ ] **Step 4: Create `src/monetization/affiliate-engine.js`**

```js
import { eventBus, EVENTS } from '../core/event-bus.js';
import { AFFILIATE_CONFIG } from './affiliate.config.js';

class AffiliateEngine {
  constructor(config) {
    this._config = config;
  }

  getLinks(supplementName) {
    const q = encodeURIComponent(supplementName);
    return {
      amazon:       `https://www.amazon.com.br/s?k=${q}&tag=${this._config.amazon}`,
      mercadolivre: `https://www.mercadolivre.com.br/jm/search?as_word=${q}&partner_id=${this._config.mercadolivre}`,
      shopee:       `https://shopee.com.br/search?keyword=${q}&af_id=${this._config.shopee}`,
    };
  }

  trackClick(supplementId, marketplace) {
    eventBus.emit(EVENTS.AFFILIATE_CLICK, { supplementId, marketplace });
  }
}

const affiliateEngine = new AffiliateEngine(AFFILIATE_CONFIG);
export default affiliateEngine;
```

- [ ] **Step 5: Run tests to verify they pass**

```
npm test -- affiliate-engine
```

Expected: 8 tests PASS

- [ ] **Step 6: Commit**

```
git add src/monetization/affiliate.config.js src/monetization/affiliate-engine.js src/monetization/affiliate-engine.test.js
git commit -m "feat(monetization): add AffiliateEngine — getLinks + trackClick, Amazon tag suplilist01-20"
```

---

## Task 2: Wire list-page.js modal with affiliate links

**Files:**
- Modify: `src/pages/list-page.js`

The modal builds price cards in two paths inside `_openModal(item)` at line ~888:
- **Path A** (prices available): `Object.entries(stores).map(([storeKey, store]) => ...)` — uses `store.url || '#'`
- **Path B** (no prices): `['Amazon', 'Mercado Livre', 'Shopee'].map(store => ...)` — uses `href="#"`

Both paths need affiliate links. The click tracking goes in the overlay's existing event listener block (line ~998).

---

- [ ] **Step 1: Add import at top of list-page.js**

The file currently starts with these imports (line 1–5):
```js
import { stateManager, ACTIONS } from '../state/state-manager.js';
import { SUPPLEMENTS_DB } from '../ai/stack-recommender.js';
import Fuse from 'fuse.js';
import { escapeHtml } from '../utils/escape.js';
import { EVIDENCE_COLORS } from '../utils/evidence.js';
```

Add after line 5:
```js
import affiliateEngine from '../monetization/affiliate-engine.js';
```

- [ ] **Step 2: Compute `affLinks` inside `_openModal` before price cards are built**

In `_openModal(item)`, locate the comment `// Build price cards` (line ~887). Add `affLinks` right above it:

Replace:
```js
    // Build price cards
    let priceCardsHtml = '';
    const priceKey = item.id;
```

With:
```js
    // Build price cards
    const affLinks = affiliateEngine.getLinks(item.name);
    let priceCardsHtml = '';
    const priceKey = item.id;
```

- [ ] **Step 3: Wire Path A — replace `store.url || '#'` with affiliate URL**

Locate Path A (line ~892–903):
```js
      priceCardsHtml = Object.entries(stores).map(([, store]) => `
        <div class="lp-price-card">
          <div class="lp-price-card-left">
            <span class="lp-price-card-store">${store.label}</span>
            <span class="lp-price-card-val">${formatPrice(store.price)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${store.saving ? `<span class="lp-price-saving">-R$ ${store.saving}</span>` : ''}
            <a class="lp-price-link" href="${store.url || '#'}" target="_blank" rel="noopener">Ver Oferta →</a>
          </div>
        </div>
      `).join('');
```

Replace with (note `[storeKey, store]` and `data-aff-*` attributes):
```js
      priceCardsHtml = Object.entries(stores).map(([storeKey, store]) => `
        <div class="lp-price-card">
          <div class="lp-price-card-left">
            <span class="lp-price-card-store">${store.label}</span>
            <span class="lp-price-card-val">${formatPrice(store.price)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${store.saving ? `<span class="lp-price-saving">-R$ ${store.saving}</span>` : ''}
            <a class="lp-price-link"
               href="${affLinks[storeKey] || store.url || '#'}"
               target="_blank"
               rel="noopener noreferrer"
               data-aff-id="${item.id}"
               data-aff-mp="${storeKey}">Ver Oferta →</a>
          </div>
        </div>
      `).join('');
```

- [ ] **Step 4: Wire Path B — replace `href="#"` with affiliate URLs**

Locate Path B (line ~906–914):
```js
      const priceInfo = getPriceLabel(item, null);
      priceCardsHtml = ['Amazon', 'Mercado Livre', 'Shopee'].map(store => `
        <div class="lp-price-card">
          <div class="lp-price-card-left">
            <span class="lp-price-card-store">${store}</span>
            <span class="lp-price-card-val">${formatPrice(priceInfo.price)}</span>
          </div>
          <a class="lp-price-link" href="#" target="_blank">Ver Oferta →</a>
        </div>
      `).join('');
```

Replace with:
```js
      const priceInfo = getPriceLabel(item, null);
      const MP_LIST = [
        { key: 'amazon',       label: 'Amazon' },
        { key: 'mercadolivre', label: 'Mercado Livre' },
        { key: 'shopee',       label: 'Shopee' },
      ];
      priceCardsHtml = MP_LIST.map(({ key, label }) => `
        <div class="lp-price-card">
          <div class="lp-price-card-left">
            <span class="lp-price-card-store">${label}</span>
            <span class="lp-price-card-val">${formatPrice(priceInfo.price)}</span>
          </div>
          <a class="lp-price-link"
             href="${affLinks[key]}"
             target="_blank"
             rel="noopener noreferrer"
             data-aff-id="${item.id}"
             data-aff-mp="${key}">Ver Oferta →</a>
        </div>
      `).join('');
```

- [ ] **Step 5: Add affiliate click tracking to the overlay listener block**

Locate (line ~998–999):
```js
    overlay.querySelector('#lp-modal-close').addEventListener('click', () => this._closeModal());
    overlay.addEventListener('click', e => { if (e.target === overlay) this._closeModal(); });
```

Add after those two lines:
```js
    overlay.addEventListener('click', e => {
      const affLink = e.target.closest('[data-aff-mp]');
      if (affLink) affiliateEngine.trackClick(affLink.dataset.affId, affLink.dataset.affMp);
    });
```

- [ ] **Step 6: Run all tests**

```
npm test
```

Expected: all existing tests still PASS (list-page has no unit tests so no new tests needed here — behavior verified manually in Task 4)

- [ ] **Step 7: Commit**

```
git add src/pages/list-page.js
git commit -m "feat(list-page): wire affiliate links in modal price cards — Amazon/ML/Shopee + click tracking"
```

---

## Task 3: Wire my-stack-page.js with Recomprar button

**Files:**
- Modify: `src/pages/my-stack-page.js`

Each stack item is rendered in `_renderList()` at line ~740. The `msp-item-actions` div currently has ✏️ and 🗑️ buttons. We add a 🛒 anchor link. Click tracking plugs into the existing delegated listener in `_attachDelegatedListeners()` at line ~828.

---

- [ ] **Step 1: Add import at top of my-stack-page.js**

The file currently starts with these imports (lines 1–11):
```js
import { stateManager, ACTIONS } from '../state/state-manager.js';
import { SUPPLEMENTS_DB } from '../ai/stack-recommender.js';
import { todayISO, offsetISO } from '../utils/date.js';
import { renderEvidenceBadge } from '../utils/evidence.js';
import { getSupplementId } from '../utils/stack.js';
import { escapeHtml } from '../utils/escape.js';
```

Add after the last import:
```js
import affiliateEngine from '../monetization/affiliate-engine.js';
```

- [ ] **Step 2: Add CSS for `.msp-btn-reorder`**

The page defines its CSS in a `<style>` block via template literal inside the `mount()` / render method. Find the section with `.msp-btn-icon` styles (around the icon button rules) and add after `.msp-btn-icon.del:hover { ... }`:

```css
.msp-btn-reorder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: 16px;
  transition: background 0.15s;
}
.msp-btn-reorder:hover {
  background: var(--color-surface-hover);
}
```

- [ ] **Step 3: Compute `affLinks` and add 🛒 link to each stack item card**

In `_renderList()`, locate the `stack.forEach(item => {` loop (line ~740). Inside the loop, after `const desc = dbEntry?.benefits?.[0] ?? '';` and before `el.innerHTML = \``, add:

```js
      const affLinks = affiliateEngine.getLinks(item.name);
```

Then, in `el.innerHTML`, locate `msp-item-actions` div:
```js
            <div class="msp-item-actions">
              <button class="msp-btn-icon" data-action="edit" data-id="${itemId}" aria-label="Editar ${item.name}" title="Editar">✏️</button>
              <button class="msp-btn-icon del" data-action="remove" data-id="${itemId}" aria-label="Remover ${item.name}" title="Remover">🗑️</button>
            </div>
```

Replace with:
```js
            <div class="msp-item-actions">
              <button class="msp-btn-icon" data-action="edit" data-id="${itemId}" aria-label="Editar ${item.name}" title="Editar">✏️</button>
              <button class="msp-btn-icon del" data-action="remove" data-id="${itemId}" aria-label="Remover ${item.name}" title="Remover">🗑️</button>
              <a class="msp-btn-reorder"
                 href="${affLinks.amazon}"
                 target="_blank"
                 rel="noopener noreferrer"
                 data-aff-id="${itemId}"
                 data-aff-mp="amazon"
                 title="Recomprar na Amazon"
                 aria-label="Recomprar ${escapeHtml(item.name)} na Amazon">🛒</a>
            </div>
```

- [ ] **Step 4: Add affiliate click tracking to `_attachDelegatedListeners()`**

Locate `_attachDelegatedListeners()` (line ~828). It ends with `});` closing the listener. Add a second listener after the closing `});`:

```js
    this.container.querySelector('#msp-list')?.addEventListener('click', e => {
      const affLink = e.target.closest('[data-aff-mp]');
      if (affLink) affiliateEngine.trackClick(affLink.dataset.affId, affLink.dataset.affMp);
    });
```

- [ ] **Step 5: Run all tests**

```
npm test
```

Expected: all tests PASS (92+ passing — the 8 new affiliate tests + all existing)

- [ ] **Step 6: Manual smoke test**

1. Run `npm run dev`
2. Open any supplement modal in the Lista page — verify all 3 "Ver Oferta →" links point to real URLs with affiliate params (check Amazon link contains `tag=suplilist01-20`)
3. Click a "Ver Oferta →" — verify new tab opens to Amazon search results for that supplement
4. Go to My Stack — verify each item has a 🛒 icon
5. Click 🛒 — verify new tab opens to Amazon search for that supplement

- [ ] **Step 7: Commit**

```
git add src/pages/my-stack-page.js
git commit -m "feat(my-stack): add Recomprar affiliate link per stack item — Amazon with click tracking"
```
