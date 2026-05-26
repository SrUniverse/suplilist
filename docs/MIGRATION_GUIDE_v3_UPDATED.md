# SupliList v3.0 — GUIA DE MIGRAÇÃO (COMPLETO)
## O que muda, o que fica, por onde começar + Blindagem Técnica

**Data:** 23 de maio de 2026
**Para:** Desenvolvedor que já implementou a v2.0

---

## ⚡ TL;DR (5 minutos de leitura)

Você tem a v2.0 funcionando. Para chegar ao novo design + blindagem técnica:

1. **NÃO reescreva** nada em `core/`, `utils/`, `types/`, `features/`
2. **Reescreva** os CSS (`design-system.css`, `main.css`)
3. **Crie** `manifest.json` + `service-worker.js` (PWA)
4. **Crie** `analytics.js` + Google Analytics 4 (monetização)
5. **Crie** `app.html` como novo shell do app
6. **Reescreva** `index.html` como landing page
7. **Crie** `/legal` page (compliance)
8. **Adicione** router + sidebar + top-bar
9. **Adicione** as 5 páginas novas (List, History, Dosage, My Stack, Home)
10. **Atualize** `main.js` com router + analytics

---

## 📊 MAPA DE DIFERENÇAS VISUAL

| Elemento | v2.0 (atual) | v3.0 (novo) |
|---|---|---|
| Layout | Bento grid | Sidebar + main content |
| Sidebar | 2 itens | 6 itens (Home, List, My Stack, Favorites, History, Settings) |
| Header | Não tem | Top bar com breadcrumb e ações |
| Cards | Sem imagem | Imagem grande 4:3 |
| Filtros | Painel colapsável lateral | Abas horizontais |
| Calculadora | Embutida na sidebar | Página dedicada |
| Inventário | Embutido na sidebar | Página My Stack |
| Histórico | Não existe | Página com métricas de adesão |
| Landing | Não existe (app direto) | Página institucional |
| Roteamento | Alternância simples de divs | Hash router (#/list, #/favorites...) |
| **PWA** | **Básico** | **Robusto (offline, install, notifications)** |
| **Analytics** | **Nenhum** | **Google Analytics 4 + conversion tracking** |
| **Legal** | **Nenhuma página** | **/legal com Termos, Privacy, Aviso de Afiliado** |

---

## 🗂️ ARQUIVOS: O QUE FAZER COM CADA UM

### ✅ MANTER (zero mudanças)
```
src/js/core/eventbus.js
src/js/core/state-manager.js
src/js/core/error-boundary.js
src/js/utils/logger.js
src/js/utils/constants.js
src/js/utils/validators.js
src/js/utils/formatters.js
src/js/utils/parsers.js
src/js/types/events.schema.js       (apenas adicionar novos eventos)
src/js/types/supplement.schema.js
src/js/types/state.schema.js        (apenas adicionar novos campos)
src/js/features/supplements/
src/js/features/favorites/
src/js/features/inventory/
src/js/features/comparator/
src/js/features/settings/
tests/                               (todos os testes existentes)
database.js, links.js, calculations.js
```

### 🔄 REESCREVER
```
index.html                → virar landing page (novo design)
app.html                  → novo app shell (criar a partir do index atual)
src/css/design-system.css → novas CSS vars (8 cores vs 4 cores v2.0)
src/css/main.css          → novo layout (sidebar fixa)
src/js/main.js            → adicionar router + analytics
src/js/components/sidebar-nav.js → sidebar expandida com 6 itens
```

### ➕ CRIAR (novos arquivos)
```
/* Router + Shell */
src/js/core/page-router.js                  → hash router
src/js/components/top-bar.js               → header fixo

/* Páginas */
src/js/components/list-page.js             → página lista (refactor de supplement-list.js)
src/js/components/history-page.js          → página histórico
src/js/components/dosage-calculator.js     → calculadora clínica
src/js/components/my-stack-page.js         → página my stack
src/js/components/home-page.js             → dashboard inicial

/* Features */
src/js/features/history/historyRepo.js     → repositório do histórico
src/js/features/history/historyService.js  → serviço do histórico

/* Data */
src/js/data/history-mock.json              → dados mock do histórico

/* Analytics */
src/js/utils/analytics.js                  → Google Analytics 4 wrapper

/* Styles */
src/css/landing.css                        → estilos da landing page

/* PWA */
manifest.json                               → PWA manifest
service-worker.js                           → SW para offline + cache

/* Legal */
src/pages/legal.html                        → Termos + Privacidade + Aviso
```

---

## 🚀 ORDEM DE IMPLEMENTAÇÃO (cronograma recomendado)

### Dia 1 — Fundação Visual + PWA
1. Backup: `cp -r . ../suplilist-v2-backup`
2. Reescreva `design-system.css` (Prompt 1.1)
3. Reescreva `main.css` (Prompt 1.2)
4. Crie `manifest.json` (Prompt 1.3)
5. Crie `service-worker.js` (Prompt 1.3)
6. Atualize `tailwind.config.js` (Prompt 1.3)
7. Teste: abra o app atual — deve parecer quebrado visualmente (normal)

### Dia 2 — Shell e Router
1. Crie `page-router.js` (Prompt 2.1)
2. Crie `app.html` (Prompt 2.2)
3. Reescreva `sidebar-nav.js` (Prompt 2.3)
4. Crie `top-bar.js` (Prompt 2.4)
5. Teste: `app.html` deve abrir com sidebar + topbar (sem conteúdo nas páginas ainda)

### Dia 3 — Páginas Principais
1. Crie `list-page.js` (Prompt 3.1) — página mais importante
2. Teste list page antes de continuar
3. Atualize `favorites-page.js` (Prompt 3.2)
4. Teste favorites

### Dia 4 — Páginas Novas + Analytics
1. Crie `history-page.js` (Prompt 3.3) + `history-mock.json`
2. Crie `dosage-calculator.js` (Prompt 3.4)
3. Crie `my-stack-page.js` (versão simples)
4. Crie `analytics.js` (Prompt 5.1) — Google Analytics 4
5. Registre GA4 property ID em `app.html` e `index.html`

### Dia 5 — Landing + Legal + Main.js
1. Reescreva `index.html` como landing (Prompt 4.1)
2. Crie `landing.css` (Prompt 4.2)
3. Crie `/legal` page (Prompt 4.3)
4. Reescreva `main.js` com router + analytics (Prompt 5.2)

### Dia 6 — Integração e Polish
1. Checklist completo (Prompt 5.3)
2. Corrija bugs encontrados
3. Teste responsivo mobile
4. Teste localStorage persistence
5. Teste PWA offline
6. Valide Analytics no GA Dashboard

---

## ⚠️ ARMADILHAS COMUNS (EXPANDIDO)

### 1. Imagens dos cards
**Problema:** Cards sem imagem aparecem vazios.

**Solução:**
```javascript
// Em list-page.js, favorites-page.js, etc:
const imageUrl = supplement.imageUrl || 
  `https://placehold.co/400x300/161616/7c3aed?text=${supplement.name}`;

// Ou adicione imagens reais em src/assets/supplements/
// links.js já mapeia: 'creatina-mono' → '/assets/creatina-mono.jpg'
```

### 2. Dosagem com muitos decimais
**Problema:** Resultado da calculadora mostra `4.9971428...g`.

**Solução:**
```javascript
// Em dosage-calculator.js:
function formatDosage(value) {
  return Math.round(value * 10) / 10;
}
const result = formatDosage(4.9971428);  // → 5.0
```

### 3. Router e múltiplos HTML files
**Problema:** Vite precisa saber que tem `index.html` E `app.html`.

**Solução - vite.config.js:**
```javascript
export default {
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        app: 'app.html',
      }
    }
  }
}
```

### 4. Hash routing no Vite dev server
**Problema:** Será que hash routing funciona no Vite?

**Solução:** Sim, funciona nativamente. Nenhuma configuração necessária.
```javascript
// Funciona direto:
window.location.hash = '#/list';  // ← Vite redireciona para app.html
```

### 5. Mobile sidebar drawer
**Problema:** Sidebar deve ser um drawer no mobile, não visível sempre.

**Solução - main.css:**
```css
@media (max-width: 768px) {
  #sidebar {
    position: fixed;
    left: -100%;
    height: 100vh;
    transition: left 0.3s;
  }
  #sidebar.open {
    left: 0;
  }
}

