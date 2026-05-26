# SupliList v3.0 — PROMPTS VISUAIS (Alinhados com Screenshots)
## Referência Visual: 6 screenshots confirmados como target de design

**Atualizado:** 25 de maio de 2026  
**Fonte Visual:** Favorites, Dosage Calculator, History, Lista, Landing (screenshots reais)

> ⚠️ ESTE ARQUIVO substitui SUPLILIST_PROMPTS_v3_FINAL.md nas seções de design/layout.
> As screenshots confirmam detalhes que diferem do documento original — use ESTE como verdade de UI.

---

## ⚠️ CONTEXTO GLOBAL v3.0 (ATUALIZADO com screenshots)

> Cole SEMPRE no início de cada sessão antes de qualquer prompt.

```
Você está trabalhando no SupliList v3.0 — redesign completo do app de suplementação.

REFERÊNCIAS VISUAIS CONFIRMADAS (screenshots reais do produto):
- favorites-page: sidebar escura 220px, cards com imagem real de suplemento, badge NÍVEL A/B, 
  botões "Detalhes" outline + "Comprar" roxo, tabs filtro no topo, dropdown "Maior Evidência"
- dosage-calculator: layout 2-col, painel esquerdo formulário, painel direito resultado grande,
  toggle Manutenção/Carga, "5.0 g/dia" em destaque enorme, barras de Evidência e Segurança
- history-page: 3 metric-cards no topo (adesão%, ciclos, R$), lista de ciclos com foto, badge 
  categoria colorido, barra de adesão roxa, ícones de notificação/dashboard/perfil no topbar
- list-page (lista.png): sidebar esquerda com itens incluindo Receita/Dosagem/Comparar,
  4 stat-cards (Total/Pendentes/Comprados/Urgentes) com donut charts, cards com imagem REAL 
  grande, preço em roxo + riscado, "R$ X,XX / DOSE" em subtítulo, botão "VER MELHORES PREÇOS"
- landing (home.png): hero headline gradiente branco→roxo, 2 CTAs, stats animados, seção 
  features 3-col com card central destacado, how-it-works 3-col com número grande de fundo,
  grid objetivos 4x2, logos marketplaces, CTA final dark, ticker horizontal de suplementos

DIFERENÇAS IMPORTANTES ENTRE SCREENSHOTS E DOCUMENTO ANTIGO:
1. Sidebar da lista tem 7 itens: Início, Lista, Minha Stack, Favoritos, Receita, Dosagem, Comparar
   (NÃO apenas 6 como no doc anterior — Receita é nova, Comparar é separado)
2. Cards da lista têm imagem REAL de suplemento (foto produto), não placeholder cinza
3. Preços na lista: valor em roxo bold + valor original riscado em cinza + "R$ X / DOSE" abaixo
4. Botão da lista: "VER MELHORES PREÇOS" (uppercase, bloco inteiro do card)
5. Stats da lista com donut-chart animado (SVG), não apenas número
6. Sidebar da lista tem badge numérico em "Lista" (53) e "Minha Stack" (3)
7. History: topbar sem logo texto, apenas ícones: 🔔 📊 👤 (sem breadcrumb escrito)
8. Dosage: sidebar mostra "Suplilist Pro / CLINICAL ACCESS" no topo — variante premium
9. Favorites: logo "Suplilist / Precision Management" no sidebar — variante clean
10. Lista: footer com © 2024, links Privacidade | Termos | API | Github
11. Ticker horizontal de suplementos na landing (scrolling marquee animado)

ARQUITETURA (mantida):
- Zero frameworks pesados (Vanilla JS modular)
- Pub/Sub reativo (EventBus + StateManager)
- Tolerância a falhas (ErrorBoundary em TUDO)
- PWA nativo (offline, install-to-homescreen)
- Analytics GA4 invisível
- Compliance legal

DESIGN TOKENS (confirmados pelos screenshots):
--bg-base: #0a0a0a       /* fundo geral */
--bg-sidebar: #111111    /* sidebar */
--bg-card: #161616       /* cards */
--bg-surface: #1a1a1a   /* superfícies */
--bg-elevated: #222222   /* elevated */
--brand: #7c3aed         /* roxo primário */
--brand-light: #a855f7   /* roxo claro hover */
--success: #22c55e       /* verde adesão */
--warning: #f59e0b       /* amarelo urgente */
--danger: #ef4444        /* vermelho */
--t1: #f4f4f5            /* texto primário */
--t2: #a1a1aa            /* texto secundário */
--t3: #71717a            /* texto terciário */
--border: rgba(255,255,255,0.06)
--sidebar-width: 220px
--topbar-height: 60px

SIDEBAR (v3 final — 7 itens confirmados pela lista.png):
⊞ Início      → /#/home
≡ Lista       → /#/list     (badge: "53")
◇ Minha Stack → /#/my-stack (badge: "3")
♡ Favoritos   → /#/favorites
📄 Receita    → /#/recipe   (NOVO)
⚖ Dosagem    → /#/dosage
⚖ Comparar   → /#/compare  (SEPARADO de dosagem)

Bottom da sidebar:
- "Todas as alterações foram salvas!" (status verde pulsante)
- Botão "🌐 TEMA" (toggle de tema — futuro)
```

---

# FASE 1 — DESIGN SYSTEM + PWA

