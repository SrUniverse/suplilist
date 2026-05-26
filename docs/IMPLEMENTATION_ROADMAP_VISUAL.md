# SupliList v3.0 — ROADMAP VISUAL (Alinhado com Screenshots)
## Guia de Implementação Atualizado com Referências Visuais Confirmadas

**Atualizado:** 25 de maio de 2026  
**Fonte de verdade:** 6 screenshots do produto (favorites, dosage, history, list, home/landing)

> ⚠️ Este roadmap **substitui** o IMPLEMENTATION_ROADMAP.md nas seções de UI/UX.
> A arquitetura técnica (EventBus, StateManager, etc.) permanece igual.

---

## TL;DR — O QUE MUDOU APÓS VER AS SCREENSHOTS

### Novidades descobertas:
1. **Sidebar tem 7 itens** (não 6): inclui "Receita" (nova) e "Comparar" (separado de Dosagem)
2. **Cards da lista têm fotos reais** de produto (não placeholder cinza)
3. **Preços**: valor roxo bold + valor original riscado + "/ DOSE" abaixo
4. **Stat cards** na lista têm **donut chart SVG** animado
5. **Footer**: "SUPLILIST" uppercase + Privacidade | Termos | API | Github
6. **Sidebar subtitle muda por contexto**: "Precision Management" / "Clinical Access" / "Vitals Optimized"
7. **Sidebar bottom**: status "Salvo" pulsante + botão "TEMA"
8. **Dosagem**: "5.0" em fonte GIGANTE (80px)
9. **Landing**: ticker marquee de suplementos + mockup de app na hero
10. **Favorites**: cards landscape 16:9, botão coração no canto da imagem

### O que NÃO mudou:
- Toda a arquitetura técnica (EventBus, StateManager, ErrorBoundary)
- Design tokens de cores
- PWA, Analytics, Legal
- Estrutura de dados dos suplementos

---

## CRONOGRAMA ATUALIZADO (6 dias)

```
DIA 1: Design System + Assets
DIA 2: Shell + Router (7 rotas)
DIA 3: List Page + Favorites Page
DIA 4: History + Dosage Calculator
DIA 5: Landing Page + Legal
DIA 6: My Stack + Analytics + QA Final
```

---

## DIA 1 — Design System + Assets

### Objetivo
Criar a base visual que todas as páginas usarão.

### Tarefas

**1.1 design-system.css** (REESCREVER)
- Tokens de cor confirmados (ver SUPLILIST_PROMPTS_v3_VISUAL.md → PROMPT 1.1)
- Adicionar: `.stat-donut` (SVG donut), `.ticker-wrap`, `.badge-nivel-a/b`, `.price-original`
- Confirmar: todos os tokens existem e estão documentados

**1.2 main.css** (REESCREVER COMPLETO)
- Layout: sidebar 220px + app-main + topbar + page-content
- Todos os componentes visuais confirmados pelos screenshots:
  - `.supplement-card` (imagem quadrada, preço roxo, botão block)
  - `.stat-card` (com espaço para donut SVG)
  - `.favorite-card` (imagem 16:9, coração flutuante)
  - `.cycle-item` (foto 56px + info + botão)
  - `.dosage-layout` (2-col grid)
  - `.metric-card` (barra de adesão)
  - `.tab-filters` + `.tab-btn`
  - `.sidebar-bottom` (status pulsante + btn-theme)
  - `.app-footer` ("SUPLILIST" + links)

**1.3 Assets de imagens**
- Criar `/assets/supplements/` com imagens reais ou placeholders realistas
- Suplementos com foto confirmada nas screenshots:
  - `creatina-monohidratada.jpg` (foto pó branco em tigela)
  - `maca-peruana.jpg` (foto raiz marrom)
  - `l-theanine.jpg` (foto pó branco)
  - `ashwagandha-ksm66.jpg` (placeholder por enquanto)
