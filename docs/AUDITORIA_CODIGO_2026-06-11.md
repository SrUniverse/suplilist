# Auditoria de Código e Arquivos — 2026-06-11

## Resumo
Frontend saudável (build OK, ESLint 0 erros). Problemas: 133 erros TS no server, 211 testes falhando (72 frontend + 139 server), 10 vulnerabilidades npm (2 high), dump Redis commitado, código morto.

## CRÍTICO
1. **Server: 133 erros de TypeScript.** Workers órfãos importam módulos inexistentes: `server/src/workers/affiliate.worker.ts` e `price-monitor.worker.ts` (faltam `../queue/affiliate.queue`, `../services/deduplication.service`, `../services/filtering.service`, `../services/price-monitor.service`). Erros reais de tipo: `server/src/shared/utils/metrics.ts:242` e `metrics-cache.extension.ts:271` (Promise<string> → string), `server/src/validators/affiliate.validator.ts:66,83`.
2. **139 testes do server falhando (36/46 arquivos).** Falhas reais de asserção em payment.service.test.ts (idempotência, retry Retry-After, validação de webhook) — código de pagamento, prioridade alta.
3. **`server/dump.rdb` commitado no git.** Remover e adicionar `*.rdb` ao .gitignore.

## ALTO
4. **72 testes do frontend falhando (13/81 arquivos)** — `auth/invalid-api-key`: setup de teste inicializa Firebase real sem mock.
5. **10 vulnerabilidades npm (8 moderate, 2 high)** — cadeia firebase-admin → @google-cloud/storage → retry-request/teeny-request. `npm audit fix` / atualizar firebase-admin.

## MÉDIO
6. **Código morto não referenciado**: `backend/` (16 arquivos), `src/monetization/`, `src/platform/` na raiz, `js/` vazio. Workspaces são só frontend/server/shared.
7. **Arquivos-lixo untracked em `frontend/`**: `'{}'`, `8`, `true)`, `{`, `{,`, `Object.keys(store)[index]`, `Promise.resolve({`, `new`, etc. Deletar.
8. **Arquivos >800 linhas**: list-page.js (2002), state-manager.js (1324), history-page.js (1207), evidence-tier.js (910), profile-page.js (867), home-page.js (853), storage-manager.js (840).

## BAIXO
9. ESLint: 21 warnings (vars não usadas, prefixar com `_`).
10. 10 `console.log` em código de produção do frontend.
11. Segredos: OK em código tracked; `.env.production` só tem config pública Firebase. Pendência externa: rotacionar chave Firecrawl vazada.

## Ordem sugerida
1. Remover dump.rdb + rotacionar Firecrawl
2. Corrigir/remover workers órfãos, zerar erros TS server
3. Investigar testes de pagamento
4. Mockar Firebase nos testes frontend
5. npm audit fix / firebase-admin
6. Limpeza de código morto e lixo
