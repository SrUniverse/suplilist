# SupliList v4.0 — SPRINT 1: PROMPTS COMPLETOS (v2)
## Design System + App Shell + PWA + Performance

> **5 prompts de qualidade industrial.**
> Substitui a versão anterior que estava incompleta (faltavam Prompt 1.0, Prompt 1.1 e auditoria de acessibilidade no 1.3).

---

## ÍNDICE DO SPRINT 1

| # | Prompt | Deliverables Principais | Status |
|---|--------|------------------------|--------|
| **1.0** | App Shell HTML | `index.html`, `app.html`, `offline.html` | 🆕 Novo |
| **1.1** | Design System CSS | `design-system.css` (40+ vars, 14+ componentes) | 🆕 Novo |
| **1.2** | PWA Manifest + Service Worker | `manifest.json`, `service-worker.js` | ✅ Mantido |
| **1.3** | Performance + A11y Audit + Build Pipeline | `build.js`, relatório Lighthouse + WCAG | ⚠️ Expandido |
| **1.4** | Core Bootstrapper + EventBus Stub | `core/app.js`, `core/event-bus.js`, `core/state-manager.js` | 🆕 Novo |

---

## **PROMPT 1.0: App Shell HTML — COMPLETO**

```markdown
You are building the HTML shell for SupliList v4.0.

## CONTEXT

This is the entry point and skeleton of the entire application. It must:
- Load in <0.3s even on 3G (critical CSS inlined, no render-blocking resources)
- Work as a Single Page App (SPA) with hash-based routing (#/home, #/list, etc.)
- Register the Service Worker for offline-first functionality
- Provide semantic HTML5 structure for maximum accessibility and SEO
- Support dark mode via <meta> + CSS class system (no flash of unstyled content)
- Serve as the shell that all Web Components will be mounted into

## ARCHITECTURE RULES

- Zero frameworks (no React, Vue, Angular)
- All scripts are `type="module"` or `defer` — no render-blocking
- Critical CSS (above-the-fold) is inlined in <style> inside <head>
- Fonts are preconnected and loaded asynchronously
- The app shell itself is < 5KB uncompressed

---

## TASK 1: CREATE /public/index.html

This is the entry-point served by the web server. It does only one job: detect environment and redirect to app.html.

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" content="#7C3AED" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0A0A0A" media="(prefers-color-scheme: dark)">

  <!-- SEO -->
  <title>SupliList — Sistema Inteligente de Suplementação</title>
  <meta name="description" content="Rastreie suplementos, compare preços em 500+ lojas, receba recomendações de IA. 100% offline, privacidade total.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://suplilist.com/">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="SupliList — Sistema Inteligente de Suplementação">
  <meta property="og:description" content="Rastreie suplementos, compare preços, receba recomendações personalizadas de IA.">
  <meta property="og:image" content="/assets/og-image.png">
  <meta property="og:url" content="https://suplilist.com/">

  <!-- PWA -->
  <link rel="manifest" href="/manifest.json">
  <link rel="apple-touch-icon" href="/assets/icons/icon-192x192.png">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="SupliList">

  <!-- Critical CSS: prevents FOUC (Flash of Unstyled Content) -->
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0A0A0A;color:#F5F5F5}
    body{min-height:100dvh;display:flex;flex-direction:column}
    #app-loading{display:flex;align-items:center;justify-content:center;min-height:100dvh;flex-direction:column;gap:16px}
    .loading-spinner{width:32px;height:32px;border:2px solid #3D3D3D;border-top-color:#7C3AED;border-radius:50%;animation:spin .8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .loading-text{font-size:14px;color:#888;letter-spacing:.05em}
    @media(prefers-color-scheme:light){html{background:#FFFFFF;color:#0A0A0A}.loading-spinner{border-color:#E5E5E5;border-top-color:#7C3AED}}
  </style>

  <!-- DNS Prefetch for external APIs -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="dns-prefetch" href="https://api.shopify.com">
  <link rel="dns-prefetch" href="https://api.stripe.com">
</head>
<body>
  <!-- Loading shell shown while app.js initializes -->
  <div id="app-loading" aria-label="Carregando SupliList" role="status" aria-live="polite">
    <div class="loading-spinner" aria-hidden="true"></div>
    <span class="loading-text">Carregando...</span>
  </div>

  <!-- Main app shell — populated by app.js -->
  <div id="app" style="display:none"></div>

  <!-- Service Worker Registration (non-blocking) -->
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/service-worker.js', { scope: '/' })
          .then(reg => {
            console.log('[SW] Registered:', reg.scope);
            // Check for updates every 60s
            setInterval(() => reg.update(), 60000);
          })
          .catch(err => console.warn('[SW] Registration failed:', err));
      });
    }
  </script>

  <!-- Dark mode: Apply before first paint to avoid flicker -->
  <script>
    (function() {
      const saved = localStorage.getItem('suplilist:theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = saved === 'dark' || (!saved && prefersDark);
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    })();
  </script>

  <!-- App entry point (ES module, non-blocking) -->
  <script type="module" src="/src/core/app.js"></script>
</body>
</html>
```

---

## TASK 2: CREATE /public/app.html ===========

This is the actual SPA shell loaded after initialization. It contains the permanent UI scaffold: top navigation, main router outlet, bottom navigation bar, and toast notification container.

```html
<!DOCTYPE html>
<html lang="pt-BR" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" content="#7C3AED">
  <title>SupliList v4.0</title>

  <!-- Critical CSS inlined -->
  <style>
    /* === RESET & BASE === */
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html{height:100%;overflow:hidden}
    body{height:100%;display:grid;grid-template-rows:auto 1fr auto;background:var(--color-bg-primary);color:var(--color-text-primary);font-family:var(--font-sans);overflow:hidden}

    /* === TOPBAR === */
    #topbar{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;padding-top:max(12px,env(safe-area-inset-top));background:var(--color-surface-primary);border-bottom:1px solid var(--color-border)}
    #topbar .logo{font-size:18px;font-weight:700;letter-spacing:-.02em;color:var(--color-brand)}
    #topbar .topbar-actions{display:flex;gap:8px}

    /* === ROUTER OUTLET === */
    #router-outlet{overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;scroll-behavior:smooth}

    /* === BOTTOM NAV === */
    #bottom-nav{display:flex;justify-content:space-around;align-items:center;padding:8px 0;padding-bottom:max(8px,env(safe-area-inset-bottom));background:var(--color-surface-primary);border-top:1px solid var(--color-border)}
    .nav-item{display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 12px;border-radius:8px;cursor:pointer;color:var(--color-text-muted);font-size:10px;letter-spacing:.04em;text-transform:uppercase;transition:color .15s,background .15s;border:none;background:none;min-width:60px}
    .nav-item:hover{background:var(--color-surface-hover)}
    .nav-item.active{color:var(--color-brand)}
    .nav-item svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}

    /* === TOAST === */
    #toast-container{position:fixed;bottom:calc(80px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;width:min(360px, 90vw)}

    /* === OFFLINE BANNER === */
    #offline-banner{display:none;position:fixed;top:0;left:0;right:0;background:#1a1a2e;color:#818cf8;font-size:13px;text-align:center;padding:6px;z-index:8888;border-bottom:1px solid #3730a3}
    body.offline #offline-banner{display:block}

    /* === LOADING SKELETON === */
    .skeleton{background:var(--color-skeleton);border-radius:8px;animation:shimmer 1.5s infinite}
    @keyframes shimmer{0%{opacity:.4}50%{opacity:.8}100%{opacity:.4}}
  </style>

  <!-- Design system (non-critical, loads async) -->
  <link rel="preload" href="/src/css/design-system.css" as="style" onload="this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="/src/css/design-system.css"></noscript>

  <!-- Fonts (async) -->
  <link rel="preload" href="/fonts/inter-variable.woff2" as="font" type="font/woff2" crossorigin>
</head>
<body>
  <!-- Offline indicator -->
  <div id="offline-banner" role="alert" aria-live="assertive">
    <span aria-hidden="true">⚡</span> Modo offline — dados locais ativos
  </div>

  <!-- Top Navigation Bar -->
  <header id="topbar" role="banner">
    <span class="logo" aria-label="SupliList">SL</span>
    <nav class="topbar-actions" aria-label="Ações do topo">
      <button id="btn-search" aria-label="Buscar suplemento" class="icon-btn">
        <!-- Search icon -->
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      </button>
      <button id="btn-profile" aria-label="Meu perfil" class="icon-btn">
        <!-- User icon -->
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </button>
    </nav>
  </header>

  <!-- Router Outlet: pages are injected here -->
  <main id="router-outlet" role="main" aria-live="polite" aria-label="Conteúdo principal">
    <!-- Page components render here via Router -->
  </main>

  <!-- Bottom Navigation -->
  <nav id="bottom-nav" role="navigation" aria-label="Navegação principal">
    <button class="nav-item active" data-route="/home" aria-label="Início" aria-current="page">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      Início
    </button>
    <button class="nav-item" data-route="/list" aria-label="Catálogo de suplementos">
      <svg viewBox="0 0 24 24" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
      Catálogo
    </button>
    <button class="nav-item" data-route="/stack" aria-label="Meu stack atual">
      <svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      Meu Stack
    </button>
    <button class="nav-item" data-route="/checkin" aria-label="Check-in diário">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      Check-in
    </button>
    <button class="nav-item" data-route="/profile" aria-label="Meu perfil e configurações">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      Perfil
    </button>
  </nav>

  <!-- Toast notifications container -->
  <div id="toast-container" role="status" aria-live="polite" aria-atomic="false"></div>

  <!-- Core app module -->
  <script type="module" src="/src/core/app.js"></script>
</body>
</html>
```

