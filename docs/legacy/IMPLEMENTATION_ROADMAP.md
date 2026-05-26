# SupliList — GUIA DE IMPLEMENTAÇÃO
## Roadmap Detalhado com Dependências e Checkpoints

**Status:** Ready for Development  
**Estimativa:** 5-7 dias (solo developer, quality-first)  
**Paradigma:** Pub/Sub + Event-Driven + Schema Validation

---

## 📋 FASE 1: Core Foundation (Sem GUI)
### Tempo: ~1 dia | Nenhuma dependência

Implementar o **cérebro** do sistema. Nenhuma linha de HTML.

### 1.1️⃣ `src/js/utils/logger.js`
**Objetivo:** Logging centralizado para debug  
**Dependências:** Nenhuma  
**Entregáveis:**
- ✅ Logger class com debug/info/warn/error
- ✅ Env-aware (silent em production)
- ✅ Stack traces em development
- ✅ Color-coded console output (opcional)

**Checklist:**
```javascript
// Deve funcionar
logger.debug('test', {data: 123});
logger.info('app started');
logger.warn('config missing');
logger.error('fatal', new Error('oops'));
```

---

### 1.2️⃣ `src/js/utils/constants.js`
**Objetivo:** Centralize todos os enums + magic strings  
**Dependências:** Nenhuma  
**Entregáveis:**
- ✅ CATEGORIES[]
- ✅ GOALS[]
- ✅ UNITS[]
- ✅ EVIDENCE_LEVELS[]
- ✅ MARKETPLACES[]
- ✅ TOAST_TYPES[]
- ✅ SORT_OPTIONS[]

**Checklist:**
```javascript
import { CATEGORIES } from './constants.js';
assert(CATEGORIES.includes('Aminoácido')); // ✓
```

---

### 1.3️⃣ `src/js/core/eventbus.js`
**Objetivo:** Implementar Pub/Sub pattern  
**Dependências:** logger.js  
**Entregáveis:**
- ✅ EventBus.on(type, handler) → unsubscribe fn
- ✅ EventBus.off(type, handler)
- ✅ EventBus.emit(type, payload)
- ✅ EventBus.getHistory()
- ✅ Validação de payload (defer to schema)
- ✅ Handler errors caught + 'error:system' emitted
- ✅ Singleton export

**Testes Manuais:**
```javascript
import { eventBus } from './core/eventbus.js';

let received = null;
const unsub = eventBus.on('test:event', (payload) => {
  received = payload;
});

eventBus.emit('test:event', { msg: 'hello' });
assert(received.msg === 'hello'); // ✓

unsub();
eventBus.emit('test:event', { msg: 'world' });
assert(received.msg === 'hello'); // Still 'hello' ✓ (unsub worked)
```

---

### 1.4️⃣ `src/js/utils/validators.js`
**Objetivo:** Utility validators reutilizáveis  
**Dependências:** Nenhuma  
**Entregáveis:**
- ✅ isValidSlug(str)
- ✅ isPositive(n)
- ✅ isUnique(arr)
- ✅ isValidEmail(email)
- ✅ isValidUrl(url)

**Testes:**
```javascript
assert(isValidSlug('creatina-mono') === true);
assert(isValidSlug('Creatina Mono') === false);
assert(isPositive(5) === true);
assert(isPositive(0) === false);
```

---

### 1.5️⃣ `src/js/types/supplement.schema.js`
**Objetivo:** Validar dados de Supplement  
**Dependências:** constants.js, validators.js, logger.js  
**Entregáveis:**
- ✅ SupplementSchema.validate(data) → { isValid, errors[], data }
- ✅ Normalize data (trim, lowercase, etc)
- ✅ Required fields validation
- ✅ Enum validation
- ✅ Price marketplace validation (≥1)

**Testes:**
```javascript
const result = SupplementSchema.validate({
  id: 'creatina-mono',
  name: 'Creatina Monohidratada',
  category: 'Aminoácido',
  evidenceLevel: 'A',
  mechanism: 'Increases phosphocreatine...',
  defaultDose: 5,
  unit: 'g',
  goals: ['Hipertrofia'],
  prices: { shopee: 29.90 },
  costPerDose: 0.15,
  image: 'assets/supplements/creatina.webp'
});

assert(result.isValid === true);
assert(result.data.name === 'Creatina Monohidratada');

// Invalid test
const bad = SupplementSchema.validate({ id: 'Invalid Slug' });
assert(bad.isValid === false);
assert(bad.errors.length > 0);
```

