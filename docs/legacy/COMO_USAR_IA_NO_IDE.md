# Como Usar IA em IDE para Implementar o SupliList
## Estratégia Passo-a-Passo com Prompts Otimizados

**Data:** 23 de maio de 2026  
**Objetivo:** Implementar a arquitetura usando Copilot/Claude em VS Code (ou similar)

---

## ⚠️ REALIDADE ANTES DE COMEÇAR

**IA consegue fazer isto?**
- ✅ SIM para: Código boilerplate, funções simples, padrões repetitivos
- ✅ PARCIALMENTE para: Lógica complexa (precisa de review)
- ❌ NÃO para: Decisões arquiteturais, validação de regras de ouro

**Qual é o risco?**
```
SEM A ARQUITETURA DOCUMENTADA:
├─ IA gera código genérico
├─ Código viola suas regras (variáveis globais, etc)
├─ Resultado: spaghetti code que não é manutenível
└─ Tempo perdido refatorando

COM A ARQUITETURA DOCUMENTADA (o que você tem):
├─ IA segue blueprint exato
├─ Código consistente, modular, reutilizável
├─ Resultado: production-ready em 5-7 dias
└─ Tempo economizado: semanas
```

---

## 🎯 ESTRATÉGIA: Context-First Prompting

### Princípio Básico

IA gera código bom **se e somente se você der contexto suficiente**.

```
RUIM:
├─ "Cria um card de suplemento"
└─ → IA gera HTML genérico, sem estrutura

BOM:
├─ "Cria um card de suplemento seguindo:
│   - Blueprint em ARCHITECTURE_BLUEPRINT.md
│   - Contrato em API_CONTRACTS.md
│   - Regras: sem variáveis globais, puro render, ErrorBoundary wrap
│   - Estrutura: import { ErrorBoundary } from './core/error-boundary.js'"
└─ → IA gera exatamente o que você precisa
```

---

## 📋 CHECKLIST: Antes de Abrir o IDE

- [ ] Todos 5 documentos de arquitetura criados (você já tem ✅)
- [ ] Você leu ARCHITECTURE_BLUEPRINT.md completo
- [ ] Você entende EventBus, StateManager, ErrorBoundary
- [ ] Você sabe a ORDEM das fases (Core → Features → Components)
- [ ] Você tem VS Code + GitHub Copilot/Claude (ou similar)
- [ ] Você criou pasta `suplilist/` com `package.json`

---

## 🚀 PASSO 1: Setup Inicial (Sem IA)

### 1.1 Criar Estrutura de Pastas

```bash
mkdir suplilist
cd suplilist

# Core folders
mkdir -p src/js/core
mkdir -p src/js/types
mkdir -p src/js/features/{supplements,favorites,inventory,comparator,settings}
mkdir -p src/js/components
mkdir -p src/js/ui
mkdir -p src/js/utils
mkdir -p src/js/data
mkdir -p src/css
mkdir -p src/assets/supplements
mkdir -p tests/{unit,integration}
mkdir -p docs

# Files
touch index.html
touch package.json
touch tailwind.config.js
touch src/js/main.js
```

### 1.2 Copiar Documentação para `docs/`

```bash
cp ARCHITECTURE_BLUEPRINT.md docs/
cp API_CONTRACTS.md docs/
cp ARCHITECTURE_DIAGRAMS.md docs/
cp IMPLEMENTATION_ROADMAP.md docs/
cp EXECUTIVE_SUMMARY.md docs/
```

### 1.3 Criar `.cursorrules` (Para Cursor IDE) ou Prompt Padrão

**Arquivo:** `.cursorrules` (se usar Cursor IDE)

```
# SupliList v2.0 Architecture Rules

## OBRIGATORIEDADES
- NUNCA crie variáveis globais (window.x, let global, etc)
- SEMPRE use ES6 modules (import/export)
- SEMPRE valide dados com schemas before state update
- SEMPRE use ErrorBoundary.wrap() em componentes
- SEMPRE use event delegation (não listeners por card)

## IMPORTAÇÕES ESPERADAS
- import { eventBus } from './core/eventbus.js'
- import { stateManager } from './core/state-manager.js'
- import { ErrorBoundary } from './core/error-boundary.js'
- import { logger } from './utils/logger.js'

## ESTRUTURA DE PASTAS
Ver docs/ARCHITECTURE_BLUEPRINT.md - Seção "📁 ESTRUTURA DE PASTAS"

## CONTRATOS DE API
Ver docs/API_CONTRACTS.md para assinaturas exatas

## EVENTOS
Ver docs/ARCHITECTURE_BLUEPRINT.md - Seção "📋 CONTRATO DE EVENTOS"

## QUANDO GERAR CÓDIGO
1. Sempre incluir JSDoc (@param, @returns, @throws)
2. Sempre envolver componentes em ErrorBoundary
3. Sempre validar entrada com schemas
4. Sempre emitir eventos quando estado muda
```

