# Exemplo Prático: Usando IA em IDE para Implementar SupliList
## 2 Exemplos Reais Com Prompts e Respostas

**Objetivo:** Mostrar EXATAMENTE como fazer isso funcionar

---

## 📋 PREPARAÇÃO

### Arquivos que você tem:
```
docs/
├── ARCHITECTURE_BLUEPRINT.md ← vai referenciar
├── API_CONTRACTS.md         ← vai referenciar
└── IMPLEMENTATION_ROADMAP.md
```

### Ambiente:
- VS Code aberto
- GitHub Copilot ou Cursor IDE ou Claude com Code Editor
- Pasta `suplilist/src/js/` criada
- `package.json` com `"type": "module"`

---

## 🟢 EXEMPLO 1: IA Gerando `supplementRepo.js`

### Cenário
Você está em **Phase 2**, implementando FeaturesLayer. Precisa de `supplementRepo.js`.

### O Que NÃO Fazer ❌

```
"Cria um repositório pra supplements"

❌ Resultado: IA gera código genérico sem estrutura
   - Usa module.exports em vez de ES6
   - Sem schema validation
   - Sem logging
   - Não segue arquitetura
```

### O Que FAZER ✅

#### PASSO 1: Abra `API_CONTRACTS.md`

Procure por:
```
### SupplementRepository (src/js/features/supplements/supplementRepo.js)
```

Copie toda a seção (está no meio do documento):

```typescript
class SupplementRepository {
  /**
   * Load all supplements from master database
   * @returns {Promise<Record<string, Supplement>>} Map of id -> Supplement
   * @throws {Error} If JSON parsing or network fails
   * @caches Result in memory until invalidated
   */
  async loadAll(): Promise<Record<string, Supplement>>
  // ... etc (todos os métodos)
}
```

#### PASSO 2: Escreva o Prompt Completo

Abra Copilot/Cursor/IDE IA e escreva:

```
## TAREFA: Implementar SupplementRepository

CONTEXTO DA ARQUITETURA:
Vou colar o contrato de API exato e a arquitetura esperada.

---

### CONTRATO DE API (Cole aqui):

[COLAR EXATAMENTE ISSO de API_CONTRACTS.md]:

```typescript
class SupplementRepository {
  /**
   * Load all supplements from master database
   * @returns {Promise<Record<string, Supplement>>} Map of id -> Supplement
   * @throws {Error} If JSON parsing or network fails
   * @caches Result in memory until invalidated
   */
  async loadAll(): Promise<Record<string, Supplement>>

  /**
   * Get single supplement by ID
   * @param {string} id - Supplement ID
   * @returns {Supplement | null} Supplement or null if not found
   * @throws Nothing (returns null on not found)
   */
  getById(id: string): Supplement | null

  /**
   * Search supplements by name/mechanism
   * @param {string} query - Search term (case-insensitive)
   * @returns {Supplement[]} Matching supplements
   * @details
   *   - Searches in name and mechanism fields
   *   - Returns results in original order
   */
  search(query: string): Supplement[]

  /**
   * Filter supplements by category/goals/price
   * @param {Object} filters - Filter criteria
   *   @param {string[]?} filters.categories - Include only these categories
   *   @param {string[]?} filters.goals - Include if contain any goal
   *   @param {number?} filters.maxPrice - Maximum costPerDose (BRL)
   * @returns {Supplement[]} Filtered supplements
   */
  filter(filters: FilterOptions): Supplement[]

  /**
   * Get supplements in order by metric
   * @param {Supplement[]} supplements - Input array
   * @param {'cost' | 'evidence' | 'name'} sortBy - Sort metric
   * @returns {Supplement[]} Sorted array
   */
  sort(supplements: Supplement[], sortBy: string): Supplement[]

  /**
   * Invalidate cache (call after master data updates)
   * @returns {void}
   */
  invalidateCache(): void
}

