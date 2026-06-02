import{s as x,l as j,A as E}from"./main-CYS-UJeT.js";import{S as L}from"./stack-recommender-BGeZSZCS.js";import{F as M}from"./vendor-Vk1E4gpc.js";import{e as n}from"./escape-Br5wU8qn.js";import{E as w}from"./evidence-D5RtUc7g.js";import{a as I}from"./affiliate-engine-C4GbNtkb.js";import{C as B}from"./checkout-modal-tznE4Np-.js";function z(o,e){const t=(e||"g").toLowerCase().trim();return t==="g"?o:t==="mg"?o/1e3:t==="mcg"?o/1e6:t==="ui"||t==="caps"||t==="capsules"||t==="pills"?o/1e3:o}const q=30,R=24,G=300;class N{constructor(e,t=[],i,s={}){this.container=e,this.items=t,this.renderItem=i,this.itemHeight=s.itemHeight||80,this.bufferSize=s.bufferSize||5,this.scrollElement=s.scrollElement||window,this.visibleStartIndex=0,this.visibleEndIndex=0,this.containerHeight=0,this.scrollTop=0,this.listElement=null,this.itemElements=[],this._scrollHandler=this._onScroll.bind(this),this._resizeObserver=null,this._intersectionObserver=null}mount(){this._createContainer(),this._getContainerHeight(),this._render(),this._attachListeners()}unmount(){this._detachListeners(),this._cleanupObservers(),this.listElement&&this.listElement.remove()}updateItems(e){this.items=e,this.visibleStartIndex=0,this.visibleEndIndex=0,this._render()}scrollToIndex(e){const t=Math.max(0,e*this.itemHeight-this.containerHeight/2);this.scrollElement.scrollTop=t}_createContainer(){this.listElement=document.createElement("div"),this.listElement.className="virtual-scroller-list",this.listElement.style.cssText=`
      position: relative;
      width: 100%;
      contain: layout style paint;
    `,this.container.appendChild(this.listElement)}_getContainerHeight(){this.scrollElement===window?this.containerHeight=window.innerHeight:this.containerHeight=this.scrollElement.clientHeight}_render(){this._getContainerHeight(),this._updateVisibleRange();const e=this.items.length*this.itemHeight;this.listElement.style.height=e+"px";const t=[];for(let i=this.visibleStartIndex;i<=this.visibleEndIndex;i++){const s=this.items[i];if(s){const r=i*this.itemHeight,p=this.renderItem(s,i);t.push(`
          <div class="virtual-item" data-index="${i}" style="
            position: absolute;
            top: ${r}px;
            width: 100%;
            height: ${this.itemHeight}px;
          ">
            ${p}
          </div>
        `)}}this.listElement.innerHTML=t.join(""),this.itemElements=this.listElement.querySelectorAll(".virtual-item")}_updateVisibleRange(){this.scrollElement===window?this.scrollTop=window.pageYOffset||document.documentElement.scrollTop:this.scrollTop=this.scrollElement.scrollTop,this.visibleStartIndex=Math.max(0,Math.floor(this.scrollTop/this.itemHeight)-this.bufferSize),this.visibleEndIndex=Math.min(this.items.length-1,Math.ceil((this.scrollTop+this.containerHeight)/this.itemHeight)+this.bufferSize)}_attachListeners(){this.scrollElement===window?(window.addEventListener("scroll",this._scrollHandler,{passive:!0}),window.addEventListener("resize",this._scrollHandler)):this.scrollElement.addEventListener("scroll",this._scrollHandler,{passive:!0})}_detachListeners(){this.scrollElement===window?(window.removeEventListener("scroll",this._scrollHandler),window.removeEventListener("resize",this._scrollHandler)):this.scrollElement.removeEventListener("scroll",this._scrollHandler)}_cleanupObservers(){this._resizeObserver&&(this._resizeObserver.disconnect(),this._resizeObserver=null),this._intersectionObserver&&(this._intersectionObserver.disconnect(),this._intersectionObserver=null)}_onScroll(){this._render()}}function P(o){if(!o||typeof o!="string")return"#";try{const e=new URL(o);return["https:","http:"].includes(e.protocol)?o:"#"}catch{return"#"}}function V(o){return/amzn\.to\/|amazon\.com\.br\/dp\/|meli\.la\/|shope\.ee\//.test(o??"")}const D=["Todos","Performance","Proteínas","Vitaminas","Adaptógenos","Hormônios","Cognição","Antioxidantes","Sono","Saúde Geral"],J=["Hipertrofia","Saúde Geral","Longevidade","Performance","Foco"],U={Hipertrofia:"bulk","Saúde Geral":"general",Longevidade:"general",Performance:"endurance",Foco:"endurance"},A=R;function $(o){return o.pricePerUnit??o.price}function H(o,e){const t=e&&e[o.id]?Object.values(e[o.id]):null;return!t||!t.length?null:t.reduce((i,s)=>$(i)<$(s)?i:s)}function C(o,e){const t=H(o,e);if(t)return{price:t.price,label:t.label};const i=o.dosage?.maintenance??5,s=o.dosage?.unit||"g",r=o.pricePerGram??.3;return{price:z(i,s)*r*q,label:null}}function O(o,e){const t=H(o,e);if(t){if(t.pricePerUnit&&t.unit){const u=o.dosage?.maintenance??5,h=z(u,t.unit);return`R$ ${(t.pricePerUnit*h).toFixed(2).replace(".",",")} / dose`}return`R$ ${(t.price/q).toFixed(2).replace(".",",")} / dose`}const i=o.dosage?.maintenance??5,s=o.dosage?.unit||"g",r=o.pricePerGram??.3;return`R$ ${(z(i,s)*r).toFixed(2).replace(".",",")} / dose`}function T(o,e){const t=o.id;if(!e||!e[t])return null;const i=Object.values(e[t]),s=Math.max(...i.map(r=>r.saving||0));return s>0?s:null}function K(o,e){if(!e||e==="Todos")return!0;const t=(o.category||"").toLowerCase();return e==="Performance"?t.includes("força")||t.includes("performance")||t.includes("resistência")||t.includes("endurance")||t.includes("queima")||t.includes("gordura")||t.includes("recovery"):e==="Proteínas"?t.startsWith("prote"):e==="Vitaminas"?t.includes("vitam"):e==="Adaptógenos"?t.includes("adapt"):e==="Hormônios"?t.includes("hormon")||t.includes("testoster")||t.includes("libido"):e==="Cognição"?t.includes("cogni")||t.includes("neuro")||t.includes("foco"):e==="Antioxidantes"?t.includes("antioxid")||t.includes("anti-inflamat"):e==="Sono"?t.includes("sono")||t.includes("recuper"):e==="Saúde Geral"?t.includes("saúde")||t.includes("geral")||t.includes("imun")||t.includes("intestin")||t.includes("articular")||t.includes("pele")||t.includes("mineral")||t.includes("miner")||t.includes("omega")||t.includes("ômega"):!0}function Y(o,e){if(!e)return!0;const t=U[e];return t?o.targets&&o.targets[t]!=null&&o.targets[t]>0:!0}function k(){return new Set(x.favorites??[])}function Z(o){k().has(o)?x.dispatch(E.REMOVE_FAVORITE,{supplementId:o}):x.dispatch(E.ADD_FAVORITE,{supplementId:o})}function S(o){return`R$ ${Number(o).toFixed(2).replace(".",",").replace(/\B(?=(\d{3})+(?!\d))/g,".")}`}class oe{constructor(e,t={}){this.container=e,this._unsubscribe=null,this._fuse=null,this._allItems=[],this._filtered=[],this._page=0,this._query="",this._category="Todos",this._objective=t.objective||"",this._prices=null,this._modalOpen=null,this._debounceTimer=null,this._observer=null,this._scroller=null,this._boundKeydown=this._onKeydown.bind(this),this._scrollLockStack=[],this._evidenceFilter="",this._maxPriceFilter=300,this._benefitsFilter=new Set,this._advancedPanelOpen=!1;const i=x.getState();this._currentTier=i.user?.tier??"free"}mount(){this._attachStyles(),this._allItems=L,this._fuse=new M(this._allItems,{keys:["name","category","benefits"],threshold:.35,includeScore:!0,ignoreLocation:!0}),this._fetchController=new AbortController,fetch("/data/prices.json",{signal:this._fetchController.signal}).then(e=>e.ok?e.json():Promise.reject(new Error(`HTTP ${e.status}`))).then(e=>{this._prices=e,this._renderGrid()}).catch(e=>{e.name!=="AbortError"&&j.warn("[ListPage] prices.json failed to load, using estimates:",e.message)}),this._render(),this._syncObjectiveChip(),this._applyFilters(),this._renderStats(),this._renderGrid(),this._initInfiniteScroll(),this._attachListeners(),this._unsubscribe=x.subscribe(()=>{const t=x.getState().user?.tier??"free";t!==this._currentTier?(this._currentTier=t,this._applyFilters(),this._renderGrid()):this._refreshCardStates()}),document.addEventListener("keydown",this._boundKeydown)}unmount(){this._fetchController?.abort(),this._unsubscribe?.(),this._observer?.disconnect(),this._scroller?.unmount(),document.removeEventListener("keydown",this._boundKeydown),this._closeModal(),clearTimeout(this._debounceTimer);const e=document.getElementById("router-outlet");e&&(e.style.overflow=""),document.body.style.overflow=""}_attachStyles(){if(document.getElementById("list-page-styles"))return;const e=document.createElement("style");e.id="list-page-styles",e.textContent=`
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
        padding: 8px 12px;
        font-size: 12px; font-weight: 700; text-transform: uppercase;
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
        position: absolute; top: 8px; right: 8px;
        font-size: 11px; font-weight: 700; text-transform: uppercase;
        padding: 4px 8px; border-radius: 5px; letter-spacing: 0.04em;
      }
      .lp-card-info { padding: 12px 14px 14px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
      .lp-card-name {
        font-size: 13px; font-weight: 700; color: var(--color-text-primary);
        margin: 0; line-height: 1.3;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .lp-card-cat { font-size: 12px; color: var(--color-text-muted); margin: 0; }
      .lp-card-desc {
        font-size: 12px; color: var(--color-text-secondary);
        line-height: 1.4; margin: 4px 0 0; flex: 1;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .lp-card-price-row {
        display: flex; flex-direction: column; gap: 3px; margin-top: 8px;
      }
      .lp-card-price { font-size: 14px; font-weight: 700; color: var(--color-text-primary); }
      .lp-card-dose { font-size: 12px; color: var(--color-text-muted); }
      .lp-card-actions {
        display: flex; gap: 10px; align-items: center; margin-top: 10px;
      }
      .lp-btn-fav {
        width: 48px; height: 48px; flex-shrink: 0;
        background: rgba(0,0,0,0.4);
        border: 1px solid var(--color-border);
        border-radius: 8px; cursor: pointer;
        font-size: 16px; display: flex; align-items: center; justify-content: center;
        transition: background 0.15s, border-color 0.15s;
      }
      .lp-btn-fav:hover { background: var(--color-surface-hover); }
      .lp-btn-fav.faved { border-color: #EF4444; color: #EF4444; }
      .lp-btn-ver-precos {
        flex: 1; height: 48px; min-height: 48px;
        background: transparent;
        border: 1px solid var(--color-brand);
        color: var(--color-brand);
        border-radius: 8px;
        font-size: 12px; font-weight: 700;
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
      .lp-price-card--best { border-color: rgba(34,197,94,0.4); background: rgba(34,197,94,0.05); }
      .lp-price-card-store { font-size: 11px; color: var(--color-text-muted); font-weight: 600; }
      .lp-price-card-store-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
      .lp-price-best-badge { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; background: rgba(34,197,94,0.15); color: #16a34a; padding: 2px 6px; border-radius: 4px; }
      .lp-price-card-val { font-size: 16px; font-weight: 700; color: var(--color-text-primary); }
      .lp-price-qty { font-size: 11px; color: var(--color-text-muted); margin-top: 1px; }
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
            <div id="lp-search-container" style="display: flex; gap: 8px; flex: 1; align-items: center; justify-content: flex-end;">
              <div id="lp-search-wrap" style="flex: 1; max-width: 320px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input id="lp-search" type="search" placeholder="Buscar suplemento..." autocomplete="off" />
              </div>
              <button id="lp-adv-filters-btn" class="lp-chip" style="margin: 0; padding: 10px 14px; display: flex; align-items: center; gap: 6px; background: transparent; border: 1.5px solid var(--color-border-strong); height: 40px; border-radius: 12px; cursor: pointer; color: var(--color-text-primary); transition: all 150ms ease; font-size: 13px; font-weight: 600;">
                <span>⚙️</span> Filtros
              </button>
            </div>
          </div>

          <!-- Search History Panel -->
          <div id="lp-history-panel" style="display: none; align-items: center; gap: 8px; margin-top: 10px; flex-wrap: wrap;">
            <span style="font-size: 12px; color: var(--color-text-muted);">Buscas recentes:</span>
            <div id="lp-history-chips" style="display: flex; gap: 6px; flex-wrap: wrap;"></div>
            <button id="lp-clear-history-btn" style="background: none; border: none; font-size: 11px; color: var(--color-error); cursor: pointer; text-decoration: underline; margin-left: auto;">Limpar</button>
          </div>

          <div id="lp-trending">
            <span class="lp-trending-label">Trending:</span>
            <button class="lp-trend-chip" data-trend="Ashwagandha">Ashwagandha</button>
            <button class="lp-trend-chip" data-trend="Creatina">Creatina</button>
            <button class="lp-trend-chip" data-trend="Foco">Foco</button>
          </div>

          <!-- Advanced Filters Panel -->
          <div id="lp-advanced-panel" style="display: none; background: var(--color-surface-secondary); border: 1px solid var(--color-border); border-radius: 16px; padding: 16px; margin-top: 12px; flex-direction: column; gap: 14px;">
            <!-- Evidence Level Filters -->
            <div>
              <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; color: var(--color-text-muted); display: block; margin-bottom: 8px;">Nível de Evidência Científica</span>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <button class="lp-chip lp-evidence-filter" data-evidence="A">Grau A (Forte)</button>
                <button class="lp-chip lp-evidence-filter" data-evidence="B">Grau B (Moderado)</button>
                <button class="lp-chip lp-evidence-filter" data-evidence="C">Grau C (Fraco)</button>
                <button class="lp-chip lp-evidence-filter" data-evidence="D">Grau D (Anedótico)</button>
              </div>
            </div>

            <!-- Price Range Filters -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; color: var(--color-text-muted);">Faixa de Preço Máxima</span>
                <span id="lp-price-range-val" style="font-size: 12px; font-weight: 600; color: var(--color-brand);">R$ 300 (Qualquer preço)</span>
              </div>
              <input type="range" id="lp-price-range" min="20" max="300" step="10" value="300" style="width: 100%; cursor: pointer;" />
            </div>

            <!-- Benefits Filters -->
            <div>
              <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; color: var(--color-text-muted); display: block; margin-bottom: 8px;">Benefícios e Objetivos</span>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;" id="lp-benefits-container">
                <button class="lp-chip lp-benefit-filter" data-benefit="Foco">🧠 Foco</button>
                <button class="lp-chip lp-benefit-filter" data-benefit="Sono">🌙 Sono</button>
                <button class="lp-chip lp-benefit-filter" data-benefit="Hipertrofia">💪 Hipertrofia</button>
                <button class="lp-chip lp-benefit-filter" data-benefit="Imunidade">🛡️ Imunidade</button>
                <button class="lp-chip lp-benefit-filter" data-benefit="Longevidade">⏳ Longevidade</button>
                <button class="lp-chip lp-benefit-filter" data-benefit="Disposição">⚡ Energia</button>
                <button class="lp-chip lp-benefit-filter" data-benefit="Articulações">🦴 Articulações</button>
              </div>
            </div>
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
              ${D.map(e=>`<button class="lp-chip${e==="Todos"?" active":""}" data-cat="${e}">${e}</button>`).join("")}
            </div>
          </div>
          <div class="lp-filter-row-wrap">
            <div class="lp-filter-row" id="lp-obj-row">
              <span class="lp-filter-label">Objetivo</span>
              ${J.map(e=>`<button class="lp-chip" data-obj="${e}">${e}</button>`).join("")}
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
    `}_renderStats(){const e=L.length,t=(x.stack||[]).length,i=k().size,s=L.filter(h=>h.evidenceLevel==="A").length,r=157.1,p=(h,v,y,l,d)=>{const c=this.container.querySelector(h),f=this.container.querySelector(v);if(!c||!f)return;f.textContent=y;const a=l>0?Math.min(1,y/l):0;c.style.stroke=d,c.style.strokeDashoffset=r*(1-a)};p("#lp-ring-total","#lp-stat-total",e,e,"var(--color-brand)"),p("#lp-ring-stack","#lp-stat-stack",t,e,"#8B5CF6"),p("#lp-ring-favs","#lp-stat-favs",i,e,"#EF4444"),p("#lp-ring-eva","#lp-stat-eva",s,e,"#22C55E"),this.container.querySelector("#lp-stat-stack")?.closest(".lp-stat-box")?.classList.toggle("stat--empty",t===0)}_applyFilters(){let e=this._allItems;if(this._query.trim()&&(e=this._fuse?this._fuse.search(this._query).map(r=>r.item):e.filter(r=>r.name.toLowerCase().includes(this._query.toLowerCase()))),e=e.filter(r=>K(r,this._category)),e=e.filter(r=>Y(r,this._objective)),this._evidenceFilter&&(e=e.filter(r=>r.evidenceLevel===this._evidenceFilter)),this._maxPriceFilter<300&&(e=e.filter(r=>{const p=this._prices?.[r.id],u=p?parseFloat(p.shopee?.price||p.amazon?.price||p.mercado_livre?.price||0):0;return(u>0?u:r.estimatedMonthlyCost||0)<=this._maxPriceFilter})),this._benefitsFilter.size>0&&(e=e.filter(r=>{const p=(r.benefits||[]).map(u=>u.toLowerCase());return[...this._benefitsFilter].every(u=>{const h=u.toLowerCase();return p.some(v=>v.includes(h)||h.includes(v))})})),(x.getState().user?.tier??"free")==="free"&&e.length>3){const r=[...e];r.splice(3,0,{id:"sponsored-ad",isAd:!0}),this._filtered=r}else this._filtered=e;const s=this.container.querySelector("#lp-results-label");if(s){const r=this._evidenceFilter||this._maxPriceFilter<300||this._benefitsFilter.size>0;s.textContent=this._query||this._category!=="Todos"||this._objective||r?`${this._filtered.length} resultado(s)`:""}}_renderGrid(){if(this._modalOpen)return;const e=this.container.querySelector("#lp-grid");if(e){if(!this._filtered.length){e.innerHTML=`
        <div class="lp-empty">
          <div class="lp-empty-icon">🔍</div>
          <p style="font-weight:700;margin:0 0 6px;">Nenhum resultado</p>
          <p style="font-size:13px;margin:0;">Tente outra busca ou remova os filtros.</p>
        </div>`,this._scroller&&(this._scroller.unmount(),this._scroller=null);return}this._scroller&&(this._scroller.unmount(),this._scroller=null),e.innerHTML="",this._scroller=new N(e,this._filtered,t=>this._renderSupplementCard(t),{itemHeight:310,bufferSize:5}),this._scroller.mount(),this._page=1}}_renderSupplementCard(e){if(e.isAd)return this._renderSponsoredAdCard();x.stack;const i=k().has(e.id),s=e.evidenceLevel,r=w[s]??w.C,p=e.benefits?.[0]??"",u=e.image||`/assets/${e.id.replace(/-/g,"_")}.png`,h=T(e,this._prices),v=C(e,this._prices),y=O(e,this._prices);let l="";return h?l=`<div class="lp-card-top-badge" style="background:rgba(34,197,94,0.10);color:#22C55E;">
        ECONOMIZE R$ ${n(String(h))} NA AMAZON
      </div>`:e.category&&(l=`<div class="lp-card-top-badge" style="background:var(--color-brand-muted);color:var(--color-brand);">
        ${n(e.category)}
      </div>`),`
      <div class="lp-card" role="listitem" data-id="${e.id}">
        ${l}
        <div class="lp-card-img-wrap">
          <img class="lp-card-img"
            src="${n(u)}"
            alt="${n(e.name)}"
            loading="lazy"
            importance="auto"
            onerror="this.style.display='none'"
          />
          ${s?`<span class="lp-card-ev-badge" style="background:${r.bg};color:${r.color};">EV. ${n(String(s))}</span>`:""}
        </div>
        <div class="lp-card-info">
          <p class="lp-card-name">${n(e.name)}</p>
          <p class="lp-card-cat">${n(e.category??"")}</p>
          ${p?`<p class="lp-card-desc">${n(p)}</p>`:""}
          <div class="lp-card-price-row">
            <span class="lp-card-price">${S(v.price)}</span>
            <span class="lp-card-dose">${y}</span>
          </div>
          <div class="lp-card-actions">
            <button class="lp-btn-fav${i?" faved":""}" data-action="toggle-fav" data-id="${e.id}" aria-label="${i?"Remover dos favoritos":"Favoritar"}" type="button">
              ${i?"♥":"♡"}
            </button>
            <button class="lp-btn-ver-precos" data-action="open-modal" data-id="${e.id}" type="button">
              VER PREÇOS →
            </button>
          </div>
        </div>
      </div>
    `}_renderSponsoredAdCard(){return`
      <div class="lp-card sponsored-ad-card" style="border: 1.5px dashed var(--color-brand); background: rgba(124, 58, 237, 0.02); display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 24px; text-align: center; height: 100%; box-sizing: border-box; position: relative; min-height: 290px;">
        <span style="position: absolute; top: 12px; right: 12px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; background: rgba(124, 58, 237, 0.12); color: var(--color-brand); padding: 3px 8px; border-radius: 6px;">Patrocinado</span>
        <div style="font-size: 36px; margin-bottom: 12px; filter: drop-shadow(0 4px 10px rgba(124,58,237,0.3));">🌟</div>
        <p style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 15px; margin: 0 0 6px 0; color: var(--color-text-primary);">SupliList PRO</p>
        <p style="font-size: 12px; color: var(--color-text-secondary); margin: 0 0 18px 0; line-height: 1.45; max-width: 190px;">Remova anúncios e tenha acesso ao Histórico Avançado com gráficos e relatórios Excel.</p>
        <button class="lp-btn-ver-precos lp-upgrade-btn" style="width: 100%; height: 40px; min-height: 40px; font-size: 12px; background: var(--color-brand); color: #ffffff; border-color: var(--color-brand); font-weight: 700; border-radius: 8px; cursor: pointer; transition: all 0.15s ease;" data-action="upgrade-now">Quero Premium</button>
      </div>
    `}_openCheckoutModal(){B.show({tier:"pro"})}_loadMore(){const e=this._page*A;if(e>=this._filtered.length)return;const t=this.container.querySelector("#lp-grid");if(!t)return;const i=this.container.querySelector("#lp-loading-more");i&&(i.style.display="block"),requestAnimationFrame(()=>{t.appendChild(this._buildFragment(e,e+A)),this._page++,i&&(i.style.display="none")})}_buildFragment(e,t){const i=document.createDocumentFragment();x.stack;const s=k();return this._filtered.slice(e,t).forEach(r=>{const p=s.has(r.id),u=r.evidenceLevel,h=w[u]??w.C,v=r.benefits?.[0]??"",y=r.image||`/assets/${r.id.replace(/-/g,"_")}.png`,l=T(r,this._prices),d=C(r,this._prices),c=O(r,this._prices);let f="";l?f=`<div class="lp-card-top-badge" style="background:rgba(34,197,94,0.10);color:#22C55E;">
          ECONOMIZE R$ ${n(String(l))} NA AMAZON
        </div>`:r.category&&(f=`<div class="lp-card-top-badge" style="background:var(--color-brand-muted);color:var(--color-brand);">
          ${n(r.category)}
        </div>`);const a=document.createElement("div");a.className="lp-card",a.role="listitem",a.dataset.id=r.id,a.innerHTML=`
        ${f}
        <div class="lp-card-img-wrap">
          <img class="lp-card-img"
            src="${n(y)}"
            alt="${n(r.name)}"
            loading="lazy"
            importance="auto"
            onerror="this.style.display='none'"
          />
          ${u?`<span class="lp-card-ev-badge" style="background:${h.bg};color:${h.color};">EV. ${n(String(u))}</span>`:""}
        </div>
        <div class="lp-card-info">
          <p class="lp-card-name">${n(r.name)}</p>
          <p class="lp-card-cat">${n(r.category??"")}</p>
          ${v?`<p class="lp-card-desc">${n(v)}</p>`:""}
          <div class="lp-card-price-row">
            <span class="lp-card-price">${S(d.price)}</span>
            <span class="lp-card-dose">${c}</span>
          </div>
          <div class="lp-card-actions">
            <button class="lp-btn-fav${p?" faved":""}" data-action="toggle-fav" data-id="${r.id}" aria-label="${p?"Remover dos favoritos":"Favoritar"}" type="button">
              ${p?"♥":"♡"}
            </button>
            <button class="lp-btn-ver-precos" data-action="open-modal" data-id="${r.id}" type="button">
              VER PREÇOS →
            </button>
          </div>
        </div>
      `,i.appendChild(a)}),i}_initInfiniteScroll(){const e=this.container.querySelector("#lp-sentinel");if(!(!e||!("IntersectionObserver"in window)))try{this._observer=new IntersectionObserver(t=>{t[0].isIntersecting&&this._loadMore()},{rootMargin:"300px"}),this._observer.observe(e)}catch{this._observer?.disconnect(),this._observer=null}}_refreshCardStates(){this._renderStats();const e=x.stack??[],t=k();if(this.container.querySelectorAll(".lp-card").forEach(i=>{const s=i.dataset.id,r=t.has(s),p=i.querySelector('[data-action="toggle-fav"]');p&&(p.classList.toggle("faved",r),p.textContent=r?"♥":"♡",p.setAttribute("aria-label",r?"Remover dos favoritos":"Favoritar"))}),this._modalOpen){const i=document.querySelector("#lp-modal-add-btn");if(i){const s=e.some(r=>r.supplementId===this._modalOpen);i.classList.toggle("in-stack",s),i.textContent=s?"✓ Já no Stack":"+ Adicionar ao Stack"}}}_pushScrollLock(e="modal"){this._scrollLockStack.includes(e)||(this._scrollLockStack.push(e),document.body.classList.add("has-modal-open"))}_popScrollLock(e="modal"){const t=this._scrollLockStack.indexOf(e);t!==-1&&(this._scrollLockStack.splice(t,1),this._scrollLockStack.length===0&&document.body.classList.remove("has-modal-open"))}_openModal(e){this._closeModal();const t=this._allItems.find(a=>a.id===e);if(!t)return;this._modalOpen=e;const i=t.evidenceLevel,s=w[i]??w.C,r=t.image||`/assets/${t.id.replace(/-/g,"_")}.png`,u=(x.stack??[]).some(a=>a.supplementId===t.id),h=I.getLinks(t.name,t.id);let v="";const y=t.id;if(this._prices&&this._prices[y]){const a=this._prices[y],b=Object.entries(a).reduce((g,[m,_])=>$(_)<$(a[g])?m:g,Object.keys(a)[0]);v=Object.entries(a).map(([g,m])=>{const _=g===b,F=m.qty&&m.unit?`${m.qty}${m.unit} · R$ ${(m.pricePerUnit??m.price).toFixed(2).replace(".",",")}/${m.unit}`:"";return`
        <div class="lp-price-card${_?" lp-price-card--best":""}">
          <div class="lp-price-card-left">
            <div class="lp-price-card-store-row">
              <span class="lp-price-card-store">${n(String(m.label??""))}</span>
              ${_?'<span class="lp-price-best-badge">✓ Melhor custo-benefício</span>':""}
            </div>
            <span class="lp-price-card-val">${S(m.price)}</span>
            ${F?`<span class="lp-price-qty">${n(F)}</span>`:""}
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${m.saving?`<span class="lp-price-saving">-R$ ${n(String(m.saving))}</span>`:""}
            <a class="lp-price-link"
               href="${P(V(m.url)?m.url:h[g])}"
               target="_blank"
               rel="noopener noreferrer"
               data-aff-id="${n(t.id)}"
               data-aff-mp="${n(g)}">Ver Oferta →</a>
          </div>
        </div>`}).join("")}else{const a=C(t,null);v=[{key:"amazon",label:"Amazon"},{key:"mercadolivre",label:"Mercado Livre"},{key:"shopee",label:"Shopee"}].map(({key:g,label:m})=>`
        <div class="lp-price-card">
          <div class="lp-price-card-left">
            <span class="lp-price-card-store">${n(m)}</span>
            <span class="lp-price-card-val">${S(a.price)}</span>
          </div>
          <a class="lp-price-link"
             href="${P(h[g])}"
             target="_blank"
             rel="noopener noreferrer"
             data-aff-id="${n(t.id)}"
             data-aff-mp="${n(g)}">Ver Oferta →</a>
        </div>
      `).join("")}const l=t.warnings?.length?`<ul>${t.warnings.map(a=>`<li>${n(a)}</li>`).join("")}</ul>`:'<p style="color:var(--color-text-muted)">Nenhum aviso registrado.</p>',d=t.sideEffects?.length?`<p style="font-weight:600;color:var(--color-text-secondary);margin:10px 0 4px;">Efeitos Colaterais</p><ul>${t.sideEffects.map(a=>`<li>${n(a)}</li>`).join("")}</ul>`:"",c=document.createElement("div");c.id="lp-modal-overlay",c.innerHTML=`
      <div id="lp-modal-box" role="dialog" aria-modal="true" aria-label="${t.name}">
        <button id="lp-modal-close" aria-label="Fechar">✕</button>

        <div class="lp-modal-top">
          <div class="lp-modal-img-col">
            <div class="lp-modal-img-wrap">
              <img class="lp-modal-img" src="${r}" alt="${n(t.name)}" onerror="this.style.display='none'" />
            </div>
            <p class="lp-modal-img-col-name">${n(t.name)}</p>
            <p class="lp-modal-img-col-cat">${n(t.category??"")}</p>
            ${i?`<span style="display:inline-flex;align-self:flex-start;font-size:10px;font-weight:700;text-transform:uppercase;padding:3px 9px;border-radius:6px;background:${s.bg};color:${s.color};">Evidência ${i}</span>`:""}
            <p style="font-size:13px;color:var(--color-text-secondary);line-height:1.5;margin:4px 0 0;">${n(t.benefits?.join(" · ")??"")}</p>
          </div>

          <div class="lp-modal-info-col">
            <div>
              <h3>Comparação de Preços</h3>
              <div class="lp-price-cards">${v}</div>
            </div>

            <div>
              <div class="lp-tabs">
                <button class="lp-tab active" data-tab="dose">Dose Clínica</button>
                <button class="lp-tab" data-tab="benefits">Benefícios</button>
                <button class="lp-tab" data-tab="safety">Segurança</button>
              </div>
              <div class="lp-tab-content">
                <div class="lp-tab-pane active" id="lp-tab-dose">
                  <p style="margin:0 0 6px;"><strong style="color:var(--color-text-primary);">Dose de manutenção:</strong> ${n(String(t.dosage?.maintenance??"—"))} ${n(t.dosage?.unit??"")}</p>
                  <p style="margin:0 0 6px;"><strong style="color:var(--color-text-primary);">Limite superior:</strong> ${n(String(t.dosage?.upperLimit??"—"))} ${n(t.dosage?.unit??"")}</p>
                  <p style="margin:0;"><strong style="color:var(--color-text-primary);">Quando tomar:</strong> ${n(t.dosage?.timing??"—")}</p>
                </div>
                <div class="lp-tab-pane" id="lp-tab-benefits">
                  ${t.benefits?.length?`<ul>${t.benefits.map(a=>`<li>${n(a)}</li>`).join("")}</ul>`:'<p style="color:var(--color-text-muted)">Sem dados.</p>'}
                </div>
                <div class="lp-tab-pane" id="lp-tab-safety">
                  ${l}
                  ${d}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="lp-modal-bottom">
          <button id="lp-modal-add-btn" class="lp-modal-add-btn${u?" in-stack":""}" data-id="${t.id}">
            ${u?"✓ Já no Stack":"+ Adicionar ao Stack"}
          </button>
        </div>
      </div>
    `,document.body.appendChild(c),this._pushScrollLock("modal"),c.querySelectorAll(".lp-tab").forEach(a=>{a.addEventListener("click",()=>{c.querySelectorAll(".lp-tab").forEach(g=>g.classList.remove("active")),c.querySelectorAll(".lp-tab-pane").forEach(g=>g.classList.remove("active")),a.classList.add("active");const b=c.querySelector(`#lp-tab-${a.dataset.tab}`);b&&b.classList.add("active")})}),c.querySelector("#lp-modal-close").addEventListener("click",()=>this._closeModal()),c.addEventListener("click",a=>{a.target===c&&this._closeModal()}),c.addEventListener("click",a=>{const b=a.target.closest("[data-aff-mp]");b&&I.trackClick(b.dataset.affId,b.dataset.affMp)});const f=c.querySelector("#lp-modal-add-btn");f.addEventListener("click",a=>{a.stopPropagation();const b=f.dataset.id,g=this._allItems.find(_=>_.id===b);if(!g)return;(x.stack??[]).some(_=>_.supplementId===b)?x.dispatch(E.REMOVE_FROM_STACK,{supplementId:b}):x.dispatch(E.ADD_TO_STACK,{supplementId:g.id,name:g.name,dosage:g.dosage?.maintenance??5,unit:g.dosage?.unit??"g",quantity:0}),this._refreshCardStates()})}_closeModal(){const e=document.getElementById("lp-modal-overlay");e&&(e.remove(),this._popScrollLock("modal")),this._modalOpen=null}_onKeydown(e){e.key==="Escape"&&this._modalOpen&&this._closeModal()}_syncObjectiveChip(){if(!this._objective)return;const e=this.container.querySelector("#lp-obj-row");if(!e)return;const t=e.querySelector(`[data-obj="${this._objective}"]`);t&&t.classList.add("active")}_attachListeners(){const e=this.container.querySelector("#lp-search");e&&e.addEventListener("input",l=>{clearTimeout(this._debounceTimer),this._debounceTimer=setTimeout(()=>{this._debounceTimer=null,this._query=l.target.value,this._applyFilters(),this._renderGrid(),this._saveSearchHistory(this._query)},G)});const t=this.container.querySelector("#lp-trending");t&&t.addEventListener("click",l=>{const d=l.target.closest("[data-trend]");if(!d)return;const c=this.container.querySelector("#lp-search");c&&(c.value=d.dataset.trend),this._query=d.dataset.trend,this._applyFilters(),this._renderGrid(),this._saveSearchHistory(this._query)});const i=this.container.querySelector("#lp-adv-filters-btn"),s=this.container.querySelector("#lp-advanced-panel");i&&s&&i.addEventListener("click",()=>{this._advancedPanelOpen=!this._advancedPanelOpen,s.style.display=this._advancedPanelOpen?"flex":"none",i.classList.toggle("active",this._advancedPanelOpen)});const r=this.container.querySelector("#lp-price-range"),p=this.container.querySelector("#lp-price-range-val");r&&p&&r.addEventListener("input",l=>{const d=parseInt(l.target.value,10);this._maxPriceFilter=d,p.textContent=d>=300?"R$ 300 (Qualquer preço)":`R$ ${d}`,this._applyFilters(),this._renderGrid()}),s&&s.addEventListener("click",l=>{const d=l.target.closest(".lp-evidence-filter");if(d){const f=d.dataset.evidence,a=d.classList.contains("active");s.querySelectorAll(".lp-evidence-filter").forEach(b=>b.classList.remove("active")),a?this._evidenceFilter="":(d.classList.add("active"),this._evidenceFilter=f),this._applyFilters(),this._renderGrid();return}const c=l.target.closest(".lp-benefit-filter");if(c){const f=c.dataset.benefit;this._benefitsFilter.has(f)?(this._benefitsFilter.delete(f),c.classList.remove("active")):(this._benefitsFilter.add(f),c.classList.add("active")),this._applyFilters(),this._renderGrid();return}});const u=this.container.querySelector("#lp-history-panel");u&&u.addEventListener("click",l=>{const d=l.target.closest(".lp-history-chip");if(d){const f=d.dataset.query,a=this.container.querySelector("#lp-search");a&&(a.value=f),this._query=f,this._applyFilters(),this._renderGrid();return}if(l.target.closest("#lp-clear-history-btn")){localStorage.removeItem("suplilist:search-history"),this._renderSearchHistory();return}});const h=this.container.querySelector("#lp-cat-row");h&&h.addEventListener("click",l=>{const d=l.target.closest("[data-cat]");d&&(h.querySelectorAll(".lp-chip").forEach(c=>c.classList.remove("active")),d.classList.add("active"),this._category=d.dataset.cat,this._applyFilters(),this._renderGrid())});const v=this.container.querySelector("#lp-obj-row");v&&v.addEventListener("click",l=>{const d=l.target.closest("[data-obj]");if(!d)return;const c=d.classList.contains("active");v.querySelectorAll(".lp-chip").forEach(f=>f.classList.remove("active")),c?this._objective="":(d.classList.add("active"),this._objective=d.dataset.obj),this._applyFilters(),this._renderGrid()});const y=this.container.querySelector("#lp-grid");y&&y.addEventListener("click",l=>{const d=l.target.closest('[data-action="toggle-fav"]');if(d){l.stopPropagation(),Z(d.dataset.id),this._refreshCardStates();return}const c=l.target.closest('[data-action="open-modal"]');if(c){l.stopPropagation(),this._openModal(c.dataset.id);return}if(l.target.closest('[data-action="upgrade-now"]')){l.stopPropagation(),this._openCheckoutModal();return}const a=l.target.closest(".lp-card");if(a){if(a.dataset.id==="sponsored-ad"){l.stopPropagation(),this._openCheckoutModal();return}a.dataset.id&&this._openModal(a.dataset.id)}})}_getSearchHistory(){try{return JSON.parse(localStorage.getItem("suplilist:search-history")||"[]")}catch{return[]}}_saveSearchHistory(e){if(!e||!e.trim())return;const t=e.trim();let i=this._getSearchHistory();i=i.filter(s=>s.toLowerCase()!==t.toLowerCase()),i.unshift(t),localStorage.setItem("suplilist:search-history",JSON.stringify(i.slice(0,10))),this._renderSearchHistory()}_renderSearchHistory(){const e=this.container.querySelector("#lp-history-panel"),t=this.container.querySelector("#lp-history-chips");if(!e||!t)return;const i=this._getSearchHistory();if(i.length===0){e.style.display="none";return}e.style.display="flex",t.innerHTML=i.map(s=>`
      <button class="lp-chip lp-history-chip" data-query="${n(s)}" style="margin: 0; padding: 4px 10px; font-size: 11px; background: var(--color-surface-secondary); display: flex; align-items: center; gap: 4px; border-radius: 8px;">
        <span>🔍</span> ${n(s)}
      </button>
    `).join("")}}export{oe as default};
