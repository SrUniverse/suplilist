import{s as c,A as b,o as E}from"./main-8KErQew8.js";import{S as x}from"./stack-recommender-DZBCs9MK.js";import{r as $}from"./evidence-D5RtUc7g.js";import{e as p}from"./escape-Br5wU8qn.js";import{a as k}from"./affiliate-engine-x2SXFq_y.js";function f(n){return n==null?null:n.supplementId??n.id??null}let g=null;async function I(){if(g)return g;try{g=await(await fetch("/data/prices.json")).json()}catch{g={}}return g}function y(n){return"R$ "+n.toFixed(2).replace(".",",")}function w(n){return n.reduce((e,t)=>{const s=x.find(d=>d.id===f(t))?.pricePerGram??0,i=parseFloat(t.dosage)||0,r=(t.unit||"g").toLowerCase();let l;if(r==="g")l=i;else if(r==="mg")l=i/1e3;else if(r==="mcg")l=i/1e6;else return e;return e+l*s*30},0)}function S(n){if(!n.length)return"0%";const e=c.checkins??[],t=new Set(n.map(s=>s.supplementId??s.id));let o=0;for(let s=0;s<7;s++){const i=E(s),r=new Set(e.filter(d=>d.date===i).map(d=>d.supplementId));[...t].every(d=>r.has(d))&&o++}return Math.round(o/7*100)+"%"}function C(n){const e=x.find(o=>o.id===f(n));return e?.image?e.image:`/assets/${(n.name??"").toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"")}.png`}function z(n){return x.find(t=>t.id===f(n))?.evidenceLevel??"C"}function L(n){const e=parseFloat(n.quantity),t=parseFloat(n.dosage);return!e||!t||t<=0?null:Math.max(0,Math.floor(e/t))}const M=`
  /* Layout */
  .msp-wrap {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 24px 16px 120px;
    max-width: 960px;
    margin: 0 auto;
  }

  /* Header */
  .msp-header-title {
    font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
    font-weight: 800;
    font-size: 28px;
    color: var(--color-text-primary);
    margin: 0 0 4px;
  }
  .msp-header-sub {
    font-size: 14px;
    color: var(--color-text-secondary);
    margin: 0;
  }

  /* Stat cards */
  .msp-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  @media (max-width: 360px) {
    .msp-stats { grid-template-columns: 1fr; }
  }
  .msp-stat-card {
    background: var(--color-surface-primary);
    border: 1px solid var(--color-border);
    border-radius: 16px;
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .msp-stat-icon {
    width: 28px; height: 28px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 8px;
    background: var(--color-brand-muted);
    color: var(--color-brand);
    flex-shrink: 0;
    margin-bottom: 2px;
  }
  .msp-stat-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: .5px;
  }
  .msp-stat-sub {
    font-size: 11px;
    color: var(--color-text-muted);
  }
  .msp-stat-value {
    font-size: 22px;
    font-weight: 800;
    color: var(--color-text-primary);
    line-height: 1.1;
  }
  .msp-stat-value.brand { color: var(--color-brand); }

  /* Desktop: two-column layout for list + sidebar */
  .msp-body {
    display: grid;
    grid-template-columns: 1fr 280px;
    gap: 20px;
    align-items: start;
  }
  @media (max-width: 768px) {
    .msp-body { grid-template-columns: 1fr; }
  }

  /* Section header */
  .msp-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
  }
  .msp-section-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0;
  }
  .msp-btn-add {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 9px 18px;
    background: var(--color-brand);
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: background 150ms;
  }
  .msp-btn-add:hover { background: var(--color-brand-hover); }

  /* Stack list */
  .msp-list { display: flex; flex-direction: column; gap: 10px; }

  /* Empty state */
  .msp-empty {
    text-align: center;
    padding: 56px 20px;
    color: var(--color-text-muted);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    background: var(--color-surface-primary);
    border: 1px dashed var(--color-border-strong);
    border-radius: 16px;
  }
  .msp-empty-icon { font-size: 52px; margin-bottom: 4px; }
  .msp-empty-title { font-size: 16px; font-weight: 700; color: var(--color-text-primary); margin: 0; }
  .msp-empty-desc { font-size: 13px; color: var(--color-text-secondary); margin: 0; }
  .msp-empty-cta {
    margin-top: 10px;
    padding: 11px 24px;
    background: var(--color-brand);
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: background 150ms;
  }
  .msp-empty-cta:hover { background: var(--color-brand-hover); }

  /* Stack item card */
  .msp-item {
    background: var(--color-surface-primary);
    border: 1px solid var(--color-border);
    border-radius: 16px;
    overflow: hidden;
    transition: border-color 200ms;
  }
  .msp-item:hover { border-color: var(--color-border-strong); }
  .msp-item-top {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px 10px;
  }
  .msp-item-img {
    width: 72px;
    height: 72px;
    border-radius: 12px;
    object-fit: contain;
    background: #111;
    flex-shrink: 0;
    padding: 4px;
  }
  .msp-item-info { flex: 1; min-width: 0; }
  .msp-item-cat {
    font-size: 10px; font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 3px;
  }
  .msp-item-name {
    font-size: 15px;
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0 0 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .msp-item-dosage {
    font-size: 12px;
    color: var(--color-text-secondary);
    margin: 0 0 2px;
  }
  .msp-item-days {
    font-size: 11px;
    color: var(--color-brand);
    font-weight: 600;
    margin: 0;
  }
  .msp-item-stock {
    font-size: 11px;
    color: var(--color-text-muted);
    margin: 0;
  }
  .msp-item-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    flex-shrink: 0;
  }
  .msp-item-actions {
    display: flex;
    gap: 4px;
  }
  .msp-item-footer {
    display: flex;
    gap: 8px;
    padding: 0 16px 14px;
  }
  .msp-btn-pause {
    flex: 1; padding: 8px;
    border-radius: 8px;
    border: 1px solid var(--color-border-strong);
    background: transparent; color: var(--color-text-secondary);
    font-family: inherit; font-size: 12px; font-weight: 600;
    cursor: pointer; transition: background 150ms;
  }
  .msp-btn-pause:hover { background: var(--color-surface-hover); color: var(--color-text-primary); }
  .msp-btn-finish {
    flex: 1; padding: 8px;
    border-radius: 8px;
    border: none;
    background: var(--color-brand); color: #fff;
    font-family: inherit; font-size: 12px; font-weight: 600;
    cursor: pointer; transition: background 150ms;
  }
  .msp-btn-finish:hover { background: var(--color-brand-hover); }
  .msp-btn-icon {
    background: none;
    border: none;
    padding: 6px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 15px;
    line-height: 1;
    transition: background 150ms;
    color: var(--color-text-secondary);
  }
  .msp-btn-icon:hover { background: var(--color-surface-hover); color: var(--color-text-primary); }
  .msp-btn-icon.del:hover { background: var(--color-error-bg); color: var(--color-error); }
  .msp-btn-reorder {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 0 8px;
    height: 32px;
    border-radius: 8px;
    background: transparent;
    color: var(--color-text-secondary);
    text-decoration: none;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .msp-btn-reorder:hover {
    background: var(--color-surface-hover);
  }

  /* Inline edit form */
  .msp-inline-edit {
    padding: 14px 16px;
    background: var(--color-surface-secondary);
    border: 1px solid var(--color-border-strong);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .msp-inline-edit-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: .4px;
    margin: 0;
  }
  .msp-inline-row { display: flex; gap: 8px; align-items: flex-end; }
  .msp-inline-field { display: flex; flex-direction: column; gap: 5px; flex: 1; }
  .msp-inline-label {
    font-size: 10px;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: .5px;
  }
  .msp-input {
    width: 100%;
    padding: 9px 12px;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    color: var(--color-text-primary);
    font-size: 14px;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
    transition: border-color 150ms;
  }
  .msp-input:focus { border-color: var(--color-brand); }
  .msp-input::placeholder { color: var(--color-text-muted); }
  .msp-select {
    padding: 9px 12px;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    color: var(--color-text-primary);
    font-size: 14px;
    font-family: inherit;
    outline: none;
    cursor: pointer;
    transition: border-color 150ms;
  }
  .msp-select:focus { border-color: var(--color-brand); }
  .msp-inline-btns { display: flex; gap: 8px; justify-content: flex-end; }
  .msp-btn-save {
    padding: 9px 20px;
    background: var(--color-brand);
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: background 150ms;
  }
  .msp-btn-save:hover { background: var(--color-brand-hover); }
  .msp-btn-cancel {
    padding: 9px 16px;
    background: none;
    border: 1px solid var(--color-border-strong);
    border-radius: 10px;
    color: var(--color-text-secondary);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: border-color 150ms;
  }
  .msp-btn-cancel:hover { border-color: var(--color-brand); color: var(--color-text-primary); }

  /* Add supplement modal overlay */
  .msp-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.7);
    z-index: 1000;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 0;
    backdrop-filter: blur(4px);
    animation: msp-fadein 180ms ease;
  }
  @media (min-width: 600px) {
    .msp-modal-overlay { align-items: center; padding: 24px; }
  }
  @keyframes msp-fadein { from { opacity:0 } to { opacity:1 } }
  .msp-modal {
    background: var(--color-surface-primary);
    border: 1px solid var(--color-border-strong);
    border-radius: 20px 20px 0 0;
    padding: 24px 20px 40px;
    width: 100%;
    max-width: 480px;
    max-height: 90vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
    animation: msp-slideup 220ms ease;
  }
  @media (min-width: 600px) {
    .msp-modal { border-radius: 20px; padding: 28px 24px 28px; }
  }
  @keyframes msp-slideup { from { transform:translateY(40px); opacity:0 } to { transform:translateY(0); opacity:1 } }
  .msp-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .msp-modal-title {
    font-size: 17px;
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0;
  }
  .msp-modal-close {
    background: var(--color-surface-secondary);
    border: none;
    color: var(--color-text-secondary);
    font-size: 18px;
    line-height: 1;
    padding: 6px 10px;
    border-radius: 8px;
    cursor: pointer;
  }
  .msp-modal-close:hover { color: var(--color-text-primary); }
  .msp-modal-field { display: flex; flex-direction: column; gap: 6px; position: relative; }
  .msp-modal-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: .5px;
  }
  .msp-modal-row { display: flex; gap: 8px; }
  .msp-modal-row .msp-input { flex: 1; }

  /* Search results in modal */
  .msp-search-results {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: 10;
    background: var(--color-surface-secondary);
    border: 1px solid var(--color-border-strong);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 12px 32px rgba(0,0,0,.5);
    max-height: 220px;
    overflow-y: auto;
  }
  .msp-result-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 14px;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    transition: background 100ms;
  }
  .msp-result-btn:hover { background: var(--color-surface-hover); }
  .msp-result-img {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    object-fit: contain;
    background: var(--color-surface-primary);
    flex-shrink: 0;
  }
  .msp-result-info { display: flex; flex-direction: column; gap: 2px; }
  .msp-result-name { font-size: 14px; font-weight: 600; color: var(--color-text-primary); }
  .msp-result-cat { font-size: 11px; color: var(--color-text-muted); }
  .msp-modal-submit {
    padding: 12px;
    background: var(--color-brand);
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: background 150ms;
    margin-top: 4px;
  }
  .msp-modal-submit:hover { background: var(--color-brand-hover); }

  /* Replenishment sidebar */
  .msp-sidebar-card {
    background: var(--color-surface-primary);
    border: 1px solid var(--color-border);
    border-radius: 16px;
    padding: 18px 16px;
  }
  .msp-sidebar-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0 0 14px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .msp-replen-list { display: flex; flex-direction: column; gap: 12px; }
  .msp-replen-item { display: flex; flex-direction: column; gap: 4px; }
  .msp-replen-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .msp-replen-price {
    font-size: 12px;
    color: var(--color-success);
    font-weight: 600;
  }
  .msp-replen-market {
    font-size: 11px;
    color: var(--color-text-muted);
  }
  .msp-replen-empty {
    font-size: 12px;
    color: var(--color-text-muted);
    text-align: center;
    padding: 16px 0;
  }
  .msp-replen-divider {
    height: 1px;
    background: var(--color-border);
    margin: 0;
  }
`;class R{constructor(e){this.container=e,this._unsub=null,this._editId=null,this._modalOpen=!1,this._prices=null,this._docClickHandler=null}mount(){this._isMounted=!0,this._attachStyles(),this._render(),I().then(e=>{this._isMounted&&(this._prices=e,this._renderReplenishment())}),this._unsub=c.subscribe((e,t)=>{if(!this._isMounted)return;(!t||["ADD_TO_STACK","REMOVE_FROM_STACK","UPDATE_STACK_ITEM","SET_STACK_QUANTITY","ADD_CHECKIN"].includes(t.type))&&this._renderAll()})}unmount(){this._isMounted=!1,this._docClickHandler&&(document.removeEventListener("click",this._docClickHandler),this._docClickHandler=null),this._unsub?.(),this._closeModal()}_attachStyles(){if(document.getElementById("msp2-styles"))return;const e=document.createElement("style");e.id="msp2-styles",e.textContent=M,document.head.appendChild(e)}_render(){this.container.innerHTML=`
      <div class="msp-wrap">
        <!-- Header -->
        <div>
          <h1 class="msp-header-title">📦 Meu Stack</h1>
          <p class="msp-header-sub" id="msp-subtitle">Carregando...</p>
        </div>

        <!-- Stat cards -->
        <div class="msp-stats" id="msp-stats"></div>

        <!-- Body: list + sidebar -->
        <div class="msp-body">
          <!-- Left: stack list -->
          <div>
            <div class="msp-section-header">
              <h2 class="msp-section-title">Suplementos Ativos</h2>
              <button class="msp-btn-add" id="msp-open-modal">
                <span>+</span> Adicionar Suplemento
              </button>
            </div>
            <div class="msp-list" id="msp-list"></div>
          </div>

          <!-- Right: replenishment sidebar -->
          <aside>
            <div class="msp-sidebar-card">
              <h3 class="msp-sidebar-title">🛒 Reposição &amp; Arbitragem</h3>
              <div id="msp-replenishment" class="msp-replen-list">
                <p class="msp-replen-empty">Carregando preços...</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    `,this._renderAll(),this._attachDelegatedListeners(),this.container.querySelector("#msp-open-modal")?.addEventListener("click",()=>this._openModal())}_renderAll(){this._renderSubtitle(),this._renderStats(),this._renderList(),this._prices&&this._renderReplenishment()}_renderSubtitle(){const e=c.stack??[],t=w(e),o=this.container.querySelector("#msp-subtitle");o&&(o.textContent=`${e.length} suplemento${e.length!==1?"s":""} ativo${e.length!==1?"s":""} · ${y(t)}/mês estimado`)}_renderStats(){const e=this.container.querySelector("#msp-stats");if(!e)return;const t=c.stack??[],o=w(t),s=S(t);e.innerHTML=`
      <div class="msp-stat-card">
        <div class="msp-stat-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <span class="msp-stat-label">Investimento Mensal</span>
        <span class="msp-stat-value brand">${y(o)}</span>
        <span class="msp-stat-sub">Estimado por stack atual</span>
      </div>
      <div class="msp-stat-card">
        <div class="msp-stat-icon" style="background:rgba(34,197,94,0.12);color:#22C55E;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
        </div>
        <span class="msp-stat-label">Ciclos Ativos</span>
        <span class="msp-stat-value">${t.length}</span>
        <span class="msp-stat-sub">${t.length>0?t.length+" suplemento"+(t.length!==1?"s":"")+" no protocolo":"Nenhum ativo"}</span>
      </div>
      <div class="msp-stat-card">
        <div class="msp-stat-icon" style="background:rgba(234,179,8,0.12);color:#EAB308;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
        <span class="msp-stat-label">Taxa de Adesão</span>
        <span class="msp-stat-value">${s}</span>
        <span class="msp-stat-sub">Últimos 7 dias</span>
      </div>
    `}_renderList(){const e=this.container.querySelector("#msp-list");if(!e)return;const t=c.stack??[];if(!t.length){e.innerHTML=`
        <div class="msp-empty">
          <div class="msp-empty-icon">📭</div>
          <p class="msp-empty-title">Seu stack está vazio</p>
          <p class="msp-empty-desc">Adicione os suplementos que você está tomando para acompanhar seu protocolo.</p>
          <button class="msp-empty-cta" id="msp-empty-cta">Explorar Catálogo →</button>
        </div>
      `,this.container.querySelector("#msp-empty-cta")?.addEventListener("click",()=>this._openModal());return}e.innerHTML="",t.forEach(o=>{const s=f(o),i=L(o),r=C(o),l=$(z(o)),d=document.createElement("div");d.className="msp-item",d.dataset.itemId=s;const a=x.find(_=>_.id===s),m=a?.category??"",v=a?.benefits?.[0]??"",h=k.getLinks(o.name);d.innerHTML=`
        <div class="msp-item-top">
          <img class="msp-item-img"
            src="${r}"
            alt="${o.name}"
            onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'72\\' height=\\'72\\'%3E%3Crect width=\\'72\\' height=\\'72\\' rx=\\'12\\' fill=\\'%23161616\\'/%3E%3Ctext x=\\'50%25\\' y=\\'55%25\\' text-anchor=\\'middle\\' dominant-baseline=\\'middle\\' font-size=\\'28\\' fill=\\'%23555555\\'%3E💊%3C/text%3E%3C/svg%3E'">
          <div class="msp-item-info">
            ${m?`<p class="msp-item-cat">${m}</p>`:""}
            <p class="msp-item-name">${p(o.name)}</p>
            <p class="msp-item-dosage">${o.dosage??"—"} ${p(o.unit??"g")}/dia</p>
            ${i!==null?`<p class="msp-item-days">~${i} dias restantes</p>`:""}
          </div>
          <div class="msp-item-right">
            ${l}
            <div class="msp-item-actions">
              <button class="msp-btn-icon" data-action="edit" data-id="${s}" aria-label="Editar ${p(o.name)}" title="Editar">✏️</button>
              <button class="msp-btn-icon del" data-action="remove" data-id="${s}" aria-label="Remover ${p(o.name)}" title="Remover">🗑️</button>
              <a class="msp-btn-reorder"
                 href="${h.amazon}"
                 target="_blank"
                 rel="noopener noreferrer"
                 data-aff-id="${p(s)}"
                 data-aff-mp="amazon"
                 title="Recomprar na Amazon"
                 aria-label="Recomprar ${p(o.name)} na Amazon">🛒 Recomprar</a>
            </div>
          </div>
        </div>
        ${v?`<div style="padding:0 16px 8px;font-size:12px;color:var(--color-text-secondary);line-height:1.5;">${v}</div>`:""}
        <div class="msp-item-footer">
          <button class="msp-btn-pause" data-action="edit" data-id="${s}">Editar</button>
          <button class="msp-btn-finish" data-action="remove" data-id="${s}">Remover</button>
        </div>
      `;const u=document.createElement("div");u.id=`msp-edit-${s}`,u.style.display="none",e.appendChild(d),e.appendChild(u)})}_renderReplenishment(){const e=this.container.querySelector("#msp-replenishment");if(!e)return;const t=c.stack??[],o=this._prices??{},s=t.filter(i=>{const r=f(i),l=o[r];return l&&Object.keys(l).length>0});if(!s.length){e.innerHTML='<p class="msp-replen-empty">Nenhum preço disponível para os itens do seu stack.</p>';return}e.innerHTML=s.map((i,r)=>{const l=f(i),d=o[l]??{},a=Object.values(d),m=a.reduce((h,u)=>h.price<u.price?h:u,a[0]),v=r<s.length-1?'<hr class="msp-replen-divider">':"";return`
        <div class="msp-replen-item">
          <span class="msp-replen-name">${p(i.name)}</span>
          <span class="msp-replen-price">Melhor: ${y(m.price)}</span>
          <span class="msp-replen-market">${p(m.label)}</span>
        </div>
        ${v}
      `}).join("")}_attachDelegatedListeners(){this.container.querySelector("#msp-list")?.addEventListener("click",e=>{const t=e.target.closest("[data-aff-mp]");t&&k.trackClick(t.dataset.affId,t.dataset.affMp);const o=e.target.closest("[data-action]");if(!o)return;const s=o.dataset.id;if(o.dataset.action==="edit"&&this._toggleInlineEdit(s),o.dataset.action==="remove"){const i=(c.stack??[]).find(r=>(r.supplementId??r.id)===s);if(!i||!confirm(`Remover "${i.name}" do stack?`))return;c.dispatch(b.REMOVE_FROM_STACK,{supplementId:s})}o.dataset.action==="save-edit"&&this._saveInlineEdit(s),o.dataset.action==="cancel-edit"&&this._closeInlineEdit(s)})}_toggleInlineEdit(e){const t=this.container.querySelector(`#msp-edit-${e}`);if(!t)return;if(t.style.display!=="none"){this._closeInlineEdit(e);return}this.container.querySelectorAll('[id^="msp-edit-"]').forEach(s=>{s.id!==`msp-edit-${e}`&&(s.style.display="none")});const o=(c.stack??[]).find(s=>(s.supplementId??s.id)===e);o&&(t.style.display="block",t.innerHTML=`
      <div class="msp-inline-edit">
        <p class="msp-inline-edit-title">Editar — ${p(o.name)}</p>
        <div class="msp-inline-row">
          <div class="msp-inline-field">
            <label class="msp-inline-label">Dosagem diária</label>
            <input type="number" class="msp-input" id="msp-ei-dosage-${e}" min="0.1" step="0.1" value="${o.dosage??""}">
          </div>
          <div class="msp-inline-field" style="max-width:90px;">
            <label class="msp-inline-label">Unidade</label>
            <select class="msp-select" id="msp-ei-unit-${e}">
              ${["g","mg","UI","mcg","cápsulas"].map(s=>`<option value="${s}" ${o.unit===s?"selected":""}>${s}</option>`).join("")}
            </select>
          </div>
          <div class="msp-inline-field">
            <label class="msp-inline-label">Estoque</label>
            <input type="number" class="msp-input" id="msp-ei-qty-${e}" min="0" value="${o.quantity??""}">
          </div>
        </div>
        <div class="msp-inline-btns">
          <button class="msp-btn-cancel" data-action="cancel-edit" data-id="${e}">Cancelar</button>
          <button class="msp-btn-save" data-action="save-edit" data-id="${e}">Salvar</button>
        </div>
      </div>
    `,t.scrollIntoView({behavior:"smooth",block:"nearest"}))}_closeInlineEdit(e){const t=this.container.querySelector(`#msp-edit-${e}`);t&&(t.style.display="none")}_saveInlineEdit(e){const t=parseFloat(this.container.querySelector(`#msp-ei-dosage-${e}`)?.value)||0,o=this.container.querySelector(`#msp-ei-unit-${e}`)?.value||"g",s=parseFloat(this.container.querySelector(`#msp-ei-qty-${e}`)?.value)||0;if(t<=0){alert("Informe uma dosagem válida.");return}c.dispatch(b.UPDATE_STACK_ITEM,{supplementId:e,dosage:t,unit:o,quantity:s}),this._closeInlineEdit(e)}_openModal(){if(this._modalOpen)return;this._modalOpen=!0;const e=document.createElement("div");e.className="msp-modal-overlay",e.id="msp-modal-overlay",e.setAttribute("role","dialog"),e.setAttribute("aria-modal","true"),e.setAttribute("aria-label","Adicionar suplemento"),e.innerHTML=`
      <div class="msp-modal" id="msp-modal">
        <div class="msp-modal-header">
          <h2 class="msp-modal-title">Adicionar Suplemento</h2>
          <button class="msp-modal-close" id="msp-modal-close" aria-label="Fechar">✕</button>
        </div>

        <div class="msp-modal-field">
          <label class="msp-modal-label" for="msp-modal-search">Buscar suplemento</label>
          <input type="search" id="msp-modal-search" class="msp-input"
            placeholder="Digite o nome…" autocomplete="off">
          <div id="msp-modal-results" class="msp-search-results" style="display:none"></div>
        </div>

        <div class="msp-modal-field">
          <label class="msp-modal-label">Dosagem diária</label>
          <div class="msp-modal-row">
            <input type="number" id="msp-modal-dosage" class="msp-input" min="0.1" step="0.1" placeholder="Ex: 5">
            <select id="msp-modal-unit" class="msp-select">
              <option value="g">g</option>
              <option value="mg">mg</option>
              <option value="UI">UI</option>
              <option value="mcg">mcg</option>
              <option value="cápsulas">cápsulas</option>
            </select>
          </div>
        </div>

        <div class="msp-modal-field">
          <label class="msp-modal-label" for="msp-modal-qty">Quantidade em estoque</label>
          <input type="number" id="msp-modal-qty" class="msp-input" min="0" placeholder="Ex: 250">
        </div>

        <button class="msp-modal-submit" id="msp-modal-submit">Adicionar ao Stack</button>
      </div>
    `,document.body.appendChild(e);const t=document.getElementById("router-outlet");t&&(t.style.overflow="hidden"),this._modalSelectedId=null,e.addEventListener("click",r=>{r.target===e&&this._closeModal()}),document.getElementById("msp-modal-close")?.addEventListener("click",()=>this._closeModal());const o=document.getElementById("msp-modal-search"),s=document.getElementById("msp-modal-results");let i;o?.addEventListener("input",r=>{clearTimeout(i),i=setTimeout(()=>{const l=r.target.value.trim().toLowerCase();if(l.length<2){s.style.display="none";return}const d=x.filter(a=>a.name.toLowerCase().includes(l)||(a.category??"").toLowerCase().includes(l)).slice(0,8);if(!d.length){s.style.display="none";return}s.innerHTML=d.map(a=>`
          <button class="msp-result-btn"
            data-id="${p(a.id)}"
            data-name="${p(a.name)}"
            data-unit="${p(a.dosage?.unit??"g")}"
            data-dosage="${a.dosage?.maintenance??5}"
            data-img="${p(a.image??"")}">
            <img class="msp-result-img" src="${p(a.image??"")}"
              alt="${p(a.name)}"
              onerror="this.style.display='none'">
            <div class="msp-result-info">
              <span class="msp-result-name">${p(a.name)}</span>
              <span class="msp-result-cat">${p(a.category??"")}</span>
            </div>
          </button>
        `).join(""),s.style.display="block",s.querySelectorAll(".msp-result-btn").forEach(a=>{a.addEventListener("click",m=>{m.preventDefault(),this._modalSelectedId=a.dataset.id,o.value=a.dataset.name,document.getElementById("msp-modal-dosage").value=a.dataset.dosage,document.getElementById("msp-modal-unit").value=a.dataset.unit,s.style.display="none"})})},180)}),this._docClickHandler=r=>{!o?.contains(r.target)&&!s?.contains(r.target)&&(s.style.display="none")},document.addEventListener("click",this._docClickHandler),document.getElementById("msp-modal-submit")?.addEventListener("click",()=>{const r=(document.getElementById("msp-modal-search")?.value??"").trim(),l=parseFloat(document.getElementById("msp-modal-dosage")?.value)||0,d=document.getElementById("msp-modal-unit")?.value||"g",a=parseFloat(document.getElementById("msp-modal-qty")?.value)||0;if(!r){alert("Informe o nome do suplemento.");return}if(l<=0){alert("Informe a dosagem diária.");return}const m=this._modalSelectedId??r.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"")+"-"+Date.now();c.dispatch(b.ADD_TO_STACK,{supplementId:m,name:r,dosage:l,unit:d,quantity:a||null}),this._closeModal()}),setTimeout(()=>o?.focus(),100)}_closeModal(){this._docClickHandler&&(document.removeEventListener("click",this._docClickHandler),this._docClickHandler=null),this._modalOpen=!1,this._modalSelectedId=null,document.getElementById("msp-modal-overlay")?.remove();const t=document.getElementById("router-outlet");t&&(t.style.overflow="")}}export{R as MyStackPage,R as default};
