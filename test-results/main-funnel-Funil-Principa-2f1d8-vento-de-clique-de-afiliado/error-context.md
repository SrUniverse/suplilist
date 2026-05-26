# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: main-funnel.spec.js >> Funil Principal de Conversão >> Deve buscar Creatina, listar e disparar evento de clique de afiliado
- Location: tests\e2e\main-funnel.spec.js:4:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('#catalog-search')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('#catalog-search')

```

```yaml
- banner:
  - link "⚡ SUPLILIST":
    - /url: "#"
  - navigation:
    - link "Início":
      - /url: "#"
    - link "Lista":
      - /url: app.html#/list
    - link "Minha Stack":
      - /url: app.html#/my-stack
    - link "Configurações":
      - /url: app.html#/settings
  - link "MONTAR LISTA":
    - /url: app.html#/list
- heading "SUPLEMENTAÇÃO BASEADA EM EVIDÊNCIAS." [level=1]
- paragraph: Compare preços, doses e eficácia científica em Shopee, Mercado Livre e Amazon — tudo em um só lugar. Sem cadastro.
- link "MONTAR MINHA STACK":
  - /url: app.html#/my-stack
- link "📋 CALCULAR DOSAGEM":
  - /url: app.html#/dosage
- text: 57+ Suplementos | 3 Marketplaces | 500+ Estudos | R$0 Cadastro
- img "Suplilist App Mockup"
- text: Maca Peruana → Ashwagandha → Creatina → Whey Protein → Rhodiola Rosea → Melatonina → Ômega 3 → Magnésio → Maca Peruana → Ashwagandha → Creatina → Whey Protein → Rhodiola Rosea → Melatonina → Ômega 3 → Magnésio → FUNCIONALIDADES
- heading "TUDO QUE VOCÊ PRECISA. JUNTO." [level=2]
- paragraph: Do planejamento à compra com ciência real. Sem abas abertas, sem frutas, sem crises.
- text: ⭐
- heading "Comparação de Preços" [level=3]
- paragraph: Shopee, Mercado Livre e Amazon tudo junto nos maiores marketplaces do Brasil. Encontre o menor preço e economize.
- text: 📊
- heading "Dosagens Científicas" [level=3]
- paragraph: Baseadas em estudos calibrados e calculadas especificamente de acordo com seu peso corporal e nível de treino diário.
- text: ♡
- heading "Stack Personalizado" [level=3]
- paragraph: Monte e gerencie seu próprio protocolo ativo. Monitore o estoque do seu armário e preveja compras futuras facilmente.
- text: COMO FUNCIONA
- heading "3 PASSOS PARA COMPRAR CERTO." [level=2]
- text: 01 01
- heading "Defina seus Objetivos" [level=3]
- paragraph: Filtre por objetivo do seu treino para encontrar o composto exato com alto nível de comprovação e estudos médicos revisados.
- text: 02 02
- heading "Compare Preços e Doses" [level=3]
- paragraph: Cada item, o melhor custo-benefício financeiro por dose ativa. Calcule as dosagens adequadas sem achismos.
- text: 03 03
- heading "Marque e Compre" [level=3]
- paragraph: Check nos que comprou para injetar no seu protocolo e acompanhar as datas de validade estimadas do seu armário.
- link "COMEÇAR AGORA":
  - /url: app.html#/list
- text: src/js/features/history/historyRepo.js
- code: "import { stateManager } from '../../core/state-manager.js'; import { calculateDosage } from '../../../calculations.js'; // 🧬 Otimizando dosagem reativa com base no perfil clínico export function optimizeStack(userWeight, activityLevel) { const favorites = stateManager.getState('favorites') || []; return favorites.map(supp => { const recommendedDose = calculateDosage(supp, userWeight, activityLevel); return { id: supp.id, name: supp.name, dose: `\\${recommendedDose}\\${supp.unit}/dia`, evidence: supp.evidenceLevel, status: '🟢 OTIMIZADO' }; }); }"
- text: OBJETIVOS
- heading "FILTRADO POR COMO VOCÊ TREINA." [level=2]
- link "💪 Hipertrofia ➔":
  - /url: app.html#/list
- link "🔥 Queima de Gordura ➔":
  - /url: app.html#/list
- link "⚡ Energia & Foco ➔":
  - /url: app.html#/list
- link "🌿 Saúde Geral ➔":
  - /url: app.html#/list
- link "🔥 Libido & Testo ➔":
  - /url: app.html#/list
- link "🌙 Sono ➔":
  - /url: app.html#/list
- link "🌸 Mulher ➔":
  - /url: app.html#/list
- link "▷ Ver Todos ➔":
  - /url: app.html#/list
