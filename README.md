# SupliList

**Marketplace inteligente de suplementos.** Compare preços, doses e eficácia científica em um só lugar — sem cadastro, sem instalação, direto no navegador.

🔗 [suplilist.com](https://suplilist.com)

---

## O que é

O SupliList é uma aplicação web que centraliza informações sobre suplementação: preços nos três principais marketplaces brasileiros (Shopee, Mercado Livre e Amazon), dosagens baseadas em evidências científicas, alertas de interações e ferramentas de planejamento. Tudo salvo localmente no dispositivo, sem servidor, sem conta.

---

## Funcionalidades

### Lista de Suplementos

- 56+ suplementos catalogados com prioridade, categoria e tags
- Filtros por objetivo (Hipertrofia, Queima de Gordura, Energia & Foco, Saúde Geral, Libido & Testo, Sono, Mulher)
- Busca fuzzy com Fuse.js — encontra por nome, benefício ou categoria
- Ordenação por prioridade, nome, preço ou eficácia
- Marcar como comprado, anotar observações, expandir detalhes
- Progresso visual da lista com percentual de conclusão
- Confete ao completar todos os itens

### Comparação de Preços

- Preços simultâneos nos 3 marketplaces por item
- Custo por dose diária calculado automaticamente
- Links diretos de afiliado para cada marketplace
- Cache de preços com TTL de 60 minutos e botão de atualização manual

### Minha Stack

- Monitoramento dos suplementos em uso
- Custo mensal estimado do stack completo
- Controle de ciclos com datas de início, pausa e notas
- Alertas de fim de ciclo e dias restantes

### Calculadora de Dose

- Doses baseadas em estudos científicos
- Ajuste pelo peso corporal
- Faixas de dosagem (mínima, ideal, máxima)
- Avisos de segurança por suplemento

### Gerador de Receita

- Seleção de múltiplos suplementos
- Geração de protocolo de uso (pré-treino, manhã, noite)
- Timeline visual de administração
- Alertas de interações na receita
- Cópia para área de transferência

### Comparador de Ingredientes

- Comparação lado a lado de até N suplementos
- Tabela com dose, preço por dose, eficácia e categoria
- Gráfico de barras de gasto mensal por suplemento

### Favoritos

- Lista de suplementos marcados com ❤️
- Undo em tempo real ao remover

### Histórico de Compras

- Registro manual de compras com data e preço
- Gráfico de gastos mensais
- Ranking dos suplementos mais comprados

### Interações & Sinergias

- Alertas de combinações perigosas
- Combos que potencializam resultados
- Verificação automática ao montar o stack

### Exportação

- `.txt` formatado com toda a lista e preços
- `.json` com estado completo do app
- Cópia para clipboard com um clique

---

## Temas

10 temas visuais disponíveis:

| Tema          | Cor de acento           |
| ------------- | ----------------------- |
| Dark (padrão) | Verde `#00ff87`         |
| Light         | Verde escuro `#008c5a`  |
| Midnight      | Índigo `#818cf8`        |
| Forest        | Verde `#4ade80`         |
| Sunset        | Laranja `#fb923c`       |
| Ocean         | Azul `#38bdf8`          |
| Rose          | Rosa `#f472b6`          |
| Volcano       | Laranja forte `#ff6b2b` |
| Neon          | Verde neon `#39ff14`    |
| Aurora        | Violeta `#a78bfa`       |

---

## Estrutura de Arquivos

```
suplilist/
├── index.html        # Estrutura HTML, páginas e modais
├── styles.css        # Sistema de design completo (temas, componentes, layout)
├── scripts.js        # Lógica da aplicação, estado, renderização
├── data.js           # Banco de dados dos suplementos e APP_VERSION
├── links.js          # Links de afiliado por suplemento e marketplace
├── favicon.svg       # Ícone do site
└── assets/
    ├── noise.png     # Textura de fundo (256×256, 8-bit gray)
    └── og-image.jpg  # Imagem para Open Graph / Twitter Card
```

---

## Arquitetura

Aplicação vanilla — sem framework, sem build step, sem dependências de backend.

**Estado global (`S`)** — objeto único em memória com toda a sessão do usuário: itens marcados, notas, stack, favoritos, histórico, configurações e tema. Persistido via `localStorage` com a chave `suplilist_v3`.

**Renderização** — funções `render*()` reescrevem o `innerHTML` das seções relevantes a cada interação. Não há virtual DOM.

**Migração de dados** — `runMigrations(d, oldV, newV)` em `scripts.js` garante compatibilidade entre versões do schema salvo no disco.

**Busca** — [Fuse.js 7](https://fusejs.io/) com threshold `0.3` sobre os campos `name` e `tags` de cada suplemento.

**Roteamento** — hash-based (`#lista`, `#stack`, etc.) com `history.pushState` e listener de `popstate` para navegação pelo botão Voltar do browser.

---

## Dependências externas

| Lib                                                                | Versão | Uso                              |
| ------------------------------------------------------------------ | ------ | -------------------------------- |
| [Fuse.js](https://fusejs.io/)                                      | 7.0.0  | Busca fuzzy na lista             |
| [Bebas Neue](https://fonts.google.com/specimen/Bebas+Neue)         | —      | Tipografia display               |
| [Barlow](https://fonts.google.com/specimen/Barlow)                 | —      | Tipografia corpo                 |
| [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) | —      | Tipografia mono (preços, badges) |

Sem frameworks CSS. Sem jQuery. Sem bundler.

---

## Configurações disponíveis

Acessíveis em **Config → Visual / Comportamento**:

- Estrelas de eficácia por suplemento
- Preço por dose visível na lista
- Confete ao completar a lista
- Exibir itens de prioridade Extra
- Exibir itens já comprados
- Alertas de interação no stack
- Alertas de ciclo
- Toasts de ações
- Ordenação padrão (Prioridade / Nome / Preço / Eficácia)
- Expandir item ao clicar
- Confirmar ao desmarcar comprado
- Salvamento automático

---

## Acessibilidade

- Skip link para conteúdo principal
- Roles ARIA em modais, tabs e navegação (`role="dialog"`, `role="tab"`, `aria-selected`, `aria-expanded`)
- `prefers-reduced-motion`: todas as animações e transições desativadas
- Contraste WCAG AA nos textos principais em todos os temas
- Área de clique mínima de 44px nos componentes interativos
- Navegação por teclado com `focus-visible`

---

## Como rodar localmente

Não há build. Basta servir os arquivos estáticos:

```bash
# Com Python
python -m http.server 5500

# Com Node
npx serve .

# Com VS Code
# instale a extensão Live Server e clique em "Go Live"
```

Acesse `http://localhost:5500`.

> Os links de afiliado em `links.js` apontam para ofertas externas nos marketplaces. O SupliList não processa pagamentos nem armazena dados em servidor.

---

## Aviso legal

O SupliList contém links de afiliados. Ao comprar via esses links, o site pode receber uma comissão sem custo adicional ao comprador. As informações de dosagem e eficácia são de caráter educacional — consulte um profissional de saúde antes de iniciar qualquer suplementação.
