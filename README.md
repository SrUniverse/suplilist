# SupliList v2.0
> Guia inteligente de suplementação fitness

O SupliList v2.0 é uma aplicação SPA (Single Page Application) moderna, reativa, responsiva e acessível para o gerenciamento de suplementação alimentar. Projetada sob rígidos padrões de arquitetura com zero variáveis globais, imutabilidade com StateManager, blindagem por barreiras de erro (`ErrorBoundary`), comunicação desacoplada via Pub/Sub (`EventBus`) e validação de dados em 3 camadas.

---

## Início Rápido

Para configurar e rodar o projeto localmente com recarga em tempo real (HMR) e servidor embarcado:

```bash
# 1. Instalar as dependências do projeto
npm install

# 2. Iniciar o servidor de desenvolvimento
npm run dev
```

Abra seu navegador em [http://localhost:5173/](http://localhost:5173/) para explorar o app.

---

## Arquitetura

O sistema adota um padrão arquitetural orientado a eventos e fortemente desacoplado, contendo as seguintes diretrizes fundamentais:

- **Pub/Sub com EventBus Centralizado**: A comunicação entre a camada lógica e os componentes visuais é totalmente orientada a eventos. Nenhum componente invoca outro diretamente.
- **State Management com Persistência Reativa**: Gerenciador de estado global imutável com persistência automática e reativa em `localStorage`.
- **Validação em 3 Camadas**: Segurança rigorosa de dados. Os fluxos de dados de entrada (`input`) são filtrados por esquemas estruturados (`schema`) antes de sofrerem mutações no estado central (`state`).
- **Error Boundaries em todos os Componentes**: Componentes visuais sensíveis são envelopados por barreiras de erro customizadas, isolando e tratando falhas de renderização de forma isolada na UI, sem interromper o restante do aplicativo.
- **Acessibilidade Completa**: Navegação avançada por teclado via Tab, foco `:focus-visible` roxo premium, touch targets de no mínimo 44x44px e imagens descritivas com alt tags correspondentes.

---

## Estrutura do Projeto

Abaixo está o mapeamento detalhado da arquitetura de pastas e arquivos da aplicação v2.0:

```text
suplilist-beta/
├── index.html                  # Shell da SPA com tags SEO, cabeçalho e contêineres principais.
├── package.json                # Configuração do NPM, scripts de tarefas e compiladores.
├── postcss.config.js           # Integração de compilação PostCSS.
├── tailwind.config.js          # Configuração, safelist de injeção dinâmica de UI e tokens visuais.
├── vite.config.js              # Configuração do Vite, sourcemaps e diretivas do empacotador.
├── vitest.config.js            # Configuração do runner de testes automatizados Vitest.
├── database.js                 # Base bruta de dados originais contendo os supplements.
├── tests/                      # Coleção abrangente de testes unitários.
│   └── unit/                   # Testes unitários do EventBus, StateManager, repositórios e esquemas.
└── src/
    ├── css/
    │   ├── design-system.css   # Variáveis de cor, badges de comprovação, outlines e animações.
    │   └── main.css            # Estilos do cabeçalho, botões de navegação superiores e transições.
    ├── data/
    │   └── fallback-state.json # Backup de resiliência caso o localStorage esteja ausente/corrompido.
    └── js/
        ├── main.js             # Fila de boot sequencial do app e orquestração de páginas/abas.
        ├── core/
        │   ├── eventbus.js     # Barramento Pub/Sub estruturado com validação de payloads.
        │   ├── state-manager.js# Gerenciador de estado imutável reativo (deep-cloning).
        │   └── error-boundary.js# Barreira protetora contra quebras de renderização na interface.
        ├── types/
        │   ├── supplement.schema.js # Validador estrito de propriedades do suplemento.
        │   ├── state.schema.js      # Validador estruturado da árvore de estado do app.
        │   └── events.schema.js     # Validador de dados trafegados pelo barramento de eventos.
        ├── utils/
        │   ├── constants.js    # Enums de domínio (Categorias, Objetivos, Marketplace, etc).
        │   ├── logger.js       # Logger customizado e silenciado em modo produção.
        │   ├── validators.js   # Validadores de formatos (slug, datas, etc).
        │   ├── formatters.js   # Formatadores visuais de dinheiro, dose por peso e data relativa.
        │   └── parsers.js      # Decodificadores seguros de strings para números/objetos.
        ├── features/
        │   ├── supplements/    # Repositório de dados, serviço de busca e cache de consultas.
        │   ├── favorites/      # Gerenciamento de itens favoritados com export/import JSON.
        │   ├── inventory/      # Controle físico de estoque, estimativa de dias e alertas.
        │   ├── settings/       # Preferências visuais e comportamentais do usuário.
        │   └── comparator/     # Motor de regras comparativo lado a lado e alertas de sinergia.
        ├── components/
        │   ├── supplement-card.js   # Renderizador de card individual isolado e livre de listeners.
        │   ├── supplement-list.js   # Listagem reativa performática com delegação única de eventos.
        │   ├── supplement-detail.js # Modal de detalhes científicos do suplemento e estoque.
        │   ├── favorites-page.js    # Controlador da página de favoritos (export/import física).
        │   ├── comparator-modal.js  # Janela de comparação lado a lado e alertas de interações.
        │   ├── modal.js             # Componente base de dialogos centralizados (ESC / overlay close).
        │   ├── toast.js             # Sistema de avisos visuais FIFO de até 3 itens simultâneos.
        │   ├── skeleton.js          # Placeholders animados de carregamento de UI.
        │   └── error-card.js        # UI alternativa segura renderizada se um card individual quebrar.
        └── ui/
            ├── search-state.js      # Bridge temporário e síncrono para parâmetros de busca rápidos.
            ├── search-input.js      # Campo de busca debounced (300ms) com reset instantâneo em ESC.
            ├── filter-bar.js        # Painel facetado reativo com sliders de custo máximo e checkboxes.
            └── sort-menu.js         # Abas segmentadas elegantes de ordenação (Custo, Evidência, Nome).
```

---

## Adicionando Suplementos

Todos os suplementos do catálogo são carregados a partir da base estruturada contida em `database.js`. Para adicionar ou atualizar os dados de um suplemento, edite o arquivo `database.js` na raiz do projeto.

Certifique-se de seguir rigorosamente as regras estruturais e tipos esperados para que o suplemento seja validado com sucesso pelo `SupplementSchema`:

1. Abra `database.js`.
2. Localize a constante `IT` que contém o array de suplementos.
3. Insira um novo objeto seguindo a estrutura padrão descrita abaixo:

```javascript
{
  id: "creatina-monohidratada",          // ID/Slug exclusivo estruturado com letras minúsculas e hífen
  name: "Creatina Monohidratada",       // Nome comercial completo para exibição e busca
  category: "Performance",              // Categoria canônica do suplemento
  defaultDose: 5,                       // Dose recomendada padrão (numérico puro)
  unit: "g",                            // Unidade de medida associada (g / mg / ml / caps)
  costPerDose: 1.25,                    // Custo médio por dose estimado em BRL (numérico puro)
  evidenceLevel: "A",                   // Grau científico (A / B / C)
  image: "assets/images/creatine.webp",  // URL ou caminho local da imagem correspondente
  mechanism: "Atua na regeneração rápida de ATP intra-celular...", // Descrição do funcionamento científico
  goals: ["Ganho de Força", "Hipertrofia", "Cognição"], // Objetivos clínicos suportados
  prices: {                             // Menor preço ativo por marketplace
    shopee: 79.90,
    mercadolivre: 84.90,
    amazon: 89.90
  },
  links: {                              // Links específicos de redirecionamento de compra
    shopee: "https://shopee.com.br/...",
    mercadolivre: "https://mercadolivre.com.br/...",
    amazon: "https://amazon.com.br/..."
  },
  interactions: [                       // Lista de interações com outros suplementos
    "Causa sinergia de estimulação com Cafeína",
    "Pode ser consumida junto ao Carboidrato simples para melhor absorção"
  ]
}
```

Ao salvar o arquivo `database.js`, a aplicação recarrega automaticamente as definições enriquecidas. Se qualquer campo estiver fora do tipo ou com formato incorreto (ex: slug contendo espaços, data fora do formato `YYYY-MM-DD` ou valores negativos), o `SupplementSchema` bloqueará o carregamento daquele item com segurança e registrará a inconsistência no painel do desenvolvedor de forma elegante, preservando a saúde da aplicação global.

---

## Scripts

No terminal, execute as seguintes tarefas a partir do diretório raiz:

- **Iniciar Servidor de Desenvolvimento**:
  ```bash
  npm run dev
  ```
  Dispara o Vite Dev Server na porta `5173` com Hot Module Replacement (HMR) ativado.

- **Compilar Pacote de Produção**:
  ```bash
  npm run build
  ```
  Compacta e minifica o código, gerando os bundles altamente otimizados e prontos em `/dist`.

- **Executar Suíte de Testes Unitários**:
  ```bash
  npm test
  ```
  Inicia o runner de testes do Vitest no ambiente JSDOM virtualizado para rodar as validações.
