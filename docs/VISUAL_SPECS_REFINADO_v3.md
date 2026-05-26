# SupliList v3.0 — ESPECIFICAÇÕES VISUAIS REFINADAS
## Baseado nos 5 Screenshots Finais Fornecidos

**Data:** 26 de maio de 2026
**Status:** ✅ PRONTO PARA IMPLEMENTAÇÃO COM PROMPTS

---

## 📸 SCREENSHOTS PROCESSADOS

✅ **home.png** — Landing page + Dashboard (nova)
✅ **lista.png** — Catálogo com 57 suplementos (refinado)
✅ **calculadora.jpg** — Calculadora de dosagem clínica (funcional)
✅ **favoritos.jpg** — Página de favoritos (refinada)
✅ **historico.jpg** — Histórico com métricas (NOVO — era "Receita")

---

## 🎨 DESIGN SYSTEM REFINADO

### CORES (Paleta Atualizada)

**Primárias:**
- `--brand-primary: #A78BFA` (Roxo/Lilás - CTAs principais)
- `--brand-accent: #4F46E5` (Índigo - botões secundários)
- `--brand-green: #10B981` (Verde - status positivo)
- `--brand-red: #EF4444` (Vermelho - urgentes)

**Neutras:**
- `--bg-darkest: #0A0A0A` (Fundo principal)
- `--bg-dark: #1A1A1A` (Cards, inputs)
- `--bg-darker: #2D2D2D` (Hover, borders)
- `--text-primary: #FFFFFF` (Texto principal)
- `--text-secondary: #9CA3AF` (Texto secundário)
- `--border-color: #4B5563` (Borders)

**Especiais:**
- `--success: #10B981` (Verde claro)
- `--warning: #F59E0B` (Laranja)
- `--danger: #EF4444` (Vermelho)
- `--info: #3B82F6` (Azul)

### TIPOGRAFIA

