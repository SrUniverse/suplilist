# SupliList v3.0 — PROMPTS COMPLETOS (VERSÃO FINAL COM BLINDAGEM)
## Redesign: Do design atual para o novo app-style + Fortress Técnica

**Uso:** Cole o CONTEXTO GLOBAL no início de cada sessão, depois cole o prompt da fase.

---

## ⚠️ CONTEXTO GLOBAL v3.0 (EXPANDIDO)

> Cole SEMPRE no início de cada sessão antes de qualquer prompt.

```
Você está trabalhando no SupliList v3.0 — redesign completo do app de suplementação.

ESTRATÉGIA: Manter core v2.0 intacto. Substituir layout/UI. Adicionar páginas novas.
+ Adicionar PWA robusto, Analytics, Compliance Legal.

ARQUITETURA:
- Zero frameworks pesados (Vanilla JS modular)
- Pub/Sub reativo (EventBus + StateManager)
- Tolerância a falhas (ErrorBoundary em TUDO)
- PWA nativo (offline, install-to-homescreen)
- Analytics G4 invisível (rastreio de conversão)
- Compliance legal (Termos, Privacy, Aviso de Afiliado)

REGRAS ABSOLUTAS (nunca viole):
1. Zero variáveis globais. Tudo via ES6 import/export.
2. Estado APENAS via stateManager.setState(). Nunca mutação direta.
3. Todo componente DEVE ser wrappado com ErrorBoundary.wrap().
4. Event delegation no container, nunca listeners por card.
5. Validação em 3 camadas: input → schema → state.
6. Todos os eventos emitidos devem estar em events.schema.js.
7. Cada função pública deve ter JSDoc completo.
8. Analytics: todo evento de conversão dispara gtag() call.
9. Links de afiliado: sempre com UTM parameters.
10. Avisos legais: aparece no footer + página /legal.

ARQUIVOS JÁ EXISTENTES (NÃO REESCREVA):
- src/js/core/eventbus.js          ✅ pronto
- src/js/core/state-manager.js     ✅ pronto
- src/js/core/error-boundary.js    ✅ pronto
- src/js/utils/ (todos)            ✅ pronto
- src/js/types/ (todos schemas)    ✅ pronto
- src/js/features/ (todos)         ✅ pronto

NOVO DESIGN SYSTEM (use estas variáveis CSS):
--bg-base: #0a0a0a
--bg-sidebar: #111111
--bg-card: #161616
--bg-surface: #1a1a1a
--bg-elevated: #222222
--brand: #7c3aed
--brand-light: #a855f7
--brand-glow: rgba(124, 58, 237, 0.15)
--brand-glow-strong: rgba(124, 58, 237, 0.3)
--success: #22c55e
--warning: #f59e0b
--danger: #ef4444
--t1: #f4f4f5
--t2: #a1a1aa
--t3: #71717a
--border: rgba(255,255,255,0.06)
--sidebar-width: 220px
--topbar-height: 60px

NOVO LAYOUT:
- Sidebar fixa 220px à esquerda (Home, List, My Stack, Favorites, History, Settings)
- Top bar 60px fixo no topo (breadcrumb + ações)
- Main content: flex-grow, scroll interno
- PWA: Service Worker caching assets + offline fallback
- Analytics: GA4 tracking conversions (affiliate clicks, cycle completion)
- Legal: Footer com links para /legal (Termos, Privacy, Aviso)

Leia antes de começar:
@docs/EXECUTIVE_SUMMARY_v3_UPDATED.md (NOVO — com blindagem)
@docs/IMPLEMENTATION_ROADMAP_v3.md
@docs/MIGRATION_GUIDE_v3.md
```

---

# FASE 1 — DESIGN SYSTEM + BLINDAGEM PWA

---

## PROMPT 1.1 — `design-system.css` (REESCREVER)

```
Reescreva src/css/design-system.css para o SupliList v3.0.

TOKENS OBRIGATÓRIOS:

:root {
  /* Backgrounds */
  --bg-base: #0a0a0a;
  --bg-sidebar: #111111;
  --bg-card: #161616;
  --bg-card-hover: #1c1c1c;
  --bg-surface: #1a1a1a;
  --bg-elevated: #222222;

  /* Brand */
  --brand: #7c3aed;
  --brand-light: #a855f7;
  --brand-dim: #5b21b6;
  --brand-glow: rgba(124, 58, 237, 0.15);
  --brand-glow-strong: rgba(124, 58, 237, 0.3);

  /* Status */
  --success: #22c55e;
  --success-bg: rgba(34, 197, 94, 0.1);
  --warning: #f59e0b;
  --warning-bg: rgba(245, 158, 11, 0.1);
  --danger: #ef4444;
  --danger-bg: rgba(239, 68, 68, 0.1);

  /* Text */
  --t1: #f4f4f5;
  --t2: #a1a1aa;
  --t3: #71717a;

  /* Borders */
  --border: rgba(255,255,255,0.06);
  --border-hover: rgba(255,255,255,0.12);
  --border-active: rgba(124, 58, 237, 0.4);

  /* Layout */
  --sidebar-width: 220px;
  --topbar-height: 60px;
  --card-radius: 16px;
  --radius-sm: 8px;
  --radius-md: 12px;

  /* Shadows */
  --shadow-card: 0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3);
  --shadow-card-hover: 0 8px 24px rgba(0,0,0,0.5);
  --shadow-brand: 0 0 20px var(--brand-glow);
}

COMPONENTES OBRIGATÓRIOS:

1. .badge-nivel-a → fundo success-bg, texto success, borda success/30
2. .badge-nivel-b → fundo brand-glow, texto brand-light, borda brand/30
3. .badge-nivel-c → fundo surface, texto t3, borda border
4. .btn-primary → bg brand, texto branco, hover bg brand-light, radius sm
5. .btn-outline → border brand, texto brand-light, hover bg brand-glow
6. .btn-ghost → sem borda, texto t2, hover texto t1 e bg surface
7. .nav-item → flex + gap + padding + radius-sm, texto t2, transition
8. .nav-item.active → bg brand-glow, texto brand-light, borda-esquerda brand
9. .metric-card → bg surface, border, radius-md, padding, flex col
10. .cycle-item → bg card, border, radius-md, flex row, padding
11. :focus-visible → outline 2px solid brand, offset 2px
12. .btn-icon, .btn-favorite → min 44x44px
13. Scrollbar customizada (webkit): track bg-base, thumb bg-surface
14. .toast-* → bg elevated, border, padding, radius-md, slide-in animation
15. .affiliate-link → tag visual "Link de Afiliado" no footer

Regras:
- Zero dependência de Tailwind (CSS puro)
- JSDoc/comentários em cada seção
- Compatível com dark mode permanente
- Acessibilidade WCAG AAA
```

