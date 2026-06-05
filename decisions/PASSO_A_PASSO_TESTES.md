# Passo-a-Passo: Testes & Validação — 55 minutos

## ⏱️ Timing Esperado

- **Testes unitários**: 5-10 min
- **Lighthouse audit**: 10-15 min
- **Bundle analysis**: 5 min
- **Real device test**: 15-20 min
- **Validação final**: 5-10 min
- **TOTAL**: ~55 minutos

---

## PASSO 1: Testes Unitários (5-10 min)

### Rodar testes completos
```bash
cd ~/Desktop/suplilist
npm test
```

### O que esperar
```
PASS src/core/meta-manager.test.js (14 tests)
  ✓ updateMeta() sets title and description for home page
  ✓ updateMeta() sets og:title and og:description
  ... (12 more)

PASS src/core/schema-manager.test.js (14 tests)
  ✓ createFAQPageSchema() returns valid FAQPage structure
  ... (13 more)

PASS src/core/virtual-scroller.test.js (13 tests)
  ✓ mount() creates list container
  ... (12 more)

Test Files  7 passed (7)
     Tests  41 passed (41)
  Duration  2.34s
```

### Se falhar
```bash
# Rodar teste específico para debugar
npm test -- src/core/meta-manager.test.js --reporter=verbose

# Mostrar o erro completo
npm test -- --reporter=verbose
```

### ✅ Sucesso
- [ ] 41 testes passam
- [ ] Nenhuma regressão (outros testes ainda passam)
- [ ] Sem warnings ou errors

---

## PASSO 2: Lighthouse Audit (10-15 min)

### Opção A: DevTools (mais rápido)
```
1. npm run dev
2. Abrir Chrome/Edge
3. Navigate to http://localhost:5173
4. DevTools (F12) → Lighthouse
5. Mobile → Analyze page load
```

### Opção B: PageSpeed Insights (mais completo)
```
1. npm run build
2. Deploy para GitHub Pages (se possível)
3. Abrir https://pagespeed.web.dev/
4. Cole URL do site
5. Tab: Mobile
```

### Métricas a Verificar
```
Performance       → 90+  (Critical for mobile)
Accessibility     → 90+  (Touch targets, contrast)
Best Practices    → 90+  (Standards compliance)
SEO              → 100   (Our focus!)
```

### Esperado para Mobile
```
Performance: 75-85 (bom, PWA overhead é normal)
SEO: 100 (nossa implementação)
Accessibility: 85-90 (boa responsividade)
```

### Se Performance < 75
```
Verificar:
- [ ] Images otimizadas?
- [ ] CSS minificado?
- [ ] JavaScript bundle splitting?
- Dica: Usar audit suggestions
```

### ✅ Sucesso
- [ ] Performance 70+
- [ ] SEO 100
- [ ] Accessibility 85+

---

## PASSO 3: Bundle Analysis (5 min)

### Rodar visualizador
```bash
ANALYZE=true npm run build
# Abre automaticamente dist/stats.html
```

### Verificar no stats.html
```
1. Look for novo módulos:
   - meta-manager.js → ~2KB
   - schema-manager.js → ~3KB
   - virtual-scroller.js → ~2KB

2. Verificar tamanho total:
   - Expected: ~50KB gzip
   - Warning: > 60KB gzip

3. Procurar por duplicatas:
   - Nenhum módulo aparece 2x
   - Vendor bem separado
```

### Interpretar cores
```
Vermelho = Maior (pode otimizar)
Laranja = Médio
Amarelo = Pequeno (OK)
```

### ✅ Sucesso
- [ ] Total < 60KB gzip
- [ ] Novos módulos presentes
- [ ] Sem duplicatas

---

## PASSO 4: Real Device Testing (15-20 min)

### Setup
```bash
npm run dev  # Inicia servidor local
# Ou: npm run build && serve docs/
```

### Teste em dispositivos reais
```
iPhone SE (375px) — small phone
  [ ] Sem scroll horizontal
  [ ] Buttons 48x48px mínimo
  [ ] Safe area visible (if notch)
  [ ] Meta tags corretos (DevTools)

Galaxy A (360px) — medium phone
  [ ] Layout adapta bem
  [ ] Keyboard não esconde conteúdo
  [ ] Scroll smooth (60fps)
  [ ] Performance aceitável

iPad (1024px) — tablet
  [ ] Layout desktop renderiza bem
  [ ] Touch targets OK
  [ ] Landscape works
```

