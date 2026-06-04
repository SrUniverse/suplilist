# Technical Debt Audit - SupliList

**Data**: 2026-06-02  
**Prioridade**: Mapeamento e Plano de Resolução

---

## 🔴 Débito Técnico Crítico (Deve ser Resolvido)

### 1. Cobertura de Testes Insuficiente

**Severidade**: 🔴 CRÍTICA  
**Impacto**: Alto (Risco de regressões)  
**Esforço**: 40-50 horas

**Problema**:
```
- 50+ arquivos JS, apenas 5 com testes
- 15% coverage total
- Router, pages, core components SEM testes
- Qualquer mudança é arriscada
```

**Resolução**:
```
Priority 1 (2 semanas):
- [ ] Adicionar testes para router.js
- [ ] Adicionar testes para app.js
- [ ] Adicionar testes para event-bus.js
- [ ] Adicionar testes para 3 páginas críticas

Priority 2 (2 semanas):
- [ ] Cobertura total para state/
- [ ] Cobertura para utils/
- [ ] Cobertura para core/

Priority 3 (1 semana):
- [ ] E2E tests para fluxos críticos
- [ ] Meta coverage: 60%
```

**Custo**: ~50 horas (1.25 semanas full-time)  
**Benefício**: Confiança em refactoring, menos bugs  
**ROI**: MUITO ALTO

---

### 2. Analytics Complexity - Over-Engineering

**Severidade**: 🔴 CRÍTICA  
**Impacto**: Médio (Difícil manter, performance)  
**Esforço**: 30-40 horas

**Problema**:
```
8 arquivos, ~1200 LOC, lógica distribuída:
- analytics-engine.js: 200+ LOC
- event-pipeline.js: 150+ LOC
- metrics-aggregator.js: 100+ LOC
- affiliate-tracker.js: 100+ LOC
- funnel-engine.js: 100+ LOC
- ltv-predictor.js: 150+ LOC
- analytics-health.js: 100+ LOC
- session-tracker.js: 100+ LOC

Cada um faz validação, transformação, aggregação
Muito acoplamento, difícil testar
```

**Resolução**:
```
Phase 1 (1 semana):
- [ ] Consolidar validação em 1 arquivo
- [ ] Criar contrato claro de tipos
- [ ] Documentar data flow com diagrama

Phase 2 (1 semana):
- [ ] Refatorar aggregator
- [ ] Simplificar pipeline
- [ ] Remover duplicação

Phase 3 (1 semana):
- [ ] Adicionar testes de integração
- [ ] Performance benchmarking
- [ ] Documentação

Target: Reduzir de 8 files para 4, LOC de 1200 para 800
```

**Custo**: ~30 horas (0.75 semanas)  
**Benefício**: Mais simples, mais rápido, menos bugs  
**ROI**: MUITO ALTO

---

### 3. Falta de Type Safety

**Severidade**: 🔴 CRÍTICA  
**Impacto**: Médio (Erros em runtime)  
**Esforço**: 20-30 horas (ou 80+ se TypeScript)

**Problema**:
```
Projeto é 100% JavaScript puro
Sem tipos, sem validação em tempo de compilação
Refactoring arriscado - pode quebrar em runtime
```

**Opção A: JSDoc Types (Recomendado)**
```
Tempo: 20-30 horas
Impacto: Médio
IDE support: Bom

Solução:
- [ ] Adicionar JSDoc @typedef para state
- [ ] Adicionar JSDoc para functions públicas
- [ ] Adicionar JSDoc para event types
- [ ] Adicionar JSDoc para API responses

Exemplos:
/**
 * @typedef {Object} Supplement
 * @property {string} id
 * @property {string} name
 * @property {number} price
 */

/**
 * @param {Supplement} supplement
 * @returns {Promise<void>}
 */
async function saveSupplement(supplement) { ... }
```

**Opção B: TypeScript (Completo, Maior investimento)**
```
Tempo: 80-100 horas
Impacto: Alto
IDE support: Excelente

Seria completo, mas muito trabalho
Não recomendado fazer agora
Revisar em 6 meses
```

**Recomendação**: Fazer JSDoc agora, considerar TypeScript em futuro

**Custo**: ~25 horas  
**Benefício**: Menos erros runtime, melhor IDE support  
**ROI**: ALTO

---

## 🟡 Débito Técnico Importante (Deve Planejar)

### 4. Documentação Faltante

**Severidade**: 🟡 IMPORTANTE  
**Impacto**: Médio (Manutenção difícil)  
**Esforço**: 15-20 horas

**Problema**:
```
30% documentado
Sem documentação de:
- Architecture
- Data flow
- State schema
- Event types
- API endpoints
```

**Resolução**:
```
Phase 1 (3-4 dias):
- [ ] Documentar arquitetura geral
- [ ] Criar diagrama data flow
- [ ] Documentar state schema
- [ ] Listar event types

Phase 2 (2-3 dias):
- [ ] Setup docs para novos devs
- [ ] API documentation
- [ ] Runbook para common tasks
```

**Custo**: ~18 horas  
**Benefício**: Onboarding mais rápido, menos perguntas  
**ROI**: MÉDIO

---

### 5. Code Duplication

**Severidade**: 🟡 IMPORTANTE  
**Impacto**: Baixo (Maioria aceitável)  
**Esforço**: 8-10 horas

**Problema**:
```
~15% duplicação:
1. Event validation (3+ places)
2. State updates (2+ places)
3. API response handling (5+ places)
4. Error handling (4+ places)
```

**Resolução**:
```
Extrair 5-6 funções utilitárias:
- validateEvent()
- updateState()
- handleAPIResponse()
- handleError()
- fetchWithAuth()
- parseJSON()

Tempo: 8 horas
Depois: DRY code, reutilizável
```