- Para os sem foto: placeholder com símbolo científico no fundo escuro

**1.4 manifest.json + service-worker.js** (CRIAR)
- Ver SUPLILIST_PROMPTS_v3_FINAL.md → PROMPT 1.3

### Checklist Dia 1
```
[ ] design-system.css: todos tokens + novos componentes visuais
[ ] main.css: todos layouts das 4 páginas vistas nas screenshots
[ ] /assets/supplements/: mínimo 4 imagens
[ ] manifest.json criado
[ ] service-worker.js com cache strategy
[ ] Abrir app.html → layout correto (sem quebra)
[ ] Sidebar com 7 itens renderiza corretamente
[ ] Footer "SUPLILIST" + links aparece
```

---

## DIA 2 — Shell + Router

### Objetivo
App navegável com sidebar funcional.

### Tarefas

**2.1 page-router.js** (CRIAR)
- Hash routing: `/#/home`, `/#/list`, `/#/my-stack`, `/#/favorites`, `/#/recipe`, `/#/dosage`, `/#/compare`
- 7 rotas (não 6)
- back/forward do browser
- persist rota em localStorage

**2.2 app.html** (REESCREVER)
```html
Estrutura confirmada:
<aside id="sidebar">
  <div class="sidebar-logo-wrap">
    <div class="sidebar-logo">Suplilist</div>
    <div class="sidebar-subtitle" id="sidebar-subtitle">Precision Management</div>
  </div>
  <nav id="sidebar-nav">...</nav>
  <div class="sidebar-bottom">
    <div class="sidebar-status">
      <span class="sidebar-status-dot"></span>
      Todas as alterações foram salvas!
    </div>
    <button class="btn-theme">🌐 TEMA</button>
  </div>
</aside>
<div id="app-main">
  <header id="top-bar">
    <div class="topbar-left" id="breadcrumb-wrap"></div>
    <div class="topbar-icons">
      <button class="btn-icon">🔔</button>
      <button class="btn-icon">📊</button>
      <button class="btn-icon">👤</button>
    </div>
  </header>
  <main id="page-content"></main>
  <footer class="app-footer">
    <span class="footer-brand">SUPLILIST</span>
    <div class="footer-links">
      <a href="/legal#privacy">Privacidade</a>
      <a href="/legal#terms">Termos</a>
      <a href="/api">API</a>
      <a href="https://github.com/suplilist" target="_blank">Github</a>
    </div>
  </footer>
</div>
```

**2.3 sidebar-nav.js** (REESCREVER — 7 itens)
```javascript
const NAV_ITEMS = [
  { id: 'home',      icon: '⊞',  label: 'Início',      route: '/#/home' },
  { id: 'list',      icon: '≡',  label: 'Lista',       route: '/#/list',     badge: () => supplementsDB.length },
  { id: 'my-stack',  icon: '◇',  label: 'Minha Stack', route: '/#/my-stack', badge: () => state.stack.length },
  { id: 'favorites', icon: '♡',  label: 'Favoritos',   route: '/#/favorites' },
  { id: 'recipe',    icon: '📄', label: 'Receita',     route: '/#/recipe' },
  { id: 'dosage',    icon: '⚖',  label: 'Dosagem',     route: '/#/dosage' },
  { id: 'compare',   icon: '⚖',  label: 'Comparar',    route: '/#/compare' },
]
```

**2.4 top-bar.js** (CRIAR)
- Breadcrumb aparece apenas nas páginas: favorites ("Home / Favoritos"), list ("Home / Lista"), etc.
- History page: sem breadcrumb texto, só ícones
- Dosage page: sem breadcrumb texto, sidebar mostra "Clinical Access"

**Sidebar subtitle dinâmico por contexto:**
```javascript
const SIDEBAR_SUBTITLES = {
  '/dosage': 'CLINICAL ACCESS',     // conforme dosage screenshot
  '/history': 'VITALS OPTIMIZED',   // conforme history screenshot  
  'default': 'PRECISION MANAGEMENT' // conforme favorites screenshot
}
```