## PROMPT 1.1 — `design-system.css` ✅ (sem mudança estrutural)

> Igual ao prompt original. Tokens confirmados pelos screenshots.
> Ver SUPLILIST_PROMPTS_v3_FINAL.md → PROMPT 1.1

**Atenção extra:** Adicionar estes tokens que ficaram evidentes nas screenshots:

```css
/* ADICIONAIS confirmados pelos screenshots */

/* Badge de nível */
.badge-nivel-a {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.3);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
/* .badge-nivel-a::before { content: "△"; } */

.badge-nivel-b {
  background: rgba(124, 58, 237, 0.15);
  color: #a855f7;
  border: 1px solid rgba(124, 58, 237, 0.3);
  /* mesma estrutura */
}

/* Badge de categoria (history + list) */
.badge-category {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--border);
  color: var(--t2);
  background: var(--bg-surface);
}

/* Donut chart SVG (stats na lista) */
.stat-donut {
  width: 56px;
  height: 56px;
  position: relative;
}
.stat-donut circle {
  fill: none;
  stroke-width: 4;
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: center;
}
.stat-donut .track { stroke: var(--bg-elevated); }
.stat-donut .fill-brand { stroke: var(--brand); }
.stat-donut .fill-success { stroke: var(--success); }
.stat-donut .fill-danger { stroke: var(--danger); }

/* Preço riscado (original) */
.price-original {
  font-size: 12px;
  color: var(--t3);
  text-decoration: line-through;
  margin-left: 6px;
}

/* Ticker marquee (landing) */
.ticker-wrap {
  overflow: hidden;
  white-space: nowrap;
  padding: 12px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}
.ticker-inner {
  display: inline-block;
  animation: ticker-scroll 40s linear infinite;
}
@keyframes ticker-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
```

---

## PROMPT 1.2 — `main.css` (ATUALIZADO com insights das screenshots)