---

## PROMPT 1.2 — `main.css` (REESCREVER)

```
Reescreva src/css/main.css para o SupliList v3.0.

LAYOUT BASE OBRIGATÓRIO:

1. App Shell:
html, body { height: 100%; margin: 0; overflow: hidden; }
#app-shell {
  display: flex;
  height: 100vh;
  background: var(--bg-base);
  font-family: 'Inter', sans-serif;
}

2. Sidebar:
#sidebar {
  width: var(--sidebar-width);
  height: 100vh;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 24px 16px;
  flex-shrink: 0;
  overflow-y: auto;
}

3. App Main:
#app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

4. Top Bar:
#top-bar {
  height: var(--topbar-height);
  background: var(--bg-base);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  flex-shrink: 0;
}

5. Page Content:
#page-content {
  flex: 1;
  overflow-y: auto;
  padding: 28px;
}

6. Cards Grid (página List):
.supplement-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
@media (max-width: 1280px) { grid-template-columns: repeat(3, 1fr); }
@media (max-width: 900px) { grid-template-columns: repeat(2, 1fr); }
@media (max-width: 600px) { grid-template-columns: 1fr; }

7. Card com imagem grande:
.supplement-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--card-radius);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}
.supplement-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
  border-color: var(--border-hover);
}
.supplement-card .card-image {
  width: 100%;
  aspect-ratio: 4/3;
  object-fit: cover;
  background: var(--bg-surface);
}
.supplement-card .card-body { padding: 14px; }

8. Stats bar (topo da List page):
.page-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

9. Tab filters:
.tab-filters {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

10. History metrics:
.history-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
.adherence-bar { height: 6px; background: var(--bg-elevated); border-radius: 3px; overflow: hidden; }
.adherence-fill { height: 100%; background: var(--brand); border-radius: 3px; transition: width 0.5s ease; }

11. Mobile drawer (sidebar):
@media (max-width: 768px) {
  #sidebar {
    position: fixed;
    left: 0;
    top: var(--topbar-height);
    height: calc(100vh - var(--topbar-height));
    z-index: 100;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }
  #sidebar.open {
    transform: translateX(0);
  }
}

12. Footer (legal):
footer {
  border-top: 1px solid var(--border);
  padding: 24px 28px;
  font-size: 12px;
  color: var(--t3);
  display: flex;
  justify-content: space-between;
  margin-top: auto;
}
footer a {
  color: var(--t2);
  text-decoration: none;
  transition: color 0.15s;
}
footer a:hover {
  color: var(--brand);
}

Regras:
- Zero dependência de Tailwind (CSS puro)
- JSDoc/comentários em cada seção
- Compatível com dark mode permanente
- Mobile-first approach
```

---

## PROMPT 1.3 — `manifest.json` + PWA CONFIG (NOVO)

```
Crie src/manifest.json para suportar PWA nativo (install-to-homescreen).

{
  "name": "SupliList — Suplementação Baseada em Ciência",
  "short_name": "SupliList",
  "description": "57+ suplementos, dosagens clínicas, preços em tempo real de 3 marketplaces.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  
  "theme_color": "#7c3aed",
  "background_color": "#0a0a0a",
  
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-maskable-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  
  "categories": ["health", "productivity"],
  "screenshots": [
    {
      "src": "/screenshot-1.png",
      "sizes": "540x720",
      "type": "image/png",
      "form_factor": "narrow"
    },
    {
      "src": "/screenshot-2.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    }
  ],
  
  "shortcuts": [
    {
      "name": "Calculadora de Dosagem",
      "short_name": "Dosagem",
      "description": "Calcule a dosagem ideal baseada no seu peso",
      "url": "/app#/dosage",
      "icons": [{ "src": "/icon-dosage.png", "sizes": "96x96" }]
    },
    {
      "name": "Minhas Compras",
      "short_name": "Compras",
      "description": "Histórico de suplementação e check-ins",
      "url": "/app#/history",
      "icons": [{ "src": "/icon-history.png", "sizes": "96x96" }]
    }
  ],
  
  "share_target": {
    "action": "/share",
    "method": "POST",
    "enctype": "application/x-www-form-urlencoded",
    "params": {
      "title": "title",
      "text": "text"
    }
  }
}

Também crie/registre src/service-worker.js com:
- Cache assets estáticos (CSS, JS, imagens)
- Network-first para dados dinâmicos (histórico)
- Cache-first para lista de suplementos (muda raro)
- Offline fallback page
- Push notifications (para lembretes de recompra)
- Background sync (para sincronizar check-ins offline)

Integre no index.html + app.html:
<link rel="manifest" href="/manifest.json">
<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">

<script>
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').catch(err => console.error(err));
}
</script>
```

---

# FASE 2 — ROUTER + SHELL

---

## PROMPT 2.1 — `page-router.js` (NOVO)

```
Crie src/js/core/page-router.js — SPA router hash-based.

Funcionalidades:
- Hash routing: /#/list, /#/favorites, etc.
- back/forward do browser funciona
- Rota não encontrada → redirect para /list
- Emite 'router:navigate' no EventBus
- Cleanup de página anterior ao trocar rota
- Persiste rota atual no localStorage

Exportar:
export class PageRouter {
  constructor(routes)      // { '/list': createListPage, '/favorites': createFavoritesPage, ... }
  navigate(route)          // Muda hash, emite 'router:navigate'
  getCurrentRoute()        // Retorna rota atual do hash
  init()                   // Inicializa listener de hash
  destroy()
}

Métodos privados:
_onHashChange()          // Listener do hashchange event
_renderRoute(route)      // Desmonta atual, monta nova
_validateRoute(route)    // Valida se rota existe

Testes:
✓ Hash routing funciona (/#/list, /#/favorites, etc.)
✓ Back/forward do browser funciona
✓ Rota não encontrada → redirect para /list
✓ Emite 'router:navigate' correto
✓ Cleanup de página anterior
✓ localStorage persiste rota
```

---

## PROMPT 2.2 — `app.html` (REESCREVER)

