# SupliList v3.0 — MIGRATION GUIDE REFINADO
## Implementação Visual Baseada nos Screenshots Finais

**Data:** 26 de maio de 2026
**Status:** ✅ PRONTO PARA COMEÇAR IMPLEMENTAÇÃO

---

## 📸 BASELINE VISUAL

Os 5 screenshots finais definem o target visual exato:
- ✅ **home.png** — Landing page + Dashboard
- ✅ **lista.png** — Catálogo de 57 suplementos
- ✅ **calculadora.jpg** — Calculadora clínica funcional
- ✅ **favoritos.jpg** — Página de favoritos com múltiplas ordenações
- ✅ **historico.jpg** — Timeline com métricas de aderência

**Não há mockups adicionais.** Estes 5 são o source of truth visual.

---

## 🎯 O QUE MANTER / REESCREVER / CRIAR

### MANTER (Estrutura + lógica)
- ✅ Sidebar com 6 rotas (Início, Lista, Minha Stack, Favoritos, Histórico, Dosagem, Comparar)
- ✅ 57 suplementos + 3 marketplaces (Shopee, Amazon, Mercado Livre)
- ✅ Estrutura de dados JSON (supplements, user stack, history)
- ✅ Funcionalidade de busca fuzzy (Fuse.js)
- ✅ Cálculo de dosagem (fórmula: peso × atividade × modo)
- ✅ localStorage para persistência

### REESCREVER (Layout + visual)
- ✅ **design-system.css** — Cores refinadas (roxo/índigo)
- ✅ **main.css** — Layout sidebar + topbar + grid
- ✅ **pages/list-page.js** — Stats cards + grid 4 colunas
- ✅ **pages/favorites-page.js** — Filtros por objetivo + ordenação múltipla
- ✅ **pages/dosage-calculator.js** — Lado a lado (inputs + resultado)
- ✅ **components/supplement-card.js** — Card com imagem + badge + preço

### CRIAR (Novo conteúdo)
- ✅ **pages/landing-page.js** — Home com hero + 3 CTAs + 6 seções
- ✅ **pages/history-page.js** — Timeline de ciclos com métricas
- ✅ **pages/dashboard-page.js** — Página inicial (Início) com streak + quick access
- ✅ **manifest.json** — PWA config (icons, name, display)
- ✅ **service-worker.js** — Offline + cache + push notifications
- ✅ **pages/legal-page.js** — Termos + Privacy + Aviso de Afiliado
- ✅ **utils/analytics.js** — GA4 wrapper
- ✅ **components/sidebar.js** — Sidebar colapsável
- ✅ **components/top-bar.js** — Breadcrumb + notificações + perfil

---

## 📋 CRONOGRAMA DETALHADO (4-6 SEMANAS)

### SEMANA 1: Design System + PWA + Shell

#### Dia 1-2: Design System + CSS Base
```
Prompts:
1.1 → design-system.css (cores, tipografia, espaçamento)
1.2 → main.css (layout sidebar + topbar + grid)
1.3 → manifest.json + service-worker.js

Output esperado:
- Paleta roxo/índigo aplicada
- Layout responsivo (1/2/4 colunas)
- PWA pronto (install + offline)
```

#### Dia 3: Page Router + App Shell
```
Prompts:
2.1 → page-router.js (SPA com hash routing)
2.2 → app.html (shell com sidebar + topbar)
2.3 → components/sidebar.js (6 rotas + menu items)
2.4 → components/top-bar.js (breadcrumb + notificações)

Output esperado:
- Navegação funcional entre páginas
- Sidebar colapsável em mobile
- Breadcrumb dinâmico
```

#### Dia 4: Landing Page
```
Prompts:
3.0 → pages/landing-page.js

Output esperado:
- Hero section com "SUPLEMENTAÇÃO BASEADA EM EVIDÊNCIAS"
- 3 CTAs principais (Montar Stack, Calculadora)
- 6 seções (Tudo que você precisa, 3 passos, Filtros, Marketplaces, CTA final)
- Responsivo (1 coluna mobile, 3 colunas desktop)
```

#### Dia 5: Dashboard Inicial
```
Prompts:
3.1 → pages/dashboard-page.js (página Início)

Output esperado:
- Streak ativo com visual de progresso
- Check-in diário com status
- 3 cards de acesso rápido (Catálogo, Dosagem, Meu Stack)
- Métricas visuais
```

---

### SEMANA 2: Páginas Principais (Lista, Favoritos)