### Checklist Dia 2
```
[ ] Router navega corretamente para 7 rotas
[ ] Sidebar: 7 itens, badge numérico em Lista e My Stack
[ ] Sidebar: item ativo destaca com brand-glow + borda esquerda
[ ] Sidebar: subtitle muda por rota (Clinical Access, Vitals Optimized, Precision Management)
[ ] Sidebar: bottom com status pulsante + btn TEMA
[ ] Topbar: breadcrumb aparece em favorites/list, some em history/dosage
[ ] Topbar: 3 ícones (🔔 📊 👤) sempre visíveis
[ ] Footer: "SUPLILIST" + 4 links aparece em todas as páginas
[ ] Mobile: sidebar fecha ao clicar em item
```

---

## DIA 3 — List Page + Favorites Page

### Objetivo
As duas páginas de catálogo com design pixel-perfect conforme screenshots.

### Tarefas

**3.1 list-page.js** (CRIAR)

Layout confirmado pela lista.png:

```
TOP: 4 stat-cards com donut SVG
[TOTAL 57 ○] [PENDENTES 27 ○] [COMPRADOS 0 ○] [URGENTES 14 ●vermelho]

SEARCH + BOTÃO FILTROS:
[🔍 Busque por nome, marca ou categoria...]    [⫶ Filtros]

TABS:
[●Todos] [Adaptógeno] [Hormônio] [Aminoácido] [Mineral] [Saúde Geral] [Digital]

GRID 4 colunas:
┌──────────────┐  (imagem real quadrada com badge NÍVEL no canto)
│ [NÍVEL A] ↖  │  
│ [foto real]  │  Nome do Suplemento
│              │  R$ 76   ~~R$95~~
└──────────────┘  R$ 2,50 / DOSE
                  [VER MELHORES PREÇOS]
```

**Donut SVG (implementação):**
```javascript
function renderDonutChart(value, max, color) {
  const r = 22;
  const c = 2 * Math.PI * r; // ~138.2
  const progress = (value / max) * c;
  return `
    <svg class="stat-donut" viewBox="0 0 56 56">
      <circle class="track" cx="28" cy="28" r="${r}"/>
      <circle class="fill-${color}" cx="28" cy="28" r="${r}"
        stroke-dasharray="${progress} ${c}"
        stroke-dashoffset="0"/>
    </svg>`;
}
// Total: color="brand", max=100, value=100 (sempre cheio)
// Pendentes: color="brand", max=57, value=27
// Comprados: color="success", max=57, value=0
// Urgentes: color="danger", max=57, value=14
```

**Card template (confirmado por lista.png):**
```html
<div class="supplement-card">
  <div class="card-image-wrap">
    <img src="/assets/supplements/${id}.jpg" 
         alt="${name}" 
         loading="lazy"
         onerror="this.parentElement.innerHTML='<div class=card-img-fallback>🧪</div>'">
    <span class="card-level-badge nivel-${level.toLowerCase()}">${level}</span>
  </div>
  <div class="card-body">
    <div class="card-name">${name}</div>
    <div class="card-price-row">
      <span class="card-price-main">R$ ${price}</span>
      <span class="card-price-original">R$${originalPrice}</span>
    </div>
    <div class="card-price-dose">R$ ${costPerDose} / DOSE</div>
    <button class="btn-card-primary" data-action="buy" data-id="${id}">
      VER MELHORES PREÇOS
    </button>
  </div>
</div>
```

**3.2 favorites-page.js** (ATUALIZAR)

Layout confirmado por image_94f403.jpg:

```
HEADER: "Meus Favoritos"          [🛒 Otimizar Todos]

FILTROS + SORT:
[●Todos] [Hipertrofia] [Foco & Cognição] [Longevidade]
                               ORDENAR POR: [Maior Evidência ▼]

GRID 2 colunas (cards mais largos):
┌─────────────────────────────────────┐
│ [♡ flutuante top-right]             │
│ [imagem landscape 16:9]             │
│ △NÍVEL A   Hipertrofia              │  ← dois badges lado a lado
│ Creatina Monohidratada              │
│ Aumento de força e volum...         │  ← line-clamp 2
│ Melhor Preço           🛒           │
│ R$ 89,90 / 300g                     │
│ [Detalhes]      [Comprar]           │
└─────────────────────────────────────┘
```

**Badge duplo (confirmado pela screenshot):**
```html
<div class="fav-badges">
  <span class="badge-nivel-a">△ NÍVEL A</span>
  <span class="badge-category">Hipertrofia</span>
</div>
```

**Marketplace badge (top-right da linha preço):**
- 🛒 ícone = Shopee (laranja)
- "ML" badge = Mercado Livre (amarelo/laranja)
- "AMZ" badge = Amazon (azul)

### Checklist Dia 3
```
[ ] List: 4 stat-cards com donut SVG correto
[ ] List: search funciona com debounce 300ms
[ ] List: 7 tabs de categoria filtram grid
[ ] List: cards com imagem real (src correto + fallback)
[ ] List: preço roxo + riscado + /DOSE abaixo
[ ] List: botão "VER MELHORES PREÇOS" uppercase block
[ ] Favorites: grid 2 colunas, cards landscape
[ ] Favorites: badge duplo (△ NÍVEL A + categoria)
[ ] Favorites: coração flutuante na imagem
[ ] Favorites: dropdown sort funcional
[ ] Favorites: botões Detalhes + Comprar
[ ] Favorites: marketplace badge (🛒 / ML / AMZ)
```

---

## DIA 4 — History + Dosage Calculator

### Objetivo
Páginas de dados e cálculo.

### Tarefas

**4.1 history-page.js** (CRIAR)

Layout confirmado por image_94f7a8.jpg:

```
TÍTULO: "Histórico de Suplementação"
SUBTÍTULO: "Monitoramento retrospectivo de ciclos concluídos e métricas de adesão clínica."

3 METRIC CARDS:
[📈 Média de Adesão | 92% | barra roxa]
[✅ Total Ciclos Concluídos | 14 | +2 no último trimestre]
[💰 Investimento Total Histórico | R$ 3.450 | "Calculado com base nos logs"]

SEARCH: [🔍 Buscar no histórico...]

TABS: [●Todos] [Aminoácidos] [Adaptógenos] [Vitaminas]

LISTA:
[foto/ícone] Nome     [CATEGORIA BADGE]
             📅 Período
             ✅ XX% Adesão (XX/XX dias)         [📋 Ver Logs]

[Carregar mais ciclos anteriores]
```

**Dados mock (history-mock.json):**
```json
{
  "stats": {
    "adherenceAvg": 92,
    "totalCycles": 14,
    "totalInvested": 3450.00
  },
  "cycles": [
    {
      "id": "cycle-001",
      "supplementId": "creatina-monohidratada",
      "supplementName": "Creatina Monohidratada",
      "category": "AMINOÁCIDO",
      "startDate": "2024-01",
      "endDate": "2024-02",
      "totalDays": 60,
      "adherentDays": 57,
      "adherencePercent": 95
    },
    {
      "id": "cycle-002",
      "supplementId": "ashwagandha-ksm66",
      "supplementName": "Ashwagandha KSM-66",
      "category": "ADAPTÓGENO",
      "startDate": "2023-10",
      "endDate": "2023-12",
      "totalDays": 90,
      "adherentDays": 79,
      "adherencePercent": 88
    },
    {
      "id": "cycle-003",
      "supplementId": "omega3-tg",
      "supplementName": "Ômega 3 TG",
      "category": "ÁCIDO GRAXO",
      "startDate": "2023-07",
      "endDate": "2023-09",
      "totalDays": 90,
      "adherentDays": 68,
      "adherencePercent": 75
    }
  ]
}
```