---

## TASK 3: CREATE /public/offline.html

Shown by the Service Worker when user navigates while completely offline and the page isn't cached.

```html
<!DOCTYPE html>
<html lang="pt-BR" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SupliList — Offline</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    :root{--brand:#7C3AED;--bg:#0A0A0A;--surface:#111111;--text:#F5F5F5;--muted:#888}
    body{min-height:100dvh;background:var(--bg);color:var(--text);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-align:center}
    .icon{width:80px;height:80px;background:var(--surface);border-radius:20px;display:flex;align-items:center;justify-content:center;margin:0 auto}
    .icon svg{width:40px;height:40px;stroke:var(--brand);fill:none;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
    h1{font-size:24px;font-weight:700;letter-spacing:-.02em}
    p{font-size:15px;color:var(--muted);max-width:280px;line-height:1.6}
    .btn{display:inline-flex;align-items:center;gap:8px;background:var(--brand);color:#fff;font-size:15px;font-weight:600;padding:14px 28px;border-radius:12px;border:none;cursor:pointer;text-decoration:none;transition:opacity .15s}
    .btn:hover{opacity:.85}
    .cached-note{font-size:13px;color:var(--muted);border-top:1px solid #1e1e1e;padding-top:20px;max-width:280px;line-height:1.5}
    .retry-timer{font-size:13px;color:var(--brand);font-variant-numeric:tabular-nums}
  </style>
</head>
<body>
  <div class="icon" aria-hidden="true">
    <svg viewBox="0 0 24 24">
      <line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>
    </svg>
  </div>

  <div>
    <h1>Sem conexão</h1>
    <p>Você está offline. Verifique sua conexão e tente novamente.</p>
  </div>

  <p class="cached-note">
    Seus dados locais (stack, check-ins, histórico) estão seguros e continuam acessíveis no app.
  </p>

  <button class="btn" onclick="tryReconnect()">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
    Tentar novamente
  </button>

  <span class="retry-timer" id="retry-countdown" aria-live="polite"></span>

  <script>
    let countdown = 30;
    const el = document.getElementById('retry-countdown');

    function updateTimer() {
      el.textContent = countdown > 0 ? `Verificando novamente em ${countdown}s` : '';
      if (countdown <= 0) {
        tryReconnect();
        countdown = 30;
      }
      countdown--;
    }

    function tryReconnect() {
      if (navigator.onLine) {
        window.location.href = '/app/';
      } else {
        el.textContent = 'Ainda sem conexão...';
        countdown = 30;
      }
    }

    window.addEventListener('online', () => {
      window.location.href = '/app/';
    });

    updateTimer();
    setInterval(updateTimer, 1000);
  </script>
</body>
</html>
```

---

## FILES TO DELIVER

1. `/public/index.html` — Entry point, redirector, SW register
2. `/public/app.html` — SPA shell with routing scaffold
3. `/public/offline.html` — Fallback offline page

## VALIDATION CHECKLIST

- [ ] `index.html`: Lighthouse audit passes (SEO, best practices)
- [ ] `app.html`: zero render-blocking resources in <head>
- [ ] Critical CSS is inlined; external CSS uses `rel="preload"`
- [ ] Dark mode applies before first paint (no FOUC)
- [ ] Bottom navigation has `aria-label` on every button
- [ ] `offline.html`: auto-retries every 30s + listens for `online` event
- [ ] All `<svg>` icons have `aria-hidden="true"` or `aria-label`
- [ ] Test: disable JavaScript → page still shows meaningful content
```

---

## **PROMPT 1.1: Design System CSS — COMPLETO**

```markdown
You are building the Design System for SupliList v4.0.

## CONTEXT

This is the single source of truth for all visual styling. It must:
- Define 40+ CSS custom properties for the full token system
- Support dark mode (default) and light mode via [data-theme] attribute
- Define all reusable component styles (14+ components)
- Implement the Bento Grid layout system
- Enable animations locked to 60fps (transform/opacity only)
- Be < 50KB gzipped (no duplication, no dead code)

## RULES

- Pure CSS only. No preprocessors (Sass, Less), no frameworks, no Tailwind.
- All values are custom properties (CSS vars) — never hardcoded colors in components.
- All animations use `transform` and `opacity` only (GPU-composited layers).
- All interactive elements have visible focus indicators (WCAG 2.1 AA minimum).
- `prefers-reduced-motion` is respected for all animations.

---

## TASK: CREATE /src/css/design-system.css

### SECTION 1: Custom Properties (Design Tokens)

```css
/* ====================================================
   SUPLILIST v4.0 — DESIGN SYSTEM
   Single source of truth for all visual tokens
   ==================================================== */

/* === COLOR SYSTEM === */
:root,
[data-theme="dark"] {
  /* Brand */
  --color-brand:          #7C3AED;
  --color-brand-hover:    #6D28D9;
  --color-brand-muted:    rgba(124, 58, 237, 0.15);

  /* Backgrounds (layered: bg < surface < elevated) */
  --color-bg-primary:     #0A0A0A;
  --color-bg-secondary:   #111111;
  --color-surface-primary:#161616;
  --color-surface-hover:  #1E1E1E;
  --color-elevated:       #222222;

  /* Text */
  --color-text-primary:   #F5F5F5;
  --color-text-secondary: #A3A3A3;
  --color-text-muted:     #666666;
  --color-text-inverse:   #0A0A0A;

  /* Borders */
  --color-border:         rgba(255,255,255,0.08);
  --color-border-strong:  rgba(255,255,255,0.16);

  /* Semantic */
  --color-success:        #22C55E;
  --color-success-bg:     rgba(34, 197, 94, 0.12);
  --color-warning:        #F59E0B;
  --color-warning-bg:     rgba(245, 158, 11, 0.12);
  --color-error:          #EF4444;
  --color-error-bg:       rgba(239, 68, 68, 0.12);
  --color-info:           #3B82F6;
  --color-info-bg:        rgba(59, 130, 246, 0.12);

  /* Category colors (supplement categories) */
  --color-cat-performance: #7C3AED;
  --color-cat-recovery:    #0891B2;
  --color-cat-health:      #16A34A;
  --color-cat-cognition:   #D97706;
  --color-cat-hormonal:    #DB2777;

  /* Skeleton loading */
  --color-skeleton:       rgba(255,255,255,0.06);
  --color-skeleton-shine: rgba(255,255,255,0.12);

  /* Overlay */
  --color-overlay:        rgba(0,0,0,0.7);
}

[data-theme="light"] {
  /* Brand */
  --color-brand:          #7C3AED;
  --color-brand-hover:    #6D28D9;
  --color-brand-muted:    rgba(124, 58, 237, 0.10);

  /* Backgrounds */
  --color-bg-primary:     #FFFFFF;
  --color-bg-secondary:   #F9F9F9;
  --color-surface-primary:#FFFFFF;
  --color-surface-hover:  #F3F3F3;
  --color-elevated:       #FFFFFF;

  /* Text */
  --color-text-primary:   #0A0A0A;
  --color-text-secondary: #525252;
  --color-text-muted:     #A3A3A3;
  --color-text-inverse:   #F5F5F5;

  /* Borders */
  --color-border:         rgba(0,0,0,0.08);
  --color-border-strong:  rgba(0,0,0,0.16);

  /* Semantic (same hues, different tints) */
  --color-success:        #16A34A;
  --color-success-bg:     rgba(22, 163, 74, 0.10);
  --color-warning:        #D97706;
  --color-warning-bg:     rgba(217, 119, 6, 0.10);
  --color-error:          #DC2626;
  --color-error-bg:       rgba(220, 38, 38, 0.10);
  --color-info:           #2563EB;
  --color-info-bg:        rgba(37, 99, 235, 0.10);

  /* Skeleton */
  --color-skeleton:       rgba(0,0,0,0.05);
  --color-skeleton-shine: rgba(0,0,0,0.09);

  /* Overlay */
  --color-overlay:        rgba(0,0,0,0.5);
}

/* === TYPOGRAPHY === */
:root {
  --font-sans:  'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono:  'JetBrains Mono', 'Fira Code', ui-monospace, monospace;

  /* Scale (Major Third: 1.25x) */
  --text-xs:   11px;
  --text-sm:   13px;
  --text-base: 15px;
  --text-md:   17px;
  --text-lg:   21px;
  --text-xl:   26px;
  --text-2xl:  32px;
  --text-3xl:  40px;

  /* Weight */
  --weight-regular: 400;
  --weight-medium:  500;
  --weight-semi:    600;
  --weight-bold:    700;

  /* Line height */
  --leading-tight:  1.25;
  --leading-snug:   1.4;
  --leading-normal: 1.6;
  --leading-loose:  1.8;
}

/* === SPACING (4px base grid) === */
:root {
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
}

/* === BORDERS & RADIUS === */
:root {
  --radius-sm:   6px;
  --radius-md:   10px;
  --radius-lg:   14px;
  --radius-xl:   20px;
  --radius-pill: 999px;

  --border-thin:   0.5px;
  --border-base:   1px;
  --border-medium: 1.5px;
}

/* === SHADOWS === */
:root {
  --shadow-sm:  0 1px 3px rgba(0,0,0,0.3);
  --shadow-md:  0 4px 16px rgba(0,0,0,0.4);
  --shadow-lg:  0 8px 32px rgba(0,0,0,0.5);
  --shadow-brand: 0 0 24px rgba(124,58,237,0.3);
}

/* === TRANSITIONS === */
:root {
  --ease-smooth:  cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-in:      cubic-bezier(0.4, 0, 1, 1);
  --ease-out:     cubic-bezier(0, 0, 0.2, 1);

  --duration-fast:   120ms;
  --duration-base:   200ms;
  --duration-slow:   350ms;
  --duration-slower: 500ms;
}

/* === Z-INDEX SCALE === */
:root {
  --z-base:    1;
  --z-sticky:  100;
  --z-overlay: 200;
  --z-modal:   300;
  --z-toast:   400;
  --z-tooltip: 500;
}
```