#### Dia 6-7: Lista de Suplementos
```
Prompts:
3.2 → pages/list-page.js
Componentes:
- components/supplement-card.js (card individual)
- components/stats-card.js (card de métrica)

Output esperado:
- Grid com 57 suplementos
- 4 stats cards (Total, Pendentes, Comprados, Urgentes)
- Filtros por categoria (Todos, Adaptógeno, Hormônio, etc.)
- Busca fuzzy com ícone de lupa
- Hover effects
```

#### Dia 8-9: Favoritos
```
Prompts:
3.3 → pages/favorites-page.js

Output esperado:
- Filtros por objetivo (Todos, Hipertrofia, Foco & Cognição, Longevidade)
- Dropdown de ordenação (Maior Evidência, Menor Preço, Melhor Custo-Dose)
- Botão "Otimizar Todos"
- Cards com coração ❤️ vermelho (filled)
- Mesma grid que /list
```

#### Dia 10: Histórico
```
Prompts:
3.4 → pages/history-page.js

Output esperado:
- 3 cards de métrica (Aderência %, Ciclos, Investimento)
- Busca + filtros por categoria
- Timeline de ciclos (lista)
- Cada ciclo mostra: imagem, nome, categoria, datas, % aderência
- Button "Ver Logs" por ciclo
```

---

### SEMANA 3: Dosagem + My Stack + Páginas Vazias

#### Dia 11-12: Calculadora de Dosagem
```
Prompts:
3.5 → pages/dosage-calculator.js

Output esperado:
- Layout lado a lado (inputs esquerda, resultado direita)
- Inputs: Peso, Gordura Corporal, Nível de Atividade
- Busca por composto (fuzzy search)
- Resultado: número grande em roxo + badge verde "Validado"
- Button "+ Adicionar ao Protocolo"
- Contexto científico com badges de evidência + segurança
```

#### Dia 13: My Stack (refinement)
```
Prompts:
Refinamento do pages/my-stack.js

Output esperado:
- Mesmo que v2.0 mas com melhor visual
- Custo total destacado
- Badges de status (acabando em X dias)
- Ações: Remover, Adicionar Dosagem, Exportar, Compartilhar
```

#### Dia 14: Comparar (stub) + Receita (stub)
```
Prompts:
4.1 → pages/compare-page.js (vazio - CTA para catálogo)
4.2 → pages/recipes-page.js (vazio - CTA para catálogo)

Output esperado:
- Páginas com layout bonito mas aviso de "em breve"
- CTAs que redirecionam para /list
```

---

### SEMANA 4: Legal + Analytics + Integração

#### Dia 15-16: Legal Page
```
Prompts:
4.3 → pages/legal-page.js

Output esperado:
- 3 seções: Termos de Uso, Política de Privacidade, Aviso de Afiliado
- Footer em toda página com disclaimer
- Links internos (breadcrumb)
- Responsivo
```

#### Dia 17-18: Analytics + Monetização
```
Prompts:
5.1 → utils/analytics.js (GA4 wrapper)
Integração em:
- pages/list-page.js → trackEvent("supplement_click", {product_id, marketplace})
- pages/landing-page.js → trackEvent("cta_click", {action})
- Cada link afiliado inclui UTM

Output esperado:
- GA4 rastreando cada click
- Conversão medida (Landing → App → Compra)
- Dashboard em tempo real mostrando metrics
```

#### Dia 19: Reescrita de main.js
```
Prompts:
5.2 → main.js (integração de tudo)

Output esperado:
- App.js com router + analytics
- Inicialização de StateManager + EventBus
- Service Worker registrado
- localStorage persistindo
- Push notifications inicializadas
```

#### Dia 20: Checklist Final
```
Prompts:
5.3 → Checklist completo de integração

Output esperado:
- Todos os prompts executados
- Testes de navegação
- Performance checks (Lighthouse >80)
- Mobile responsivo verificado
```

---

### SEMANA 5-6: QA, Performance, Launch

#### Dia 21-22: Testing
- Navegação entre todas as 7 páginas
- Busca fuzzy funcional
- Cálculo de dosagem correto
- localStorage salvando/restaurando
- PWA instalando em mobile
- Offline mode funcional

#### Dia 23-24: Performance Optimization
- Vite build check (<200KB gzipped)
- Lighthouse score >80 (mobile + desktop)
- Imagens otimizadas (WebP com fallback PNG)
- CSS minificado
- JS bundled corretamente

#### Dia 25-26: Launch Prep
- Deploy em Vercel
- Domain apontando
- HTTPS configurado
- GA4 tag ativo
- Analytics dashboard testado

#### Dia 27-30: Buffer + Contingency

---