**Ícone/cor de adesão:**
```javascript
function getAdherenceIcon(percent) {
  if (percent >= 90) return { icon: '✅', class: 'good' }
  if (percent >= 70) return { icon: '⏱', class: 'ok' }
  return { icon: '❌', class: 'bad' }
}
```

**4.2 dosage-calculator.js** (CRIAR)

Layout confirmado por image_94e0e0.jpg:

```
TÍTULO: "Calculadora de Dosagem Clínica"
SUBTÍTULO: "Ajuste sua suplementação com base em dados biométricos e evidência clínica."

2 COLUNAS (não 1 coluna):

ESQUERDA:
  Painel 1 — Dados Biométricos (ícone roxo 📊)
    [input Peso kg]
    [input Gordura Corporal %]
    [select Nível de Atividade]
  
  Painel 2 — Seleção de Composto (ícone roxo 🧪)
    [search input com lupa]

DIREITA:
  Painel 1 — Resultado                    [Manutenção] [Carga]
    DOSAGEM RECOMENDADA
         5.0 g/dia    (GIGANTE 80px)
    ✅ Protocolo Validado por Estudos Clínicos
    [+ Adicionar ao meu Protocolo]
  
  Painel 2 — Contexto Científico (ícone 📖)
    [Racional da Dosagem] | [Nível Evidência + barras]
```

**Valor de dosagem grande:**
```html
<div class="dosage-value-block">
  <div class="dosage-label">DOSAGEM RECOMENDADA</div>
  <div class="dosage-big">
    <span class="dosage-num">5.0</span>
    <span class="dosage-unit">g/dia</span>
  </div>
  <div class="dosage-validated">
    ✅ Protocolo Validado por Estudos Clínicos
  </div>
</div>

<style>
.dosage-num { font-size: 80px; font-weight: 700; color: var(--t1); }
.dosage-unit { font-size: 24px; color: var(--t3); vertical-align: bottom; margin-left: 4px; }
</style>
```

**Toggle Manutenção/Carga:**
```html
<div class="dosage-mode-toggle">
  <button class="dosage-mode-btn active" data-mode="maintenance">Manutenção</button>
  <button class="dosage-mode-btn" data-mode="load">Carga</button>
</div>
```

### Checklist Dia 4
```
[ ] History: 3 metric-cards com valores corretos
[ ] History: barra de adesão animada (width: 92%)
[ ] History: lista de ciclos com ícone por adesão
[ ] History: categoria badge colorida
[ ] History: botão "Ver Logs" por ciclo
[ ] History: "Carregar mais" funcional
[ ] History: tabs filtram por categoria
[ ] Dosage: layout 2 colunas (desktop) / 1 coluna (mobile)
[ ] Dosage: dosagem "5.0 g/dia" em 80px de fonte
[ ] Dosage: toggle Manutenção/Carga muda valor
[ ] Dosage: barras de evidência + segurança animadas
[ ] Dosage: botão "Adicionar ao meu Protocolo" emite evento
[ ] Dosage: search de suplemento com autocomplete
```

---

## DIA 5 — Landing Page + Legal

### Objetivo
Landing page com todas as seções confirmadas por home.png.

### Tarefas

**5.1 index.html** (REESCREVER)

Seções em ordem confirmada por home.png:
1. Nav header (fixo, transparente → sólido no scroll)
2. Hero (splitscreen text + mockup)
3. Ticker marquee (suplementos)
4. Features (3 cards, central destacado)
5. How It Works (3 passos com número de fundo)
6. App mockup/terminal
7. Objectives grid (4x2)
8. Marketplaces (3 cards)
9. CTA final + testemunhos
10. Footer