Se não usar Cursor, salve isso como referência para colar em prompts.

---

## 🔨 PASSO 2: Phase 1 - Core Layer (Sem IA, Mas Com Ajuda)

### Por Que Sem IA Aqui?

Core é o alicerce. Se falhar, tudo falha. Melhor você escrever manualmente e entender cada linha.

### 2.1 `src/js/utils/logger.js` (Você escreve)

**Referência:** ARCHITECTURE_BLUEPRINT.md → "1.1️⃣ logger.js"

Copie o código de exemplo ou escreva do zero. IA pode ajudar se você já entendeu.

### 2.2 `src/js/utils/constants.js` (Você escreve)

```javascript
export const CATEGORIES = [
  'Aminoácido',
  'Adaptógeno',
  'Mineral',
  'Hormônio',
  'Vitamina',
  'Ácido Graxo',
  'Digital',
];

export const GOALS = [
  'Hipertrofia',
  // ... etc
];
```

### 2.3 `src/js/core/eventbus.js` (Você escreve)

**Referência:** ARCHITECTURE_BLUEPRINT.md → "🧠 CORAÇÃO: EventBus"

Código está ali, copie, entenda linha por linha.

### 2.4 `src/js/core/state-manager.js` (Você escreve)

**Referência:** ARCHITECTURE_BLUEPRINT.md → "🧠 CÉREBRO: State Manager"

### 2.5 `src/js/types/supplement.schema.js` (IA pode ajudar aqui)

**AGORA você pode pedir ajuda para IA:**

```
PROMPT:

Baseado neste contrato:
[COLE AQUI: docs/API_CONTRACTS.md → Seção "SupplementSchema"]

E nesta arquitetura:
[COLE AQUI: docs/ARCHITECTURE_BLUEPRINT.md → Seção "SupplementSchema"]

Gere o arquivo src/js/types/supplement.schema.js que:
1. Exporte class SupplementSchema com método static validate(data)
2. Retorne { isValid, errors[], data }
3. Valide todos os campos obrigatórios
4. Normalize os dados (trim, lowercase, etc)
5. Use constants.js para validar enums

Regras:
- Sem variáveis globais
- Inclua JSDoc completo
- Cada validação com mensagem de erro clara
- Exporte também um _normalize() helper

Aqui está a lista de campos esperados:
[COLE AQUI: api-contracts.html → Supplement type]
```

**O que IA vai fazer:**
- ✅ Gerar validators para cada campo
- ✅ Mensagens de erro úteis
- ✅ Método normalize()
- ✅ JSDoc adequado

---

## 🔨 PASSO 3: Phase 2 - Features (IA Excelente Aqui)

### Por Que IA é Ótima Aqui?

Features têm padrões repetitivos:
- CRUD: add(), get(), remove()
- Validação: sempre com schemas
- Events: sempre eventBus.emit()
- StateManager: sempre stateManager.setState()

IA segue padrões bem.

### 3.1 `src/js/features/supplements/supplementRepo.js`

**PROMPT MODELO:**

```
CONTEXTO:
- Arquivo: docs/API_CONTRACTS.md
- Procure: "### SupplementRepository"
- Copie toda a seção (type definitions + método descriptions)

- Arquivo: docs/ARCHITECTURE_BLUEPRINT.md
- Procure: "3. Features (dependem de Core + Types)"

TAREFA:
Gere src/js/features/supplements/supplementRepo.js que:

1. Implemente SupplementRepository class com métodos:
   - async loadAll() → Promise<Record<string, Supplement>>
   - getById(id) → Supplement | null
   - search(query) → Supplement[]
   - filter(filters) → Supplement[]
   - sort(supplements, sortBy) → Supplement[]
   - invalidateCache() → void

2. Características obrigatórias:
   - Cache in-memory (Map)
   - Carrega supplements.json no loadAll()
   - Valida cada supplement com SupplementSchema.validate()
   - Logger.debug() em pontos críticos
   - Singleton export: "export const supplementRepo = new SupplementRepository();"

3. Imports esperados:
   import { logger } from '../../utils/logger.js';
   import { SupplementSchema } from '../../types/supplement.schema.js';
   import { supplementCache } from './supplementCache.js';

4. Não deve ter:
   - Variáveis globais
   - Listeners
   - DOM manipulation
   - Chamadas de eventBus (isso é job da Service, não do Repo)

Gere o código completo pronto para produção, com JSDoc.
```

