# SupliList v3.0 — EXECUTIVE SUMMARY (COMPLETO)
## Redesign Completo: De Ferramenta para Produto (Com Arquitetura Técnica Blindada)

**Data:** 23 de maio de 2026
**Versão:** 3.0 - Full Product Redesign + Technical Fortress
**Paradigma:** Pub/Sub + Event-Driven + Schema-First + Multi-Page App + PWA + Analytics + Legal Compliance
**Status:** ✅ ARQUITETURA APROVADA — PRONTO PARA RECODIFICAÇÃO

---

## 🎯 O QUE MUDOU DA v2.0 PARA v3.0

### v2.0 (atual)
- Layout bento grid de coluna única
- Sidebar minimalista (Catálogo + Favoritos)
- Calculadora embutida na sidebar direita
- Painel de inventário embutido
- Sem páginas dedicadas por funcionalidade
- PWA básico
- Sem rastreamento de conversão

### v3.0 (novo)
- **App-style completo** com sidebar expandida e 6 rotas
- **Páginas dedicadas:** Home, List, My Stack, Favorites, History, Settings
- **Calculadora de Dosagem Clínica** como página própria (modal ou rota)
- **Página de Histórico** com métricas de adesão, ciclos concluídos, investimento total
- **Cards com imagens reais** grandes (não placeholders)
- **Navegação por abas** nos filtros (Todos, Hipertrofia, Foco & Cognição, etc.)
- **Landing page institucional** separada (home.html ou rota `/`)
- **Header top bar** com ícones de notificação, dashboard e perfil
- **PWA Robusto** com Service Worker, cache inteligente, acesso offline
- **Analytics Invisível** com rastreamento de conversão via Google Analytics 4
- **Legal & Compliance** com Termos de Uso, Política de Privacidade, aviso de afiliados

---

## 🏛️ PARTE 1: FUNDAÇÃO TÉCNICA E BLINDAGEM (O CHASSI)

### 1.1 Arquitetura "Terra Arrasada" (Zero Frameworks Pesados)
```javascript
// 100% Vanilla JS modular, zero React/Vue/Svelte
// Estrutura:
// src/js/core/           → EventBus + StateManager + ErrorBoundary
// src/js/types/          → Schemas (validação rigorosa)
// src/js/features/       → Features isoladas (supplements, favorites, etc.)
// src/js/components/     → UI components reativos
// src/js/utils/          → Helpers puros
```

**Vantagens:**
- Zero dependências pesadas (Vite build ~150KB gzipped)
- Carregamento instantâneo no mobile (PWA em 2G)
- Sem overhead de framework (controle total)
- Fácil debugging (JS puro, sem abstrações)

### 1.2 Sistema Nervoso Pub/Sub (EventBus + StateManager)

O coração reativo do SupliList. Dois singletons:

```javascript
// EventBus: Notificações de eventos
eventBus.emit('supplement:favorited', { supplementId, timestamp });
eventBus.on('supplement:favorited', ({ supplementId }) => {
  // Qualquer component pode ouvir
});

// StateManager: Estado global imutável
stateManager.setState('favorites', { ...favorites, [id]: true });
const favorites = stateManager.getState('favorites');
```

**Fluxo Reativo:**
```
User clica coração (favorite) 
  → Event 'favorite:toggle' emitido
  → StateManager atualiza state
  → Listeners recebem notificação
  → UI renderiza sem reload
```

**Garantias:**
- Zero mutações diretas (state = imutável)
- Time-travel debugging (salva histórico de eventos)
- localStorage sync automático
- DevTools mock para inspecionar estado

### 1.3 Tolerância a Falhas (ErrorBoundary em TUDO)

```javascript
// Cada componente embrulhado:
const ProtectedComponent = ErrorBoundary.wrap(SomeComponent, {
  name: 'SomeComponent',
  fallback: () => '<div class="error">Erro ao carregar. Tente recarregar.</div>'
});

// Se der erro em 1 card, os outros 99 continuam funcionando
// Erro isolado, app não morre
```

**Protocolo de Falha:**
1. Try/catch no render do componente
2. Emite `component:error` no EventBus
3. Logger registra stack trace
4. Toast mostra mensagem amigável ao usuário
5. Component mostra fallback UI
6. App continua 100% funcional

### 1.4 PWA Nativo (O Aplicativo Fantasma)

