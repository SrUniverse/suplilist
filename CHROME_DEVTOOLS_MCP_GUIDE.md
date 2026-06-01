# Chrome DevTools MCP — Debugging & Performance Analysis

**Chrome DevTools MCP** integra o inspetor de navegador ao Claude Code — depure em tempo real, analise performance, inspecione DOM/CSS e diagnostique problemas sem abrir DevTools manualmente.

## O que é Chrome DevTools MCP?

Chrome DevTools MCP permite que Claude veja e analise o que o código faz no navegador. Perfeito para:

- **Performance Audits** — Medir Core Web Vitals (LCP, INP, CLS)
- **DOM Inspection** — Verificar estrutura HTML/CSS
- **Console Debugging** — Ver logs, erros e warnings
- **Network Analysis** — Diagnosticar requisições lentase APIs
- **Layout Issues** — Identificar problemas de responsividade
- **JavaScript Errors** — Debugar exceções em tempo real

## Setup

### 1. MCP Já Configurado

Chrome DevTools MCP está pré-configurado em `.claude/settings.json`:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["chrome-devtools-mcp@latest"]
    }
  }
}
```

### 2. Chrome Necessário

- **Ter Chrome instalado** (DevTools roda localmente)
- **App rodando** — `npm run dev` (http://localhost:5173)
- **Claude Code conectado**

### 3. Nenhuma Configuração Adicional

Tudo está pronto! DevTools MCP se conecta automaticamente ao Chrome.

## Ferramentas Disponíveis

| Ferramenta | O que faz | Caso de Uso |
|-----------|----------|-----------|
| **Performance** | Mede Core Web Vitals | "Qual é o LCP da página?" |
| **Inspect DOM** | Vê HTML/CSS | "Inspect o header roxo" |
| **Console Logs** | Vê erros e logs | "Há erros no console?" |
| **Network** | Analisa requisições | "Quantas requests na recomendação?" |
| **Trace** | Profile JavaScript | "Por que está lento?" |
| **Simulate** | Simula usuário | "Clique em Buscar e capture trace" |

## Casos de Uso do SupliList

### Caso 1: Verificar Performance

```
Em Claude Code:
"Abra http://localhost:5173 e meça:
1. Largest Contentful Paint (LCP)
2. Interaction to Next Paint (INP)  
3. Cumulative Layout Shift (CLS)
4. Tamanho total de JavaScript