```
Reescreva app.html — novo app shell com sidebar + top-bar.

<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SupliList — App</title>
  
  <link rel="manifest" href="/manifest.json">
  <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@700;800&family=Inter:wght@400;500&display=swap" rel="stylesheet">
  
  <link rel="stylesheet" href="/src/css/design-system.css">
  <link rel="stylesheet" href="/src/css/main.css">
  
  <!-- Google Analytics 4 -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXXXX');
  </script>
</head>
<body style="opacity: 0; transition: opacity 0.3s;">

  <div id="app-shell">
    <!-- Sidebar Navigation -->
    <aside id="sidebar">
      <div class="sidebar-logo">⚡ SupliList</div>
      <nav id="sidebar-nav" class="sidebar-nav">
        <!-- Items injetados por sidebar-nav.js -->
      </nav>
      <div class="sidebar-add-btn">
        <button id="add-supplement-btn">+ Add Supplement</button>
      </div>
    </aside>

    <!-- Main App -->
    <div id="app-main">
      <!-- Top Bar -->
      <header id="top-bar">
        <div class="topbar-left">
          <span class="breadcrumb" id="breadcrumb">Home</span>
        </div>
        <div class="topbar-right">
          <button id="notification-btn" class="btn-icon" aria-label="Notificações">🔔</button>
          <button id="dashboard-btn" class="btn-icon" aria-label="Dashboard">📊</button>
          <button id="profile-btn" class="btn-icon" aria-label="Perfil">👤</button>
          <!-- Mobile hamburger -->
          <button id="hamburger-btn" class="btn-icon hamburger" aria-label="Menu" style="display: none;">☰</button>
        </div>
      </header>

      <!-- Page Content (router monta aqui) -->
      <main id="page-content">
        <!-- Páginas injetadas pelo router -->
      </main>

      <!-- Footer com Legal Links -->
      <footer>
        <div>© 2026 SupliList — Suplementação Baseada em Ciência</div>
        <div>
          <a href="/legal">Termos</a> | 
          <a href="/legal">Privacidade</a> | 
          <a href="/legal">Aviso de Afiliado</a>
        </div>
      </footer>
    </div>
  </div>

  <!-- Service Worker Registration -->
  <script>
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .catch(err => console.error('SW registration failed:', err));
    }
  </script>

  <!-- App init script -->
  <script type="module" src="/src/js/main.js"></script>
</body>
</html>

Estilos obrigatórios (em main.css):
- Layout sidebar + main correto no desktop
- Mobile (max-width: 768px): sidebar drawer (position: fixed, left: -100%)
- Mobile: hamburger button visible
- top-bar mostra breadcrumb correto por rota
- page-content tem overflow-y: auto
- Sem scroll no body (scroll interno no main)
```

---

## PROMPT 2.3 — `sidebar-nav.js` (REESCREVER)

```
Reescreva src/js/components/sidebar-nav.js — sidebar expandida com 7 rotas.

Itens da sidebar:
⊞ Home → /#/home
≡ List → /#/list (com badge opcional: "New")
◇ My Stack → /#/my-stack (com badge: "3 items")
♡ Favorites → /#/favorites
📄 Recipe → /#/recipe
⚗ Dosage → /#/dosage
⚖ Compare → /#/compare

Classe:
export class SidebarNav {
  constructor(container, router)
  mount()
  updateActive(route)
  updateBadge(itemId, count)
  destroy()
}

Funcionalidades:
✓ Item ativo destacado (background brand-glow, borda-esquerda brand)
✓ Badge numérico (My Stack: 3)
✓ Click navega via router.navigate()
✓ Subscribe em 'router:navigate' para atualizar ativo
✓ + Add Supplement no bottom fixo (abre modal)
✓ Mobile: click em item fecha sidebar

Eventos:
- Emite: nenhum
- Ouve: 'router:navigate', 'stack:updated' (para badge)

Listeners:
- Event delegation no nav-list
- Click → router.navigate(route)

Mobile:
- Sidebar é drawer (position: fixed)
- Hamburguer button (em top-bar) abre/fecha
- Click em item da sidebar fecha sidebar (remove class "open")
```

---

## PROMPT 2.4 — `top-bar.js` (NOVO)

```
Crie src/js/components/top-bar.js — header fixo com breadcrumb + ações.

Layout:
[SupliList Logo] [Breadcrumb: Home / Favoritos]    |    [🔔] [📊] [👤] [☰]

Classe:
export class TopBar {
  constructor(container)
  mount()
  setBreadcrumb(breadcrumbText)
  setNotificationBadge(count)
  destroy()
}

Funcionalidades:
✓ Breadcrumb atualiza por rota (subscribe em 'router:navigate')
✓ Ícone de notificação com badge se urgente (via 'inventory:urgent')
✓ Click em notificação → vai para /my-stack
✓ Click em dashboard (📊) → vai para /history
✓ Click em perfil (👤) → abre dropdown/modal de settings
✓ Mobile: hamburguer (☰) abre sidebar
✓ Breadcrumb mostra "Home / Favoritos", etc.

Mapa de Rotas → Breadcrumbs:
/home → "Home"
/list → "Home / Catálogo"
/my-stack → "Home / Meu Protocolo"
/favorites → "Home / Favoritos"
/history → "Home / Histórico"
/dosage → "Home / Calculadora"
/settings → "Home / Configurações"

Eventos:
- Ouve: 'router:navigate', 'inventory:urgent'
- Emite: nenhum

Mobile:
- Click em ☰ → dispara click no #hamburger-btn (trigga sidebar drawer)
```

---

# FASE 3 — PÁGINAS DE CONTEÚDO

---

## PROMPT 3.1 — `list-page.js` (CRIAR)