```
Reescreva src/css/main.css para o SupliList v3.0.

LAYOUT BASE (confirmado pelas screenshots):

/* === APP SHELL === */
html, body { height: 100%; margin: 0; overflow: hidden; background: #0a0a0a; }
#app-shell {
  display: flex;
  height: 100vh;
  background: var(--bg-base);
  font-family: 'Inter', sans-serif;
}

/* === SIDEBAR === */
#sidebar {
  width: 220px;
  height: 100vh;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 20px 12px;
  flex-shrink: 0;
  overflow-y: auto;
  position: relative;
}

.sidebar-logo {
  font-size: 18px;
  font-weight: 700;
  color: var(--t1);
  margin-bottom: 4px;
  padding: 0 8px;
}
.sidebar-subtitle {
  font-size: 10px;
  font-weight: 500;
  color: var(--t3);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 0 8px;
  margin-bottom: 24px;
}

/* Nav items */
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--t2);
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
  position: relative;
  margin-bottom: 2px;
}
.nav-item:hover { background: var(--bg-surface); color: var(--t1); }
.nav-item.active {
  background: rgba(124, 58, 237, 0.12);
  color: #a855f7;
  border-left: 2px solid var(--brand);
  padding-left: 10px; /* compensate border */
}
.nav-badge {
  margin-left: auto;
  background: var(--bg-elevated);
  color: var(--t2);
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 10px;
}

/* Sidebar bottom */
.sidebar-bottom {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}
.sidebar-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--t3);
  padding: 8px 12px;
}
.sidebar-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--success);
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.btn-theme {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--t2);
  font-size: 13px;
  cursor: pointer;
  margin-top: 8px;
  transition: background 0.15s;
}
.btn-theme:hover { background: var(--bg-surface); color: var(--t1); }

/* === TOP BAR === */
#top-bar {
  height: 60px;
  background: var(--bg-base);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  flex-shrink: 0;
}
.topbar-icons {
  display: flex;
  gap: 8px;
  align-items: center;
}
.btn-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--t2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: background 0.15s, color 0.15s;
}
.btn-icon:hover { background: var(--bg-surface); color: var(--t1); }

/* === PAGE CONTENT === */
#page-content {
  flex: 1;
  overflow-y: auto;
  padding: 28px;
  scrollbar-width: thin;
  scrollbar-color: var(--bg-elevated) transparent;
}

/* === SUPPLEMENT CARDS (lista.png) === */
.supplement-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
@media (max-width: 1400px) { .supplement-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 960px)  { .supplement-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px)  { .supplement-grid { grid-template-columns: 1fr; } }

.supplement-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  display: flex;
  flex-direction: column;
}
.supplement-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 32px rgba(0,0,0,0.5);
  border-color: rgba(255,255,255,0.12);
}

/* Imagem REAL do suplemento (confirmado por lista.png e favorites) */
.card-image-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1; /* quadrada conforme lista.png */
  background: var(--bg-surface);
  overflow: hidden;
}
.card-image-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Badge NÍVEL posicionado no canto da imagem */
.card-level-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 3px 8px;
  border-radius: 4px;
}
.card-level-badge.nivel-a { background: #22c55e; color: #000; }
.card-level-badge.nivel-b { background: var(--brand); color: #fff; }
.card-level-badge.nivel-c { background: var(--bg-elevated); color: var(--t2); border: 1px solid var(--border); }

.card-body {
  padding: 14px;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.card-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--t1);
  margin-bottom: 6px;
  line-height: 1.3;
}

/* Preço: roxo bold + riscado cinza (confirmado lista.png) */
.card-price-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 4px;
}
.card-price-main {
  font-size: 20px;
  font-weight: 700;
  color: var(--brand-light); /* roxo vivo */
}
.card-price-original {
  font-size: 12px;
  color: var(--t3);
  text-decoration: line-through;
}
.card-price-dose {
  font-size: 12px;
  color: var(--t3);
  margin-bottom: 12px;
}

/* Botão "VER MELHORES PREÇOS" — ocupa largura total, uppercase */
.btn-card-primary {
  width: 100%;
  padding: 12px;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
  margin-top: auto;
  transition: background 0.15s;
}
.btn-card-primary:hover { background: var(--brand-light); }

/* === STAT CARDS (topo da list page) === */
.page-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}
@media (max-width: 960px) { .page-stats { grid-template-columns: repeat(2, 1fr); } }

.stat-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.stat-card-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--t3);
  margin-bottom: 4px;
}
.stat-card-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--t1);
  line-height: 1;
}
.stat-card-value.danger { color: var(--danger); }
.stat-card-value.success { color: var(--success); }

/* === FAVORITES PAGE (image_94f403.jpg) === */
.favorites-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.btn-otimizar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: transparent;
  color: var(--t1);
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-otimizar:hover { background: var(--bg-surface); }

/* Favorito card (2-col, imagem quadrada) */
.favorites-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
@media (max-width: 640px) { .favorites-grid { grid-template-columns: 1fr; } }

.favorite-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
}
.favorite-card .card-image-wrap {
  aspect-ratio: 16/9; /* landscape na fav page, conforme screenshots */
  position: relative;
}
.favorite-card .fav-heart-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0,0,0,0.5);
  border: none;
  color: var(--brand-light);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Row preço no favorite card */
.fav-card-body { padding: 16px; }
.fav-price-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.fav-price-label { font-size: 11px; color: var(--t3); text-transform: uppercase; }
.fav-marketplace-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 3px;
  margin-left: auto;
}
.fav-marketplace-badge.shopee { background: #f97316; color: #fff; }
.fav-marketplace-badge.ml { background: #eab308; color: #000; }
.fav-marketplace-badge.amazon { background: #f59e0b; color: #000; }

.fav-price-value { font-size: 22px; font-weight: 700; color: var(--t1); }
.fav-price-value sup { font-size: 14px; }
.fav-price-unit { font-size: 12px; color: var(--t3); }

.fav-action-row {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}
.btn-detalhes {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--t1);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-detalhes:hover { background: var(--bg-surface); }
.btn-comprar {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  border: none;
  background: var(--brand);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-comprar:hover { background: var(--brand-light); }

/* === HISTORY PAGE (image_94f7a8.jpg) === */
.history-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 28px;
}
@media (max-width: 900px) { .history-metrics { grid-template-columns: 1fr; } }

.metric-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.metric-icon-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--t2);
}
.metric-value {
  font-size: 36px;
  font-weight: 700;
  color: var(--t1);
  line-height: 1;
}
.metric-value span.unit { font-size: 20px; color: var(--t3); }
.metric-subtitle {
  font-size: 12px;
  color: var(--t3);
}
.metric-subtitle.success { color: var(--success); }
.adherence-bar {
  height: 6px;
  background: var(--bg-elevated);
  border-radius: 3px;
  overflow: hidden;
  margin-top: 4px;
}
.adherence-fill {
  height: 100%;
  border-radius: 3px;
  background: var(--brand);
  transition: width 0.8s ease;
}

/* Cycle item list */
.cycle-list { display: flex; flex-direction: column; gap: 12px; }
.cycle-item {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}
.cycle-item-image {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  background: var(--bg-surface);
  object-fit: cover;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--t3);
  font-size: 20px;
}
.cycle-item-info { flex: 1; min-width: 0; }
.cycle-item-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--t1);
  margin-bottom: 4px;
}
.cycle-item-period {
  font-size: 12px;
  color: var(--t3);
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
}
.cycle-adherence {
  font-size: 12px;
  font-weight: 600;
}
.cycle-adherence.good { color: var(--success); }
.cycle-adherence.ok { color: var(--warning); }
.cycle-adherence.bad { color: var(--danger); }
.btn-ver-logs {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--t2);
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
  display: flex;
  align-items: center;
  gap: 6px;
}
.btn-ver-logs:hover { background: var(--bg-surface); color: var(--t1); }

/* Botão carregar mais */
.btn-load-more {
  width: 100%;
  padding: 14px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--t2);
  font-size: 14px;
  cursor: pointer;
  margin-top: 16px;
  transition: background 0.15s;
  text-align: center;
}
.btn-load-more:hover { background: var(--bg-surface); color: var(--t1); }

/* === DOSAGE CALCULATOR (image_94e0e0.jpg) === */
.dosage-layout {
  display: grid;
  grid-template-columns: 1fr 1.6fr;
  gap: 24px;
  align-items: start;
}
@media (max-width: 900px) { .dosage-layout { grid-template-columns: 1fr; } }

.dosage-panel {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
}
.dosage-panel-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--brand-light);
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.dosage-input-group { margin-bottom: 18px; }
.dosage-input-group label {
  display: block;
  font-size: 13px;
  color: var(--t2);
  margin-bottom: 6px;
}
.dosage-input-group input,
.dosage-input-group select {
  width: 100%;
  padding: 12px 14px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--t1);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.dosage-input-group input:focus,
.dosage-input-group select:focus {
  border-color: var(--brand);
}
.dosage-input-group input::placeholder { color: var(--t3); }

/* Resultado da dosagem */
.dosage-result-panel {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 28px;
  margin-bottom: 16px;
}
.dosage-mode-toggle {
  display: flex;
  gap: 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 28px;
  float: right;
}
.dosage-mode-btn {
  padding: 8px 16px;
  background: transparent;
  border: none;
  color: var(--t2);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.dosage-mode-btn.active { background: var(--bg-elevated); color: var(--t1); }

.dosage-value-block { text-align: center; padding: 20px 0; }
.dosage-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--t3);
  margin-bottom: 12px;
}
.dosage-big-value {
  font-size: 72px;
  font-weight: 700;
  color: var(--t1);
  line-height: 1;
}
.dosage-big-unit { font-size: 24px; color: var(--t3); }
.dosage-validated {
  font-size: 13px;
  color: var(--success);
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: center;
  margin-top: 12px;
}
.btn-add-protocol {
  width: 100%;
  padding: 14px;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 20px;
  transition: background 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.btn-add-protocol:hover { background: var(--brand-light); }

/* Contexto científico */
.science-context {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
}
.science-context-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--brand-light);
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.science-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.science-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px;
}
.science-card-title { font-size: 13px; font-weight: 600; color: var(--t1); margin-bottom: 6px; }
.science-card-text { font-size: 12px; color: var(--t2); line-height: 1.5; }
.evidence-bar-wrap { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.evidence-label { font-size: 12px; color: var(--t2); }
.evidence-value { font-size: 12px; font-weight: 600; color: var(--success); }
.evidence-bar {
  height: 4px;
  background: var(--bg-elevated);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 10px;
}
.evidence-fill { height: 100%; background: var(--success); border-radius: 2px; }

/* === FOOTER (lista.png confirma) === */
.app-footer {
  border-top: 1px solid var(--border);
  padding: 16px 28px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}
.footer-brand {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--t3);
}
.footer-links {
  display: flex;
  gap: 16px;
}
.footer-links a {
  font-size: 12px;
  color: var(--t3);
  text-decoration: none;
  transition: color 0.15s;
}
.footer-links a:hover { color: var(--t1); }

/* === TAB FILTERS (reutilizável) === */
.tab-filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}
.tab-btn {
  padding: 7px 16px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--t2);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}
.tab-btn.active {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
}
.tab-btn:hover:not(.active) { background: var(--bg-surface); color: var(--t1); }

/* === DROPDOWN SORT === */
.sort-dropdown-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--t3);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.sort-dropdown {
  padding: 7px 32px 7px 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--t1);
  font-size: 13px;
  appearance: none;
  cursor: pointer;
  background-image: url("data:image/svg+xml,...");
  background-repeat: no-repeat;
  background-position: right 10px center;
}

/* === SEARCH INPUT === */
.search-wrap {
  position: relative;
  flex: 1;
  max-width: 400px;
}
.search-wrap svg {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--t3);
  width: 16px;
  height: 16px;
}
.search-input {
  width: 100%;
  padding: 10px 14px 10px 38px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--t1);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.search-input:focus { border-color: var(--brand); }
.search-input::placeholder { color: var(--t3); }

/* Mobile */
@media (max-width: 768px) {
  #sidebar {
    position: fixed;
    left: 0; top: 0;
    height: 100vh;
    z-index: 200;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
  }
  #sidebar.open { transform: translateX(0); }
  #page-content { padding: 16px; }
  .dosage-layout { grid-template-columns: 1fr; }
  .page-stats { grid-template-columns: repeat(2, 1fr); }
}
```