export const supplementRepo = new SupplementRepository();
```

---

### ARQUITETURA ESPERADA:

De docs/ARCHITECTURE_BLUEPRINT.md:

```
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
```

---

### REQUISITOS OBRIGATÓRIOS:

1. **Imports:**
   ```javascript
   import { logger } from '../../utils/logger.js';
   import { SupplementSchema } from '../../types/supplement.schema.js';
   ```

2. **Validação:**
   - Cada supplement carregado DEVE ser validado com SupplementSchema.validate()
   - Se falhar validação, log error mas continue (skip aquele supplement)

3. **Cache:**
   - In-memory cache com Map()
   - invalidateCache() limpa a cache

4. **Logging:**
   - logger.debug() quando carrega supplements
   - logger.error() se algum supplement invalido

5. **Sem variáveis globais**

6. **JSDoc completo**

7. **Testes esperados:**
   ```javascript
   const repo = await supplementRepo.loadAll();
   assert(repo['creatina-mono'] !== undefined); // ✓
   
   const results = supplementRepo.search('creatina');
   assert(results.length > 0); // ✓
   
   const filtered = supplementRepo.filter({
     categories: ['Aminoácido'],
     maxPrice: 50
   });
   assert(filtered.every(s => s.category === 'Aminoácido')); // ✓
   ```

---

GERE O CÓDIGO COMPLETO, PRONTO PARA PRODUÇÃO.
```

#### PASSO 3: Rode a IA

Cole esse prompt em Copilot/Cursor IDE.

IA vai gerar algo como:

```javascript
import { logger } from '../../utils/logger.js';
import { SupplementSchema } from '../../types/supplement.schema.js';

class SupplementRepository {
  constructor() {
    this.cache = new Map();
    this.isLoaded = false;
  }

  async loadAll() {
    if (this.isLoaded) return this.cache;

    try {
      const response = await fetch('src/data/supplements.json');
      const data = await response.json();

      logger.debug('Loading supplements', { count: Object.keys(data).length });

      Object.entries(data).forEach(([id, supplement]) => {
        const result = SupplementSchema.validate(supplement);
        if (result.isValid) {
          this.cache.set(id, result.data);
        } else {
          logger.error(`Invalid supplement ${id}:`, result.errors);
        }
      });

      this.isLoaded = true;
      logger.info(`Loaded ${this.cache.size} supplements`);
      return this.cache;
    } catch (err) {
      logger.error('Failed to load supplements:', err);
      throw err;
    }
  }

  getById(id) {
    return this.cache.get(id) || null;
  }

  search(query) {
    const q = query.toLowerCase();
    return Array.from(this.cache.values()).filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.mechanism.toLowerCase().includes(q)
    );
  }

  filter(filters = {}) {
    let results = Array.from(this.cache.values());

    if (filters.categories?.length > 0) {
      results = results.filter(s => filters.categories.includes(s.category));
    }

    if (filters.goals?.length > 0) {
      results = results.filter(s =>
        s.goals.some(g => filters.goals.includes(g))
      );
    }

    if (filters.maxPrice) {
      results = results.filter(s => s.costPerDose <= filters.maxPrice);
    }

    return results;
  }

  sort(supplements, sortBy) {
    const sorted = [...supplements];
    
    switch (sortBy) {
      case 'cost':
        sorted.sort((a, b) => a.costPerDose - b.costPerDose);
        break;
      case 'evidence':
        const order = { A: 1, B: 2, C: 3 };
        sorted.sort((a, b) => order[a.evidenceLevel] - order[b.evidenceLevel]);
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    
    return sorted;
  }

  invalidateCache() {
    this.cache.clear();
    this.isLoaded = false;
    logger.debug('Cache invalidated');
  }
}

export const supplementRepo = new SupplementRepository();
```

#### PASSO 4: REVIEW (Essencial - 2-3 minutos)

**Checklist:**

```
SEGURANÇA:
[ ] Nenhuma variável global? ✓
[ ] Imports explícitos? ✓
[ ] Sem eval/innerHTML? ✓

ARQUITETURA:
[ ] Valida com SupplementSchema? ✓
[ ] In-memory cache? ✓
[ ] Singleton export? ✓
[ ] Logging? ✓

FUNCIONALIDADE:
[ ] search() case-insensitive? ✓
[ ] filter() com todos critérios? ✓
[ ] sort() com 3 opções? ✓
[ ] Trata erros? ✓

JSDoc:
[ ] Todas funções documentadas? ✓

CORREÇÕES NECESSÁRIAS:
❌ Não encontrei - código está ótimo!
```

#### PASSO 5: Salva

```bash
# Cria arquivo
touch src/js/features/supplements/supplementRepo.js

# Cola código da IA
# (Ctrl+V ou paste)

# Testa
npm test -- supplementRepo.test.js
```

---

## 🟡 EXEMPLO 2: IA Gerando `supplement-card.js`

### Cenário
Você está em **Phase 3**, implementando componentes UI. Precisa de `supplement-card.js` (pure render).

### Prompt Customizado

