# SEO, Routing Fix e Analytics — Design Spec

## Objetivo

Corrigir 3 problemas críticos que afetam indexação e analytics do SupliList agora, e adicionar melhorias de SEO técnico de médio prazo. Sem criar novos arquivos de página.

## Contexto

SupliList é um PWA estático hospedado no GitHub Pages sob `suplilist.com`. A aplicação usa Vanilla JS com History API para navegação (sem framework). O Vite faz o build para `dist/`, que é deployado via GitHub Actions.

**Estado atual dos problemas:**
- A URL canônica do site aparece como `suplilist.com/#/home` em vez de `suplilist.com/` porque `app.js` faz `replaceState('/home')` e `home-page.js` usa `window.location.hash` nos botões
- Plausible Analytics instalado mas não registra navegação interna — o router nunca chama `plausible('pageview')`
- 6 links internos em `faq-page.js` e `checkin-page.js` ainda usam `#/rota` (hash), que com History API levam para âncora vazia
- FAQPage schema, noscript, preload de fontes e title dinâmico ausentes

---

## Arquitetura da Solução

3 grupos independentes, cada um pode ser commitado separadamente sem quebrar os outros.

```
Grupo 1 — Routing Fix
├── src/core/app.js          (remover replaceState('/home'))
├── src/pages/home-page.js   (_onClick: hash → pushState)
├── src/pages/faq-page.js    (5 links #/rota → /rota)
└── src/pages/checkin-page.js (1 link #/my-stack → /my-stack)

Grupo 2 — Plausible SPA Tracking
├── index.html               (data-domain + defer)
└── src/core/router.js       (plausible pageview em handleRoute)

Grupo 3 — SEO Técnico
├── index.html               (FAQPage JSON-LD, noscript, preload, preconnect, twitter:creator)
└── src/core/app.js          (mapa de titles dinâmicos por rota)
```

**Princípios:**
- Plausible lê `utm_source`, `utm_medium`, `utm_campaign` automaticamente — nenhum código extra para rastrear o Instagram
- FAQPage schema vai estático em `index.html` (não renderizado por JS) para que crawlers sem JS também o vejam
- Title dinâmico via mapa simples em `app.js` — sem lógica nas pages individuais

---

## Grupo 1 — Routing Fix

### 1.1 `src/core/app.js` — Remover redirect `/home`

**Problema:** O bloco abaixo faz a URL canônica da landing ser `/home` em vez de `/`.

```js
// REMOVER este bloco inteiro:
const currentPath = window.location.pathname;
if (currentPath === '/' || currentPath === '') {
  window.history.replaceState(null, null, '/home');
  applyLandingMode();
}
```

O router já tem a rota `/` mapeada para `home-page.js` — o redirect é desnecessário. Após a remoção, `suplilist.com/` carrega a landing diretamente sem mudar a URL.

A função `applyLandingMode` deve continuar reconhecendo `/` como landing:
```js
function applyLandingMode() {
  const path = window.location.pathname;
  const isLanding = path === '/' || path === '/home';
  document.body.classList.toggle('body--landing', isLanding);
}
```
Isso já está correto — nenhuma mudança necessária aqui.

### 1.2 `src/pages/home-page.js` — `_onClick` usar `pushState`

**Problema:** `_onClick` faz `window.location.hash = hash`, o que transforma `/` em `/#/list`.

**Substituição do handler em `_bindEvents()`:**

```js
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
```

Os `data-nav` dos botões já usam caminhos limpos (`/list`, `/list?objective=Hipertrofia`, etc.) — sem mudança nos templates.

### 1.3 `src/pages/faq-page.js` — 5 links hash → pathname

Os links internos usam `data-href` processado por um handler interno da FAQ. Trocar o prefixo `#` dos valores:

| Linha (aprox.) | Antes | Depois |
|---|---|---|
| 25 | `data-href="#/legal?doc=medico"` | `data-href="/legal?doc=medico"` |
| 47 | `data-href="#/legal?doc=afiliados"` | `data-href="/legal?doc=afiliados"` |
| 57 | `data-href="#/legal?doc=privacidade"` | `data-href="/legal?doc=privacidade"` |
| 62 | `data-href="#/settings"` | `data-href="/settings"` |
| 256 | `data-href="#/legal"` | `data-href="/legal"` |

O handler que processa `data-href` (em torno da linha 342) faz `href.replace(/^#/, '')` — essa linha deve ser removida ou ajustada para não precisar mais do replace, uma vez que os valores já chegam sem `#`:

```js
// ANTES:
const path = href.replace(/^#/, '');

// DEPOIS (remover o replace, usar diretamente):
const path = href; // já é /legal?doc=medico etc.
```

Verificar se o handler usa `pushState` ou `location.hash` para navegar. Deve usar:
```js
window.history.pushState(null, null, path);
window.dispatchEvent(new PopStateEvent('popstate'));
```