### SECTION 2: Global Reset & Base

```css
/* === GLOBAL RESET === */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  height: 100%;
  font-size: 16px;
  -webkit-text-size-adjust: 100%;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  scroll-behavior: smooth;
}

body {
  min-height: 100dvh;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  transition: background var(--duration-slow) var(--ease-smooth),
              color var(--duration-slow) var(--ease-smooth);
}

/* Respect user preferences */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Focus visible (keyboard navigation) */
:focus-visible {
  outline: 2px solid var(--color-brand);
  outline-offset: 3px;
  border-radius: var(--radius-sm);
}

/* Remove default focus ring (replaced by :focus-visible above) */
:focus:not(:focus-visible) {
  outline: none;
}

/* Scrollbar styling (webkit) */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--color-border-strong); border-radius: var(--radius-pill); }
::-webkit-scrollbar-thumb:hover { background: var(--color-text-muted); }
```

### SECTION 3: Typography Scale

```css
/* === TYPOGRAPHY COMPONENTS === */
.text-xs  { font-size: var(--text-xs); }
.text-sm  { font-size: var(--text-sm); }
.text-base{ font-size: var(--text-base); }
.text-md  { font-size: var(--text-md); }
.text-lg  { font-size: var(--text-lg); }
.text-xl  { font-size: var(--text-xl); }
.text-2xl { font-size: var(--text-2xl); }

.font-regular { font-weight: var(--weight-regular); }
.font-medium  { font-weight: var(--weight-medium); }
.font-semi    { font-weight: var(--weight-semi); }
.font-bold    { font-weight: var(--weight-bold); }

.text-primary   { color: var(--color-text-primary); }
.text-secondary { color: var(--color-text-secondary); }
.text-muted     { color: var(--color-text-muted); }
.text-brand     { color: var(--color-brand); }
.text-success   { color: var(--color-success); }
.text-warning   { color: var(--color-warning); }
.text-error     { color: var(--color-error); }

.truncate {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

### SECTION 4: Component Library (14+ Components)

```css
/* ================================================
   COMPONENT: Button
   ================================================ */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--weight-semi);
  font-family: var(--font-sans);
  line-height: 1;
  border: none;
  cursor: pointer;
  text-decoration: none;
  transition: background var(--duration-base) var(--ease-smooth),
              opacity var(--duration-base) var(--ease-smooth),
              transform var(--duration-fast) var(--ease-smooth);
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  white-space: nowrap;
}

.btn:active { transform: scale(0.97); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; pointer-events: none; }

/* Variants */
.btn-primary {
  background: var(--color-brand);
  color: #fff;
}
.btn-primary:hover { background: var(--color-brand-hover); }

.btn-secondary {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
  border: var(--border-base) solid var(--color-border);
}
.btn-secondary:hover { background: var(--color-elevated); }

.btn-ghost {
  background: transparent;
  color: var(--color-text-secondary);
}
.btn-ghost:hover { background: var(--color-surface-hover); color: var(--color-text-primary); }

.btn-danger {
  background: var(--color-error-bg);
  color: var(--color-error);
}
.btn-danger:hover { background: var(--color-error); color: #fff; }

/* Sizes */
.btn-sm { padding: var(--space-2) var(--space-3); font-size: var(--text-xs); border-radius: var(--radius-sm); }
.btn-lg { padding: var(--space-4) var(--space-8); font-size: var(--text-md); border-radius: var(--radius-lg); }
.btn-full { width: 100%; }

/* Icon button */
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background var(--duration-base) var(--ease-smooth),
              color var(--duration-base) var(--ease-smooth);
  -webkit-tap-highlight-color: transparent;
}
.icon-btn:hover { background: var(--color-surface-hover); color: var(--color-text-primary); }
.icon-btn svg { width: 20px; height: 20px; stroke: currentColor; fill: none; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }


/* ================================================
   COMPONENT: Card
   ================================================ */
.card {
  background: var(--color-surface-primary);
  border: var(--border-thin) solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  transition: border-color var(--duration-base) var(--ease-smooth),
              transform var(--duration-base) var(--ease-smooth);
}
.card:hover { border-color: var(--color-border-strong); }
.card-interactive { cursor: pointer; }
.card-interactive:hover { transform: translateY(-2px); }
.card-elevated { background: var(--color-elevated); box-shadow: var(--shadow-sm); }

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.card-title {
  font-size: var(--text-md);
  font-weight: var(--weight-semi);
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
}

.card-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-top: var(--space-1);
}


/* ================================================
   COMPONENT: Badge / Tag
   ================================================ */
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px var(--space-2);
  border-radius: var(--radius-pill);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  line-height: 1.5;
  white-space: nowrap;
}

.badge-brand   { background: var(--color-brand-muted);   color: var(--color-brand); }
.badge-success { background: var(--color-success-bg); color: var(--color-success); }
.badge-warning { background: var(--color-warning-bg); color: var(--color-warning); }
.badge-error   { background: var(--color-error-bg);   color: var(--color-error); }
.badge-info    { background: var(--color-info-bg);    color: var(--color-info); }
.badge-neutral { background: var(--color-surface-hover); color: var(--color-text-secondary); }

/* Evidence grade badges */
.badge-grade-a { background: rgba(34,197,94,0.15); color: var(--color-success); }
.badge-grade-b { background: rgba(59,130,246,0.15); color: var(--color-info); }
.badge-grade-c { background: rgba(245,158,11,0.15); color: var(--color-warning); }
.badge-grade-d { background: rgba(239,68,68,0.15);  color: var(--color-error); }


/* ================================================
   COMPONENT: Input / Form Controls
   ================================================ */
.input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-secondary);
  border: var(--border-base) solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--text-base);
  font-family: var(--font-sans);
  line-height: var(--leading-normal);
  transition: border-color var(--duration-base) var(--ease-smooth),
              box-shadow var(--duration-base) var(--ease-smooth);
  outline: none;
  appearance: none;
}
.input::placeholder { color: var(--color-text-muted); }
.input:focus {
  border-color: var(--color-brand);
  box-shadow: 0 0 0 3px var(--color-brand-muted);
}
.input:disabled { opacity: 0.5; cursor: not-allowed; }

.input-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.input-label {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-secondary);
}
.input-hint {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
.input-error {
  font-size: var(--text-xs);
  color: var(--color-error);
}
.input.is-error { border-color: var(--color-error); }
.input.is-error:focus { box-shadow: 0 0 0 3px var(--color-error-bg); }

/* Search input */
.input-search {
  padding-left: var(--space-10);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: var(--space-4) center;
}

/* Select */
.select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--space-4) center;
  padding-right: var(--space-10);
  cursor: pointer;
}