**O que você faz:**
1. Abre `API_CONTRACTS.md` em aba separada
2. Copia a seção "SupplementRepository"
3. Cola no prompt
4. Roda a IA
5. **REVIEW** o código (essencial!)
6. Se OK, salva. Se não, pede ajuste.

---

## 🔨 PASSO 4: Phase 3 - Components (IA Com Supervisão)

### Risco Aqui

IA pode gerar:
- ❌ HTML sem `data-supplement-id` (quebra event delegation)
- ❌ Listeners por card (memory leak)
- ❌ Componentes não wrappados em ErrorBoundary
- ❌ HTML com lógica dentro (deveria ser puro)

### 4.1 Implementar `supplement-card.js` (Pure Component)

**PROMPT MODELO:**

```
CONTEXTO:
[COLE: docs/API_CONTRACTS.md → "SupplementCard" section]
[COLE: docs/ARCHITECTURE_BLUEPRINT.md → "Padrão de Conexão"]

TAREFA:
Gere src/js/components/supplement-card.js com função pura:

export function createCard(supplement, options = {}) {
  // Retorna HTMLElement
  // NÃO adiciona listeners
  // NÃO manipula DOM (a não ser criar)
  // NÃO usa eventBus
}

ESTRUTURA ESPERADA:
1. Parâmetro supplement: Supplement (type from supplement.schema.js)
2. Options: { isFavorite?, showInventory?, highlightTerms? }
3. Retorna: HTMLElement com classes Tailwind
4. Obrigatório:
   - data-supplement-id="{supplement.id}" no elemento raiz
   - Botões com data-action="favorite|detail|compare|buy"
   - NÃO adicione event listeners
   - Use Tailwind classes para estilo
   - Mostre: nome, categoria, evidência, preço, mecanismo (truncado)

5. Depois export como:
   export const SupplementCard = ErrorBoundary.wrap(
     createCard,
     'SupplementCard'
   );

IMPORTS ESPERADOS:
import { ErrorBoundary } from '../core/error-boundary.js';
import { formatPrice, truncate } from '../utils/formatters.js';

CHECKLIST:
- [ ] Sem listeners próprios
- [ ] data-* attributes para event delegation
- [ ] Wrapped em ErrorBoundary
- [ ] JSDoc completo
- [ ] Tailwind classes (não inline styles)
```

### 4.2 Implementar `supplement-list.js` (Container)

**PROMPT MODELO:**

```
CONTEXTO:
[COLE: docs/API_CONTRACTS.md → "SupplementList" section]
[COLE: docs/ARCHITECTURE_BLUEPRINT.md → "Padrão de Conexão"]

TAREFA:
Gere src/js/components/supplement-list.js com:

export function initSupplementList(containerId) {
  const container = document.querySelector(containerId);
  
  // Controller object com: init(), render(), private handleClick()
  return controller;
}

RESPONSABILIDADES:
1. Event delegation:
   - Listen to container clicks
   - Check for data-action="favorite|detail|compare"
   - Call appropriate repo/service

2. Event subscription:
   - Listen to eventBus 'supplements:filtered'
   - Re-render quando filtro muda

3. Listen to state changes:
   - eventBus.on('state:changed', ...) para favorites
   - Atualizar apenas o card afetado (não re-render tudo)

4. Renderização:
   - Chame SupplementCard() para cada supplement
   - Append ao container
   - Use skeleton loader antes/depois

5. Cleanup (se remover component):
   - Unsubscribe de listeners
   - Remove event listeners

IMPORTS:
import { eventBus } from '../core/eventbus.js';
import { stateManager } from '../core/state-manager.js';
import { SupplementCard } from './supplement-card.js';
import { favoritesRepo } from '../features/favorites/favoritesRepo.js';
import { skeleton } from './skeleton.js';

PADRÃO EVENT DELEGATION:
container.addEventListener('click', (e) => {
  const card = e.target.closest('[data-supplement-id]');
  if (!card) return;
  
  const supplementId = card.dataset.supplementId;
  const action = e.target.closest('[data-action]')?.dataset.action;
  
  if (action === 'favorite') {
    favoritesRepo.toggle(supplementId);
  }
  // ... etc
});
```

