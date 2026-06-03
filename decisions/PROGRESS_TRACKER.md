# Progress Tracker — SupliList

**Início:** 2026-06-02
**Última atualização:** 2026-06-02
**Fase atual:** Freemium implementado e auditado — pronto para commit/deploy

---

## Visão geral das fases

```
FASE 1: Fundação e infraestrutura (Jun 2026)       ✅ CONCLUÍDO
FASE 2: Features (Jun–Jul 2026)                    ✅ CONCLUÍDO (com correções)
FASE 3: Backend + Pagamentos reais (Jul–Ago 2026)  ⬜ PRÓXIMO
FASE 4: Contas e sync (Set–Out 2026)               ⬜ PLANEJADO
FASE 5: Polish e lojas de apps (Nov–Dez 2026)      ⬜ PLANEJADO
```

---

## Fase 1: Fundação ✅

- [x] CI/CD configurado (GitHub Actions → GitHub Pages)
- [x] Build Vite com Vitest, ESLint, Stylelint
- [x] SUPPLEMENTS_DB: 55+ suplementos com evidência científica
- [x] StateManager imutável (Redux-like)
- [x] EventBus pub/sub desacoplado
- [x] VirtualScroller para listas longas
- [x] Design system com 3 temas (dark/light/midnight)
- [x] PWA com service worker e offline support
- [x] 11 rotas: /list /my-stack /favorites /checkin /history /dosage /profile /settings /faq /legal /onboarding
- [x] Programmatic SEO: 67 URLs de suplementos geradas
- [x] CODEBASE_HEALTH_REPORT.md, CURRENT_ARCHITECTURE.md, DEVELOPMENT_STANDARDS.md

---

## Fase 2: Features ✅ (concluído com auditoria e correções em 2026-06-02)

### Features implementadas
- [x] Sistema de notificações real-time (Web Notifications API + service worker)
- [x] Social sharing (Web Share API + QR Code + hooks de messaging)
- [x] Advanced Search (painel colapsável, evidência científica, filtro de preço max, multi-tag objetivos, histórico de buscas)
- [x] Freemium / Premium features (tier free/pro/elite, analytics avançado, export Excel, ads para free)

### Auditoria completa realizada (2026-06-02)
4 agentes de revisão identificaram e 5 agentes de correção resolveram:

| Issue | Severidade | Status |
|-------|-----------|--------|
| Tier não persistia após reload | CRITICAL | ✅ Corrigido — hidratação no boot |
| Formulário de cartão falso (risco LGPD) | CRITICAL | ✅ Corrigido — UI de demo honesta |
| Tier bypassável via console | CRITICAL | ✅ Corrigido — whitelist no reducer |
| CSP com unsafe-inline | HIGH | ✅ Corrigido — hashes SHA-256 |
| ExcelJS estático (+252 KB bundle) | HIGH | ✅ Corrigido — dynamic import |
| SettingsPage rebuild DOM completo | HIGH | ✅ Corrigido — re-render seletivo |
| State access inconsistente | HIGH | ✅ Corrigido — getState() uniforme |
| Inline styles massivos | MEDIUM | ✅ Corrigido — movidos para _injectStyles() |
| console.error / alert síncrono | MEDIUM | ✅ Corrigido — logger + toast |
| alt attributes sem escapeHtml | MEDIUM | ✅ Corrigido |
| 5 testes críticos faltantes | HIGH | ✅ Escritos (agente 5) |

### Métricas após correções
- Bundle inicial: **~65 KB gzip** (era 316 KB — redução de 80%)
- Build time: 4.23s
- Testes: cobertura estimada ~61%+ (5 novos testes adicionados)

---

## Fase 3: Backend + Pagamentos reais ⬜ (Jul 2026)

### Objetivo
Substituir o sistema de tier 100% client-side por verificação server-side real.

### Tarefas
- [ ] Escolher gateway de pagamento: Stripe / PagSeguro / Mercado Pago
- [ ] Backend mínimo (Node.js):
  - Receber webhooks de pagamento
  - Emitir JWT assinado com tier + expiração
  - Endpoint `/api/session` para verificar JWT no boot
- [ ] Frontend: substituir leitura de `localStorage` por verificação do JWT
- [ ] Remover bypass definitivamente (tier não pode mais ser alterado client-side)
- [ ] Testar fluxo completo: clique → pagamento → ativação → persistência entre sessões
- [ ] Configurar ambiente de staging antes de produção

### Pré-requisitos
- Escolha do hosting para o backend (Railway, Render, Fly.io)
- Conta no gateway de pagamento configurada
- Domínio verificado para webhooks

---

## Fase 4: Contas de usuário e sync ⬜ (Ago–Set 2026)

- [ ] Sign up / Login (email + senha ou OAuth Google)
- [ ] Perfil persistido no servidor (weight, goal, stack)
- [ ] Sincronização de check-ins entre dispositivos
- [ ] Offline-first: queue de operações, sync quando voltar online
- [ ] Resolução de conflitos (último write ganha com timestamp)

---

## Fase 5: Polish e lojas ⬜ (Out–Dez 2026)

- [ ] Lighthouse 95+ em todas as rotas
- [ ] LCP < 2s, CLS < 0.05 em todas as páginas
- [ ] Refatoração de list-page.js (1691 linhas → limite 800)
- [ ] A/B testing de CTAs do freemium
- [ ] Google Play (TWA)
- [ ] App Store (iOS via capacitor ou PWA nativo)
- [ ] MRR tracking e dashboard interno

---

## Backlog permanente

- [ ] prices.json real com links de afiliado (Amazon, ML, Shopee) — hoje é placeholder
- [ ] Validação dos textos legais com advogado
- [ ] "Suporte prioritário" substituir chatbot fake por contato real
- [ ] Cobertura de testes ≥80% (hoje ~61%)

---

## Histórico de decisões importantes

| Data | Decisão | Motivação |
|------|---------|-----------|
| 2026-05-29 | Layout imutável: sidebar desktop + bottom nav mobile | UX testada e aprovada |
| 2026-06-02 | Remover campos de cartão do checkout | Risco legal LGPD/CDC |
| 2026-06-02 | ExcelJS dynamic import | Bundle de 316 KB → 65 KB |
| 2026-06-02 | CSP com hashes SHA-256 | Segurança XSS |
| Futuro | Backend para JWT de tier | Bypass client-side não é aceitável para produção real |
