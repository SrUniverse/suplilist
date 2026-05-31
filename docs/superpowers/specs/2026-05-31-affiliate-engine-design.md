# AffiliateEngine — Design Spec

**Goal:** Build a lightweight affiliate link engine that injects real affiliate IDs into marketplace search URLs, wires them into the supplement modal (list-page) and the My Stack "Recomprar" button, and tracks clicks via EventBus.

**Architecture:** `AffiliateEngine` singleton class in `src/monetization/affiliate-engine.js`. IDs in a separate config file. Two public methods: `getLinks(supplementName)` and `trackClick(supplementId, marketplace)`. Wired into `list-page.js` and `my-stack-page.js` — no new pages, no new routes.

**Tech Stack:** Vanilla JS, existing `eventBus` (`AFFILIATE_CLICK` event already defined), existing `escapeHtml` utility.

---

## Files

| File | Action |
|------|--------|
| `src/monetization/affiliate.config.js` | **Create** — affiliate IDs only |
| `src/monetization/affiliate-engine.js` | **Create** — AffiliateEngine class (singleton) |
| `src/pages/list-page.js` | **Modify** — wire modal "Ver Oferta →" buttons |
| `src/pages/my-stack-page.js` | **Modify** — add "Recomprar" link per stack item |
| `src/monetization/affiliate-engine.test.js` | **Create** — unit tests |

---

## affiliate.config.js

```js
export const AFFILIATE_CONFIG = {
  amazon:       'suplilist01-20',
  mercadolivre: 'SUPLILIST_ML',     // update when available
  shopee:       'SUPLILIST_SHOPEE', // update when available
};
```

---

## AffiliateEngine

### `getLinks(supplementName)`

Returns an object with all three affiliate search URLs. `supplementName` is the display name from SUPPLEMENTS_DB (e.g., `"Creatina Monoidratada"`).

```js
getLinks(supplementName) {
  const q = encodeURIComponent(supplementName);
  return {
    amazon:       `https://www.amazon.com.br/s?k=${q}&tag=${this._config.amazon}`,
    mercadolivre: `https://www.mercadolivre.com.br/jm/search?as_word=${q}&partner_id=${this._config.mercadolivre}`,
    shopee:       `https://shopee.com.br/search?keyword=${q}&af_id=${this._config.shopee}`,
  };
}
```

All links open in `target="_blank" rel="noopener noreferrer"`.

### `trackClick(supplementId, marketplace)`

Emits `eventBus.emit(AFFILIATE_CLICK, { supplementId, marketplace })` for analytics. No async, no side effects beyond the event.

```js
trackClick(supplementId, marketplace) {
  eventBus.emit(EVENTS.AFFILIATE_CLICK, { supplementId, marketplace });
}
```

### Singleton export

```js
const affiliateEngine = new AffiliateEngine(AFFILIATE_CONFIG);
export default affiliateEngine;
```

Pages import it as: `import affiliateEngine from '../monetization/affiliate-engine.js';`

---

## list-page.js Changes

In `_openModal(item)`, replace the static `store.url || '#'` with affiliate links:

```js
import affiliateEngine from '../monetization/affiliate-engine.js';

// inside _openModal(item):
const affLinks = affiliateEngine.getLinks(item.name);
```

Price cards `href` values:
- Amazon card → `affLinks.amazon`
- Mercado Livre card → `affLinks.mercadolivre`
- Shopee card → `affLinks.shopee`

Each `<a>` gets `data-aff-id="${item.id}" data-aff-mp="amazon"` (etc.) for click tracking.

Click handler (delegated on modal container):
```js
const affBtn = e.target.closest('[data-aff-mp]');
if (affBtn) {
  affiliateEngine.trackClick(affBtn.dataset.affId, affBtn.dataset.affMp);
}
```

---

## my-stack-page.js Changes

Each stack item card currently has edit (✏️) and remove (🗑️) icon buttons. Add a "Recomprar" `<a>` link after the icon buttons:

```js
const affLinks = affiliateEngine.getLinks(item.name);
// in item card HTML:
`<a class="msp-btn-reorder"
    href="${affLinks.amazon}"
    target="_blank"
    rel="noopener noreferrer"
    data-aff-id="${itemId}"
    data-aff-mp="amazon"
    aria-label="Recomprar ${item.name} na Amazon">
  🛒 Recomprar
</a>`
```

Click tracking uses the same delegated handler pattern already in `_handleClick(e)`:
```js
const affBtn = e.target.closest('[data-aff-mp]');
if (affBtn) {
  affiliateEngine.trackClick(affBtn.dataset.affId, affBtn.dataset.affMp);
  // link opens naturally (it's an <a>), no preventDefault
}
```

CSS class `.msp-btn-reorder`: small secondary button style, inline with the item actions.

---

## URL Patterns

| Marketplace | Example URL |
|---|---|
| Amazon | `https://www.amazon.com.br/s?k=Creatina+Monoidratada&tag=suplilist01-20` |
| Mercado Livre | `https://www.mercadolivre.com.br/jm/search?as_word=Creatina+Monoidratada&partner_id=SUPLILIST_ML` |
| Shopee | `https://shopee.com.br/search?keyword=Creatina+Monoidratada&af_id=SUPLILIST_SHOPEE` |

---

## Tests (`affiliate-engine.test.js`)

| # | Test |
|---|------|
| 1 | `getLinks('Creatina Monoidratada')` returns object with `amazon`, `mercadolivre`, `shopee` keys |
| 2 | Amazon URL contains `tag=suplilist01-20` |
| 3 | Amazon URL contains `encodeURIComponent(name)` in query string |
| 4 | ML URL contains `partner_id=SUPLILIST_ML` |
| 5 | Shopee URL contains `af_id=SUPLILIST_SHOPEE` |
| 6 | `getLinks` with special chars in name (e.g., `"Vitamina C 1000mg"`) encodes correctly |
| 7 | `trackClick` emits `AFFILIATE_CLICK` with correct `{ supplementId, marketplace }` payload |
| 8 | `trackClick` called twice emits event twice (no dedup) |

---

## Edge Cases

| Case | Behavior |
|------|----------|
| `supplementName` is empty string | URLs still valid — empty `k=` param on marketplace |
| `supplementName` has special chars (`+`, `&`, `%`) | `encodeURIComponent` handles them correctly |
| ML/Shopee IDs are placeholders | Links work as search URLs — just no affiliate commission until real IDs added |
| User blocks popups | `<a target="_blank">` is not a `window.open()` — not blocked by browsers |
| `trackClick` called before eventBus ready | eventBus is initialized before any page mounts — no race condition |

---

## Out of Scope

- Real-time price fetching (IndexedDB cache from Sprint 5.2) — not in this spec
- PriceComparator page — separate sprint
- Premium tier gating — separate sprint
- Affiliate disclosure component (FTC/CVM banner) — separate sprint
- Deep product links (requires real product IDs from marketplace APIs) — not available yet