---

### 1.6️⃣ `src/js/types/state.schema.js`
**Objetivo:** Validar AppState como um todo  
**Dependências:** supplement.schema.js, constants.js  
**Entregáveis:**
- ✅ AppStateSchema.validate(data) → { isValid, errors[], data }
- ✅ Validate supplements map
- ✅ Validate favorites array
- ✅ Validate inventory structure
- ✅ Validate settings object

**Testes:**
```javascript
const validState = {
  supplements: { 'creatina-mono': {...} },
  favorites: ['creatina-mono'],
  inventory: { 'creatina-mono': { qty: 100, purchaseDate: '2026-05-23' } },
  settings: { theme: 'dark', sortBy: 'cost', ... }
};

const result = AppStateSchema.validate(validState);
assert(result.isValid === true);
```

---

### 1.7️⃣ `src/js/types/events.schema.js`
**Objetivo:** Documentar/validar eventos do sistema  
**Dependências:** constants.js  
**Entregáveis:**
- ✅ Enum de todos event types
- ✅ Payload schemas para cada evento
- ✅ Event validators (para eventBus.emit())

**Testes:**
```javascript
import { validateEventSchema } from './types/events.schema.js';

validateEventSchema('state:changed', {
  path: 'favorites',
  value: ['item1'],
  fullState: {...}
}); // ✓

// Invalid payload
validateEventSchema('state:changed', { invalid: true }); // ✗ Error
```

---

### 1.8️⃣ `src/js/core/state-manager.js`
**Objetivo:** Gerenciar estado global + localStorage  
**Dependências:** eventbus.js, state.schema.js, logger.js  
**Entregáveis:**
- ✅ Initialize state from localStorage
- ✅ Fallback to default state if invalid
- ✅ stateManager.getState(path?)
- ✅ stateManager.setState(path, value)
  - ✅ Validate before commit
  - ✅ Persist to localStorage
  - ✅ Emit 'state:changed' event
- ✅ stateManager.observe(path, callback)
- ✅ stateManager.exportState()
- ✅ stateManager.importState(data)
- ✅ Singleton export

**Testes:**
```javascript
import { stateManager } from './core/state-manager.js';

// Get state
const state = stateManager.getState();
assert(state.favorites !== undefined);

// Get nested
const favs = stateManager.getState('favorites');
assert(Array.isArray(favs));

// Set state
stateManager.setState('favorites', ['creatina-mono']);
assert(stateManager.getState('favorites')[0] === 'creatina-mono');

// Verify localStorage
const stored = JSON.parse(localStorage.getItem('app:state'));
assert(stored.favorites[0] === 'creatina-mono');

// Test observer
let observed = null;
const unsub = stateManager.observe('favorites', (val) => {
  observed = val;
});
stateManager.setState('favorites', ['item2']);
assert(observed[0] === 'item2');
unsub();
```

---

### 1.9️⃣ `src/js/core/error-boundary.js`
**Objetivo:** Wrap components com error handling  
**Dependências:** eventbus.js, logger.js  
**Entregáveis:**
- ✅ ErrorBoundary.wrap(fn, componentName)
- ✅ Returns wrapped function that catches errors
- ✅ Emit 'component:error' event
- ✅ Return error card instead of crashing
- ✅ Static method to render error UI

**Testes:**
```javascript
import { ErrorBoundary } from './core/error-boundary.js';

const buggyFn = (data) => {
  throw new Error('oops');
};

const SafeFn = ErrorBoundary.wrap(buggyFn, 'TestComponent');
const result = SafeFn({ test: true });

assert(result instanceof HTMLElement); // Error card
assert(result.textContent.includes('TestComponent'));
```

---

### 1.🔟 `src/data/fallback-state.json`
**Objetivo:** Estado padrão se localStorage corrompido  
**Dependências:** Nenhuma  
**Entregáveis:**
```json
{
  "supplements": {},
  "favorites": [],
  "inventory": {},
  "settings": {
    "theme": "dark",
    "sortBy": "cost",
    "units": "metric",
    "notificationsEnabled": true
  }
}
```

