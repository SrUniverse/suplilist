# Plano de Ação — Qualidade Técnica + UI Redesign

**Data:** 2026-05-30  
**Horizonte:** 2–4 semanas  
**Abordagem:** Auditoria completa → Feature Freeze + Correção

---

## Contexto

O SupliList está em v2.0 com 11 páginas implementadas, arquitetura event-bus/state-manager e PWA funcional. O código cresceu sem cobertura de testes adequada e a UI não está satisfazendo o padrão desejado. O objetivo é estabilizar a base antes de avançar para o Sprint 23+.

---

## Estrutura do Plano

### Fase 1 — Auditoria (3–5 dias)

#### Code Review — `src/`
- **core/** — app.js, event-bus.js, router.js: padrões, acoplamento, dead code
- **state/** — state-manager.js: mutações diretas, consistência, persistência
- **pages/** — cada página: lógica misturada com UI, duplicação, erros silenciosos
- **ai/** — dosage-calculator.js, stack-recommender.js: edge cases, entradas inválidas
- **Cobertura de testes** — o que existe vs o que falta (Vitest + Playwright)
- **database.js** — estrutura da constante `IT`, qualidade dos dados

#### UX Audit — Páginas
- Consistência visual entre as 11 páginas
- Responsividade mobile (tamanhos, espaçamentos, touch targets)
- Hierarquia tipográfica e uso do design-system.css
- Fluxos de navegação — onde o usuário se perde
- Estados vazios, loading e erro — tratamento visual

#### Infra
- Build Vite — warnings, bundle size, code splitting
- CI/CD — GitHub Actions: o que passa, falha ou falta
- PWA — service-worker funcional, manifest correto
- Deploy GitHub Pages — processo estável

#### Saída da Fase 1
Lista priorizada de problemas em 3 níveis:
- **P1** — Crítico: quebra funcionalidade ou experiência principal
- **P2** — Importante: degrada qualidade mas não bloqueia
- **P3** — Melhoria: nice-to-have para depois

---

### Fase 2 — Feature Freeze + Correção (10–15 dias)

**Regra:** Zero features novas até todos os critérios de saída serem atendidos.

#### Dias 1–3 — P1 Críticos
- Bugs que quebram funcionalidade core
- Código inseguro ou com comportamento imprevisível
- Páginas inutilizáveis em mobile
- Erros silenciosos no state-manager ou router

#### Dias 2–8 — UI Redesign (paralelo ao P1)
- Revisão completa do `design-system.css` — tokens de cor, tipografia, espaçamento
- Redesign das páginas identificadas na auditoria
- Consistência visual entre todas as páginas
- Mobile-first: touch targets, scroll, navegação bottom-tab
- Estados vazios e de loading com visual adequado

#### Dias 4–10 — Testes
- Vitest: cobrir `core/`, `state/` e `ai/` com testes unitários
- Playwright: fluxos críticos E2E (navegar, adicionar suplemento, checkin)
- Meta: 0 módulos core sem cobertura ao final

#### Dias 8–12 — Infra
- Limpar warnings do build Vite
- CI estável: lint + testes passando no GitHub Actions
- Verificar PWA: service-worker, cache, install prompt

---

## Critérios de Saída

- [ ] Todos os P1s resolvidos
- [ ] UI consistente e aprovada
- [ ] `core/`, `state/` e `ai/` com testes passando
- [ ] CI verde no GitHub
- [ ] Pronto para retomar features (Sprint 23+)

---

## Próximo passo

Após aprovação deste spec: criar plano de implementação detalhado com tarefas executáveis por sprint de trabalho.