```
Crie src/js/components/list-page.js — página principal de catálogo.

Layout:
[📊 Total: 57] [📊 Pendentes: 27] [📊 Comprados: 0] [🔴 Urgentes: 14]

[🔍 Buscar suplementos...]     [Filtros ⬇]

[Todos] [Adaptógeno] [Hormônio] [Aminoácido] [Mineral] [Saúde Geral]

[Card] [Card] [Card] [Card]
[Card] [Card] [Card] [Card]

Exportar:
export function createListPage(container) {
  // Retorna HTML renderizado + setup de listeners
}

Funcionalidades:
✓ Stats cards no topo com valores reativos (total, pending, bought, urgent)
✓ Abas de categoria funcionam como filtro
✓ Grid 4 colunas no desktop, 2 tablet, 1 mobile
✓ Cards com imagem grande (4:3 aspect ratio)
✓ Cada card: imagem | nome | preço | custo/dose | badge nível | botões
✓ Botão "Ver Melhores Preços" abre modal/rota de comparação
✓ Search no topo (debounce 300ms, fuzzy match com Fuse.js)
✓ Favorite button em cada card (coração)
✓ Mobile responsivo

Search:
- Input top da página
- Busca em supplements.name + supplements.aliases
- Fuse.js threshold 0.3
- Resultado em tempo real

Tabs:
- Todos (mostra todos)
- Adaptógeno, Hormônio, Aminoácido, Mineral, Vitamina, Ácido Graxo, Saúde Geral
- Click em aba → filtra cards
- Aba ativa tem bg brand, texto branco

Stats:
- Total: quantidade total de suplementos
- Pendentes: suplementos favoritados mas não comprados (calculado reativamente confrontando favoritos e histórico)
- Comprados: tá no histórico (cycle.endDate < hoje)
- Urgentes: pote vai acabar em < 5 dias

Eventos:
- Emite: 'list:filter:changed', 'supplement:favorite:toggle', 'supplement:compare'
- Ouve: 'supplement:favorite:toggle' (atualiza coração)

Performance:
- Render lazy: cards fora do viewport não renderizam (intersection observer)
- Card grid é event-delegated (1 listener no container, não 57)
```

---

## PROMPT 3.2 — `favorites-page.js` (ATUALIZAR)

```
Atualize src/js/components/favorites-page.js para novo design.

Layout:
[Home / Favoritos]   [Otimizar Todos]

[Todos] [Hipertrofia] [Foco & Cognição] [Longevidade] [Saúde]

Ordenar por: [Maior Evidência ▼]

[Card] [Card] [Card] [Card]
[Card] [Card] [Card] [Card]

Funcionalidades:
✓ Breadcrumb "Home / Favoritos" no topo
✓ Botão "Otimizar Todos" → abre modal sugerindo uma stack completa
✓ Abas de objetivo filtram por objectiveCategory
✓ Dropdown de ordenação: Maior Evidência, Menor Custo, Mais Barato (por dose), Trending
✓ Cards com imagem grande, badge, nome, preço destaque
✓ Botões "Detalhes" (abre modal) + "Comprar Agora" (link afiliado)
✓ Estado vazio: "Nenhum favorito ainda. Explore o catálogo!" + link para /list
✓ Mobile responsivo

Abas (filtros):
- Todos: todos os favoritos
- Hipertrofia, Foco & Cognição, Longevidade, Saúde: por objetivo

Ordenação:
- Maior Evidência: sort por supplementsDB[id].evidenceLevel (A > B > C > D)
- Menor Custo: sort por price (crescente)
- Mais Barato (por dose): sort por costPerDose
- Trending: (em futuro, por clicks/views recentes)

Otimizar Todos:
- Modal com sugestão de stack complementar
- Ex: "Se você está tomando Creatina, considere adicionar:"
- [Carboidrato] (sinergia) [L-Arginina] (sinergia)
- Botão "Adicionar Stack Sugerida"

Eventos:
- Emite: 'favorites:filter:changed', 'supplement:buy', 'stack:optimize'
- Ouve: 'supplement:favorite:toggle' (atualiza lista)

Analytics:
- gtag('event', 'favorites_page_view', { tab: 'all' })
- gtag('event', 'affiliate_click', { supplement_id, marketplace })
```

---

## PROMPT 3.3 — `history-page.js` (NOVO)

```
Crie src/js/components/history-page.js — página de histórico + métricas.

Layout:
[Média de Adesão: 92% — 🟢] [Total Ciclos: 14] [Investimento: R$ 3.450]

[🔍 Buscar no histórico...]

[Todos] [Aminoácidos] [Adaptógenos] [Vitaminas] [Minerais]

[Ciclo 1: Creatina | Jan-Fev 2024 | 95% Adesão ✓]
[Ciclo 2: Ashwagandha | Out-Dez 2023 | 88% Adesão ✓]
[Ciclo 3: Ômega 3 | Jul-Set 2023 | 75% Adesão ⚠]

[Carregar mais ciclos anteriores...]

Exportar:
export function createHistoryPage(container) {
  // Retorna HTML + setup
}

Funcionalidades:
✓ 3 metric-cards no topo (adesão %, ciclos, investimento R$)
✓ Progress bar na métrica de adesão (0-100%)
✓ Cor da barra: ≥90% verde, 70-89% amarelo, <70% vermelho
✓ Search funciona em supplementName + category
✓ Filtros por categoria (abas)
✓ Cada item: foto | nome | categoria badge | período | % adesão colorido
✓ % adesão com ícone: ✓ (>90%), ⚠ (70-89%), ✗ (<70%)
✓ Botão "Ver Logs" por item (abre modal com check-ins diários)
✓ Botão "Repetir Ciclo" (copia para novo stack)
✓ "Carregar mais" pagination (5 items por vez)
✓ Mobile responsivo

Data (vem de src/data/history-mock.json):
{
  cycles: [
    {
      id: 'cycle-001',
      supplementId: 'creatina-mono',
      supplementName: 'Creatina Monohidratada',
      supplementImage: '/assets/supplements/creatina.jpg',
      category: 'Aminoácido',
      startDate: '2024-01-01',
      endDate: '2024-02-29',
      totalDays: 60,
      adherentDays: 57,
      adherencePercent: 95,
      totalSpent: 89.90
    },
    ...
  ],
  stats: {
    adherenceAvg: 92,
    totalCycles: 14,
    totalInvested: 3450.00
  }
}

Métrica Cards:
- Adesão Média: 92% | barra visual | cor verde
- Total Ciclos: 14 | ícone ✓
- Investimento: R$ 3.450 | ícone 💰

Eventos:
- Emite: 'history:filter:changed', 'history:view:details', 'history:repeat:cycle'
- Ouve: 'cycle:completed' (atualiza histórico em tempo real)

Analytics:
- gtag('event', 'history_page_view')
- gtag('event', 'cycle_viewed', { supplement_id, adherence_percent })
```

---

## PROMPT 3.4 — `dosage-calculator.js` (NOVO)