---

## ✅ CHECKPOINT 1: Core Foundation Ready

**Validação:**
- [ ] `logger.debug/info/warn/error` funcionam
- [ ] `eventBus.on/off/emit` funcionam
- [ ] `SupplementSchema.validate()` valida corretamente
- [ ] `AppStateSchema.validate()` valida Estado
- [ ] `stateManager.setState()` persiste + emite evento
- [ ] `ErrorBoundary.wrap()` captura erros
- [ ] localStorage funciona end-to-end
- [ ] Nenhuma variável global
- [ ] Nenhuma dependência externa (além de Tailwind CSS)

**Próximo:** FASE 2

---

## 📋 FASE 2: Data Layer & Repositories
### Tempo: ~1-2 dias | Depende: Phase 1 ✅

Implementar features que manipulam estado. Ainda sem GUI.

### 2.1️⃣ `src/js/utils/formatters.js`
**Objetivo:** Formatação de dados para exibição  
**Dependências:** constants.js  
**Entregáveis:**
- ✅ formatPrice(value) → "R$ 49,90"
- ✅ formatDose(dose, unit) → "5g", "500mg"
- ✅ formatDate(date) → "23/05/2026"
- ✅ formatRelativeTime(date) → "há 2 dias"
- ✅ capitalize(str)
- ✅ truncate(str, maxLen)

---

### 2.2️⃣ `src/js/utils/parsers.js`
**Objetivo:** Parse de inputs/dados  
**Dependências:** logger.js  
**Entregáveis:**
- ✅ parsePrice(str) → number or null
- ✅ parseDose(str) → { value, unit }
- ✅ parseDate(str) → Date or null
- ✅ parseJSON(str) → object or null (safe)
- ✅ normalizeName(str) → trimmed + capitalized

---

### 2.3️⃣ `src/js/features/supplements/supplementRepo.js`
**Objetivo:** CRUD para supplements (read-only master + cache)  
**Dependências:** logger.js, supplement.schema.js, state-manager.js  
**Entregáveis:**
- ✅ SupplementRepository class
- ✅ loadAll() → Promise<Supplement[]>
  - ✅ Load from supplements.json
  - ✅ Validate each with SupplementSchema
  - ✅ Cache in-memory
  - ✅ Return as map {id → Supplement}
- ✅ getById(id) → Supplement | null
- ✅ search(query) → Supplement[]
- ✅ filter(filters) → Supplement[]
- ✅ sort(supplements, sortBy) → Supplement[]
- ✅ invalidateCache()
- ✅ Singleton export

**Testes:**
```javascript
const repo = await supplementRepo.loadAll();
assert(repo['creatina-mono'] !== undefined);

const results = supplementRepo.search('creatina');
assert(results.length > 0);
assert(results[0].name.toLowerCase().includes('creatina'));

const filtered = supplementRepo.filter({
  categories: ['Aminoácido'],
  maxPrice: 50
});
assert(filtered.every(s => s.category === 'Aminoácido'));
```

---

### 2.4️⃣ `src/js/features/supplements/supplementService.js`
**Objetivo:** Business logic para supplements  
**Dependências:** supplementRepo.js, supplementCache.js  
**Entregáveis:**
- ✅ SupplementService class
- ✅ search(options) → { results, count, timestamp }
  - ✅ Query + filters + sortBy
  - ✅ Cache em state.lastQuery
  - ✅ Emit 'supplements:filtered'
- ✅ getEnriched(id, options) → { supplement, isFavorite, stockStatus }
  - ✅ Get supplement
  - ✅ Include favorited status
  - ✅ Include inventory info
- ✅ getTopBy(metric, limit) → Supplement[]
- ✅ Singleton export

---

### 2.5️⃣ `src/js/features/supplements/supplementCache.js`
**Objetivo:** Cache in-memory com invalidação  
**Dependências:** logger.js  
**Entregáveis:**
- ✅ Cache class com TTL (time-to-live)
- ✅ get(key) → value | null
- ✅ set(key, value, ttl)
- ✅ invalidate(key)
- ✅ clear()
- ✅ Singleton export

---