/* Toggle switch */
.toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  cursor: pointer;
  user-select: none;
}
.toggle input { position: absolute; opacity: 0; width: 0; height: 0; }
.toggle-track {
  width: 44px;
  height: 24px;
  background: var(--color-surface-hover);
  border: var(--border-base) solid var(--color-border);
  border-radius: var(--radius-pill);
  transition: background var(--duration-base) var(--ease-smooth);
  flex-shrink: 0;
}
.toggle-thumb {
  position: absolute;
  left: 2px;
  width: 18px;
  height: 18px;
  background: var(--color-text-muted);
  border-radius: 50%;
  transition: transform var(--duration-base) var(--ease-spring),
              background var(--duration-base) var(--ease-smooth);
}
.toggle input:checked ~ .toggle-track { background: var(--color-brand); border-color: var(--color-brand); }
.toggle input:checked ~ .toggle-track .toggle-thumb { transform: translateX(20px); background: #fff; }


/* ================================================
   COMPONENT: Progress Bar / Streak
   ================================================ */
.progress-bar {
  width: 100%;
  height: 6px;
  background: var(--color-surface-hover);
  border-radius: var(--radius-pill);
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--color-brand);
  border-radius: var(--radius-pill);
  transition: width var(--duration-slow) var(--ease-smooth);
}
.progress-fill.success { background: var(--color-success); }
.progress-fill.warning { background: var(--color-warning); }

/* Streak dots */
.streak-dots {
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
}
.streak-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-surface-hover);
  border: var(--border-base) solid var(--color-border);
  transition: background var(--duration-base) var(--ease-smooth);
}
.streak-dot.done { background: var(--color-brand); border-color: var(--color-brand); }
.streak-dot.today { background: var(--color-success); border-color: var(--color-success); }


/* ================================================
   COMPONENT: Supplement Card (Core UI)
   ================================================ */
.supp-card {
  background: var(--color-surface-primary);
  border: var(--border-thin) solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  cursor: pointer;
  transition: border-color var(--duration-base) var(--ease-smooth),
              transform var(--duration-base) var(--ease-smooth);
}
.supp-card:hover { border-color: var(--color-border-strong); transform: translateY(-2px); }
.supp-card:focus-visible { outline: 2px solid var(--color-brand); outline-offset: 3px; }

.supp-card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-2); }
.supp-card-name { font-size: var(--text-md); font-weight: var(--weight-semi); color: var(--color-text-primary); letter-spacing: -0.01em; }
.supp-card-category { font-size: var(--text-xs); color: var(--color-text-muted); text-transform: uppercase; letter-spacing: .08em; margin-top: 2px; }

.supp-card-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.supp-card-price {
  display: flex;
  align-items: baseline;
  gap: var(--space-1);
}
.supp-card-price .value { font-size: var(--text-lg); font-weight: var(--weight-bold); color: var(--color-text-primary); }
.supp-card-price .unit  { font-size: var(--text-xs); color: var(--color-text-muted); }


/* ================================================
   COMPONENT: Toast Notification
   ================================================ */
.toast {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-elevated);
  border: var(--border-base) solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  pointer-events: all;
  animation: toast-in var(--duration-slow) var(--ease-spring) forwards;
}

.toast.success { border-left: 3px solid var(--color-success); }
.toast.error   { border-left: 3px solid var(--color-error); }
.toast.warning { border-left: 3px solid var(--color-warning); }
.toast.info    { border-left: 3px solid var(--color-info); }

.toast.hiding { animation: toast-out var(--duration-base) var(--ease-in) forwards; }

@keyframes toast-in {
  from { opacity: 0; transform: translateY(16px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0)    scale(1); }
}
@keyframes toast-out {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(0.94); }
}


/* ================================================
   COMPONENT: Skeleton Loading
   ================================================ */
.skeleton {
  background: linear-gradient(90deg,
    var(--color-skeleton) 25%,
    var(--color-skeleton-shine) 50%,
    var(--color-skeleton) 75%
  );
  background-size: 200% 100%;
  border-radius: var(--radius-sm);
  animation: skeleton-shimmer 1.4s infinite;
}

@keyframes skeleton-shimmer {
  from { background-position: 200% 0; }
  to   { background-position: -200% 0; }
}

.skeleton-text  { height: 14px; border-radius: var(--radius-pill); }
.skeleton-title { height: 20px; width: 60%; border-radius: var(--radius-pill); }
.skeleton-card  { height: 120px; border-radius: var(--radius-lg); }


/* ================================================
   COMPONENT: Divider
   ================================================ */
.divider {
  width: 100%;
  height: 1px;
  background: var(--color-border);
  border: none;
  margin: var(--space-4) 0;
}
.divider-text {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  white-space: nowrap;
}
.divider-text::before,
.divider-text::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border);
}


/* ================================================
   LAYOUT: Bento Grid System
   ================================================ */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
  padding: var(--space-4);
}

@media (min-width: 640px) {
  .bento-grid { grid-template-columns: repeat(3, 1fr); gap: var(--space-4); }
}

@media (min-width: 1024px) {
  .bento-grid { grid-template-columns: repeat(4, 1fr); }
}

/* Bento cell span variants */
.bento-1 { grid-column: span 1; }
.bento-2 { grid-column: span 2; }
.bento-tall { grid-row: span 2; }
.bento-wide { grid-column: 1 / -1; }

/* Bento cell base style */
.bento-cell {
  background: var(--color-surface-primary);
  border: var(--border-thin) solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-height: 120px;
}


/* ================================================
   LAYOUT: Page & Container
   ================================================ */
.page {
  padding: var(--space-4);
  padding-bottom: calc(var(--space-4) + env(safe-area-inset-bottom));
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.section-title {
  font-size: var(--text-lg);
  font-weight: var(--weight-bold);
  letter-spacing: -0.02em;
  color: var(--color-text-primary);
}


/* ================================================
   COMPONENT: Empty State
   ================================================ */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-12) var(--space-6);
  text-align: center;
}
.empty-state-icon {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-xl);
  background: var(--color-surface-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
}
.empty-state-icon svg { width: 28px; height: 28px; }
.empty-state-title    { font-size: var(--text-lg); font-weight: var(--weight-semi); }
.empty-state-subtitle { font-size: var(--text-sm); color: var(--color-text-secondary); max-width: 260px; line-height: var(--leading-normal); }


/* ================================================
   COMPONENT: Avatar / User
   ================================================ */
.avatar {
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-brand-muted);
  color: var(--color-brand);
  font-weight: var(--weight-semi);
  font-size: var(--text-sm);
  flex-shrink: 0;
  overflow: hidden;
}
.avatar-sm { width: 32px; height: 32px; font-size: var(--text-xs); }
.avatar-md { width: 40px; height: 40px; }
.avatar-lg { width: 56px; height: 56px; font-size: var(--text-md); }
.avatar img { width: 100%; height: 100%; object-fit: cover; }


/* ================================================
   UTILITY CLASSES
   ================================================ */
.flex          { display: flex; }
.flex-col      { flex-direction: column; }
.items-center  { align-items: center; }
.justify-between { justify-content: space-between; }
.gap-1 { gap: var(--space-1); }
.gap-2 { gap: var(--space-2); }
.gap-3 { gap: var(--space-3); }
.gap-4 { gap: var(--space-4); }
.w-full { width: 100%; }
.text-center { text-align: center; }
.mt-auto { margin-top: auto; }

/* Affiliation disclosure */
.affiliate-disclosure {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  gap: var(--space-1);
  border-top: var(--border-thin) solid var(--color-border);
  padding-top: var(--space-2);
  margin-top: var(--space-2);
}
```

---

## FILES TO DELIVER

1. `/src/css/design-system.css` (completo, ~350 linhas, < 50KB gzipped)

## VALIDATION CHECKLIST

- [ ] Zero hardcoded colors in component classes (only CSS vars)
- [ ] Dark mode tokens differ from light mode on all background/text vars
- [ ] `@media (prefers-reduced-motion: reduce)` disables all animations
- [ ] All interactive elements (`.btn`, `.supp-card`, `.input`) have `:focus-visible` styles
- [ ] Bento grid is responsive (2 → 3 → 4 columns)
- [ ] Skeleton shimmer animation runs on GPU (background-size + background-position only)
- [ ] Run: `npx stylelint src/css/design-system.css` — zero errors
```

---

## **PROMPT 1.2: PWA Manifest + Service Worker v4 — COMPLETO**

