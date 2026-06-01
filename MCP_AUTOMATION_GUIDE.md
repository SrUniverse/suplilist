# MCP Automation Guide — 4 Estratégias

Como usar os 4 MCPs automaticamente sem intervenção manual, em diferentes cenários.

---

## 1️⃣ Tarefas Recorrentes (CronCreate)

Para rodar prompts **em horários específicos** (ex: segunda 9am, todo dia 8am, etc).

### Exemplo: Monitorar Preços Todo Domingo

```bash
# No Claude Code, executar:
create_scheduled_task(
  taskId: 'weekly-price-check',
  description: 'Monitor supplement prices on Shopee, ML, Amazon',
  cronExpression: '0 9 * * 0',  # Domingo 9am
  prompt: `
Use Firecrawl MCP to check prices:
1. Search for top 5 supplements: creatina, whey, vitamina d3, omega3, magnesio
2. For each, get prices from:
   - Shopee: https://shopee.com.br/search?keyword=...
   - Mercado Livre: https://mercadolivre.com.br/search?q=...
   - Amazon: https://amazon.com.br/s?k=...
3. Compare and identify best deals
4. Alert if price changed > 20% from last week
5. Return consolidated JSON
  `,
  notifyOnCompletion: true
)
```

### Exemplo: Performance Check Diário

```bash
create_scheduled_task(
  taskId: 'daily-performance-audit',
  description: 'Measure Core Web Vitals daily',
  cronExpression: '0 6 * * *',  # Todos os dias 6am
  prompt: `
Use Chrome DevTools MCP:
1. Measure: LCP, INP, CLS for http://localhost:5173
2. Compare against targets:
   - LCP < 2.5s
   - INP < 200ms
   - CLS < 0.1
3. If any metric exceeds target, alert
4. Report: Pass/Fail with values
  `,
  notifyOnCompletion: true
)
```

### Exemplo: Testar E2E Todo Deploy

```bash
create_scheduled_task(
  taskId: 'post-deploy-e2e-tests',
  description: 'Run E2E tests after deployment',
  cronExpression: '0 13 * * 1-5',  # Segunda-sexta 1pm
  prompt: `
Use Playwright MCP to validate post-deploy:
1. Navigate to http://localhost:5173
2. Test critical flows:
   - Load homepage and verify no errors
   - Search for "creatina" and click result
   - Go to recommendations, fill profile (75kg, cutting, 300)
   - Get recommendations and click first
   - Verify modal opens
3. Take screenshots
4. Report: All critical flows working?
  `,
  notifyOnCompletion: true
)
```

---

## 2️⃣ GitHub Actions (CI/CD Pipeline)

Para integrar MCPs ao seu **pipeline de deployment**, rodando em cada push/schedule.

### Setup: 3 Passos

#### Passo 1: Configurar Secrets

```bash
# No GitHub: Settings → Secrets → New secret

FIRECRAWL_API_KEY = FIRECRAWL_KEY_REMOVED
CLAUDE_CODE_API_KEY = seu_api_key_aqui
```

#### Passo 2: Criar Workflow YAML

**File: `.github/workflows/mcp-automation.yml`**

