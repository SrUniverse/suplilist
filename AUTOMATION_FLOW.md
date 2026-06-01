# MCP Automation Flow — Diagrama Visual

## 🔄 Fluxo Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                    GITHUB ACTIONS SCHEDULER                      │
│                    (sem intervenção manual)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ├─────────────────────┐
                              │                     │
                              │                     │
              ┌───────────────┴──────────┐  ┌──────┴──────────────┐
              │                          │  │                     │
              │                          │  │                     │
              ▼                          ▼  ▼                     ▼
      ┌──────────────┐         ┌─────────────────┐      ┌──────────────┐
      │  SEGUNDA     │         │    TERCEIRA     │      │   SEXTA      │
      │  DOMINGO 9AM │         │    DIARIAMENTE  │      │   2PM        │
      │     (UTC)    │         │      6AM (UTC)  │      │     (UTC)    │
      └──────────────┘         └─────────────────┘      └──────────────┘
              │                          │                     │
              │                          │                     │
              ▼                          ▼                     ▼
      ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
      │  FIRECRAWL MCP   │    │  CHROME DEVTOOLS │    │  PLAYWRIGHT MCP  │
      │                  │    │  PERFORMANCE     │    │                  │
      │ • Shopee         │    │                  │    │ • Home load      │
      │ • Mercado Livre  │    │ • Measure LCP    │    │ • Search works   │
      │ • Amazon         │    │ • Measure INP    │    │ • Recommend test │
      │                  │    │ • Measure CLS    │    │ • Navigation ok  │
      └──────────────────┘    └──────────────────┘    └──────────────────┘
              │                          │                     │
              │ ✅ Preços OK             │ ✅ Perf OK         │ ✅ Tests OK
              │ ❌ Preços FALHA          │ ❌ Perf FALHA      │ ❌ Tests FALHA
              │                          │                     │
              ├──────────────────────────┼─────────────────────┤
              │                          │                     │
              ▼                          ▼                     ▼
      ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
      │  Gera affiliate  │    │  Valida contra   │    │  Upload artifacts│
      │  .config.js      │    │  targets         │    │  (screenshots)   │
      │                  │    │                  │    │                  │
      │  Commit automático   │  • LCP < 2.5s    │    │  Rodar Validators│
      │  "chore: update      │  • INP < 200ms   │    │                  │
      │   supplement prices" │  • CLS < 0.1     │    │  Report: PASS/FAIL
      └──────────────────┘    └──────────────────┘    └──────────────────┘
              │                          │                     │
              │                          │                     │
              ├──────────────────────────┴─────────────────────┤
              │                                                 │
              ▼                                                 ▼
      ┌────────────────────────────────────────────┐  ┌────────────────┐
      │          GIT PUSH para MAIN                │  │  ISSUE CRIADA  │
      │                                            │  │  SE FALHAR     │
      │ ✅ Preços atualizados                     │  │                │
      │ ✅ Version controlado                     │  │ "❌ Price      │
      │ ✅ Histórico rastreável                   │  │  Monitor Failed"│
      │ ✅ Deployment automático                  │  │                │
      └────────────────────────────────────────────┘  │ "⚠️ Performance│
                                                       │  Degraded"     │
                                                       │                │
                                                       │ "❌ E2E Tests │
                                                       │  Failed"       │
                                                       └────────────────┘
```

---

## 🎯 Timeline

```
HORA (UTC)      EVENTO                      AÇÃO
─────────────────────────────────────────────────────────────────
6:00 AM         Performance Check           Chrome DevTools inicia
                                            LCP/INP/CLS medidos
                                            Alert se falha

9:00 AM         Price Monitor               Firecrawl scrape
(Domingo)       (Semanal)                   5 supps × 3 markets
                                            Commit + Push

2:00 PM         E2E Tests                   Playwright inicia
(Seg-Sex)       (5 dias/sem)                Fluxos testados
                                            Report gerado