---

## 🔨 PASSO 5: Phase 4 - Integration (IA Ajuda)

### 5.1 `index.html` (IA Com Supervisão)

```
PROMPT:

Gere src/index.html que:

1. Estrutura:
   - Meta viewport
   - Link Tailwind CSS (CDN)
   - Link design-system.css
   - Body com containers:
     - #app-header (logo, nav)
     - #search-bar (search + filters)
     - #supplement-list (main grid)
     - #favorites-page (hidden initially)
     - #toast-container (fixed bottom-right)

2. Script:
   - <script type="module" src="src/js/main.js"></script>

3. Classes:
   - Use Tailwind classes
   - Responsive grid (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3)
   - Dark mode (dark: prefix)

4. Não deve:
   - Inline JS (script tags com lógica)
   - Inline styles
   - Elementos com click handlers (use event delegation)
```

### 5.2 `src/js/main.js` (IA Com Supervisão)

```
PROMPT:

Gere src/js/main.js com função bootApp() que:

1. Executa NESTA ordem:
   - Load supplements from supplementRepo.loadAll()
   - Initialize stateManager
   - Log boot progress
   - Mount components:
     - initSupplementList('#supplement-list')
     - initFavoritesPage('#favorites-page')
     - initSearchInput('#search-bar')
   - Setup global listeners:
     - eventBus.on('inventory:urgent', ...)
     - eventBus.on('component:error', ...)

2. Error handling:
   - Try/catch
   - Log errors
   - Exibir "Falha ao carregar" se falhar

3. Chamada:
   document.addEventListener('DOMContentLoaded', bootApp);

IMPORTS:
import { logger } from './utils/logger.js';
import { stateManager } from './core/state-manager.js';
import { eventBus } from './core/eventbus.js';
import { supplementRepo } from './features/supplements/supplementRepo.js';
import { initSupplementList } from './components/supplement-list.js';
// ... etc
```

---

## 🛡️ PASSO 6: Review Checklist (ESSENCIAL)

**TODA vez que IA gera código, você DEVE fazer:**

### Checklist de Review (5 minutos por arquivo)

```
SEGURANÇA:
  [ ] Nenhuma variável global (window.x, let global)
  [ ] Imports explícitos (não import *)
  [ ] Sem eval, DOM.innerHTML direto

ARQUITETURA:
  [ ] Componentes: sem listeners, puro render
  [ ] Features: sem DOM, lógica pura
  [ ] Core: sem dependencies de features/components
  [ ] State: updated ONLY via stateManager.setState()

EVENTOS:
  [ ] eventBus.emit() documentado em events.schema.js
  [ ] Payloads validados
  [ ] Event delegation (não por-elemento)

ERROS:
  [ ] Try/catch onde apropriado
  [ ] ErrorBoundary.wrap() em componentes
  [ ] Logger.error() em failures

PERFORMANCE:
  [ ] Sem loops desnecessários
  [ ] Cache onde apropriado
  [ ] Sem memory leaks (unsubscribe, removeListener)

DOCUMENTAÇÃO:
  [ ] JSDoc em toda função pública
  [ ] @param, @returns, @throws
  [ ] Comentários em lógica complexa

SE FALHAR CHECKLIST:
├─ Pede ajuste para IA
├─ OU corrige manualmente
└─ NUNCA passa código quebrado para produção
```

---

## 📊 WORKFLOW RECOMENDADO

### Dia 1-2: Core (Você escreve manualmente)
```
Abra VS Code
├─ Escreva logger.js (copie do blueprint)
├─ Escreva constants.js
├─ Escreva eventbus.js
├─ Escreva state-manager.js
├─ Escreva error-boundary.js
├─ Escreva schemas
└─ Teste: npm test (cada módulo)
```

### Dia 2-3: Features (IA Gera, Você Review)
```
Abra VS Code + IA IDE
├─ Peça SupplementRepository (IA gera)
│   ├─ Copia contrato de API_CONTRACTS.md
│   ├─ Cola em prompt
│   ├─ Roda IA
│   ├─ Review (2 min)
│   └─ Salva
├─ Peça FavoritesRepository (same flow)
├─ Peça InventoryRepository
├─ Peça ComparatorService
└─ Teste: npm test
```