```
Crie src/js/components/dosage-calculator.js — calculadora clínica dedicada.

Layout (2-col):
LEFT:
[Dados Biométricos]
  Peso (kg): [input: 80]
  Gordura Corporal (%): [input: 15] (opcional)
  Nível de Atividade: [select: Sedentário/Leve/Moderado/Intenso]

[Seleção de Composto]
  [🔍 search input]
  [Creatina Monohidratada] ← autocomplete

RIGHT:
[Resultado da Otimização]
[Manutenção 🔘] [Carga ⭕]
  DOSAGEM RECOMENDADA
  5.0 g/dia
  ✓ Protocolo Validado por Estudos Clínicos
  [+ Adicionar ao meu Protocolo]

[Contexto Científico]
  Racional: "Creatina aumenta ATP..."
  Nível de Evidência: Grau A
  Segurança Renal: Alta

Exportar:
export function createDosageCalculatorPage(container) {
  // Retorna HTML + setup
}

Funcionalidades:
✓ Formulário biométrico funcional (peso, gordura corporal opcional, atividade)
✓ Search de suplemento com autocomplete (Fuse.js)
✓ Cálculo reativo (muda ao trocar suplemento ou peso)
✓ Toggle Manutenção/Carga (muda dose recomendada)
✓ Resultado com dosagem formatada sem decimais desnecessários (5.0g não 4.997g)
✓ Contexto científico puxado de supplementsDB[id]
✓ Barras visuais para Evidência e Segurança
✓ Botão "Adicionar ao Protocolo" (my-stack) emite 'dosage:added:to:stack'
✓ Integra com calculations.js existente
✓ Mobile responsivo (1-col em mobile)

Formulário:
- Peso: input number, min 40 kg, max 200 kg, default 70
- Gordura Corporal: input number, min 5%, max 60%, opcional (preenche automático com 15%)
- Atividade: select com 4 opções, default "Moderado"

Cálculo (integra com calculations.js):
function calculateDosage(supplementId, weight, activityLevel, mode = 'maintenance') {
  const supp = supplementsDB[supplementId];
  let baseDose = mode === 'maintenance' ? supp.dosageMaintenanceBase : supp.dosageLoadBase;
  const weightFactor = weight / 70;
  const activityFactor = ACTIVITY_LEVELS[activityLevel] || 1;
  let finalDose = baseDose * weightFactor * activityFactor;
  if (finalDose > supp.dosageSafetyMax) finalDose = supp.dosageSafetyMax;
  return Math.round(finalDose * 10) / 10;  // Sem decimais desnecessários
}

Resultado:
- Dosagem em bold, grande (18px)
- "✓ Protocolo Validado" em verde se evidenceLevel === 'A'
- "⚠ Estudos Limitados" em amarelo se level === 'C' ou 'D'

Contexto:
- Racional: text de supplementsDB[id].rationale
- Nível de Evidência: badge (A/B/C/D)
- Segurança: barra visual (Alta/Moderada/Baixa)
- Interações Perigosas: lista em vermelho se houver

Eventos:
- Emite: 'dosage:calculated', 'dosage:added:to:stack'
- Ouve: nenhum

Analytics:
- gtag('event', 'dosage_calculated', { supplement_id, weight, activity_level })
- gtag('event', 'dosage_added_to_stack', { supplement_id, dose, unit })
```

---

## PROMPT 3.5 — `my-stack-page.js` (NOVO)

```
Crie src/js/components/my-stack-page.js — página do meu protocolo.

Layout:
[Meu Protocolo]

Total Mensal: R$ 245,90

[Creatina Monohidratada]
  5g/dia → R$ 89,90/mês | [Remover]
  Status: 🟡 Acabando em 10 dias

[Ashwagandha KSM-66]
  600mg/dia → R$ 120,00/mês | [Remover]
  Status: 🟢 Em estoque (28 dias)

[Ômega 3 TG]
  2g/dia → R$ 45,00/mês | [Remover]
  Status: 🔴 Faltando (2 dias)

[+ Adicionar da Calculadora]

[Exportar Stack] [Compartilhar] [Imprimir]

Exportar:
export function createMyStackPage(container) {
  // Retorna HTML + setup
}

Funcionalidades:
✓ Lista de itens do stack carregados de state
✓ Custo total mensal calculado e atualizado
✓ Remover item do stack
✓ Link para Calculadora de Dosagem
✓ Status de estoque visual por item (🟢 / 🟡 / 🔴)
✓ Exportar stack como JSON (para compartilhar)
✓ Compartilhar via link (codificado)
✓ Imprimir (layout A4)
✓ Drag-and-drop para reordenar (nice-to-have)
✓ Mobile responsivo

Status:
- Verde (🟢): >30 dias
- Amarelo (🟡): 5-30 dias
- Vermelho (🔴): <5 dias

Estrutura de item:
{
  supplementId: 'creatina-mono',
  supplementName: 'Creatina Monohidratada',
  dose: 5,
  unit: 'g',
  frequency: 'daily',
  monthlyCost: 89.90,
  estimatedDaysRemaining: 10
}

Exportar Stack:
{
  exportDate: '2026-05-23T10:30:00Z',
  items: [ ... ],
  totalMonthlyCost: 245.90,
  notes: 'Meu protocolo de hipertrofia'
}

→ Download JSON + pode compartilhar link

Eventos:
- Emite: 'stack:updated', 'stack:item:removed', 'stack:exported'
- Ouve: 'dosage:added:to:stack' (atualiza lista)

Analytics:
- gtag('event', 'stack_page_view')
- gtag('event', 'stack_exported')
- gtag('event', 'stack_item_removed', { supplement_id })
```

---

# FASE 4 — LANDING PAGE + LEGAL

---

## PROMPT 4.1 — `index.html` (REESCREVER — landing page)

