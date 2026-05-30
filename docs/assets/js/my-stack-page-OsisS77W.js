import{s as d,A as u}from"./main-BNCydJh8.js";import{S as m}from"./stack-recommender-b07295YU.js";let c=null;async function y(){if(c)return c;try{c=await(await fetch("/data/prices.json")).json()}catch{c={}}return c}function k(n){const e={A:{bg:"rgba(34,197,94,0.12)",color:"#22C55E",label:"Evidência A"},B:{bg:"rgba(245,158,11,0.12)",color:"#F59E0B",label:"Evidência B"},C:{bg:"rgba(163,163,163,0.12)",color:"#9A9A9A",label:"Evidência C"}},t=e[n]??e.C;return`<span style="background:${t.bg};color:${t.color};font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px;text-transform:uppercase;letter-spacing:.4px;">${t.label}</span>`}function g(n){return"R$ "+n.toFixed(2).replace(".",",")}function b(n){return n.reduce((e,t)=>{const a=m.find(i=>i.id===(t.supplementId??t.id))?.pricePerGram??0,r=parseFloat(t.dosage)||0;return e+r*a*30},0)}function w(n){if(!n.length||!(d.calculateStreak?.()??0))return"0%";const t=new Date,s=[];for(let l=0;l<7;l++){const o=new Date(t);o.setDate(t.getDate()-l),s.push(o.toISOString().split("T")[0])}const a=d.checkins??[],r=new Set(a.map(l=>l.date)),i=s.filter(l=>r.has(l)).length;return Math.round(i/7*100)+"%"}function E(n){const e=m.find(s=>s.id===(n.supplementId??n.id));return e?.image?e.image:`/assets/${(n.name??"").toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"")}.png`}function _(n){return m.find(t=>t.id===(n.supplementId??n.id))?.evidenceLevel??"C"}function S(n){const e=parseFloat(n.quantity),t=parseFloat(n.dosage);return!e||!t||t<=0?null:Math.max(0,Math.floor(e/t))}const $=`
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
    font-family: 'Syne', sans-serif;
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
  @media (max-width: 480px) {
    .msp-stats { grid-template-columns: 1fr; }
  }
  .msp-stat-card {
    background: var(--color-surface-primary);
    border: 1px solid var(--color-border);
    border-radius: 16px;
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .msp-stat-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: .5px;
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
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    background: var(--color-surface-primary);
    border: 1px solid var(--color-border);
    border-radius: 16px;
    transition: border-color 200ms;
  }
  .msp-item:hover { border-color: var(--color-border-strong); }
  .msp-item-img {
    width: 60px;
    height: 60px;
    border-radius: 12px;
    object-fit: contain;
    background: var(--color-surface-secondary);
    flex-shrink: 0;
  }
  .msp-item-info { flex: 1; min-width: 0; }
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
    margin: 0 0 4px;
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
`;class A{constructor(e){this.container=e,this._unsub=null,this._editId=null,this._modalOpen=!1,this._prices=null}mount(){this._attachStyles(),this._render(),y().then(e=>{this._prices=e,this._renderReplenishment()}),this._unsub=d.subscribe((e,t)=>{(!t||["ADD_TO_STACK","REMOVE_FROM_STACK","UPDATE_STACK_ITEM","SET_STACK_QUANTITY","ADD_CHECKIN"].includes(t.type))&&this._renderAll()})}unmount(){this._unsub?.(),this._closeModal()}_attachStyles(){if(document.getElementById("msp2-styles"))return;const e=document.createElement("style");e.id="msp2-styles",e.textContent=$,document.head.appendChild(e)}_render(){this.container.innerHTML=`
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
    `,this._renderAll(),this._attachDelegatedListeners(),this.container.querySelector("#msp-open-modal")?.addEventListener("click",()=>this._openModal())}_renderAll(){this._renderSubtitle(),this._renderStats(),this._renderList(),this._prices&&this._renderReplenishment()}_renderSubtitle(){const e=d.stack??[],t=b(e),s=this.container.querySelector("#msp-subtitle");s&&(s.textContent=`${e.length} suplemento${e.length!==1?"s":""} ativo${e.length!==1?"s":""} · ${g(t)}/mês estimado`)}_renderStats(){const e=this.container.querySelector("#msp-stats");if(!e)return;const t=d.stack??[],s=b(t),a=w(t);e.innerHTML=`
      <div class="msp-stat-card">
        <span class="msp-stat-label">Investimento Mensal</span>
        <span class="msp-stat-value brand">${g(s)}</span>
      </div>
      <div class="msp-stat-card">
        <span class="msp-stat-label">Ciclos Ativos</span>
        <span class="msp-stat-value">${t.length}</span>
      </div>
      <div class="msp-stat-card">
        <span class="msp-stat-label">Taxa de Adesão</span>
        <span class="msp-stat-value">${a}</span>
      </div>
    `}_renderList(){const e=this.container.querySelector("#msp-list");if(!e)return;const t=d.stack??[];if(!t.length){e.innerHTML=`
        <div class="msp-empty">
          <div class="msp-empty-icon">📭</div>
          <p class="msp-empty-title">Seu stack está vazio</p>
          <p class="msp-empty-desc">Adicione os suplementos que você está tomando para acompanhar seu protocolo.</p>
          <button class="msp-empty-cta" id="msp-empty-cta">Explorar Catálogo →</button>
        </div>
      `,this.container.querySelector("#msp-empty-cta")?.addEventListener("click",()=>this._openModal());return}e.innerHTML="",t.forEach(s=>{const a=s.supplementId??s.id,r=S(s),i=E(s),l=k(_(s)),o=document.createElement("div");o.className="msp-item",o.dataset.itemId=a,o.innerHTML=`
        <img class="msp-item-img"
          src="${i}"
          alt="${s.name}"
          onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'60\\' height=\\'60\\'%3E%3Crect width=\\'60\\' height=\\'60\\' rx=\\'12\\' fill=\\'%23161616\\'/%3E%3Ctext x=\\'50%25\\' y=\\'55%25\\' text-anchor=\\'middle\\' dominant-baseline=\\'middle\\' font-size=\\'24\\' fill=\\'%23555555\\'%3E💊%3C/text%3E%3C/svg%3E'">
        <div class="msp-item-info">
          <p class="msp-item-name">${s.name}</p>
          <p class="msp-item-dosage">${s.dosage??"—"} ${s.unit??"g"}/dia</p>
          <p class="msp-item-stock">Estoque: ${s.quantity?`${s.quantity} ${s.unit??"g"}${r!==null?` · ~${r} dias`:""}`:"não informado"}</p>
        </div>
        <div class="msp-item-right">
          ${l}
          <div class="msp-item-actions">
            <button class="msp-btn-icon" data-action="edit" data-id="${a}" aria-label="Editar ${s.name}" title="Editar">✏️</button>
            <button class="msp-btn-icon del" data-action="remove" data-id="${a}" aria-label="Remover ${s.name}" title="Remover">🗑️</button>
          </div>
        </div>
      `;const p=document.createElement("div");p.id=`msp-edit-${a}`,p.style.display="none",e.appendChild(o),e.appendChild(p)})}_renderReplenishment(){const e=this.container.querySelector("#msp-replenishment");if(!e)return;const t=d.stack??[],s=this._prices??{},a=t.filter(r=>{const i=r.supplementId??r.id;return!!s[i]});if(!a.length){e.innerHTML='<p class="msp-replen-empty">Nenhum preço disponível para os itens do seu stack.</p>';return}e.innerHTML=a.map((r,i)=>{const l=r.supplementId??r.id,o=s[l]??{},p=Object.values(o),x=p.reduce((f,v)=>f.price<v.price?f:v,p[0]),h=i<a.length-1?'<hr class="msp-replen-divider">':"";return`
        <div class="msp-replen-item">
          <span class="msp-replen-name">${r.name}</span>
          <span class="msp-replen-price">Melhor: ${g(x.price)}</span>
          <span class="msp-replen-market">${x.label}</span>
        </div>
        ${h}
      `}).join("")}_attachDelegatedListeners(){this.container.querySelector("#msp-list")?.addEventListener("click",e=>{const t=e.target.closest("[data-action]");if(!t)return;const s=t.dataset.id;if(t.dataset.action==="edit"&&this._toggleInlineEdit(s),t.dataset.action==="remove"){const a=(d.stack??[]).find(r=>(r.supplementId??r.id)===s);if(!a||!confirm(`Remover "${a.name}" do stack?`))return;d.dispatch(u.REMOVE_FROM_STACK,{supplementId:s})}t.dataset.action==="save-edit"&&this._saveInlineEdit(s),t.dataset.action==="cancel-edit"&&this._closeInlineEdit(s)})}_toggleInlineEdit(e){const t=this.container.querySelector(`#msp-edit-${e}`);if(!t)return;if(t.style.display!=="none"){this._closeInlineEdit(e);return}this.container.querySelectorAll('[id^="msp-edit-"]').forEach(a=>{a.id!==`msp-edit-${e}`&&(a.style.display="none")});const s=(d.stack??[]).find(a=>(a.supplementId??a.id)===e);s&&(t.style.display="block",t.innerHTML=`
      <div class="msp-inline-edit">
        <p class="msp-inline-edit-title">Editar — ${s.name}</p>
        <div class="msp-inline-row">
          <div class="msp-inline-field">
            <label class="msp-inline-label">Dosagem diária</label>
            <input type="number" class="msp-input" id="msp-ei-dosage-${e}" min="0.1" step="0.1" value="${s.dosage??""}">
          </div>
          <div class="msp-inline-field" style="max-width:90px;">
            <label class="msp-inline-label">Unidade</label>
            <select class="msp-select" id="msp-ei-unit-${e}">
              ${["g","mg","UI","mcg","cápsulas"].map(a=>`<option value="${a}" ${s.unit===a?"selected":""}>${a}</option>`).join("")}
            </select>
          </div>
          <div class="msp-inline-field">
            <label class="msp-inline-label">Estoque</label>
            <input type="number" class="msp-input" id="msp-ei-qty-${e}" min="0" value="${s.quantity??""}">
          </div>
        </div>
        <div class="msp-inline-btns">
          <button class="msp-btn-cancel" data-action="cancel-edit" data-id="${e}">Cancelar</button>
          <button class="msp-btn-save" data-action="save-edit" data-id="${e}">Salvar</button>
        </div>
      </div>
    `,t.scrollIntoView({behavior:"smooth",block:"nearest"}))}_closeInlineEdit(e){const t=this.container.querySelector(`#msp-edit-${e}`);t&&(t.style.display="none")}_saveInlineEdit(e){const t=parseFloat(this.container.querySelector(`#msp-ei-dosage-${e}`)?.value)||0,s=this.container.querySelector(`#msp-ei-unit-${e}`)?.value||"g",a=parseFloat(this.container.querySelector(`#msp-ei-qty-${e}`)?.value)||0;if(t<=0){alert("Informe uma dosagem válida.");return}d.dispatch(u.UPDATE_STACK_ITEM,{supplementId:e,dosage:t,unit:s,quantity:a}),this._closeInlineEdit(e)}_openModal(){if(this._modalOpen)return;this._modalOpen=!0;const e=document.createElement("div");e.className="msp-modal-overlay",e.id="msp-modal-overlay",e.setAttribute("role","dialog"),e.setAttribute("aria-modal","true"),e.setAttribute("aria-label","Adicionar suplemento"),e.innerHTML=`
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
    `,document.body.appendChild(e),this._modalSelectedId=null,this._modalSelectedName=null,e.addEventListener("click",r=>{r.target===e&&this._closeModal()}),document.getElementById("msp-modal-close")?.addEventListener("click",()=>this._closeModal());const t=document.getElementById("msp-modal-search"),s=document.getElementById("msp-modal-results");let a;t?.addEventListener("input",r=>{clearTimeout(a),a=setTimeout(()=>{const i=r.target.value.trim().toLowerCase();if(i.length<2){s.style.display="none";return}const l=m.filter(o=>o.name.toLowerCase().includes(i)||(o.category??"").toLowerCase().includes(i)).slice(0,8);if(!l.length){s.style.display="none";return}s.innerHTML=l.map(o=>`
          <button class="msp-result-btn"
            data-id="${o.id}"
            data-name="${o.name}"
            data-unit="${o.dosage?.unit??"g"}"
            data-dosage="${o.dosage?.maintenance??5}"
            data-img="${o.image??""}">
            <img class="msp-result-img" src="${o.image??""}"
              alt="${o.name}"
              onerror="this.style.display='none'">
            <div class="msp-result-info">
              <span class="msp-result-name">${o.name}</span>
              <span class="msp-result-cat">${o.category??""}</span>
            </div>
          </button>
        `).join(""),s.style.display="block",s.querySelectorAll(".msp-result-btn").forEach(o=>{o.addEventListener("click",p=>{p.preventDefault(),this._modalSelectedId=o.dataset.id,this._modalSelectedName=o.dataset.name,t.value=o.dataset.name,document.getElementById("msp-modal-dosage").value=o.dataset.dosage,document.getElementById("msp-modal-unit").value=o.dataset.unit,s.style.display="none"})})},180)}),document.addEventListener("click",r=>{!t?.contains(r.target)&&!s?.contains(r.target)&&(s.style.display="none")}),document.getElementById("msp-modal-submit")?.addEventListener("click",()=>{const r=(document.getElementById("msp-modal-search")?.value??"").trim(),i=parseFloat(document.getElementById("msp-modal-dosage")?.value)||0,l=document.getElementById("msp-modal-unit")?.value||"g",o=parseFloat(document.getElementById("msp-modal-qty")?.value)||0;if(!r){alert("Informe o nome do suplemento.");return}if(i<=0){alert("Informe a dosagem diária.");return}const p=this._modalSelectedId??r.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"")+"-"+Date.now();d.dispatch(u.ADD_TO_STACK,{supplementId:p,name:r,dosage:i,unit:l,quantity:o||null}),this._closeModal()}),setTimeout(()=>t?.focus(),100)}_closeModal(){this._modalOpen=!1,this._modalSelectedId=null,this._modalSelectedName=null,document.getElementById("msp-modal-overlay")?.remove()}}export{A as MyStackPage,A as default};