---

## PROMPT 1.3 — PWA Config ✅
> Sem mudanças em relação ao SUPLILIST_PROMPTS_v3_FINAL.md → PROMPT 1.3

---

# FASE 2 — ROUTER + SHELL

## PROMPT 2.1 — `page-router.js` ✅
> Sem mudanças. Ver SUPLILIST_PROMPTS_v3_FINAL.md → PROMPT 2.1

---

## PROMPT 2.2 — `app.html` (ATUALIZADO com sidebar 7 itens + footer confirmado)

```
Reescreva app.html — app shell com sidebar 7 itens + footer confirmado.

MUDANÇAS em relação ao doc anterior:
1. Sidebar com 7 itens (não 6): Home, List, My Stack, Favorites, RECEITA (novo), Dosagem, Comparar
2. Footer: "SUPLILIST" uppercase + links Privacidade | Termos | API | Github
3. Body: opacity 0 → 1 em JS após load
4. Topbar: apenas ícones (🔔 📊 👤), sem logo repetido

HTML estrutural:
<div id="app-shell">
  <aside id="sidebar">
    <div class="sidebar-logo-wrap">
      <div class="sidebar-logo">Suplilist</div>
      <div class="sidebar-subtitle">Precision Management</div>
    </div>
    <nav id="sidebar-nav">
      <!-- injetado por sidebar-nav.js -->
    </nav>
    <div class="sidebar-bottom">
      <div class="sidebar-status">
        <span class="sidebar-status-dot"></span>
        Todas as alterações foram salvas!
      </div>
      <button class="btn-theme">🌐 TEMA</button>
    </div>
  </aside>
  <div id="app-main">
    <header id="top-bar">
      <div class="topbar-left">
        <!-- breadcrumb opcional por rota -->
      </div>
      <div class="topbar-icons">
        <button class="btn-icon" id="btn-notifications" aria-label="Notificações">🔔</button>
        <button class="btn-icon" id="btn-dashboard" aria-label="Dashboard">📊</button>
        <button class="btn-icon" id="btn-profile" aria-label="Perfil">👤</button>
      </div>
    </header>
    <main id="page-content"></main>
    <footer class="app-footer">
      <span class="footer-brand">SUPLILIST</span>
      <div class="footer-links">
        <a href="/legal#privacy">Privacidade</a>
        <a href="/legal#terms">Termos</a>
        <a href="/api">API</a>
        <a href="https://github.com/suplilist" target="_blank">Github</a>
      </div>
    </footer>
  </div>
</div>
```

