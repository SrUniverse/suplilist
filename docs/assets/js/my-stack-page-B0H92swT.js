import{s as l,A as p}from"./main-CfwEDZr2.js";import{S as c}from"./stack-recommender-DOv4qzO8.js";class x{constructor(t){this.container=t,this._unsub=null,this._editId=null,this._formOpen=!1}mount(){this._attachStyles(),this._render(),this._unsub=l.subscribe?.((t,o)=>{(!o||["ADD_TO_STACK","REMOVE_FROM_STACK","UPDATE_STACK_ITEM","SET_STACK_QUANTITY","ADD_CHECKIN"].includes(o.type))&&this._renderList()})}unmount(){this._unsub?.()}_attachStyles(){if(document.getElementById("mystack-page-styles"))return;const t=document.createElement("style");t.id="mystack-page-styles",t.textContent=`
      .msp-wrap { display:flex; flex-direction:column; gap:20px; padding:20px 16px 100px; max-width:800px; margin:0 auto; }
      .msp-title { font-size:24px; font-weight:800; color:var(--color-text-primary); margin:0 0 4px; }
      .msp-subtitle { font-size:14px; color:var(--color-text-muted); margin:0 0 16px; }
      .msp-section-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
      .msp-section-title { font-size:16px; font-weight:700; color:var(--color-text-primary); margin:0; }
      .msp-btn-add { padding:8px 16px; background:var(--color-brand); color:#fff; border:none; border-radius:999px; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit; transition:opacity 150ms; }
      .msp-btn-add:hover { opacity:.85; }
      .msp-list { display:flex; flex-direction:column; gap:10px; }
      .msp-empty { text-align:center; padding:48px 20px; color:var(--color-text-muted); display:flex; flex-direction:column; align-items:center; gap:8px; background:var(--color-surface-primary); border:1px dashed var(--color-border); border-radius:16px; }
      .msp-empty-icon { font-size:40px; }
      .msp-empty-cta { margin-top:8px; padding:10px 20px; background:var(--color-brand); color:#fff; border:none; border-radius:999px; font-size:14px; font-weight:700; cursor:pointer; font-family:inherit; }
      .msp-item { display:flex; align-items:center; gap:14px; padding:16px; background:var(--color-surface-primary); border-radius:14px; border:1px solid var(--color-border); transition:border-color 200ms; }
      .msp-item-low { border-color:#FFB74D44; }
      .msp-item-critical { border-color:#EF535044; }
      .msp-info { flex:1; min-width:0; }
      .msp-name { font-size:15px; font-weight:700; color:var(--color-text-primary); margin:0 0 2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .msp-dosage { font-size:12px; color:var(--color-text-muted); margin:0; }
      .msp-stock { display:flex; flex-direction:column; align-items:flex-end; gap:4px; min-width:80px; }
      .msp-days { display:flex; align-items:baseline; gap:3px; }
      .msp-days-value { font-size:22px; font-weight:900; line-height:1; }
      .msp-days-label { font-size:11px; color:var(--color-text-muted); }
      .msp-days-ok .msp-days-value { color:var(--color-success); }
      .msp-days-low .msp-days-value { color:#FFB74D; }
      .msp-days-critical .msp-days-value { color:var(--color-error); }
      .msp-bar { height:4px; background:var(--color-border); border-radius:999px; overflow:hidden; width:80px; }
      .msp-bar-fill { height:100%; border-radius:999px; transition:width 500ms; }
      .msp-bar-ok { background:var(--color-success); }
      .msp-bar-low { background:#FFB74D; }
      .msp-bar-critical { background:var(--color-error); }
      .msp-qty-text { font-size:11px; color:var(--color-text-muted); text-align:right; }
      .msp-no-stock { font-size:12px; color:var(--color-text-muted); }
      .msp-actions { display:flex; flex-direction:column; gap:6px; align-items:flex-end; }
      .msp-btn-edit, .msp-btn-del { background:none; border:none; font-size:16px; cursor:pointer; padding:4px; border-radius:6px; transition:background 150ms; }
      .msp-btn-edit:hover { background:var(--color-border); }
      .msp-btn-del:hover { background:#EF535022; }
      .msp-form-wrap { background:var(--color-surface-primary); border:1px solid var(--color-border); border-radius:16px; padding:20px; display:flex; flex-direction:column; gap:14px; }
      .msp-form-title { font-size:16px; font-weight:700; color:var(--color-text-primary); margin:0 0 4px; }
      .msp-field { display:flex; flex-direction:column; gap:6px; position:relative; }
      .msp-label { font-size:12px; font-weight:600; color:var(--color-text-secondary); text-transform:uppercase; letter-spacing:.5px; }
      .msp-input { width:100%; padding:10px 13px; background:var(--color-bg-primary); border:1px solid var(--color-border); border-radius:10px; color:var(--color-text-primary); font-size:15px; font-family:inherit; outline:none; box-sizing:border-box; }
      .msp-input:focus { border-color:var(--color-brand); }
      .msp-input::placeholder { color:var(--color-text-muted); }
      .msp-row { display:flex; gap:8px; }
      .msp-row .msp-input { flex:1; }
      .msp-select { padding:10px 13px; background:var(--color-bg-primary); border:1px solid var(--color-border); border-radius:10px; color:var(--color-text-primary); font-size:15px; font-family:inherit; outline:none; cursor:pointer; }
      .msp-select:focus { border-color:var(--color-brand); }
      .msp-form-btns { display:flex; gap:8px; justify-content:flex-end; }
      .msp-btn-cancel { padding:10px 20px; background:none; border:1px solid var(--color-border); border-radius:999px; color:var(--color-text-secondary); font-size:14px; font-weight:600; cursor:pointer; font-family:inherit; transition:border-color 150ms; }
      .msp-btn-cancel:hover { border-color:var(--color-brand); color:var(--color-text-primary); }
      .msp-btn-save { padding:10px 20px; background:var(--color-brand); color:#fff; border:none; border-radius:999px; font-size:14px; font-weight:700; cursor:pointer; font-family:inherit; transition:opacity 150ms; }
      .msp-btn-save:hover { opacity:.85; }
      .msp-dropdown { position:absolute; top:100%; left:0; right:0; z-index:100; background:var(--color-surface-primary); border:1px solid var(--color-border); border-radius:10px; margin-top:4px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,.4); }
      .msp-sugg-btn { display:flex; justify-content:space-between; align-items:center; width:100%; padding:10px 14px; background:none; border:none; text-align:left; cursor:pointer; transition:background 100ms; font-family:inherit; }
      .msp-sugg-btn:hover { background:var(--color-border); }
      .msp-sugg-name { font-size:14px; font-weight:600; color:var(--color-text-primary); }
      .msp-sugg-cat { font-size:12px; color:var(--color-text-muted); }
    `,document.head.appendChild(t)}_render(){this.container.innerHTML=`
      <div class="msp-wrap">
        <div>
          <h1 class="msp-title">📦 Meu Stack</h1>
          <p class="msp-subtitle">Seu protocolo de suplementação ativo</p>
        </div>

        <section>
          <div class="msp-section-header">
            <h2 class="msp-section-title">Ativos</h2>
            <button class="msp-btn-add" id="msp-open-form">+ Adicionar</button>
          </div>
          <div id="msp-list" class="msp-list"></div>
        </section>

        <div id="msp-form-container"></div>
      </div>
    `,this._renderList(),this._attachListeners()}_renderList(){const t=this.container.querySelector("#msp-list");if(!t)return;const o=l.stack??[];if(!o.length){t.innerHTML=`
        <div class="msp-empty">
          <div class="msp-empty-icon">📭</div>
          <p style="color:var(--color-text-primary);font-weight:600">Seu stack está vazio</p>
          <p style="font-size:13px">Adicione os suplementos que você está tomando.</p>
          <button class="msp-empty-cta" id="msp-empty-add">+ Adicionar suplemento</button>
        </div>`,this.container.querySelector("#msp-empty-add")?.addEventListener("click",()=>this._openForm(null));return}t.innerHTML="",o.forEach(e=>{const s=this._calcDaysLeft(e),a=s!==null&&s<=5?"critical":s!==null&&s<=14?"low":"ok",i=e.supplementId??e.id,n=document.createElement("div");n.className=`msp-item msp-item-${a}`,n.dataset.itemId=i,n.innerHTML=`
        <div class="msp-info">
          <h3 class="msp-name">${e.name}</h3>
          <p class="msp-dosage">${e.dosage??"—"} ${e.unit??"g"}/dia${e.quantity?` · ${e.quantity} ${e.unit??"g"} em estoque`:""}</p>
        </div>
        <div class="msp-stock">
          ${s!==null?`
            <div class="msp-days msp-days-${a}">
              <span class="msp-days-value">${s}</span>
              <span class="msp-days-label">dias</span>
            </div>
            <div class="msp-bar">
              <div class="msp-bar-fill msp-bar-${a}" style="width:${Math.min(s/30*100,100)}%"></div>
            </div>
            <span class="msp-qty-text">${e.quantity} ${e.unit??"g"} restantes</span>
          `:'<span class="msp-no-stock">Estoque não informado</span>'}
        </div>
        <div class="msp-actions">
          <button class="msp-btn-edit" data-action="edit" data-id="${i}" aria-label="Editar ${e.name}">✏️</button>
          <button class="msp-btn-del" data-action="remove" data-id="${i}" aria-label="Remover ${e.name}">🗑️</button>
        </div>
      `,t.appendChild(n)})}_openForm(t){this._editId=t,this._formOpen=!0;const o=t?(l.stack??[]).find(s=>(s.supplementId??s.id)===t):null,e=this.container.querySelector("#msp-form-container");e&&(e.innerHTML=`
      <div class="msp-form-wrap">
        <h3 class="msp-form-title">${t?"Editar suplemento":"Adicionar suplemento"}</h3>

        <div class="msp-field" id="msp-search-field">
          <label class="msp-label" for="msp-name-input">Suplemento</label>
          <input type="search" id="msp-name-input" class="msp-input"
            placeholder="Buscar suplemento..." autocomplete="off"
            value="${o?.name??""}" ${t?"readonly":""}>
          <div id="msp-dropdown" class="msp-dropdown" style="display:none"></div>
        </div>

        <div class="msp-field">
          <label class="msp-label">Dosagem diária</label>
          <div class="msp-row">
            <input type="number" id="msp-dosage" class="msp-input" min="0.1" max="10000" step="0.1"
              placeholder="Ex: 5" value="${o?.dosage??""}">
            <select id="msp-unit" class="msp-select">
              <option value="g" ${o?.unit==="g"?"selected":""}>g</option>
              <option value="mg" ${o?.unit==="mg"?"selected":""}>mg</option>
              <option value="UI" ${o?.unit==="UI"?"selected":""}>UI</option>
              <option value="mcg" ${o?.unit==="mcg"?"selected":""}>mcg</option>
              <option value="cápsulas" ${o?.unit==="cápsulas"?"selected":""}>cápsulas</option>
            </select>
          </div>
        </div>

        <div class="msp-field">
          <label class="msp-label" for="msp-quantity">Quantidade em estoque</label>
          <input type="number" id="msp-quantity" class="msp-input" min="0" max="100000"
            placeholder="Ex: 250" value="${o?.quantity??""}">
        </div>

        <div class="msp-form-btns">
          <button class="msp-btn-cancel" id="msp-cancel">Cancelar</button>
          <button class="msp-btn-save" id="msp-save">Salvar</button>
        </div>
      </div>
    `,this._attachFormListeners(),e.scrollIntoView({behavior:"smooth",block:"nearest"}))}_closeForm(){this._formOpen=!1,this._editId=null;const t=this.container.querySelector("#msp-form-container");t&&(t.innerHTML="")}_attachFormListeners(){const t=this.container.querySelector("#msp-form-container");if(t){if(!this._editId){const o=t.querySelector("#msp-name-input"),e=t.querySelector("#msp-dropdown");let s;o?.addEventListener("input",a=>{clearTimeout(s),s=setTimeout(()=>{const i=a.target.value.trim().toLowerCase();if(i.length<2){e.style.display="none";return}const n=c.filter(r=>r.name.toLowerCase().includes(i)||(r.category??"").toLowerCase().includes(i)).slice(0,8);if(!n.length){e.style.display="none";return}e.innerHTML=n.map(r=>`
            <button class="msp-sugg-btn"
              data-id="${r.id}" data-name="${r.name}"
              data-unit="${r.dosage?.unit??"g"}"
              data-dosage="${r.dosage?.maintenance??5}">
              <span class="msp-sugg-name">${r.name}</span>
              <span class="msp-sugg-cat">${r.category??""}</span>
            </button>`).join(""),e.style.display="block",e.querySelectorAll(".msp-sugg-btn").forEach(r=>{r.addEventListener("click",d=>{d.preventDefault(),o.value=r.dataset.name,t.querySelector("#msp-dosage").value=r.dataset.dosage,t.querySelector("#msp-unit").value=r.dataset.unit,e.style.display="none"})})},200)}),document.addEventListener("click",a=>{!o?.contains(a.target)&&!e?.contains(a.target)&&e&&(e.style.display="none")},{once:!1})}t.querySelector("#msp-cancel")?.addEventListener("click",()=>this._closeForm()),t.querySelector("#msp-save")?.addEventListener("click",()=>{const o=t.querySelector("#msp-name-input")?.value?.trim(),e=parseFloat(t.querySelector("#msp-dosage")?.value)||0,s=t.querySelector("#msp-unit")?.value||"g",a=parseFloat(t.querySelector("#msp-quantity")?.value)||0;if(!o){alert("Informe o nome do suplemento.");return}if(e<=0){alert("Informe a dosagem diária.");return}const n={supplementId:this._editId??o.toLowerCase().replace(/\s+/g,"-")+"-"+Date.now(),name:o,dosage:e,unit:s,quantity:a};l.dispatch(this._editId?p.UPDATE_STACK_ITEM:p.ADD_TO_STACK,n),this._closeForm(),this._renderList()})}}_attachListeners(){this.container.querySelector("#msp-open-form")?.addEventListener("click",()=>this._openForm(null)),this.container.querySelector("#msp-list")?.addEventListener("click",t=>{const o=t.target.closest("[data-action]");if(o&&(o.dataset.action==="edit"&&this._openForm(o.dataset.id),o.dataset.action==="remove")){const e=o.dataset.id,s=(l.stack??[]).find(a=>(a.supplementId??a.id)===e);if(!s||!confirm(`Remover ${s.name} do stack?`))return;l.dispatch(p.REMOVE_FROM_STACK,{supplementId:e}),this._renderList()}})}_calcDaysLeft(t){const o=parseFloat(t.quantity),e=parseFloat(t.dosage);return!o||!e||e<=0?null:Math.max(0,Math.floor(o/e))}}export{x as MyStackPage,x as default};