## 🚨 ARMADILHAS COMUNS + SOLUÇÕES

### Armadilha 1: Grid Layout Quebra em Mobile
**Problema:** 4 colunas ficam tiny em mobile
**Solução:** 
```css
@media (max-width: 640px) {
  .grid { grid-template-columns: 1fr; }
}
```
Testar em iOS Safari + Chrome Android.

---

### Armadilha 2: Busca Fuzzy Lenta (57 itens)
**Problema:** Fuse.js threshold muito alto = resultados ruins
**Solução:** 
```js
const fuse = new Fuse(supplements, {
  keys: ['name', 'category'],
  threshold: 0.3  // ← Crítico! Não aumentar para >0.5
});
```

---

### Armadilha 3: Dosagem Calcula Errado
**Problema:** Fórmula peso × atividade × modo dá valores estranhos
**Solução:**
```
Fórmula validada:
dosagem = peso_kg * multiplicador_atividade * multiplicador_modo
Ex: 75kg × 0.066 (moderado) × 1.0 (creatina) = 4.95g/dia ≈ 5g
```
Testar com 10+ valores conhecidos antes de deploy.

---

### Armadilha 4: Cards Imagem não Carrega
**Problema:** URLs de imagem morrendo
**Solução:**
```js
<img 
  src={supplement.image_url}
  onerror="this.src='/placeholder-supplement.png'"
  alt={supplement.name}
/>
```
Ter placeholder.png pronto.

---

### Armadilha 5: Sidebar Colapsável Quebra Layout
**Problema:** Sidebar collapse estraga grid de cards
**Solução:**
```css
.main-content {
  margin-left: var(--sidebar-width);
  transition: margin-left 200ms ease;
}

.main-content.sidebar-collapsed {
  margin-left: var(--sidebar-mini-width);
}
```
Testar expansão/colapso rápida.

---

### Armadilha 6: Analytics Não Rastreia Clicks
**Problema:** GA4 tag não disparando eventos
**Solução:**
```js
// Em cada botão de compra:
onClick={() => {
  analytics.trackEvent('affiliate_click', {
    product_id: supplement.id,
    marketplace: 'shopee',
    price: supplement.price
  });
  window.open(affiliate_link, '_blank');
}}
```
Verificar no GA4 real-time após 1-2 minutos.

---

### Armadilha 7: Cores Roxo/Índigo Muito Claras
**Problema:** --brand-primary #A78BFA muito claro em dark mode
**Solução:**
Usar #A78BFA para texto/hover, mas #7C3AED para botões principais
Testar contrast ratio ≥4.5:1 com WebAIM.

---

### Armadilha 8: Top Bar Breadcrumb Fica Vazio na Landing
**Problema:** "/" não tem breadcrumb definido
**Solução:**
```js
const breadcrumb = {
  '/': 'Home',
  '/list': 'Catálogo',
  '/favorites': 'Favoritos',
  // etc
};
```
Mostrar apenas "Home" se em "/"

---

### Armadilha 9: Push Notifications Não Funcionam em Desktop
**Problema:** Service Worker push não dispara em browser desktop
**Solução:**
Push funciona em PWA instalado (Android) + IOS
Desktop browser não suporta (usar GA4 notification virtual)
Testar em Android real ou emulator.

---

### Armadilha 10: Export/Import JSON Quebra após Update
**Problema:** JSON salvo em v2.0 não compatível com v3.0 schema
**Solução:**
```js
function migrateUserData(data) {
  // Se é v2.0, converte para v3.0 schema
  if (!data.version || data.version < 3) {
    data.version = 3;
    data.history = data.history || [];
  }
  return data;
}
```
Sempre fazer migration na loading.

---

## 📁 ESTRUTURA DE PASTAS FINAL