### Dia 3-5: Components (IA Gera Com Supervisão, Você Review)
```
├─ Peça supplement-card.js (IA)
│   ├─ Review: data-* attributes? ErrorBoundary wrap?
│   ├─ Fix se necessário
│   └─ Salva
├─ Peça supplement-list.js (IA)
│   ├─ Review: event delegation OK? Listeners cleanup?
│   ├─ Fix se necessário
│   └─ Salva
├─ Peça toast.js
├─ Peça skeleton.js
├─ Peça modals
└─ Teste: npm test
```

### Dia 5-7: Integration (IA Ajuda, Você Supervisiona)
```
├─ Peça index.html
├─ Peça tailwind.config.js
├─ Escreva main.js (você, ou IA + review heavy)
├─ npm run dev
├─ Teste tudo
├─ Bug fixes (provavelmente achar alguns)
└─ Ready for production!
```

---

## 🎯 QUANDO USAR IA (Resumido)

### ✅ USE IA PARA:
- Gerar código boilerplate (CRUD, getters, setters)
- Implementar features (repos, services)
- Gerar componentes simples (cards, buttons)
- Formatar código, renomear variáveis
- Gerar testes unitários
- Escrever comentários/documentação

### ⚠️ USE COM CUIDADO:
- Lógica complexa (pedir, mas review pesado)
- Algoritmos críticos (search, sort, filter)
- State management (sempre validate código)
- Error handling (verificar try/catch)

### ❌ NUNCA USE IA PARA:
- Decisões arquiteturais (você decide)
- Validar regras de ouro (você valida)
- Escolher entre 2 approaches (você escolhe)
- Refatorar projeto inteiro de uma vez (phase-by-phase)

---

## 🔍 EXEMPLO COMPLETO: Implementar `favoritesRepo.js`

### Step 1: Prepare Context

Abra docs/API_CONTRACTS.md, copie:
```typescript
class FavoritesRepository {
  add(supplementId: string): void
  remove(supplementId: string): void
  toggle(supplementId: string): boolean
  isFavorite(supplementId: string): boolean
  getAll(): Supplement[]
  export(): string
  import(json: string): void
}
```

### Step 2: Escreva o Prompt

```
Baseado na arquitetura SupliList v2.0 (docs/ARCHITECTURE_BLUEPRINT.md),
implemente src/js/features/favorites/favoritesRepo.js com:

CLASS: FavoritesRepository

MÉTODOS:
1. add(supplementId: string)
   - Adiciona supplementId a state.favorites
   - Emite 'favorite:toggled' com { supplementId, isFavorite: true }
   - Emite 'favorites:updated' com { favorites: [...], count: N }

2. remove(supplementId: string)
   - Mesma coisa, mas isFavorite: false

3. toggle(supplementId: string) -> boolean
   - Retorna novo status

4. isFavorite(supplementId: string) -> boolean
   - Consulta state.favorites

5. getAll() -> Supplement[]
   - Retorna array de Supplement objects (não IDs)

6. export() -> string
   - Return JSON.stringify(state.favorites)

7. import(json: string)
   - JSON.parse(json)
   - Validar array de strings
   - stateManager.setState('favorites', parsedArray)
   - Emite 'favorites:updated'

IMPORTS ESPERADOS:
- stateManager
- eventBus
- supplementRepo (para getById)
- logger

SINGLETON EXPORT:
export const favoritesRepo = new FavoritesRepository();

REGRAS:
- Sem variáveis globais
- Sempre validar supplementId existe
- Sempre emitir eventos
- JSDoc completo
- Logger.debug() em operações

Gere o código completo pronto para produção.
```

### Step 3: Rode a IA

Copia-cola prompt em Copilot/Claude/Cursor IDE.

IA gera algo como:

```javascript
import { stateManager } from '../../core/state-manager.js';
import { eventBus } from '../../core/eventbus.js';
import { supplementRepo } from './supplementRepo.js';
import { logger } from '../../utils/logger.js';

class FavoritesRepository {
  add(supplementId) {
    // ... implementation
  }
  // ... other methods
}

export const favoritesRepo = new FavoritesRepository();
```

### Step 4: Review (2 minutos)

```
Checklist:
[ ] Nenhuma variável global?
[ ] stateManager.setState() correto?
[ ] eventBus.emit() com payloads corretos?
[ ] Error handling se supplementId inválido?
[ ] JSDoc completo?
[ ] Singleton export?
[ ] Logger.debug() em pontos críticos?
```

### Step 5: Ajustar (Se Necessário)

Se IA errou algo:

```
"Falta error handling para supplementId inválido. 
Se supplementId não existe em state.supplements, 
lance Error('SUPPLEMENT_NOT_FOUND').
Também valide que supplementId é string não-vazia."
```