- text: MARKETPLACES
- heading "OS MAIORES MARKETPLACES DO BRASIL." [level=2]
- img: Shopee
- text: Integrado
- img: Mercado Livre
- text: Em breve...
- img: amazon
- text: Integrado DEPOIMENTOS
- heading "PARE DE ADIVINHAR. COMECE A SUPLEMENTAR COM CIÊNCIA REAL." [level=2]
- paragraph: Milhares de pessoas ainda compram suplemento errado, na dose errada, no lugar mais caro. Você não precisa ser uma delas.
- link "Montar Minha Lista Agora":
  - /url: app.html#/list
- link "Ver Guia de Uso":
  - /url: app.html#/dosage
- contentinfo:
  - link "⚡ SUPLILIST":
    - /url: "#"
  - link "Privacidade":
    - /url: src/pages/legal.html
  - link "Termos":
    - /url: src/pages/legal.html
  - link "API":
    - /url: src/pages/legal.html
  - link "Github":
    - /url: src/pages/legal.html
  - text: © 2026 — Powered by Suplilist
  - strong: "Nota de Transparência e Aviso de Afiliados:"
  - text: O SupliList é um utilitário digital totalmente gratuito e de código aberto dedicado a traduzir pesquisas científicas de saúde e suplementação. Nós analisamos as dosagens e racional clínicos estritamente baseados em ensaios clínicos robustos revisados por pares. Alguns dos botões ou links externos apresentados em nossas páginas contêm tags e códigos de afiliação de plataformas parceiras como Shopee Brasil, Mercado Livre e Amazon Brasil. Ao efetuar uma compra qualificada através desses links, nós poderemos receber uma pequena comissão percentual que apoia diretamente os custos de servidores e desenvolvimento contínuo da ferramenta, sem qualquer alteração de custo ou custo adicional de venda para o seu carrinho de compras.
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Funil Principal de Conversão', () => {
  4  |   test('Deve buscar Creatina, listar e disparar evento de clique de afiliado', async ({ page, context }) => {
  5  |     // 1. O usuário acessa a rota /#/list
  6  |     // Nota: ajuste a porta conforme o servidor de dev (ex: vite na 5173 ou live-server)
  7  |     await page.goto('http://localhost:5173/#/list');
  8  |     
  9  |     // Injeta mock para o objeto global gtag (Google Analytics) para interceptar 
  10 |     // e verificar o evento 'affiliate_click' sem enviar requisição real.
  11 |     await page.evaluate(() => {
  12 |       window.gtag = function(...args) {
  13 |         window.__gtag_calls = window.__gtag_calls || [];
  14 |         window.__gtag_calls.push(args);
  15 |       };
  16 |     });
  17 | 
  18 |     // 2. Ele digita "Creatina" no input de busca
  19 |     const searchInput = page.locator('#catalog-search');
> 20 |     await expect(searchInput).toBeVisible();
     |                               ^ Error: expect(locator).toBeVisible() failed
  21 |     await searchInput.fill('Creatina');
  22 |     
  23 |     // 3. O sistema deve filtrar os cards na tela (aguarda debounce de 300ms + renderização)
  24 |     await page.waitForTimeout(500); 
  25 |     
  26 |     // Confirma que os resultados apareceram (lazy loading / intersection observer)
  27 |     // Precisamos garantir que o card existe e está visível
  28 |     const firstCard = page.locator('.supplement-card').first();
  29 |     await firstCard.scrollIntoViewIfNeeded(); // Gatilha o IntersectionObserver
  30 |     await expect(firstCard).toBeVisible();
  31 | 
  32 |     const firstCardName = firstCard.locator('.card-name');
  33 |     await expect(firstCardName).toContainText('Creatina', { ignoreCase: true });
  34 |     
  35 |     // Prepara contexto para capturar a nova aba aberta pelo botão de compra
  36 |     const [newPage] = await Promise.all([
  37 |       context.waitForEvent('page'),
  38 |       // 4. O usuário clica no botão "VER MELHORES PREÇOS" do primeiro card
  39 |       firstCard.locator('.btn-ver-precos').click()
  40 |     ]);
  41 | 
  42 |     // 5. O modal ou link de afiliado deve ser acionado corretamente
  43 |     // Verifica se a nova aba não é nula
  44 |     expect(newPage).not.toBeNull();
  45 | 
  46 |     // Verifique se o EventBus emitiu o evento affiliate_click indiretamente checando o gtag
  47 |     const gtagCalls = await page.evaluate(() => window.__gtag_calls || []);
  48 |     const affiliateEvent = gtagCalls.find(call => call[0] === 'event' && call[1] === 'affiliate_click');
  49 |     
  50 |     // Assertions estritas
  51 |     expect(affiliateEvent).toBeDefined();
  52 |     expect(affiliateEvent[2]).toHaveProperty('supplement_name');
  53 |     expect(affiliateEvent[2]).toHaveProperty('marketplace');
  54 |   });
  55 | });
  56 | 
```