**Font Principal:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif`

**Tamanhos:**
- H1: `2.5rem` (40px) - Títulos principais
- H2: `2rem` (32px) - Subtítulos
- H3: `1.5rem` (24px) - Seções
- Body: `1rem` (16px) - Texto padrão
- Small: `0.875rem` (14px) - Legendas
- Tiny: `0.75rem` (12px) - Notas

**Pesos:**
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700

### ESPAÇAMENTO

- `xs: 4px`
- `sm: 8px`
- `md: 16px`
- `lg: 24px`
- `xl: 32px`
- `2xl: 48px`

### BORDER RADIUS

- `sm: 4px`
- `md: 8px`
- `lg: 12px`
- `xl: 16px`
- `full: 9999px`

---

## 📱 ESTRUTURA DE LAYOUTS

### LAYOUT PRINCIPAL (App Shell)

```
┌─────────────────────────────────────────────────────┐
│ Top Bar (fixa): Logo + Notificações + Perfil        │
├──────────┬────────────────────────────────────────────┤
│          │                                            │
│ Sidebar  │ Main Content Area                          │
│ (200px)  │                                            │
│          │ (responsivo: hidden em mobile)             │
│          │                                            │
└──────────┴────────────────────────────────────────────┘
```

**Sidebar (Esquerda):**
- Logo + "SupliList" (topo)
- 6 rotas principais com icons
- Settings + Support + Account (rodapé)
- Expandível/colapsável em mobile

**Top Bar (Fixo):**
- Breadcrumb à esquerda (Home / Lista / etc)
- Busca + Notificações + Perfil à direita

**Main Content:**
- Padding: `24px` (desktop), `16px` (mobile)
- Max-width: sem limite (full-bleed)
- Responsive: 1 coluna (mobile), 2 colunas (tablet), 3+ (desktop)

---

## 🏠 PÁGINA HOME (Landing + Dashboard)

### Seções Visíveis (conforme home.png)

#### 1. HERO SECTION
```
┌────────────────────────────────────────┐
│ "SUPLEMENTAÇÃO BASEADA EM EVIDÊNCIAS"  │
│ "SUPLEMENTAÇÃO BASEADA EM EVIDÊNCIAS"  │
│                                        │
│ Descrição: "Compre preço, dose e...   │
│            .eficácia"                 │
│                                        │
│ [MONTAR STACK] [CALCULADORA]           │
│                                        │
│ 57+ Suplementos | 500+ Estudos | REO   │
└────────────────────────────────────────┘
```

**Visual:**
- Fundo `--bg-darkest`
- Título em roxo `--brand-primary` grande (H1)
- CTA roxo para "Montar Stack"
- CTA secundário para "Calculadora"
- Stats em linha (números grandes + labels pequenos)

#### 2. SEÇÃO "TUDO QUE VOCÊ PRECISA, JUNTO"
```
3 Cards em linha (desktop), 1 coluna (mobile):
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ ⚡ Compar.   │  │ 📊 Dosagens  │  │ ❤️ Stack Pers│
│ Preços,      │  │ Científicas  │  │ Personalizado│
│ Dose e Efic. │  │              │  │              │
│              │  │              │  │              │
│ [Explorar]   │  │ [Explorar]   │  │ [Explorar]   │
└──────────────┘  └──────────────┘  └──────────────┘
```

**Estilo:**
- Cards com borda roxo/índigo
- Ícones grandes (48px)
- Fundo card: `--bg-dark`
- CTA: roxo `--brand-primary`

#### 3. SEÇÃO "3 PASSOS PARA COMPRAR CERTO"
```
Numeração + Descrição em 3 colunas:
1️⃣ Veja Teus Objetivos
2️⃣ Compare Preços e Dosis
3️⃣ Marque e Compre
```

#### 4. SEÇÃO "FILTRADO POR COMO VOCÊ TREINA"
```
7 categorias em linha:
[Hipertrofia] [Ganho Músculo] [Energia & Foco] 
[Saúde Mental] [Lifespan & Tono] [Sono] [Voz Todos]
```

#### 5. SEÇÃO "OS MAIORES MARKETPLACES"
```
3 logos em linha:
Shopee | Mercado Livre | Amazon
```

#### 6. SEÇÃO "PARE DE ADIVINHAR. COMECE A SUPLEMENTAR COM CIÊNCIA REAL"
```
CTA grande + descrição
[Montar Minha Lista Agora]
```

---

## 📋 PÁGINA LISTA (/list)

### Layout (conforme lista.png)

```
┌─────────────────────────────────────────┐
│ Busca: [Busque por nome, marca...]      │
│                                         │
│ Stats (4 cards em linha):               │
│ [TOTAL: 57] [PENDENTES: 27]             │
│ [COMPRADOS: 0] [URGENTES: 14]           │
│                                         │
│ Categorias (pills): [Todos] [Adapt...] │
│                                         │
│ Grid de Cards (4 colunas):              │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│ │Card1│ │Card2│ │Card3│ │Card4│       │
│ └─────┘ └─────┘ └─────┘ └─────┘       │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│ │Card5│ │Card6│ │Card7│ │Card8│       │
│ └─────┘ └─────┘ └─────┘ └─────┘       │
└─────────────────────────────────────────┘
```

**Stats Cards:**
- 4 cards em linha (2 em tablet, 1 em mobile)
- Background: `--bg-dark`
- Borda: `--border-color`
- Número grande em roxo
- Label pequeno em cinza

**Busca:**
- Input com ícone de busca
- Placeholder: "Busque por nome, marca ou categoria..."
- Debounce: 300ms (fuzzy search Fuse.js)

**Categorias (Pills):**
- "Todos" selecionado por padrão (roxo `--brand-primary`)
- Outras: neutral (cinza)
- Hover: light gray background
- Scroll horizontal em mobile

**Cards de Suplemento:**
- Largura: `calc(25% - 12px)` (4 colunas em desktop)
- Imagem: 100% da largura do card, aspect-ratio 1:1
- Badge nível (superior direito): "NÍVEL A" ou "NÍVEL B"
- Nome + descrição + preço
- Button: "VER MELHORES PREÇOS" (roxo, full-width)
- Hover: brightness aumenta

---

## ❤️ PÁGINA FAVORITOS (/favorites)

### Layout (conforme favoritos.jpg)

```
┌──────────────────────────────────────┐
│ Meus Favoritos                        │
│ [Otimizar Todos] (button roxo)        │
│                                      │
│ Filtros (pills): [Todos] [Hipertrofia]│
│ [Foco & Cognição] [Longevidade]      │
│                                      │
│ Ordenar Por: [Maior Evidência ▼]     │
│                                      │
│ Grid similar a /list                 │
│ Cards com ❤️ filled (red)             │
└──────────────────────────────────────┘
```

**Diferenças vs /list:**
- Botão "Otimizar Todos" no topo (roxo)
- Filtros de objetivo (não categorias)
- Dropdown de ordenação (Maior Evidência, Preço, Dose)
- Cards mostram coração ❤️ filled em vermelho

**Ordenação:**
- "Maior Evidência" (padrão)
- "Menor Preço"
- "Melhor Custo-Dose"

---

## 🧮 PÁGINA DOSAGEM (/dosage)

### Layout (conforme calculadora.jpg)

```
┌────────────────────────────────────┐
│ Calculadora de Dosagem Clínica      │
│                                    │
│ [Lado Esquerdo - Inputs]            │
│ ┌──────────────────────────────┐   │
│ │ DADOS BIOMÉTRICOS            │   │
│ │ Peso (kg): [Ex: 75]           │   │
│ │ Gordura Corporal (%): [15]    │   │
│ │ Nível de Atividade: [Dropdown]│   │
│ └──────────────────────────────┘   │
│                                    │
│ ┌──────────────────────────────┐   │
│ │ SELEÇÃO DE COMPOSTO          │   │
│ │ [Busque: Creatina...]        │   │
│ └──────────────────────────────┘   │
│                                    │
│ [Lado Direito - Resultado]          │
│ ┌──────────────────────────────┐   │
│ │ RESULTADO DA OTIMIZAÇÃO      │   │
│ │                              │   │
│ │ DOSAGEM RECOMENDADA          │   │
│ │ 5.0 g/dia                    │   │
│ │ ✓ Protocolo Validado por Ests│   │
│ │                              │   │
│ │ [+ Adicionar ao Protocolo]   │   │
│ └──────────────────────────────┘   │
│                                    │
│ [Contexto Científico]               │
│ ┌──────────────────────────────┐   │
│ │ Racional da Dosagem          │   │
│ │ [Descrição científica...]    │   │
│ │                              │   │
│ │ Nível de Evidência: [Grau A] │   │
│ │ Segurança Renal: [Alta]      │   │
│ └──────────────────────────────┘   │
└────────────────────────────────────┘
```

**Inputs:**
- Tipo `number` com placeholder "Ex: 75"
- Dropdown com opções: "Sedentário", "Leve", "Moderado", "Intenso"

**Resultado (lado direito):**
- Background: `--bg-dark`
- Número grande em roxo (dosagem em g/dia)
- Badge verde "Protocolo Validado"
- CTA roxo: "+ Adicionar ao Protocolo"

**Contexto Científico:**
- Card separado com background mais claro
- Descrição científica (texto pequeno)
- Grid com "Nível de Evidência" + "Segurança Renal"

---

## 📊 PÁGINA HISTÓRICO (/history) — NOVO!

### Layout (conforme historico.jpg)

```
┌──────────────────────────────────────┐
│ Histórico de Suplementação           │
│ Monitoramento retrospectivo...       │
│                                      │
│ [3 Métricas Principais em Cards]:    │
│ ┌─────────────┐ ┌─────────────┐     │
│ │ 92% ADERÊNCIA│ │ 14 CICLOS   │     │
│ │ (progresso) │ │ CONCLUÍDOS  │     │
│ │             │ │ +2 este trim│     │
│ └─────────────┘ └─────────────┘     │
│ ┌─────────────┐                      │
│ │ R$ 3.450    │                      │
│ │ INVESTIMENTO│                      │
│ │ HISTÓRICO   │                      │
│ └─────────────┘                      │
│                                      │
│ Busca: [Buscar no histórico...]     │
│ Filtros: [Todos] [Aminoácidos]      │
│          [Adaptógenos] [Vitaminas]  │
│                                      │
│ Timeline (lista):                    │
│ ┌─────────────────────────────────┐ │
│ │ 🥢 Creatina Monohidratada       │ │
│ │ AMINOÁCIDO                      │ │
│ │ jan 2024 - Fev 2024             │ │
│ │ ✓ 95% Aderência (57/60 dias)    │ │
│ │                        [Ver Logs] │ │
│ └─────────────────────────────────┘ │
│                                      │
│ ┌─────────────────────────────────┐ │
│ │ 🌿 Ashwagandha KSM-66           │ │
│ │ ADAPTÓGENO                      │ │
│ │ Out 2023 - Dez 2023             │ │
│ │ ✓ 88% Aderência (79/90 dias)    │ │
│ │                        [Ver Logs] │ │
│ └─────────────────────────────────┘ │
│                                      │
│ [Carregar mais ciclos anteriores]   │
└──────────────────────────────────────┘
```

**Cards de Métrica:**
- 3 cards lado a lado (1 coluna em mobile)
- Número grande + label + subtexto
- Ícone à esquerda ou progress bar visual

**Timeline de Ciclos:**
- Cada ciclo é um item em lista (full-width)
- Ícone do suplemento (imagem pequena)
- Nome + categoria
- Data de início - Data de fim
- % de aderência com cor verde (≥90%), amarelo (70-89%), vermelho (<70%)
- Button "Ver Logs" pequeno à direita

**Busca + Filtros:**
- Busca fuzzy pelo nome
- Filtros por categoria (pills)

---

## 💊 PÁGINA MY STACK (/my-stack)

**Status:** Mantém estrutura similar a v2.0 mas com melhorias:

- Relatório visual com custo total
- Cada item mostra: nome, dose, preço/mês
- Botões: "Remover", "Adicionar Dosagem"
- Badges: "Acabando em 10 dias" (amarelo)
- Actions: Exportar, Compartilhar, Imprimir

---

## 🔧 COMPONENTES REUTILIZÁVEIS

### Card
```html
<div class="card">
  <div class="card-header">
    <h3>Título</h3>
  </div>
  <div class="card-body">
    Conteúdo
  </div>
  <div class="card-footer">
    <button>Ação</button>
  </div>