### Step 6: Salva e Testa

```bash
npm test -- favoritesRepo.test.js
```

---

## 💡 DICAS OURO

### 1. Sempre Cole Contexto Exato
❌ Ruim: "Faz um repo de favoritos"  
✅ Bom: "[COLE AQUI: docs/API_CONTRACTS.md → FavoritesRepository]"

### 2. Especifique Importações
❌ Ruim: "Importe o que precisar"  
✅ Bom: "Imports esperados: stateManager, eventBus, supplementRepo, logger"

### 3. Checklists no Prompt
❌ Ruim: "Gera o código"  
✅ Bom: "Não deve ter: variáveis globais, listeners, DOM manipulation"

### 4. Peça Sempre JSDoc
❌ Ruim: Código sem comentários  
✅ Bom: "JSDoc completo (@param, @returns, @throws)"

### 5. Teste Imediatamente
❌ Ruim: Gera tudo, depois testa  
✅ Bom: Gera 1 arquivo, testa, depois próximo

### 6. Review Sempre
❌ Ruim: Copia código direto  
✅ Bom: Review 2 min, depois salva

### 7. Se Ficar Confuso, Volta pro Blueprint
Sempre que não tiver certeza:
```
"Confere docs/ARCHITECTURE_BLUEPRINT.md, 
seção [X], e regenera?"
```

---

## 🚨 ERROS COMUNS

### Erro 1: Pedir Tudo de Uma Vez
❌ "Gera todo o app"  
✅ "Gera apenas supplementRepo.js (Phase 2 step 2.1)"

**Por quê?** IA não consegue manter consistência em 10k linhas. Melhor modular.

### Erro 2: Ignorar Review
❌ Gera → salva → próximo  
✅ Gera → review 2 min → fix → salva → próximo

**Por quê?** IA erra. Catch early ou vai quebrar depois.

### Erro 3: Não Usar Prompt Template
❌ Pergunta casual a cada vez  
✅ Usa prompt template do docs (copia, preenche, roda)

**Por quê?** Template garante que contexto não se perde.

### Erro 4: Misturar Fases
❌ Começa Phase 3 antes Phase 1 pronto  
✅ Phase 1 100% → Phase 2 100% → Phase 3 100%

**Por quê?** Dependências. Phase 2 precisa Phase 1 funcionando.

### Erro 5: Não Testar Conforme Vai
❌ Gera tudo, depois testa  
✅ Gera → testa → salva → próximo

**Por quê?** Se achar bug no meio, será bem mais fácil debugar.

---

## ✅ CHECKLIST FINAL: Pronto Pra Começar?

- [ ] Leu ARCHITECTURE_BLUEPRINT.md completo
- [ ] Entende EventBus, StateManager, ErrorBoundary
- [ ] Tem VS Code + IA plugin (Copilot/Cursor/etc)
- [ ] Tem pasta `suplilist/` com estrutura de pastas
- [ ] Tem `docs/` com 5 documentos
- [ ] Tem `package.json` com "type": "module"
- [ ] Salvou este guia em referência
- [ ] Pronto pra começar Phase 1 ✅

---

## 🎯 PRIMEIRA SESSÃO (30 minutos)

```
1. Escrever logger.js manualmente (10 min)
2. Escrever constants.js manualmente (5 min)
3. Testar ambos com npm test (5 min)
4. Pedir IA para gerar eventbus.js (10 min)
5. Review e salvar (5 min)
```

Se conseguir fazer isso sem erros, está pronto para continuar!

---

## 📞 SE DER PROBLEMA

**IA gera código que não faz sentido:**
```
"Vou descrever melhor o contrato:
[COLA AQUI: section relevante de API_CONTRACTS.md]

Baseado EXATAMENTE nisso, regenera?"
```

**IA viola regras de ouro:**
```
"Peguei código que tem [PROBLEMA]. 
Segundo docs/ARCHITECTURE_BLUEPRINT.md, 
regra #1 é: NUNCA [REGRA QUEBRADA].

Corrige mantendo exatamente as mesmas assinaturas?"
```

**IA gera código ineficiente:**
```
"Performance target: <50ms. 
Seu código usa .forEach().find().map() (lento).
Refactora pra usar Map/Set indexing?"
```

---

**Status:** ✅ PRONTO PARA IMPLEMENTAÇÃO COM IA

Próximo: Abra seu IDE e comece Phase 1! 🚀