---

## PROMPT 2.3 — `sidebar-nav.js` (ATUALIZADO — 7 itens)

```
Reescreva sidebar-nav.js com 7 itens conforme lista.png.

NAV_ITEMS = [
  { id: 'home',      icon: '⊞',  label: 'Início',      route: '/#/home' },
  { id: 'list',      icon: '≡',  label: 'Lista',       route: '/#/list',      badge: 53 },
  { id: 'my-stack',  icon: '◇',  label: 'Minha Stack', route: '/#/my-stack',  badge: 3 },
  { id: 'favorites', icon: '♡',  label: 'Favoritos',   route: '/#/favorites' },
  { id: 'recipe',    icon: '📄', label: 'Receita',     route: '/#/recipe' },   // NOVO
  { id: 'dosage',    icon: '⚖',  label: 'Dosagem',     route: '/#/dosage' },
  { id: 'compare',   icon: '⚖',  label: 'Comparar',    route: '/#/compare' }, // SEPARADO
]

// Badge dinâmico: "Lista" usa supplements.length, "Minha Stack" usa stack.items.length
```

---

## PROMPT 2.4 — `top-bar.js` ✅
> Topbar sem breadcrumb escrito na history page. Manter flexível: mostrar breadcrumb apenas
> nas páginas que têm (favorites.png tem "Home / Favoritos"), omitir nas que não têm (history).

---

# FASE 3 — PÁGINAS DE CONTEÚDO

## PROMPT 3.1 — `list-page.js` (ATUALIZADO com detalhes visuais de lista.png)

```
Crie src/js/components/list-page.js exatamente conforme lista.png.

LAYOUT EXATO (lista.png):

TOPO: 4 stat-cards com donut SVG
┌─────────────────────────────────────────────────────────┐
│ TOTAL 57  ○  │ PENDENTES 27 ○ │ COMPRADOS 0 ○ │ ⚠URGENTES 14 ○ │
└─────────────────────────────────────────────────────────┘

BUSCA + FILTROS:
[🔍 Busque por nome, marca ou categoria...]    [⫶ Filtros]

TABS:
[● Todos] [Adaptógeno] [Hormônio] [Aminoácido] [Mineral] [Saúde Geral] [Digital]

GRID 4 colunas:
┌──────────────────┐ ┌──────────────────┐
│  [NÍVEL A] badge │ │  [NÍVEL B] badge │
│  [imagem real]   │ │  [imagem real]   │
│  Nome do Supl    │ │  Nome do Supl    │
│  R$ 76  R$95     │ │  R$ 45  R$59     │
│  R$ 2,50/DOSE    │ │  R$ 1,50/DOSE    │
│ [VER MELHORES    │ │ [VER MELHORES    │
│    PREÇOS]       │ │    PREÇOS]       │
└──────────────────┘ └──────────────────┘

FOOTER da página:
"SUPLILIST" | © 2024 — Powered by Evidence & Obsidian Design
Privacidade | Termos | API | Github

DONUT CHART (SVG inline):
<svg class="stat-donut" viewBox="0 0 56 56">
  <circle class="track" cx="28" cy="28" r="22" />
  <circle class="fill-brand" cx="28" cy="28" r="22"
    stroke-dasharray="[comprimento × percentual] [circumference]" />
</svg>
circumference = 2π × 22 = ~138.2

Percentuais:
- Total 57: 100% → roxo
- Pendentes 27: 47% → roxo
- Comprados 0: 0% → cinza
- Urgentes 14: 24% → vermelho (danger)

CARD com imagem REAL:
- src: /assets/supplements/{supplementId}.jpg
- fallback: placeholder com símbolo 🧪
- Badge NÍVEL sobreposto na imagem (top-right)
- Preço: "R$ 76" em roxo bold + "R$95" riscado cinza
- Subtítulo: "R$ 2,50 / DOSE" em --t3
- Botão: "VER MELHORES PREÇOS" em bloco, uppercase, bg brand

FILTROS EXTRAS via painel lateral (modal):
- Slider custo por dose
- Checkbox por objetivo
- Checkbox por nível de evidência

EVENTOS:
- supplement:buy → dispara gtag affiliate_click
- list:filter:changed → atualiza contadores
- supplement:favorite:toggle → update coração
```

