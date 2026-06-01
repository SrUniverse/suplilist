# MCP Quick Automation — Copy & Paste Templates

Implementar automação dos MCPs em menos de 5 minutos. Escolha uma estratégia abaixo.

---

## 🚀 Opção 1: CronCreate (Mais Simples)

Copia e cola no Claude Code. Roda em horários específicos.

### Template 1: Monitorar Preços Todo Domingo

```bash
# No Claude Code, copiar e executar:

create_scheduled_task(
  {
    taskId: 'suplilist-weekly-prices',
    description: 'Monitor supplement prices on all marketplaces',
    cronExpression: '0 9 * * 0',  # Domingo 9am
    prompt: `
Use Firecrawl MCP to monitor prices for:
- Creatina Monohidratada
- Whey Protein
- Vitamina D3
- Ômega 3
- Magnésio Bisglicinato

For each supplement, scrape from:
1. Shopee: https://shopee.com.br/search?keyword=...
2. Mercado Livre: https://mercadolivre.com.br/search?q=...
3. Amazon: https://amazon.com.br/s?k=...

Extract: Brand, Price (R$), URL, Availability
Compare with previous week and alert if changed > 20%
Return consolidated JSON
    `,
    notifyOnCompletion: true
  }
)
```

### Template 2: Validar Performance Todo Dia

```bash
create_scheduled_task(
  {
    taskId: 'suplilist-daily-perf',
    description: 'Daily Core Web Vitals audit',
    cronExpression: '0 6 * * *',  # Todo dia 6am
    prompt: `
Use Chrome DevTools MCP to measure:
1. LCP (target < 2.5s)
2. INP (target < 200ms)
3. CLS (target < 0.1)

For http://localhost:5173

Report JSON:
{
  "lcp": 2.1,
  "inp": 150,
  "cls": 0.05,
  "all_passed": true,
  "timestamp": "2024-06-01"
}

If any metric fails, alert me.
    `,
    notifyOnCompletion: true
  }
)
```

### Template 3: Testar E2E Todo Dia

```bash
create_scheduled_task(
  {
    taskId: 'suplilist-daily-e2e',
    description: 'Daily E2E tests of critical flows',
    cronExpression: '0 14 * * 1-5',  # Seg-Sex 2pm
    prompt: `
Use Playwright MCP to test http://localhost:5173:

Critical flows:
1. Homepage loads without errors
2. Search works: type "creatina", see results
3. Recommendations: fill 75kg, cutting, R$300, get stack
4. Details: click first recommendation, modal opens
5. Navigation: test Tab navigation with keyboard

Report:
- Which flows passed/failed
- Screenshots of failures
- Console errors if any

All must pass.
    `,
    notifyOnCompletion: true
  }
)
```

---

## 🔧 Opção 2: GitHub Actions (Mais Robusto)

Rodar automáticamente no CI/CD. Melhor para produção.

### Passo 1: Criar arquivo workflow

**File: `.github/workflows/mcp-automation.yml`**

```yaml
name: MCP Automation

on:
  schedule:
    - cron: '0 9 * * 0'    # Preços: domingo 9am
    - cron: '0 6 * * *'    # Performance: todo dia 6am
    - cron: '0 14 * * 1-5' # E2E: seg-sex 2pm
  workflow_dispatch: ~

jobs:
  mcp-automation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      
      - name: Identify job type
        id: job
        run: |
          HOUR=$(date -u +%H)
          if [ "$HOUR" = "09" ]; then
            echo "type=prices" >> $GITHUB_OUTPUT
          elif [ "$HOUR" = "06" ]; then
            echo "type=performance" >> $GITHUB_OUTPUT
          else
            echo "type=e2e" >> $GITHUB_OUTPUT
          fi

      - name: Run Firecrawl price monitor
        if: steps.job.outputs.type == 'prices'
        env:
          FIRECRAWL_API_KEY: ${{ secrets.FIRECRAWL_API_KEY }}
        run: |
          npm run firecrawl:prices

      - name: Run performance audit
        if: steps.job.outputs.type == 'performance'
        run: |
          npm run perf:audit

      - name: Run E2E tests
        if: steps.job.outputs.type == 'e2e'
        run: |
          npm install
          npm run dev &
          sleep 5
          npm run test:e2e

      - name: Commit changes
        if: steps.job.outputs.type == 'prices'
        run: |
          git config user.name "MCP Bot"
          git config user.email "bot@suplilist.com"
          git add src/monetization/affiliate.config.js
          git diff --cached --exit-code || (
            git commit -m "chore: update supplement prices"
            git push
          )

      - name: Alert on failure
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            const jobType = '${{ steps.job.outputs.type }}'
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `❌ MCP ${jobType} automation failed`,
              body: `Check workflow run: ${context.server_url}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`
            })
```

### Passo 2: Adicionar secrets

```bash
# GitHub: Settings → Secrets → New secret

# Adicionar:
FIRECRAWL_API_KEY=fc-b8dc5832f0c94788bb177acfbbc07199
```

### Passo 3: Testar

```bash
# Rodar workflow manualmente
gh workflow run mcp-automation.yml

# Ver logs
gh run list
gh run view <RUN_ID> --log
```

---

## ⚙️ Opção 3: Claude Code Scheduled Tasks

Integrado ao Claude Code. Interface mais fácil.

### Setup em 2 Passos

**Passo 1**: No Claude Code, clicar em "Schedule" ou usar o comando:

```bash
/schedule create --weekly --sunday --9am "Monitor supplement prices using Firecrawl MCP and update affiliate config"
```

**Passo 2**: Configure os detalhes na UI de scheduling

---

## 📋 Matriz Rápida

| Opção | Setup Time | Frequência | Best For |
|-------|-----------|-----------|----------|
| **CronCreate** | 2 min | Horários fixos | Simples, debugging |
| **GitHub Actions** | 5 min | Schedule + triggers | Produção, CI/CD |
| **Claude Scheduled** | 1 min | UI-driven | Prototipagem |

---

## Exemplo Real: Implementar Tudo em 5 Min

### Minuto 1-2: Secrets
```bash
# GitHub Settings → Secrets
FIRECRAWL_API_KEY=fc-...
```

### Minuto 2-4: Workflow
```bash
# Copiar .github/workflows/mcp-automation.yml (template acima)
git add .github
```

### Minuto 4-5: Commit
```bash
git commit -m "chore: add MCP automation"
git push
```

### Minuto 5+: Rodando!
```bash
# GitHub Actions rodando automaticamente conforme schedule
```

---

## ✅ Verificar se Está Funcionando

```bash
# Ver tasks agendadas
gh workflow list
gh run list

# Ver últimas execuções
gh run view --latest

# Ver logs de sucesso/falha
gh run view <RUN_ID> --log
```

---

## 🚨 Troubleshooting Rápido

| Erro | Fix |
|------|-----|
| Workflow não roda | Verificar cron syntax em https://crontab.guru |
| API key invalid | Verificar FIRECRAWL_API_KEY no GitHub Secrets |
| Tests falham | Rodar manualmente: `npm test` |
| Prices não atualizam | Verificar se Firecrawl consegue scrape (banido?) |

---

## 🎯 Próximo Passo

Escolher **UMA** opção acima:

1. **CronCreate** → Copiar templates, rodar no Claude Code
2. **GitHub Actions** → Criar arquivo workflow, commit, rodar
3. **Claude Scheduled** → Usar UI de scheduling

Que tal começar com **CronCreate** (mais simples)?

```bash
# No Claude Code:
/schedule create --daily --6am "Measure Core Web Vitals and alert if degraded"
```

**Done!** ✨