**Service Worker + Cache Strategy:**
```javascript
// Instalação: primeiro carregamento
// → Cacheia app shell + suplementos estáticos
// → ~2MB de cache inteligente

// Network-first para dados dinâmicos (histórico)
// Cache-first para assets (imagens, CSS)
// Stale-while-revalidate para lista de suplementos

// Resultado:
// - Offline mode: 80% funcional
// - Carregamento instantâneo (0.5s vs 3s online)
// - Instalação no home screen (sem app store)
```

**Como funciona:**
```
iPhone: "Adicionar à Tela Inicial" → App fica como icon nativo
Android: ícone de "Instalar" no browser → PWA no drawer

Sem taxas da Apple/Google (100% comissão é sua)
```

### 1.5 Design System Blindado (Bento Grid Ultra-Dark)

```css
/* Fundo "Void" — quase preto profundo */
--bg-base: #0a0a0a;           /* Fundo do app */
--bg-sidebar: #111111;        /* Sidebar */
--bg-card: #161616;           /* Cards */
--bg-surface: #1a1a1a;        /* Painéis elevados */
--bg-elevated: #222222;       /* Modais/dropdowns */

/* Acentos em Roxo Neon (Alta Conversão) */
--brand: #7c3aed;             /* Botão primário */
--brand-light: #a855f7;       /* Hover, active */
--brand-glow: rgba(124, 58, 237, 0.15);  /* Background glow */
--brand-glow-strong: rgba(124, 58, 237, 0.3);

/* Semântica */
--success: #22c55e;           /* Verde: Nível A, adesão boa *)
--success-bg: rgba(34, 197, 94, 0.1);
--warning: #f59e0b;           /* Âmbar: Alerta *)
--warning-bg: rgba(245, 158, 11, 0.1);
--danger: #ef4444;            /* Vermelho: Urgente *)
--danger-bg: rgba(239, 68, 68, 0.1);

/* Texto com contraste WCAG AAA */
--t1: #f4f4f5;                /* Primário (heading, CTA) *)
--t2: #a1a1aa;                /* Secundário (body) *)
--t3: #71717a;                /* Terciário (hints, labels) *)

/* Bordas sutis */
--border: rgba(255,255,255,0.06);
--border-hover: rgba(255,255,255,0.12);
--border-active: rgba(124, 58, 237, 0.4);

/* Sombras Profundas */
--shadow-card: 0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3);
--shadow-card-hover: 0 8px 24px rgba(0,0,0,0.5);
--shadow-brand: 0 0 20px var(--brand-glow);
```

**Componentes Garantidos:**
- Badges de evidência: Nível A (verde), Nível B (roxo), Nível C (cinza)
- Buttons: primary (roxo), outline (roxo/transparente), ghost (texto)
- Cards: 16px radius, hover com lift (-2px) + shadow
- Sidebar items: ícone + label, ativo com borda-esquerda brand
- Touch targets: mínimo 44x44px (WCAG mobile)
- Scrollbar customizada: track escura, thumb cinza

---

## 🧠 PARTE 2: INTELIGÊNCIA E CIÊNCIA (O CÉREBRO)

### 2.1 Busca Preditiva Sniper (Fuse.js + Threshold 0.3)

```javascript
// Usuário digita "cretina" → motor encontra "Creatina"
// Threshold 0.3 = "fuzzy match" agressivo
// Sem delay (busca local na memória)

const searcher = new Fuse(supplements, {
  keys: ['name', 'category', 'aliases'],
  threshold: 0.3,
  includeScore: true,
});

const results = searcher.search('cretina');
// [{ item: Creatina, score: 0.1 }, ...]
```

**Performance:**
- 57 suplementos = busca em <5ms
- Debounce 300ms (não fica fazendo requisições a cada letra)
- Resultado em tempo real enquanto digita

### 2.2 Gerador de Stack (Montagem Inteligente)

```javascript
// Usuário seleciona: "Foco Absoluto"
// Sistema monta kit científico:
// → Cafeína (estimulante comprovado)
// → L-Teanina (sinergia com cafeína, reduz ansiedade)
// → Bacopa Monnieri (memória)
// → Rhodiola (resistência mental)

const STACKS = {
  'foco-absoluto': [
    { supplementId: 'caffeine', dose: 200, unit: 'mg', frequency: 'daily' },
    { supplementId: 'l-theanine', dose: 200, unit: 'mg', frequency: 'daily' },
    { supplementId: 'bacopa', dose: 500, unit: 'mg', frequency: 'daily' },
  ]
};

// Usuário clica "Montar Essa Stack"
// → Adiciona tudo ao "My Stack" + emite 'stack:created'
```

