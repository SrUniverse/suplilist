# 📁 Estrutura Recomendada SupliList v4.0 (Enterprise-Ready)

## Visão Geral Multi-Camada
Estrutura projetada para suportar a arquitetura híbrida, IA local, mais de 40 idiomas e build simultâneo para Web, iOS e Android via Capacitor.

```text
suplilist-v4/
├── capacitor.config.ts    # Config iOS/Android
├── package.json           # Dependências
├── src/
│   ├── ai/                # 🤖 Motores de Inteligência Local (TinyML)
│   ├── components/        # 🧩 Web Components (UI reutilizável)
│   ├── core/              # 🧠 Lógica Central (EventBus, State, Compliance)
│   ├── community/         # 👥 Feed, Grupos, Leaderboards
│   ├── css/               # 🎨 Design System (Variáveis, Dark Mode)
│   ├── data/              # 🗄️ Persistência (IndexedDB, SQLite, Sync Cloud)
│   ├── i18n/              # 🌍 40+ Idiomas e Dicionários
│   ├── integrations/      # 🔌 Wearables, Stripe, Shopify, APIs externas
│   ├── monetization/      # 💰 AffiliateEngine, Premium Tiers
│   ├── pages/             # 📄 Páginas e Views da aplicação
│   └── utils/             # 🛠️ Helpers, Formatadores
└── public/
    ├── manifest.json      # PWA config V4
    ├── service-worker.js  # Service Worker V4 (Smart Cache)
    └── assets/            # Imagens, modelos 3D (AR)
    
1. src/ai/ - Motores de Inteligência (Novo na v4.0)
Lógica que processa dados biométricos e recomendações 100% no device.

JavaScript
ai/
├── stack-recommender.js   # Algoritmo clínico base
├── dosage-calculator.js   # Cálculo matemático com biometria
├── interaction-engine.js  # Detecta conflitos e sinergias
└── tinyml-model/          # Modelos exportados para predição local
2. src/monetization/ - Motor Financeiro (Expandido)
Gerenciamento inteligente de afiliados globais e planos premium.

JavaScript
monetization/
├── affiliate-engine.js    # Injetor dinâmico de UTMs
├── price-comparator.js    # Batalha de preços real-time (500+ lojas)
├── stripe-handler.js      # Pagamentos Premium/Master/Enterprise
└── compliance-logger.js   # Logs da FTC/CVM para afiliados
3. src/integrations/ - Wearables e Serviços
Ecossistema IoT e APIs.

JavaScript
integrations/
├── wearables/
│   ├── apple-health.js    # Sincroniza passos/treino
│   ├── garmin-connect.js
│   └── whoop-recovery.js  # Sincroniza HRV (variabilidade cardíaca)
├── marketplaces/
│   └── shopify-api.js     # Conexão com 500+ lojas
└── analytics/
    └── ga4-tracker.js     # Funis de evento invisíveis
4. src/data/ - Persistência Híbrida (Nova Camada)
JavaScript
data/
├── local-storage.js       # Core rápido < 5MB
├── indexed-db.js          # Cache grande < 50MB (Histórico)
├── sqlite-wrapper.js      # sql.js para queries avançadas no client
├── sync-engine.js         # Sincronização offline-first com cloud
└── export-import.js       # Geração/Leitura de JSON
5. src/community/ - O Componente Viral
JavaScript
community/
├── social-feed.js         # Lógica do feed (Twitter-like)
├── gamification.js        # Streaks, badges, níveis
├── leaderboards.js        # Rankings globais anônimos
└── challenges.js          # Desafios mensais (ex: 30-day creatine)
✅ Padrões de Arquitetura Exigidos na v4.0
Injeção de Dependências: Serviços pesados (IA, Sync) devem ser instanciados no core/app.js e injetados para não travar a UI.

Workers para Tarefas Pesadas: Buscas na sqlite ou rodadas do StackRecommender devem usar Web Workers para manter a UI em rígidos 60 FPS.

Internacionalização (i18n) Obrigatória: Nenhuma string fixa na UI. Utilize i18n.t('key') em todos os componentes.

Isolamento de Monetização: A injeção de links de afiliado só ocorre no momento do clique, permitindo renderização veloz dos cards.