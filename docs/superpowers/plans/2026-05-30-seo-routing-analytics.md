# SEO, Routing Fix e Analytics — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir URLs com hash residual, ativar Plausible SPA tracking e adicionar melhorias de SEO técnico (FAQPage schema, noscript, title dinâmico).

**Architecture:** 3 grupos independentes em 8 arquivos existentes. Grupo 1 remove hash das URLs e fixa a landing em `/`. Grupo 2 conecta o Plausible ao router para rastrear cada navegação. Grupo 3 adiciona schema, noscript e titles dinâmicos no `index.html` e `app.js`. Nenhum arquivo novo criado.

**Tech Stack:** Vanilla JS, Vite, GitHub Pages, Plausible Analytics, Schema.org JSON-LD.

**Spec:** `docs/superpowers/specs/2026-05-30-seo-routing-analytics-design.md`

---

## Mapa de Arquivos

| Arquivo | Grupo | O que muda |
|---|---|---|
| `src/core/app.js` | 1 + 3 | Remove replaceState('/home'); adiciona mapa de titles |
| `src/pages/home-page.js` | 1 | `_onClick`: troca `location.hash` por `pushState` |
| `src/pages/faq-page.js` | 1 | 5 data-href de `#/rota` → `/rota` |
| `src/pages/checkin-page.js` | 1 | 1 href `#/my-stack` → `/my-stack` + click handler |
| `index.html` | 2 + 3 | Script Plausible + FAQPage JSON-LD + noscript + preconnect + twitter:creator |
| `src/core/router.js` | 2 | `plausible('pageview')` em `handleRoute()` |

---

## Task 1: Fix `app.js` — remover redirect `/home` e adicionar title dinâmico

**Files:**
- Modify: `src/core/app.js`

- [ ] **Step 1: Remover o bloco replaceState('/home')**

Localizar e remover as linhas abaixo em `app.js` (dentro do `DOMContentLoaded`):

```js
// REMOVER este bloco inteiro (aprox. linhas 41-45):
const currentPath = window.location.pathname;
if (currentPath === '/' || currentPath === '') {
  window.history.replaceState(null, null, '/home');
  applyLandingMode();
}
```

A rota `/` já está mapeada para `home-page.js` no array `routes` — o redirect é desnecessário.

- [ ] **Step 2: Adicionar mapa de titles e função `updatePageTitle`**

Logo após o array `routes` (linha ~19), adicionar:

```js
const PAGE_TITLES = {
  '/':          'SupliList | Suplementação Baseada em Evidências',
  '/home':      'SupliList | Suplementação Baseada em Evidências',
  '/list':      'Catálogo de Suplementos | SupliList',
  '/my-stack':  'Meu Stack | SupliList',
  '/favorites': 'Favoritos | SupliList',
  '/checkin':   'Check-in Diário | SupliList',
  '/history':   'Histórico | SupliList',
  '/dosage':    'Calculadora de Dosagem | SupliList',
  '/profile':   'Meu Perfil | SupliList',
  '/settings':  'Configurações | SupliList',
  '/faq':       'Perguntas Frequentes | SupliList',
  '/legal':     'Termos & Privacidade | SupliList',
};

function updatePageTitle() {
  const path = window.location.pathname;
  document.title = PAGE_TITLES[path] || 'SupliList | Suplementação Baseada em Evidências';
}
```

- [ ] **Step 3: Chamar `updatePageTitle` na inicialização e a cada navegação**

No `DOMContentLoaded`, após `applyLandingMode()` (linha ~37), adicionar:
```js
updatePageTitle();
```

No listener de `popstate` existente (linha ~38), atualizar de:
```js
window.addEventListener('popstate', applyLandingMode);
```
Para:
```js
window.addEventListener('popstate', () => {
  applyLandingMode();
  updatePageTitle();
});
```

- [ ] **Step 4: Verificar**

Abrir `http://localhost:5173/` no browser. A URL deve permanecer `/` (não redirecionar para `/home`). A tab do browser deve mostrar `SupliList | Suplementação Baseada em Evidências`.

Navegar para o Catálogo via sidebar. A URL deve ir para `/list` e a tab deve mostrar `Catálogo de Suplementos | SupliList`.

- [ ] **Step 5: Commit**

```bash
git add src/core/app.js
git commit -m "feat(routing): landing at / without redirect; dynamic page titles per route"
```

---

## Task 2: Fix `home-page.js` — botões usam `pushState`

**Files:**
- Modify: `src/pages/home-page.js`

- [ ] **Step 1: Substituir `_onClick` handler em `_bindEvents()`**

Localizar o método `_bindEvents()` e substituir o handler `_onClick` inteiro:

