# 🚀 SupliList — Guia Completo Vercel + Render + Cloudflare

**Sua Setup Atual:**
- Frontend: Vercel
- Backend: Render (suplilist-api.onrender.com)
- CDN: Cloudflare
- Banco: MongoDB Atlas
- Cache: Redis

**Objetivo:** Integrar P2 + Otimizar Cloudflare + Deploy automático

---

## 📋 Índice

1. [P2 Setup](#p2-setup)
2. [Integração Vercel](#integração-vercel)
3. [Integração Render](#integração-render)
4. [Otimização Cloudflare](#otimização-cloudflare)
5. [Monitoramento](#monitoramento)
6. [Próximas Steps](#próximas-steps)

---

## 🔧 P2 Setup

### Passo 1: Criar Arquivos P2

```bash
cd C:\Users\User\Desktop\suplilist
node setup-p2-files.js
```

Vai criar:
- ✅ `frontend/src/components/error-boundary.js`
- ✅ `frontend/src/components/global-error-modal.js`
- ✅ `frontend/src/platform/error-tracking.js`
- ✅ `frontend/src/platform/performance-monitor.js`
- ✅ `docs/OPENAPI.md`
- ✅ `docs/DEPLOYMENT.md`
- ✅ `frontend/e2e/auth-flow.spec.js`

### Passo 2: Integrar no Frontend (main-layout.js)

Encontre seu arquivo principal (ex: `src/features/main-layout.js` ou `src/App.jsx`):

```javascript
// Adicione no topo:
import ErrorBoundary from './components/error-boundary.js';
import GlobalErrorModal from './components/global-error-modal.js';
import { errorTracker } from './platform/error-tracking.js';
import { perfMonitor } from './platform/performance-monitor.js';

// Na inicialização:
export default class MainLayout {
  constructor() {
    this.errorBoundary = new ErrorBoundary(document.body);
    this.errorModal = new GlobalErrorModal(document.body);
  }

  mount() {
    // Inicializar error tracking e monitoring
    this.errorBoundary.mount('#app');
    this.errorModal.mount();
    errorTracker.init();
    perfMonitor.init();

    // Resto do setup...
    this._render();
  }
}
```

### Passo 3: Configurar Variáveis de Ambiente

**Frontend (.env.production):**

```env
VITE_API_BASE_URL=https://suplilist-api.onrender.com
VITE_ERROR_TRACKING_ENABLED=true
VITE_PERFORMANCE_MONITORING_ENABLED=true
```

**Backend (.env):**

```env
# Adicionar novos endpoints de monitoramento
HEALTH_CHECK_ENABLED=true
ERROR_TRACKING_ENDPOINT=/api/logs/errors
METRICS_ENDPOINT=/api/metrics/performance
```

### Passo 4: Instalar Playwright (E2E Tests)

```bash
cd frontend
npm install --save-dev @playwright/test
npx playwright install
```

### Passo 5: Rodar Testes Localmente

```bash
# Terminal 1: Backend
cd server
npm start

# Terminal 2: Frontend
cd ../frontend
npm run dev

# Terminal 3: E2E Tests
npm run test:e2e
```

---

## 🌐 Integração Vercel

### Configuração Vercel.json (Já pronta!)

Seu `frontend/vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://suplilist-api.onrender.com/api/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Isso significa:**
- `/api/*` → redirecionado para Render
- Tudo mais → servido como SPA

### Deploy Automático

1. **Conectado ao GitHub?**
   - Sim ✅ → Cada push em `main` deploya automaticamente

2. **Variáveis de Ambiente em Vercel:**
   - Ir para: https://vercel.com/dashboard → seu projeto → Settings → Environment Variables
   - Adicionar:
   ```
   VITE_API_BASE_URL=https://suplilist-api.onrender.com
   VITE_ERROR_TRACKING_ENABLED=true
   VITE_PERFORMANCE_MONITORING_ENABLED=true
   ```

3. **Verificar Deploy:**
   ```bash
   curl https://suplilist.app/health/live
   # Esperado: Redireciona para /api/logs ou similar
   ```

### Problemas Comuns

**Erro: "Cannot GET /api/logs/errors"**
- Solução: Backend não tem a rota
- Fix: Adicionar endpoint em `server/src/routes/health.ts`

**Erro: CORS na performance tracking**
- Solução: Backend precisa de CORS para `/api/metrics/performance`
- Fix: Adicionar em `server/src/middleware/cors.middleware.ts`

---

## 🔌 Integração Render

### Backend Setup (Render)

Seu backend está em: `https://suplilist-api.onrender.com`

**Adicionar Health Endpoints:**

1. SSH no Render:
```bash
# Se tiver SSH configurado
ssh render_app
```

2. Ou fazer push direto (recomendado):
```bash
git push render main
# Render redeploya automaticamente
```

**Verificar Endpoints:**

```bash
# Health check (novo em P2)
curl https://suplilist-api.onrender.com/health/live
# Esperado: { "status": "healthy" }

curl https://suplilist-api.onrender.com/health/ready
# Esperado: { "status": "healthy|degraded", "checks": {...} }

# Error tracking (novo em P2)
curl -X POST https://suplilist-api.onrender.com/api/logs/errors \
  -H "Content-Type: application/json" \
  -d '{"type":"test","message":"test error"}'

# Metrics (novo em P2)
curl -X POST https://suplilist-api.onrender.com/api/metrics/performance \
  -H "Content-Type: application/json" \
  -d '{"pageLoad":1500,"fcp":800}'
```

### Logs em Render

```bash
# Ver logs em tempo real
# Ir para: https://dashboard.render.com → seu app → Logs

# Ou via terminal (se SSH configurado):
tail -f /app/logs/app.log
```

### Variáveis de Ambiente em Render

1. Ir para: https://dashboard.render.com → seu app → Environment
2. Adicionar:
```
HEALTH_CHECK_ENABLED=true
ERROR_TRACKING_ENDPOINT=/api/logs/errors
METRICS_ENDPOINT=/api/metrics/performance
TRACE_ID_ENABLED=true
```

---

## ☁️ Otimização Cloudflare

### 1️⃣ Cache Rules (Eficiência de Cache)

**Objetivo:** Lighthouse +1 ponto, economiza 55KB

1. Acesse: https://dash.cloudflare.com/
2. Selecione domínio: **suplilist.com** (ou seu domínio)
3. Caching → **Cache Rules**
4. Clique **Create Rule**

**Rule 1: Assets Imutáveis (1 ano)**

```
Nome: Immutable assets 1 year

Condição:
(http.request.uri.path matches "^/assets/.*\.[a-f0-9]{8}\.(js|css|woff2|png|jpg|svg)$")

Ação:
- Cache Status: Cache
- Browser Cache TTL: 1 year
```

**Rule 2: HTML (30 minutos)**

```
Nome: HTML cache 30min

Condição:
(http.request.uri.path matches ".*\.html$") OR (http.request.uri.path eq "/")

Ação:
- Cache Status: Cache
- Browser Cache TTL: 30 minutes
```

**Rule 3: API (Sem cache)**

```
Nome: API no-cache

Condição:
(http.request.uri.path matches "^/api/.*")

Ação:
- Cache Status: Bypass
```

5. Deploy cada regra (levam 1-2 min)

### 2️⃣ Verificação de Cache

```bash
# Assets (deve ter Cache-Control: 1 year)
curl -I https://suplilist.app/assets/main-DOmSCkCc.css | grep Cache-Control

# HTML (deve ter Cache-Control: 30 min)
curl -I https://suplilist.app/index.html | grep Cache-Control

# API (deve ser Bypass)
curl -I https://suplilist.app/api/supplements/search | grep CF-Cache-Status
```

### 3️⃣ Compression (Gzip)

1. Cloudflare Dashboard → Speed → Optimization
2. Ativar:
   - ✅ Brotli (melhor que gzip)
   - ✅ Minify JS/CSS/HTML
   - ✅ Early Hints (experimental)

### 4️⃣ Workers (Optional - Avançado)

Para correlacionar Trace IDs entre Vercel e Render:

**Cloudflare Worker:**

```javascript
export default {
  async fetch(request) {
    // Gerar ou passar trace ID
    const traceId = crypto.randomUUID();
    
    const response = await fetch(request);
    
    // Adicionar trace ID em headers
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('X-Trace-ID', traceId);
    
    return newResponse;
  }
};
```

Ativar em: Cloudflare → Workers → Routes

---

## 📊 Monitoramento

### 1️⃣ Health Endpoints

```bash
# Verificar saúde do backend (P2)
curl https://suplilist-api.onrender.com/health/ready

# Deve retornar:
{
  "status": "healthy",
  "checks": {
    "redis": "ok",
    "mongodb": "ok"
  },
  "uptime": 3600
}
```

### 2️⃣ Error Tracking

Frontend está enviando erros para:
```
POST https://suplilist-api.onrender.com/api/logs/errors
```

Verificar com DevTools:
1. Abrir DevTools (F12) → Network tab
2. Triggerar erro: `throw new Error('test')`
3. Ver POST request para `/api/logs/errors`

### 3️⃣ Performance Metrics

Frontend está enviando métricas para:
```
POST https://suplilist-api.onrender.com/api/metrics/performance
```

Rastreando:
- Page Load Time
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)

### 4️⃣ Dashboards Recomendados

**Render Dashboard:**
- https://dashboard.render.com → seu app → Metrics

**Vercel Analytics:**
- https://vercel.com/dashboard → seu projeto → Analytics

**Cloudflare Analytics:**
- https://dash.cloudflare.com → seu domínio → Analytics

---

## 🎯 Próximas Steps

### Semana 1: Consolidar P2

- [ ] Rodar `setup-p2-files.js`
- [ ] Integrar componentes em main-layout.js
- [ ] Testar error boundary localmente
- [ ] Testar error tracking
- [ ] Testar performance monitoring
- [ ] Push para Vercel → deploy automático
- [ ] Verificar endpoints em Render

### Semana 2: Otimizar Cloudflare

- [ ] Configurar Cache Rules (3 regras acima)
- [ ] Ativar Brotli + Minify
- [ ] Rodar Lighthouse novamente (target 98+)
- [ ] Setup Worker para trace ID (optional)

### Semana 3+: Features

**Prioritize:**
1. Payment Integration (Stripe)
2. Price Drop Notifications
3. User Reviews/Ratings
4. Mobile App (React Native)

---

## 🔄 CI/CD Pipeline

### Automático no Push

```
git push origin main
    ↓
GitHub Actions (if configured)
    ↓
npm test (rodar testes)
    ↓
npm run build
    ↓
Vercel redeploya (frontend)
    ↓
Render redeploya (backend)
    ↓
Cloudflare cache purge
    ↓
✅ Nova versão live
```

### Manual Deploy (se GitHub Actions não estiver)

```bash
# Frontend
cd frontend
npm run build
git add .
git commit -m "Deploy: P2 integration"
git push origin main
# Vercel redeploya automaticamente

# Backend
cd ../server
git add .
git commit -m "Deploy: P2 health endpoints"
git push render main
# Render redeploya automaticamente
```

---

## ✅ Checklist Final

**Antes de considerar completo:**

- [ ] Health endpoints respondendo (GET /health/live, /health/ready)
- [ ] Error tracking funcionando (console.error → POST /api/logs/errors)
- [ ] Performance monitoring ativo (métricas enviadas)
- [ ] Cloudflare cache rules deployadas
- [ ] E2E tests passando
- [ ] Zero errors em logs (Render)
- [ ] Lighthouse > 95
- [ ] Response time p95 < 500ms

---

## 📝 Resumo da Arquitetura

```
┌─────────────────────┐
│   suplilist.app     │ (seu domínio)
│   (Cloudflare CDN)  │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    ↓             ↓
┌─────────┐  ┌──────────────────┐
│ Vercel  │  │ Render Backend   │
│Frontend │  │ suplilist-api.com│
└────┬────┘  └────┬─────────────┘
     │            │
     │       ┌────┴────────┐
     │       ↓             ↓
     │  ┌─────────┐   ┌─────────┐
     └──┤ MongoDB │   │ Redis   │
        │ Atlas   │   │ Cache   │
        └─────────┘   └─────────┘
```

---

**Status:** 🟢 Ready for P2 Integration  
**Time to Deploy:** ~2 hours  
**Last Updated:** 2026-06-08