### 1.4 `src/pages/checkin-page.js` — 1 link hash → pathname

Linha 334: trocar `href="#/my-stack"` por `href="/my-stack"`.

Se o elemento usa `href` diretamente (tag `<a>`), adicionar `data-route="/my-stack"` e tratar via event delegation do `app.js`, ou usar:
```js
onclick="event.preventDefault(); window.history.pushState(null,null,'/my-stack'); window.dispatchEvent(new PopStateEvent('popstate'))"
```

Preferir `data-route` se o padrão da sidebar já funciona assim — manter consistência.

---

## Grupo 2 — Plausible SPA Tracking

### 2.1 `index.html` — Corrigir script do Plausible

**Problema:** Script sem `data-domain` e com `async` em vez de `defer`. O `plausible.init()` manual é desnecessário com o script padrão.

**Substituir o bloco atual:**
```html
<!-- Privacy-friendly analytics by Plausible -->
<script async src="https://plausible.io/js/pa-LaL2LVjzBHnIOJGPIJ9Gh.js"></script>
<script>
  window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};
  plausible.init()
</script>
```

**Pelo novo bloco:**
```html
<!-- Privacy-friendly analytics by Plausible -->
<script defer data-domain="suplilist.com" src="https://plausible.io/js/script.js"></script>
<script>
  window.plausible = window.plausible || function() {
    (window.plausible.q = window.plausible.q || []).push(arguments);
  };
</script>
```

> **Nota:** A URL `pa-LaL2LVjzBHnIOJGPIJ9Gh.js` pode ser um script proxy customizado válido da conta Plausible. Se após o deploy o painel continuar sem dados, verificar no painel Plausible (Settings → Installation) qual é a URL correta para o domínio `suplilist.com`. O `data-domain` é o que conecta visitas ao painel — sem ele, nenhuma visita é registrada independente da URL do script.

### 2.2 `src/core/router.js` — Disparar pageview a cada rota

Em `handleRoute()`, após a página ser montada com sucesso, adicionar a chamada ao Plausible:

```js
async handleRoute() {
  const pathname = window.location.pathname || '/';
  const search = window.location.search || '';
  const match = this.matchRoute(pathname + search);

  if (!match) return;

  // ... unmount, load, mount (código existente) ...

  try {
    const mod = await route.load();
    const PageClass = mod.default;
    this.currentPage = new PageClass(this.container, params);
    await this.currentPage.mount();

    // ← ADICIONAR AQUI: notificar Plausible da nova pageview
    if (typeof window.plausible === 'function') {
      window.plausible('pageview', { u: 'https://suplilist.com' + pathname + search });
    }
  } catch (mountErr) {
    // ... erro handling existente ...
  }

  this.updateNav(pathname);
}
```

**Por que `u:` com a URL completa:** Plausible usa o parâmetro `u` para registrar a URL canônica. Sem ele em SPAs, pode registrar a URL atual do browser que pode ter estado transitório.

**UTM automático:** Plausible lê `utm_source`, `utm_medium` e `utm_campaign` da query string automaticamente. Links do Instagram como `suplilist.com/?utm_source=instagram&utm_medium=bio&utm_campaign=bio-maio` são rastreados sem código adicional.

---

## Grupo 3 — SEO Técnico

### 3.1 `index.html` — FAQPage JSON-LD

Adicionar segundo bloco `<script type="application/ld+json">` após o existente (WebApplication). FAQPage schema estático — visível para crawlers sem JS:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "O SupliList é gratuito?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Sim, 100% gratuito. Sem plano pago, sem assinatura oculta, sem anúncios no app."
      }
    },
    {
      "@type": "Question",
      "name": "Preciso criar uma conta?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Não. O SupliList não tem sistema de login. Tudo funciona localmente no seu dispositivo, sem nenhum cadastro."
      }
    },
    {
      "@type": "Question",
      "name": "Funciona sem internet?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Sim. É um PWA (Progressive Web App). Após o primeiro acesso, funciona completamente offline. Você pode instalá-lo na tela inicial do celular como um app nativo."
      }
    },
    {
      "@type": "Question",
      "name": "As dosagens são recomendações médicas?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Não. As dosagens exibidas são baseadas em literatura científica e têm caráter exclusivamente educativo e informativo. Sempre consulte um médico ou nutricionista antes de iniciar qualquer suplementação."
      }
    },
    {
      "@type": "Question",
      "name": "De onde vêm as informações dos suplementos?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "De estudos clínicos, revisões sistemáticas e meta-análises publicadas em bases científicas. Cada suplemento possui um Nível de Evidência (A, B ou C) que reflete a robustez das evidências disponíveis."
      }
    },
    {
      "@type": "Question",
      "name": "Os preços são atualizados em tempo real?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Os preços exibidos são referências e podem não refletir o valor atual. Sempre confirme o preço final diretamente no site do vendedor antes de comprar."
      }
    },
    {
      "@type": "Question",
      "name": "Vocês ganham comissão nas compras?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Sim, alguns links são de programas de afiliados (Amazon Associates, ML Afiliados, Shopee Afiliados). Ao comprar por esses links, podemos receber uma pequena comissão sem custo adicional para você."
      }
    },
    {
      "@type": "Question",
      "name": "Meus dados são seguros?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Sim. Toda a sua informação fica armazenada exclusivamente no localStorage do seu navegador. Não possuímos servidores, não coletamos dados pessoais e não temos acesso a nenhuma informação sua."
      }
    },
    {
      "@type": "Question",
      "name": "Como faço backup dos meus dados?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Acesse Configurações → Dados & Privacidade → Exportar meus dados. Um arquivo JSON com todos os seus dados será baixado para o seu dispositivo."
      }
    }
  ]
}
</script>
```

### 3.2 `index.html` — noscript, preload, preconnect, twitter:creator

**Adicionar antes do `</head>`:**

```html
<!-- Preconnect analytics -->
<link rel="preconnect" href="https://plausible.io">

