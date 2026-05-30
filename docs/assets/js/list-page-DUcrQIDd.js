import{s as c,A as f,e as m}from"./main-4ndHjxTB.js";import{SUPPLEMENTS_DB as b}from"./stack-recommender-nYYO0cNz.js";import{F as y}from"./vendor-CMLop-UK.js";const v=24;function u(g){return(g||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"")}class q{constructor(e){this.container=e,this._listeners=[],this._unsubscribe=null,this._observer=null,this._fuse=null,this._allItems=[],this._filtered=[],this._page=0,this._query="",this._filters={objective:"",evidence:"",category:""}}async mount(){this._attachStyles(),this._render(),await this._loadData(),await this._initFuseSearch(),this._applyFilters(),this._renderGrid(),this._initInfiniteScroll(),this._attachListeners(),this._unsubscribe=c.subscribe?.(()=>this._refreshCardStates())}unmount(){this._listeners.forEach(([e,t,i])=>e.removeEventListener(t,i)),this._listeners=[],this._observer?.disconnect(),this._unsubscribe?.()}_on(e,t,i){e.addEventListener(t,i),this._listeners.push([e,t,i])}_attachStyles(){if(document.getElementById("list-page-styles"))return;const e=document.createElement("style");e.id="list-page-styles",e.textContent=`
      #list-root { padding: 16px 16px 80px; display: flex; flex-direction: column; gap: 16px; }
      .lp-header { display: flex; flex-direction: column; gap: 12px; }
      .lp-stats  { font-size: 12px; color: var(--color-text-secondary); }
      .lp-filters {
        display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px;
        scrollbar-width: none;
      }
      .lp-filters::-webkit-scrollbar { display: none; }
      .lp-filter-select {
        flex-shrink: 0;
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 20px; padding: 7px 12px;
        font-size: 13px; font-weight: 600;
        color: var(--color-text-primary);
        cursor: pointer; outline: none;
        appearance: none; -webkit-appearance: none;
      }
      .lp-filter-select:focus { border-color: var(--color-brand); }
      .lp-btn-clear {
        flex-shrink: 0;
        background: none; border: 1px solid var(--color-border);
        border-radius: 20px; padding: 7px 14px;
        font-size: 13px; font-weight: 600;
        color: var(--color-text-secondary); cursor: pointer;
      }
      .lp-btn-clear:hover { border-color: var(--color-brand); color: var(--color-brand); }
      .lp-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
      }
      @media (min-width: 480px) { .lp-grid { grid-template-columns: repeat(2, 1fr); } }
      @media (min-width: 768px) { .lp-grid { grid-template-columns: repeat(3, 1fr); } }
      @media (min-width: 1024px){ .lp-grid { grid-template-columns: repeat(4, 1fr); } }
      .lp-card {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 16px; padding: 16px;
        display: flex; flex-direction: column; gap: 10px;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .lp-card:hover { border-color: var(--color-brand); box-shadow: 0 0 0 1px var(--color-brand); }
      .lp-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
      .lp-card-name { font-size: 15px; font-weight: 700; color: var(--color-text-primary); }
      .lp-card-cat  { font-size: 11px; color: var(--color-text-secondary); margin-top: 2px; }
      .lp-card-ev   {
        font-size: 10px; font-weight: 700; text-transform: uppercase;
        padding: 2px 8px; border-radius: 20px; white-space: nowrap; letter-spacing: 0.04em;
      }
      .lp-card-actions { display: flex; gap: 6px; justify-content: flex-end; }
      .lp-btn-fav, .lp-btn-add {
        border: none; border-radius: 20px; cursor: pointer;
        font-size: 12px; font-weight: 700; font-family: var(--font-sans, system-ui, sans-serif);
        padding: 6px 12px; transition: opacity 0.15s;
      }
      .lp-btn-fav { background: var(--color-surface-hover, #1e1e1e); color: var(--color-text-primary); }
      .lp-btn-add { background: var(--color-brand, #7C3AED); color: #fff; }
      .lp-btn-fav:hover, .lp-btn-add:hover { opacity: 0.8; }
      .lp-empty {
        text-align: center; padding: 40px 20px;
        color: var(--color-text-secondary);
      }
      .lp-sentinel { height: 1px; }
      .lp-loading  { text-align: center; padding: 20px; color: var(--color-text-secondary); font-size: 13px; }
    `,document.head.appendChild(e)}_render(){this.container.innerHTML=`
      <div id="list-root">
        <div class="lp-header">
          <search-bar id="lp-search" placeholder="Buscar suplemento..."></search-bar>
          <p class="lp-stats" id="lp-stats">Carregando...</p>
          <div class="lp-filters">
            <select class="lp-filter-select" id="lp-filter-obj" aria-label="Filtrar por objetivo">
              <option value="">🎯 Objetivo</option>
              <option value="bulk">Ganho de massa</option>
              <option value="cut">Definição</option>
              <option value="health">Saúde geral</option>
              <option value="performance">Performance</option>
              <option value="recovery">Recuperação</option>
            </select>
            <select class="lp-filter-select" id="lp-filter-ev" aria-label="Filtrar por evidência">
              <option value="">🔬 Evidência</option>
              <option value="A">Nível A — Forte</option>
              <option value="B">Nível B — Moderada</option>
              <option value="C">Nível C — Limitada</option>
              <option value="D">Nível D — Anedótica</option>
            </select>
            <select class="lp-filter-select" id="lp-filter-cat" aria-label="Filtrar por categoria">
              <option value="">📦 Categoria</option>
              <option value="proteina">Proteína</option>
              <option value="aminoacido">Aminoácido</option>
              <option value="vitamina">Vitamina</option>
              <option value="mineral">Mineral</option>
              <option value="adaptogeno">Adaptógeno</option>
              <option value="prebiotico">Prebiótico</option>
              <option value="omega">Ômega</option>
            </select>
            <button class="lp-btn-clear" id="lp-btn-clear" type="button">Limpar</button>
          </div>
        </div>
        <div class="lp-grid" id="lp-grid" role="list"></div>
        <div class="lp-sentinel" id="lp-sentinel" aria-hidden="true"></div>
        <div class="lp-loading" id="lp-loading" style="display:none;">Carregando mais...</div>
      </div>
    `}async _loadData(){this._allItems=b}async _initFuseSearch(){if(!this._allItems.length){this._fuse=null;return}this._fuse=new y(this._allItems,{keys:["name","category","benefits"],threshold:.35,includeScore:!0,ignoreLocation:!0,useExtendedSearch:!1})}_simpleFuzzySearch(e,t){const i=u(e);return t.filter(r=>u(r.name).includes(i))}_applyFilters(){const{objective:e,evidence:t,category:i}=this._filters;let r=this._allItems;this._query.trim()&&(this._fuse?r=this._fuse.search(this._query).map(o=>o.item):r=this._simpleFuzzySearch(this._query,r)),e&&(r=r.filter(o=>o.objectives?.includes(e)||o.objective===e)),t&&(r=r.filter(o=>o.evidenceLevel===t||o.evidence===t)),i&&(r=r.filter(o=>u(o.category).includes(u(i)))),this._filtered=r,this._updateStats()}_updateStats(){const e=this.container.querySelector("#lp-stats");e&&(e.textContent=`${this._filtered.length} suplemento(s) encontrado(s)`)}_renderGrid(){const e=performance.now(),t=this.container.querySelector("#lp-grid");if(!t)return;if(this._page=0,t.innerHTML="",!this._filtered.length){t.innerHTML=`
        <div class="lp-empty" style="grid-column:1/-1;">
          <div style="font-size:32px;margin-bottom:12px;">🔍</div>
          <p style="font-weight:700;margin-bottom:8px;">Nenhum resultado</p>
          <button class="lp-btn-clear" id="lp-empty-clear" type="button">Limpar filtros</button>
        </div>`;const r=t.querySelector("#lp-empty-clear");r&&r.addEventListener("click",()=>this._clearFilters());return}const i=this._buildFragment(0,v);t.appendChild(i),this._page=1,console.debug(`[ListPage] _renderGrid ${this._filtered.length} items in ${(performance.now()-e).toFixed(1)}ms`)}_loadMore(){const e=this._page*v;if(e>=this._filtered.length)return;const t=this.container.querySelector("#lp-grid");if(!t)return;const i=this.container.querySelector("#lp-loading");i&&(i.style.display="block"),requestAnimationFrame(()=>{t.appendChild(this._buildFragment(e,e+v)),this._page++,i&&(i.style.display="none")})}_buildFragment(e,t){const i=document.createDocumentFragment(),r=c.getState?.()?.favorites??c.favorites??[],o=c.stack??[];return this._filtered.slice(e,t).forEach(a=>{const s=document.createElement("div"),l=r.some(p=>p===a.id||p.supplementId===a.id),d=o.some(p=>p.supplementId===a.id),h={A:"#22C55E",B:"#F59E0B",C:"#3B82F6",D:"#6B7280"}[a.evidenceLevel??a.evidence]??"#6B7280";s.className="lp-card",s.role="listitem",s.dataset.id=a.id,s.innerHTML=`
        <div class="lp-card-top">
          <div>
            <p class="lp-card-name">${a.name}</p>
            <p class="lp-card-cat">${a.category??""}</p>
          </div>
          ${a.evidenceLevel||a.evidence?`
            <span class="lp-card-ev" style="background:${h}22;color:${h};border:1px solid ${h}44">
              Ev. ${a.evidenceLevel??a.evidence}
            </span>`:""}
        </div>
        <p style="font-size:12px;color:var(--color-text-secondary);line-height:1.4;flex:1;">
          ${a.benefits?.[0]??a.description??""}
        </p>
        <div class="lp-card-actions">
          <button class="lp-btn-fav" data-action="favorite" data-id="${a.id}"
            aria-label="${l?"Remover dos favoritos":"Adicionar aos favoritos"}"
            aria-pressed="${l}">
            ${l?"❤️":"🤍"}
          </button>
          <button class="lp-btn-add" data-action="add-stack" data-id="${a.id}"
            ${d?'disabled style="opacity:.5;cursor:default"':""}
            aria-label="${d?"Já no stack":"Adicionar ao stack"}">
            ${d?"✓ Stack":"+ Stack"}
          </button>
        </div>
      `,i.appendChild(s)}),i}_initInfiniteScroll(){this._observer?.disconnect();const e=this.container.querySelector("#lp-sentinel");e&&(this._observer=new IntersectionObserver(t=>{t[0].isIntersecting&&this._loadMore()},{rootMargin:"200px"}),this._observer.observe(e))}_refreshCardStates(){const e=c.getState?.()?.favorites??c.favorites??[],t=c.stack??[];this.container.querySelectorAll(".lp-card").forEach(i=>{const r=i.dataset.id,o=e.some(l=>l===r||l.supplementId===r),n=t.some(l=>l.supplementId===r),a=i.querySelector('[data-action="favorite"]'),s=i.querySelector('[data-action="add-stack"]');a&&(a.textContent=o?"❤️":"🤍",a.setAttribute("aria-pressed",o)),s&&(s.textContent=n?"✓ Stack":"+ Stack",s.disabled=n,s.style.opacity=n?"0.5":"1")})}_clearFilters(){this._query="",this._filters={objective:"",evidence:"",category:""};const e=this.container.querySelector("#lp-search"),t=this.container.querySelector("#lp-filter-obj"),i=this.container.querySelector("#lp-filter-ev"),r=this.container.querySelector("#lp-filter-cat");e&&e.setAttribute("value",""),t&&(t.value=""),i&&(i.value=""),r&&(r.value=""),this._applyFilters(),this._renderGrid()}_getItemById(e){return this._allItems.find(t=>t.id===e)}_attachListeners(){const e=this.container.querySelector("#lp-search");e&&(this._on(e,"sl-search",o=>{this._query=o.detail?.query??"",this._applyFilters(),this._renderGrid()}),this._on(e,"sl-clear",()=>{this._query="",this._applyFilters(),this._renderGrid()}));const t=()=>{this._filters.objective=this.container.querySelector("#lp-filter-obj")?.value??"",this._filters.evidence=this.container.querySelector("#lp-filter-ev")?.value??"",this._filters.category=this.container.querySelector("#lp-filter-cat")?.value??"",this._applyFilters(),this._renderGrid()};["#lp-filter-obj","#lp-filter-ev","#lp-filter-cat"].forEach(o=>{const n=this.container.querySelector(o);n&&this._on(n,"change",t)});const i=this.container.querySelector("#lp-btn-clear");i&&this._on(i,"click",()=>this._clearFilters());const r=this.container.querySelector("#lp-grid");r&&this._on(r,"click",o=>{const n=o.target.closest("[data-action]");if(!n)return;const a=n.dataset.id,s=this._getItemById(a);if(s){if(n.dataset.action==="favorite"){const l=c.getState?.()?.favorites?.some(d=>d===a||d.supplementId===a)??c.favorites?.some(d=>d===a)??!1;c.dispatch(l?f.REMOVE_FAVORITE:f.ADD_FAVORITE,{supplementId:a}),m.emit("ui:toastRequested",{message:l?"💔 Removido dos favoritos":"❤️ Adicionado aos favoritos",type:"info"}),this._refreshCardStates()}if(n.dataset.action==="add-stack"){if(n.disabled)return;c.dispatch(f.ADD_TO_STACK,{supplementId:s.id,name:s.name,dosage:s.dosage?.maintenance,unit:s.dosage?.unit||"g",frequency:"diário"}),m.emit("ui:toastRequested",{message:`✅ ${s.name} adicionado ao stack!`,type:"success"}),this._refreshCardStates()}(n.dataset.action==="view-detail"||o.target.closest(".lp-card-name"))&&window.dispatchEvent(new CustomEvent("sl-navigate",{detail:{route:`/supplement/${a}`}}))}})}}export{q as default};