```yaml
name: MCP Automation Pipeline

on:
  schedule:
    # Preços: toda segunda 9am
    - cron: '0 9 * * 1'
    # Performance: todo dia 6am
    - cron: '0 6 * * *'
    # E2E: diariamente 2pm
    - cron: '0 14 * * *'
  workflow_dispatch:  # Manual trigger

jobs:
  firecrawl-prices:
    runs-on: ubuntu-latest
    if: github.event.schedule == '0 9 * * 1' || github.event_name == 'workflow_dispatch'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      
      - name: Update prices with Firecrawl
        env:
          FIRECRAWL_API_KEY: ${{ secrets.FIRECRAWL_API_KEY }}
        run: |
          npm run firecrawl:prices

      - name: Commit price updates
        run: |
          git config user.name "MCP Bot"
          git config user.email "bot@suplilist.com"
          git add src/monetization/affiliate.config.js
          git diff --cached --exit-code || (
            git commit -m "chore: update supplement prices via Firecrawl"
            git push
          )

  chrome-devtools-perf:
    runs-on: ubuntu-latest
    if: github.event.schedule == '0 6 * * *' || github.event_name == 'workflow_dispatch'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4

      - name: Start dev server
        run: npm run dev &
        
      - name: Wait for server
        run: sleep 5

      - name: Performance audit with Chrome DevTools
        env:
          CHROME_DEV_TOOLS_API_KEY: ${{ secrets.CHROME_DEV_TOOLS_API_KEY }}
        run: |
          npm run scripts/perf-audit.js

      - name: Comment on PR if performance degraded
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '⚠️ Performance regression detected! Check CI logs.'
            })

  playwright-e2e:
    runs-on: ubuntu-latest
    if: github.event.schedule == '0 14 * * *' || github.event_name == 'workflow_dispatch'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4

      - name: Install dependencies
        run: npm install

      - name: Start dev server
        run: npm run dev &
        
      - name: Run E2E tests with Playwright
        run: |
          npx playwright test tests/e2e/critical-flows.spec.js

      - name: Upload test artifacts
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

      - name: Alert if E2E failed
        if: failure()
        run: |
          echo "❌ E2E tests failed!"
          # Send notification (webhook, email, etc)
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -H 'Content-Type: application/json' \
            -d '{"text": "❌ SupliList E2E tests failed"}'
```

#### Passo 3: Scripts de Suporte

**File: `scripts/perf-audit.js`**

```javascript
#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('📊 Running performance audit...');

try {
  // Use Chrome DevTools MCP to measure
  const perfReport = execSync(`
    npx claude-code run --prompt "
    Use Chrome DevTools MCP:
    1. Measure LCP, INP, CLS for http://localhost:5173
    2. Report JSON with metrics and status (PASS/FAIL)
    "
  `, { encoding: 'utf8' });

  const metrics = JSON.parse(perfReport);
  
  // Check thresholds
  const passed = 
    metrics.lcp < 2.5 &&
    metrics.inp < 200 &&
    metrics.cls < 0.1;

  if (!passed) {
    console.error('❌ Performance targets not met:');
    console.error(`   LCP: ${metrics.lcp}s (target: < 2.5s)`);
    console.error(`   INP: ${metrics.inp}ms (target: < 200ms)`);
    console.error(`   CLS: ${metrics.cls} (target: < 0.1)`);
    process.exit(1);
  }

  console.log('✅ All performance targets met!');
} catch (error) {
  console.error('Perf audit failed:', error.message);
  process.exit(1);
}
```

**File: `package.json` (adicionar scripts)**

```json
{
  "scripts": {
    "firecrawl:prices": "node scripts/firecrawl-prices.js",
    "perf:audit": "node scripts/perf-audit.js"
  }
}
```

---

## 3️⃣ Hooks Automáticos (Código)

Para executar MCPs **automaticamente ao salvar código** ou fazer commit.

### Hook 1: Verificar Performance ao Salvar

**File: `.claude/settings.json`**

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "command": "npm run perf:audit 2>&1 || true",
        "description": "Quick perf check after code changes"
      }
    ]
  }
}
```

### Hook 2: Rodar E2E Antes de Commit

**File: `.husky/pre-commit`**

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🧪 Running E2E tests..."
npx playwright test tests/e2e/critical-flows.spec.js

if [ $? -ne 0 ]; then
  echo "❌ E2E tests failed - commit aborted"
  exit 1
fi

echo "✅ E2E tests passed - proceeding with commit"
```

---

## 4️⃣ Workflows Multi-Agent (Orquestração)

Para tarefas **complexas que envolvem múltiplos MCPs** rodando juntos.

### Exemplo: Validação Completa Pré-Deploy

