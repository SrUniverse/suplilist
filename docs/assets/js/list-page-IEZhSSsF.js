import{s as l,A as b}from"./main-CfwEDZr2.js";import{S as f}from"./stack-recommender-DOv4qzO8.js";import{F as h}from"./vendor-CMLop-UK.js";const p=24;class m{constructor(t){this.container=t,this._unsubscribe=null,this._fuse=null,this._allItems=[],this._filtered=[],this._page=0,this._query="",this._filters={objective:"",evidence:"",category:""}}mount(){this._attachStyles(),this._render(),this._allItems=f,this._fuse=new h(this._allItems,{keys:["name","category","benefits"],threshold:.35,includeScore:!0,ignoreLocation:!0}),this._applyFilters(),this._renderGrid(),this._initInfiniteScroll(),this._attachListeners(),this._unsubscribe=l.subscribe(()=>this._refreshCardStates())}unmount(){this._unsubscribe?.()}_attachStyles(){if(document.getElementById("list-page-styles"))return;const t=document.createElement("style");t.id="list-page-styles",t.textContent=`
      #list-root { padding: 16px 16px 80px; display: flex; flex-direction: column; gap: 16px; }
      .lp-search-input {
        width: 100%; box-sizing: border-box;
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 12px; padding: 10px 14px;
        font-size: 14px; color: var(--color-text-primary);
        outline: none;
      }
      .lp-search-input:focus { border-color: var(--color-brand); }
      .lp-stats { font-size: 12px; color: var(--color-text-secondary); margin: 0; }
      .lp-filters {
        display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px;
        scrollbar-width: none;
      }
      .lp-filters::-webkit-scrollbar { display: none; }
      .lp-filter-btn {
        flex-shrink: 0;
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 20px; padding: 7px 14px;
        font-size: 13px; font-weight: 600;
        color: var(--color-text-secondary);
        cursor: pointer; white-space: nowrap;
      }
      .lp-filter-btn.active {
        background: var(--color-brand);
        border-color: var(--color-brand);
        color: #fff;
      }
      .lp-filter-btn:hover:not(.active) { border-color: var(--color-brand); color: var(--color-brand); }
      .lp-filter-select {
        flex-shrink: 0;
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 20px; padding: 7px 12px;
        font-size: 13px; font-weight: 600;
        color: var(--color-text-secondary);
        cursor: pointer; outline: none;
        appearance: none; -webkit-appearance: none;
      }
      .lp-filter-select:focus { border-color: var(--color-brand); }
      .lp-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
      }
      @media (min-width: 480px) { .lp-grid { grid-template-columns: repeat(2, 1fr); } }
      @media (min-width: 768px) { .lp-grid { grid-template-columns: repeat(3, 1fr); } }
      @media (min-width: 1024px) { .lp-grid { grid-template-columns: repeat(4, 1fr); } }
      .lp-card {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 16px; padding: 16px;
        display: flex; flex-direction: column; gap: 10px;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .lp-card:hover { border-color: var(--color-brand); box-shadow: 0 0 0 1px var(--color-brand); }
      .lp-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
      .lp-card-name { font-size: 15px; font-weight: 700; color: var(--color-text-primary); margin: 0; }
      .lp-card-cat  { font-size: 11px; color: var(--color-text-secondary); margin: 2px 0 0; }
      .lp-ev-badge  {
        font-size: 10px; font-weight: 700; text-transform: uppercase;
        padding: 2px 8px; border-radius: 20px; white-space: nowrap; letter-spacing: 0.04em;
        flex-shrink: 0;
      }
      .lp-card-desc { font-size: 12px; color: var(--color-text-secondary); line-height: 1.4; flex: 1; margin: 0; }
      .lp-card-actions { display: flex; gap: 6px; justify-content: flex-end; align-items: center; }
      .lp-btn-add {
        border: none; border-radius: 20px; cursor: pointer;
        font-size: 12px; font-weight: 700;
        padding: 6px 14px;
        background: var(--color-brand); color: #fff;
        transition: opacity 0.15s;
      }
      .lp-btn-add:hover { opacity: 0.8; }
      .lp-in-stack-badge {
        font-size: 11px; font-weight: 700;
        padding: 5px 12px; border-radius: 20px;
        background: var(--color-success, #22C55E22);
        color: var(--color-success, #22C55E);
        border: 1px solid var(--color-success, #22C55E44);
      }
      .lp-empty {
        grid-column: 1 / -1;
        text-align: center; padding: 40px 20px;
        color: var(--color-text-secondary);
      }
      .lp-sentinel { height: 1px; }
      .lp-loading { text-align: center; padding: 20px; color: var(--color-text-secondary); font-size: 13px; }
    `,document.head.appendChild(t)}_render(){this.container.innerHTML=`
      <div id="list-root">
        <div style="display:flex;flex-direction:column;gap:12px;">
          <input id="lp-search" class="lp-search-input" type="search" placeholder="Buscar suplemento..." autocomplete="off" />
          <p class="lp-stats" id="lp-stats"></p>
          <div class="lp-filters" id="lp-obj-filters">
            <button class="lp-filter-btn" data-obj="" type="button">Todos</button>
            <button class="lp-filter-btn" data-obj="strength" type="button">Força</button>
            <button class="lp-filter-btn" data-obj="general" type="button">Saúde</button>
            <button class="lp-filter-btn" data-obj="endurance" type="button">Energia</button>
            <button class="lp-filter-btn" data-obj="bulk" type="button">Massa</button>
            <button class="lp-filter-btn" data-obj="cut" type="button">Definição</button>
          </div>
          <div class="lp-filters" id="lp-ev-filters">
            <button class="lp-filter-btn" data-ev="" type="button">Toda evidência</button>
            <button class="lp-filter-btn" data-ev="A" type="button">Evidência A</button>
            <button class="lp-filter-btn" data-ev="B" type="button">Evidência B</button>
            <button class="lp-filter-btn" data-ev="C" type="button">Evidência C</button>
          </div>
        </div>
        <div class="lp-grid" id="lp-grid" role="list"></div>
        <div class="lp-sentinel" id="lp-sentinel" aria-hidden="true"></div>
        <div class="lp-loading" id="lp-loading" style="display:none;">Carregando mais...</div>
      </div>
    `}_applyFilters(){const{objective:t,evidence:r}=this._filters;let e=this._allItems;this._query.trim()&&(e=this._fuse?this._fuse.search(this._query).map(s=>s.item):e.filter(s=>s.name.toLowerCase().includes(this._query.toLowerCase()))),t&&(e=e.filter(s=>s.targets&&s.targets[t]!=null)),r&&(e=e.filter(s=>s.evidenceLevel===r)),this._filtered=e,this._updateStats()}_updateStats(){const t=this.container.querySelector("#lp-stats");t&&(t.textContent=`${this._filtered.length} suplemento(s) encontrado(s)`)}_renderGrid(){const t=this.container.querySelector("#lp-grid");if(t){if(this._page=0,t.innerHTML="",!this._filtered.length){t.innerHTML=`
        <div class="lp-empty">
          <div style="font-size:32px;margin-bottom:12px;">🔍</div>
          <p style="font-weight:700;margin-bottom:8px;">Nenhum resultado</p>
          <p style="font-size:13px;">Tente outra busca ou remova os filtros.</p>
        </div>`;return}t.appendChild(this._buildFragment(0,p)),this._page=1}}_loadMore(){const t=this._page*p;if(t>=this._filtered.length)return;const r=this.container.querySelector("#lp-grid");if(!r)return;const e=this.container.querySelector("#lp-loading");e&&(e.style.display="block"),requestAnimationFrame(()=>{r.appendChild(this._buildFragment(t,t+p)),this._page++,e&&(e.style.display="none")})}_buildFragment(t,r){const e=document.createDocumentFragment(),s=l.getState?.()?.stack??l.stack??[],a={A:"#22C55E",B:"#F59E0B",C:"#3B82F6",D:"#6B7280"};return this._filtered.slice(t,r).forEach(i=>{const n=s.some(u=>u.supplementId===i.id),o=a[i.evidenceLevel]??"#6B7280",d=i.benefits?.[0]??i.description??"",c=document.createElement("div");c.className="lp-card",c.role="listitem",c.dataset.id=i.id,c.innerHTML=`
        <div class="lp-card-top">
          <div>
            <p class="lp-card-name">${i.name}</p>
            <p class="lp-card-cat">${i.category??""}</p>
          </div>
          ${i.evidenceLevel?`
            <span class="lp-ev-badge" style="background:${o}22;color:${o};border:1px solid ${o}44;">
              Evidência ${i.evidenceLevel}
            </span>`:""}
        </div>
        ${d?`<p class="lp-card-desc">${d}</p>`:""}
        <div class="lp-card-actions">
          ${n?'<span class="lp-in-stack-badge">✓ No Stack</span>':`<button class="lp-btn-add" data-action="add-stack" data-id="${i.id}" type="button">+ Stack</button>`}
        </div>
      `,e.appendChild(c)}),e}_initInfiniteScroll(){const t=this.container.querySelector("#lp-sentinel");if(!t||!("IntersectionObserver"in window))return;new IntersectionObserver(e=>{e[0].isIntersecting&&this._loadMore()},{rootMargin:"200px"}).observe(t)}_refreshCardStates(){const t=l.getState?.()?.stack??l.stack??[];this.container.querySelectorAll(".lp-card").forEach(r=>{const e=r.dataset.id,s=t.some(o=>o.supplementId===e),a=r.querySelector(".lp-card-actions");if(!a)return;const i=a.querySelector(".lp-in-stack-badge"),n=a.querySelector('[data-action="add-stack"]');s&&!i?a.innerHTML='<span class="lp-in-stack-badge">✓ No Stack</span>':!s&&!n&&(a.innerHTML=`<button class="lp-btn-add" data-action="add-stack" data-id="${e}" type="button">+ Stack</button>`)})}_setObjFilter(t){this._filters.objective=t,this.container.querySelectorAll("[data-obj]").forEach(r=>{r.classList.toggle("active",r.dataset.obj===t)}),this._applyFilters(),this._renderGrid()}_setEvFilter(t){this._filters.evidence=t,this.container.querySelectorAll("[data-ev]").forEach(r=>{r.classList.toggle("active",r.dataset.ev===t)}),this._applyFilters(),this._renderGrid()}_attachListeners(){const t=this.container.querySelector("#lp-search");if(t){let a;t.addEventListener("input",i=>{clearTimeout(a),a=setTimeout(()=>{this._query=i.target.value,this._applyFilters(),this._renderGrid()},250)})}const r=this.container.querySelector("#lp-obj-filters");if(r){const a=r.querySelector('[data-obj=""]');a&&a.classList.add("active"),r.addEventListener("click",i=>{const n=i.target.closest("[data-obj]");n&&this._setObjFilter(n.dataset.obj)})}const e=this.container.querySelector("#lp-ev-filters");if(e){const a=e.querySelector('[data-ev=""]');a&&a.classList.add("active"),e.addEventListener("click",i=>{const n=i.target.closest("[data-ev]");n&&this._setEvFilter(n.dataset.ev)})}const s=this.container.querySelector("#lp-grid");s&&s.addEventListener("click",a=>{const i=a.target.closest('[data-action="add-stack"]');if(!i)return;const n=i.dataset.id,o=this._allItems.find(d=>d.id===n);o&&(l.dispatch(b.ADD_TO_STACK,{supplementId:o.id,name:o.name,dosage:o.dosage?.maintenance??o.defaultDose,unit:o.dosage?.unit??o.unit??"g",quantity:0}),this._refreshCardStates())})}}export{m as default};