**Custo**: ~8 horas  
**Benefício**: DRY, menos bugs em mudanças  
**ROI**: MÉDIO

---

### 6. Bundle Size - Não Otimizado

**Severidade**: 🟡 IMPORTANTE  
**Impacto**: Baixo (Performance OK atualmente)  
**Esforço**: 5-10 horas

**Problema**:
```
Bundle: ~66KB (gzipped)
- Sem tree-shaking verificado
- Sem code splitting avançado
- Analytics poderia ser separado
```

**Resolução**:
```
Priority 1:
- [ ] Medir bundle atual
- [ ] Identificar o que é grande
- [ ] Code split analytics

Priority 2:
- [ ] Lazy load images
- [ ] WebP format para imagens
- [ ] CSS minification (já feito?)
```

**Custo**: ~7 horas  
**Benefício**: Carregamento +10-20% mais rápido  
**ROI**: MÉDIO

---

## 🟢 Débito Técnico Menor (Pode Deixar para Depois)

### 7. Error Handling Inconsistente

**Severidade**: 🟢 MENOR  
**Impacto**: Pequeno  
**Esforço**: 5-6 horas

**Problema**:
```
Alguns try-catch, alguns não
Sem padrão claro
Alguns erros não tratados
```

**Resolução**:
```
1. Padrão de error handling
2. Wrap async/await com try-catch
3. User-facing error messages
4. Dev logging para debug
```

---

### 8. Dead Code

**Severidade**: 🟢 MENOR  
**Impacto**: Pequeno (Apenas confusão)  
**Esforço**: 3-4 horas

**Problema**:
```
~5% código morto
Sem uso aparente
Confunde devs
```

**Resolução**:
```
Audit manual:
- [ ] Grep para exports não usados
- [ ] CSS classes não usadas
- [ ] Funções nunca chamadas
- [ ] Remover
```

---

### 9. Inconsistent Code Style

**Severidade**: 🟢 MENOR  
**Impacto**: Pequeno (Estética)  
**Esforço**: 4-5 horas

**Problema**:
```
Alguns seguem padrões, outros não:
- import statements de diferentes formas
- Naming: snake_case vs camelCase
- Comments style
```

**Resolução**:
```
1. Definir style guide
2. Configurar ESLint
3. Auto-format com Prettier (opcional)
```

---

## 📊 Débito Técnico por Números

### Total de Esforço
```
Crítico:      120 horas (3 semanas)
Importante:   50 horas (1.25 semanas)
Menor:        15 horas (3-4 dias)
─────────────────────────────────
TOTAL:       ~185 horas (4.6 semanas full-time)
```

### Por Prioridade
```
MUST DO (Crítico):
- Testes: 50h
- Analytics refactor: 30h
- Type safety: 25h
Subtotal: 105h (2.6 semanas)

SHOULD DO (Importante):
- Documentation: 18h
- Duplication: 8h
- Bundle: 7h
- Error handling: 6h
Subtotal: 39h (1 semana)

NICE TO HAVE (Menor):
- Dead code: 4h
- Code style: 5h
Subtotal: 9h (2 dias)
```

---

## 🎯 Plano de Ação Recomendado

### Semana 1: Foundation (Tests)
```
Priority: Testes base
- [ ] Router tests (8h)
- [ ] App.js tests (6h)
- [ ] Event-bus tests (4h)
- [ ] 2 página tests (6h)
Total: 24h
```

### Semana 2: Core + Analytics
```
Priority: Consolidar Analytics
- [ ] Analytics refactor phase 1 (8h)
- [ ] JSDoc para state (6h)
- [ ] Setup documentation (6h)
- [ ] Code quality audit (4h)
Total: 24h
```

### Semana 3: Polish + Tests
```
Priority: Mais testes + limpar duplicação
- [ ] Analytics phase 2 (8h)
- [ ] Duplicação consolidação (8h)
- [ ] Mais página tests (6h)
- [ ] Bundle optimization (4h)
Total: 26h
```

### Week 4: Documentation + final
```
Priority: Documentação completa
- [ ] Architecture docs (8h)
- [ ] API documentation (6h)
- [ ] Final tests (6h)
- [ ] Code style setup (4h)
Total: 24h
```

---

## 💡 ROI Analysis

| Item | Impacto | Esforço | ROI |
|------|---------|---------|-----|
| Testes | 🔴 Alto | 50h | ⭐⭐⭐⭐⭐ |
| Analytics refactor | 🟡 Médio | 30h | ⭐⭐⭐⭐ |
| Type safety | 🟡 Médio | 25h | ⭐⭐⭐⭐ |
| Documentation | 🟡 Médio | 18h | ⭐⭐⭐ |
| Bundle optimization | 🟢 Pequeno | 7h | ⭐⭐ |
| Duplication | 🟢 Pequeno | 8h | ⭐⭐ |

**Recommendation**: Fazer Testes + Analytics + Types (105h) antes de Features novas

---

## ✅ Próximos Passos

### Hoje
- [ ] Revisar este documento
- [ ] Decidir prioritização
- [ ] Comunicar time

### Esta Semana
- [ ] Começar com Testes (Semana 1)
- [ ] Setup CI/CD para test coverage
- [ ] Criar style guide ESLint

### Este Mês
- [ ] Completar Semana 1-2 (testes + analytics)
- [ ] Atingir 40% coverage
- [ ] Consolidar analytics

### Este Trimestre
- [ ] Completar todo plano
- [ ] Atingir 60% coverage
- [ ] Documentação completa
- [ ] TypeScript considerado

---

**Documento**: Technical Debt Audit  
**Gerado**: 2026-06-02  
**Status**: ✅ ANÁLISE COMPLETA
