import{l as T,s as h,A as w}from"./main-CflUif-F.js";import{S}from"./stack-recommender-L2OG55lm.js";import{F as O}from"./vendor-PnIxnNo9.js";import{e as n}from"./escape-Br5wU8qn.js";import{E as y}from"./evidence-D5RtUc7g.js";import{a as C}from"./affiliate-engine-BZYloqLQ.js";function A(o,t){const e=(t||"g").toLowerCase().trim();return e==="g"?o:e==="mg"?o/1e3:e==="mcg"?o/1e6:e==="ui"||e==="caps"||e==="capsules"||e==="pills"?o/1e3:o}const I=30,q=24,M=300;function j(o){if(!o||typeof o!="string")return"#";try{const t=new URL(o);return["https:","http:"].includes(t.protocol)?o:"#"}catch{return"#"}}const P=["Todos","Performance","Proteínas","Vitaminas","Adaptógenos","Hormônios","Cognição","Antioxidantes","Sono","Saúde Geral"],B=["Hipertrofia","Saúde Geral","Longevidade","Performance","Foco"],R={Hipertrofia:"bulk","Saúde Geral":"general",Longevidade:"general",Performance:"endurance",Foco:"endurance"},E=q;function F(o,t){const e=t&&t[o.id]?Object.values(t[o.id]):null;return!e||!e.length?null:e.reduce((r,l)=>r.price<l.price?r:l)}function z(o,t){const e=F(o,t);if(e)return{price:e.price,label:e.label};const r=o.dosage?.maintenance??5,l=o.dosage?.unit||"g",a=o.pricePerGram??.3;return{price:A(r,l)*a*I,label:null}}function G(o,t){const e=F(o,t);if(e)return`R$ ${(e.price/I).toFixed(2).replace(".",",")} / dose`;const r=o.dosage?.maintenance??5,l=o.dosage?.unit||"g",a=o.pricePerGram??.3;return`R$ ${(A(r,l)*a).toFixed(2).replace(".",",")} / dose`}function N(o,t){const e=o.id;if(!t||!t[e])return null;const r=Object.values(t[e]),l=Math.max(...r.map(a=>a.saving||0));return l>0?l:null}function H(o,t){if(!t||t==="Todos")return!0;const e=(o.category||"").toLowerCase();return t==="Performance"?e.includes("força")||e.includes("performance")||e.includes("resistência")||e.includes("endurance")||e.includes("queima")||e.includes("gordura")||e.includes("recovery"):t==="Proteínas"?e.startsWith("prote"):t==="Vitaminas"?e.includes("vitam"):t==="Adaptógenos"?e.includes("adapt"):t==="Hormônios"?e.includes("hormon")||e.includes("testoster")||e.includes("libido"):t==="Cognição"?e.includes("cogni")||e.includes("neuro")||e.includes("foco"):t==="Antioxidantes"?e.includes("antioxid")||e.includes("anti-inflamat"):t==="Sono"?e.includes("sono")||e.includes("recuper"):t==="Saúde Geral"?e.includes("saúde")||e.includes("geral")||e.includes("imun")||e.includes("intestin")||e.includes("articular")||e.includes("pele")||e.includes("mineral")||e.includes("miner")||e.includes("omega")||e.includes("ômega"):!0}function D(o,t){if(!t)return!0;const e=R[t];return e?o.targets&&o.targets[e]!=null&&o.targets[e]>0:!0}function k(){return new Set(h.favorites??[])}function V(o){k().has(o)?h.dispatch(w.REMOVE_FAVORITE,{supplementId:o}):h.dispatch(w.ADD_FAVORITE,{supplementId:o})}function $(o){return`R$ ${Number(o).toFixed(2).replace(".",",").replace(/\B(?=(\d{3})+(?!\d))/g,".")}`}class W{constructor(t,e={}){this.container=t,this._unsubscribe=null,this._fuse=null,this._allItems=[],this._filtered=[],this._page=0,this._query="",this._category="Todos",this._objective=e.objective||"",this._prices=null,this._modalOpen=null,this._debounceTimer=null,this._observer=null,this._boundKeydown=this._onKeydown.bind(this),this._scrollLockStack=[]}mount(){this._attachStyles(),this._allItems=S,this._fuse=new O(this._allItems,{keys:["name","category","benefits"],threshold:.35,includeScore:!0,ignoreLocation:!0}),this._fetchController=new AbortController,fetch("/data/prices.json",{signal:this._fetchController.signal}).then(t=>t.ok?t.json():Promise.reject(new Error(`HTTP ${t.status}`))).then(t=>{this._prices=t,this._renderGrid()}).catch(t=>{t.name!=="AbortError"&&T.warn("[ListPage] prices.json failed to load, using estimates:",t.message)}),this._render(),this._syncObjectiveChip(),this._applyFilters(),this._renderStats(),this._renderGrid(),this._initInfiniteScroll(),this._attachListeners(),this._unsubscribe=h.subscribe(()=>this._refreshCardStates()),document.addEventListener("keydown",this._boundKeydown)}unmount(){this._fetchController?.abort(),this._unsubscribe?.(),this._observer?.disconnect(),document.removeEventListener("keydown",this._boundKeydown),this._closeModal(),clearTimeout(this._debounceTimer);const t=document.getElementById("router-outlet");t&&(t.style.overflow=""),document.body.style.overflow=""}_attachStyles(){if(document.getElementById("list-page-styles"))return;const t=document.createElement("style");t.id="list-page-styles",t.textContent=`
      /* ── Layout ── */
      #lp-root {
        display: flex; flex-direction: column; gap: 0;
        padding-bottom: 80px;
        min-height: 100%;
      }

      /* ── Sticky Header ── */
      #lp-header {
        position: sticky; top: 0; z-index: 50;
        background: var(--color-bg-primary);
        border-bottom: 1px solid var(--color-border);
        padding: 16px 16px 12px;
        display: flex; flex-direction: column; gap: 10px;
      }
      #lp-header-row {
        display: flex; align-items: center; gap: 12px;
      }
      #lp-title {
        font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; font-weight: 800;
        font-size: 22px; color: var(--color-text-primary);
        margin: 0; flex-shrink: 0;
      }
      #lp-search-wrap { flex: 1; position: relative; }
      #lp-search-wrap svg {
        position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
        color: var(--color-text-muted); pointer-events: none;
      }
      #lp-search {
        width: 100%; box-sizing: border-box;
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 12px;
        padding: 10px 14px 10px 38px;
        font-size: 14px; font-family: 'Inter', sans-serif;
        color: var(--color-text-primary);
        outline: none;
        transition: border-color 0.15s;
      }
      #lp-search:focus { border-color: var(--color-brand); }
      #lp-search::placeholder { color: var(--color-text-muted); }

      /* ── Trending chips ── */
      #lp-trending {
        display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
      }
      .lp-trending-label {
        font-size: 11px; font-weight: 600;
        color: var(--color-text-muted);
        text-transform: uppercase; letter-spacing: 0.05em; flex-shrink: 0;
      }
      .lp-trend-chip {
        font-size: 12px; font-weight: 500;
        color: var(--color-brand);
        background: var(--color-brand-muted);
        border: 1px solid rgba(124,58,237,0.2);
        border-radius: 20px; padding: 3px 10px;
        cursor: pointer; transition: background 0.15s;
      }
      .lp-trend-chip:hover { background: rgba(124,58,237,0.2); }

      /* ── Stats row ── */
      #lp-stats-row {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        padding: 12px 16px 0;
      }
      @media (max-width: 480px) {
        #lp-stats-row { grid-template-columns: repeat(2, 1fr); }
      }
      .lp-stat-box {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 14px;
        padding: 12px 10px 10px;
        display: flex; flex-direction: column;
        align-items: center; gap: 4px;
        position: relative; overflow: hidden;
      }
      .lp-stat-ring-wrap {
        position: relative; width: 60px; height: 60px;
        display: flex; align-items: center; justify-content: center;
      }
      .lp-stat-ring-wrap svg {
        position: absolute; top: 0; left: 0;
        transform: rotate(-90deg);
      }
      .lp-stat-val {
        position: relative; z-index: 1;
        font-size: 18px; font-weight: 800;
        color: var(--color-text-primary);
        font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
        line-height: 1;
      }
      .lp-stat-lbl {
        font-size: 10px; color: var(--color-text-muted);
        font-weight: 600; text-transform: uppercase;
        letter-spacing: 0.04em; text-align: center;
        line-height: 1.2;
      }
      .stat--empty .lp-stat-val { color: var(--color-text-muted); }

      /* ── Filter rows ── */
      #lp-filters {
        padding: 12px 16px 0;
        display: flex; flex-direction: column; gap: 8px;
      }
      .lp-filter-row-wrap {
        position: relative;
      }
      .lp-filter-row-wrap::after {
        content: ''; pointer-events: none;
        position: absolute; right: 0; top: 0; bottom: 2px; width: 40px;
        background: linear-gradient(to right, transparent, var(--color-bg-primary));
      }
      .lp-filter-row {
        display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px;
        scrollbar-width: none;
      }
      .lp-filter-row::-webkit-scrollbar { display: none; }
      .lp-chip {
        flex-shrink: 0;
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 20px; padding: 6px 14px;
        font-size: 12px; font-weight: 600;
        color: var(--color-text-secondary);
        cursor: pointer; white-space: nowrap;
        font-family: 'Inter', sans-serif;
        transition: border-color 0.15s, color 0.15s, background 0.15s;
      }
      .lp-chip:hover:not(.active) { border-color: var(--color-brand); color: var(--color-brand); }
      .lp-chip.active {
        background: var(--color-brand); border-color: var(--color-brand); color: #fff;
      }
      .lp-filter-label {
        font-size: 10px; font-weight: 700; text-transform: uppercase;
        letter-spacing: 0.06em; color: var(--color-text-muted);
        display: flex; align-items: center; flex-shrink: 0;
      }

      /* ── Grid ── */
      #lp-body { padding: 16px 16px 0; }
      #lp-results-label {
        font-size: 12px; color: var(--color-text-muted);
        margin: 0 0 12px; font-weight: 500;
      }
      #lp-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }
      @media (min-width: 640px) { #lp-grid { grid-template-columns: repeat(3, 1fr); } }
      @media (min-width: 1024px) { #lp-grid { grid-template-columns: repeat(4, 1fr); } }

      /* ── Supplement Card ── */
      .lp-card {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 16px;
        display: flex; flex-direction: column;
        overflow: hidden;
        cursor: pointer;
        transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
      }
      .lp-card:hover {
        border-color: var(--color-brand);
        box-shadow: 0 4px 24px rgba(124,58,237,0.12);
        transform: translateY(-1px);
      }
      .lp-card-top-badge {
        padding: 6px 10px;
        font-size: 10px; font-weight: 700; text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .lp-card-img-wrap {
        aspect-ratio: 1/1;
        background: #1A1A1A;
        display: flex; align-items: center; justify-content: center;
        overflow: hidden; position: relative;
        border-radius: 0;
      }
      .lp-card-img {
        width: 100%; height: 100%; object-fit: contain;
      }
      .lp-card-ev-badge {
        position: absolute; top: 6px; right: 6px;
        font-size: 9px; font-weight: 700; text-transform: uppercase;
        padding: 2px 7px; border-radius: 5px; letter-spacing: 0.04em;
      }
      .lp-card-info { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 4px; flex: 1; }
      .lp-card-name {
        font-size: 13px; font-weight: 700; color: var(--color-text-primary);
        margin: 0; line-height: 1.3;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .lp-card-cat { font-size: 10px; color: var(--color-text-muted); margin: 0; }
      .lp-card-desc {
        font-size: 12px; color: var(--color-text-secondary);
        line-height: 1.4; margin: 4px 0 0; flex: 1;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .lp-card-price-row {
        display: flex; flex-direction: column; gap: 1px; margin-top: 6px;
      }
      .lp-card-price { font-size: 14px; font-weight: 700; color: var(--color-text-primary); }
      .lp-card-dose { font-size: 10px; color: var(--color-text-muted); }
      .lp-card-actions {
        display: flex; gap: 6px; align-items: center; margin-top: 8px;
      }
      .lp-btn-fav {
        width: 28px; height: 28px; flex-shrink: 0;
        background: rgba(0,0,0,0.4);
        border: 1px solid var(--color-border);
        border-radius: 8px; cursor: pointer;
        font-size: 13px; display: flex; align-items: center; justify-content: center;
        transition: background 0.15s, border-color 0.15s;
      }
      .lp-btn-fav:hover { background: var(--color-surface-hover); }
      .lp-btn-fav.faved { border-color: #EF4444; color: #EF4444; }
      .lp-btn-ver-precos {
        flex: 1; height: 36px; min-height: 36px;
        background: transparent;
        border: 1px solid var(--color-brand);
        color: var(--color-brand);
        border-radius: 8px;
        font-size: 11px; font-weight: 700;
        cursor: pointer; font-family: 'Inter', sans-serif;
        transition: background 0.15s, color 0.15s;
        display: flex; align-items: center; justify-content: center;
        letter-spacing: 0.03em;
      }
      .lp-btn-ver-precos:hover {
        background: var(--color-brand);
        color: #fff;
      }

      /* ── Empty / Loading ── */
      .lp-empty {
        grid-column: 1 / -1; text-align: center;
        padding: 60px 20px; color: var(--color-text-secondary);
      }
      .lp-empty-icon { font-size: 40px; margin-bottom: 12px; }
      .lp-sentinel { height: 1px; }
      .lp-loading-more {
        text-align: center; padding: 20px;
        color: var(--color-text-muted); font-size: 13px; display: none;
      }

      /* ── Modal Overlay ── */
      #lp-modal-overlay {
        position: fixed; inset: 0; z-index: 200;
        background: rgba(0,0,0,0.85);
        display: flex; align-items: flex-end; justify-content: center;
        animation: lp-fade-in 0.15s ease;
      }
      @media (min-width: 600px) {
        #lp-modal-overlay {
          align-items: center;
          padding: 16px;
        }
      }
      @keyframes lp-fade-in { from { opacity: 0; } to { opacity: 1; } }
      #lp-modal-box {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border-strong);
        border-radius: 20px 20px 0 0;
        width: 100%;
        max-height: 92vh;
        overflow-y: auto;
        position: relative;
        animation: lp-slide-up 0.25s cubic-bezier(0.32, 0.72, 0, 1);
      }
      @media (min-width: 600px) {
        #lp-modal-box {
          border-radius: 20px;
          max-width: 800px;
          max-height: 90vh;
        }
      }
      @keyframes lp-slide-up {
        from { opacity: 0; transform: translateY(60px); }
        to { opacity: 1; transform: translateY(0); }
      }
      /* drag handle for bottom sheet */
      #lp-modal-box::before {
        content: '';
        display: block;
        width: 40px; height: 4px;
        background: var(--color-border-strong);
        border-radius: 2px;
        margin: 10px auto 0;
      }
      @media (min-width: 600px) {
        #lp-modal-box::before { display: none; }
      }
      #lp-modal-close {
        position: absolute; top: 14px; right: 14px; z-index: 10;
        width: 32px; height: 32px;
        background: var(--color-surface-secondary);
        border: 1px solid var(--color-border);
        border-radius: 8px; cursor: pointer; font-size: 16px;
        display: flex; align-items: center; justify-content: center;
        color: var(--color-text-secondary);
        transition: background 0.15s;
      }
      #lp-modal-close:hover { background: var(--color-surface-hover); color: var(--color-text-primary); }

      .lp-modal-top {
        display: grid; grid-template-columns: 1fr; gap: 20px; padding: 20px;
      }
      @media (min-width: 600px) {
        .lp-modal-top { grid-template-columns: 280px 1fr; }
      }
      .lp-modal-img-col { display: flex; flex-direction: column; gap: 12px; }
      .lp-modal-img-wrap {
        width: 100%; aspect-ratio: 1/1;
        background: #1A1A1A; border-radius: 16px;
        display: flex; align-items: center; justify-content: center;
        overflow: hidden;
      }
      .lp-modal-img { width: 100%; height: 100%; object-fit: contain; }
      .lp-modal-img-col-name { font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; font-weight: 800; font-size: 22px; color: var(--color-text-primary); margin: 0; }
      .lp-modal-img-col-cat { font-size: 12px; color: var(--color-text-muted); margin: 2px 0 0; }
      .lp-modal-info-col { display: flex; flex-direction: column; gap: 14px; }
      .lp-modal-info-col h3 { font-size: 13px; font-weight: 700; color: var(--color-text-secondary); margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.05em; }

      /* Prices */
      .lp-price-cards { display: flex; flex-direction: column; gap: 8px; }
      .lp-price-card {
        background: var(--color-surface-secondary);
        border: 1px solid var(--color-border);
        border-radius: 12px; padding: 10px 14px;
        display: flex; align-items: center; justify-content: space-between; gap: 8px;
      }
      .lp-price-card-left { display: flex; flex-direction: column; gap: 2px; }
      .lp-price-card-store { font-size: 11px; color: var(--color-text-muted); font-weight: 600; }
      .lp-price-card-val { font-size: 16px; font-weight: 700; color: var(--color-text-primary); }
      .lp-price-saving {
        font-size: 10px; font-weight: 700;
        background: rgba(34,197,94,0.12); color: #22C55E;
        padding: 2px 7px; border-radius: 5px;
      }
      .lp-price-link {
        font-size: 12px; font-weight: 600; color: var(--color-brand);
        background: var(--color-brand-muted);
        border: 1px solid rgba(124,58,237,0.2);
        border-radius: 8px; padding: 6px 12px;
        cursor: pointer; text-decoration: none; white-space: nowrap;
        transition: background 0.15s;
      }
      .lp-price-link:hover { background: rgba(124,58,237,0.2); }

      /* Tabs */
      .lp-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--color-border); }
      .lp-tab {
        padding: 8px 14px; font-size: 13px; font-weight: 600;
        color: var(--color-text-muted); cursor: pointer; border: none;
        background: transparent; border-bottom: 2px solid transparent;
        transition: color 0.15s, border-color 0.15s;
        font-family: 'Inter', sans-serif;
        margin-bottom: -1px;
      }
      .lp-tab.active { color: var(--color-brand); border-bottom-color: var(--color-brand); }
      .lp-tab-content { padding: 14px 0; font-size: 13px; color: var(--color-text-secondary); line-height: 1.6; }
      .lp-tab-content ul { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; }
      .lp-tab-content li { color: var(--color-text-secondary); }
      .lp-tab-pane { display: none; }
      .lp-tab-pane.active { display: block; }

      .lp-modal-bottom { padding: 0 20px 20px; display: flex; flex-direction: column; gap: 12px; }
      .lp-modal-add-btn {
        width: 100%; padding: 14px;
        background: var(--color-brand); color: #fff;
        border: none; border-radius: 12px;
        font-size: 15px; font-weight: 700;
        cursor: pointer; font-family: 'Inter', sans-serif;
        transition: background 0.15s, opacity 0.15s;
      }
      .lp-modal-add-btn:hover { background: var(--color-brand-hover); }
      .lp-modal-add-btn.in-stack {
        background: var(--color-success-bg);
        color: var(--color-success);
        border: 1px solid rgba(34,197,94,0.3);
      }
    `,document.head.appendChild(t)}_render(){this.container.innerHTML=`
      <div id="lp-root">
        <div id="lp-header">
          <div id="lp-header-row">
            <h1 id="lp-title">Catálogo</h1>
            <div id="lp-search-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input id="lp-search" type="search" placeholder="Buscar suplemento..." autocomplete="off" />
            </div>
          </div>
          <div id="lp-trending">
            <span class="lp-trending-label">Trending:</span>
            <button class="lp-trend-chip" data-trend="Ashwagandha">Ashwagandha</button>
            <button class="lp-trend-chip" data-trend="Creatina">Creatina</button>
            <button class="lp-trend-chip" data-trend="Foco">Foco</button>
          </div>
        </div>

        <div id="lp-stats-row">
          <div class="lp-stat-box">
            <div class="lp-stat-ring-wrap">
              <svg width="60" height="60" viewBox="0 0 60 60">
                <circle cx="30" cy="30" r="25" fill="none" stroke="var(--color-border)" stroke-width="3"/>
                <circle id="lp-ring-total" cx="30" cy="30" r="25" fill="none"
                  stroke="var(--color-brand)" stroke-width="3"
                  stroke-dasharray="157.1" stroke-dashoffset="0"
                  stroke-linecap="round"/>
              </svg>
              <span class="lp-stat-val" id="lp-stat-total">—</span>
            </div>
            <span class="lp-stat-lbl">Total</span>
          </div>
          <div class="lp-stat-box">
            <div class="lp-stat-ring-wrap">
              <svg width="60" height="60" viewBox="0 0 60 60">
                <circle cx="30" cy="30" r="25" fill="none" stroke="var(--color-border)" stroke-width="3"/>
                <circle id="lp-ring-stack" cx="30" cy="30" r="25" fill="none"
                  stroke="#8B5CF6" stroke-width="3"
                  stroke-dasharray="157.1" stroke-dashoffset="157.1"
                  stroke-linecap="round"/>
              </svg>
              <span class="lp-stat-val" id="lp-stat-stack">—</span>
            </div>
            <span class="lp-stat-lbl">Na Stack</span>
          </div>
          <div class="lp-stat-box">
            <div class="lp-stat-ring-wrap">
              <svg width="60" height="60" viewBox="0 0 60 60">
                <circle cx="30" cy="30" r="25" fill="none" stroke="var(--color-border)" stroke-width="3"/>
                <circle id="lp-ring-favs" cx="30" cy="30" r="25" fill="none"
                  stroke="#EF4444" stroke-width="3"
                  stroke-dasharray="157.1" stroke-dashoffset="157.1"
                  stroke-linecap="round"/>
              </svg>
              <span class="lp-stat-val" id="lp-stat-favs">—</span>
            </div>
            <span class="lp-stat-lbl">Favoritos</span>
          </div>
          <div class="lp-stat-box">
            <div class="lp-stat-ring-wrap">
              <svg width="60" height="60" viewBox="0 0 60 60">
                <circle cx="30" cy="30" r="25" fill="none" stroke="var(--color-border)" stroke-width="3"/>
                <circle id="lp-ring-eva" cx="30" cy="30" r="25" fill="none"
                  stroke="#22C55E" stroke-width="3"
                  stroke-dasharray="157.1" stroke-dashoffset="78.55"
                  stroke-linecap="round"/>
              </svg>
              <span class="lp-stat-val" id="lp-stat-eva">—</span>
            </div>
            <span class="lp-stat-lbl">Evidência A</span>
          </div>
        </div>

        <div id="lp-filters">
          <div class="lp-filter-row-wrap">
            <div class="lp-filter-row" id="lp-cat-row">
              <span class="lp-filter-label">Categoria</span>
              ${P.map(t=>`<button class="lp-chip${t==="Todos"?" active":""}" data-cat="${t}">${t}</button>`).join("")}
            </div>
          </div>
          <div class="lp-filter-row-wrap">
            <div class="lp-filter-row" id="lp-obj-row">
              <span class="lp-filter-label">Objetivo</span>
              ${B.map(t=>`<button class="lp-chip" data-obj="${t}">${t}</button>`).join("")}
            </div>
          </div>
        </div>

        <div id="lp-body">
          <p id="lp-results-label"></p>
          <div id="lp-grid" role="list"></div>
          <div class="lp-sentinel" id="lp-sentinel" aria-hidden="true"></div>
          <div class="lp-loading-more" id="lp-loading-more">Carregando mais...</div>
        </div>
      </div>
    `}_renderStats(){const t=S.length,e=(h.stack||[]).length,r=k().size,l=S.filter(d=>d.evidenceLevel==="A").length,a=157.1,s=(d,g,v,b,x)=>{const p=this.container.querySelector(d),m=this.container.querySelector(g);if(!p||!m)return;m.textContent=v;const i=b>0?Math.min(1,v/b):0;p.style.stroke=x,p.style.strokeDashoffset=a*(1-i)};s("#lp-ring-total","#lp-stat-total",t,t,"var(--color-brand)"),s("#lp-ring-stack","#lp-stat-stack",e,t,"#8B5CF6"),s("#lp-ring-favs","#lp-stat-favs",r,t,"#EF4444"),s("#lp-ring-eva","#lp-stat-eva",l,t,"#22C55E"),this.container.querySelector("#lp-stat-stack")?.closest(".lp-stat-box")?.classList.toggle("stat--empty",e===0)}_applyFilters(){let t=this._allItems;this._query.trim()&&(t=this._fuse?this._fuse.search(this._query).map(r=>r.item):t.filter(r=>r.name.toLowerCase().includes(this._query.toLowerCase()))),t=t.filter(r=>H(r,this._category)),t=t.filter(r=>D(r,this._objective)),this._filtered=t;const e=this.container.querySelector("#lp-results-label");e&&(e.textContent=this._query||this._category!=="Todos"||this._objective?`${this._filtered.length} resultado(s)`:"")}_renderGrid(){if(this._modalOpen)return;const t=this.container.querySelector("#lp-grid");if(!t)return;if(this._page=0,t.innerHTML="",!this._filtered.length){t.innerHTML=`
        <div class="lp-empty">
          <div class="lp-empty-icon">🔍</div>
          <p style="font-weight:700;margin:0 0 6px;">Nenhum resultado</p>
          <p style="font-size:13px;margin:0;">Tente outra busca ou remova os filtros.</p>
        </div>`;return}const e=this._buildFragment(0,E);t.appendChild(e),this._page=1}_loadMore(){const t=this._page*E;if(t>=this._filtered.length)return;const e=this.container.querySelector("#lp-grid");if(!e)return;const r=this.container.querySelector("#lp-loading-more");r&&(r.style.display="block"),requestAnimationFrame(()=>{e.appendChild(this._buildFragment(t,t+E)),this._page++,r&&(r.style.display="none")})}_buildFragment(t,e){const r=document.createDocumentFragment();h.stack;const l=k();return this._filtered.slice(t,e).forEach(a=>{const s=l.has(a.id),c=a.evidenceLevel,d=y[c]??y.C,g=a.benefits?.[0]??"",v=a.image||`/assets/${a.id.replace(/-/g,"_")}.png`,b=N(a,this._prices),x=z(a,this._prices),p=G(a,this._prices);let m="";b?m=`<div class="lp-card-top-badge" style="background:rgba(34,197,94,0.10);color:#22C55E;">
          ECONOMIZE R$ ${n(String(b))} NA AMAZON
        </div>`:a.category&&(m=`<div class="lp-card-top-badge" style="background:var(--color-brand-muted);color:var(--color-brand);">
          ${n(a.category)}
        </div>`);const i=document.createElement("div");i.className="lp-card",i.role="listitem",i.dataset.id=a.id,i.innerHTML=`
        ${m}
        <div class="lp-card-img-wrap">
          <img class="lp-card-img"
            src="${n(v)}"
            alt="${n(a.name)}"
            loading="lazy"
            importance="auto"
            onerror="this.style.display='none'"
          />
          ${c?`<span class="lp-card-ev-badge" style="background:${d.bg};color:${d.color};">EV. ${n(String(c))}</span>`:""}
        </div>
        <div class="lp-card-info">
          <p class="lp-card-name">${n(a.name)}</p>
          <p class="lp-card-cat">${n(a.category??"")}</p>
          ${g?`<p class="lp-card-desc">${n(g)}</p>`:""}
          <div class="lp-card-price-row">
            <span class="lp-card-price">${$(x.price)}</span>
            <span class="lp-card-dose">${p}</span>
          </div>
          <div class="lp-card-actions">
            <button class="lp-btn-fav${s?" faved":""}" data-action="toggle-fav" data-id="${a.id}" aria-label="${s?"Remover dos favoritos":"Favoritar"}" type="button">
              ${s?"♥":"♡"}
            </button>
            <button class="lp-btn-ver-precos" data-action="open-modal" data-id="${a.id}" type="button">
              VER PREÇOS →
            </button>
          </div>
        </div>
      `,r.appendChild(i)}),r}_initInfiniteScroll(){const t=this.container.querySelector("#lp-sentinel");if(!(!t||!("IntersectionObserver"in window)))try{this._observer=new IntersectionObserver(e=>{e[0].isIntersecting&&this._loadMore()},{rootMargin:"300px"}),this._observer.observe(t)}catch{this._observer?.disconnect(),this._observer=null}}_refreshCardStates(){this._renderStats();const t=h.stack??[],e=k();if(this.container.querySelectorAll(".lp-card").forEach(r=>{const l=r.dataset.id,a=e.has(l),s=r.querySelector('[data-action="toggle-fav"]');s&&(s.classList.toggle("faved",a),s.textContent=a?"♥":"♡",s.setAttribute("aria-label",a?"Remover dos favoritos":"Favoritar"))}),this._modalOpen){const r=document.querySelector("#lp-modal-add-btn");if(r){const l=t.some(a=>a.supplementId===this._modalOpen);r.classList.toggle("in-stack",l),r.textContent=l?"✓ Já no Stack":"+ Adicionar ao Stack"}}}_pushScrollLock(t="modal"){this._scrollLockStack.includes(t)||(this._scrollLockStack.push(t),document.body.classList.add("has-modal-open"))}_popScrollLock(t="modal"){const e=this._scrollLockStack.indexOf(t);e!==-1&&(this._scrollLockStack.splice(e,1),this._scrollLockStack.length===0&&document.body.classList.remove("has-modal-open"))}_openModal(t){this._closeModal();const e=this._allItems.find(i=>i.id===t);if(!e)return;this._modalOpen=t;const r=e.evidenceLevel,l=y[r]??y.C,a=e.image||`/assets/${e.id.replace(/-/g,"_")}.png`,c=(h.stack??[]).some(i=>i.supplementId===e.id),d=C.getLinks(e.name);let g="";const v=e.id;if(this._prices&&this._prices[v]){const i=this._prices[v];g=Object.entries(i).map(([u,f])=>`
        <div class="lp-price-card">
          <div class="lp-price-card-left">
            <span class="lp-price-card-store">${n(String(f.label??""))}</span>
            <span class="lp-price-card-val">${$(f.price)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${f.saving?`<span class="lp-price-saving">-R$ ${n(String(f.saving))}</span>`:""}
            <a class="lp-price-link"
               href="${j(d[u]||f.url)}"
               target="_blank"
               rel="noopener noreferrer"
               data-aff-id="${n(e.id)}"
               data-aff-mp="${n(u)}">Ver Oferta →</a>
          </div>
        </div>
      `).join("")}else{const i=z(e,null);g=[{key:"amazon",label:"Amazon"},{key:"mercadolivre",label:"Mercado Livre"},{key:"shopee",label:"Shopee"}].map(({key:f,label:L})=>`
        <div class="lp-price-card">
          <div class="lp-price-card-left">
            <span class="lp-price-card-store">${n(L)}</span>
            <span class="lp-price-card-val">${$(i.price)}</span>
          </div>
          <a class="lp-price-link"
             href="${j(d[f])}"
             target="_blank"
             rel="noopener noreferrer"
             data-aff-id="${n(e.id)}"
             data-aff-mp="${n(f)}">Ver Oferta →</a>
        </div>
      `).join("")}const b=e.warnings?.length?`<ul>${e.warnings.map(i=>`<li>${n(i)}</li>`).join("")}</ul>`:'<p style="color:var(--color-text-muted)">Nenhum aviso registrado.</p>',x=e.sideEffects?.length?`<p style="font-weight:600;color:var(--color-text-secondary);margin:10px 0 4px;">Efeitos Colaterais</p><ul>${e.sideEffects.map(i=>`<li>${n(i)}</li>`).join("")}</ul>`:"",p=document.createElement("div");p.id="lp-modal-overlay",p.innerHTML=`
      <div id="lp-modal-box" role="dialog" aria-modal="true" aria-label="${e.name}">
        <button id="lp-modal-close" aria-label="Fechar">✕</button>

        <div class="lp-modal-top">
          <div class="lp-modal-img-col">
            <div class="lp-modal-img-wrap">
              <img class="lp-modal-img" src="${a}" alt="${n(e.name)}" onerror="this.style.display='none'" />
            </div>
            <p class="lp-modal-img-col-name">${n(e.name)}</p>
            <p class="lp-modal-img-col-cat">${n(e.category??"")}</p>
            ${r?`<span style="display:inline-flex;align-self:flex-start;font-size:10px;font-weight:700;text-transform:uppercase;padding:3px 9px;border-radius:6px;background:${l.bg};color:${l.color};">Evidência ${r}</span>`:""}
            <p style="font-size:13px;color:var(--color-text-secondary);line-height:1.5;margin:4px 0 0;">${n(e.benefits?.join(" · ")??"")}</p>
          </div>

          <div class="lp-modal-info-col">
            <div>
              <h3>Comparação de Preços</h3>
              <div class="lp-price-cards">${g}</div>
            </div>

            <div>
              <div class="lp-tabs">
                <button class="lp-tab active" data-tab="dose">Dose Clínica</button>
                <button class="lp-tab" data-tab="benefits">Benefícios</button>
                <button class="lp-tab" data-tab="safety">Segurança</button>
              </div>
              <div class="lp-tab-content">
                <div class="lp-tab-pane active" id="lp-tab-dose">
                  <p style="margin:0 0 6px;"><strong style="color:var(--color-text-primary);">Dose de manutenção:</strong> ${n(String(e.dosage?.maintenance??"—"))} ${n(e.dosage?.unit??"")}</p>
                  <p style="margin:0 0 6px;"><strong style="color:var(--color-text-primary);">Limite superior:</strong> ${n(String(e.dosage?.upperLimit??"—"))} ${n(e.dosage?.unit??"")}</p>
                  <p style="margin:0;"><strong style="color:var(--color-text-primary);">Quando tomar:</strong> ${n(e.dosage?.timing??"—")}</p>
                </div>
                <div class="lp-tab-pane" id="lp-tab-benefits">
                  ${e.benefits?.length?`<ul>${e.benefits.map(i=>`<li>${n(i)}</li>`).join("")}</ul>`:'<p style="color:var(--color-text-muted)">Sem dados.</p>'}
                </div>
                <div class="lp-tab-pane" id="lp-tab-safety">
                  ${b}
                  ${x}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="lp-modal-bottom">
          <button id="lp-modal-add-btn" class="lp-modal-add-btn${c?" in-stack":""}" data-id="${e.id}">
            ${c?"✓ Já no Stack":"+ Adicionar ao Stack"}
          </button>
        </div>
      </div>
    `,document.body.appendChild(p),this._pushScrollLock("modal"),p.querySelectorAll(".lp-tab").forEach(i=>{i.addEventListener("click",()=>{p.querySelectorAll(".lp-tab").forEach(f=>f.classList.remove("active")),p.querySelectorAll(".lp-tab-pane").forEach(f=>f.classList.remove("active")),i.classList.add("active");const u=p.querySelector(`#lp-tab-${i.dataset.tab}`);u&&u.classList.add("active")})}),p.querySelector("#lp-modal-close").addEventListener("click",()=>this._closeModal()),p.addEventListener("click",i=>{i.target===p&&this._closeModal()}),p.addEventListener("click",i=>{const u=i.target.closest("[data-aff-mp]");u&&C.trackClick(u.dataset.affId,u.dataset.affMp)});const m=p.querySelector("#lp-modal-add-btn");m.addEventListener("click",i=>{i.stopPropagation();const u=m.dataset.id,f=this._allItems.find(_=>_.id===u);if(!f)return;(h.stack??[]).some(_=>_.supplementId===u)?h.dispatch(w.REMOVE_FROM_STACK,{supplementId:u}):h.dispatch(w.ADD_TO_STACK,{supplementId:f.id,name:f.name,dosage:f.dosage?.maintenance??5,unit:f.dosage?.unit??"g",quantity:0}),this._refreshCardStates()})}_closeModal(){const t=document.getElementById("lp-modal-overlay");t&&(t.remove(),this._popScrollLock("modal")),this._modalOpen=null}_onKeydown(t){t.key==="Escape"&&this._modalOpen&&this._closeModal()}_syncObjectiveChip(){if(!this._objective)return;const t=this.container.querySelector("#lp-obj-row");if(!t)return;const e=t.querySelector(`[data-obj="${this._objective}"]`);e&&e.classList.add("active")}_attachListeners(){const t=this.container.querySelector("#lp-search");t&&t.addEventListener("input",s=>{clearTimeout(this._debounceTimer),this._debounceTimer=setTimeout(()=>{this._debounceTimer=null,this._query=s.target.value,this._applyFilters(),this._renderGrid()},M)});const e=this.container.querySelector("#lp-trending");e&&e.addEventListener("click",s=>{const c=s.target.closest("[data-trend]");if(!c)return;const d=this.container.querySelector("#lp-search");d&&(d.value=c.dataset.trend),this._query=c.dataset.trend,this._applyFilters(),this._renderGrid()});const r=this.container.querySelector("#lp-cat-row");r&&r.addEventListener("click",s=>{const c=s.target.closest("[data-cat]");c&&(r.querySelectorAll(".lp-chip").forEach(d=>d.classList.remove("active")),c.classList.add("active"),this._category=c.dataset.cat,this._applyFilters(),this._renderGrid())});const l=this.container.querySelector("#lp-obj-row");l&&l.addEventListener("click",s=>{const c=s.target.closest("[data-obj]");if(!c)return;const d=c.classList.contains("active");l.querySelectorAll(".lp-chip").forEach(g=>g.classList.remove("active")),d?this._objective="":(c.classList.add("active"),this._objective=c.dataset.obj),this._applyFilters(),this._renderGrid()});const a=this.container.querySelector("#lp-grid");a&&a.addEventListener("click",s=>{const c=s.target.closest('[data-action="toggle-fav"]');if(c){s.stopPropagation(),V(c.dataset.id),this._refreshCardStates();return}const d=s.target.closest('[data-action="open-modal"]');if(d){s.stopPropagation(),this._openModal(d.dataset.id);return}const g=s.target.closest(".lp-card");g&&g.dataset.id&&this._openModal(g.dataset.id)})}}export{W as default};