```javascript
// Salvar em: scripts/complete-validation-workflow.js

import { spawn } from 'child_process';

async function runValidation() {
  console.log('🔍 Starting complete validation workflow...\n');

  // Fase 1: SupliList + Firecrawl (paralelo)
  console.log('Fase 1: Validar recomendações + preços');
  const [recs, prices] = await Promise.all([
    runMCP('SupliList', 'recommend_stack', {
      objective: 'bulk',
      weight: 75,
      budget: 300
    }),
    runMCP('Firecrawl', 'scrape', {
      urls: [
        'https://shopee.com.br/search?keyword=creatina',
        'https://mercadolivre.com.br/search?q=whey'
      ]
    })
  ]);

  // Fase 2: Chrome DevTools (performance)
  console.log('\nFase 2: Validar performance');
  const perf = await runMCP('Chrome DevTools', 'measure', {
    url: 'http://localhost:5173',
    metrics: ['lcp', 'inp', 'cls']
  });

  if (perf.lcp > 2.5 || perf.inp > 200 || perf.cls > 0.1) {
    throw new Error('❌ Performance targets not met!');
  }

  // Fase 3: Playwright (E2E)
  console.log('\nFase 3: Validar fluxos críticos');
  const e2e = await runMCP('Playwright', 'test', {
    flows: ['load', 'search', 'recommend', 'checkout']
  });

  if (!e2e.passed) {
    throw new Error('❌ E2E tests failed!');
  }

  console.log('\n✅ All validations passed! Ready to deploy.');
  return { recs, prices, perf, e2e };
}

runValidation()
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
```

---

## Matriz de Automação

Quando usar cada estratégia:

| Estratégia | Use Quando | Frequência | Exemplo |
|-----------|-----------|-----------|---------|
| **CronCreate** | Task simples, recorrente | Horário fixo | Monitorar preços todo domingo |
| **GitHub Actions** | Parte do CI/CD pipeline | Por schedule ou trigger | Deploy + E2E tests |
| **Hooks** | Ao salvar/committar código | Contínuo | Perf check ao salvar |
| **Workflows** | Validação completa multi-MCP | Sob demanda | Validação pré-deploy |

---

## Exemplo Completo: Setup Automatizado

### Dia 1: Configurar Automação

```bash
# 1. GitHub Actions
mkdir -p .github/workflows
# Copiar .github/workflows/mcp-automation.yml (vide acima)

# 2. Scripts de suporte
mkdir -p scripts
# Criar scripts/firecrawl-prices.js
# Criar scripts/perf-audit.js

# 3. Husky hooks
npx husky install
# Criar .husky/pre-commit

# 4. CronCreate tasks
# No Claude Code, rodar create_scheduled_task() (vide acima)

# Commit tudo
git add .github scripts .husky package.json
git commit -m "chore: setup MCP automation pipeline"
git push
```

### Dia 2+: Automação Rodando

- **Segunda 9am**: Preços atualizados via GitHub Actions
- **Todo dia 6am**: Performance auditado
- **Todo dia 2pm**: E2E tests rodados
- **Ao salvar**: Perf check automático via hooks
- **Pré-deploy**: Workflow completo via `/deploy` command

---

## Monitoramento

Ver o que está rodando:

```bash
# GitHub Actions
gh workflow list
gh run list

# CronCreate tasks
# No Claude Code: list_scheduled_tasks()

# Hooks executed
# Verificar .claude/hook-executions.log
```

---

## Troubleshooting

| Problema | Solução |
|----------|---------|
| Task não roda | Verificar cronExpression, timezones |
| GitHub Actions falha | Ver logs em Actions tab |
| Hooks interferem | Usar `|| true` para não bloquear |
| API key expirada | Renovar em GitHub Secrets |

---

## Próximos Passos

1. **Choose strategy**: CronCreate (simples) ou GitHub Actions (completo)
2. **Setup secrets**: FIRECRAWL_API_KEY, etc
3. **Copy templates**: YAML, scripts
4. **Test manual**: `gh workflow run mcp-automation.yml`
5. **Monitor**: Ver se roda conforme esperado
6. **Refine**: Ajustar frequência/thresholds
7. **Scale**: Adicionar mais validações

---

**🎯 Resultado**: Seus MCPs rodando 24/7 sem você fazer nada! ✨