```markdown
You are building the PWA foundation for SupliList v4.0.

## CONTEXT
This is not just "add a manifest and service worker". This is:
- Making the app installable on iOS + Android + Desktop
- Enabling offline functionality (critical for gym use)
- Implementing background sync (post check-ins when connection returns)
- Handling push notifications (supplement reminders)
- Caching strategy that balances freshness vs. speed

## CORE REQUIREMENTS
1. Manifest must pass web.dev PWA checklist
2. Service Worker must cache intelligently (network-first for data, cache-first for assets)
3. Must work on slow 3G (as per performance budget)
4. Must handle offline gracefully (not show errors)
5. Background sync must queue check-ins + sync when online

---

## TASK 1: CREATE /public/manifest.json

```json
{
  "name": "SupliList — Sistema Inteligente de Suplementação",
  "short_name": "SupliList",
  "description": "Rastreie suplementos, compare preços, receba recomendações personalizadas de IA. 100% offline, zero paywalls.",
  "start_url": "/app/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#7C3AED",
  "background_color": "#0A0A0A",
  "categories": ["health", "fitness", "shopping"],
  "screenshots": [
    {
      "src": "/assets/screenshots/home-540x720.png",
      "sizes": "540x720",
      "type": "image/png",
      "form_factor": "narrow",
      "purpose": "any"
    },
    {
      "src": "/assets/screenshots/home-1280x720.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide",
      "purpose": "any"
    }
  ],
  "icons": [
    {
      "src": "/assets/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/assets/icons/icon-192x192-maskable.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/assets/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/assets/icons/icon-512x512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "Meu Stack",
      "short_name": "Stack",
      "description": "Ver meu stack de suplementos atual",
      "url": "/app/#/stack",
      "icons": [{ "src": "/assets/icons/shortcut-stack-192.png", "sizes": "192x192", "type": "image/png" }]
    },
    {
      "name": "Check-in Diário",
      "short_name": "Check-in",
      "description": "Registrar check-in de hoje",
      "url": "/app/#/checkin",
      "icons": [{ "src": "/assets/icons/shortcut-checkin-192.png", "sizes": "192x192", "type": "image/png" }]
    },
    {
      "name": "Catálogo",
      "short_name": "Catálogo",
      "description": "Explorar 500+ suplementos",
      "url": "/app/#/list",
      "icons": [{ "src": "/assets/icons/shortcut-catalog-192.png", "sizes": "192x192", "type": "image/png" }]
    }
  ],
  "share_target": {
    "action": "/app/share",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": { "title": "title", "text": "text", "url": "url" }
  },
  "prefer_related_applications": false,
  "related_applications": []
}
```

---

## TASK 2: CREATE /public/service-worker.js (COMPLETE v4)

```javascript
// ============================================================
// Service Worker v4 — SupliList PWA
// Strategy: Cache-first for assets, Network-first for data
// ============================================================

const CACHE_VERSION = 'suplilist-v4.0.0';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const DATA_CACHE    = `${CACHE_VERSION}-data`;
const IMAGE_CACHE   = `${CACHE_VERSION}-images`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.html',
  '/src/core/app.js',
  '/src/css/design-system.css',
  '/offline.html',
  '/fonts/inter-variable.woff2',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png'
];

// INSTALL: Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch(err => console.error('[SW] Install failed:', err))
  );
});

// ACTIVATE: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.map(key => {
          const isCurrentCache = [STATIC_CACHE, DYNAMIC_CACHE, DATA_CACHE, IMAGE_CACHE].includes(key);
          if (!isCurrentCache) {
            console.log('[SW] Deleting stale cache:', key);
            return caches.delete(key);
          }
        })
      ))
      .then(() => self.clients.claim())
  );
});

// FETCH: Smart routing
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  if (isStaticAsset(request))             { event.respondWith(cacheFirstStrategy(request)); return; }
  if (url.pathname.startsWith('/api/'))   { event.respondWith(networkFirstStrategy(request)); return; }
  if (request.destination === 'image')    { event.respondWith(staleWhileRevalidate(request)); return; }
  if (request.mode === 'navigate')        { event.respondWith(navigationStrategy(request)); return; }

  event.respondWith(networkFirstStrategy(request));
});

// BACKGROUND SYNC
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-checkins') event.waitUntil(syncCheckins());
  if (event.tag === 'sync-stack')    event.waitUntil(syncStack());
});

// PUSH NOTIFICATIONS
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'SupliList', {
      body:    data.message ?? 'Nova notificação',
      icon:    '/assets/icons/icon-192x192.png',
      badge:   '/assets/icons/badge-72.png',
      tag:     data.tag ?? 'suplilist',
      actions: data.actions ?? [
        { action: 'open',  title: 'Abrir' },
        { action: 'close', title: 'Fechar' }
      ]
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action !== 'close') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clientList => {
          const found = clientList.find(c => c.url.startsWith('/app/') && 'focus' in c);
          return found ? found.focus() : clients.openWindow('/app/');
        })
    );
  }
});

// ---- Strategy helpers ----

async function cacheFirstStrategy(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      const clone = response.clone();
      caches.open(DYNAMIC_CACHE).then(c => c.put(request, clone));
    }
    return response;
  } catch {
    return caches.match(request) ?? offlineResponse();
  }
}

async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      const clone = response.clone();
      caches.open(DATA_CACHE).then(c => c.put(request, clone));
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? offlineResponse();
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request).then(r => {
    if (r.status === 200) caches.open(IMAGE_CACHE).then(c => c.put(request, r.clone()));
    return r;
  });
  return cached ?? fetchPromise;
}

async function navigationStrategy(request) {
  try {
    return await fetch(request);
  } catch {
    return (await caches.match('/offline.html')) ?? offlineResponse();
  }
}

function isStaticAsset(request) {
  const url = new URL(request.url);
  return ['font','script','style'].includes(request.destination)
    || url.pathname.startsWith('/assets/')
    || url.pathname.endsWith('.woff2');
}

function offlineResponse() {
  return new Response(
    JSON.stringify({ error: 'Offline', code: 'OFFLINE' }),
    { status: 503, headers: { 'Content-Type': 'application/json', 'X-Offline': 'true' } }
  );
}

async function syncCheckins() {
  // Read pending checkins from IndexedDB and POST to /api/checkins/sync
  // Implementation filled in Sprint 4 (CheckinStreakSystem)
  console.log('[SW] Sync checkins placeholder');
}

async function syncStack() {
  console.log('[SW] Sync stack placeholder');
}

console.log('[SW] Service Worker v4 loaded');
```

---

## FILES TO DELIVER

1. `/public/manifest.json`
2. `/public/service-worker.js`
3. Icon assets (192x192, 512x512, maskable variants) — generate as SVG-based PNGs or use placeholder colored squares for dev

## VALIDATION CHECKLIST

- [ ] manifest.json valid JSON, no trailing commas
- [ ] All icon paths are accessible
- [ ] Service Worker registers without errors (check DevTools → Application)
- [ ] Offline mode: check "Offline" in DevTools → app still loads
- [ ] background_color matches loading screen background in `index.html`
```

---

## **PROMPT 1.3: Performance + A11y Audit + Build Pipeline — COMPLETO**

```markdown
You are the performance and accessibility auditor for SupliList v4.0.

## CONTEXT

A Lighthouse 100/100 score requires passing ALL four categories:
- Performance (FCP, LCP, CLS, TTI)
- Accessibility (WCAG 2.1 AA)
- Best Practices (HTTPS, no deprecated APIs, CSP)
- SEO (crawlable, meta tags, structured data)

This prompt covers all four, plus the build pipeline to enforce them in CI.

---

## PERFORMANCE TARGETS

| Metric | Target |
|--------|--------|
| FCP (First Contentful Paint) | < 0.3s |
| LCP (Largest Contentful Paint) | < 0.5s |
| CLS (Cumulative Layout Shift) | < 0.01 |
| TTI (Time to Interactive) | < 0.6s |
| Lighthouse Score | 100 / 100 |
| CSS Bundle (gzipped) | < 50KB |
| JS Bundle (gzipped) | < 150KB |
| HTML + CSS + JS total | < 200KB |

---

## TASK 1: PERFORMANCE AUDIT

```bash
# Install Lighthouse CLI
npm install -g lighthouse @lhci/cli

# Single run
lighthouse https://suplilist.com \
  --output=html \
  --output-path=./lighthouse-report.html \
  --chrome-flags="--headless"

# Averaged run (3x for variance)
for i in 1 2 3; do
  lighthouse https://suplilist.com \
    --output=json \
    --output-path=./lh-run-$i.json \
    --chrome-flags="--headless"
done

# Quick local test (use live-server or similar)
npx live-server public/ --port=8080 &
lighthouse http://localhost:8080 --output=html --output-path=./lh-local.html
```

---

## TASK 2: ACCESSIBILITY AUDIT (WCAG 2.1 AA)

```bash
# Install axe-cli
npm install -g @axe-core/cli

# Run a11y audit
axe https://suplilist.com --save=./a11y-report.json

# Or use browser extension: axe DevTools (free tier covers most checks)
```

### Manual A11y Checklist

```
KEYBOARD NAVIGATION:
- [ ] Tab order is logical (follows visual layout)
- [ ] All interactive elements reachable by keyboard
- [ ] Focus ring visible on all interactive elements (:focus-visible in design-system.css)
- [ ] No keyboard traps (can always exit modals/dropdowns with Escape)
- [ ] Bottom nav items: Tab switches between them, Enter/Space activates

