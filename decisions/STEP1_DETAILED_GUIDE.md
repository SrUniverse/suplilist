# STEP 1: Guia Detalhado - Push Testes & CI/CD

**Status**: 🟢 EM PROGRESSO  
**Início**: 2026-06-02  
**Duração Estimada**: 40-50 minutos

---

## 📋 Resumo Rápido

```
1. Validar localmente (5 min)
2. Fazer commit (2 min)
3. Fazer push (1 min)
4. Acompanhar CI/CD (40 min)
5. Revisar resultados (5 min)
```

---

## ✅ Fase 1: Validação Local (5 minutos)

### 1.1 - Abrir Terminal na Pasta do Projeto
```bash
cd C:\Users\User\Desktop\suplilist
```

### 1.2 - Verificar Status Git
```bash
git status
```

**Esperado**: Deve mostrar algo assim:
```
On branch develop
Your branch is up to date with 'origin/develop'.

Changes not staged for commit:
  (use "git add <file>..." to update the what will be committed)
  (use "git checkout -- <file>..." to discard changes in working directory)
        modified:   .github/workflows/e2e-tests.yml
        modified:   src/core/performance-monitor.js
        modified:   e2e/mobile-ux.spec.ts

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        .../AUDIT_REPORT.md
        .../FIXES_APPLIED.md
        .../FINAL_VALIDATION_CHECKLIST.md
        .../TESTING_HEALTH_CHECK.md
        .../e2e/screenshots/.gitkeep
        .../DEVELOPMENT_ROADMAP.md
        .../STEP1_DETAILED_GUIDE.md
```

✅ **Se viu isso**: Continue  
❌ **Se viu algo diferente**: Avise-me

---

### 1.3 - Verificar Build Local
```bash
npm run build
```

**Esperado**: ✅ Build succeeds without errors

**Saída esperada**:
```
vite v5.4.21 building for production...
✓ 123 modules transformed.
dist/index.html               0.50 kB │ gzip:  0.30 kB
dist/assets/main-xxx.js      250.35 kB │ gzip: 65.23 kB
dist/assets/main-xxx.css       5.12 kB │ gzip:  1.23 kB
```

✅ **Se terminou com sucesso**: Continue  
❌ **Se teve erro**: Avise-me

---

### 1.4 - Verificar Diferenças
```bash
git diff
```

**Esperado**: Deve mostrar apenas as 3 correções:
- Node.js version no CI (18 → 24)
- Environment variables no performance-monitor.js
- Test tags adicionadas

❌ **Se tem mudanças inesperadas**: Avise-me

---

## 📝 Fase 2: Fazer Commit (2 minutos)

### 2.1 - Stage Todos os Arquivos
```bash
git add .
```

### 2.2 - Revisar o que vai ser commitado
```bash
git diff --cached | head -100
```

**Esperado**: Ver as mudanças dos 3 arquivos principais

---

### 2.3 - Fazer o Commit
```bash
git commit -m "fix: critical E2E testing infrastructure issues

- Fix Node.js version mismatch in CI (18 → 24)
- Replace process.env with import.meta.env in performance monitor
- Add @mobile and @accessibility tags to test suites
- Create e2e/screenshots directory for test artifacts

Fixes: Critical issues found in testing audit"
```

**Esperado**:
```
[develop abc1234] fix: critical E2E testing infrastructure issues
 8 files changed, 150 insertions(+), 25 deletions(-)
 create mode 100644 e2e/screenshots/.gitkeep
 ...
```

---

## 🚀 Fase 3: Fazer Push (1 minuto)

### 3.1 - Push para Develop
```bash
git push origin develop
```

**Esperado**:
```
Enumerating objects: 12, done.
Counting objects: 100% (12/12), done.
Delta compression using up to 8 threads
Compressing objects: 100% (8/8), done.
Writing objects: 100% (8/8), 2.34 KiB | 2.34 MiB/s, done.
Total 8 (delta 5), reused 0 (delta 0), reused pack 0
remote: Resolving deltas: 100% (5/5), done.
To github.com:seu-usuario/suplilist.git
   old1234..abc1234  develop -> develop
```

✅ **Push sucesso**: Vá para Fase 4  
❌ **Erro de autenticação**: Pode usar token ou SSH  
❌ **Erro de conflito**: Avise-me