```
Reescreva index.html como landing page institucional.

Baseado na imagem home.png:

1. HERO
   "SUPLEMENTAÇÃO BASEADA EM EVIDÊNCIAS."
   [MONTAR MINHA STACK] [CALCULAR DOSAGEM]
   Stats (animados): 57+ Suplementos | 3 Marketplaces | 500+ Estudos | R$0 Cadastro

2. FEATURES
   "TUDO QUE VOCÊ PRECISA. JUNTO."
   [Comparação de Preços] [Dosagens Científicas] [Stack Personalizado]

3. HOW IT WORKS
   "3 PASSOS PARA COMPRAR CERTO."
   01 Defina seus Objetivos
   02 Compare Preços e Doses
   03 Marque e Compre

4. OBJECTIVES
   "FILTRADO POR COMO VOCÊ TREINA."
   [Hipertrofia 💪] [Queima de Gordura 🔥] [Energia & Foco ⚡] [Saúde Geral 🌿]
   [Libido & Testo 🔥] [Sono 🌙] [Mulher 🌸] [Ver Todos ➔]

5. MARKETPLACES
   "OS MAIORES MARKETPLACES DO BRASIL."
   [Shopee Logo] [Mercado Livre Logo] [Amazon Logo]

6. CTA FINAL
   "PARE DE ADIVINHAR. COMECE A SUPLEMENTAR COM CIÊNCIA REAL."
   [Montar Minha Lista Agora] [Ver Guia de Uso]

7. FOOTER (com aviso de afiliado)
   © 2026 SupliList | Termos | Privacidade | Aviso de Afiliado

Estilos:
- Tipografia: Outfit para headlines, Inter para body
- Hero gradient: linear-gradient(to right, #f4f4f5, #a855f7)
- Fundo: #080810 com noise texture sutil
- CTA buttons: primários roxo, outline roxo

Funcionalidades:
✓ Hero com headline impactante
✓ CTA links para app.html (app.html#/list, app.html#/dosage)
✓ Stats animados (counter up via JS)
✓ Seção features com cards
✓ How it works com números grandes
✓ Grid de objetivos (8 itens)
✓ Logos dos marketplaces
✓ CTA final com 2 botões
✓ Footer com links legais
✓ Responsivo mobile
✓ Smooth scroll nativo

Analytics:
- gtag('event', 'landing_page_view')
- gtag('event', 'cta_click', { cta_type: 'build-stack' | 'calculate-dosage' })
- Tracking de scroll profundidade

SEO:
- Meta tags básicas (title, description)
- Open Graph (og:image, og:title, etc.) para compartilhamento
- Twitter Card
- Structured data (Schema.org LocalBusiness ou SoftwareApplication)

Mobile:
- Layout responsivo (1-col)
- Imagens otimizadas
- Touch targets 44x44px+
```

---

## PROMPT 4.2 — `landing.css` (NOVO)

```
Crie src/css/landing.css — estilos exclusivos da landing page.

TIPOGRAFIA:
- Headlines: Outfit, 700-800, maiúsculas, tracking-tight
- Body: Inter, 400-500
- Hero h1: clamp(48px, 8vw, 80px), line-height 1.1
- Section h2: clamp(32px, 5vw, 48px)

HERO:
- Background: #080810 com pseudo-elemento noise (opacity 0.03)
- Hero h1 gradiente: linear-gradient(135deg, #f4f4f5 0%, #a855f7 60%)
- Stats: display flex, gap 40px, font bold, separador | entre itens
- Stats number: 24px, brand color; Stats label: 13px, t3
- CTA buttons: 2 botões lado a lado, .btn-primary + .btn-outline

FEATURES GRID:
- 3 colunas, card central (.featured): borda brand, glow brand
- Cards: bg #111, border border, padding 32px, radius 16px
- Hover: translateY(-4px), shadow
- Ícones: 48px, brand color

HOW IT WORKS:
- Steps em 3 colunas com número grande (120px, opacity 0.1) de fundo
- Step number small: 14px, bold, brand color
- Step h3: 18px, bold
- Step p: t2

OBJECTIVES GRID:
- 4x2 grid, card de objetivo: icon 48px, texto 14px, hover brand glow
- "Ver Todos": destaque com bg brand
- Cards: bg surface, border, hover background brand-glow

MARKETPLACES:
- 3 cards lado a lado, card central (.featured) maior
- Texto do marketplace em bold, subtítulo em t3
- Logos: 96px height

CTA FINAL:
- Background brand-glow com blur
- Headline 3 linhas
- Dois botões lado a lado
- Padding large (80px top/bottom)

FOOTER:
- Border-top border
- Flex entre logo e links
- 12px, t3
- Links em hover mudam cor para brand

BOTÕES (gerais):
- .btn-primary: bg brand, color white, padding 14px 28px, radius 8px, hover brand-light, transition
- .btn-outline: border brand, color brand-light, bg transparent, hover bg brand-glow
- .btn-lg: padding 16px 32px, font-size 15px

ANIMAÇÕES:
- Counter up nos stats (quando elemento entra em viewport)
- Fade up nos sections via IntersectionObserver
- Hover lift nos cards (translateY -4px)

Sem Tailwind. CSS puro, bem comentado por seção.
```

---

## PROMPT 4.3 — `/legal` PAGE (NOVO)

```
Crie src/pages/legal.html (ou rota /legal) — Termos, Privacidade, Aviso de Afiliado.

Conteúdo Obrigatório:

# TERMOS DE USO E POLÍTICA DE PRIVACIDADE

## 🔗 Aviso de Afiliado (OBRIGATÓRIO por Lei)

SupliList é suportado por leitores. Podemos receber uma comissão 
quando você clica nos links de compra (Shopee, Amazon, Mercado Livre).

**Isso NÃO afeta o preço que você paga.**

Nós recomendamos produtos baseados em EVIDÊNCIA CIENTÍFICA,
não em comissão.

👉 Confira nossa Metodologia de Avaliação: [link para /metodologia]

---

## 📊 Dados Pessoais

- **Coletamos:** preferências, favoritos, histórico de suplementação, check-ins
- **NÃO coletamos:** localização, câmera, contatos, dados de terceiros
- **GDPR & LGPD compliant** — sua conta é SUA
- **Você pode baixar/deletar seus dados** a qualquer hora: Settings > Exportar Dados

---

## ⚠️ Limitação de Responsabilidade

O SupliList fornece **INFORMAÇÕES EDUCACIONAIS** baseadas em estudos científicos.

**Consulte um médico antes de iniciar qualquer suplementação.**

Nós NÃO somos responsáveis por:
- Reações adversas ou efeitos colaterais
- Diagnóstico ou tratamento de doenças
- Interações medicamentosas (sempre consulte farmacêutico)
- Resultado insuficiente se não seguir protocolo

---

## 🎯 Propriedade Intelectual

- Conteúdo: Copyright © 2026 SupliList
- Open source: [Github link]
- Reuso com atribuição OK (CC-BY-4.0)
- Banco de dados de suplementos: Creative Commons Attribution

---

## 🛡️ Segurança & Cookies

- HTTPS apenas (dados criptografados)
- localStorage no seu navegador (seu controle)
- Service Worker para offline (cache local)
- **Nenhum cookie de rastreamento.** Apenas analytics (Google Analytics 4) anônimo

---

## 📧 Contato

- legal@suplilist.app
- Última atualização: 23 de maio de 2026

---

Estilos:
- .legal-container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
- h2 { margin-top: 40px; color: var(--brand); }
- p { line-height: 1.6; color: var(--t2); }
- Links em brand color com hover

Mobile:
- Padding menor (20px)
- Font menor (13px body)
```

