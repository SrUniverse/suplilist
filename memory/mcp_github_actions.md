---
name: mcp-github-actions-automation
description: GitHub Actions workflow for 24/7 automated MCP monitoring (prices, performance, E2E)
metadata:
  type: project
---

# MCP GitHub Actions Automation

**Status**: ✅ Implementado e pronto para usar

## Arquivos Criados

1. **`.github/workflows/mcp-automation.yml`**
   - 3 jobs: Firecrawl Prices, Chrome DevTools Performance, Playwright E2E
   - Schedule automático (domingo, diariamente, seg-sex)
   - Auto-alertas em falhas

2. **`scripts/firecrawl-monitor.js`**
   - Monitora 5 suplementos em 3 marketplaces
   - Gera `affiliate.config.js` automático
   - Consolidação de preços

3. **`scripts/perf-audit.js`**
   - Mede Core Web Vitals (LCP, INP, CLS)
   - Valida contra targets
   - Exit code 0/1 para CI

4. **`package.json`**
   - Scripts adicionados: `firecrawl:monitor`, `perf:audit`

5. **`GITHUB_ACTIONS_SETUP.md`**
   - Guia passo-a-passo de setup
   - Troubleshooting
   - Customização

## Como Ativar

**3 passos**:
1. Adicionar `FIRECRAWL_API_KEY` em GitHub → Settings → Secrets
2. `git commit -m "chore: add GitHub Actions automation"`
3. `git push`

## Schedule

| Evento | Frequência | Job |
|--------|-----------|-----|
| Preços | Domingo 9am UTC | Firecrawl + commit |
| Performance | Todo dia 6am UTC | Chrome DevTools |
| E2E | Seg-Sex 2pm UTC | Playwright tests |

## Monitorar

```bash
gh workflow run mcp-automation.yml      # Disparar manualmente
gh run list                              # Ver histórico
gh run view <ID> --log                   # Ver detalhes
```

## Alerts

- Falha Firecrawl → Issue `[❌ Firecrawl Price Monitor Failed]`
- Falha Performance → Issue `[⚠️ Performance Regression Detected]`
- Falha E2E → Issue `[❌ E2E Tests Failed]` + artifacts

## Próximos Passos

1. Checar se GitHub Actions está habilitado
2. Adicionar FIRECRAWL_API_KEY ao GitHub
3. Testar com `gh workflow run mcp-automation.yml`
4. Monitorar em GitHub Actions tab