Compare com targets:
- LCP: < 2.5s ✓
- INP: < 200ms ✓
- CLS: < 0.1 ✓
- JS: < 150kb gzipped ✓"
```

### Caso 2: Debugar Recomendador Lento

```
"O recomendador está lento. Faça:
1. Profile a página ao clicar 'Recomendar'
2. Capture uma trace
3. Identifique qual function leva mais tempo
4. Screenshot do flamegraph
5. Recomendação para otimizar"
```

### Caso 3: Inspecionar Layout Responsivo

```
"Inspecione a responsividade em mobile (375px):
1. Abra http://localhost:5173
2. Redimensione para 375x812
3. Inspect o elemento com class 'bottom-nav'
4. Verifique CSS: display, height, position
5. Tire screenshot do DevTools"
```

### Caso 4: Analisar Erros de Rede

```
"Há erro ao carregar suplementos. Faça:
1. Abra DevTools Network tab
2. Navegue para 'Lista de Suplementos'
3. Veja requisições network
4. Identifique qual falha (4xx/5xx)
5. Analise response body
6. Screenshot mostrando erro"
```

### Caso 5: Debugar Favoritos

```
"Favoritos não salvam. Investigate:
1. Abra DevTools Console
2. Clique em Heart para favoritar
3. Veja logs e erros
4. Inspect localStorage
5. Verifique se JSON é válido
6. Reporte achados"
```

### Caso 6: Validar Acessibilidade

```
"Teste acessibilidade:
1. Abra DevTools > Accessibility Inspector
2. Navegar com Tab
3. Verificar se elementos focados têm outline
4. Inspecionar ARIA labels
5. Verifique contraste: roxo sobre fundo
6. Screenshot mostrando estados"
```

### Caso 7: Performance da Busca

```
"Por que a busca demora? Faça:
1. Abra DevTools Profiler
2. Clique no campo de busca
3. Digite 'vitamina'
4. Capture trace de 2 segundos
5. Analise se é debounce ou filter lento
6. Recomendação: aumentar debounce de 300ms?"
```

### Caso 8: Verificar Carregamento de Imagens

```
"Imagens carregam rápido? Faça:
1. Abra Network tab
2. Recarregue página
3. Filtre por 'img'
4. Verifique tamanho de cada imagem
5. Identifique as > 100KB
6. Recomendação: converter para WebP"
```

## Prompts Prontos para Copiar/Colar

### Audit de Performance

```
"Faça um audit de performance em http://localhost:5173:
1. Meça LCP, INP, CLS
2. Analise bundle size
3. Identifique main thread blocking
4. Reporte: Pass/Fail para cada métrica"
```

### Debugar Componente Específico

```
"O card de suplemento está quebrado. Debugue:
1. Inspecione o elemento .supplement-card
2. Verifique CSS: layout, espaçamento, cores
3. Veja se há console errors
4. Tire screenshot com DevTools aberto"
```

### Analisar Clique

```
"Quando clico em um suplemento, o que acontece? Faça:
1. Abra DevTools > Sources
2. Clique no elemento
3. Veja qual handler é chamado
4. Trace a execução
5. Identifique a função responsável
6. Screenshot do stack trace"
```

### Network Request Analysis

```
"Quantas requests no fluxo de recomendação? Faça:
1. Abra Network tab
2. Clique 'Recomendar'
3. Conte total de requests
4. Identifique: URLs, métodos, status codes
5. Some tamanho total transferido
6. Reporte dados"
```

### Memory Leak Check

```
"Há memory leak ao navegar? Faça:
1. Abra DevTools > Memory
2. Tire heap snapshot inicial
3. Navegue para 5 páginas
4. Tire heap snapshot final
5. Compare snapshots
6. Reporte se memória não diminuiu"
```

### Console Error Investigation

```
"Por que há erro 'undefined is not a function'? Faça:
1. Abra Console
2. Reproduza o erro
3. Clique no stack trace
4. Veja qual arquivo/função causa
5. Inspect variáveis no scope
6. Screenshot com valores"
```

## Integração com Outros MCPs

### Firecrawl → Chrome DevTools

```
1. Firecrawl: Extrai preço de marketplace
2. Chrome DevTools: Verifica se preço foi renderizado
3. Resultado: Confirma que preço está visível
```

### Playwright → Chrome DevTools

```
1. Playwright: Navega para página
2. Chrome DevTools: Analisa performance durante navegação
3. Resultado: Testa funcionalidade E performance
```

### SupliList MCP → Chrome DevTools

```
1. SupliList: Recomenda stack
2. Chrome DevTools: Verifica se recomendações renderizaram
3. Resultado: Valida tanto dados quanto apresentação visual
```

### Todos os 4 MCPs Juntos

```
1. SupliList MCP: Gera recomendações
   ↓
2. Firecrawl MCP: Extrai preços live
   ↓
3. Chrome DevTools: Valida performance da recomendação
   ↓
4. Playwright: Testa interação com usuário
   ↓
Result: Stack completo, testado, performático e com preços atualizados
```

## Workflow de Debugging

### 1. Relatório de Performance Completo

```
"Gere relatório de performance para http://localhost:5173:
1. Core Web Vitals (LCP, INP, CLS)
2. JavaScript bundle size
3. Número de requests network
4. Memory usage
5. CPU utilization
6. Recomendações de otimização"
```

### 2. Investigação de Bug

```
"Debugue este fluxo:
1. User clica em suplemento
2. Modal deveria abrir
3. Mas não abre às vezes