**Ticker implementation:**
```html
<div class="ticker-wrap">
  <div class="ticker-inner">
    <!-- duplicado para loop infinito -->
    <span>Creatina Monohidratada</span> <span class="sep">→</span>
    <span>Ashwagandha KSM-66</span> <span class="sep">→</span>
    <span>Ômega 3 TG</span> <span class="sep">→</span>
    <span>L-Teanina</span> <span class="sep">→</span>
    <span>Vitamina D3 + K2</span> <span class="sep">→</span>
    <!-- ... repetir 30+ suplementos ... -->
    <!-- duplicar conteúdo para seamless loop -->
  </div>
</div>
```

**Hero mockup (right side):**
```html
<!-- Card simulando a lista de stack (dark, no-bg) -->
<div class="hero-mockup">
  <div class="mock-item">AMG STAB LICOLD — R$ 166,00</div>
  <div class="mock-item mock-highlight">R$ 84,90</div>
  <div class="mock-item">CREAPURE® CREATINE — R$ 142,90</div>
  <div class="mock-item">MATRIX® L-REONINATE — R$ 142,90</div>
  <div class="mock-item">WHEY ISOLATE — R$ 219,90</div>
  <div class="mock-total">TOTAL: R$ 54,90</div>
</div>
```

**5.2 landing.css** (CRIAR)
- Mesmo design-system, fundo #08080f (ligeiramente mais azulado)
- Hero headline: font-size clamp(52px, 8vw, 88px), uppercase
- "EVIDÊNCIAS." com gradient text
- Nav sticky com blur backdrop

### Checklist Dia 5
```
[ ] Nav header: fixo, links funcionais, CTA "MONTAR LISTA"
[ ] Hero: headline 3 linhas, "EVIDÊNCIAS." com gradient
[ ] Hero: 2 CTAs (Montar Stack + Calcular Dosagem)
[ ] Hero: 4 stats animados (counter-up on scroll)
[ ] Hero: mockup da stack do lado direito
[ ] Ticker: animação contínua sem travar
[ ] Features: 3 cards, central com borda brand
[ ] How It Works: 3 passos, número grande de fundo (opacity 0.07)
[ ] Objectives: grid 4x2 com "Ver Todos" destacado
[ ] Marketplaces: 3 cards, central maior
[ ] CTA final: headline 3 linhas + 2 botões
[ ] Footer: "SUPLILIST" + links corretos
[ ] Responsivo mobile (1 coluna)
[ ] Smooth scroll entre seções
```

---

## DIA 6 — My Stack + Analytics + QA Final

### Objetivo
Completar o stack, adicionar analytics e testar tudo.

### Tarefas

**6.1 my-stack-page.js**
> Ver SUPLILIST_PROMPTS_v3_FINAL.md → PROMPT 3.5

**6.2 recipe-page.js** (NOVO — sidebar item confirmado)
```
Página simples (placeholder para futuro):
- Título: "Receitas de Suplementação"
- Grid de protocolos pré-definidos (Hipertrofia, Definição, Saúde Geral, etc.)
- Cada protocolo: nome, objetivo, lista de 3-5 suplementos, custo estimado
- Botão "Aplicar Receita" → adiciona ao My Stack
```

**6.3 compare-page.js** (NOVO — sidebar item confirmado)
```
Comparador side-by-side:
- Input de busca para selecionar 2-3 suplementos
- Tabela comparativa: Custo/dose, Evidência, Dosagem, Preço
- Destaque do vencedor (badge 🏆)
- Ver código original em comparator-modal.js para reutilizar lógica
```

**6.4 analytics.js**
> Ver SUPLILIST_PROMPTS_v3_FINAL.md → PROMPT 5.1

**6.5 QA Visual Final**

Comparar cada página com screenshot:

| Página | Screenshot | Check |
|---|---|---|
| List | lista.png | [ ] |
| Favorites | image_94f403.jpg | [ ] |
| History | image_94f7a8.jpg | [ ] |
| Dosage | image_94e0e0.jpg | [ ] |
| Landing | home.png | [ ] |

**Para cada página verificar:**
```
[ ] Sidebar: logo correto para a página (Precision/Clinical/Vitals)
[ ] Sidebar: item ativo destacado
[ ] Sidebar: badges numéricos corretos
[ ] Sidebar: bottom (status pulsante + btn TEMA)
[ ] Topbar: breadcrumb aparece/some conforme página
[ ] Footer: "SUPLILIST" uppercase + 4 links
[ ] Cards: imagem real exibida
[ ] Badges: NÍVEL A verde / NÍVEL B roxo
[ ] Preços: roxo bold + riscado + /DOSE
[ ] Botões: tamanho, cor e texto corretos
[ ] Mobile: responsivo sem quebrar
```

---

## ARMADILHAS ESPECÍFICAS (baseadas nas screenshots)

### 1. Sidebar subtitle dinâmico
**Problema:** Sidebar mostra textos diferentes por página sem ser uma mudança de estado do app.  
**Solução:** Não é estado — é configuração por rota. Usar mapa de rotas → subtitle.
```javascript
const ROUTE_CONFIG = {
  '/dosage': { subtitle: 'CLINICAL ACCESS', sidebarVariant: 'pro' },
  '/history': { subtitle: 'VITALS OPTIMIZED', sidebarVariant: 'analytics' },
  'default': { subtitle: 'PRECISION MANAGEMENT', sidebarVariant: 'default' }
}
```

### 2. Imagens dos suplementos
**Problema:** Cards precisam de fotos reais, não placeholders.  
**Solução:** 
- Fase 1: usar imagens de placeholder com estilo (pó em tigela escura)
- Fase 2: usar imagens reais dos produtos dos marketplaces
- Fallback sempre: `onerror="this.src='/assets/placeholder-supplement.png'"`

### 3. Donut SVG animado nos stat-cards
**Problema:** CSS puro não anima stroke-dasharray facilmente na entrada.  
**Solução:** Usar IntersectionObserver + JS para animar quando entra na tela:
```javascript
function animateDonut(el, targetProgress) {
  const circle = el.querySelector('.fill-brand, .fill-danger');
  const c = 2 * Math.PI * 22;
  circle.style.strokeDasharray = `0 ${c}`;
  requestAnimationFrame(() => {
    circle.style.transition = 'stroke-dasharray 1s ease';
    circle.style.strokeDasharray = `${targetProgress * c} ${c}`;
  });
}
```

### 4. Preço formatado (R$ 89,90)
**Problema:** Screenshot mostra "R$ 89" grande + ",90" menor + "/ 300g" separado.  
**Solução:**
```javascript
function formatPrice(price) {
  const [int, dec] = price.toFixed(2).split('.');
  return `R$ <span class="price-int">${int}</span><span class="price-dec">,${dec}</span>`;
}
```

### 5. Ticker marquee sem travar
**Problema:** Animação CSS pode travar em mobiles.  
**Solução:** Duplicar conteúdo do ticker no HTML (não via JS) para loop seamless. Pausar no hover.

### 6. Sidebar tem 7 itens, não 6
**Problema:** Router original no código não tem rota `/recipe` e `/compare`.  
**Solução:** Adicionar ambas ao page-router antes de iniciar Dia 3.
- `/recipe`: pode ser placeholder por enquanto
- `/compare`: reutilizar lógica de `comparator-modal.js` existente

### 7. Footer "© 2024" vs "© 2026"
**Observação:** Lista.png mostra "© 2024" (ano de lançamento original).  
**Decisão:** Manter "© 2024" no footer landing page (marca o ano de fundação). 
No app, usar "© 2026" (ano atual).