### 2.6️⃣ `src/js/features/favorites/favoritesRepo.js`
**Objetivo:** Gerenciar favorites  
**Dependências:** state-manager.js, supplement.schema.js, eventbus.js, logger.js  
**Entregáveis:**
- ✅ FavoritesRepository class
- ✅ add(supplementId)
- ✅ remove(supplementId)
- ✅ toggle(supplementId) → boolean (new status)
- ✅ isFavorite(supplementId) → boolean
- ✅ getAll() → Supplement[]
- ✅ export() → JSON string
- ✅ import(json)
- ✅ Emit 'favorite:toggled' + 'favorites:updated'
- ✅ Singleton export

**Testes:**
```javascript
const repo = favoritesRepo;
repo.add('creatina-mono');
assert(repo.isFavorite('creatina-mono') === true);

const status = repo.toggle('creatina-mono');
assert(status === false); // Now removed
assert(repo.isFavorite('creatina-mono') === false);

const all = repo.getAll();
assert(Array.isArray(all));
```

---

### 2.7️⃣ `src/js/features/inventory/inventoryRepo.js`
**Objetivo:** Rastrear quantidade de suplementos  
**Dependências:** state-manager.js, eventbus.js, supplementRepo.js, logger.js  
**Entregáveis:**
- ✅ InventoryRepository class
- ✅ update(supplementId, qty) → void
  - ✅ Update state.inventory
  - ✅ Set purchaseDate = today
  - ✅ Emit 'inventory:updated'
  - ✅ Check if urgent (≤7 days)
- ✅ getQty(supplementId) → number | null
- ✅ getDaysLeft(supplementId) → number | null
  - ✅ Calc: qty / defaultDose
- ✅ getEndOfStockDate(supplementId) → Date | null
- ✅ checkUrgent() → { supplements[], hasUrgent }
  - ✅ Emit 'inventory:urgent' if needed
- ✅ getAll() → Record<id, InventoryItem>
- ✅ remove(supplementId)
- ✅ Singleton export

**Testes:**
```javascript
inventoryRepo.update('creatina-mono', 100); // 100g
const daysLeft = inventoryRepo.getDaysLeft('creatina-mono');
// If defaultDose=5g, daysLeft should be ~20 days
assert(daysLeft === 20);

const urgent = inventoryRepo.checkUrgent();
assert(urgent.hasUrgent === false); // 20 days > 7
```

---

### 2.8️⃣ `src/js/features/comparator/comparatorService.js`
**Objetivo:** Comparar 2-4 supplements  
**Dependências:** supplementRepo.js, interactionDb.js, logger.js  
**Entregáveis:**
- ✅ ComparatorService class
- ✅ compare(supplementIds) → ComparisonResult
  - ✅ Validate 2-4 IDs
  - ✅ Return matrix of comparable fields
  - ✅ Include interactions
  - ✅ Determine "winner" (best cost, best evidence)
- ✅ getInteractions(id1, id2) → InteractionRule[]
- ✅ Singleton export

---

### 2.9️⃣ `src/js/features/comparator/interactionDb.js`
**Objetivo:** Database de interações conhecidas  
**Dependências:** logger.js  
**Entregáveis:**
- ✅ Interactions map: {id1-id2: [rules]}
- ✅ getInteraction(id1, id2) → rules
- ✅ updateInteraction(id1, id2, rule)
- ✅ Singleton export
- ✅ Pre-populate com dados conhecidos

---

### 2.🔟 `src/js/features/settings/settingsRepo.js`
**Objetivo:** Gerenciar preferências do usuário  
**Dependências:** state-manager.js, eventbus.js  
**Entregáveis:**
- ✅ SettingsRepository class
- ✅ getSetting(key) → value
- ✅ setSetting(key, value) → void
- ✅ getAll() → settings object
- ✅ reset() → defaults
- ✅ Emit 'settings:changed'
- ✅ Singleton export

---

## ✅ CHECKPOINT 2: Data Layer Ready

**Validação:**
- [ ] SupplementRepository carrega e valida supplements
- [ ] Búsca/filter/sort funcionam corretamente
- [ ] FavoritesRepository add/remove/toggle funcionam
- [ ] InventoryRepository calcula dias restantes
- [ ] ComparatorService retorna matriz correta
- [ ] Todos repositórios emitem eventos corretos
- [ ] localStorage persiste todas mudanças
- [ ] Sem console errors

**Próximo:** FASE 3

---

