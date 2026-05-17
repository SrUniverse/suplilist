# compare.js + compare.css — Guia de Integração (SL-40)

## Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────┐
│            LISTA DE SUPLEMENTOS                 │
│  [Card A] [Card B] [Card C]  ← data-item-id     │
│  [✓cmp]   [cmp]   [✓cmp]    ← data-compare-*   │
└─────────────────────────────────────────────────┘
              ↓ addToCompare(item)
┌─────────────────────────────────────────────────┐
│         FLOATING DOCK (fixed, bottom)            │
│  [🖼A] [🖼C] [+]   [Comparar Agora ▶]  [✕]     │
└─────────────────────────────────────────────────┘
              ↓ _openCompareModal()
┌─────────────────────────────────────────────────┐
│           MODAL OVERLAY (tela cheia)            │
│  ┌──────────┬──────────┬──────────┐             │
│  │          │  Item A  │  Item C  │             │
│  ├──────────┼──────────┼──────────┤             │
│  │ Preço    │  R$89    │  R$120   │             │
│  │ /dose    │ R$1,48✓  │  R$2.00  │             │
│  │ /g prot  │ R$0.042✓ │  R$0.06  │             │
│  │ Proteína │   30g    │   20g    │             │
│  └──────────┴──────────┴──────────┘             │
└─────────────────────────────────────────────────┘
```

---

## 1. Instalação dos Arquivos

```html
<!-- No <head> do index.html -->
<link rel="stylesheet" href="compare.css">

<!-- No pé da página ou como módulo ES -->
<script type="module" src="compare.js"></script>
```

---

## 2. Inicialização

Chame `initCompare()` **uma única vez** após o DOM estar pronto:

```js
import { initCompare, bindCompareButtons } from './compare.js';

// Em app.js ou main.js, no DOMContentLoaded:
document.addEventListener('DOMContentLoaded', () => {
  initCompare(); // Cria Dock + Overlay no DOM
});
```

---

## 3. Estrutura HTML dos Cards da Lista

Cada card de suplemento precisa de **dois atributos data-** para funcionar:

```html
<!-- Atributo no elemento raiz do card -->
<div class="item-card" data-item-id="proteina-001">

  <!-- Checkbox/botão de comparação dentro do card -->
  <button
    data-compare-trigger
    data-compare-checkbox
    role="checkbox"
    aria-checked="false"
    aria-label="Adicionar Whey Protein para comparação"
  ></button>

  <!-- restante do card... -->
</div>
```

**`data-item-id`** — ID único que bate com `item.id` no objeto JS  
**`data-compare-trigger`** — Marca o elemento que dispara o toggle  
**`data-compare-checkbox`** — Recebe as classes visuais (`checked`) e `aria-checked`

---

## 4. Conectando os Botões à Lista

Após renderizar (ou re-renderizar) a lista, chame `bindCompareButtons`:

```js
import { bindCompareButtons } from './compare.js';