### 8. Dosagem 80px de fonte
**Problema:** Fonte muito grande pode quebrar em telas < 360px.  
**Solução:**
```css
.dosage-num { font-size: clamp(48px, 10vw, 80px); }
```

### 9. Badge NÍVEL na lista vs no favorites
**Lista (lista.png):** Badge colorido pequeno no canto da imagem (overlay)  
**Favorites (image_94f403.jpg):** Badge inline abaixo da imagem, junto com badge de objetivo  
Usar a mesma classe `.badge-nivel-*` mas posicionamento diferente por contexto.

### 10. Topbar sem breadcrumb na history
**Problema:** Em algunas páginas o breadcrumb some, tornando topbar só com ícones.  
**Solução:**
```javascript
const PAGES_WITH_BREADCRUMB = ['/favorites', '/list', '/my-stack', '/recipe', '/compare']
function shouldShowBreadcrumb(route) {
  return PAGES_WITH_BREADCRUMB.includes(route)
}
```

---

## ESTRUTURA DE PASTAS FINAL

```
/
├── index.html               ← landing page
├── app.html                 ← app shell
├── manifest.json            ← PWA
├── service-worker.js        ← PWA offline
│
├── assets/
│   └── supplements/
│       ├── creatina-monohidratada.jpg
│       ├── maca-peruana.jpg
│       ├── ashwagandha-ksm66.jpg
│       ├── l-theanine.jpg
│       └── placeholder-supplement.png
│
├── src/
│   ├── css/
│   │   ├── design-system.css    ← tokens + componentes
│   │   ├── main.css             ← layout app
│   │   └── landing.css          ← landing page
│   │
│   └── js/
│       ├── main.js              ← bootstrap
│       ├── core/
│       │   ├── eventbus.js      ✅ pronto
│       │   ├── state-manager.js ✅ pronto
│       │   ├── error-boundary.js ✅ pronto
│       │   └── page-router.js   ← novo (7 rotas)
│       │
│       ├── components/
│       │   ├── sidebar-nav.js   ← reescrever (7 itens)
│       │   ├── top-bar.js       ← novo
│       │   ├── list-page.js     ← novo
│       │   ├── favorites-page.js ← atualizar
│       │   ├── history-page.js  ← novo
│       │   ├── dosage-calculator.js ← novo
│       │   ├── my-stack-page.js ← novo
│       │   ├── recipe-page.js   ← novo (placeholder)
│       │   └── compare-page.js  ← novo
│       │
│       ├── utils/
│       │   ├── analytics.js     ← novo (GA4 wrapper)
│       │   └── ... (existentes) ✅
│       │
│       └── data/
│           ├── supplements.js   ✅ pronto
│           └── history-mock.json ← novo
│
└── legal.html               ← página legal
```

---

## MÉTRICAS DE SUCESSO

Ao final do Dia 6, o app deve ter:

| Métrica | Target | Medição |
|---|---|---|
| Lighthouse Performance | >80 | Lighthouse CI |
| Lighthouse A11y | >90 | Lighthouse CI |
| First Contentful Paint | <1.5s | Lighthouse |
| Bundle size | <200KB gzip | Vite build output |
| Páginas funcionais | 7/7 | Manual |
| Screenshots match | 5/5 | Side-by-side |
| Mobile responsivo | Sim | DevTools 375px |
| PWA installable | Sim | Chrome → Install |

---

## PRÓXIMA VERSÃO (pós v3.0)

Features vistas nas screenshots mas não prioritárias agora:
- **Sidebar "TEMA" button**: toggle para tema claro (futuro)
- **Sidebar variants** "Pro/Clinical" vs "Default": flag no estado do usuário
- **Ticker na landing**: já incluído na v3.0
- **Recipe page**: placeholder v3.0, funcional em v3.1
- **Compare page**: reutilizar modal existente em v3.0

---

*Roadmap Visual Atualizado: 25 de maio de 2026 | Baseado em 6 screenshots confirmados*
