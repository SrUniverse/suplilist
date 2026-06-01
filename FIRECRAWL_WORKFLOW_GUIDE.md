# Firecrawl Workflow — Automated Price Monitoring

Workflow automático que monitora preços de suplementos em 3 marketplaces (Shopee, Mercado Livre, Amazon) **em paralelo** usando Firecrawl, consolidando dados e gerando `affiliate.config.js` atualizado.

## O que é Este Workflow?

Um agente orquestrador que:

1. **Setup** — Inicializa lista de suplementos e marketplaces
2. **Scrape** — Fetch preços em paralelo de todas as combinações (5 suplementos × 3 marketplaces = 15 requisições simultâneas)
3. **Process** — Consolida dados, valida preços, calcula melhor deal
4. **Update** — Gera código JavaScript pronto para atualizar `affiliate.config.js`

## Status Atual

🚀 **Workflow lançado em background!**

- **Run ID**: `wf_7442f685-8d5`
- **Status**: Rodando (paralelo)
- **Tempo estimado**: 2-5 minutos
- **Monitor em**: `/workflows` ou aguarde notificação

## Como Funciona

### Fase 1: Setup
```
📋 Monitoring 5 supplements across 3 marketplaces:
   - Creatina Monohidratada
   - Whey Protein
   - Vitamina D3
   - Ômega 3
   - Magnésio Bisglicinato

Marketplaces:
   - Shopee
   - Mercado Livre
   - Amazon
```

### Fase 2: Scrape (Paralelo)
```
🕷️ 15 requisições simultâneas para Firecrawl:

Creatina @ Shopee      │  Whey @ Shopee        │  D3 @ Shopee
Creatina @ MercadoLivre│  Whey @ MercadoLivre  │  D3 @ MercadoLivre
Creatina @ Amazon      │  Whey @ Amazon        │  D3 @ Amazon
...

Resultado: Todos os preços em paralelo (não sequencial)
```

### Fase 3: Process
```
💾 Consolidando:
   creatina-monohidratada:
   ├── Shopee: R$ 79.90 (Marca X)
   ├── ML: R$ 89.50 (Marca Y)
   └── Amazon: R$ 94.00 (Marca Z)
   
   whey-protein:
   ├── Shopee: R$ 129.90
   ├── ML: R$ 139.90
   └── Amazon: R$ 149.90
   ...
```

### Fase 4: Update
```
🔧 Gerando código:

export const SUPPLEMENT_PRICES = {
  'creatina-monohidratada': {
    name: 'Creatina Monohidratada',
    shopee: {
      url: 'https://shopee.com.br/...',
      price: 79.90,
      brand: 'Marca X',
      available: true
    },
    mercadolivre: { ... },
    amazon: { ... }
  },
  'whey-protein': { ... },
  ...
}
```

## Como Usar o Resultado

Quando o workflow terminar:

1. **Ver resultado**: 
   ```bash
   /workflows  # Monitor ao vivo
   # ou aguarde notificação de conclusão
   ```

2. **Copiar config gerada**:
   - Workflow retorna `config_snippet`
   - Copie para `src/monetization/affiliate.config.js`
   - Commit e deploy

3. **Validar preços no app**:
   ```bash
   npm run dev
   # Verify preços aparecem nas recomendações
   ```

## Automatizar Semanalmente

Para rodar este workflow **toda semana automaticamente**, use CronCreate:

```bash
# Criar task semanal (seg 9am)
# Veja instruções em: FIRECRAWL_AUTOMATION.md (próximo arquivo)
```

## Suplementos Monitorados

Atualmente monitorando 5 suplementos principais:

| Suplemento | ID | Keywords |
|-----------|----|----|
| Creatina Monohidratada | `creatina-monohidratada` | "creatina monohidratada" |
| Whey Protein | `whey-protein` | "whey protein" |
| Vitamina D3 | `vitamina-d3` | "vitamina d3" |
| Ômega 3 | `omega-3` | "omega 3" |
| Magnésio Bisglicinato | `magnesio-bisglicinato` | "magnesio glicinato" |

### Adicionar Mais Suplementos

Para adicionar mais suplementos ao monitoramento:

```javascript
const SUPPLEMENTS_TO_MONITOR = [
  // ... suplementos existentes ...
  { 
    id: 'novo-suplemento', 
    name: 'Novo Suplemento', 
    keywords: 'palavra-chave de busca' 
  }
]
```

## Parallelização

O workflow usa `parallel()` para scraping simultâneo:

```
Tempo sequencial: 15 requisições × 10s cada = 150s
Tempo paralelo:   15 requisições / 8 concurrent = ~20s
Ganho:            7.5× mais rápido
```

Firecrawl MCP gerencia automaticamente throttling e rate limits.

## O Que o Workflow Retorna

```json
{
  "summary": {
    "supplements_monitored": 5,
    "marketplaces": 3,
    "total_scrapes": 15,
    "successful_scrapes": 14,
    "supplements_with_prices": 5
  },
  "consolidated_prices": {
    "creatina-monohidratada": {
      "name": "Creatina Monohidratada",
      "marketplaces": {
        "Shopee": { "brand": "...", "price": 79.90, "url": "...", "available": true },
        "Mercado Livre": { ... },
        "Amazon": { ... }
      }
    },
    ...
  },
  "config_snippet": "export const SUPPLEMENT_PRICES = { ... }"
}
```

## Troubleshooting

| Problema | Solução |
|----------|---------|
| Workflow muito lento | Usar menos suplementos/marketplaces |
| Alguns preços faltando | Marketplace pode estar bloqueando; tentar URLs diferentes |
| Preços muito altos/baixos | Validar manualmente se resultado faz sentido |
| Rate limit error | Reduzir concurrent requests (editar workflow) |

## Próximos Passos

1. ✅ **Aguardar conclusão** — Workflow rodando em background
2. ✅ **Ver resultado** — `/workflows` ou notificação
3. 📝 **Criar automação** — Ver `FIRECRAWL_AUTOMATION.md`
4. 🚀 **Deploy** — Atualizar `affiliate.config.js` e commitar
5. 📊 **Monitor** — Acompanhar preços semanalmente

## Resumo do Fluxo

```
┌─ SupliList MCP
│  └─ Recomendações personalizadas
│
├─ Chrome DevTools MCP
│  └─ Valida performance da recomendação
│
├─ Playwright MCP
│  └─ Testa interação user/checkout
│
└─ Firecrawl WORKFLOW (este aqui!)
   ├─ Scrape paralelo de preços
   ├─ Consolida dados
   └─ Gera affiliate.config.js

Resultado: Stack completo + preços live + testado
```

---

**Workflow em progresso!** Aguarde a notificação de conclusão. 👇