## 📋 FASE 3: Components & UI Rendering
### Tempo: ~2-3 dias | Depende: Phase 2 ✅

Implementar renderização com ErrorBoundary + Event Delegation.

### 3.1️⃣ `src/js/components/supplement-card.js`
**Objetivo:** Renderizar single card (puro)  
**Dependências:** error-boundary.js, formatters.js, supplement.schema.js  
**Entregáveis:**
- ✅ createCard(supplement, options) → HTMLElement
  - ✅ Image, name, category, evidenceLevel badge
  - ✅ Mechanism summary
  - ✅ Favorite button (shows if isFavorite)
  - ✅ Price from cheapest marketplace
  - ✅ Cost-per-dose
  - ✅ Buy/Compare buttons
  - ✅ Adds data-supplement-id="{id}"
  - ✅ Does NOT attach listeners
- ✅ Export wrapped com ErrorBoundary

**HTML Structure:**
```html
<div class="card bg-card rounded-lg border border-b1" data-supplement-id="creatina-mono">
  <img src="assets/supplements/creatina.webp" alt="..." class="w-full h-32 object-cover rounded-t">
  <div class="p-4">
    <div class="flex justify-between items-start">
      <h3 class="font-semibold text-t1">Creatina Monohidratada</h3>
      <button class="btn-favorite" data-action="favorite">❤️</button>
    </div>
    <p class="text-t3 text-xs mt-1">Aminoácido</p>
    <p class="text-t2 text-xs mt-2 leading-tight">{mechanism}</p>
    <div class="flex gap-2 mt-3 text-xs">
      <span class="badge badge-evidence">Evidence: A</span>
    </div>
    <div class="mt-4 flex justify-between items-end">
      <div>
        <p class="text-t3 text-xs">Menor preço</p>
        <p class="text-bright font-bold">R$ 29,90</p>
        <p class="text-t3 text-xs">R$ 0,15/dose</p>
      </div>
      <div class="flex gap-2">
        <button class="btn-small btn-secondary" data-action="detail">ℹ️</button>
        <button class="btn-small btn-primary" data-action="compare">⚖️</button>
        <a href="https://..." target="_blank" class="btn-small btn-primary">🛒</a>
      </div>
    </div>
  </div>
</div>
```

---

### 3.2️⃣ `src/js/components/supplement-list.js`
**Objetivo:** Container + event delegation  
**Dependências:** supplement-card.js, error-boundary.js, skeleton.js, toast.js, state-manager.js, eventbus.js  
**Entregáveis:**
- ✅ initSupplementList(containerId) → SupplementListController
- ✅ Controller.init() → setup listeners
- ✅ Controller.render(supplements, options)
- ✅ Event delegation handler
  - ✅ .btn-favorite → favoritesRepo.toggle()
  - ✅ .btn-detail → emit 'supplement:detail:open'
  - ✅ .btn-compare → open comparator modal
  - ✅ .btn-buy → open external link
- ✅ Listen to 'supplements:filtered' → re-render
- ✅ Listen to 'favorite:toggled' → update heart
- ✅ Listen to 'state:changed' (favorites) → re-render affected cards
- ✅ Use skeleton loaders
- ✅ Use ErrorBoundary on each card
- ✅ Cleanup on unmount

**Testes:**
```javascript
const container = document.querySelector('#supplement-list');
initSupplementList(container);

// Simulate user click
const card = container.querySelector('[data-supplement-id="creatina-mono"]');
const favoriteBtn = card.querySelector('[data-action="favorite"]');
favoriteBtn.click();

// Check that state was updated
const isFav = stateManager.getState('favorites').includes('creatina-mono');
assert(isFav === true);
```

---

### 3.3️⃣ `src/js/components/toast.js`
**Objetivo:** Notificações  
**Dependências:** eventbus.js, logger.js  
**Entregáveis:**
- ✅ Toast class singleton
- ✅ show(message, type, duration) → id
  - ✅ Create DOM element
  - ✅ Append to fixed position (bottom-right)
  - ✅ Auto-remove after duration
  - ✅ Max 3 simultaneous (FIFO)
  - ✅ Emit 'toast:show'
- ✅ dismiss(id)
- ✅ dismissAll()
- ✅ CSS animations (slide-in, fade-out)
- ✅ Color per type (green=success, yellow=warning, red=danger, blue=info)