---

## PROMPT 3.2 — `favorites-page.js` (ATUALIZADO com image_94f403.jpg)

```
Atualize favorites-page.js conforme screenshots image_94f403.jpg / image_94f403__1_.jpg.

LAYOUT EXATO:

HEADER:
[🔵 Suplilist] [Precision Management]   ← sidebar logo
[Home / Favoritos]          [🛒 Otimizar Todos]

FILTER BAR:
[● Todos] [Hipertrofia] [Foco & Cognição] [Longevidade]
                                    ORDENAR POR: [Maior Evidência ▼]

GRID 2 colunas (cards maiores que na lista):
┌────────────────────────────────────┐ ┌────────────────────────────────────┐
│ [♡ btn]                            │ │ [♡ btn]                            │
│ [imagem produto landscape 16:9]    │ │ [imagem produto landscape 16:9]    │
│ △ NÍVEL A  Hipertrofia             │ │ △ NÍVEL B  Hormonal                │
│ Creatina Monohidratada             │ │ Maca Peruana Preta em Pó           │
│ Aumento de força e volum...        │ │ Suporte à libido e vitalidade.     │
│ Melhor Preço           🛒          │ │ Melhor Preço               ML      │
│ R$ 89,90 / 300g                    │ │ R$ 76,00 / dose                    │
│ [Detalhes]    [Comprar]            │ │ [Detalhes]    [Comprar]            │
└────────────────────────────────────┘ └────────────────────────────────────┘

DETALHES DO CARD:
- Badge NÍVEL A/B: texto com △ ícone + label tipo (Hipertrofia, Hormonal...)
- Dois badges em linha: "△ NÍVEL A" (verde) + "Hipertrofia" (texto cinza separado)
- Nome: bold 18px
- Descrição: t2, 2 linhas max (line-clamp)
- "Melhor Preço" em t3 small + badge marketplace (🛒 = Shopee, ML = Mercado Livre)
- Preço: "R$ 89" bold grande + ",90" smaller + "/ 300g" em t3
- Botões: [Detalhes] outline + [Comprar] roxo sólido

SIDEBAR (nesta página):
- Logo: "Suplilist" bold branco + "Precision Management" uppercase t3
- Sem badge nos itens
- Item ativo: "Favorites" com fundo brand-glow + borda esq

BOTTOM SIDEBAR:
- "+ Add Supplement" button roxo, width 100%

EVENTOS:
- Emite: favorites:sort:changed, supplement:buy, supplement:detail:open
- Analytics: gtag('event', 'affiliate_click', { supplement_id, marketplace })
```

---

## PROMPT 3.3 — `history-page.js` (ATUALIZADO com image_94f7a8.jpg)

```
Crie history-page.js conforme image_94f7a8.jpg.

LAYOUT EXATO:

TÍTULO:
"Histórico de Suplementação"
"Monitoramento retrospectivo de ciclos concluídos e métricas de adesão clínica."

3 METRIC CARDS:
┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│ 📈 Média de Adesão   │ │ ✅ Total de Ciclos     │ │ 💰 Investimento Total │
│ 92%                  │ │ Concluídos            │ │ Histórico             │
│ [barra roxa]         │ │ 14                    │ │ R$ 3.450              │
│                      │ │ +2 no último trimestre │ │ Calculado com base... │
└──────────────────────┘ └──────────────────────┘ └──────────────────────┘

Métrica de adesão:
- "92" tamanho 40px + "%" size 24px
- Barra abaixo: 90% preenchida com --brand (roxo)

Métrica ciclos:
- "14" tamanho 40px
- subtítulo: "+2 no último trimestre" cor success

Métrica investimento:
- "R$ 3.450" tamanho 36px
- "Calculado com base nos logs registrados" cor t3 size 11px

SEARCH + TABS:
[🔍 Buscar no histórico...]
[● Todos] [Aminoácidos] [Adaptógenos] [Vitaminas]

LISTA DE CICLOS:
┌─────────────────────────────────────────────────────────┐
│ [foto/ícone 56px] Creatina Monohidratada  [AMINOÁCIDO]  │
│                   📅 Jan 2024 - Fev 2024                │
│                   ✅ 95% Adesão (57/60 dias)            │
│                                     [📋 Ver Logs]       │
├─────────────────────────────────────────────────────────┤
│ [ícone 56px] Ashwagandha KSM-66   [ADAPTÓGENO]         │
│              📅 Out 2023 - Dez 2023                     │
│              ✅ 88% Adesão (79/90 dias)                 │
│                                     [📋 Ver Logs]       │
├─────────────────────────────────────────────────────────┤
│ [ícone 56px] Ômega 3 TG   [ÁCIDO GRAXO]               │
│              📅 Jul 2023 - Set 2023                     │
│              ⏱ 75% Adesão (68/90 dias)                 │
│                                     [📋 Ver Logs]       │
└─────────────────────────────────────────────────────────┘

[Carregar mais ciclos anteriores]

ÍCONE por adesão:
✅ ≥90%  →  cor success
⏱ 70-89% → cor warning
❌ <70%   → cor danger

IMAGENS/ÍCONES:
- Creatina: imagem real se disponível
- Ashwagandha: placeholder ícone (💊 ou símbolo científico)
- Ômega 3: placeholder ícone (△ ou Δ símbolo)
- Placeholder bg: var(--bg-surface), centered icon

TOPBAR desta página:
- Sem breadcrumb texto (só ícones 🔔 📊 👤)
- Nome do perfil/conta aparece no sidebar: "Suplilist / Vitals Optimized"

SIDEBAR desta página:
- Logo: "Suplilist" + "Vitals Optimized" (NÃO "Precision Management")
- Item ativo: "History"

EVENTOS:
- history:load:more → carrega próxima página
- history:filter:changed
- cycle:view:logs → abre modal
```