SCREEN READER:
- [ ] <html lang="pt-BR"> present
- [ ] All images have alt text (or aria-hidden if decorative)
- [ ] SVG icons have aria-hidden="true" or aria-label
- [ ] <main role="main" aria-label="..."> wraps page content
- [ ] <nav aria-label="..."> for each navigation region
- [ ] Route changes announce via aria-live on #router-outlet
- [ ] Toast container uses role="status" aria-live="polite"
- [ ] Offline banner uses role="alert" aria-live="assertive"
- [ ] Loading states use role="status" aria-live="polite"

COLOR & CONTRAST:
- [ ] Normal text: contrast ratio ≥ 4.5:1
- [ ] Large text (≥ 18px bold): contrast ratio ≥ 3:1
- [ ] Interactive elements: contrast ratio ≥ 3:1 against background
- [ ] Check dark mode AND light mode separately
- [ ] Information not conveyed by color alone (badges use text, not just color)

FORMS:
- [ ] All <input> elements have associated <label> (via for/id or aria-label)
- [ ] Error messages linked to fields via aria-describedby
- [ ] Required fields indicated (aria-required="true")
- [ ] Autocomplete attributes present (name, email, tel)

MOTION:
- [ ] @media (prefers-reduced-motion) disables all CSS animations
- [ ] No content flashes more than 3 times/second
```

### Fix Contrast Ratios (Reference)

```css
/* Verify these pass WCAG AA using https://webaim.org/resources/contrastchecker/ */

/* Dark mode — body text on bg-primary: #F5F5F5 on #0A0A0A = 19.5:1 ✅ */
/* Dark mode — muted text on bg-primary: #666666 on #0A0A0A = 4.6:1 ✅ */
/* Dark mode — brand on bg-primary: #7C3AED on #0A0A0A = 5.8:1 ✅ */

/* Light mode — body text on bg-primary: #0A0A0A on #FFFFFF = 21:1 ✅ */
/* Light mode — muted text on bg-primary: #A3A3A3 on #FFFFFF = 2.7:1 ⚠️ */
/* FIX for light mode muted text: */
[data-theme="light"] {
  --color-text-muted: #737373; /* 4.6:1 on white ✅ */
}
```

---

## TASK 3: BUILD PIPELINE

Create `/build.js`:

```javascript
#!/usr/bin/env node
// ============================================================
// SupliList v4.0 — Build Pipeline
// Minifies CSS + JS, checks bundle budgets, runs Lighthouse
// Usage: node build.js [--audit]
// ============================================================

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

const BUDGETS = {
  css:   50 * 1024,  // 50KB gzipped
  js:    150 * 1024, // 150KB gzipped
  total: 200 * 1024  // 200KB gzipped
};

async function build() {
  console.log('\n🔨 SupliList v4.0 — Build starting...\n');
  const results = {};

  // 1. Minify CSS
  console.log('📦 Processing CSS...');
  const cssSource = fs.readFileSync('./src/css/design-system.css', 'utf8');
  const cssMinified = cssSource
    .replace(/\/\*[\s\S]*?\*\//g, '')    // remove comments
    .replace(/\n\s*/g, ' ')              // collapse newlines
    .replace(/\s{2,}/g, ' ')            // collapse multiple spaces
    .replace(/;\s*}/g, '}')             // remove last semicolon in block
    .trim();

  fs.mkdirSync('./dist', { recursive: true });
  fs.writeFileSync('./dist/design-system.min.css', cssMinified);
  results.css = await gzipSize(cssMinified);
  log('CSS', results.css, BUDGETS.css);

  // 2. Process JS (bundle core modules)
  console.log('📦 Processing JS...');
  const jsFiles = [
    './src/core/event-bus.js',
    './src/core/state-manager.js',
    './src/core/router.js',
    './src/core/app.js'
  ].filter(f => fs.existsSync(f));

  const jsBundle = jsFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');
  fs.writeFileSync('./dist/app.bundle.js', jsBundle);
  results.js = await gzipSize(jsBundle);
  log('JS', results.js, BUDGETS.js);

  // 3. Total budget check
  results.total = results.css + results.js;
  log('TOTAL', results.total, BUDGETS.total);

  // 4. Final verdict
  const allPassed = Object.entries(results).every(([key, size]) => size <= BUDGETS[key]);

  if (allPassed) {
    console.log('\n✅ Build passed all budgets!\n');
  } else {
    console.error('\n❌ Build exceeded budget. Optimize before shipping.\n');
    process.exit(1);
  }

  // 5. Optional Lighthouse audit
  if (process.argv.includes('--audit')) {
    console.log('🔍 Running Lighthouse...');
    const { execSync } = require('child_process');
    try {
      execSync(
        'lighthouse http://localhost:8080 --output=html --output-path=./dist/lighthouse-report.html --chrome-flags="--headless" --quiet',
        { stdio: 'inherit' }
      );
      console.log('✅ Lighthouse report saved to dist/lighthouse-report.html');
    } catch (e) {
      console.warn('⚠️  Lighthouse failed (is the server running? npx live-server public/ --port=8080)');
    }
  }
}

async function gzipSize(content) {
  return new Promise((resolve, reject) => {
    zlib.gzip(Buffer.from(content, 'utf8'), (err, result) => {
      err ? reject(err) : resolve(result.length);
    });
  });
}

function log(name, size, budget) {
  const kb      = (size / 1024).toFixed(1);
  const budgetKb = (budget / 1024).toFixed(0);
  const pct     = ((size / budget) * 100).toFixed(0);
  const ok      = size <= budget;
  console.log(`  ${ok ? '✅' : '❌'} ${name.padEnd(6)} ${kb}KB / ${budgetKb}KB (${pct}%)`);
}

build().catch(e => { console.error(e); process.exit(1); });
```

Add to `package.json`:

```json
{
  "scripts": {
    "build":       "node build.js",
    "build:audit": "npx live-server public/ --port=8080 --no-browser & node build.js --audit",
    "lint:css":    "npx stylelint 'src/css/**/*.css'",
    "lint:a11y":   "npx @axe-core/cli http://localhost:8080"
  },
  "devDependencies": {
    "stylelint": "^16.0.0",
    "stylelint-config-standard": "^36.0.0"
  }
}
```

---

## FILES TO DELIVER

1. `build.js` — build + bundle size check
2. `package.json` — scripts updated
3. `dist/lighthouse-report.html` — Lighthouse output
4. `dist/a11y-report.json` — axe-core output
5. Patch to `src/css/design-system.css` correcting light-mode `--color-text-muted` contrast

## VALIDATION CHECKLIST

- [ ] `node build.js` exits 0 with all budgets green
- [ ] Lighthouse Performance ≥ 95 (ideally 100)
- [ ] Lighthouse Accessibility = 100
- [ ] Lighthouse Best Practices = 100
- [ ] Lighthouse SEO ≥ 90
- [ ] axe-core: 0 critical violations
- [ ] DevTools: no CLS layout shifts during page load
- [ ] DevTools → Network → Slow 3G: FCP < 1.5s (real device)
```

---

## **PROMPT 1.4: Core Bootstrapper + EventBus Stub — COMPLETO**

```markdown
You are building the core initialization layer for SupliList v4.0.

## CONTEXT

This is the brain that wires everything together. Without it, there is no app.
It must:
- Initialize services in the correct dependency order (EventBus → State → Router)
- Inject heavy services (AI, Sync) without blocking the UI thread
- Expose a lightweight EventBus for decoupled communication between modules
- Provide an immutable StateManager as the single source of truth
- Set up hash-based SPA routing
- Handle the offline/online lifecycle

## RULES (from Prompt de Ouro)

- Vanilla JS only (ES6+ modules)
- All heavy work done in Web Workers or deferred
- EventBus validates event names against a schema
- StateManager is immutable (returns new state, never mutates)
- No circular imports

---

## TASK 1: CREATE /src/core/event-bus.js

```javascript
// ============================================================
// EventBus — Global Pub/Sub System
// All inter-module communication goes through here.
// Decouples producers from consumers completely.
// ============================================================

/**
 * Valid event namespaces.
 * Format: 'namespace:action'
 * Adding new events here prevents typos across the codebase.
 */
