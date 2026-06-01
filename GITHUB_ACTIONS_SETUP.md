# GitHub Actions MCP Automation — Setup Guide

Implementação do **melhor strategy**: GitHub Actions para automação 24/7 dos MCPs.

---

## 📋 O que você vai ter

✅ **Monitoramento de Preços** — Todo domingo 9am (UTC)
- Scrape automático: Shopee, Mercado Livre, Amazon
- Atualiza `affiliate.config.js`
- Commit automático

✅ **Auditoria de Performance** — Todo dia 6am (UTC)
- Mede: LCP, INP, CLS
- Alerta se degradar

✅ **Testes E2E** — Segunda a sexta 2pm (UTC)
- Testa fluxos críticos
- Falha = Issue automática

---

## 🚀 Setup em 3 Passos

### Passo 1: Adicionar Secrets no GitHub

1. Vá em: **GitHub → seu repo → Settings → Secrets and variables → Actions**
2. Clique **New repository secret**
3. Adicione:
   ```
   Nome: FIRECRAWL_API_KEY
   Valor: fc-b8dc5832f0c94788bb177acfbbc07199
   ```
4. ✅ Salve

**Pronto!** O workflow já está pronto em `.github/workflows/mcp-automation.yml`

### Passo 2: Fazer Commit do Código

```bash
# Os arquivos já foram criados:
# - .github/workflows/mcp-automation.yml
# - scripts/firecrawl-monitor.js
# - scripts/perf-audit.js

git status
git add .github scripts package.json
git commit -m "chore: add GitHub Actions MCP automation"
git push
```

### Passo 3: Ativar Workflows (se desativado)

No GitHub:
1. **Actions tab** → **MCP Automation Pipeline**
2. Se desabilitado, clique **Enable workflows**
3. ✅ Workflows agora rodam conforme schedule

---

## ⏰ Schedule (UTC)

| Dia/Hora | Job | O que faz |
|----------|-----|----------|
| **Domingo 9am** | `firecrawl-prices` | Monitora preços, atualiza affiliate.config.js |
| **Todo dia 6am** | `chrome-devtools-perf` | Mede Core Web Vitals |
| **Seg-Sex 2pm** | `playwright-e2e` | Testa fluxos críticos |

**Nota**: Horários em UTC. Para convertir para seu timezone:
- Brasil: **UTC-3** (subtract 3 horas)
  - Domingo 9am UTC = Domingo 6am Brasília
  - 6am UTC = 3am Brasília
  - 2pm UTC = 11am Brasília

---

## 🧪 Testar Manualmente

### Opção 1: Disparar Workflow

```bash
gh workflow run mcp-automation.yml
```

### Opção 2: Verificar Histórico

```bash
# Ver runs
gh run list

# Ver detalhes de um run
gh run view <RUN_ID> --log

# Ver status de um job específico
gh workflow view mcp-automation.yml
```

---

## 📊 Monitorar Execuções

### No GitHub

1. **Actions tab**
2. **MCP Automation Pipeline**
3. Clique em um run para ver logs completos

### Via CLI

```bash
# Listar últimas execuções
gh run list --limit 10

# Ver logs de sucesso
gh run view <RUN_ID> --log | grep "✅"

# Ver alertas/falhas
gh run view <RUN_ID> --log | grep "❌"
```

---

## 🔧 Customizar Schedule

Edite `.github/workflows/mcp-automation.yml`:

```yaml
on:
  schedule:
    # Mudar "Preços: Domingo 9am" para outro horário
    - cron: '0 9 * * 0'    # 0 = Domingo, 9 = 9am
    
    # Mudar "Performance: Todo dia 6am"
    - cron: '0 6 * * *'    # * = todos os dias, 6 = 6am
    
    # Mudar "E2E: Seg-Sex 2pm"
    - cron: '0 14 * * 1-5' # 1-5 = Seg-Sex, 14 = 2pm (14h)
```

**Cron syntax**: `minute hour day-of-month month day-of-week`

Validar em: https://crontab.guru/

---

## 📝 O que cada job faz

### 1️⃣ Firecrawl Prices

**Trigger**: Domingo 9am UTC