```
suplilist-v3/
├── public/
│   ├── index.html (landing page)
│   ├── app.html (app shell)
│   ├── manifest.json
│   ├── service-worker.js
│   ├── favicon.ico
│   ├── icon-192.png
│   ├── icon-512.png
│   └── placeholder-supplement.png
│
├── src/
│   ├── design-system.css (REESCRITA)
│   ├── main.css (REESCRITA)
│   ├── main.js (REESCRITA)
│   │
│   ├── utils/
│   │   ├── analytics.js (NOVO)
│   │   ├── state-manager.js
│   │   ├── event-bus.js
│   │   ├── fuzzy-search.js
│   │   ├── dosage-calculator.js
│   │   ├── error-boundary.js
│   │   └── affiliate-links.js (NOVO)
│   │
│   ├── components/
│   │   ├── sidebar.js (NOVO)
│   │   ├── top-bar.js (NOVO)
│   │   ├── supplement-card.js (REESCRITA)
│   │   ├── stats-card.js (NOVO)
│   │   ├── button.js
│   │   ├── input.js
│   │   ├── badge.js
│   │   └── modal.js
│   │
│   ├── pages/
│   │   ├── landing-page.js (NOVO)
│   │   ├── dashboard-page.js (NOVO)
│   │   ├── list-page.js (REESCRITA)
│   │   ├── favorites-page.js (REESCRITA)
│   │   ├── history-page.js (NOVO)
│   │   ├── my-stack-page.js (mantém)
│   │   ├── dosage-calculator.js (REESCRITA)
│   │   ├── compare-page.js (NOVO - stub)
│   │   ├── recipes-page.js (NOVO - stub)
│   │   ├── legal-page.js (NOVO)
│   │   └── page-router.js (NOVO)
│   │
│   └── data/
│       ├── supplements.json (57 itens)
│       ├── evidence-grades.json
│       └── interactions.json
│
├── docs/
│   ├── VISUAL_SPECS_REFINADO_v3.md
│   ├── EXECUTIVE_SUMMARY_v3_UPDATED.md
│   ├── MIGRATION_GUIDE_REFINADO_v3.md
│   ├── SUPLILIST_PROMPTS_v3_FINAL.md
│   └── [outros documentos]
│
└── package.json (Vite, Fuse.js, GA4, etc)
```

---

## 🚀 COMO COMEÇAR HOJE

### 1. Leia (30 min)
```
- VISUAL_SPECS_REFINADO_v3.md (este arquivo)
- Compare com home.png, lista.png, calculadora.jpg, favoritos.jpg, historico.jpg
```

### 2. Execute Prompts Semana 1 (4 dias)
```
Cole em IDE (com Antigravity):
[CONTEXTO GLOBAL de SUPLILIST_PROMPTS_v3_FINAL.md]
[PROMPT 1.1]
[PROMPT 1.2]
[PROMPT 1.3]
[PROMPT 2.1-2.4]
[PROMPT 3.0 (Landing)]
[PROMPT 3.1 (Dashboard)]
```

### 3. Teste em Localhost (1 dia)
```
npm run dev
→ http://localhost:5173/
Teste navegação, responsividade, funcionalidade
```

### 4. Continue com Semana 2-3 (10 dias)
Prompts 3.2-3.5 (Lista, Favoritos, Histórico, Dosagem)

### 5. Finalize com Semana 4-6 (12 dias)
Prompts 4.1-5.3 (Legal, Analytics, QA, Deploy)

---

## ✅ CHECKLIST PRE-LAUNCH

- [ ] Todas as 7 rotas navegáveis
- [ ] Sidebar colapsável (mobile/desktop)
- [ ] Top bar com breadcrumb dinâmico
- [ ] Landing page com 6 seções
- [ ] Lista com 57 suplementos + busca + filtros
- [ ] Favoritos com múltiplas ordenações
- [ ] Histórico com métricas + timeline
- [ ] Dosagem com calculadora real
- [ ] My Stack com relatório visual
- [ ] PWA instalável (manifest + service-worker)
- [ ] Offline mode funcional
- [ ] Analytics GA4 tracking
- [ ] Legal page com Termos + Privacy + Aviso
- [ ] Cores roxo/índigo aplicadas corretamente
- [ ] Responsive (mobile/tablet/desktop)
- [ ] Lighthouse >80
- [ ] Performance <2s FCP
- [ ] Nenhuma imagem quebrada (com placeholder)
- [ ] localStorage salvando/restaurando
- [ ] Afiliado links com UTM
- [ ] Deploy em Vercel
- [ ] Domain configurado
- [ ] HTTPS ativo

---

## 📞 SUPORTE DURANTE IMPLEMENTAÇÃO

Se travar em:
- **Busca não funciona:** Debug Fuse.js threshold
- **Cards não organizam:** Debug CSS grid em media query
- **Analytics não rastreia:** Check GA4 tag em head + eventos
- **PWA não instala:** Debug manifest.json + icon paths
- **Dosagem calcula errado:** Validar fórmula com valores conhecidos

---

**Status:** ✅ PRONTO PARA COMEÇAR!

Próximo passo: Abra IDE e cole os prompts da **SUPLILIST_PROMPTS_v3_FINAL.md** começando por Semana 1.

Boa sorte! 🚀

---

*Migration Guide Refinado: 26 de maio de 2026 | SupliList v3.0 Ready to Build*