---

## 📊 Fase 4: Acompanhar CI/CD (40 minutos)

### 4.1 - Ir para GitHub Actions
```
https://github.com/seu-usuario/suplilist/actions
```

Ou:
1. Abra GitHub do seu repositório
2. Clique em "Actions" (no topo)
3. Veja o workflow "E2E Tests & Performance Check"

### 4.2 - Acompanhar Progresso
Deve ver algo assim:

```
E2E Tests & Performance Check
├─ e2e-tests (chromium, desktop)
├─ e2e-tests (chromium, mobile)
├─ e2e-tests (firefox, desktop)
├─ e2e-tests (firefox, mobile)
├─ e2e-tests (webkit, desktop)
├─ e2e-tests (webkit, mobile)
├─ performance-check
├─ accessibility-check
└─ report-summary
```

**⏱️ Tempo esperado**: 40-50 minutos

### 4.3 - Sinais de Sucesso ✅
- Todos os jobs ficam verde (✓)
- Build passes
- Testes passam
- Lighthouse scores estão bons (≥90)
- Accessibility checks passam

### 4.4 - Sinais de Problema ❌
- Job fica vermelho (✗)
- Error messages
- Timeouts
- Build falha

---

## 📋 Fase 5: Revisar Resultados (5 minutos)

### 5.1 - Se Tudo Passou ✅

**Parabéns!** Vá para GitHub e:

1. Clique no workflow completo
2. Veja o summary no final
3. Opcional: Baixe os artifacts (screenshots, videos, reports)

**Próximo**: Fazer PR de `develop` para `main`

```bash
# Na branch develop
git pull origin develop  # Puxar mudanças (deve estar já)

# Ir para main
git checkout main
git pull origin main

# Criar branch para PR (opcional)
git checkout -b pr/test-fixes

# Ou direto no GitHub:
# 1. Clique em "Pull requests"
# 2. "New pull request"
# 3. base: main, compare: develop
# 4. Adicione título e descrição
# 5. Crie o PR
```

---

### 5.2 - Se Algo Falhou ❌

**Não pânico!** Vamos debugar:

1. Clique no job que falhou
2. Procure por "Error" ou "FAILED"
3. Leia a mensagem de erro
4. Pode ser:
   - Timeout (aumentar em playwright.config.ts)
   - Dependência faltando (npm issue em CI)
   - Código bug (precisa fix)
   - Ambiente CI específico (difícil de replicar)

**Avise-me o erro e vamos debugar juntos**

---

## 🎯 Checklist de Sucesso

- [ ] `git status` mostrou mudanças esperadas
- [ ] `npm run build` passou
- [ ] `git commit` funcionou
- [ ] `git push` funcionou
- [ ] CI/CD começou a rodar
- [ ] Todos os jobs ficaram verde
- [ ] Lighthouse scores OK
- [ ] Testes passaram
- [ ] PR foi criada (opcional)

---

## ⏱️ Timeline Atual

| Ação | Tempo | Status |
|------|-------|--------|
| Terminal & git status | 1 min | ⏳ Agora |
| npm build | 3 min | ⏳ Próximo |
| git commit | 1 min | ⏳ Depois |
| git push | 1 min | ⏳ Depois |
| CI/CD rodar | 40 min | ⏳ Esperar |
| Review | 5 min | ⏳ Final |
| **Total** | **51 min** | - |

---

## 📞 Se Precisar de Ajuda

Se der erro em qualquer ponto:
1. Copie a mensagem de erro
2. Avise-me qual comando estava rodando
3. Avise-me qual era o output
4. Vamos debugar junto

**Erro comum**: `npm: command not found`  
**Solução**: Verifique se Node.js está instalado: `node --version`

---

## ✨ Próximo Passo Após STEP 1

Quando terminar, vamos para **STEP 2**: Auditoria completa de codebase.

Isso vai gerar:
- `CODEBASE_HEALTH_REPORT.md`
- `CODE_QUALITY_METRICS.md`
- `TECHNICAL_DEBT_AUDIT.md`
- `CURRENT_ARCHITECTURE.md`

---

**Começar agora!** 🚀

Vá para o terminal e rode:

```bash
git status
```

Me avisa quando chegar no CI/CD rodando! 👀