export const EVENTS = Object.freeze({
  // App lifecycle
  APP_READY:            'app:ready',
  APP_THEME_CHANGED:    'app:themeChanged',

  // Router
  ROUTE_CHANGED:        'route:changed',
  ROUTE_NOT_FOUND:      'route:notFound',

  // User profile
  PROFILE_UPDATED:      'user:profileUpdated',
  PROFILE_LOADED:       'user:profileLoaded',

  // Supplement stack
  STACK_UPDATED:        'stack:updated',
  STACK_ITEM_ADDED:     'stack:itemAdded',
  STACK_ITEM_REMOVED:   'stack:itemRemoved',

  // Check-in
  CHECKIN_LOGGED:       'checkin:logged',
  CHECKIN_STREAK_UPDATED:'checkin:streakUpdated',

  // Biometrics (wearables)
  BIOMETRICS_UPDATED:   'biometria:updated',

  // Social
  SOCIAL_INTERACTION:   'social:interaction',

  // Pricing
  PRICE_UPDATED:        'price:updated',
  PRICE_DROPPED:        'price:dropped',

  // Premium
  PREMIUM_UNLOCKED:     'premium:unlocked',
  PREMIUM_EXPIRED:      'premium:expired',

  // Connectivity
  APP_ONLINE:           'app:online',
  APP_OFFLINE:          'app:offline',
  SYNC_STARTED:         'sync:started',
  SYNC_COMPLETED:       'sync:completed',
  SYNC_FAILED:          'sync:failed',

  // UI
  TOAST_SHOW:           'ui:toastShow',
  MODAL_OPEN:           'ui:modalOpen',
  MODAL_CLOSE:          'ui:modalClose',
  SEARCH_QUERY:         'ui:searchQuery',
});

class EventBus {
  #listeners = new Map();
  #history = [];    // Debug: stores last 50 events
  #debug = false;

  /**
   * Subscribe to an event.
   * @param {string} eventName - Must be a value from EVENTS
   * @param {Function} callback - Receives (payload, eventName)
   * @returns {Function} Unsubscribe function
   */
  on(eventName, callback) {
    this.#validateEvent(eventName);

    if (!this.#listeners.has(eventName)) {
      this.#listeners.set(eventName, new Set());
    }

    this.#listeners.get(eventName).add(callback);

    // Return unsubscribe function
    return () => this.off(eventName, callback);
  }

  /**
   * Subscribe to an event once (auto-unsubscribes after first call).
   */
  once(eventName, callback) {
    const wrapper = (payload, name) => {
      callback(payload, name);
      this.off(eventName, wrapper);
    };
    return this.on(eventName, wrapper);
  }

  /**
   * Unsubscribe a specific callback from an event.
   */
  off(eventName, callback) {
    this.#listeners.get(eventName)?.delete(callback);
  }

  /**
   * Emit an event with payload.
   * @param {string} eventName - Must be a value from EVENTS
   * @param {*} payload - Any serializable value
   */
  emit(eventName, payload = null) {
    this.#validateEvent(eventName);

    const event = {
      name:      eventName,
      payload,
      timestamp: Date.now(),
    };

    // Store in history (capped at 50)
    this.#history.push(event);
    if (this.#history.length > 50) this.#history.shift();

    if (this.#debug) {
      console.log(`[EventBus] 📡 ${eventName}`, payload);
    }

    const callbacks = this.#listeners.get(eventName);
    if (!callbacks?.size) return;

    // Execute callbacks safely (one failure doesn't kill others)
    callbacks.forEach(cb => {
      try {
        cb(payload, eventName);
      } catch (err) {
        console.error(`[EventBus] Callback error for "${eventName}":`, err);
      }
    });
  }

  /**
   * Get recent event history (for debugging).
   */
  getHistory() {
    return [...this.#history];
  }

  /**
   * Enable/disable debug logging.
   */
  setDebug(enabled) {
    this.#debug = enabled;
  }

  /**
   * Validate that the event name is known.
   * Prevents typos and undocumented events.
   */
  #validateEvent(eventName) {
    const validEvents = Object.values(EVENTS);
    if (!validEvents.includes(eventName)) {
      throw new Error(
        `[EventBus] Unknown event: "${eventName}". ` +
        `Add it to EVENTS in event-bus.js before using.`
      );
    }
  }

  /**
   * Remove all listeners (useful for testing/cleanup).
   */
  clear() {
    this.#listeners.clear();
    this.#history = [];
  }
}

// Singleton — imported once, shared everywhere
export const eventBus = new EventBus();
```

---

## TASK 2: CREATE /src/core/state-manager.js

```javascript
// ============================================================
// StateManager — Immutable Centralized State
// The single source of truth for all app state.
// Modifying state always produces a NEW object (no mutation).
// ============================================================

import { eventBus, EVENTS } from './event-bus.js';

/**
 * Initial application state shape.
 * ALL state lives here — never scattered across components.
 */
const INITIAL_STATE = Object.freeze({
  // App
  app: {
    version:     '4.0.0',
    theme:       'dark',         // 'dark' | 'light'
    locale:      'pt-BR',
    online:      true,
    initialized: false,
  },

  // User profile
  user: {
    id:           null,
    name:         '',
    age:          null,
    weight:       null,         // kg
    bodyFat:      null,         // %
    objective:    null,         // 'bulk' | 'cut' | 'strength' | 'endurance' | 'longevity'
    trainingDays: null,         // days/week
    trainingAge:  null,         // years
    budget:       null,         // R$/month
    restrictions: [],           // ['gluten', 'vegetarian', ...]
    isPremium:    false,
    premiumTier:  'free',       // 'free' | 'pro' | 'master' | 'enterprise'
  },

  // Supplement stack (supplements user is actively taking)
  stack: {
    items:     [],              // [{ id, name, quantity, dosage, startDate, daysRemaining }]
    favorites: [],              // [{ id, name, addedAt, priceTracking }]
    lastUpdated: null,
  },

  // Check-in & streaks
  checkin: {
    todayDone:      false,
    currentStreak:  0,
    longestStreak:  0,
    history:        [],         // [{ date, supplementIds, note }]
    lastCheckinDate: null,
  },

  // AI recommendations (cached)
  recommendations: {
    stack:          [],
    lastGenerated:  null,
    profileHash:    null,       // To detect when regen is needed
  },

  // UI state
  ui: {
    currentRoute:  '/home',
    previousRoute: null,
    searchQuery:   '',
    isLoading:     false,
    activeModal:   null,
  },
});

class StateManager {
  #state;
  #subscribers = new Map();   // eventName → Set<callback>
  #history = [];              // For undo / debug (last 20 states)

  constructor(initialState) {
    this.#state = this.#deepFreeze(initialState);
  }

  /**
   * Get the current state (or a slice of it).
   * @param {string} [path] - Dot notation path, e.g. 'user.name'
   */
  get(path = null) {
    if (!path) return this.#state;

    return path.split('.').reduce((obj, key) => obj?.[key], this.#state);
  }

  /**
   * Update state immutably.
   * @param {string} path - Dot notation path to the slice to update
   * @param {*|Function} valueOrUpdater - New value, or a function (prev) => next
   * @param {string} [eventName] - Optional EventBus event to emit after update
   */
  set(path, valueOrUpdater, eventName = null) {
    const keys    = path.split('.');
    const current = this.get(path);
    const next    = typeof valueOrUpdater === 'function'
      ? valueOrUpdater(current)
      : valueOrUpdater;

    if (Object.is(current, next)) return; // No change — skip

    // Store previous state for undo
    this.#history.push(this.#state);
    if (this.#history.length > 20) this.#history.shift();

    // Produce new state (immutable deep merge)
    this.#state = this.#deepFreeze(
      this.#setPath(this.#state, keys, next)
    );

    // Notify path subscribers
    const pathCallbacks = this.#subscribers.get(path);
    pathCallbacks?.forEach(cb => {
      try { cb(next, current); }
      catch (e) { console.error('[State] Subscriber error:', e); }
    });

    // Emit event if requested
    if (eventName) {
      eventBus.emit(eventName, { path, value: next, prev: current });
    }
  }

  /**
   * Subscribe to changes on a specific state path.
   * @param {string} path - Dot notation path
   * @param {Function} callback - Receives (newValue, oldValue)
   * @returns {Function} Unsubscribe function
   */
  subscribe(path, callback) {
    if (!this.#subscribers.has(path)) {
      this.#subscribers.set(path, new Set());
    }
    this.#subscribers.get(path).add(callback);
    return () => this.#subscribers.get(path)?.delete(callback);
  }

  /**
   * Reset state to initial values.
   * Used on logout or factory reset.
   */
  reset() {
    this.#history = [];
    this.#state   = this.#deepFreeze(INITIAL_STATE);
  }

  /**
   * Load state from a plain object (e.g., from localStorage).
   * Merges deeply with INITIAL_STATE to fill any missing keys.
   */
  hydrate(savedState) {
    const merged = this.#deepMerge(INITIAL_STATE, savedState);
    this.#state  = this.#deepFreeze(merged);
  }

  /**
   * Export current state as a plain object (for persistence).
   */
  export() {
    return JSON.parse(JSON.stringify(this.#state));
  }

  // ---- Private helpers ----

  #setPath(obj, keys, value) {
    if (keys.length === 0) return value;
    const [head, ...tail] = keys;
    return {
      ...obj,
      [head]: this.#setPath(obj[head] ?? {}, tail, value),
    };
  }

  #deepFreeze(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;
    Object.keys(obj).forEach(k => this.#deepFreeze(obj[k]));
    return Object.freeze(obj);
  }

  #deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source ?? {})) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.#deepMerge(target[key] ?? {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }
}

// Singleton
export const stateManager = new StateManager(INITIAL_STATE);
```

---

## TASK 3: CREATE /src/core/app.js

```javascript
// ============================================================
// app.js — Core Bootstrapper
// Initializes all services in order, mounts the UI,
// and manages the app lifecycle (online/offline, routing).
// ============================================================

import { eventBus, EVENTS } from './event-bus.js';
import { stateManager }     from './state-manager.js';

// ---- Constants ----
const APP_VERSION     = '4.0.0';
const STORAGE_KEY     = 'suplilist:state';
const DEBUG           = location.hostname === 'localhost';

// ---- Bootstrap sequence ----

async function init() {
  console.log(`[App] SupliList v${APP_VERSION} starting...`);

  if (DEBUG) eventBus.setDebug(true);

  try {
    // Step 1: Apply saved theme BEFORE rendering (no FOUC)
    applyTheme();

    // Step 2: Hydrate state from localStorage
    await hydrateState();

    // Step 3: Register connectivity listeners
    registerConnectivityListeners();

    // Step 4: Mount the router (renders first page)
    await mountRouter();

    // Step 5: Defer heavy services (non-blocking)
    requestIdleCallback(() => {
      initHeavyServices();
    }, { timeout: 3000 });

    // Step 6: Hide loading screen, show app
    revealApp();

    stateManager.set('app.initialized', true, EVENTS.APP_READY);
    console.log('[App] Initialized ✅');

  } catch (err) {
    console.error('[App] Fatal init error:', err);
    showFatalError(err);
  }
}

// ---- Theme ----

function applyTheme() {
  const theme = localStorage.getItem('suplilist:theme') ?? 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  stateManager.set('app.theme', theme);
}

// ---- State hydration ----

async function hydrateState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      stateManager.hydrate(saved);
      console.log('[App] State hydrated from localStorage');
    }
  } catch (err) {
    console.warn('[App] Could not hydrate state:', err);
    // Non-fatal — start with clean state
  }
}