### Verificar em Browser
```
1. DevTools → Console (erros?)
2. DevTools → Network (tamanhos OK?)
3. DevTools → Performance (smooth scroll?)
```

### Checklist Prático
```
[ ] Página carrega em < 3s (4G)
[ ] Nenhuma mensagem de erro
[ ] Botões são clicáveis facilmente
[ ] Texto legível sem zoom
[ ] Imagens carregam bem
[ ] Scroll é smooth (sem jank)
```

### ✅ Sucesso
- [ ] Tudo funciona em 2 dispositivos reais
- [ ] Sem erros no console
- [ ] Performance aceitável

---

## PASSO 5: Validação Final (5-10 min)

### Testar Meta Tags (DevTools)
```
1. DevTools → Elements
2. Procurar <head>
3. Verificar:
   [ ] <title> correto
   [ ] <meta name="description">
   [ ] <meta property="og:title">
   [ ] <meta property="og:image">
   [ ] <link rel="canonical">
```

### Testar Schema.org
```
1. Abrir https://validator.schema.org/
2. Cole URL do site ou HTML
3. Verificar:
   [ ] No errors
   [ ] FAQPage schema presente em /faq
   [ ] Estrutura válida
```

### Testar Rich Results
```
1. Google Search Console
2. URL Inspection
3. Verificar se schema detectado
```

### Performance Final
```
1. Chrome DevTools → Lighthouse → Mobile
2. Anotar scores:
   - Performance: ___
   - SEO: ___
   - Accessibility: ___
3. Comparar com antes
```

### ✅ Sucesso
- [ ] Meta tags presentes
- [ ] Schema válido
- [ ] Sem erros estruturais
- [ ] Lighthouse: 90+

---

## RESUMO PÓS-TESTES

### Logs para Registrar
```
DATA: [hoje]
TESTES: ✅ 41/41 passaram
BUNDLE: ~50KB gzip
LIGHTHOUSE Mobile:
  - Performance: 75+
  - SEO: 100
  - Accessibility: 85+
DEVICES:
  - iPhone SE: ✅ OK
  - Galaxy A: ✅ OK
SCHEMA: ✅ Válido
```

### Se tudo ✅
```bash
git add -A
git commit -m "FASE 1-5: Meta tags, Schema, Virtual scrolling, Mobile UX"
git push
# Deploy automático para GitHub Pages
```

### Se houver ❌
```bash
# Identificar problema específico
# Correção targetada
# Re-rodar teste falhado
# Commit apenas quando passar
```

---

## 🆘 Troubleshooting

### Testes falhando
```
Causa: Código novo com sintaxe inválida
Solução:
1. npm test -- --reporter=verbose
2. Procurar por "FAIL"
3. Corrigir sintaxe/import
4. Re-rodar
```

### Lighthouse scores baixos
```
Causa: Imagens grandes, CSS não otimizado
Solução:
1. Verificar aba "Opportunities"
2. Implementar sugestões (se crítico)
3. Re-testar
```

### Bundle > 60KB
```
Causa: Dead code ou duplicatas
Solução:
1. Verificar stats.html
2. Procurar módulos duplicados
3. Tree-shaking issues
4. Contatar para otimização
```

### Schema não válido
```
Causa: JSON-LD malformado
Solução:
1. DevTools → Console
2. Procurar por erros de parsing
3. Verificar quotes/commas
4. Usar schema validator
```

---

## ⏱️ Timeline Recomendada

```
14:00 - 14:10  Testes unitários (npm test)
14:10 - 14:25  Lighthouse audit
14:25 - 14:30  Bundle analysis
14:30 - 14:50  Real device testing
14:50 - 15:00  Validação final
15:00 - Deploy!
```

---

## 📋 Checklist Final

### Antes de Deploy
- [ ] npm test passando (41/41)
- [ ] Lighthouse: 90+ performance
- [ ] Bundle < 60KB gzip
- [ ] Testado em 2+ devices
- [ ] Schema válido
- [ ] Meta tags correctas
- [ ] Sem erros no console
- [ ] Git push done

### Pós-Deploy
- [ ] Monitor analytics
- [ ] Verificar Google Search Console
- [ ] Monitorar performance
- [ ] Recolher feedback de usuários

---

**Status**: Pronto para começar
**Tempo Total**: ~55 minutos
**Outcome**: Produção pronta com confiança ✅

Quer que eu execute os testes agora?