**Usage:**
```javascript
import { toast } from './components/toast.js';

toast.show('Suplemento favoritado!', 'success', 3000);
toast.show('Algo deu errado', 'danger');
```

---

### 3.4️⃣ `src/js/components/skeleton.js`
**Objetivo:** Loading placeholders  
**Dependências:** logger.js  
**Entregáveis:**
- ✅ SkeletonLoader class singleton
- ✅ render(count, container, variant?)
  - ✅ Create skeleton elements
  - ✅ Add data-skeleton="true"
  - ✅ Pulse animation via CSS
- ✅ clear(container)
- ✅ Variants: 'card', 'list', 'stat'

**Usage:**
```javascript
skeleton.render(6, container, 'card');
const results = await supplementService.search(options);
skeleton.clear(container);
renderCards(results);
```

---

### 3.5️⃣ `src/js/components/error-card.js`
**Objetivo:** Fallback quando componente falha  
**Dependências:** Nenhuma (é puro HTML)  
**Entregáveis:**
- ✅ errorCard(componentName, message) → HTMLElement
- ✅ Styled com Tailwind
- ✅ Shows component name + error (dev) ou generic (prod)
- ✅ Optional retry button

---

### 3.6️⃣ `src/js/components/modal.js`
**Objetivo:** Generic modal wrapper  
**Dependências:** eventbus.js  
**Entregáveis:**
- ✅ Modal class
- ✅ constructor(title, content)
- ✅ open() → create + show modal
- ✅ close() → hide + remove
- ✅ onClose(callback) → listen to close
- ✅ Overlay com close on ESC

---

### 3.7️⃣ `src/js/components/supplement-detail.js`
**Objetivo:** Modal com info completa  
**Dependências:** modal.js, error-boundary.js, inventory-repo.js, formatters.js  
**Entregáveis:**
- ✅ openSupplementDetail(supplementId)
- ✅ Show all fields: mechanism, prices, goals, etc
- ✅ Button to add to inventory
- ✅ Button to view all prices
- ✅ Listen to 'supplement:detail:open' event
- ✅ Wrapped com ErrorBoundary

---

### 3.8️⃣ `src/js/components/favorites-page.js`
**Objetivo:** Página de favoritos  
**Dependências:** supplement-card.js, error-boundary.js, toast.js, eventbus.js  
**Entregáveis:**
- ✅ initFavoritesPage(containerId)
- ✅ Listen to 'favorites:updated' → re-render
- ✅ Show "Nenhum favorito" if empty
- ✅ Export/Import buttons (JSON)
- ✅ Same event delegation as list
- ✅ Sorted by name by default

---

### 3.9️⃣ `src/js/components/comparator-modal.js`
**Objetivo:** Comparar 2-4 supplements  
**Dependências:** modal.js, comparator-service.js, error-boundary.js, formatters.js  
**Entregáveis:**
- ✅ openComparator(supplementIds)
- ✅ Show comparison matrix
- ✅ Highlight "winner" (cost, evidence)
- ✅ Show interactions
- ✅ Links to buy from cheapest
- ✅ Listen to 'comparator:open' event

---

### 3.🔟 `src/js/ui/search-input.js`
**Objetivo:** Debounced search  
**Dependências:** supplement-service.js, eventbus.js  
**Entregáveis:**
- ✅ initSearchInput(inputSelector)
- ✅ Debounce 300ms
- ✅ Call supplementService.search()
- ✅ Emit 'supplements:filtered'
- ✅ Clear on ESC
- ✅ Show results count

---

### 3.1️⃣1️⃣ `src/js/ui/filter-bar.js`
**Objetivo:** Filter por categoria/goals/price  
**Dependências:** supplement-service.js, eventbus.js, constants.js  
**Entregáveis:**
- ✅ initFilterBar(containerId)
- ✅ Checkboxes para categories
- ✅ Checkboxes para goals
- ✅ Slider para price
- ✅ On change → call supplementService.search()
- ✅ Emit 'supplements:filtered'
- ✅ "Limpar filtros" button

---

### 3.1️⃣2️⃣ `src/js/ui/sort-menu.js`
**Objetivo:** Menu de ordenação  
**Dependências:** supplement-service.js, eventbus.js  
**Entregáveis:**
- ✅ initSortMenu(containerId)
- ✅ Select: cost | evidence | name
- ✅ On change → re-render with new order
- ✅ Emit 'supplements:filtered'