```
## TAREFA: Implementar Pure Component para SupplementCard

CONTEXTO:

De docs/API_CONTRACTS.md → "SupplementCard" section:

```typescript
/**
 * Create a single supplement card element (pure function)
 * @param {Supplement} supplement - Supplement data
 * @param {Object?} options
 *   @param {boolean?} options.isFavorite - Show filled heart
 *   @param {boolean?} options.showInventory - Show stock info
 *   @param {string[]?} options.highlightTerms - Terms to highlight in name
 * @returns {HTMLElement} Card element (not attached to DOM)
 * @throws {Error} Caught by ErrorBoundary, returns error card
 * @details
 *   - Adds data-supplement-id="{id}" for event delegation
 *   - Does NOT add event listeners (parent container does)
 *   - Tailwind classes for consistent styling
 *   - Responsive grid layout
 */
function createCard(supplement: Supplement, options?: CardOptions): HTMLElement

// Wrapped with ErrorBoundary
export const SupplementCard = ErrorBoundary.wrap(
  createCard,
  'SupplementCard'
);
```

---

REQUISITOS OBRIGATÓRIOS:

1. **Função Pura:**
   - Recebe supplement + options
   - Retorna HTMLElement
   - NÃO adiciona listeners
   - NÃO manipula DOM (a não ser criar elemento)
   - NÃO usa eventBus

2. **Atributos Necessários:**
   - data-supplement-id="{supplement.id}" no elemento raiz
   - Buttons com data-action="favorite|detail|compare|buy"
   - Sem onclick handlers

3. **Conteúdo a Exibir:**
   - Imagem (src={supplement.image})
   - Nome
   - Categoria (badge)
   - Mecanismo (truncado a 100 chars)
   - Evidence level badge (A/B/C com cores)
   - Preço (menor marketplace)
   - Custo por dose
   - Botões: ❤️, ℹ️, ⚖️, 🛒

4. **Styling:**
   - Tailwind CSS classes ONLY
   - No inline styles
   - Responsive (mobile-first)
   - Dark theme (bg-card, text-t1, etc)
   - Border com --b1 color

5. **Importações:**
   ```javascript
   import { ErrorBoundary } from '../../core/error-boundary.js';
   import { formatPrice, truncate } from '../../utils/formatters.js';
   ```

6. **Wrapped em ErrorBoundary:**
   ```javascript
   export const SupplementCard = ErrorBoundary.wrap(
     createCard,
     'SupplementCard'
   );
   ```

7. **JSDoc Completo**

---

ESTRUTURA HTML ESPERADA:
(Use Tailwind classes: bg-card, rounded-lg, border, border-b1, etc)

```html
<div class="card ... " data-supplement-id="{id}">
  <img src="{image}" alt="{name}" class="...">
  <div class="p-4">
    <div class="flex justify-between items-start">
      <h3 class="...">{name}</h3>
      <button class="..." data-action="favorite">❤️</button>
    </div>
    <p class="text-t3 text-xs">{category}</p>
    <p class="text-t2 text-xs mt-2">{mechanism truncated}</p>
    <div class="flex gap-2 mt-3">
      <span class="badge ...">{evidenceLevel}</span>
    </div>
    <div class="mt-4 flex justify-between">
      <div>
        <p class="text-t3 text-xs">Menor preço</p>
        <p class="text-bright font-bold">{formatPrice(lowestPrice)}</p>
        <p class="text-t3 text-xs">R${costPerDose.toFixed(2)}/dose</p>
      </div>
      <div class="flex gap-2">
        <button class="..." data-action="detail">ℹ️</button>
        <button class="..." data-action="compare">⚖️</button>
        <a href="{marketplace-link}" class="..." target="_blank">🛒</a>
      </div>
    </div>
  </div>
</div>
```

---

TESTE ESPERADO:

```javascript
const supplement = {
  id: 'creatina-mono',
  name: 'Creatina Monohidratada',
  category: 'Aminoácido',
  evidenceLevel: 'A',
  mechanism: 'Long mechanism text here',
  image: 'assets/supplements/creatina.webp',
  prices: { shopee: 29.90 },
  costPerDose: 0.15,
  goals: ['Hipertrofia']
};

const element = SupplementCard(supplement, { isFavorite: true });

assert(element instanceof HTMLElement); // ✓
assert(element.dataset.supplementId === 'creatina-mono'); // ✓
assert(element.querySelector('[data-action="favorite"]')); // ✓
assert(!element.querySelector('form')); // No forms ✓
assert(!element.onclick); // No inline listeners ✓
```

---

GERE O CÓDIGO COMPLETO, PRONTO PARA PRODUÇÃO.
```

### Resposta da IA (Esperada)