---

## PROMPT 3.4 — `dosage-calculator.js` (ATUALIZADO com image_94e0e0.jpg)

```
Crie dosage-calculator.js conforme image_94e0e0.jpg.

LAYOUT EXATO:

TÍTULO (topo, fora dos painéis):
"Calculadora de Dosagem Clínica"
"Ajuste sua suplementação com base em dados biométricos e evidência clínica."

2 COLUNAS:

ESQUERDA — 2 painéis empilhados:
┌──────────────────────────────┐
│ 📊 DADOS BIOMÉTRICOS          │
│                              │
│ Peso (kg)                    │
│ [Ex: 75________________]     │
│                              │
│ Gordura Corporal (%)         │
│ [Ex: 15________________]     │
│                              │
│ Nível de Atividade           │
│ [______________________ ▼]   │
└──────────────────────────────┘
┌──────────────────────────────┐
│ 🧪 SELEÇÃO DE COMPOSTO        │
│                              │
│ [🔍_______________________]  │
└──────────────────────────────┘

DIREITA — 2 painéis empilhados:
┌──────────────────────────────────────────┐
│ ✅ Resultado da Otimização  [Manutenção] [Carga]│
│                                          │
│        DOSAGEM RECOMENDADA               │
│              5.0 g/dia                   │  ← ENORME
│                                          │
│   ✅ Protocolo Validado por Estudos Clínicos│
│                                          │
│   [+ Adicionar ao meu Protocolo]         │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│ 📖 Contexto Científico                   │
│                                          │
│ ┌──────────────────┐ ┌────────────────┐  │
│ │ Racional da      │ │ Nível de       │  │
│ │ Dosagem          │ │ Evidência  Grau A │
│ │ A dosagem de     │ │ [████████████] │  │
│ │ manutenção de 5g │ │ Segurança Renal│  │
│ │ diários...       │ │ Alta           │  │
│ │                  │ │ [████████████] │  │
│ └──────────────────┘ └────────────────┘  │
└──────────────────────────────────────────┘

TOGGLE Manutenção/Carga:
- Dois botões lado a lado no canto superior direito do resultado
- Ativo: bg var(--bg-elevated), branco
- Inativo: transparente, t3

DOSAGEM "5.0":
- "5" = font-size 80px, font-weight 700
- ".0" = mesmo tamanho
- "g/dia" = font-size 24px, color t3
- Exemplo de como renderizar: <span class="dose-num">5.0</span><span class="dose-unit">g/dia</span>

VALIDAÇÃO verde:
- "✅ Protocolo Validado por Estudos Clínicos" — apenas quando evidenceLevel === 'A'

SIDEBAR desta página:
- Logo: "Suplilist Pro" em bold + "CLINICAL ACCESS" uppercase small t3
- Destaque: item "Calculate Dosage" está ativo com fundo brand + cor branco
  (não brand-glow — fundo sólido diferente)
- Itens do bottom: Support, Account, Settings

IMPORTANTE — sidebar nesta variante tem MENOS itens:
Home, List, My Stack, Favorites, History, Settings, Support, Account
(sem Receita e Comparar — esta é a versão Pro/Clinical sidebar)
```

---

## PROMPT 3.5 — `my-stack-page.js` ✅
> Ver SUPLILIST_PROMPTS_v3_FINAL.md → PROMPT 3.5 (sem mudanças visuais confirmadas)

---

# FASE 4 — LANDING PAGE + LEGAL

## PROMPT 4.1 — `index.html` (ATUALIZADO com home.png)