---

## ✅ CHECKPOINT 3: UI Components Ready

**Validação:**
- [ ] supplement-card renderiza sem erros
- [ ] supplement-list event delegation funciona
- [ ] toast.show() aparece na tela
- [ ] skeleton.render() mostra placeholders
- [ ] Cliques em favorito atualizam coração
- [ ] favorites-page exibe favoritos
- [ ] comparator-modal mostra matriz
- [ ] search-input faz debounce
- [ ] filter-bar filtra corretamente
- [ ] ErrorBoundary captura e exibe erros

**Próximo:** FASE 4

---

## 📋 FASE 4: Integration & Bootup
### Tempo: ~0.5-1 dia | Depende: Phase 3 ✅

Unir tudo em uma aplicação funcional.

### 4.1️⃣ `src/css/design-system.css`
**Objetivo:** CSS custom properties + Tailwind config  
**Dependências:** Nenhuma (Tailwind)  
**Entregáveis:**
- ✅ :root { --bg, --surface, --card, --elevated, --purple, etc }
- ✅ Tailwind.config.js com theme customizado
- ✅ Animations: pulse, slide-in, fade-out
- ✅ Card borders/rounded classes
- ✅ Badge styles
- ✅ Button variants (primary, secondary, danger)

---

### 4.2️⃣ `src/js/main.js`
**Objetivo:** Entry point JS  
**Dependências:** Todas as features + components  
**Entregáveis:**
- ✅ async bootApp()
- ✅ Load master supplements
- ✅ Initialize stateManager
- ✅ Initialize all pages/components
- ✅ Setup global event listeners
- ✅ Log boot sequence
- ✅ Error handling

**Boot sequence:**
```javascript
async function bootApp() {
  logger.info('🚀 SupliList v2.0 booting...');
  
  try {
    // 1. Core initialization
    await supplementRepo.loadAll();
    stateManager._initializeState();
    logger.info('✅ State initialized');
    
    // 2. Mount components
    initSupplementList('#supplement-list');
    initFavoritesPage('#favorites-page');
    initSearchInput('#search-input');
    initFilterBar('#filter-bar');
    initSortMenu('#sort-menu');
    logger.info('✅ Components mounted');
    
    // 3. Global listeners
    eventBus.on('inventory:urgent', (payload) => {
      // Show badge/alert
    });
    
    eventBus.on('component:error', ({ componentName, error }) => {
      logger.error(`Component failed: ${componentName}`);
    });
    
    logger.info('✅ App ready');
    document.body.classList.add('app-ready');
    
  } catch (err) {
    logger.error('Boot failed:', err);
    document.body.innerHTML = `<div class="error">Falha ao carregar</div>`;
  }
}

document.addEventListener('DOMContentLoaded', bootApp);
```

---

### 4.3️⃣ `index.html`
**Objetivo:** Single HTML entry point  
**Dependências:** Nenhuma  
**Entregáveis:**
- ✅ <!DOCTYPE html>
- ✅ <meta viewport> (responsive)
- ✅ Link Tailwind CSS
- ✅ Link design-system.css
- ✅ <body> com containers:
  - ✅ #app-header (logo, nav)
  - ✅ #search-bar (search + filters)
  - ✅ #supplement-list (grid)
  - ✅ #favorites-page (hidden initially)
  - ✅ #toast-container (fixed position)
- ✅ <script type="module" src="src/js/main.js"></script>

---

### 4.4️⃣ `package.json`
**Objetivo:** Configuração de projeto  
**Dependências:** Tailwind CSS, Vite (optional)  
**Entregáveis:**
```json
{
  "name": "suplilist",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "tailwindcss": "^3.x",
    "vite": "^5.x"
  }
}
```

---

## ✅ CHECKPOINT 4: App Integration Ready

**Validação:**
- [ ] npm install funciona
- [ ] npm run dev starts dev server
- [ ] App carrega sem console errors
- [ ] Todas páginas/componentes montam
- [ ] Search funciona
- [ ] Favoritos funcionam
- [ ] Inventário funciona
- [ ] Comparator funciona
- [ ] localStorage persiste
- [ ] Performance: <100ms para search
- [ ] No memory leaks