### 2.3 Calculadora de Dosagem Real (Matemática Pura)

Integrada com `calculations.js` (v2.0):

```javascript
// Fórmula: dose_base * (peso_usuário / 70kg) * fator_atividade
function calculateDosage(supplementId, weight, activityLevel, mode = 'maintenance') {
  const supp = supplementsDB[supplementId];
  
  let baseDose = mode === 'maintenance' 
    ? supp.dosageMaintenanceBase 
    : supp.dosageLoadBase;
  
  const weightFactor = weight / 70;
  const activityFactor = ACTIVITY_LEVELS[activityLevel];
  
  let finalDose = baseDose * weightFactor * activityFactor;
  
  // Validação clínica: não deve exceder limites de segurança
  if (finalDose > supp.dosageSafetyMax) {
    finalDose = supp.dosageSafetyMax;
  }
  
  // Formatação: sem decimais desnecessários (5.0g não 4.99714286g)
  return Math.round(finalDose * 10) / 10;
}
```

**Exemplos:**
```
Creatina, 80kg, Atividade Média, Manutenção:
  → 5.0g/dia (recomendado em 95%+ estudos)

L-Arginina, 70kg, Sedentário, Carga:
  → 3g/dia (fase de carga) | 1.5g/dia (manutenção)

Ashwagandha, 60kg, Ativo, Manutenção:
  → 300mg/dia (extract KSM-66)
```

### 2.4 Alertas de Biohacking (Interações + Sinergias)

```javascript
const INTERACTIONS = {
  'caffeine': ['warfarin', 'beta-blockers'],  // NÃO misturar
  'creatine': ['NSAIDs'],
};

const SYNERGIES = {
  'caffeine': ['l-theanine'],                 // Misturar = melhor efeito
  'creatine': ['carbohydrate'],
};

// Quando usuário adiciona ao stack:
// Verifica interações perigosas → toast aviso vermelho
// Detecta sinergias → toast verde "Combine com L-Teanina"
```

### 2.5 Avaliação de Eficácia Científica (Graus de Evidência)

```javascript
// Sistema 4-estrela baseado em GRADES (Grading of Recommendations Assessment)

const EVIDENCE_LEVELS = {
  'A': { stars: 4, color: '#22c55e', label: 'Muito Bem Estabelecido' },
  'B': { stars: 3, color: '#a855f7', label: 'Bem Estabelecido' },
  'C': { stars: 2, color: '#f59e0b', label: 'Promissor' },
  'D': { stars: 1, color: '#71717a', label: 'Estudos Limitados' },
};

// Cada suplemento tem:
// supplementsDB['creatina'].evidenceLevel = 'A'
// supplementsDB['creatina'].studyCount = 285
// supplementsDB['creatina'].metaAnalysisCount = 23
```

---

## ⚔️ PARTE 3: MOTOR DE COMPARAÇÃO (O FECHAMENTO DA VENDA)

### 3.1 Batalha de Cartões (Side-by-Side Comparison)

```javascript
// Usuário clica "Comparar Preços" em 2 produtos
// → Modal abre com comparação lado-a-lado

const comparison = {
  left: {
    name: 'Creatina Monohidratada (Nutrify)',
    price: 49.90,
    dosePerServing: 5,
    servingsPerPot: 200,
    costPerDose: 0.25,
  },
  right: {
    name: 'Creatina Monohidratada (Integral)',
    price: 34.90,
    dosePerServing: 5,
    servingsPerPot: 250,
    costPerDose: 0.07,  // GANHADORA
  }
};

// UI destaca o lado "melhor custo-benefício"
```

### 3.2 A Métrica de Ouro (Preço Real por Dose)

O segredo que a indústria NÃO quer que você saiba:

```javascript
// Fórmula: (preço do pote) / (gramas totais / dose diária)

// Pote A: R$ 100 → 500g
// Pote B: R$ 80 → 250g
// Dose: 5g/dia

// Custo por dose:
// Pote A: 100 / (500/5) = 100 / 100 = R$ 1.00
// Pote B: 80 / (250/5) = 80 / 50 = R$ 1.60

// O POTE A É MAIS BARATO (mesmo sendo R$20 mais caro!)

function calculateCostPerDose(priceR$, potWeightGrams, doseGrams) {
  const servings = potWeightGrams / doseGrams;
  return priceR$ / servings;
}
```

### 3.3 Selo "Melhor Custo-Benefício" (Automático)

```javascript
// Sistema calcula automaticamente para CADA suplemento
// Qual marketplace tem melhor preço por dose

const supplementOptions = [
  { marketplace: 'Shopee', price: 49.90, weight: 500, costPerDose: 0.50 },
  { marketplace: 'Amazon', price: 54.90, weight: 500, costPerDose: 0.55 },
  { marketplace: 'ML', price: 47.90, weight: 500, costPerDose: 0.48 },  // WINNER
];

const winner = supplementOptions.reduce((best, curr) => 
  curr.costPerDose < best.costPerDose ? curr : best
);

// UI: Badge verde "🏆 Melhor Preço no Mercado Livre" aparece em destaque
```

### 3.4 Acesso Rápido (Pre-carregamento do Stack do Usuário)

```javascript
// Quando user abre comparador, sistema auto-carrega:
// - Produtos já no seu "Armário" (stack atual)
// - Favoritos (para quick add)
// - Histórico recente (o que você comprava)

// Zero clicks extras, máxima eficiência
```

---

## 💊 PARTE 4: O ARMÁRIO & FAVORITOS (O DASHBOARD)

### 4.1 Status de Estoque Visual (Badges Dinâmicos)

```javascript
// User adiciona creatina ao armário com data de compra
// Sistema calcula automaticamente:

function calculateStockStatus(purchaseDate, potSizeGrams, dailyDoseGrams) {
  const daysPassed = (Date.now() - purchaseDate) / (1000 * 60 * 60 * 24);
  const maxDays = potSizeGrams / dailyDoseGrams;
  const percentRemaining = 100 - (daysPassed / maxDays * 100);
  
  if (percentRemaining >= 50) return { badge: '🟢 Em Estoque', color: 'success' };
  if (percentRemaining >= 20) return { badge: '🟡 Acabando', color: 'warning' };
  return { badge: '🔴 Faltando', color: 'danger' };
}

// Badge aparece em tempo real no card do armário
```

### 4.2 Ação Dupla Sniper (Máximo Impacto, Mínimo Clique)

Cada card do Armário tem **exatamente 2 botões:**

```html
<!-- Card no Armário (My Stack) -->
<div class="stack-card">
  <img src="..." />
  <h3>Creatina Monohidratada</h3>
  <div class="badge">🟡 Acabando (10 dias)</div>
  
  <!-- BOTÃO 1: Check-in (psicológico) -->
  <button class="btn-check-in">✓ Já tomei hoje</button>
  
  <!-- BOTÃO 2: Compra (conversão) -->
  <button class="btn-buy">💰 Comprar Agora</button>
</div>
```

**Psicologia:**
1. Check-in → cria vício (gamification: streak de dias)
2. Compra → 1 clique vai para marketplace + seu link de afiliado

### 4.3 Injeção de Afiliados Invisível

```javascript
// links.js: dicionário central de URLs com UTMs

const AFFILIATE_LINKS = {
  'creatina-monohidratada': {
    shopee: 'https://shopee.com.br/...?utm_source=suplilist&utm_campaign=creatina',
    amazon: 'https://amazon.com.br/...?utm_source=suplilist&utm_campaign=creatina',
    mercadolivre: 'https://mercadolivre.com.br/...?utm_source=suplilist',
  },
  // ... 56 outros suplementos
};

// Quando user clica "Comprar Agora":
const marketplace = user.preferredMarketplace || 'shopee'; // ou smart suggest
const link = AFFILIATE_LINKS[supplementId][marketplace];
window.open(link, '_blank');  // Seu link com UTM rastreado
```

**Importante:** Links são **dinâmicos por marketplace**:
- Shopee: 10-15% comissão
- Mercado Livre: 5-10% comissão
- Amazon: 2-5% comissão

Sistema recomenda o marketplace com **melhor preço + maior comissão**.

---