/* No top-bar.js: */
hamburgerBtn.addEventListener('click', () => {
  sidebar.classList.toggle('open');
});
```

### 6. Google Analytics 4 Property ID
**Problema:** Onde coloco meu GA4 ID?

**Solução:**
```html
<!-- Em index.html E app.html: -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');  // ← Replace com seu ID
</script>
```

### 7. Service Worker scope
**Problema:** Service Worker não carrega offline.

**Solução - service-worker.js:**
```javascript
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1').then((cache) => {
      return cache.addAll([
        '/',
        '/app.html',
        '/src/css/main.css',
        '/src/js/main.js',
        // ... assets essenciais
      ]);
    })
  );
});
```

### 8. localStorage vs State Manager
**Problema:** Estado não persiste após reload.

**Solução:** StateManager já faz isso automaticamente.
```javascript
// Em main.js:
stateManager.init();  // Carrega do localStorage automaticamente

// StateManager.setState() automaticamente salva em localStorage
stateManager.setState('favorites', newFavorites);  // ← Persiste
```

### 9. Favicon + manifest.json
**Problema:** App não aparece com ícone no home screen.

**Solução - app.html + index.html:**
```html
<link rel="manifest" href="/manifest.json">
<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

### 10. Links de afiliado sem UTM
**Problema:** Não sabe qual tráfego vem de SupliList.