---

# FASE 5 — ANALYTICS + INTEGRAÇÃO

---

## PROMPT 5.1 — `utils/analytics.js` (NOVO)

```
Crie src/js/utils/analytics.js — wrapper de Google Analytics 4.

Exportar singleton:
export class Analytics {
  static init()
  static trackPageView(pageName)
  static trackEvent(eventName, params)
  static trackAffiliateClick(supplementId, marketplace)
  static trackCycleCompletion(supplementId, adherencePercent)
  static trackStackCreated(itemCount)
  static trackLandingCTA(ctaType)
}

Métodos:
- init(): Valida que gtag está disponível
- trackPageView(pageName): Envia pageview (rota)
- trackEvent(name, params): Wrapper genérico do gtag('event', ...)
- trackAffiliateClick(supplementId, marketplace): Quando user clica "Comprar"
- trackCycleCompletion(supplementId, adherencePercent): Quando ciclo completa
- trackStackCreated(itemCount): Quando user cria nova stack
- trackLandingCTA(ctaType): Quando clica CTA na landing

Exemplo:
Analytics.trackAffiliateClick('creatina-mono', 'shopee');
→ gtag('event', 'affiliate_click', {
  supplement_id: 'creatina-mono',
  supplement_name: 'Creatina Monohidratada',
  marketplace: 'shopee',
  timestamp: Date.now()
});

Dashboard GA4:
- Total affiliate clicks
- Clicks por marketplace (Shopee vs Amazon vs ML)
- Top supplements by affiliate clicks
- Conversion funnel (Landing CTA → Affiliate Click)
- User retention (D1, D7, D30)

Integração no main.js:
import { Analytics } from './utils/analytics.js';
Analytics.init();
Analytics.trackPageView('/list');
Analytics.trackAffiliateClick('supplement-id', 'marketplace');
```

---

## PROMPT 5.2 — `main.js` (REESCREVER — com router + analytics)

```
Reescreva src/js/main.js para o SupliList v3.0.

Importações:
- eventbus.js, stateManager, supplementRepo.js, logger.js
- Analytics (novo)
- sidebar-nav.js, top-bar.js, page-router.js
- list-page.js, favorites-page.js, history-page.js, dosage-calculator.js, my-stack-page.js
- toast.js, error-boundary.js

SEQUÊNCIA DE BOOT:

async function init() {
  try {
    // 1. Logger + EventBus prontos (são singletons)
    logger.info('SupliList v3.0 init start');

    // 2. Analytics init
    Analytics.init();

    // 3. Inicializa StateManager (carrega do localStorage)
    stateManager.init();
    logger.info('StateManager initialized');

    // 4. Carrega suplementos na memória
    await supplementRepo.loadAll();
    const suppCount = supplementRepo.getAll().length;
    eventBus.emit('supplements:loaded', { count: suppCount });
    logger.info(`Loaded ${suppCount} supplements`);

    // 5. Aplica tema das settings
    const theme = stateManager.getState('settings.theme') || 'dark';
    document.documentElement.className = theme;

    // 6. Define rotas
    const routes = {
      '/list':       (container) => createListPage(container),
      '/favorites':  (container) => createFavoritesPage(container),
      '/my-stack':   (container) => createMyStackPage(container),
      '/history':    (container) => createHistoryPage(container),
      '/dosage':     (container) => createDosageCalculatorPage(container),
      '/settings':   (container) => createSettingsPage(container),
      '/home':       (container) => createHomePage(container),
    };

    // 7. Inicializa router
    const router = new PageRouter(routes);
    router.init();
    logger.info('Router initialized');

    // 8. Monta sidebar e top-bar (persistentes)
    const sidebar = new SidebarNav(document.getElementById('sidebar-nav'), router);
    sidebar.mount();
    logger.info('Sidebar mounted');

    const topBar = new TopBar(document.getElementById('top-bar'));
    topBar.mount();
    logger.info('TopBar mounted');

    // 9. Eventos globais
    eventBus.on('router:navigate', ({ to }) => {
      Analytics.trackPageView(to);
      logger.info(`Navigate to ${to}`);
    });

    eventBus.on('toast:show', ({ message, type }) => {
      toast.show(message, type);
    });

    eventBus.on('affiliate_click', ({ supplementId, marketplace }) => {
      Analytics.trackAffiliateClick(supplementId, marketplace);
    });

    eventBus.on('inventory:urgent', ({ items }) => {
      // Badge no sino
      const badge = document.getElementById('notification-badge');
      if (badge) badge.textContent = items.length;
    });

    eventBus.on('component:error', ({ componentName, error }) => {
      logger.error(`Component error: ${componentName}`, error);
      toast.show(`Erro em ${componentName}. Tente recarregar.`, 'danger');
    });

    eventBus.on('cycle:completed', ({ supplementId, adherencePercent }) => {
      Analytics.trackCycleCompletion(supplementId, adherencePercent);
    });

    // 10. Check inventário urgente na inicialização
    checkInventoryUrgent();

    // 11. Revela app (remove opacity-0 do body)
    document.body.style.opacity = '1';

    logger.info('SupliList v3.0 initialized successfully');
    
    // 12. Track que app foi aberto (analytics)
    Analytics.trackEvent('app_opened', {
      version: '3.0',
      timestamp: Date.now()
    });

  } catch (err) {
    logger.error('Fatal init error', err);
    document.body.innerHTML = `
      <div style="padding: 40px; color: var(--t1); text-align: center;">
        <h1>⚠️ Erro ao carregar SupliList</h1>
        <p>Tente recarregar a página ou limpar o cache do navegador.</p>
        <p style="color: var(--t3); font-size: 12px;">
          ${err.message}
        </p>
        <button onclick="location.reload()" class="btn-primary">
          Recarregar
        </button>
      </div>
    `;
  }
}

// Função auxiliar
function checkInventoryUrgent() {
  const stacks = stateManager.getState('stack.items') || [];
  const urgentItems = stacks.filter(item => {
    const daysLeft = calculateDaysRemaining(item);
    return daysLeft <= 5;
  });
  
  if (urgentItems.length > 0) {
    eventBus.emit('inventory:urgent', { items: urgentItems });
  }
}

// Boot
document.addEventListener('DOMContentLoaded', init);
init().catch(err => {
  logger.error('Fatal error during init', err);
  console.error(err);
});

// Export para testes
export { init, checkInventoryUrgent };
```

