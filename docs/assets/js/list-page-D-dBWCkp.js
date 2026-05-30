import{s as u,A as x}from"./main-BNCydJh8.js";import{S}from"./stack-recommender-b07295YU.js";import{F as C}from"./vendor-CMLop-UK.js";const L=["Todos","Adaptógeno","Proteínas","Energéticos","Vitaminas","Minerais","Saúde Geral"],A=["Hipertrofia","Saúde Geral","Longevidade","Performance","Foco"],z={Hipertrofia:"bulk","Saúde Geral":"general",Longevidade:"general",Performance:"endurance",Foco:"endurance"},k=24;function $(i,e){const t=i.id;if(e&&e[t]){const o=Object.values(e[t]).reduce((s,c)=>s.price<c.price?s:c);return{price:o.price,label:o.label}}const r=i.dosage?.maintenance??5,l=i.pricePerGram??.3;return{price:r*l*30,label:null}}function I(i,e){const t=i.id;if(e&&e[t]){const a=Object.values(e[t]).reduce((s,c)=>s.price<c.price?s:c);return i.dosage?.maintenance,`R$ ${(a.price/30).toFixed(2).replace(".",",")} / dose`}const r=i.dosage?.maintenance??5,l=i.pricePerGram??.3;return`R$ ${(r*l).toFixed(2).replace(".",",")} / dose`}function j(i,e){const t=i.id;if(!e||!e[t])return null;const r=Object.values(e[t]),l=Math.max(...r.map(p=>p.saving||0));return l>0?l:null}function E(i){const e={A:{bg:"rgba(34,197,94,0.12)",color:"#22C55E"},B:{bg:"rgba(245,158,11,0.12)",color:"#F59E0B"},C:{bg:"rgba(163,163,163,0.12)",color:"#9A9A9A"}};return e[i]||e.C}function q(i,e){if(!e||e==="Todos")return!0;const t=(i.category||"").toLowerCase(),r=e.toLowerCase();return r==="adaptógeno"?t.includes("adapt")||t.includes("erva"):r==="proteínas"?t.includes("prote"):r==="energéticos"?t.includes("energ")||t.includes("foco")||t.includes("estimul"):r==="vitaminas"?t.includes("vitam"):r==="minerais"?t.includes("miner")||t.includes("magnés")||t.includes("zinc")||t.includes("ferro"):r==="saúde geral"?t.includes("saúde")||t.includes("geral")||t.includes("imun")||t.includes("omega")||t.includes("ômega"):!0}function F(i,e){if(!e)return!0;const t=z[e];return t?i.targets&&i.targets[t]!=null&&i.targets[t]>0:!0}function _(){const i=u.favorites;if(Array.isArray(i))return new Set(i);try{const e=localStorage.getItem("suplilist:favorites");return e?new Set(JSON.parse(e)):new Set}catch{return new Set}}function O(i){_().has(i)?u.dispatch(x.REMOVE_FAVORITE,{supplementId:i}):u.dispatch(x.ADD_FAVORITE,{supplementId:i})}function w(i){return`R$ ${Number(i).toFixed(2).replace(".",",").replace(/\B(?=(\d{3})+(?!\d))/g,".")}`}class B{constructor(e){this.container=e,this._unsubscribe=null,this._fuse=null,this._allItems=[],this._filtered=[],this._page=0,this._query="",this._category="Todos",this._objective="",this._prices=null,this._modalOpen=null,this._debounceTimer=null,this._observer=null,this._boundKeydown=this._onKeydown.bind(this)}mount(){this._attachStyles(),this._allItems=S,this._fuse=new C(this._allItems,{keys:["name","category","benefits"],threshold:.35,includeScore:!0,ignoreLocation:!0}),fetch("/data/prices.json").then(e=>e.ok?e.json():null).then(e=>{this._prices=e,this._renderGrid()}).catch(()=>{}),this._render(),this._applyFilters(),this._renderStats(),this._renderGrid(),this._initInfiniteScroll(),this._attachListeners(),this._unsubscribe=u.subscribe(()=>this._refreshCardStates()),document.addEventListener("keydown",this._boundKeydown)}unmount(){this._unsubscribe?.(),this._observer?.disconnect(),document.removeEventListener("keydown",this._boundKeydown),this._closeModal()}_attachStyles(){if(document.getElementById("list-page-styles"))return;const e=document.createElement("style");e.id="list-page-styles",e.textContent=`
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
        font-family: 'Syne', sans-serif; font-weight: 800;
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
        display: flex; gap: 12px; padding: 0 16px 0;
        margin-top: 4px;
      }
      .lp-stat-box {
        flex: 1;
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 12px; padding: 10px 14px;
        display: flex; flex-direction: column; gap: 2px;
      }
      .lp-stat-val {
        font-size: 20px; font-weight: 700;
        color: var(--color-text-primary);
        font-family: 'Syne', sans-serif;
      }
      .lp-stat-lbl {
        font-size: 11px; color: var(--color-text-muted); font-weight: 500;
      }

      /* ── Filter rows ── */
      #lp-filters {
        padding: 12px 16px 0;
        display: flex; flex-direction: column; gap: 8px;
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
        margin: 0 10px; border-radius: 12px;
      }
      .lp-card-img {
        width: 100%; height: 100%; object-fit: contain;
        border-radius: 12px;
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
      }
      .lp-card-cat { font-size: 10px; color: var(--color-text-muted); margin: 0; }
      .lp-card-desc {
        font-size: 11px; color: var(--color-text-secondary);
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
        width: 32px; height: 32px; flex-shrink: 0;
        background: transparent;
        border: 1px solid var(--color-border-strong);
        border-radius: 8px; cursor: pointer;
        font-size: 15px; display: flex; align-items: center; justify-content: center;
        transition: background 0.15s, border-color 0.15s;
      }
      .lp-btn-fav:hover { background: var(--color-surface-hover); }
      .lp-btn-fav.faved { border-color: #EF4444; color: #EF4444; }
      .lp-btn-stack {
        flex: 1; height: 32px;
        background: var(--color-brand); color: #fff;
        border: none; border-radius: 8px;
        font-size: 11px; font-weight: 700;
        cursor: pointer; font-family: 'Inter', sans-serif;
        transition: background 0.15s, opacity 0.15s;
        display: flex; align-items: center; justify-content: center; gap: 4px;
      }
      .lp-btn-stack:hover { background: var(--color-brand-hover); }
      .lp-btn-stack.in-stack {
        background: var(--color-success-bg);
        color: var(--color-success);
        border: 1px solid rgba(34,197,94,0.25);
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
        display: flex; align-items: center; justify-content: center;
        padding: 16px;
        animation: lp-fade-in 0.15s ease;
      }
      @keyframes lp-fade-in { from { opacity: 0; } to { opacity: 1; } }
      #lp-modal-box {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border-strong);
        border-radius: 20px;
        max-width: 800px; width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
        animation: lp-slide-up 0.2s ease;
      }
      @keyframes lp-slide-up {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
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
      .lp-modal-img-col-name { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 22px; color: var(--color-text-primary); margin: 0; }
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
    `,document.head.appendChild(e)}_render(){this.container.innerHTML=`
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
            <span class="lp-stat-val" id="lp-stat-total">—</span>
            <span class="lp-stat-lbl">Total</span>
          </div>
          <div class="lp-stat-box">
            <span class="lp-stat-val" id="lp-stat-stack">—</span>
            <span class="lp-stat-lbl">Na Stack</span>
          </div>
          <div class="lp-stat-box">
            <span class="lp-stat-val" id="lp-stat-favs">—</span>
            <span class="lp-stat-lbl">Favoritos</span>
          </div>
        </div>

        <div id="lp-filters">
          <div class="lp-filter-row" id="lp-cat-row">
            <span class="lp-filter-label">Categoria</span>
            ${L.map(e=>`<button class="lp-chip${e==="Todos"?" active":""}" data-cat="${e}">${e}</button>`).join("")}
          </div>
          <div class="lp-filter-row" id="lp-obj-row">
            <span class="lp-filter-label">Objetivo</span>
            ${A.map(e=>`<button class="lp-chip" data-obj="${e}">${e}</button>`).join("")}
          </div>
        </div>

        <div id="lp-body">
          <p id="lp-results-label"></p>
          <div id="lp-grid" role="list"></div>
          <div class="lp-sentinel" id="lp-sentinel" aria-hidden="true"></div>
          <div class="lp-loading-more" id="lp-loading-more">Carregando mais...</div>
        </div>
      </div>
    `}_renderStats(){const e=this.container.querySelector("#lp-stat-total"),t=this.container.querySelector("#lp-stat-stack"),r=this.container.querySelector("#lp-stat-favs");e&&(e.textContent=S.length),t&&(t.textContent=(u.stack||[]).length),r&&(r.textContent=_().size)}_applyFilters(){let e=this._allItems;this._query.trim()&&(e=this._fuse?this._fuse.search(this._query).map(r=>r.item):e.filter(r=>r.name.toLowerCase().includes(this._query.toLowerCase()))),e=e.filter(r=>q(r,this._category)),e=e.filter(r=>F(r,this._objective)),this._filtered=e;const t=this.container.querySelector("#lp-results-label");t&&(t.textContent=this._query||this._category!=="Todos"||this._objective?`${this._filtered.length} resultado(s)`:"")}_renderGrid(){const e=this.container.querySelector("#lp-grid");if(!e)return;if(this._page=0,e.innerHTML="",!this._filtered.length){e.innerHTML=`
        <div class="lp-empty">
          <div class="lp-empty-icon">🔍</div>
          <p style="font-weight:700;margin:0 0 6px;">Nenhum resultado</p>
          <p style="font-size:13px;margin:0;">Tente outra busca ou remova os filtros.</p>
        </div>`;return}const t=this._buildFragment(0,k);e.appendChild(t),this._page=1}_loadMore(){const e=this._page*k;if(e>=this._filtered.length)return;const t=this.container.querySelector("#lp-grid");if(!t)return;const r=this.container.querySelector("#lp-loading-more");r&&(r.style.display="block"),requestAnimationFrame(()=>{t.appendChild(this._buildFragment(e,e+k)),this._page++,r&&(r.style.display="none")})}_buildFragment(e,t){const r=document.createDocumentFragment(),l=u.stack??[],p=_();return this._filtered.slice(e,t).forEach(a=>{const o=l.some(y=>y.supplementId===a.id),s=p.has(a.id),c=a.evidenceLevel,v=E(c),m=a.benefits?.[0]??"",g=a.id.replace(/-/g,"_"),b=j(a,this._prices),n=$(a,this._prices),d=I(a,this._prices);let f="";b?f=`<div class="lp-card-top-badge" style="background:rgba(34,197,94,0.10);color:#22C55E;">
          ECONOMIZE R$ ${b} NA AMAZON
        </div>`:a.category&&(f=`<div class="lp-card-top-badge" style="background:var(--color-brand-muted);color:var(--color-brand);">
          ${a.category}
        </div>`);const h=document.createElement("div");h.className="lp-card",h.role="listitem",h.dataset.id=a.id,h.innerHTML=`
        ${f}
        <div class="lp-card-img-wrap">
          <img class="lp-card-img"
            src="/assets/${g}.png"
            alt="${a.name}"
            loading="lazy"
            onerror="this.style.display='none'"
          />
          ${c?`<span class="lp-card-ev-badge" style="background:${v.bg};color:${v.color};">EV. ${c}</span>`:""}
        </div>
        <div class="lp-card-info">
          <p class="lp-card-name">${a.name}</p>
          <p class="lp-card-cat">${a.category??""}</p>
          ${m?`<p class="lp-card-desc">${m}</p>`:""}
          <div class="lp-card-price-row">
            <span class="lp-card-price">${w(n.price)}</span>
            <span class="lp-card-dose">${d}</span>
          </div>
          <div class="lp-card-actions">
            <button class="lp-btn-fav${s?" faved":""}" data-action="toggle-fav" data-id="${a.id}" aria-label="Favoritar" type="button">
              ${s?"♥":"♡"}
            </button>
            <button class="lp-btn-stack${o?" in-stack":""}" data-action="toggle-stack" data-id="${a.id}" type="button">
              ${o?"✓ No Stack":"+ Stack"}
            </button>
          </div>
        </div>
      `,r.appendChild(h)}),r}_initInfiniteScroll(){const e=this.container.querySelector("#lp-sentinel");!e||!("IntersectionObserver"in window)||(this._observer=new IntersectionObserver(t=>{t[0].isIntersecting&&this._loadMore()},{rootMargin:"300px"}),this._observer.observe(e))}_refreshCardStates(){this._renderStats();const e=u.stack??[],t=_();if(this.container.querySelectorAll(".lp-card").forEach(r=>{const l=r.dataset.id,p=e.some(c=>c.supplementId===l),a=t.has(l),o=r.querySelector('[data-action="toggle-fav"]');o&&(o.classList.toggle("faved",a),o.textContent=a?"♥":"♡");const s=r.querySelector('[data-action="toggle-stack"]');s&&(s.classList.toggle("in-stack",p),s.textContent=p?"✓ No Stack":"+ Stack")}),this._modalOpen){const r=document.querySelector("#lp-modal-add-btn");if(r){const l=e.some(p=>p.supplementId===this._modalOpen);r.classList.toggle("in-stack",l),r.textContent=l?"✓ Já no Stack":"+ Adicionar ao Stack"}}}_openModal(e){this._closeModal();const t=this._allItems.find(n=>n.id===e);if(!t)return;this._modalOpen=e;const r=t.evidenceLevel,l=E(r),p=t.id.replace(/-/g,"_"),o=(u.stack??[]).some(n=>n.supplementId===t.id);let s="";const c=t.id;if(this._prices&&this._prices[c]){const n=this._prices[c];s=Object.entries(n).map(([,d])=>`
        <div class="lp-price-card">
          <div class="lp-price-card-left">
            <span class="lp-price-card-store">${d.label}</span>
            <span class="lp-price-card-val">${w(d.price)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${d.saving?`<span class="lp-price-saving">-R$ ${d.saving}</span>`:""}
            <a class="lp-price-link" href="${d.url||"#"}" target="_blank" rel="noopener">Ver Oferta →</a>
          </div>
        </div>
      `).join("")}else{const n=$(t,null);s=["Amazon","Mercado Livre","Shopee"].map(d=>`
        <div class="lp-price-card">
          <div class="lp-price-card-left">
            <span class="lp-price-card-store">${d}</span>
            <span class="lp-price-card-val">${w(n.price)}</span>
          </div>
          <a class="lp-price-link" href="#" target="_blank">Ver Oferta →</a>
        </div>
      `).join("")}const v=t.warnings?.length?`<ul>${t.warnings.map(n=>`<li>${n}</li>`).join("")}</ul>`:'<p style="color:var(--color-text-muted)">Nenhum aviso registrado.</p>',m=t.sideEffects?.length?`<p style="font-weight:600;color:var(--color-text-secondary);margin:10px 0 4px;">Efeitos Colaterais</p><ul>${t.sideEffects.map(n=>`<li>${n}</li>`).join("")}</ul>`:"",g=document.createElement("div");g.id="lp-modal-overlay",g.innerHTML=`
      <div id="lp-modal-box" role="dialog" aria-modal="true" aria-label="${t.name}">
        <button id="lp-modal-close" aria-label="Fechar">✕</button>

        <div class="lp-modal-top">
          <div class="lp-modal-img-col">
            <div class="lp-modal-img-wrap">
              <img class="lp-modal-img" src="/assets/${p}.png" alt="${t.name}" onerror="this.style.display='none'" />
            </div>
            <p class="lp-modal-img-col-name">${t.name}</p>
            <p class="lp-modal-img-col-cat">${t.category??""}</p>
            ${r?`<span style="display:inline-flex;align-self:flex-start;font-size:10px;font-weight:700;text-transform:uppercase;padding:3px 9px;border-radius:6px;background:${l.bg};color:${l.color};">Evidência ${r}</span>`:""}
            <p style="font-size:13px;color:var(--color-text-secondary);line-height:1.5;margin:4px 0 0;">${t.benefits?.join(" · ")??""}</p>
          </div>

          <div class="lp-modal-info-col">
            <div>
              <h3>Comparação de Preços</h3>
              <div class="lp-price-cards">${s}</div>
            </div>

            <div>
              <div class="lp-tabs">
                <button class="lp-tab active" data-tab="dose">Dose Clínica</button>
                <button class="lp-tab" data-tab="benefits">Benefícios</button>
                <button class="lp-tab" data-tab="safety">Segurança</button>
              </div>
              <div class="lp-tab-content">
                <div class="lp-tab-pane active" id="lp-tab-dose">
                  <p style="margin:0 0 6px;"><strong style="color:var(--color-text-primary);">Dose de manutenção:</strong> ${t.dosage?.maintenance??"—"} ${t.dosage?.unit??""}</p>
                  <p style="margin:0 0 6px;"><strong style="color:var(--color-text-primary);">Limite superior:</strong> ${t.dosage?.upperLimit??"—"} ${t.dosage?.unit??""}</p>
                  <p style="margin:0;"><strong style="color:var(--color-text-primary);">Quando tomar:</strong> ${t.dosage?.timing??"—"}</p>
                </div>
                <div class="lp-tab-pane" id="lp-tab-benefits">
                  ${t.benefits?.length?`<ul>${t.benefits.map(n=>`<li>${n}</li>`).join("")}</ul>`:'<p style="color:var(--color-text-muted)">Sem dados.</p>'}
                </div>
                <div class="lp-tab-pane" id="lp-tab-safety">
                  ${v}
                  ${m}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="lp-modal-bottom">
          <button id="lp-modal-add-btn" class="lp-modal-add-btn${o?" in-stack":""}" data-id="${t.id}">
            ${o?"✓ Já no Stack":"+ Adicionar ao Stack"}
          </button>
        </div>
      </div>
    `,document.body.appendChild(g),document.body.style.overflow="hidden",g.querySelectorAll(".lp-tab").forEach(n=>{n.addEventListener("click",()=>{g.querySelectorAll(".lp-tab").forEach(f=>f.classList.remove("active")),g.querySelectorAll(".lp-tab-pane").forEach(f=>f.classList.remove("active")),n.classList.add("active");const d=g.querySelector(`#lp-tab-${n.dataset.tab}`);d&&d.classList.add("active")})}),g.querySelector("#lp-modal-close").addEventListener("click",()=>this._closeModal()),g.addEventListener("click",n=>{n.target===g&&this._closeModal()});const b=g.querySelector("#lp-modal-add-btn");b.addEventListener("click",n=>{n.stopPropagation();const d=b.dataset.id,f=this._allItems.find(y=>y.id===d);if(!f)return;(u.stack??[]).some(y=>y.supplementId===d)?u.dispatch(x.REMOVE_FROM_STACK,{supplementId:d}):u.dispatch(x.ADD_TO_STACK,{supplementId:f.id,name:f.name,dosage:f.dosage?.maintenance??5,unit:f.dosage?.unit??"g",quantity:0}),this._refreshCardStates()})}_closeModal(){const e=document.getElementById("lp-modal-overlay");e&&(e.remove(),document.body.style.overflow=""),this._modalOpen=null}_onKeydown(e){e.key==="Escape"&&this._modalOpen&&this._closeModal()}_attachListeners(){const e=this.container.querySelector("#lp-search");e&&e.addEventListener("input",a=>{clearTimeout(this._debounceTimer),this._debounceTimer=setTimeout(()=>{this._query=a.target.value,this._applyFilters(),this._renderGrid()},250)});const t=this.container.querySelector("#lp-trending");t&&t.addEventListener("click",a=>{const o=a.target.closest("[data-trend]");if(!o)return;const s=this.container.querySelector("#lp-search");s&&(s.value=o.dataset.trend),this._query=o.dataset.trend,this._applyFilters(),this._renderGrid()});const r=this.container.querySelector("#lp-cat-row");r&&r.addEventListener("click",a=>{const o=a.target.closest("[data-cat]");o&&(r.querySelectorAll(".lp-chip").forEach(s=>s.classList.remove("active")),o.classList.add("active"),this._category=o.dataset.cat,this._applyFilters(),this._renderGrid())});const l=this.container.querySelector("#lp-obj-row");l&&l.addEventListener("click",a=>{const o=a.target.closest("[data-obj]");if(!o)return;const s=o.classList.contains("active");l.querySelectorAll(".lp-chip").forEach(c=>c.classList.remove("active")),s?this._objective="":(o.classList.add("active"),this._objective=o.dataset.obj),this._applyFilters(),this._renderGrid()});const p=this.container.querySelector("#lp-grid");p&&p.addEventListener("click",a=>{const o=a.target.closest('[data-action="toggle-fav"]');if(o){a.stopPropagation(),O(o.dataset.id),this._refreshCardStates();return}const s=a.target.closest('[data-action="toggle-stack"]');if(s){a.stopPropagation();const v=s.dataset.id,m=this._allItems.find(b=>b.id===v);if(!m)return;(u.stack??[]).some(b=>b.supplementId===v)?u.dispatch(x.REMOVE_FROM_STACK,{supplementId:v}):u.dispatch(x.ADD_TO_STACK,{supplementId:m.id,name:m.name,dosage:m.dosage?.maintenance??5,unit:m.dosage?.unit??"g",quantity:0}),this._refreshCardStates();return}const c=a.target.closest(".lp-card");c&&c.dataset.id&&this._openModal(c.dataset.id)})}}export{B as default};