// ---- Persist state on changes ----

function setupPersistence() {
  // Save to localStorage on every meaningful state change
  const paths = ['user', 'stack', 'checkin'];
  paths.forEach(path => {
    stateManager.subscribe(path, () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateManager.export()));
      } catch (e) {
        console.warn('[App] localStorage write failed:', e);
      }
    });
  });
}

// ---- Connectivity ----

function registerConnectivityListeners() {
  const setOnline = () => {
    stateManager.set('app.online', true);
    eventBus.emit(EVENTS.APP_ONLINE);
    document.body.classList.remove('offline');
    console.log('[App] Back online');
  };

  const setOffline = () => {
    stateManager.set('app.online', false);
    eventBus.emit(EVENTS.APP_OFFLINE);
    document.body.classList.add('offline');
    console.warn('[App] Gone offline');
  };

  window.addEventListener('online',  setOnline);
  window.addEventListener('offline', setOffline);

  // Set initial state
  if (!navigator.onLine) setOffline();
}

// ---- Router ----

async function mountRouter() {
  // Lightweight hash-based SPA router
  const routes = {
    '/home':    () => import('../pages/home-page.js').then(m => m.render()),
    '/list':    () => import('../pages/list-page.js').then(m => m.render()),
    '/stack':   () => import('../pages/stack-page.js').then(m => m.render()),
    '/checkin': () => import('../pages/checkin-page.js').then(m => m.render()),
    '/profile': () => import('../pages/profile-page.js').then(m => m.render()),
  };

  const outlet = document.getElementById('router-outlet');
  if (!outlet) return;

  async function navigate(path) {
    // Normalize path
    const route = routes[path] ?? routes['/home'];

    try {
      outlet.setAttribute('aria-busy', 'true');
      stateManager.set('ui.previousRoute', stateManager.get('ui.currentRoute'));
      stateManager.set('ui.currentRoute', path);

      // Render page
      const html = await route();
      outlet.innerHTML = html ?? '<p>Página não encontrada</p>';

      // Update active nav item
      document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.route === path);
        el.setAttribute('aria-current', el.dataset.route === path ? 'page' : 'false');
      });

      // Scroll to top
      outlet.scrollTop = 0;

      eventBus.emit(EVENTS.ROUTE_CHANGED, { path });
    } catch (err) {
      console.error('[Router] Navigation error:', err);
      outlet.innerHTML = `<div class="page empty-state">
        <p class="text-secondary">Erro ao carregar página. Tente novamente.</p>
        <button class="btn btn-secondary" onclick="history.back()">Voltar</button>
      </div>`;
    } finally {
      outlet.removeAttribute('aria-busy');
    }
  }

  // Hash-based routing
  function handleHashChange() {
    const path = location.hash.replace('#', '') || '/home';
    navigate(path);
  }

  window.addEventListener('hashchange', handleHashChange);

  // Bottom nav click
  document.querySelectorAll('.nav-item[data-route]').forEach(btn => {
    btn.addEventListener('click', () => {
      location.hash = btn.dataset.route;
    });
  });

  // Initial load
  handleHashChange();
  setupPersistence();
}

// ---- Heavy services (deferred, non-blocking) ----

async function initHeavyServices() {
  // These are loaded after the UI is visible — never block first paint
  try {
    // Stack Recommender AI (Sprint 2)
    const { stackRecommender } = await import('../ai/stack-recommender.js');
    window.__services = window.__services ?? {};
    window.__services.ai = stackRecommender;
    console.log('[App] AI engine loaded');
  } catch (e) {
    console.warn('[App] AI engine unavailable:', e);
  }

  try {
    // Price comparator (Sprint 5)
    const { priceComparator } = await import('../monetization/price-comparator.js');
    window.__services.price = priceComparator;
    console.log('[App] Price comparator loaded');
  } catch (e) {
    console.warn('[App] Price comparator unavailable:', e);
  }
}

// ---- UI helpers ----

function revealApp() {
  const loading = document.getElementById('app-loading');
  const app     = document.getElementById('app');

  if (loading) {
    loading.style.opacity = '0';
    loading.style.transition = 'opacity 0.3s';
    setTimeout(() => loading.remove(), 300);
  }

  if (app) app.style.display = '';
}

function showFatalError(err) {
  document.body.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100dvh;gap:16px;padding:32px;text-align:center;font-family:sans-serif;background:#0A0A0A;color:#F5F5F5">
      <h1 style="font-size:20px">Erro ao inicializar</h1>
      <p style="color:#888;max-width:300px;line-height:1.6">
        Tente recarregar a página. Se o problema persistir, limpe o cache do navegador.
      </p>
      <button onclick="location.reload()" style="padding:12px 24px;background:#7C3AED;color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:15px">
        Recarregar
      </button>
      ${DEBUG ? `<pre style="font-size:11px;color:#666;max-width:400px;text-align:left">${err.stack}</pre>` : ''}
    </div>
  `;
}

// ---- Start ----
init();
```

---

## FILES TO DELIVER

1. `/src/core/event-bus.js` — EventBus singleton com EVENTS schema
2. `/src/core/state-manager.js` — StateManager imutável singleton
3. `/src/core/app.js` — Bootstrapper completo com router, persistência e lazy loading

## VALIDATION CHECKLIST

- [ ] `import { eventBus, EVENTS } from './event-bus.js'` works from any module
- [ ] `eventBus.emit('unknown:event')` throws an error (validates schema)
- [ ] `stateManager.set('user.name', 'João')` does NOT mutate previous state
- [ ] `stateManager.get('user.name')` returns 'João' after set
- [ ] Refreshing the page restores state from localStorage
- [ ] Going offline shows the offline banner (body.offline class)
- [ ] Navigating via bottom nav updates `aria-current="page"` correctly
- [ ] Console shows no errors on first load (local server)
- [ ] Heavy services load AFTER first paint (check Network waterfall in DevTools)
```

---

## SUMÁRIO DE ENTREGAS DO SPRINT 1

| Arquivo | Prompt |
|---------|--------|
| `/public/index.html` | 1.0 |
| `/public/app.html` | 1.0 |
| `/public/offline.html` | 1.0 |
| `/src/css/design-system.css` | 1.1 |
| `/public/manifest.json` | 1.2 |
| `/public/service-worker.js` | 1.2 |
| `build.js` | 1.3 |
| `package.json` (scripts) | 1.3 |
| `/src/core/event-bus.js` | 1.4 |
| `/src/core/state-manager.js` | 1.4 |
| `/src/core/app.js` | 1.4 |

**Ao concluir o Sprint 1, o app deve:**
- Carregar em < 0.5s no 3G ✅
- Funcionar completamente offline ✅
- Passar Lighthouse 100/100 em todas as categorias ✅
- Ter zero violations de acessibilidade (axe-core) ✅
- Ter roteamento SPA funcional com 5 páginas stub ✅
- Persistir estado entre sessões via localStorage ✅
- Ter a fundação de EventBus + StateManager pronta para o Sprint 2 (IA) ✅