**Ações**:
1. ✅ Checkout do código
2. ✅ Setup Node.js 24
3. ✅ Roda `npm run firecrawl:monitor`
   - Scrape: Creatina, Whey, Vitamina D3, Ômega 3, Magnésio
   - Mercados: Shopee, Mercado Livre, Amazon
4. ✅ Gera `src/monetization/affiliate.config.js`
5. ✅ Commit automático (`chore: update supplement prices`)
6. ✅ Push para main

**Falha?** Issue criada automaticamente com `labels: ['bot:automation', 'priority:high']`

### 2️⃣ Chrome DevTools Performance

**Trigger**: Todo dia 6am UTC

**Ações**:
1. ✅ Checkout
2. ✅ Start dev server (`npm run dev`)
3. ✅ Roda `npm run perf:audit`
   - Mede: LCP (target: <2.5s), INP (target: <200ms), CLS (target: <0.1)
4. ✅ Valida contra targets
5. ✅ Stop server

**Falha?** Issue: "⚠️ Performance Regression Detected"

### 3️⃣ Playwright E2E

**Trigger**: Seg-Sex 2pm UTC

**Ações**:
1. ✅ Checkout
2. ✅ Install Playwright browsers
3. ✅ Start dev server
4. ✅ Roda E2E tests
5. ✅ Upload artifacts (playwright-report)
6. ✅ Stop server

**Falha?** Issue: "❌ E2E Tests Failed" + artifacts para debug

---

## 🆘 Troubleshooting

| Problema | Solução |
|----------|---------|
| Workflow não aparece | Refresh Actions tab, ou esperar 1-2 min |
| Cron não dispara | Validar syntax em https://crontab.guru |
| Secret inválido | Ver GitHub → Settings → Secrets, copiar valor correto |
| Script não encontrado | Ver se `.github/workflows/mcp-automation.yml` existe |
| Dev server não inicia | Aumentar sleep no workflow (5s → 10s) |
| Tests falham | Rodar `npm run dev` localmente e testar |

---

## 📈 Escalando a Automação

### Adicionar mais suplementos

Edit `scripts/firecrawl-monitor.js`:

```javascript
const SUPPLEMENTS = [
  // ... adicionar:
  { id: 'bcaa', name: 'BCAA', keywords: 'bcaa' },
  { id: 'creatina-hcl', name: 'Creatina HCL', keywords: 'creatina hcl' },
];
```

### Adicionar mais marketplaces

```javascript
const MARKETPLACES = [
  // ... adicionar:
  { name: 'B2Run', id: 'b2run', url: (q) => `https://b2run.com.br/search?q=${encodeURIComponent(q)}` },
];
```

### Adicionar notificações (Slack, Email, etc)

No workflow, adicione após um job:

```yaml
- name: Notify Slack on success
  if: success()
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
      -H 'Content-Type: application/json' \
      -d '{"text":"✅ MCP automation completed"}'
```

---

## ✅ Verificação Final

Você tem tudo pronto quando:

- [ ] Secrets adicionadas no GitHub (`FIRECRAWL_API_KEY`)
- [ ] `.github/workflows/mcp-automation.yml` existe
- [ ] `scripts/firecrawl-monitor.js` existe
- [ ] `scripts/perf-audit.js` existe
- [ ] `package.json` tem `"firecrawl:monitor"` e `"perf:audit"` scripts
- [ ] Commit feito e pushed
- [ ] Workflows ativadas no GitHub (Actions tab)

---

## 🎯 Próximo: Testar Tudo

```bash
# 1. Testar workflow manualmente
gh workflow run mcp-automation.yml

# 2. Esperar 2-3 min
sleep 180

# 3. Ver resultado
gh run list
gh run view <RUN_ID> --log

# 4. Se tudo OK:
echo "✅ MCP automation ready for 24/7!"
```

---

**🎉 Pronto! Seus MCPs rodando 24/7 automaticamente!**

- ✅ Preços monitorados todo domingo
- ✅ Performance auditada todo dia
- ✅ Testes E2E rodados diariamente
- ✅ Alertas automáticos em falhas
- ✅ Zero manutenção manual

**Dúvidas?** Cheque `.github/workflows/mcp-automation.yml` ou execute `gh run view <RUN_ID> --log`