```

---

## 📊 Supervisão em Tempo Real

```
┌─────────────────────────────────────────────────────────┐
│              GITHUB ACTIONS DASHBOARD                    │
│                                                          │
│  Workflow: MCP Automation Pipeline                      │
│  ✅ Enabled                                              │
│                                                          │
│  ─────────────────────────────────────────────────────  │
│  Recent Runs:                                            │
│  ─────────────────────────────────────────────────────  │
│                                                          │
│  [Run #47] ✅ COMPLETED (Sun 09:00)                      │
│    └─ Firecrawl prices ✅                                │
│    └─ Commit pushed ✅                                   │
│                                                          │
│  [Run #46] ⏳ IN PROGRESS (Today 06:00)                 │
│    └─ Chrome DevTools ⏳                                │
│    └─ Measuring Core Web Vitals...                      │
│                                                          │
│  [Run #45] ✅ COMPLETED (Fri 14:00)                     │
│    └─ E2E Tests ✅                                       │
│    └─ 100% flows passed                                 │
│                                                          │
│  [Run #44] ❌ FAILED (Fri 06:00)                        │
│    └─ Chrome DevTools ❌ (LCP degraded)                │
│    └─ Issue created: ⚠️ Performance Regression         │
│                                                          │
└─────────────────────────────────────────────────────────┘

Via CLI:
$ gh run list
$ gh run view <ID> --log
$ gh issue list --label bot:automation
```

---

## 🔐 Dados Flow

```
┌──────────────────┐
│  FIRECRAWL API   │
│  KEY (Secret)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────┐
│   GitHub Actions (Secure)        │
│   Environment Variables           │
│                                  │
│   FIRECRAWL_API_KEY = ****       │
│   (nunca visível em logs)         │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│   firecrawl-monitor.js           │
│   (Node.js script)               │
│                                  │
│   const apiKey = process.env...  │
│   const response = await fetch() │
│   const prices = parse()         │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│   affiliate.config.js            │
│   (gerado automaticamente)       │
│                                  │
│   export const SUPPLEMENT_PRICES │
│   = { creatina: {...}, ... }     │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│   git commit + push              │
│   (main branch)                  │
│                                  │
│   Código versionado e seguro     │
└──────────────────────────────────┘
```

---

## ❌ Fallback em Falhas

```
┌──────────────────────┐
│  ERRO DETECTADO      │
│  (any job fails)     │
└──────────┬───────────┘
           │
           ▼
    ┌──────────────────────────────────┐
    │  Job termina com exit code 1     │
    │  (failure() = true)              │
    └──────────┬──────────────────────┘
               │
               ▼
    ┌──────────────────────────────────┐
    │  github-script step executado    │
    │  (if: failure())                 │
    └──────────┬──────────────────────┘
               │
               ▼
    ┌──────────────────────────────────┐
    │  github.rest.issues.create({     │
    │    title: "❌ ...",              │
    │    body: "Check logs...",        │
    │    labels: [...]                 │
    │  })                              │
    └──────────┬──────────────────────┘
               │
               ▼
    ┌──────────────────────────────────┐
    │  ISSUE criada automaticamente    │
    │  no repositório                  │
    │                                  │
    │  Você recebe notificação         │
    │  GitHub → Issues → [New]         │
    └──────────────────────────────────┘
```

---

## 🎯 Estados e Transições

```
START
  │
  ├─► Cron dispara (schedule)
  │
  ├─► OR Workflow dispara manual (workflow_dispatch)
  │
  ▼
IDENTIFY JOB TYPE
  ├─► Sunday 9am? → FIRECRAWL PRICES
  ├─► Every 6am?  → CHROME DEVTOOLS PERF
  └─► Weekday 2pm? → PLAYWRIGHT E2E
  
  ▼
EXECUTE JOB
  ├─► Checkout
  ├─► Setup Node.js
  ├─► Install deps
  ├─► Run scripts
  │
  ├─► SUCCESS? → COMMIT + PUSH (if prices)
  │
  └─► FAILURE? → CREATE ISSUE + ALERT
  
  ▼
COMPLETE
```

---

## 💰 Custos

**GitHub Actions**:
- Free: 2,000 minutes/month (suficiente)
- Mais de 3 jobs × 4 runs/semana × ~5 min = ~60 min/mês ✅

**Firecrawl**:
- Seu plano + API key

**Chrome DevTools**:
- Gratuito (local no CI)

**Playwright**:
- Browsers instalados no CI (gratuito)

---

## ✅ Benefícios

| Benefício | Descrição |
|-----------|-----------|
| 🕐 **24/7** | Roda sem você fazer nada |
| 🔄 **Automático** | Sem gatilho manual |
| 📊 **Auditado** | Logs + artifacts + issues |
| 🔐 **Seguro** | Secrets gerenciados |
| 📈 **Escável** | Fácil adicionar jobs |
| 💾 **Versionado** | Histórico completo no git |
| 🚨 **Alertado** | Issues em falhas |

---

**🎉 Resultado**: Seu sistema de suplementos em produção, monitorado 24/7!
