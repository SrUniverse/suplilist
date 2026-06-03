# Feature Roadmap — SupliList

**Versão:** 2.0
**Última atualização:** 2026-06-02
**Horizonte:** Junho 2026 – Dezembro 2026

---

## Estado atual (2026-06-02)

```
Saúde do codebase:    8/10 (era 7/10 — melhorou após auditoria)
Cobertura de testes:  ~61% (meta: 80%)
Bundle inicial:       ~65 KB gzip (target: <300 KB) ✅
Build:                4.23s ✅
Deploy:               suplilist.com via GitHub Pages ✅
```

---

## Roadmap por fase

### Fase 2 — Features (CONCLUÍDA em Jun 2026)

Tudo que estava previsto foi implementado e auditado:

| Feature | Status | Notas |
|---------|--------|-------|
| Notificações real-time | ✅ | Web Notifications API + service worker |
| Social sharing | ✅ | Web Share API + QR code |
| Advanced search | ✅ | Fuse.js, filtros, histórico |
| Premium freemium | ✅ | Tier free/pro/elite, analytics, Excel export |
| Auditoria de segurança | ✅ | 3 críticos corrigidos, CSP endurecida |
| Auditoria de performance | ✅ | Bundle −80% (ExcelJS lazy) |
| Testes das features premium | ✅ | 5 testes críticos adicionados |

---

### Fase 3 — Pagamentos reais (Jul 2026)

**Objetivo:** Substituir o sistema de tier 100% client-side por uma fonte de verdade no servidor. Hoje qualquer usuário pode editar o `localStorage` e ganhar acesso premium de graça.

**Abordagem técnica:**

```
Fluxo atual (inseguro):
  Usuário clica "Ativar" → setTimeout → localStorage.tier = 'pro' → acesso liberado

Fluxo futuro (seguro):
  Usuário clica "Ativar" → Stripe Checkout → webhook → backend emite JWT →
  frontend verifica JWT no boot → acesso liberado apenas se JWT válido e não expirado
```

**Tarefas:**

- [ ] Escolha do gateway: Stripe (internacional, developer-friendly) ou Mercado Pago (BR-first)
- [ ] Backend mínimo em Node.js/Express:
  - `POST /webhook/stripe` — recebe evento de pagamento, cria registro de subscriber
  - `GET /api/session` — valida JWT do usuário, retorna tier atual
  - `POST /api/cancel` — marca subscriber como cancelado
- [ ] Hosting: Railway ou Render (gratuito no tier inicial, ~$5/mês ao crescer)
- [ ] Frontend: substituir `StorageManager.getItem('suplilist:tier')` por chamada a `/api/session` no boot
- [ ] Manter fallback offline: cache o JWT no localStorage com TTL de 24h para funcionar sem internet
- [ ] Preços definidos: Pro R$14,90/mês, Elite R$29,90/mês (ou anual com desconto)

**Definition of Done:**
- Usuário paga → tier ativo em 30 segundos
- Tier persiste entre sessões sem possibilidade de bypass
- Cancelamento reflete em ≤24h (TTL do cache JWT)
- Checkout testado com cartão de teste do Stripe

---

### Fase 4 — Contas de usuário (Ago–Set 2026)

**Objetivo:** Dados do usuário (stack, check-ins, histórico) sincronizados entre dispositivos e protegidos por conta.

**Hoje:** Tudo em `localStorage` — perda de dados ao trocar de dispositivo, sem backup.

**Features:**
- Sign up / Login (email + senha com bcrypt, ou OAuth Google)
- Migração automática de dados locais para conta na primeira autenticação
- Sync de stack, checkins e favoritos
- Perfil completo (peso, objetivos, restrições) persistido no servidor
- Account deletion (LGPD: direito ao esquecimento)

**Stack técnico:**
- Auth: JWT com refresh token (ou Supabase Auth para acelerar)
- DB: PostgreSQL (Supabase ou Railway Postgres)
- Sync: API REST simples, sem WebSocket por agora
- Offline: IndexedDB com queue de operações pendentes

---

### Fase 5 — Escala e lojas (Out–Dez 2026)

**Objetivo:** Produto polido, publicado nas lojas, com 10k+ usuários ativos.

**Performance:**
- Lighthouse 95+ em todas as rotas
- LCP < 2s universal
- Refatorar list-page.js (1691 linhas → ≤800)
- Bundle analysis trimestral

**App stores:**
- Google Play via TWA (Trusted Web Activity) — app aprovado com mesmo codebase
- App Store via Capacitor.js (wrapper mínimo)
- Screenshots e copy para ambas as lojas

**Analytics e crescimento:**
- A/B testing de CTAs de upgrade (botão no lock card, timing do upsell)
- Funil de conversão: visitante → free → pro
- Cohort analysis: retenção D1, D7, D30
- MRR dashboard interno

---

## Decisões pendentes (antes de iniciar Fase 3)

| Decisão | Opções | Prazo |
|---------|--------|-------|
| Gateway de pagamento | Stripe vs Mercado Pago | Jul 2026 |
| Hosting do backend | Railway vs Render vs Fly.io | Jul 2026 |
| Preços finais | Pro R$14,90 vs R$19,90 / Elite R$29,90 | Jul 2026 |
| Auth provider | Supabase Auth vs próprio JWT | Ago 2026 |
| Database | Supabase vs Railway Postgres | Ago 2026 |

---

## Métricas de sucesso por fase

| Fase | Métrica | Target |
|------|---------|--------|
| 3 (Pagamentos) | Conversão free→pro | ≥3% |
| 3 (Pagamentos) | MRR ao fim do mês | R$500+ |
| 4 (Contas) | Retenção D7 | ≥40% |
| 4 (Contas) | MAU | 1.000+ |
| 5 (Escala) | Downloads totais | 10.000+ |
| 5 (Escala) | MRR | R$5.000+ |

---

## Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Backend complexity | Médio | Alto | Começar com Supabase (backend-as-a-service) para acelerar |
| Churn alto no freemium | Médio | Alto | A/B testar o momento do upsell antes de escalar |
| Rejeição nas lojas | Baixo | Médio | Verificar políticas de PWA antes de submeter |
| Concorrência | Baixo | Médio | Foco em nicho BR + evidência científica = diferenciação |

---

**Este roadmap é revisado mensalmente.** Adaptar baseado em feedback de usuários, capacidade técnica e dados de uso.