## 🏃‍♂️ PARTE 5: O "STRAVA DOS SUPLEMENTOS" (MOTOR DE RETENÇÃO)

### 5.1 Check-in Diário & Streak (Vício Psicológico Controlado)

```javascript
// Cada dia, user clica "✓ Já tomei hoje" em cada suplemento do stack
// Sistema registra check-in:

const checkIn = {
  supplementId: 'creatina',
  date: '2026-05-23',
  timestamp: Date.now(),
  userFeedback: null,  // (opcional: energia, foco, sono)
};

// Histórico de 30 dias gera STREAK visual
// "27 dias seguidos de adesão" com barra de progresso

function calculateStreak(checkIns) {
  const sorted = checkIns.sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  let expectedDate = new Date();
  
  for (const checkin of sorted) {
    const checkinDate = new Date(checkin.date);
    if (Math.abs(expectedDate - checkinDate) < 1000 * 60 * 60 * 24) {
      streak++;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
```

**Psicologia (Comprovada):**
- Usuário quer manter a streak (gamification)
- Abre o app todo dia para "fechar o ciclo"
- Cria hábito + engajamento profundo

### 5.2 Timeline de Evolução (Seu Investimento Vira Visual)

```javascript
// Página History mostra timeline vertical do que o user suplementou

/* Timeline Item:
   [2026-05-23]
   Creatina Monohidratada
   ✓ Adesão: 95% (27 dias)
   💰 Investimento: R$ 89,90
   Feedback: Energia máxima
*/

// Ao clicar em cada item → ver logs detalhados
// "Qual era meu peso? Energia subjective?"
```

### 5.3 Notificações Push (Lembretes Inteligentes)

Service Worker + Notification API:

```javascript
// Sistema detecta: "Sua Creatina vai acabar em 5 dias"
// Dispara notificação push:

function checkInventoryUrgent() {
  const stacks = stateManager.getState('stack.items');
  
  for (const item of stacks) {
    const daysLeft = calculateDaysRemaining(item);
    
    if (daysLeft === 5) {
      // PRIMEIRA notificação (gentle reminder)
      navigator.serviceWorker.controller.postMessage({
        type: 'notify',
        title: 'Creatina acabando em 5 dias',
        body: 'Clique para comprar agora',
        badge: '🎯',
        action: `buy-${item.supplementId}`,
      });
    }
    
    if (daysLeft === 1) {
      // SEGUNDA notificação (urgente)
      navigator.serviceWorker.controller.postMessage({
        type: 'notify',
        title: '🚨 ÚLTIMA dose de Creatina!',
        body: 'Compre agora antes de faltar',
        badge: '🚨',
        action: `buy-${item.supplementId}`,
        tag: 'urgent',  // Substitui notificação anterior
      });
    }
  }
}

// Click na notificação → abre link de afiliado
self.addEventListener('notificationclick', (event) => {
  const [action] = event.notification.tag.split('-');
  if (action === 'buy') {
    clients.openWindow(AFFILIATE_LINKS[...]);
  }
});
```

---

## 💰 PARTE 6: A "JANELA DE OPORTUNIDADE" (MONETIZAÇÃO PREDITIVA)

### 6.1 A Venda Futura (Previsão Automática)

```javascript
// Sistema analisa timeline de check-ins + taxa de consumo

function predictInventoryEnd(supplementId, historicalCheckIns) {
  // Estatística: em quantos dias costuma acabar?
  // Creatina: média 65 dias por pote
  
  const lastCheckIn = historicalCheckIns[historicalCheckIns.length - 1];
  const adherenceRate = calculateAdherence(historicalCheckIns);
  
  // Se user tem 95% adesão:
  // E creatina dura 65 dias com 100% adesão
  // Então com 95% adesão durará: 65 * (100/95) = 68 dias
  
  const predictedEndDate = new Date(lastCheckIn.date);
  predictedEndDate.setDate(predictedEndDate.getDate() + 68);
  
  return predictedEndDate;
}
```

### 6.2 Gatilho de Compra (Automação Invisível)