<!-- Preload critical fonts (woff2 serve via Google Fonts CDN — usar preconnect é suficiente; preload direto requer URL exata do arquivo) -->
<!-- As fontes já carregam via preconnect href="https://fonts.gstatic.com" crossorigin — adequado -->

<!-- Twitter creator -->
<meta name="twitter:creator" content="@suplilist">

<!-- Noscript fallback para crawlers sem JS -->
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

> **Nota sobre preload de fontes:** Fontes do Google Fonts não têm URL woff2 estável para preload direto — a URL varia por user-agent. O `preconnect` para `fonts.gstatic.com` (já existente) é a abordagem correta para este caso. Não adicionar `<link rel="preload">` para fontes externas sem URL estável.

### 3.3 `src/core/app.js` — Title dinâmico por rota

Adicionar mapa de títulos e atualização em cada navegação:

```js
// Mapa de títulos por rota — adicionar após as rotas
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
  const title = PAGE_TITLES[path] || 'SupliList | Suplementação Baseada em Evidências';
  document.title = title;
}
```

Chamar `updatePageTitle()` em dois lugares:
1. Logo após `applyLandingMode()` no início do `DOMContentLoaded`
2. No listener de `popstate`:

```js
window.addEventListener('popstate', () => {
  applyLandingMode();
  updatePageTitle();
});
```

---

## Instagram — Guia de UTM (sem código)

Nenhum código novo necessário. O Plausible lê UTM automaticamente após o Grupo 2 estar implementado.

**Links para usar no Instagram:**

| Uso | URL |
|---|---|
| Bio (link fixo) | `https://suplilist.com/?utm_source=instagram&utm_medium=bio` |
| Post genérico | `https://suplilist.com/?utm_source=instagram&utm_medium=post&utm_campaign=nome-do-post` |
| Post creatina | `https://suplilist.com/list?objective=Hipertrofia&utm_source=instagram&utm_campaign=creatina` |
| Story foco | `https://suplilist.com/list?objective=Foco&utm_source=instagram&utm_medium=story&utm_campaign=foco` |
| Story longevidade | `https://suplilist.com/list?objective=Longevidade&utm_source=instagram&utm_medium=story&utm_campaign=longevidade` |

**No painel Plausible:** Sources → Instagram → ver qual campanha trouxe mais usuários e qual objetivo eles escolheram.

---

## O que NÃO está no escopo

- Página `/links` (decidido em brainstorming — adicionar numa sprint futura se necessário)
- `fb:app_id` — requer criar app no developers.facebook.com; o sharing já funciona sem ele
- Server-side rendering — fora do escopo para GitHub Pages estático
- Preload de woff2 de Google Fonts — URL instável, preconnect é suficiente

---

## Self-Review

**Cobertura da spec:**
- ✅ Routing fix (4 arquivos, detalhado)
- ✅ Plausible SPA tracking (script + router)
- ✅ FAQPage JSON-LD (9 Q&As completas)
- ✅ noscript, preconnect, twitter:creator
- ✅ Title dinâmico com mapa completo de rotas
- ✅ Guia UTM Instagram

**Placeholder scan:** Nenhum "TBD" ou "TODO". A nota sobre a URL do Plausible está documentada com instrução de verificação.

**Consistência:** O mapa `PAGE_TITLES` usa os mesmos paths do array `routes` em `app.js`. O handler de `faq-page.js` usa `data-href` — verificado que o replace de `#` existe na linha 342 e deve ser removido.

**Escopo:** Focado. 3 grupos, 8 arquivos, sem novos arquivos de página.