</div>
```

**CSS:**
```css
.card {
  background: var(--bg-dark);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
}
```

### Button
```html
<button class="btn btn-primary">Primário</button>
<button class="btn btn-secondary">Secundário</button>
<button class="btn btn-ghost">Ghost</button>
```

**Variações:**
- Primary: `--brand-primary` background, white text
- Secondary: `--bg-darker` background, white text
- Ghost: transparent background, `--brand-primary` text
- Disabled: opacidade 50%

### Input
```html
<input type="text" class="input" placeholder="...">
<select class="input">
  <option>...</option>
</select>
```

**Estilo:**
- Background: `--bg-darker`
- Border: `1px solid --border-color`
- Text: `--text-primary`
- Placeholder: `--text-secondary`
- Focus: border roxo `--brand-primary`

### Badge
```html
<span class="badge badge-primary">Label</span>
<span class="badge badge-success">Sucesso</span>
<span class="badge badge-warning">Aviso</span>
```

### Stats Card
```html
<div class="stat-card">
  <div class="stat-value">57</div>
  <div class="stat-label">Total</div>
  <div class="stat-chart"><!-- progress circle --></div>
</div>
```

---

## 📐 RESPONSIVIDADE

### Breakpoints
```css
--mobile: max-width: 640px
--tablet: 641px to 1024px
--desktop: 1025px+
```

### Regras
- **Mobile:** 1 coluna, sidebar collapse, cards full-width
- **Tablet:** 2 colunas, sidebar mini, cards 50% width
- **Desktop:** 3-4 colunas, sidebar full, cards 25% width

### Grid Cards
```css
Desktop:  grid-template-columns: repeat(4, 1fr);
Tablet:   grid-template-columns: repeat(2, 1fr);
Mobile:   grid-template-columns: 1fr;
Gap:      var(--space-md) = 16px
```

---

## 🎯 ANIMAÇÕES SUTIS

- Hover cards: `brightness(1.1)` + `transform: translateY(-2px)`
- Button hover: background color change (ease-in-out 200ms)
- Transitions padrão: `all 200ms ease-in-out`

---

## 🔗 INTEGRAÇÃO FINAL

### Links de Afiliado (invisível)
Cada "VER MELHORES PREÇOS" redireciona para:
```
https://suplilist.link/?product_id=X&marketplace=Y&utm_source=suplilist
```

### Analytics Invisível (GA4)
Rastreia:
- Cada click em "VER MELHORES PREÇOS"
- Marketplace escolhido
- Suplemento clicado
- Conversão final (no checkout)

### PWA Notification
- "Creatina acaba em 5 dias. Compre agora."
- Click abre app + linka para suplemento

---

## ✅ CHECKLIST VISUAL FINAL

- ✅ Sidebar colapsável (desktop/mobile)
- ✅ Top bar com breadcrumb
- ✅ Home com landing + dashboard
- ✅ Lista com 57 suplementos + busca + filtros
- ✅ Favoritos com múltiplas ordenações
- ✅ Dosagem com calculadora clínica real
- ✅ Histórico com métricas + timeline
- ✅ My Stack com relatório visual
- ✅ Cores roxo/índigo principais
- ✅ Cards consistentes
- ✅ Buttons roxo primário
- ✅ Responsive (mobile/tablet/desktop)
- ✅ Componentes reutilizáveis
- ✅ Animações sutis

---

## 🚀 PRONTO PARA PROMPTS

Use este documento como referência ao copiar os prompts de implementação.

**Próximo passo:** Cole os prompts da **SUPLILIST_PROMPTS_v3_FINAL.md** com este documento como contexto visual!

---

*Especificações Visuais Refinadas: 26 de maio de 2026 | SupliList v3.0 Design-Ready*