```js
_bindEvents() {
  this._onClick = (e) => {
    const navTarget = e.target.closest('[data-nav]');
    if (navTarget) {
      e.preventDefault();
      const path = navTarget.getAttribute('data-nav');
      if (path) {
        window.history.pushState(null, null, path);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
      return;
    }
    const actionTarget = e.target.closest('[data-action]');
    if (actionTarget) {
      const action = actionTarget.getAttribute('data-action');
      if (action === 'scroll-features') {
        document.getElementById('lp-features')?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };
  this.container.addEventListener('click', this._onClick);
}
```

Os valores dos `data-nav` já são caminhos limpos (`/list`, `/list?objective=Hipertrofia`, etc.) — nenhuma mudança nos templates HTML.

- [ ] **Step 2: Verificar**

Acessar `http://localhost:5173/`. Clicar em "Começar Agora →". A URL deve ir para `/list` (não `/#/list`). Clicar em "Ver Recursos ↓". Deve fazer scroll suave para a seção de features sem mudar a URL.

- [ ] **Step 3: Commit**

```bash
git add src/pages/home-page.js
git commit -m "fix(landing): _onClick uses pushState instead of location.hash"
```

---

## Task 3: Fix `faq-page.js` — 5 links hash → pathname

**Files:**
- Modify: `src/pages/faq-page.js`

- [ ] **Step 1: Atualizar os 5 valores de `data-href`**

Localizar e substituir cada ocorrência nos dados `FAQ_DATA` e no template de rodapé:

```js
// Linha ~25 — em FAQ_DATA, categoria "Suplementos & Dosagens":
// ANTES:
'data-href="#/legal?doc=medico"'
// DEPOIS:
'data-href="/legal?doc=medico"'

// Linha ~47 — em FAQ_DATA, categoria "Preços & Compras":
// ANTES:
'data-href="#/legal?doc=afiliados"'
// DEPOIS:
'data-href="/legal?doc=afiliados"'

// Linha ~57 — em FAQ_DATA, categoria "Privacidade & Dados":
// ANTES:
'data-href="#/legal?doc=privacidade"'
// DEPOIS:
'data-href="/legal?doc=privacidade"'

// Linha ~62 — em FAQ_DATA, categoria "Privacidade & Dados":
// ANTES:
'data-href="#/settings"'
// DEPOIS:
'data-href="/settings"'

// Linha ~256 — no template de rodapé da FAQ:
// ANTES:
'data-href="#/legal"'
// DEPOIS:
'data-href="/legal"'
```

- [ ] **Step 2: Remover o `replace(/^#/, '')` desnecessário**

Localizar `_onLinkClick` (linha ~336). O handler já usa `pushState` corretamente. Remover o replace que não é mais necessário:

```js
// ANTES (linha ~342):
_onLinkClick(e) {
  const link = e.target.closest('.faq-link, .faq-footer-link');
  if (!link) return;
  e.preventDefault();
  const href = link.dataset.href;
  if (href) {
    const path = href.replace(/^#/, '');  // ← REMOVER esta linha
    window.history.pushState(null, null, path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
}

// DEPOIS:
_onLinkClick(e) {
  const link = e.target.closest('.faq-link, .faq-footer-link');
  if (!link) return;
  e.preventDefault();
  const href = link.dataset.href;
  if (href) {
    window.history.pushState(null, null, href);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
}
```

- [ ] **Step 3: Verificar**

Acessar `http://localhost:5173/faq`. Clicar no link "Aviso Médico" na resposta sobre dosagens. A URL deve ir para `/legal?doc=medico` (não para `/#/legal?doc=medico`). Clicar em "Configurações" na resposta sobre backup. A URL deve ir para `/settings`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/faq-page.js
git commit -m "fix(faq): internal links use pathname instead of hash"
```

---

## Task 4: Fix `checkin-page.js` — link `#/my-stack` → pathname

**Files:**
- Modify: `src/pages/checkin-page.js`

- [ ] **Step 1: Localizar o link no template de empty state**

Localizar linha ~334 no template:
```html
<a href="#/my-stack" style="
  display: inline-block;
  background: var(--color-brand);
  ...
```

- [ ] **Step 2: Converter para `data-route` com click handler**

Substituir o `<a href="#/my-stack"` por `<a href="/my-stack" data-nav-internal="/my-stack"` e manter todos os estilos:

```html
<a href="/my-stack" data-nav-internal="/my-stack" style="
  display: inline-block;
  background: var(--color-brand);
  color: #fff;
  text-decoration: none;
  font-weight: 700;
  font-size: 14px;
  padding: 12px 28px;
  border-radius: 10px;
```

- [ ] **Step 3: Adicionar click delegation em `mount()`**

Na classe `CheckinPage`, no método `mount()`, após `this._render()`, adicionar um listener de click que intercepta `[data-nav-internal]`:

```js
// Adicionar no final de mount(), após this._render() e this._attachListeners():
this._internalNavHandler = (e) => {
  const el = e.target.closest('[data-nav-internal]');
  if (!el) return;
  e.preventDefault();
  const path = el.getAttribute('data-nav-internal');
  window.history.pushState(null, null, path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};
this.container.addEventListener('click', this._internalNavHandler);
```

E no `unmount()`, remover o listener:
```js
// Adicionar no unmount():
if (this._internalNavHandler) {
  this.container.removeEventListener('click', this._internalNavHandler);
  this._internalNavHandler = null;
}
```

- [ ] **Step 4: Verificar**

Acessar `http://localhost:5173/checkin` sem nenhum suplemento no stack. O empty state deve mostrar o botão "Ir para Meu Stack" (ou similar). Clicar nele — a URL deve ir para `/my-stack` (não `/#/my-stack`).

- [ ] **Step 5: Commit**

```bash
git add src/pages/checkin-page.js
git commit -m "fix(checkin): empty state link uses pushState instead of hash href"
```

---

## Task 5: Fix `index.html` — Plausible script + SEO tags

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Substituir o bloco do Plausible**

Localizar o bloco atual (linhas ~74-79):
```html
<!-- Privacy-friendly analytics by Plausible -->
<script async src="https://plausible.io/js/pa-LaL2LVjzBHnIOJGPIJ9Gh.js"></script>
<script>
  window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};
  plausible.init()
</script>
```

Substituir por:
```html
<!-- Privacy-friendly analytics by Plausible -->
<script defer data-domain="suplilist.com" src="https://plausible.io/js/script.js"></script>
<script>
  window.plausible = window.plausible || function() {
    (window.plausible.q = window.plausible.q || []).push(arguments);
  };
</script>
```

> **Atenção:** Se após o deploy o painel Plausible ainda não mostrar dados, verificar em Settings → Installation do painel qual é a URL exata do script gerada para `suplilist.com`. A URL `pa-LaL2LVjzBHnIOJGPIJ9Gh.js` pode ser uma URL proxy válida — se for, usá-la mantendo o `data-domain` e trocando `async` por `defer`.

- [ ] **Step 2: Adicionar `preconnect` para Plausible e `twitter:creator`**

Logo após os preconnects das fontes (linha ~72), adicionar:
```html
<link rel="preconnect" href="https://plausible.io">
<meta name="twitter:creator" content="@suplilist">
```

- [ ] **Step 3: Adicionar `<noscript>` fallback antes de `</head>`**

```html
<noscript>
  <style>body { display: block !important; }</style>
  <div style="font-family:sans-serif;max-width:600px;margin:40px auto;padding:0 20px">
    <h1>SupliList — Suplementação Baseada em Evidências</h1>
    <p>Compare preços de 57+ suplementos na Amazon, Mercado Livre e Shopee. Calcule doses personalizadas baseadas em evidência científica. 100% offline e gratuito.</p>
    <h2>Funcionalidades</h2>
    <ul>
      <li>Comparação de preços entre 3 marketplaces</li>
      <li>Calculadora de dosagem por peso e objetivo</li>
      <li>Stack personalizado de suplementos</li>
      <li>Evidência científica (Grau A, B, C) para cada suplemento</li>
    </ul>
    <p><a href="https://suplilist.com">Acesse suplilist.com</a></p>
  </div>
</noscript>
```