```
Reescreva index.html como landing page conforme home.png.

SEÇÕES EXATAS (ordem confirmada):

1. NAV HEADER
   [⚡ SUPLILIST]  Início | Lista | Minha Stack    Configurações  [MONTAR LISTA]
   Fundo transparente, border-bottom border sutil

2. HERO (fullscreen height)
   Left (60%):
   ──────────────────────────────────────
   SUPLEMENTAÇÃO
   BASEADA EM
   EVIDÊNCIAS.
   ──────────────────────────────────────
   (headline 3 linhas, "EVIDÊNCIAS." em gradiente branco→roxo)
   
   "Compare preços, doses e eficácia científica em Shopee,
   Mercado Livre e Amazon — tudo em um só lugar. Sem cadastro."
   
   [MONTAR MINHA STACK]    [📋 CALCULAR DOSAGEM]
   
   Stats: 57+ Suplementos | 3 Marketplaces | 500+ Estudos | R$0 Cadastro
   
   Right (40%): mockup do app (screenshot ou card animado da stack)

3. TICKER MARQUEE (entre hero e features)
   ─── Maca Peruana → Ashwagandha → Creatina → ... (infinito) ───
   Fonte monospace-like, separado por →, animação CSS infinita

4. FEATURES
   "FUNCIONALIDADES"
   "TUDO QUE VOCÊ PRECISA. JUNTO."
   "Do planejamento à compra com ciência real. Sem abas abertas, sem frutas, sem crises."
   
   3 cards:
   [⭐ Comparação de Preços]   [📊 Dosagens Científicas]   [♡ Stack Personalizado]
   "Shopee, Mercado Livre e    "Baseadas em estudos         "Monte e gerencie..."
   Amazon tudo junto..."       calibrados..."
   
   Card central (.featured): borda brand-light, fundo levemente elevado

5. HOW IT WORKS
   "COMO FUNCIONA"
   "3 PASSOS PARA COMPRAR CERTO."
   
   01 Defina seus Objetivos     02 Compare Preços e Doses     03 Marque e Compre
   "Filtre por objetivo..."     "Cada item, o melhor..."      "Check nos que comprou..."
   
   Números "01/02/03": enormes (opacity 0.07) de fundo
   [COMEÇAR AGORA] CTA abaixo dos steps

6. APP MOCKUP (entre steps e objectives)
   Preview de terminal/código mostrando stack sendo montada
   Fundo escuro com código real do app

7. OBJECTIVES
   "OBJETIVOS"
   "FILTRADO POR COMO VOCÊ TREINA."
   
   Grid 4x2:
   [💪 Hipertrofia]  [🔥 Queima de Gordura]  [⚡ Energia & Foco]  [🌿 Saúde Geral]
   [🔥 Libido & Testo] [🌙 Sono]             [🌸 Mulher]         [▷ Ver Todos]
   
   "Ver Todos" tem fundo brand destacado

8. MARKETPLACES
   "MARKETPLACES"
   "OS MAIORES MARKETPLACES DO BRASIL."
   
   3 cards:
   [Shopee]         [Mercado Livre]        [Amazon]
   logo 96px        logo 96px              logo 96px
   "Integrado"      "Em breve..."          "Integrado"
   barra de prog    barra de prog          barra de prog
   
   Card central (Mercado Livre) maior/destacado

9. CTA FINAL
   "DEPOIMENTOS" (badge)
   
   "PARE DE ADIVINHAR.
   COMECE A SUPLEMENTAR
   COM CIÊNCIA REAL."
   
   "Milhares de pessoas ainda compram suplemento errado, na dose errada,
   no lugar mais caro. Você não precisa ser uma delas."
   
   [Montar Minha Lista Agora]    [Ver Guia de Uso]

10. FOOTER
    [⚡ SUPLILIST]    © 2024 — Powered by Evidence & Obsidian Design
    Privacidade | Termos | API | Github

TIPOGRAFIA (confirmada por home.png):
- Hero headline: Outfit ou Inter, peso 800-900, uppercase, tracking tight
- "EVIDÊNCIAS." tem gradiente: linear-gradient(90deg, #f4f4f5, #a855f7)
- Subheadlines: Inter 400, t2
- Botões: uppercase, letter-spacing 0.05em

CORES (landing = mesmo design system do app):
--bg: #08080f (ligeiramente azulado, diferente do #0a0a0a do app)
```

---

## PROMPT 4.2 — `landing.css` ✅
> Ver SUPLILIST_PROMPTS_v3_FINAL.md → PROMPT 4.2 + adicionar ticker CSS do design-system

---

## PROMPT 4.3 — `/legal` PAGE ✅
> Sem mudanças visuais confirmadas. Ver SUPLILIST_PROMPTS_v3_FINAL.md → PROMPT 4.3

---

# FASE 5 — ANALYTICS + INTEGRAÇÃO

## PROMPT 5.1 — `analytics.js` ✅
## PROMPT 5.2 — `main.js` ✅
## PROMPT 5.3 — Checklist final ✅
> Sem mudanças. Ver SUPLILIST_PROMPTS_v3_FINAL.md → FASE 5

---

# RESUMO DAS DIFERENÇAS (doc antigo vs screenshots)

| Elemento | Doc Antigo | Screenshots (verdade) |
|---|---|---|
| Sidebar itens | 6 (sem Receita/Comparar) | 7 (Receita + Comparar separado) |
| Card imagem | placeholder/4:3 | Imagem real produto, aspecto ~quadrado |
| Card preço | "R$ 89,90" | "R$ 89" bold roxo + ",90" menor + riscado |
| Card botão | "Ver Melhores Preços" | "VER MELHORES PREÇOS" uppercase block |
| Stats da lista | números simples | Donut chart SVG animado |
| Footer app | simples | "SUPLILIST" + Privacidade | Termos | API | Github |
| Sidebar logo | "⚡ SupliList" | Varia por página: "Precision Mgmt" / "Clinical Access" / "Vitals Optimized" |
| Sidebar bottom | "+ Add Supplement" | Status "salvo" + botão TEMA |
| Favorites card | 4:3 aspect | 16:9 landscape |
| Dosage topbar | Com breadcrumb | Sem breadcrumb, só ícones |
| History topbar | Com logo | Sem logo/breadcrumb, só ícones |
| Landing ticker | Não mencionado | Ticker marquee horizontal de suplementos |
| Dosage value | "5.0 g/dia" | "5.0" GIGANTE (80px) + "g/dia" menor |

---

*Atualizado: 25 de maio de 2026 | Baseado em 6 screenshots confirmados do produto*