```javascript
// 5 dias ANTES do predicted end date:
// Sistema dispara notificação + email + SMS (optional)

const triggerPredictiveReminder = () => {
  const stacks = stateManager.getState('stack.items');
  
  stacks.forEach(item => {
    const endDate = predictInventoryEnd(item.supplementId);
    const daysUntilEnd = (endDate - Date.now()) / (1000 * 60 * 60 * 24);
    
    if (daysUntilEnd === 5) {
      // Trigger conversion
      eventBus.emit('buy:predictive', {
        supplementId: item.supplementId,
        userMessage: `Sua ${item.name} acaba em 5 dias. Reponha agora com o melhor preço.`,
      });
      
      // Toast + localStorage flag
      toast.show(userMessage, 'warning');
      stateManager.setState(`pending-purchases.${item.supplementId}`, true);
    }
  });
};

// CTA no toast: "COMPRAR AGORA" → link de afiliado com contexto
```

---

## 🛡️ PARTE 7: DEFESA ANTI-SUICÍDIO DE DADOS

### 7.1 Exportação/Importação JSON (O Antídoto para "Sem Servidor")

```javascript
// User pode fazer backup a qualquer momento

const exportUserData = () => {
  const data = {
    version: '3.0',
    exportDate: new Date().toISOString(),
    userPreferences: stateManager.getState('settings'),
    favoriteSupplements: stateManager.getState('favorites'),
    stack: stateManager.getState('stack'),
    history: stateManager.getState('history'),
    checkIns: stateManager.getState('checkins'),
  };
  
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `suplilist-backup-${Date.now()}.json`;
  a.click();
};

// User muda de celular ou limpa cache do navegador
// Clica "Restaurar Backup" → seleciona arquivo JSON
// → Tudo restaurado em 2 segundos

const importUserData = (file) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      
      // Validação rigorosa (schema-first)
      if (!validateUserDataSchema(data)) {
        throw new Error('Backup inválido ou corrompido');
      }
      
      // Restaura tudo
      stateManager.setState(data);
      toast.show('Backup restaurado com sucesso!', 'success');
      window.location.reload();
    } catch (err) {
      logger.error('Import failed', err);
      toast.show('Erro ao restaurar backup. Arquivo pode estar corrompido.', 'danger');
    }
  };
  reader.readAsText(file);
};
```

**Fluxo:**
1. User clica "Exportar Dados" → download .json
2. User abre em outro celular/browser
3. Clica "Importar Dados" → seleciona .json
4. Sistema valida + restaura
5. Zero dados perdidos

### 7.2 Analytics Invisível (Rastreio de Conversão)

Google Analytics 4 integrado:

```javascript
// src/js/utils/analytics.js

class Analytics {
  static init() {
    // GA4 tag injetado no index.html
    // window.gtag já disponível
  }
  
  // Event: Usuário clica em "Comprar Agora" (CONVERSÃO!)
  static trackAffiliateClick(supplementId, marketplace) {
    gtag('event', 'affiliate_click', {
      supplement_id: supplementId,
      supplement_name: supplementsDB[supplementId].name,
      marketplace: marketplace,
      timestamp: Date.now(),
    });
    
    // GA mostra: "Quantos clicks em Shopee vs Amazon?"
    // "Qual suplemento mais vende?"
    // "Taxa de conversão por objetivo?"
  }
  
  // Event: Usuário completa um ciclo (adesão 100%)
  static trackCycleCompletion(supplementId, adherencePercent) {
    gtag('event', 'cycle_completed', {
      supplement_id: supplementId,
      adherence_percent: adherencePercent,
    });
  }
  
  // Event: Novo user clica CTA na landing page
  static trackLandingCTA(ctaType) {
    gtag('event', 'landing_cta_click', {
      cta_type: ctaType,  // 'build-stack' | 'calculate-dosage'
    });
  }
}

// Uso:
Analytics.trackAffiliateClick('creatina', 'shopee');
Analytics.trackCycleCompletion('ashwagandha', 92);
```

**Dashboard GA4:**
```
SupliList Analytics (realtime)
├── Affiliate Clicks (total)
│   ├── Shopee: 1,250 (45%)
│   ├── Amazon: 890 (32%)
│   └── Mercado Livre: 620 (22%)
├── Top Supplements (by clicks)
│   ├── Creatina: 580
│   ├── Ashwagandha: 340
│   └── Ômega 3: 280
├── Conversion Funnel
│   ├── Landing CTA: 5,000
│   ├── App Opened: 3,200 (64%)
│   ├── Added to Stack: 1,800 (56%)
│   └── Clicked Buy: 850 (47%)
└── User Retention
    ├── Day 1: 100%
    ├── Day 7: 42%
    └── Day 30: 18%
```

