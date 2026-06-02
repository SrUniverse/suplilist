import{l as F,s as m,A as E}from"./main-8KErQew8.js";import{S as L}from"./stack-recommender-DZBCs9MK.js";import{F as P}from"./vendor-PnIxnNo9.js";import{e as s}from"./escape-Br5wU8qn.js";import{E as _}from"./evidence-D5RtUc7g.js";import{a as O}from"./affiliate-engine-x2SXFq_y.js";function z(i,e){const t=(e||"g").toLowerCase().trim();return t==="g"?i:t==="mg"?i/1e3:t==="mcg"?i/1e6:t==="ui"||t==="caps"||t==="capsules"||t==="pills"?i/1e3:i}const H=30,R=24,B=300;class G{constructor(e,t=[],r,a={}){this.container=e,this.items=t,this.renderItem=r,this.itemHeight=a.itemHeight||80,this.bufferSize=a.bufferSize||5,this.scrollElement=a.scrollElement||window,this.visibleStartIndex=0,this.visibleEndIndex=0,this.containerHeight=0,this.scrollTop=0,this.listElement=null,this.itemElements=[],this._scrollHandler=this._onScroll.bind(this),this._resizeObserver=null,this._intersectionObserver=null}mount(){this._createContainer(),this._getContainerHeight(),this._render(),this._attachListeners()}unmount(){this._detachListeners(),this._cleanupObservers(),this.listElement&&this.listElement.remove()}updateItems(e){this.items=e,this.visibleStartIndex=0,this.visibleEndIndex=0,this._render()}scrollToIndex(e){const t=Math.max(0,e*this.itemHeight-this.containerHeight/2);this.scrollElement.scrollTop=t}_createContainer(){this.listElement=document.createElement("div"),this.listElement.className="virtual-scroller-list",this.listElement.style.cssText=`
      position: relative;
      width: 100%;
      contain: layout style paint;
    `,this.container.appendChild(this.listElement)}_getContainerHeight(){this.scrollElement===window?this.containerHeight=window.innerHeight:this.containerHeight=this.scrollElement.clientHeight}_render(){this._getContainerHeight(),this._updateVisibleRange();const e=this.items.length*this.itemHeight;this.listElement.style.height=e+"px";const t=[];for(let r=this.visibleStartIndex;r<=this.visibleEndIndex;r++){const a=this.items[r];if(a){const o=r*this.itemHeight,n=this.renderItem(a,r);t.push(`
          <div class="virtual-item" data-index="${r}" style="
            position: absolute;
            top: ${o}px;
            width: 100%;
            height: ${this.itemHeight}px;
          ">
            ${n}
          </div>
        `)}}this.listElement.innerHTML=t.join(""),this.itemElements=this.listElement.querySelectorAll(".virtual-item")}_updateVisibleRange(){this.scrollElement===window?this.scrollTop=window.pageYOffset||document.documentElement.scrollTop:this.scrollTop=this.scrollElement.scrollTop,this.visibleStartIndex=Math.max(0,Math.floor(this.scrollTop/this.itemHeight)-this.bufferSize),this.visibleEndIndex=Math.min(this.items.length-1,Math.ceil((this.scrollTop+this.containerHeight)/this.itemHeight)+this.bufferSize)}_attachListeners(){this.scrollElement===window?(window.addEventListener("scroll",this._scrollHandler,{passive:!0}),window.addEventListener("resize",this._scrollHandler)):this.scrollElement.addEventListener("scroll",this._scrollHandler,{passive:!0})}_detachListeners(){this.scrollElement===window?(window.removeEventListener("scroll",this._scrollHandler),window.removeEventListener("resize",this._scrollHandler)):this.scrollElement.removeEventListener("scroll",this._scrollHandler)}_cleanupObservers(){this._resizeObserver&&(this._resizeObserver.disconnect(),this._resizeObserver=null),this._intersectionObserver&&(this._intersectionObserver.disconnect(),this._intersectionObserver=null)}_onScroll(){this._render()}}function T(i){if(!i||typeof i!="string")return"#";try{const e=new URL(i);return["https:","http:"].includes(e.protocol)?i:"#"}catch{return"#"}}function N(i){return/amzn\.to\/|amazon\.com\.br\/dp\/|meli\.la\/|shope\.ee\//.test(i??"")}const V=["Todos","Performance","Proteínas","Vitaminas","Adaptógenos","Hormônios","Cognição","Antioxidantes","Sono","Saúde Geral"],D=["Hipertrofia","Saúde Geral","Longevidade","Performance","Foco"],U={Hipertrofia:"bulk","Saúde Geral":"general",Longevidade:"general",Performance:"endurance",Foco:"endurance"},j=R;function $(i){return i.pricePerUnit??i.price}function q(i,e){const t=e&&e[i.id]?Object.values(e[i.id]):null;return!t||!t.length?null:t.reduce((r,a)=>$(r)<$(a)?r:a)}function C(i,e){const t=q(i,e);if(t)return{price:t.price,label:t.label};const r=i.dosage?.maintenance??5,a=i.dosage?.unit||"g",o=i.pricePerGram??.3;return{price:z(r,a)*o*H,label:null}}function A(i,e){const t=q(i,e);if(t){if(t.pricePerUnit&&t.unit){const c=i.dosage?.maintenance??5,d=z(c,t.unit);return`R$ ${(t.pricePerUnit*d).toFixed(2).replace(".",",")} / dose`}return`R$ ${(t.price/H).toFixed(2).replace(".",",")} / dose`}const r=i.dosage?.maintenance??5,a=i.dosage?.unit||"g",o=i.pricePerGram??.3;return`R$ ${(z(r,a)*o).toFixed(2).replace(".",",")} / dose`}function M(i,e){const t=i.id;if(!e||!e[t])return null;const r=Object.values(e[t]),a=Math.max(...r.map(o=>o.saving||0));return a>0?a:null}function K(i,e){if(!e||e==="Todos")return!0;const t=(i.category||"").toLowerCase();return e==="Performance"?t.includes("força")||t.includes("performance")||t.includes("resistência")||t.includes("endurance")||t.includes("queima")||t.includes("gordura")||t.includes("recovery"):e==="Proteínas"?t.startsWith("prote"):e==="Vitaminas"?t.includes("vitam"):e==="Adaptógenos"?t.includes("adapt"):e==="Hormônios"?t.includes("hormon")||t.includes("testoster")||t.includes("libido"):e==="Cognição"?t.includes("cogni")||t.includes("neuro")||t.includes("foco"):e==="Antioxidantes"?t.includes("antioxid")||t.includes("anti-inflamat"):e==="Sono"?t.includes("sono")||t.includes("recuper"):e==="Saúde Geral"?t.includes("saúde")||t.includes("geral")||t.includes("imun")||t.includes("intestin")||t.includes("articular")||t.includes("pele")||t.includes("mineral")||t.includes("miner")||t.includes("omega")||t.includes("ômega"):!0}function J(i,e){if(!e)return!0;const t=U[e];return t?i.targets&&i.targets[t]!=null&&i.targets[t]>0:!0}function k(){return new Set(m.favorites??[])}function Y(i){k().has(i)?m.dispatch(E.REMOVE_FAVORITE,{supplementId:i}):m.dispatch(E.ADD_FAVORITE,{supplementId:i})}function S(i){return`R$ ${Number(i).toFixed(2).replace(".",",").replace(/\B(?=(\d{3})+(?!\d))/g,".")}`}class re{constructor(e,t={}){this.container=e,this._unsubscribe=null,this._fuse=null,this._allItems=[],this._filtered=[],this._page=0,this._query="",this._category="Todos",this._objective=t.objective||"",this._prices=null,this._modalOpen=null,this._debounceTimer=null,this._observer=null,this._scroller=null,this._boundKeydown=this._onKeydown.bind(this),this._scrollLockStack=[]}mount(){this._attachStyles(),this._allItems=L,this._fuse=new P(this._allItems,{keys:["name","category","benefits"],threshold:.35,includeScore:!0,ignoreLocation:!0}),this._fetchController=new AbortController,fetch("/data/prices.json",{signal:this._fetchController.signal}).then(e=>e.ok?e.json():Promise.reject(new Error(`HTTP ${e.status}`))).then(e=>{this._prices=e,this._renderGrid()}).catch(e=>{e.name!=="AbortError"&&F.warn("[ListPage] prices.json failed to load, using estimates:",e.message)}),this._render(),this._syncObjectiveChip(),this._applyFilters(),this._renderStats(),this._renderGrid(),this._initInfiniteScroll(),this._attachListeners(),this._unsubscribe=m.subscribe(()=>this._refreshCardStates()),document.addEventListener("keydown",this._boundKeydown)}unmount(){this._fetchController?.abort(),this._unsubscribe?.(),this._observer?.disconnect(),this._scroller?.unmount(),document.removeEventListener("keydown",this._boundKeydown),this._closeModal(),clearTimeout(this._debounceTimer);const e=document.getElementById("router-outlet");e&&(e.style.overflow=""),document.body.style.overflow=""}_attachStyles(){if(document.getElementById("list-page-styles"))return;const e=document.createElement("style");e.id="list-page-styles",e.textContent=`
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
              ${V.map(e=>`<button class="lp-chip${e==="Todos"?" active":""}" data-cat="${e}">${e}</button>`).join("")}
            </div>
          </div>
          <div class="lp-filter-row-wrap">
            <div class="lp-filter-row" id="lp-obj-row">
              <span class="lp-filter-label">Objetivo</span>
              ${D.map(e=>`<button class="lp-chip" data-obj="${e}">${e}</button>`).join("")}
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
    `}_renderStats(){const e=L.length,t=(m.stack||[]).length,r=k().size,a=L.filter(d=>d.evidenceLevel==="A").length,o=157.1,n=(d,g,b,v,w)=>{const h=this.container.querySelector(d),x=this.container.querySelector(g);if(!h||!x)return;x.textContent=b;const l=v>0?Math.min(1,b/v):0;h.style.stroke=w,h.style.strokeDashoffset=o*(1-l)};n("#lp-ring-total","#lp-stat-total",e,e,"var(--color-brand)"),n("#lp-ring-stack","#lp-stat-stack",t,e,"#8B5CF6"),n("#lp-ring-favs","#lp-stat-favs",r,e,"#EF4444"),n("#lp-ring-eva","#lp-stat-eva",a,e,"#22C55E"),this.container.querySelector("#lp-stat-stack")?.closest(".lp-stat-box")?.classList.toggle("stat--empty",t===0)}_applyFilters(){let e=this._allItems;this._query.trim()&&(e=this._fuse?this._fuse.search(this._query).map(r=>r.item):e.filter(r=>r.name.toLowerCase().includes(this._query.toLowerCase()))),e=e.filter(r=>K(r,this._category)),e=e.filter(r=>J(r,this._objective)),this._filtered=e;const t=this.container.querySelector("#lp-results-label");t&&(t.textContent=this._query||this._category!=="Todos"||this._objective?`${this._filtered.length} resultado(s)`:"")}_renderGrid(){if(this._modalOpen)return;const e=this.container.querySelector("#lp-grid");if(e){if(!this._filtered.length){e.innerHTML=`
        <div class="lp-empty">
          <div class="lp-empty-icon">🔍</div>
          <p style="font-weight:700;margin:0 0 6px;">Nenhum resultado</p>
          <p style="font-size:13px;margin:0;">Tente outra busca ou remova os filtros.</p>
        </div>`,this._scroller&&(this._scroller.unmount(),this._scroller=null);return}this._scroller&&(this._scroller.unmount(),this._scroller=null),e.innerHTML="",this._scroller=new G(e,this._filtered,t=>this._renderSupplementCard(t),{itemHeight:310,bufferSize:5}),this._scroller.mount(),this._page=1}}_renderSupplementCard(e){m.stack;const r=k().has(e.id),a=e.evidenceLevel,o=_[a]??_.C,n=e.benefits?.[0]??"",c=e.image||`/assets/${e.id.replace(/-/g,"_")}.png`,d=M(e,this._prices),g=C(e,this._prices),b=A(e,this._prices);let v="";return d?v=`<div class="lp-card-top-badge" style="background:rgba(34,197,94,0.10);color:#22C55E;">
        ECONOMIZE R$ ${s(String(d))} NA AMAZON
      </div>`:e.category&&(v=`<div class="lp-card-top-badge" style="background:var(--color-brand-muted);color:var(--color-brand);">
        ${s(e.category)}
      </div>`),`
      <div class="lp-card" role="listitem" data-id="${e.id}">
        ${v}
        <div class="lp-card-img-wrap">
          <img class="lp-card-img"
            src="${s(c)}"
            alt="${s(e.name)}"
            loading="lazy"
            importance="auto"
            onerror="this.style.display='none'"
          />
          ${a?`<span class="lp-card-ev-badge" style="background:${o.bg};color:${o.color};">EV. ${s(String(a))}</span>`:""}
        </div>
        <div class="lp-card-info">
          <p class="lp-card-name">${s(e.name)}</p>
          <p class="lp-card-cat">${s(e.category??"")}</p>
          ${n?`<p class="lp-card-desc">${s(n)}</p>`:""}
          <div class="lp-card-price-row">
            <span class="lp-card-price">${S(g.price)}</span>
            <span class="lp-card-dose">${b}</span>
          </div>
          <div class="lp-card-actions">
            <button class="lp-btn-fav${r?" faved":""}" data-action="toggle-fav" data-id="${e.id}" aria-label="${r?"Remover dos favoritos":"Favoritar"}" type="button">
              ${r?"♥":"♡"}
            </button>
            <button class="lp-btn-ver-precos" data-action="open-modal" data-id="${e.id}" type="button">
              VER PREÇOS →
            </button>
          </div>
        </div>
      </div>
    `}_loadMore(){const e=this._page*j;if(e>=this._filtered.length)return;const t=this.container.querySelector("#lp-grid");if(!t)return;const r=this.container.querySelector("#lp-loading-more");r&&(r.style.display="block"),requestAnimationFrame(()=>{t.appendChild(this._buildFragment(e,e+j)),this._page++,r&&(r.style.display="none")})}_buildFragment(e,t){const r=document.createDocumentFragment();m.stack;const a=k();return this._filtered.slice(e,t).forEach(o=>{const n=a.has(o.id),c=o.evidenceLevel,d=_[c]??_.C,g=o.benefits?.[0]??"",b=o.image||`/assets/${o.id.replace(/-/g,"_")}.png`,v=M(o,this._prices),w=C(o,this._prices),h=A(o,this._prices);let x="";v?x=`<div class="lp-card-top-badge" style="background:rgba(34,197,94,0.10);color:#22C55E;">
          ECONOMIZE R$ ${s(String(v))} NA AMAZON
        </div>`:o.category&&(x=`<div class="lp-card-top-badge" style="background:var(--color-brand-muted);color:var(--color-brand);">
          ${s(o.category)}
        </div>`);const l=document.createElement("div");l.className="lp-card",l.role="listitem",l.dataset.id=o.id,l.innerHTML=`
        ${x}
        <div class="lp-card-img-wrap">
          <img class="lp-card-img"
            src="${s(b)}"
            alt="${s(o.name)}"
            loading="lazy"
            importance="auto"
            onerror="this.style.display='none'"
          />
          ${c?`<span class="lp-card-ev-badge" style="background:${d.bg};color:${d.color};">EV. ${s(String(c))}</span>`:""}
        </div>
        <div class="lp-card-info">
          <p class="lp-card-name">${s(o.name)}</p>
          <p class="lp-card-cat">${s(o.category??"")}</p>
          ${g?`<p class="lp-card-desc">${s(g)}</p>`:""}
          <div class="lp-card-price-row">
            <span class="lp-card-price">${S(w.price)}</span>
            <span class="lp-card-dose">${h}</span>
          </div>
          <div class="lp-card-actions">
            <button class="lp-btn-fav${n?" faved":""}" data-action="toggle-fav" data-id="${o.id}" aria-label="${n?"Remover dos favoritos":"Favoritar"}" type="button">
              ${n?"♥":"♡"}
            </button>
            <button class="lp-btn-ver-precos" data-action="open-modal" data-id="${o.id}" type="button">
              VER PREÇOS →
            </button>
          </div>
        </div>
      `,r.appendChild(l)}),r}_initInfiniteScroll(){const e=this.container.querySelector("#lp-sentinel");if(!(!e||!("IntersectionObserver"in window)))try{this._observer=new IntersectionObserver(t=>{t[0].isIntersecting&&this._loadMore()},{rootMargin:"300px"}),this._observer.observe(e)}catch{this._observer?.disconnect(),this._observer=null}}_refreshCardStates(){this._renderStats();const e=m.stack??[],t=k();if(this.container.querySelectorAll(".lp-card").forEach(r=>{const a=r.dataset.id,o=t.has(a),n=r.querySelector('[data-action="toggle-fav"]');n&&(n.classList.toggle("faved",o),n.textContent=o?"♥":"♡",n.setAttribute("aria-label",o?"Remover dos favoritos":"Favoritar"))}),this._modalOpen){const r=document.querySelector("#lp-modal-add-btn");if(r){const a=e.some(o=>o.supplementId===this._modalOpen);r.classList.toggle("in-stack",a),r.textContent=a?"✓ Já no Stack":"+ Adicionar ao Stack"}}}_pushScrollLock(e="modal"){this._scrollLockStack.includes(e)||(this._scrollLockStack.push(e),document.body.classList.add("has-modal-open"))}_popScrollLock(e="modal"){const t=this._scrollLockStack.indexOf(e);t!==-1&&(this._scrollLockStack.splice(t,1),this._scrollLockStack.length===0&&document.body.classList.remove("has-modal-open"))}_openModal(e){this._closeModal();const t=this._allItems.find(l=>l.id===e);if(!t)return;this._modalOpen=e;const r=t.evidenceLevel,a=_[r]??_.C,o=t.image||`/assets/${t.id.replace(/-/g,"_")}.png`,c=(m.stack??[]).some(l=>l.supplementId===t.id),d=O.getLinks(t.name,t.id);let g="";const b=t.id;if(this._prices&&this._prices[b]){const l=this._prices[b],f=Object.entries(l).reduce((p,[u,y])=>$(y)<$(l[p])?u:p,Object.keys(l)[0]);g=Object.entries(l).map(([p,u])=>{const y=p===f,I=u.qty&&u.unit?`${u.qty}${u.unit} · R$ ${(u.pricePerUnit??u.price).toFixed(2).replace(".",",")}/${u.unit}`:"";return`
        <div class="lp-price-card${y?" lp-price-card--best":""}">
          <div class="lp-price-card-left">
            <div class="lp-price-card-store-row">
              <span class="lp-price-card-store">${s(String(u.label??""))}</span>
              ${y?'<span class="lp-price-best-badge">✓ Melhor custo-benefício</span>':""}
            </div>
            <span class="lp-price-card-val">${S(u.price)}</span>
            ${I?`<span class="lp-price-qty">${s(I)}</span>`:""}
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${u.saving?`<span class="lp-price-saving">-R$ ${s(String(u.saving))}</span>`:""}
            <a class="lp-price-link"
               href="${T(N(u.url)?u.url:d[p])}"
               target="_blank"
               rel="noopener noreferrer"
               data-aff-id="${s(t.id)}"
               data-aff-mp="${s(p)}">Ver Oferta →</a>
          </div>
        </div>`}).join("")}else{const l=C(t,null);g=[{key:"amazon",label:"Amazon"},{key:"mercadolivre",label:"Mercado Livre"},{key:"shopee",label:"Shopee"}].map(({key:p,label:u})=>`
        <div class="lp-price-card">
          <div class="lp-price-card-left">
            <span class="lp-price-card-store">${s(u)}</span>
            <span class="lp-price-card-val">${S(l.price)}</span>
          </div>
          <a class="lp-price-link"
             href="${T(d[p])}"
             target="_blank"
             rel="noopener noreferrer"
             data-aff-id="${s(t.id)}"
             data-aff-mp="${s(p)}">Ver Oferta →</a>
        </div>
      `).join("")}const v=t.warnings?.length?`<ul>${t.warnings.map(l=>`<li>${s(l)}</li>`).join("")}</ul>`:'<p style="color:var(--color-text-muted)">Nenhum aviso registrado.</p>',w=t.sideEffects?.length?`<p style="font-weight:600;color:var(--color-text-secondary);margin:10px 0 4px;">Efeitos Colaterais</p><ul>${t.sideEffects.map(l=>`<li>${s(l)}</li>`).join("")}</ul>`:"",h=document.createElement("div");h.id="lp-modal-overlay",h.innerHTML=`
      <div id="lp-modal-box" role="dialog" aria-modal="true" aria-label="${t.name}">
        <button id="lp-modal-close" aria-label="Fechar">✕</button>

        <div class="lp-modal-top">
          <div class="lp-modal-img-col">
            <div class="lp-modal-img-wrap">
              <img class="lp-modal-img" src="${o}" alt="${s(t.name)}" onerror="this.style.display='none'" />
            </div>
            <p class="lp-modal-img-col-name">${s(t.name)}</p>
            <p class="lp-modal-img-col-cat">${s(t.category??"")}</p>
            ${r?`<span style="display:inline-flex;align-self:flex-start;font-size:10px;font-weight:700;text-transform:uppercase;padding:3px 9px;border-radius:6px;background:${a.bg};color:${a.color};">Evidência ${r}</span>`:""}
            <p style="font-size:13px;color:var(--color-text-secondary);line-height:1.5;margin:4px 0 0;">${s(t.benefits?.join(" · ")??"")}</p>
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
                  <p style="margin:0 0 6px;"><strong style="color:var(--color-text-primary);">Dose de manutenção:</strong> ${s(String(t.dosage?.maintenance??"—"))} ${s(t.dosage?.unit??"")}</p>
                  <p style="margin:0 0 6px;"><strong style="color:var(--color-text-primary);">Limite superior:</strong> ${s(String(t.dosage?.upperLimit??"—"))} ${s(t.dosage?.unit??"")}</p>
                  <p style="margin:0;"><strong style="color:var(--color-text-primary);">Quando tomar:</strong> ${s(t.dosage?.timing??"—")}</p>
                </div>
                <div class="lp-tab-pane" id="lp-tab-benefits">
                  ${t.benefits?.length?`<ul>${t.benefits.map(l=>`<li>${s(l)}</li>`).join("")}</ul>`:'<p style="color:var(--color-text-muted)">Sem dados.</p>'}
                </div>
                <div class="lp-tab-pane" id="lp-tab-safety">
                  ${v}
                  ${w}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="lp-modal-bottom">
          <button id="lp-modal-add-btn" class="lp-modal-add-btn${c?" in-stack":""}" data-id="${t.id}">
            ${c?"✓ Já no Stack":"+ Adicionar ao Stack"}
          </button>
        </div>
      </div>
    `,document.body.appendChild(h),this._pushScrollLock("modal"),h.querySelectorAll(".lp-tab").forEach(l=>{l.addEventListener("click",()=>{h.querySelectorAll(".lp-tab").forEach(p=>p.classList.remove("active")),h.querySelectorAll(".lp-tab-pane").forEach(p=>p.classList.remove("active")),l.classList.add("active");const f=h.querySelector(`#lp-tab-${l.dataset.tab}`);f&&f.classList.add("active")})}),h.querySelector("#lp-modal-close").addEventListener("click",()=>this._closeModal()),h.addEventListener("click",l=>{l.target===h&&this._closeModal()}),h.addEventListener("click",l=>{const f=l.target.closest("[data-aff-mp]");f&&O.trackClick(f.dataset.affId,f.dataset.affMp)});const x=h.querySelector("#lp-modal-add-btn");x.addEventListener("click",l=>{l.stopPropagation();const f=x.dataset.id,p=this._allItems.find(y=>y.id===f);if(!p)return;(m.stack??[]).some(y=>y.supplementId===f)?m.dispatch(E.REMOVE_FROM_STACK,{supplementId:f}):m.dispatch(E.ADD_TO_STACK,{supplementId:p.id,name:p.name,dosage:p.dosage?.maintenance??5,unit:p.dosage?.unit??"g",quantity:0}),this._refreshCardStates()})}_closeModal(){const e=document.getElementById("lp-modal-overlay");e&&(e.remove(),this._popScrollLock("modal")),this._modalOpen=null}_onKeydown(e){e.key==="Escape"&&this._modalOpen&&this._closeModal()}_syncObjectiveChip(){if(!this._objective)return;const e=this.container.querySelector("#lp-obj-row");if(!e)return;const t=e.querySelector(`[data-obj="${this._objective}"]`);t&&t.classList.add("active")}_attachListeners(){const e=this.container.querySelector("#lp-search");e&&e.addEventListener("input",n=>{clearTimeout(this._debounceTimer),this._debounceTimer=setTimeout(()=>{this._debounceTimer=null,this._query=n.target.value,this._applyFilters(),this._renderGrid()},B)});const t=this.container.querySelector("#lp-trending");t&&t.addEventListener("click",n=>{const c=n.target.closest("[data-trend]");if(!c)return;const d=this.container.querySelector("#lp-search");d&&(d.value=c.dataset.trend),this._query=c.dataset.trend,this._applyFilters(),this._renderGrid()});const r=this.container.querySelector("#lp-cat-row");r&&r.addEventListener("click",n=>{const c=n.target.closest("[data-cat]");c&&(r.querySelectorAll(".lp-chip").forEach(d=>d.classList.remove("active")),c.classList.add("active"),this._category=c.dataset.cat,this._applyFilters(),this._renderGrid())});const a=this.container.querySelector("#lp-obj-row");a&&a.addEventListener("click",n=>{const c=n.target.closest("[data-obj]");if(!c)return;const d=c.classList.contains("active");a.querySelectorAll(".lp-chip").forEach(g=>g.classList.remove("active")),d?this._objective="":(c.classList.add("active"),this._objective=c.dataset.obj),this._applyFilters(),this._renderGrid()});const o=this.container.querySelector("#lp-grid");o&&o.addEventListener("click",n=>{const c=n.target.closest('[data-action="toggle-fav"]');if(c){n.stopPropagation(),Y(c.dataset.id),this._refreshCardStates();return}const d=n.target.closest('[data-action="open-modal"]');if(d){n.stopPropagation(),this._openModal(d.dataset.id);return}const g=n.target.closest(".lp-card");g&&g.dataset.id&&this._openModal(g.dataset.id)})}}export{re as default};