function renderList(items) {
  // ... renderização dos cards no DOM ...

  // Conecta os botões de comparação, passando o getter de item
  bindCompareButtons((id) => items.find(i => i.id === id));
}
```

`bindCompareButtons` usa `cloneNode` para evitar duplicação de listeners ao ser chamado múltiplas vezes.

---

## 5. API Pública do Módulo

| Função                     | Descrição                                               |
|----------------------------|---------------------------------------------------------|
| `initCompare()`            | Cria Dock e Overlay no DOM. Idempotente.                |
| `addToCompare(item)`       | Adiciona item (ou remove, se já estiver selecionado).   |
| `removeFromCompare(id)`    | Remove pelo ID.                                         |
| `toggleCompare(item)`      | Atalho: `addToCompare` com comportamento de toggle.     |
| `clearAll()`               | Limpa toda a seleção.                                   |
| `bindCompareButtons(fn)`   | Registra listeners nos `[data-compare-trigger]`.        |
| `isInCompare(id)`          | Retorna `true` se o item está selecionado.              |
| `compareCount()`           | Retorna número de itens selecionados (0–3).             |
| `getSelectedItems()`       | Retorna array dos itens selecionados (cópia imutável).  |
| `calcCostPerDose(item)`    | Calcula R$/dose. Retorna `null` se dados insuficientes. |
| `calcCostPerGramProtein(item)` | Calcula R$/g proteína. Retorna `null` se indisponível. |

---

## 6. Estrutura Esperada do Objeto `item`

```js
{
  id:          "proteina-001",     // string, obrigatório
  name:        "Whey Gold 900g",   // string, obrigatório
  brand:       "Optimum Nutrition",
  img:         "assets/products/whey-gold.jpg",
  category:    "Proteína",
  price:       89.90,              // number — preço total em R$
  doses:       30,                 // number — doses na embalagem
  servingSize: 30,                 // number — tamanho da porção em g
  servingG:    24,                 // number — proteína por dose em g
  calories:    120,                // number — calorias por dose
  rating:      4.7,                // number — avaliação (0–5)
  efficacy:    4,                  // number — eficácia científica (0–5 estrelas)
}
```

Os campos `price`, `doses` e `servingG` são usados nos cálculos de custo. Campos ausentes resultam em `'—'` na tabela comparativa, sem erros.

---

## 7. Chaves de Tradução (i18n)

Adicione estas chaves aos seus dicionários em `i18n.js`:

### `pt-BR`
```js
compare: {
  dock_label:    'Comparar',
  compare_now:   'Comparar Agora',
  clear_all:     'Limpar Seleção',
  close:         'Fechar comparação',
  modal_title:   'Comparação de Suplementos',
  remove_item:   'Remover',
  empty_slot:    'Slot vazio',
  selected_items:'Itens selecionados',
  limit_reached: 'Máximo de {max} itens para comparação.',
  item_added:    '{name} adicionado à comparação.',
  item_removed:  '{name} removido da comparação.',
  cleared:       'Seleção de comparação limpa.',
  min_items:     'Selecione ao menos 2 itens para comparar.',
  modal_opened:  'Comparando {count} suplementos.',
  modal_closed:  'Painel de comparação fechado.',
  section: {
    price:     'Preço',
    nutrition: 'Nutrição',
    quality:   'Qualidade',
  },
  row: {
    price_total:    'Preço Total',
    cost_per_dose:  'Custo/Dose',
    cost_per_gram:  'Custo/g Proteína',
    serving_size:   'Porção',
    protein_per_dose: 'Proteína/Dose',
    calories:       'Calorias/Dose',
    total_doses:    'Doses Totais',
    rating:         'Avaliação',
    efficacy:       'Eficácia Científica',
    category:       'Categoria',
  },
  badge: {
    best_cost:    'Melhor Custo',
    best_protein: 'Melhor Proteína',
  },
},
```

### `en`
```js
compare: {
  dock_label:    'Compare',
  compare_now:   'Compare Now',
  clear_all:     'Clear Selection',
  close:         'Close comparison',
  modal_title:   'Supplement Comparison',
  remove_item:   'Remove',
  empty_slot:    'Empty slot',
  selected_items:'Selected items',
  limit_reached: 'Maximum of {max} items for comparison.',
  item_added:    '{name} added to comparison.',
  item_removed:  '{name} removed from comparison.',
  cleared:       'Comparison selection cleared.',
  min_items:     'Select at least 2 items to compare.',
  modal_opened:  'Comparing {count} supplements.',
  modal_closed:  'Comparison panel closed.',
  section: {
    price:     'Price',
    nutrition: 'Nutrition',
    quality:   'Quality',
  },
  row: {
    price_total:    'Total Price',
    cost_per_dose:  'Cost/Dose',
    cost_per_gram:  'Cost/g Protein',
    serving_size:   'Serving Size',
    protein_per_dose: 'Protein/Dose',
    calories:       'Calories/Dose',
    total_doses:    'Total Doses',
    rating:         'Rating',
    efficacy:       'Scientific Efficacy',
    category:       'Category',
  },
  badge: {
    best_cost:    'Best Cost',
    best_protein: 'Best Protein',
  },
},
```

---

## 8. Segurança XSS

A função `esc()` é aplicada internamente em **todos os dados** antes da inserção via `innerHTML`. Não é necessária higienização externa — mas nunca injete objetos não-sanitizados via métodos DOM alternativos (ex: `document.write`, `.outerHTML = ...`).

---

## 9. Fluxo de Acessibilidade

```
Usuário seleciona item
  → announceToScreenReader("{name} adicionado à comparação.")   ← aria-live="polite"
  → Dock aparece com aria-hidden="false"
  → Dock tem role="region" + aria-label

Usuário clica "Comparar Agora"
  → openModal(overlay)  ← de modal.js
  → Focus Trap ativado (Tab circula dentro do painel)
  → Escape fecha o modal e restaura foco ao botão original
  → announceToScreenReader("Comparando N suplementos.")

Usuário fecha modal
  → closeModal(overlay)  ← de modal.js
  → Focus restaurado ao elemento que abriu
  → announceToScreenReader("Painel de comparação fechado.")
```

---

## 10. Checklist de Testes

- [ ] Selecionar 1 item → Dock aparece com animação
- [ ] Selecionar 3 itens → Limite atingido, vibração `warning`, pulse amarelo no Dock
- [ ] Tentar selecionar 4º item → Bloqueado com feedback ARIA
- [ ] Clicar "Comparar" com 1 item → Desabilitado (`aria-disabled="true"`)
- [ ] Clicar "Comparar" com 2–3 itens → Modal abre
- [ ] Navegar modal com Tab → Foco circula apenas dentro do painel
- [ ] Pressionar Escape → Modal fecha, foco volta ao trigger
- [ ] Clicar backdrop → Modal fecha
- [ ] Clicar "✕" em miniatura no Dock → Item removido individualmente
- [ ] Clicar "Limpar" → Todos os itens removidos, cards desmarcados
- [ ] Trocar idioma com modal aberto → Textos traduzidos em tempo real
- [ ] Testar em mobile (< 640px) → Dock full-width, modal 95vh
- [ ] `prefers-reduced-motion: reduce` → Sem animações