```javascript
import { ErrorBoundary } from '../../core/error-boundary.js';
import { formatPrice, truncate } from '../../utils/formatters.js';

/**
 * Create a single supplement card element (pure function)
 * @param {Supplement} supplement - Supplement data
 * @param {Object?} options - Options
 * @param {boolean?} options.isFavorite - Show filled heart
 * @param {boolean?} options.showInventory - Show stock info
 * @param {string[]?} options.highlightTerms - Terms to highlight
 * @returns {HTMLElement} Card element
 */
function createCard(supplement, options = {}) {
  const { isFavorite = false, showInventory = false } = options;

  // Find cheapest marketplace
  const lowestPrice = Math.min(...Object.values(supplement.prices));

  // Create card element
  const card = document.createElement('div');
  card.className = 'card bg-card rounded-lg border border-b1 overflow-hidden hover:bg-card-hover transition-colors';
  card.dataset.supplementId = supplement.id;

  // Evidence level badge color
  const evidenceColor = {
    A: 'badge-success',
    B: 'badge-warning',
    C: 'badge-danger'
  }[supplement.evidenceLevel];

  // Marketplace link
  const marketplaceLink = Object.entries(supplement.prices)[0]?.[0] || 'shopee';
  const buyLink = `https://${marketplaceLink}.com/search?keyword=${encodeURIComponent(supplement.name)}`;

  card.innerHTML = `
    <img 
      src="${supplement.image}" 
      alt="${supplement.name}" 
      class="w-full h-32 object-cover"
    >
    <div class="p-4">
      <div class="flex justify-between items-start gap-2">
        <h3 class="font-semibold text-t1 flex-1">${supplement.name}</h3>
        <button 
          class="btn btn-sm transition-transform hover:scale-110" 
          data-action="favorite"
          title="${isFavorite ? 'Remover de favoritos' : 'Adicionar aos favoritos'}"
        >
          ${isFavorite ? '❤️' : '🤍'}
        </button>
      </div>
      
      <p class="text-t3 text-xs mt-1">${supplement.category}</p>
      
      <p class="text-t2 text-xs mt-2 leading-tight">
        ${truncate(supplement.mechanism, 100)}
      </p>
      
      <div class="flex gap-2 mt-3 flex-wrap">
        <span class="badge ${evidenceColor}">
          Evidence: ${supplement.evidenceLevel}
        </span>
      </div>
      
      ${showInventory ? `
        <div class="mt-3 p-2 bg-surface rounded text-xs text-t3">
          Stock info here
        </div>
      ` : ''}
      
      <div class="mt-4 flex justify-between items-end">
        <div>
          <p class="text-t3 text-xs">Menor preço</p>
          <p class="text-bright font-bold">${formatPrice(lowestPrice)}</p>
          <p class="text-t3 text-xs">R$ ${supplement.costPerDose.toFixed(2)}/dose</p>
        </div>
        
        <div class="flex gap-2">
          <button 
            class="btn btn-sm btn-secondary" 
            data-action="detail"
            title="Ver detalhes"
          >
            ℹ️
          </button>
          <button 
            class="btn btn-sm btn-secondary" 
            data-action="compare"
            title="Comparar"
          >
            ⚖️
          </button>
          <a 
            href="${buyLink}" 
            target="_blank" 
            rel="noopener noreferrer"
            class="btn btn-sm btn-primary"
            title="Comprar agora"
          >
            🛒
          </a>
        </div>
      </div>
    </div>
  `;

  return card;
}

/**
 * Wrapped component with error handling
 */
export const SupplementCard = ErrorBoundary.wrap(
  createCard,
  'SupplementCard'
);
```

### Review (Rápido)

```
CHECKLIST:
[ ] Sem listeners próprios? ✓
[ ] data-supplement-id present? ✓
[ ] data-action buttons? ✓
[ ] Wrapped em ErrorBoundary? ✓
[ ] Tailwind classes only? ✓
[ ] Função pura (retorna HTMLElement)? ✓
[ ] JSDoc? ✓
[ ] Sem variáveis globais? ✓
[ ] Formatters importados? ✓