Faça:
1. Reproduza o bug
2. Capture console
3. Veja network requests
4. Inspecione elementos
5. Identifique causa raiz
6. Reporte solução"
```

### 3. Validação Pré-Deploy

```
"Antes de fazer deploy, valide:
1. Performance: LCP < 2.5s, INP < 200ms
2. Errors: Nenhum erro no console
3. Network: Nenhuma requisição 4xx/5xx
4. Layout: Sem quebras de layout em mobile
5. Accessibility: Tab navigation funciona
6. Reporte: PASS ou FAIL com detalhes"
```

## Performance Targets para SupliList

| Métrica | Target | Status |
|---------|--------|--------|
| **LCP** (Largest Contentful Paint) | < 2.5s | Check com DevTools |
| **INP** (Interaction to Next Paint) | < 200ms | Check com DevTools |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Check com DevTools |
| **FCP** (First Contentful Paint) | < 1.5s | Check com DevTools |
| **TBT** (Total Blocking Time) | < 200ms | Check com DevTools |
| **JS Bundle** | < 150kb | Check Network |
| **Total Requests** | < 50 | Check Network |

## Dicas & Truques

### 1. Simular Rede Lenta

```
"Simule 4G lento para http://localhost:5173:
1. DevTools > Network > Throttling
2. Selecione 'Fast 4G'
3. Recarregue página
4. Meça performance em rede lenta"
```

### 2. Debugar CSS Layout

```
"Inspecione por que layout quebrou em mobile:
1. Redimensione para 375px
2. DevTools > Elements
3. Inspect elemento quebrado
4. Veja CSS box model
5. Identifique: padding/margin/width problema"
```

### 3. Analisar JavaScript

```
"Qual função é mais lenta? Faça:
1. DevTools > Performance
2. Record durante ação lenta
3. Veja flamegraph
4. Identifique função top
5. Recomende refactor ou otimização"
```

### 4. Validar API Calls

```
"Quais dados estão sendo enviados? Faça:
1. DevTools > Network
2. Filtrar por 'api/' ou 'xhr'
3. Clicar em request
4. Ver Request Headers e Body
5. Comparar com esperado"
```

## Troubleshooting

| Problema | Solução |
|----------|---------|
| DevTools não conecta | Reiniciar Chrome, verificar se app roda em 5173 |
| Performance muito alta | Desabilitar extensões, limpar cache |
| Trace muito longo | Capturar trace mais curto (< 5s) |
| Memory muito alto | Verificar se há memory leak (compare snapshots) |

## Checklist Pré-Deploy

```
[ ] LCP < 2.5s?
[ ] INP < 200ms?
[ ] CLS < 0.1?
[ ] Nenhum erro no console?
[ ] Nenhuma requisição 4xx/5xx?
[ ] Layout correto em 375px, 768px, 1280px?
[ ] Keyboard nav com Tab funciona?
[ ] Focados têm outline roxo visível?
[ ] Imagens todas carregam < 3s?
[ ] Favoritos salvam em localStorage?
[ ] Recomendação completada em < 2s?
```

## Recursos

- **Chrome DevTools Docs**: https://developer.chrome.com/docs/devtools/
- **MCP Repo**: https://github.com/ChromeDevTools/chrome-devtools-mcp
- **Web Vitals Guide**: https://web.dev/vitals/
- **Performance Budget**: https://www.performancebudget.io/

## Próximos Passos

1. **Chrome DevTools já está pronto** — não requer configuração
2. **Comece com exemplo**: "Meça o LCP de http://localhost:5173"
3. **Use durante desenvolvimento** — Valide performance de cada feature
4. **Antes de cada deploy** — Rode checklist de performance
5. **Integre com CI/CD** — Falhe build se LCP > 2.5s

---

**Pronto para debugar!** 👉 Copie um dos prompts acima e peça ao Claude para analisar a performance do SupliList em tempo real.