**Solução - links.js:**
```javascript
const AFFILIATE_LINKS = {
  'creatina': {
    shopee: 'https://shopee.com/creatina?utm_source=suplilist&utm_campaign=creatina',
    amazon: 'https://amazon.com/creatina?utm_source=suplilist&utm_campaign=creatina',
    // Todos os links TÊM utm_source=suplilist
  }
};
```

---

## 📋 ESTRUTURA DE PASTAS v3.0 (FINAL)

```
suplilist/
├── index.html                        [Landing page (novo)]
├── app.html                          [App shell (novo)]
├── manifest.json                     [PWA manifest (NOVO)]
├── service-worker.js                 [SW offline+cache (NOVO)]
├── package.json
├── tailwind.config.js
├── vite.config.js
│
├── src/
│   ├── js/
│   │   ├── core/
│   │   │   ├── eventbus.js           [MANTIDO]
│   │   │   ├── state-manager.js      [MANTIDO]
│   │   │   ├── error-boundary.js     [MANTIDO]
│   │   │   ├── schema-validator.js   [MANTIDO]
│   │   │   └── page-router.js        [NOVO]
│   │   │
│   │   ├── types/
│   │   │   ├── supplement.schema.js  [MANTIDO]
│   │   │   ├── state.schema.js       [ATUALIZADO]
│   │   │   └── events.schema.js      [ATUALIZADO]
│   │   │
│   │   ├── features/
│   │   │   ├── supplements/          [MANTIDO]
│   │   │   ├── favorites/            [MANTIDO]
│   │   │   ├── inventory/            [MANTIDO]
│   │   │   ├── comparator/           [MANTIDO]
│   │   │   ├── history/              [NOVO — ciclos, adesão]
│   │   │   │   ├── historyRepo.js
│   │   │   │   └── historyService.js
│   │   │   └── settings/             [MANTIDO]
│   │   │
│   │   ├── components/
│   │   │   ├── [v2.0 components mantidos]
│   │   │   ├── top-bar.js            [NOVO]
│   │   │   ├── sidebar-nav.js        [REESCRITO]
│   │   │   ├── list-page.js          [NOVO]
│   │   │   ├── history-page.js       [NOVO]
│   │   │   ├── my-stack-page.js      [NOVO]
│   │   │   ├── dosage-calculator.js  [NOVO]
│   │   │   ├── home-page.js          [NOVO]
│   │   │   ├── metric-card.js        [NOVO]
│   │   │   ├── cycle-item.js         [NOVO]
│   │   │   ├── tab-filter.js         [NOVO]
│   │   │   └── landing-page.js       [NOVO]
│   │   │
│   │   ├── ui/
│   │   │   ├── search-input.js       [ATUALIZADO]
│   │   │   ├── filter-bar.js         [ATUALIZADO — tab style]
│   │   │   ├── sort-menu.js          [MANTIDO]
│   │   │   └── toast.js              [MANTIDO]
│   │   │
│   │   ├── utils/
│   │   │   ├── logger.js             [MANTIDO]
│   │   │   ├── constants.js          [MANTIDO]
│   │   │   ├── validators.js         [MANTIDO]
│   │   │   ├── formatters.js         [MANTIDO]
│   │   │   ├── parsers.js            [MANTIDO]
│   │   │   └── analytics.js          [NOVO — GA4]
│   │   │
│   │   ├── data/
│   │   │   ├── supplements.json      [MANTIDO]
│   │   │   ├── fallback-state.json   [ATUALIZADO]
│   │   │   └── history-mock.json     [NOVO]
│   │   │
│   │   └── main.js                   [REESCRITO — router + analytics]
│   │
│   ├── css/
│   │   ├── main.css                  [REESCRITO]
│   │   ├── design-system.css         [REESCRITO]
│   │   ├── animations.css            [ATUALIZADO]
│   │   └── landing.css               [NOVO]
│   │
│   └── assets/
│       ├── supplements/              [MANTIDO]
│       ├── icons/                    [ATUALIZADO]
│       ├── icon-192.png              [NOVO — PWA]
│       ├── icon-512.png              [NOVO — PWA]
│       └── apple-touch-icon.png      [NOVO — iOS]
│
└── docs/
    ├── EXECUTIVE_SUMMARY_v3.md       [Atualizado com blindagem]
    ├── IMPLEMENTATION_ROADMAP_v3.md  [Mantido]
    ├── MIGRATION_GUIDE_v3.md         [Este documento]
    ├── SUPLILIST_PROMPTS_v3.md       [Atualizado com PWA + Analytics + Legal]
    └── COMPLIANCE_CHECKLIST.md       [NOVO — verificação legal]
```