---

## PROMPT 5.3 — Checklist Final de Integração

```
Faça o checklist final de integração do SupliList v3.0.

Verifique e corrija cada item:

NAVEGAÇÃO:
[ ] / (index.html) carrega a landing page corretamente
[ ] CTAs da landing apontam para app.html#/list e app.html#/dosage
[ ] app.html#/list carrega a lista de suplementos
[ ] app.html#/favorites carrega os favoritos
[ ] app.html#/history carrega o histórico
[ ] app.html#/dosage carrega a calculadora
[ ] app.html#/my-stack carrega meu protocolo
[ ] app.html#/settings carrega configurações
[ ] app.html#/home carrega dashboard inicial
[ ] Sidebar marca o item ativo correto em cada rota
[ ] Top bar mostra breadcrumb correto em cada rota
[ ] Back/forward do browser navega corretamente
[ ] /legal carrega termos e privacidade

FUNCIONALIDADES:
[ ] Search na list page filtra em tempo real (300ms debounce)
[ ] Abas de categoria na list page filtram corretamente
[ ] Stats (Total, Pendentes, etc.) estão corretos e reativos
[ ] Favoritar card → coração muda + toast aparece
[ ] Favorito aparece na página de Favorites
[ ] Favorites: filtros por objetivo funcionam
[ ] Favorites: ordenação (Maior Evidência, Menor Custo, etc.)
[ ] History: métricas carregam do history-mock.json
[ ] History: filtros por categoria funcionam
[ ] History: busca funciona
[ ] History: % adesão com cores corretas (verde >90%, amarelo 70-89%, vermelho <70%)
[ ] Dosagem: formulário calcula corretamente
[ ] Dosagem: toggle Manutenção/Carga muda valor
[ ] Dosagem: "Adicionar ao Protocolo" funciona
[ ] Calculadora NÃO mostra decimais desnecessários (5.0g não 4.9971...)
[ ] My Stack: lista carregada do state
[ ] My Stack: custo total mensal calculado
[ ] My Stack: remover item funciona
[ ] My Stack: status de estoque visual (🟢 / 🟡 / 🔴)

ESTADO:
[ ] localStorage persiste ao recarregar
[ ] Favoritos persistem após reload
[ ] Configurações persistem após reload
[ ] Stack persiste após reload
[ ] History persiste após reload

VISUAL:
[ ] Dark mode correto em todas as páginas
[ ] Cards com imagens carregam (ou placeholder elegante se sem imagem)
[ ] Badges Nível A/B/C com cores corretas
[ ] Animação page-enter suave ao trocar rota
[ ] Mobile: sidebar fecha quando clica em item
[ ] Mobile: layout responsivo funciona (4 → 2 → 1 coluna)
[ ] Mobile: hamburger button aparece e funciona
[ ] Scrollbar customizada visível
[ ] Footer com links legais visível

PWA:
[ ] Manifest.json válido (validator online)
[ ] Service Worker registra sem erro no console
[ ] App pode ser instalado (install prompt aparece no mobile)
[ ] App funciona offline (abrir offline → mostra fallback gracioso)
[ ] Notificações push funcionam (opcional mas nice-to-have)

ANALYTICS:
[ ] Google Analytics 4 carrega (check em GA Dashboard)
[ ] Landing CTA dispara gtag('event', 'cta_click', ...)
[ ] Affiliate click dispara gtag('event', 'affiliate_click', ...)
[ ] Page view dispara para cada rota
[ ] Analytics mostra: Total clicks, Clicks por marketplace, Top supplements

LEGAL & COMPLIANCE:
[ ] Footer mostra links: Termos, Privacidade, Aviso de Afiliado
[ ] /legal page carrega e exibe todo conteúdo
[ ] Aviso de afiliado aparece no footer
[ ] Não há links diretos sem UTM (todos têm utm_source=suplilist)
[ ] Google Ads policy compliant (transparency)

CONSOLE:
[ ] Zero erros
[ ] Zero warnings
[ ] Logs informativos visíveis em dev (não polui prod)

PERFORMANCE:
[ ] Vite build size < 200KB gzipped
[ ] First Contentful Paint < 1s (lighthouse)
[ ] Lighthouse score > 80 em mobile e desktop
[ ] Cards renderizam lazy (intersection observer)

Para cada item que FALHAR:
- Descreva o problema
- Erro no console (se houver)
- Solução aplicada
- Retest resultado
```

---

## 📋 RESUMO DOS PROMPTS v3.0 (FINAL)

| Fase | Prompt | O que cria/modifica |
|------|--------|---------------------|
| 1 | 1.1 | design-system.css (reescrito) |
| 1 | 1.2 | main.css (reescrito) |
| 1 | 1.3 | manifest.json + PWA config (NOVO) |
| 2 | 2.1 | page-router.js (NOVO) |
| 2 | 2.2 | app.html (REESCRITO) |
| 2 | 2.3 | sidebar-nav.js (reescrito) |
| 2 | 2.4 | top-bar.js (NOVO) |
| 3 | 3.1 | list-page.js (NOVO) |
| 3 | 3.2 | favorites-page.js (atualizado) |
| 3 | 3.3 | history-page.js (NOVO) |
| 3 | 3.4 | dosage-calculator.js (NOVO) |
| 3 | 3.5 | my-stack-page.js (NOVO) |
| 4 | 4.1 | index.html (reescrito — landing page) |
| 4 | 4.2 | landing.css (NOVO) |
| 4 | 4.3 | legal.html page (NOVO — Termos, Privacy, Aviso) |
| 5 | 5.1 | utils/analytics.js (NOVO — GA4) |
| 5 | 5.2 | main.js (reescrito — com router + analytics) |
| 5 | 5.3 | Checklist final de integração |

**Arquivos mantidos intactos (core v2.0):**
- eventbus.js, state-manager.js, error-boundary.js
- utils/*, types/*, features/*
- All existing tests

**Arquivos novos exclusivamente para blindagem/monetização:**
- analytics.js (GA4 tracking)
- manifest.json (PWA)
- service-worker.js (offline + cache)
- landing.css (landing page)
- legal.html (compliance)

---

*SupliList v3.0 Redesign Prompts — Completo com Blindagem Técnica e Monetização*
*23 de maio de 2026 | Production-Ready*