### 7.3 SEO & Open Graph (A Blindagem de Partilha)

Meta tags no `index.html`:

```html
<!-- Quando user partilha SupliList em WhatsApp/Telegram/Twitter -->

<meta property="og:title" content="SupliList — Suplementação com Ciência Real">
<meta property="og:description" content="57+ suplementos, dosagens clínicas, 3 marketplaces. Zero taxas de app store.">
<meta property="og:image" content="https://suplilist.app/og-preview.jpg">
<meta property="og:url" content="https://suplilist.app">
<meta property="og:type" content="website">

<!-- Twitter Card (aparece diferente em Twitter) -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="SupliList — Suplementação com Ciência Real">
<meta name="twitter:image" content="https://suplilist.app/og-preview.jpg">

<!-- Icons para homescreen + PWA -->
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
<link rel="manifest" href="/manifest.json">
```

**Efeito:**
```
User clica link em WhatsApp
↓
Aparece card lindo em Roxo Neon com preview da imagem
"SupliList — Suplementação com Ciência Real"
↓
CTR (click-through rate) sobe 3x
↓
Viral growth orgânico
```

### 7.4 Legal & Compliance (O Escudo Anti-Ban)

Página obrigatória: `/legal` (ou `/terms`)

```markdown
# Termos de Uso e Política de Privacidade

## Aviso de Afiliado (OBRIGATÓRIO por Lei)

SupliList é suportado por leitores. Podemos receber uma comissão 
quando você clica nos links de compra (Shopee, Amazon, Mercado Livre).

Isso NÃO afeta o preço que você paga.
Nós recomendamos produtos baseados em EVIDÊNCIA CIENTÍFICA,
não em comissão.

Confira nossa Metodologia de Avaliação: [link]

## Dados Pessoais

- Coletamos: preferências, favoritos, histórico de suplementação
- NÃO coletamos: localização, câmera, contatos
- GDPR & LGPD compliant (sua conta é SUA)
- Você pode baixar/deletar seus dados a qualquer hora

## Limitação de Responsabilidade

O SupliList fornece INFORMAÇÕES educacionais baseadas em estudos científicos.
Consulte um médico antes de iniciar qualquer suplementação.

Nós NÃO somos responsáveis por reações adversas ou efeitos colaterais.

## Propriedade Intelectual

- Conteúdo: Copyright © 2026 SupliList
- Open source: [Github link]
- Reuse com atribuição OK (CC-BY-4.0)

---

Última atualização: 23 de maio de 2026
Contato: legal@suplilist.app
```

**Footer do site:**
```html
<footer>
  <p>© 2026 SupliList — Suplementação Baseada em Ciência</p>
  <p>
    <a href="/terms">Termos de Uso</a> | 
    <a href="/privacy">Política de Privacidade</a> | 
    <a href="/legal">Aviso de Afiliado</a>
  </p>
  <p>
    <small>
      SupliList pode receber comissão em links de compra. 
      Isso não afeta os preços.
    </small>
  </p>
</footer>
```

**Proteção:**
- Se Google/Amazon questionar: "Temos aviso claro de afiliado"
- User não se sente enganado: sabe que é afiliado
- Conta não é banida (compliance total)

---

## 🗺️ NOVA ESTRUTURA DE PÁGINAS (Rotas)

```
/ (landing)          → Landing page institucional (home.png)
/app                 → Redireciona para /app/list
/app/list            → Catálogo de suplementos (lista.png)
/app/my-stack        → Minha Stack / Inventário
/app/favorites       → Favoritos com filtros por objetivo (image_94f403)
/app/history         → Histórico de suplementação + métricas (image_94f7a8)
/app/dosage          → Calculadora de Dosagem Clínica (image_94fbc4)
/app/settings        → Configurações do usuário
/legal               → Termos + Privacidade + Aviso de Afiliado
/home                → Página inicial do app (dashboard)
```

---

## 🎨 NOVO DESIGN SYSTEM (Resumido)