---

## 📋 FASE 5: Polish & Testing
### Tempo: ~1-2 dias | Depende: Phase 4 ✅

Refinamento, testes, documentação.

### 5.1️⃣ Unit Tests
**Arquivo:** `tests/unit/*.test.js`  
**Dependências:** Vitest  
**Cobertura:**
- [ ] EventBus (all methods)
- [ ] StateManager (get/set/observe)
- [ ] SupplementSchema (valid/invalid cases)
- [ ] FavoritesRepo (add/remove/toggle)
- [ ] InventoryRepo (calc days left)
- [ ] SupplementService (search/filter/sort)
- [ ] Formatters (price, dose, date)
- [ ] Validators (slug, email, etc)

---

### 5.2️⃣ Integration Tests
**Arquivo:** `tests/integration/*.test.js`  
**Cenários:**
- [ ] User favorite flow (click → state → event → render)
- [ ] User search flow (type → filter → render)
- [ ] User inventory flow (add qty → calc days → alert)
- [ ] Error recovery (component error → error card shown)
- [ ] localStorage persistence (reload → state restored)

---

### 5.3️⃣ Performance Audit
**Checklist:**
- [ ] First Paint < 1s
- [ ] Search < 50ms
- [ ] Filter < 50ms
- [ ] Event emit < 10ms
- [ ] No memory leaks (DevTools)
- [ ] No console errors/warnings
- [ ] CSS not render-blocking
- [ ] Images optimized (.webp)

---

### 5.4️⃣ Accessibility (A11y)
**Checklist:**
- [ ] ARIA labels on buttons
- [ ] Keyboard navigation (Tab, Enter, ESC)
- [ ] Color contrast (WCAG AA)
- [ ] Focus indicators visible
- [ ] Screen reader tested
- [ ] Mobile touch targets (min 44x44px)

---

### 5.5️⃣ Documentation
**Arquivos:**
- [ ] README.md (quick start)
- [ ] CONTRIBUTING.md (dev guide)
- [ ] TROUBLESHOOTING.md (common issues)
- [ ] JSDoc em todas as funções públicas
- [ ] Inline comments em lógica complexa

---

## ✅ CHECKPOINT 5: Production Ready

**Validação:**
- [ ] All tests passing
- [ ] Code coverage >80%
- [ ] No TypeScript errors (if using TS)
- [ ] All JSDoc complete
- [ ] README updated
- [ ] Performance target met
- [ ] Accessibility audit passed
- [ ] Browser compatibility tested (Chrome, Firefox, Safari)
- [ ] Mobile tested (iOS + Android)
- [ ] Build passes without warnings

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Environment variables set (.env)
- [ ] localStorage key renamed to unique value
- [ ] Analytics/error tracking configured
- [ ] Service Worker (PWA) optional
- [ ] Gzip compression enabled
- [ ] Cache headers configured
- [ ] HTTPS enforced
- [ ] CSP (Content Security Policy) set
- [ ] Backup strategy documented

---

## 📊 TIMELINE SUMMARY

| Fase | Tarefa | Dias | Status |
|------|--------|------|--------|
| 1 | Core Layer | 1 | ⏳ Todo |
| 2 | Data Layer | 1-2 | ⏳ Todo |
| 3 | UI Components | 2-3 | ⏳ Todo |
| 4 | Integration | 0.5-1 | ⏳ Todo |
| 5 | Testing & Docs | 1-2 | ⏳ Todo |
| **TOTAL** | **Desenvolvimento** | **5-7** | ⏳ Todo |

---

## 🎯 SUCCESS CRITERIA

✅ Deve ser possível:
1. Pesquisar suplementos por nome/mecanismo
2. Filtrar por categoria/goals/preço
3. Ordenar por custo/evidência/nome
4. Favoritar suplementos
5. Rastrear inventário com alerta de reposição
6. Comparar 2-4 suplementos side-by-side
7. Visualizar todas as informações de um suplemento
8. Exportar/importar favoritos como JSON
9. Tudo persiste em localStorage
10. Sem variáveis globais
11. Performance >60fps
12. Mobile-first responsive design

---

**Status:** ✅ Roadmap Completo e Pronto para Implementação

Comece pela **FASE 1** quando estiver pronto!
