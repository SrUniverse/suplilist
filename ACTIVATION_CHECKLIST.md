# 🚀 Activation Checklist — Ative em 5 Minutos

Siga este checklist para ativar a automação dos MCPs.

---

## ✅ PRÉ-REQUISITOS

- [ ] Você tem acesso ao repositório GitHub
- [ ] `git` está funcionando
- [ ] `gh` (GitHub CLI) está instalado (`gh --version`)

---

## 🔐 PASSO 1: Adicionar Secret (2 minutos)

**No GitHub (web)**:

- [ ] Abrir: https://github.com/[seu-usuario]/suplilist/settings/secrets/actions
- [ ] Clique: **New repository secret**
- [ ] Nome: `FIRECRAWL_API_KEY`
- [ ] Valor: `FIRECRAWL_KEY_REMOVED`
- [ ] Clique: **Add secret**

**Verifying**:
```bash
# Você NÃO pode ver o valor (seguro), mas pode verificar existência:
gh secret list
# Output: FIRECRAWL_API_KEY    ****  Updated 2024-06-02
```

✅ **Secret adicionado!**

---

## 📂 PASSO 2: Verificar Arquivos (1 minuto)

**No seu computador**:

```bash
cd ~/Desktop/suplilist

# Verificar se todos os arquivos estão presentes:
ls -la .github/workflows/mcp-automation.yml
ls -la scripts/firecrawl-monitor.js
ls -la scripts/perf-audit.js

# Output esperado: arquivo existe
# Tudo ok? → Próximo passo
```

- [ ] `.github/workflows/mcp-automation.yml` ✅ existe
- [ ] `scripts/firecrawl-monitor.js` ✅ existe
- [ ] `scripts/perf-audit.js` ✅ existe
- [ ] `package.json` atualizado com scripts ✅

---

## 📝 PASSO 3: Fazer Commit (1 minuto)

```bash
# Entrar no diretório
cd ~/Desktop/suplilist

# Verificar status
git status

# Você deve ver:
#   modified:   package.json
#   new file:   .github/workflows/mcp-automation.yml
#   new file:   scripts/firecrawl-monitor.js
#   new file:   scripts/perf-audit.js

# Adicionar tudo
git add .

# Commit com mensagem descritiva
git commit -m "chore: add GitHub Actions MCP automation

- Firecrawl: monitor preços Shopee, Mercado Livre, Amazon
- Chrome DevTools: auditoria de performance diária
- Playwright: E2E tests de fluxos críticos
- Schedule: domingo 9am, diariamente 6am, seg-sex 2pm (UTC)"

# Push para GitHub
git push origin main
```

- [ ] Commit criado ✅
- [ ] Push concluído ✅

**Verificar**:
```bash
git log --oneline | head -1
# Deve mostrar: chore: add GitHub Actions MCP automation
```

---

## 🚀 PASSO 4: Ativar Workflows (1 minuto)

**No GitHub (web)**:

- [ ] Ir para: https://github.com/[seu-usuario]/suplilist/actions
- [ ] Procurar: **MCP Automation Pipeline**
- [ ] Se desativado, clicar: **Enable workflows**
- [ ] Se já ativado ✅, continuar

**Verifying**:
```bash
gh workflow list

# Output esperado:
# MCP Automation Pipeline    .github/workflows/mcp-automation.yml  active
```

- [ ] Workflow ativado ✅

---

## 🧪 PASSO 5: Testar Manualmente (2 minutos)

**No terminal**:

```bash
# Disparar workflow manualmente
gh workflow run mcp-automation.yml

# Output:
# ✓ Created workflow_dispatch event for mcp-automation.yml at main
# To track this run, visit: [URL]

# Aguardar 2-3 minutos e verificar
sleep 180

# Ver status
gh run list --limit 5

# Você deve ver algo como:
# 1234567   MCP Automation  main     completed  ✓

# Ver detalhes
gh run view 1234567

# Se tudo verde ✅:
# Workflow completed successfully ✅
```

- [ ] Workflow disparado ✅
- [ ] Execução completada ✅
- [ ] Logs mostram sucesso ✅

---

## 📊 PASSO 6: Verificar Resultados (1 minuto)

**Resultado esperado** após testar:

Você deve ver na saída:
```
✅ MCP Automation Pipeline Completed
Job Type: prices (ou performance, ou e2e)
✅ All jobs completed successfully!
```

Se viu sucesso → Parabéns! ✅

---

## 🔄 PASSO 7: Schedule Automático

**Seu sistema agora roda automaticamente:**

| Dia | Hora | Tarefa |
|-----|------|--------|
| Domingo | 9am UTC | Firecrawl prices |
| Todo dia | 6am UTC | Chrome DevTools perf |
| Seg-Sex | 2pm UTC | Playwright E2E |

- [ ] Entendi o schedule ✅

---

## 🚨 PASSO 8: Monitorar Alertas

**Quando houver falha**, você receberá:
- Email do GitHub (Issue criada)
- Issue no repositório com tag `bot:automation`

```bash
# Ver issues criadas por automação
gh issue list --label bot:automation

# Output:
# #123  ⚠️ Performance Regression Detected  
# #122  ❌ E2E Tests Failed
# #121  ❌ Firecrawl Price Monitor Failed
```

- [ ] Entendi sistema de alertas ✅

---

## ✅ CHECKLIST FINAL

- [ ] Secret `FIRECRAWL_API_KEY` adicionado ✅
- [ ] Arquivos presentes: `.github/`, `scripts/`, `package.json` ✅
- [ ] Commit feito e pushed ✅
- [ ] Workflows ativado no GitHub ✅
- [ ] Teste manual executado com sucesso ✅
- [ ] Schedule automático ativado ✅
- [ ] Sistema de alertas entendido ✅

**✅ Tudo pronto! Automação ativada com sucesso!**

---

## 🎯 O que Agora Roda Automaticamente

- ✅ Preços monitorados **todo domingo 9am**
- ✅ Performance auditada **todo dia 6am**
- ✅ Testes E2E rodados **seg-sex 2pm**
- ✅ Commits automáticos quando preços mudam
- ✅ Issues criadas automaticamente se falhar
- ✅ Zero manutenção!

---

## 📚 Documentação Disponível

Se precisar de help:

1. **Setup Detalhado**: `GITHUB_ACTIONS_SETUP.md`
2. **Automação Flow**: `AUTOMATION_FLOW.md`
3. **Troubleshooting**: `GITHUB_ACTIONS_SETUP.md` (seção 🆘)
4. **Guias Gerais**: `MCP_AUTOMATION_GUIDE.md`, `MCP_QUICK_AUTOMATION.md`

---

## 🎉 Parabéns!

Seus MCPs estão agora rodando **24/7 automaticamente**!

Você não precisa fazer mais nada. Apenas monitore ocasionalmente em GitHub → Actions.

**Próximo step** (opcional): Customizar schedule ou adicionar mais suplementos/marketplaces.

---

**Data de ativação**: __________________
**Testado com sucesso**: __________________