### Paleta de Cores
```css
/* Backgrounds */
--bg-base:        #0a0a0a;   /* Fundo raiz (quase preto) */
--bg-sidebar:     #111111;   /* Sidebar */
--bg-card:        #161616;   /* Cards */
--bg-card-hover:  #1c1c1c;
--bg-surface:     #1a1a1a;   /* Painéis */
--bg-elevated:    #222222;   /* Modais */

/* Brand */
--brand:          #7c3aed;   /* Roxo primário (CTA) */
--brand-light:    #a855f7;
--brand-glow:     rgba(124, 58, 237, 0.15);
--brand-glow-strong: rgba(124, 58, 237, 0.3);

/* Semantic */
--success:        #22c55e;   /* Verde (Nível A, adesão alta) */
--warning:        #f59e0b;   /* Âmbar (alertas) */
--danger:         #ef4444;   /* Vermelho (urgente) */

/* Text */
--t1:             #f4f4f5;   /* Primário */
--t2:             #a1a1aa;   /* Secundário */
--t3:             #71717a;   /* Terciário */

/* Borders */
--border:         rgba(255,255,255,0.06);
--border-hover:   rgba(255,255,255,0.12);
--border-active:  rgba(124, 58, 237, 0.4);

/* Layout */
--sidebar-width:  220px;
--topbar-height:  60px;
--card-radius:    16px;
--radius-sm:      8px;
--radius-md:      12px;

/* Shadows */
--shadow-card: 0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3);
--shadow-card-hover: 0 8px 24px rgba(0,0,0,0.5);
--shadow-brand: 0 0 20px var(--brand-glow);
```

### Tipografia
```css
/* Headlines */
font-family: 'Outfit', sans-serif;
font-weight: 700-800;

/* Body / UI */
font-family: 'Inter', sans-serif;
font-weight: 400-500;
```

### Componentes Base
- **Cards:** border-radius 16px, borda 1px sutil, hover com lift shadow
- **Sidebar:** largura 220px, items com ícone + label, item ativo com background brand
- **Top bar:** altura 60px, logo + breadcrumb à esquerda, ações à direita
- **Badges:** Nível A (verde), Nível B (roxo), Nível C (cinza)
- **Botões:** primários roxo, outlines roxo/transparente
- **Touch targets:** mínimo 44x44px (WCAG)

---

## 🧩 COMPONENTES NOVOS (vs v2.0)

| Componente | Descrição | Arquivo |
|---|---|---|
| `top-bar.js` | Header fixo com breadcrumb, notificações, perfil | `components/top-bar.js` |
| `sidebar-nav.js` | Sidebar expandida com 6 rotas principais | `components/sidebar-nav.js` |
| `page-router.js` | SPA router hash-based (/#/list, etc) | `core/page-router.js` |
| `history-page.js` | Página de histórico + métricas KPI | `components/history-page.js` |
| `my-stack-page.js` | Página de My Stack / Inventário | `components/my-stack-page.js` |
| `dosage-calculator.js` | Calculadora clínica dedicada | `components/dosage-calculator.js` |
| `metric-card.js` | Card de métrica (KPI) com progresso | `components/metric-card.js` |
| `cycle-item.js` | Item de ciclo no histórico | `components/cycle-item.js` |
| `tab-filter.js` | Filtros por abas horizontais | `components/tab-filter.js` |
| `landing-page.js` | Landing institucional | `components/landing-page.js` |
| Analytics | Google Analytics 4 integrado | `utils/analytics.js` |
| PWA Config | Service Worker + manifest | `service-worker.js`, `manifest.json` |

---

## 🚀 FILOSOFIA DO REDESIGN v3.0

> **"De planilha para produto. De utilitário para experiência."**
> 
> **"Construir uma fortaleza técnica que aguenta 100x crescimento sem suar."**

O SupliList v3.0 é:

1. **Um app de saúde pessoal** que acompanha todo ciclo de suplementação
2. **Uma máquina de conversão** que monetiza com transparência (afiliados bem-sinalizados)
3. **Uma fortaleza de dados** que persiste offline e permite backup/restore
4. **Uma comunidade científica** baseada em evidências, não marketing
5. **100% PWA** — instalável no home screen sem app store
6. **Zero frameworks pesados** — Vanilla JS puro, Vite, velocidade máxima

---

**Status:** ✅ ARQUITETURA COMPLETA — BLINDADA E PRONTA PARA RECODIFICAÇÃO

*Especificação Técnica Completa: 23 de maio de 2026 | v3.0 Production-Ready*