---

## 🔄 NOVOS EVENTOS (Adições ao events.schema.js)

```javascript
// Router Events
'router:navigate'           → { from: string, to: string }
'router:ready'              → { initialRoute: string }

// History Events
'history:loaded'            → { cycles: Cycle[] }
'history:cycle:view'        → { cycleId: string }
'history:filter:changed'    → { category: string }

// Stack Events
'stack:updated'             → { items: StackItem[] }
'stack:item:added'          → { supplementId: string }
'stack:item:removed'        → { supplementId: string }

// Dosage Events
'dosage:calculated'         → { supplementId, dose, unit, weight, bodyFat }
'dosage:added:to:stack'     → { supplementId, dose }

// Landing Events
'landing:cta:clicked'       → { cta: 'build-stack' | 'calculate-dosage' }

// Analytics Events (novo paradigma)
'affiliate:click'           → { supplementId, marketplace, utmSource }
'cycle:completed'           → { supplementId, adherencePercent }
'analytics:track'           → { eventName, params }

// PWA Events
'pwa:install:prompt'        → { canInstall: boolean }
'notification:permission'   → { permission: 'granted' | 'denied' }

// Inventory Events
'inventory:urgent'          → { items: StackItem[] }
'check:in:completed'        → { supplementId, date, feedback? }
```

---

## 📊 NOVO APPSTATE (Adições ao state.schema.js)

```typescript
AppState {
  // ... campos existentes mantidos ...

  // NOVO: Router
  currentRoute: string,           // '/list', '/favorites', etc.

  // NOVO: History
  history: {
    cycles: Cycle[],
    stats: {
      adherenceAvg: number,       // 0-100
      totalCycles: number,
      totalInvested: number       // R$
    }
  },

  // NOVO: My Stack (separado do inventory)
  stack: {
    items: StackItem[],
    totalMonthlyCost: number
  },

  // NOVO: Check-ins (para timeline + streak)
  checkIns: {
    [supplementId]: [{
      date: string,               // YYYY-MM-DD
      timestamp: number,
      completed: boolean,
      feedback?: string           // energia, foco, sono...
    }]
  },

  // NOVO: Analytics consent
  analytics: {
    consentGiven: boolean,
    allowTracking: boolean,
    lastTrackingUpdate: string    // ISO date
  }
}

// NOVO: Tipo Cycle
Cycle {
  id: string,
  supplementId: string,
  supplementName: string,
  supplementImage: string,
  category: string,
  startDate: string,              // YYYY-MM-DD
  endDate: string,
  totalDays: number,
  adherentDays: number,
  adherencePercent: number,       // calculado
  totalSpent: number
}

// NOVO: Tipo StackItem
StackItem {
  supplementId: string,
  supplementName: string,
  dose: number,
  unit: string,
  frequency: 'daily' | 'weekly',
  monthlyCost: number,
  purchaseDate?: string,
  potWeightGrams?: number,
  daysRemaining?: number
}
```

---

## 🌐 HOSPEDAGEM + DEPLOYMENT

### Recomendação: Vercel + GitHub
```bash
# Push para GitHub
git remote add origin https://github.com/seu-user/suplilist.git
git push origin main

# Conecta no Vercel (importa repo GitHub)
# Automaticamente:
# - Build com Vite
# - Deploy em suplilist.vercel.app
# - HTTPS + SSL grátis
# - PWA funciona em HTTPS
# - Analytics rastreado automaticamente
# - Custom domain (suplilist.app)
```

### Configuração DNS (se usar domínio próprio)
```
suplilist.app CNAME → cname.vercel.com
```

---

## 📈 PRÓXIMOS PASSOS APÓS v3.0

### Curto Prazo (1 mês)
- [ ] Testes E2E com Playwright
- [ ] Performance otimização (Lighthouse score 90+)
- [ ] Mobile app versão (Capacitor/Tauri)
- [ ] Mais imagens de suplementos reais

### Médio Prazo (3 meses)
- [ ] Backend simples (Supabase) para sync multi-device
- [ ] Comunidade / Rankings
- [ ] Notificações push de recompra predictive
- [ ] Integração com smart watch (Apple Watch, Wear OS)

### Longo Prazo (6+ meses)
- [ ] API pública (devs podem integrar SupliList)
- [ ] Marketplace integrado (comprar direto no app)
- [ ] IA para recomendações personalizadas
- [ ] Parceria com apps de fitness (Strava, MyFitnessPal)

---

*SupliList v3.0 Migration Guide — Completo com PWA, Analytics e Legal | 23 de maio de 2026*