PRONTO PARA USAR! ✓
```

---

## 🎯 PADRÃO QUE FUNCIONA

### 1. **Context Block** (Copia do docs)
```
CONTEXTO:
[COLA AQUI: docs/API_CONTRACTS.md → Seção Relevante]
[COLA AQUI: docs/ARCHITECTURE_BLUEPRINT.md → Seção Relevante]
```

### 2. **Requirements Block** (Be specific)
```
REQUISITOS OBRIGATÓRIOS:
1. Imports: ...
2. Validação: ...
3. Logging: ...
etc
```

### 3. **Structure Block** (Mostra esperado)
```
ESTRUTURA HTML/CODE ESPERADA:
[exemplo de como deve ficar]
```

### 4. **Test Block** (Como verificar)
```
TESTE ESPERADO:
[testes que devem passar]
```

### 5. **Comando Final**
```
GERE O CÓDIGO COMPLETO, PRONTO PARA PRODUÇÃO.
```

---

## ⚡ TEMPLATES PRONTOS

### Template Genérico (Copia e Preenche)

```
## TAREFA: Implementar [NOME DO MÓDULO]

CONTEXTO:
[COLA: docs/API_CONTRACTS.md → [NOME DO MÓDULO]]
[COLA: docs/ARCHITECTURE_BLUEPRINT.md → relevante]

REQUISITOS OBRIGATÓRIOS:
1. Imports:
   [listar exatamente o que importar]
2. Validação:
   [como validar entrada]
3. Logging:
   [onde fazer log]
4. Sem:
   [proibições]

ESTRUTURA ESPERADA:
[exemplo de código ou HTML]

TESTES:
[como testar]

GERE O CÓDIGO COMPLETO, PRONTO PARA PRODUÇÃO.
```

### Template para Repos

```
## TAREFA: Implementar [RepositoryName]

CONTEXTO:
[COLA API_CONTRACTS.md → [RepositoryName]]

REQUISITOS:
1. Valida com [Schema].validate() antes de setState()
2. Sempre emite 'event:type' com payload correto
3. Logger.debug() em operações críticas
4. Singleton export: "export const [name] = new [Class]()"

IMPORTS:
import { stateManager } from '../../core/state-manager.js';
import { eventBus } from '../../core/eventbus.js';
import { logger } from '../../utils/logger.js';
[+ outros conforme necessário]

GERE O CÓDIGO.
```

### Template para Components

```
## TAREFA: Implementar [ComponentName]

CONTEXTO:
[COLA API_CONTRACTS.md → [ComponentName]]

REGRAS RIGOROSAS:
- NUNCA add event listeners (parent faz via delegation)
- SEMPRE return HTMLElement (não attach to DOM)
- SEMPRE wrap em ErrorBoundary: ErrorBoundary.wrap(fn, 'Name')
- SEMPRE add data-* attributes para event delegation
- SEMPRE use Tailwind classes (sem inline styles)

IMPORTS:
import { ErrorBoundary } from '../../core/error-boundary.js';
[+ outros]

GERE O CÓDIGO.
```

---

## 🔍 COMO DEBUGAR SE IA ERRAR

### IA Gera Sem Validação

**Problema:**
```javascript
// ❌ IA não valida entrada
function addFavorite(supplementId) {
  state.favorites.push(supplementId);
}
```

**Fix:**
```
"Adiciona validação: se supplementId não é string não-vazio, 
lança Error('INVALID_SUPPLEMENT_ID').

Também: se supplementId não existe em 
state.supplements, lança Error('SUPPLEMENT_NOT_FOUND')."
```

### IA Gera Sem EventBus

**Problema:**
```javascript
// ❌ IA não emite eventos
function toggle(supplementId) {
  // ... mudou estado, mas não notificou
}
```

**Fix:**
```
"Depois de setState(), emite:
eventBus.emit('favorite:toggled', {
  supplementId,
  isFavorite: novo_status
});

Também emite:
eventBus.emit('favorites:updated', {
  favorites: state.favorites,
  count: state.favorites.length
});"
```

### IA Gera Listeners por Elemento

**Problema:**
```javascript
// ❌ Memory leak!
cards.forEach(card => {
  card.addEventListener('click', ...);
});
```

**Fix:**
```
"Remove loops de addEventListener. 
Usa event delegation:

container.addEventListener('click', (e) => {
  const card = e.target.closest('[data-supplement-id]');
  if (card) handleClick(card);
});"
```

---

## ✅ CHECKLIST: Pronto pra Começar com IA?

- [ ] Todos 5 docs de arquitetura criados
- [ ] Entende 3 regras de ouro (no globals, validate, ErrorBoundary)
- [ ] Tem IA IDE setup (Copilot, Cursor, etc)
- [ ] Leu os 2 exemplos acima
- [ ] Tem templates salvos
- [ ] Pronto pra começar Phase 1

---

**Status:** ✅ PRONTO PARA GERAR CÓDIGO COM IA

Comece com o Exemplo 1 (SupplementRepository) - é o mais simples!

