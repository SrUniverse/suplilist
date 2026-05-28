# SupliList v4.0 ELEVADA — DIAGRAMAS DE ARQUITETURA
## Visualização dos Fluxos de Dados, Camadas Globais e Ecossistema Híbrido

---

## 1️⃣ CAMADAS DE ARQUITETURA DE CLASSE MUNDIAL (Multi-Platform)

┌─────────────────────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER (Multi-Platform)                     │
│   ┌──────────────┬──────────────┬──────────────┬─────────────┬───────┐  │
│   │   Web App    │  Mobile App  │ Desktop App  │ Smart Watch │ AR/VR │  │
│   │   (PWA)      │ (Capacitor)  │ (Electron)   │  (WearOS)   │(WebXR)│  │
│   └──────────────┴──────────────┴──────────────┴─────────────┴───────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│               BUSINESS LOGIC & FEATURES LAYER (Vanilla JS)                │
│   ┌──────────────┬──────────────┬──────────────┬─────────────┬───────┐  │
│   │ IA Engine    │ Affiliate    │ Community    │ Gamification│ Sync  │  │
│   │ (TinyML)     │ Engine (500+)│ Engine       │ Engine      │ Engine│  │
│   └──────────────┴──────────────┴──────────────┴─────────────┴───────┘  │
│   ┌──────────────┬──────────────┬──────────────┬─────────────┬───────┐  │
│   │ Price        │ Dosage       │ Wearables    │ i18n / 150+ │ Export│  │
│   │ Comparator   │ Calculator   │ Integrator   │ Currencies  │ Import│  │
│   └──────────────┴──────────────┴──────────────┴─────────────┴───────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│                 CORE LAYER (Brain, Heart & Compliance)                    │
│   ┌──────────────┬──────────────┬──────────────┬─────────────┬───────┐  │
│   │ eventBus     │ stateManager │ ErrorBoundary│ Compliance  │ Sec   │  │
│   │ (Pub/Sub)    │ (Immutable)  │ (Isolator)   │ (LGPD/GDPR) │ Auth  │  │
│   └──────────────┴──────────────┴──────────────┴─────────────┴───────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│            DATA PERSISTENCE LAYER (Local-First + Hybrid Cloud)            │
│   ┌──────────────┬──────────────┬──────────────┬─────────────┬───────┐  │
│   │ localStorage │ IndexedDB    │ sql.js       │ Service     │ Cloud │  │
│   │ (<5MB Sync)  │ (Offline/50M)│ (SQLite Local) Worker V4   │(Supa.)│  │
│   └──────────────┴──────────────┴──────────────┴─────────────┴───────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│                   EXTERNAL INTEGRATIONS (APIs & IoT)                      │
│        Strava ↔ Whoop ↔ Shopify (500+) ↔ OpenAI ↔ Stripe ↔ GA4            │
└─────────────────────────────────────────────────────────────────────────┘


---

## 2️⃣ FLUXO DE DADOS: IA LOCAL E MOTOR DE RECOMENDAÇÃO

USER ACTION: Preenche Perfil (Objetivo, Peso, Idade, Wearable Data)
│
▼
┌─────────────────────────────────────────────┐
│  State Manager & EventBus                   │
│  - Emite 'user:profileUpdated'              │
└─────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────┐
│  IA Engine (StackRecommender)               │
│  - Executa TinyML 100% no device            │
│  - Analisa 500+ suplementos do SQLite       │
│  - Cruza com biometria + restrições         │
│  - Roda DosageCalculator (Fórmula Clínica)  │
└─────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────┐
│  Affiliate Engine (PriceComparator)         │
│  - Faz fetch real-time em 500+ marketplaces │
│  - Calcula melhor Custo/Dose localmente     │
│  - Injeta UTMs dinamicamente                │
└─────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────┐
│  UI Layer (Web Components)                  │
│  - Renderiza Bento Grid 60fps               │
│  - Mostra Stack, Dosagem Exata e Links      │
└─────────────────────────────────────────────┘


---

## 3️⃣ CICLO DE VIDA HÍBRIDO (Modo Offline → Sync)

┌────────────────────────────────────────────────────────────┐
│                  APP INITIALIZATION v4.0                     │
└────────────────────────────────────────────────────────────┘
│
├─ 1. Load Device Data (Fastest)
│       ├─ Parse LocalStorage / IndexedDB
│       └─ Decrypt Data (E2E)
│
├─ 2. Service Worker Check
│       └─ Serve App Shell do Cache (FCP <0.3s)
│
├─ 3. Background Sync (Se Modo Cloud Ativo)
│       ├─ Conecta via WebSockets com Supabase/Firestore
│       ├─ Resolve conflitos de versão (CRDTs / Timestamps)
│       └─ Atualiza Feed da Comunidade
│
└─ 4. Initialize Hardware APIs
├─ Conecta Wearables (Apple Health, Garmin, Whoop)
└─ Puxa dados de HRV / Sleep


---

## 4️⃣ MAPA DE EVENTOS EXPANDIDO (Pub/Sub Global)

ALL EVENTS VALIDATE PAYLOAD AGAINST events.schema.js

PRODUCERS               SUBSCRIBERS           CONSUMERS
─────────              ─────────────           ──────────

┌─────────────┐        ┌─────────────┐       ┌──────────┐
│ Wearables:  │───────▶│ "biometria: │──────▶│ IA Engine│
│ Novo Sync   │        │  updated"   │       │ (Recalcula│
└─────────────┘        └─────────────┘       │ Dosagem) │
                                             └──────────┘
┌─────────────┐        ┌─────────────┐       ┌──────────┐
│ Community:  │───────▶│ "social:    │──────▶│ Push Not │
│ Novo Like   │        │  interaction│       │ Service  │
└─────────────┘        └─────────────┘       └──────────┘

┌─────────────┐        ┌─────────────┐       ┌──────────┐
│ Price API:  │───────▶│ "price:     │──────▶│ Affiliate│
│ Preço Caiu  │        │  dropped"   │       │ Engine   │
└─────────────┘        └─────────────┘       └──────────┘

┌─────────────┐        ┌─────────────┐       ┌──────────┐
│ Stripe:     │───────▶│ "premium:   │──────▶│ State    │
│ Assinatura  │        │  unlocked"  │       │ Manager  │
└─────────────┘        └─────────────┘       └──────────┘

---

## 5️⃣ ERROR BOUNDARIES & COMPLIANCE

┌─────────────────────────────────────────────────────────┐
│ AppState (valid + immutable + encrypted)                │
├─────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐   ┌──────────────────────┐   │
│ │ WearableWidget.js    │   │ SocialFeed.js        │   │
│ │ try { sync() }       │   │ try { loadPosts() }  │   │
│ │ catch (err) {        │   │ catch (err) {        │   │
│ │  return ErrorCard    │   │  return OfflineCard  │   │
│ │ }                    │   │ }                    │   │
│ └──────────────────────┘   └──────────────────────┘   │
└─────────────────────────────────────────────────────────┘

A página continua 100% responsiva, isolando a falha do wearable

Logs são anonimizados para seguir GDPR/LGPD antes de ir ao Sentry.