- [ ] **Step 4: Adicionar FAQPage JSON-LD após o WebApplication schema existente**

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "O SupliList é gratuito?",
      "acceptedAnswer": { "@type": "Answer", "text": "Sim, 100% gratuito. Sem plano pago, sem assinatura oculta, sem anúncios no app." }
    },
    {
      "@type": "Question",
      "name": "Preciso criar uma conta?",
      "acceptedAnswer": { "@type": "Answer", "text": "Não. O SupliList não tem sistema de login. Tudo funciona localmente no seu dispositivo, sem nenhum cadastro." }
    },
    {
      "@type": "Question",
      "name": "Funciona sem internet?",
      "acceptedAnswer": { "@type": "Answer", "text": "Sim. É um PWA (Progressive Web App). Após o primeiro acesso, funciona completamente offline. Você pode instalá-lo na tela inicial do celular como um app nativo." }
    },
    {
      "@type": "Question",
      "name": "As dosagens são recomendações médicas?",
      "acceptedAnswer": { "@type": "Answer", "text": "Não. As dosagens exibidas são baseadas em literatura científica e têm caráter exclusivamente educativo e informativo. Sempre consulte um médico ou nutricionista antes de iniciar qualquer suplementação." }
    },
    {
      "@type": "Question",
      "name": "De onde vêm as informações dos suplementos?",
      "acceptedAnswer": { "@type": "Answer", "text": "De estudos clínicos, revisões sistemáticas e meta-análises publicadas em bases científicas. Cada suplemento possui um Nível de Evidência (A, B ou C) que reflete a robustez das evidências disponíveis." }
    },
    {
      "@type": "Question",
      "name": "Os preços são atualizados em tempo real?",
      "acceptedAnswer": { "@type": "Answer", "text": "Os preços exibidos são referências e podem não refletir o valor atual. Sempre confirme o preço final diretamente no site do vendedor antes de comprar." }
    },
    {
      "@type": "Question",
      "name": "Vocês ganham comissão nas compras?",
      "acceptedAnswer": { "@type": "Answer", "text": "Sim, alguns links são de programas de afiliados (Amazon Associates, ML Afiliados, Shopee Afiliados). Ao comprar por esses links, podemos receber uma pequena comissão sem custo adicional para você." }
    },
    {
      "@type": "Question",
      "name": "Meus dados são seguros?",
      "acceptedAnswer": { "@type": "Answer", "text": "Sim. Toda a sua informação fica armazenada exclusivamente no localStorage do seu navegador. Não possuímos servidores, não coletamos dados pessoais." }
    },
    {
      "@type": "Question",
      "name": "Como faço backup dos meus dados?",
      "acceptedAnswer": { "@type": "Answer", "text": "Acesse Configurações → Dados & Privacidade → Exportar meus dados. Um arquivo JSON com todos os seus dados será baixado para o seu dispositivo." }
    }
  ]
}
</script>
```

- [ ] **Step 5: Verificar**

Abrir `http://localhost:5173/` e inspecionar o `<head>` no DevTools. Confirmar:
1. Script Plausible tem `data-domain="suplilist.com"` e `defer`
2. `<link rel="preconnect" href="https://plausible.io">` presente
3. `<meta name="twitter:creator" content="@suplilist">` presente
4. `<noscript>` presente
5. Segundo bloco `<script type="application/ld+json">` com `@type: FAQPage` presente

Validar o schema em: https://validator.schema.org — colar o HTML do `<head>` e verificar se FAQPage aparece sem erros.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat(seo): Plausible data-domain, FAQPage schema, noscript, preconnect, twitter:creator"
```

---

## Task 6: Fix `router.js` — disparar `plausible('pageview')` por rota

**Files:**
- Modify: `src/core/router.js`

- [ ] **Step 1: Adicionar chamada ao Plausible em `handleRoute()`**

Localizar o bloco `try` em `handleRoute()` (linha ~60). Após `await this.currentPage.mount()`, adicionar:

```js
try {
  const mod = await route.load();
  const PageClass = mod.default;
  this.currentPage = new PageClass(this.container, params);
  await this.currentPage.mount();

  // ← ADICIONAR após o mount:
  if (typeof window.plausible === 'function') {
    const pathname = window.location.pathname;
    const search = window.location.search;
    window.plausible('pageview', {
      u: 'https://suplilist.com' + pathname + search,
    });
  }

} catch (mountErr) {
  console.error('[Router] page load/mount error:', mountErr);
  // ... erro handling existente
}
```

- [ ] **Step 2: Verificar em desenvolvimento**

Abrir `http://localhost:5173/` com DevTools → Network → filtrar por `plausible`. Navegar para `/list`. Verificar se há uma requisição para `plausible.io` sendo feita (em produção; em dev o script pode não enviar se o domínio não bater).

Alternativa de verificação: adicionar temporariamente um `console.log('[Plausible] pageview:', pathname)` antes da chamada, navegar entre páginas, e confirmar que o log aparece a cada navegação. Remover o log antes de commitar.

- [ ] **Step 3: Commit**

```bash
git add src/core/router.js
git commit -m "feat(analytics): fire plausible pageview on every route change"
```

---

## Self-Review

**Spec coverage:**

| Requisito da spec | Task |
|---|---|
| Remover replaceState('/home') | Task 1 |
| Landing em `/` | Task 1 |
| Title dinâmico por rota | Task 1 |
| home-page.js usa pushState | Task 2 |
| faq-page.js 5 links hash → pathname | Task 3 |
| checkin-page.js 1 link hash → pathname | Task 4 |
| Plausible data-domain + defer | Task 5 |
| preconnect Plausible | Task 5 |
| twitter:creator | Task 5 |
| noscript fallback | Task 5 |
| FAQPage JSON-LD | Task 5 |
| plausible('pageview') no router | Task 6 |

**Placeholder scan:** Nenhum TBD. A nota sobre URL do Plausible é uma instrução de verificação condicional, não um placeholder.

**Consistência:** `updatePageTitle` definida em Task 1 e chamada no mesmo arquivo. `_internalNavHandler` definido e destruído no mesmo arquivo (Task 4). Chamada ao Plausible usa `window.plausible` que é inicializado em `index.html` Task 5.
