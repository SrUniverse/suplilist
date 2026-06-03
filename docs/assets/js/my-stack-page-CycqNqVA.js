import{e as E,s as c,A as b,o as _}from"./main-BRQQPoec.js";import{S as h}from"./stack-recommender-C-ikRSH4.js";import{r as C}from"./evidence-D5RtUc7g.js";import{e as p}from"./escape-Br5wU8qn.js";import{a as k}from"./affiliate-engine-Cqp9KNIn.js";import{b as $}from"./vendor-Vk1E4gpc.js";function g(i){return i==null?null:i.supplementId??i.id??null}class I{generateShareUrl(e){if(!e||!e.length)return"";const t=e.map(s=>({name:s.name,supplementId:s.supplementId||s.id,quantity:s.quantity,dosage:s.dosage,frequency:s.frequency,timeOfDay:s.timeOfDay,notes:s.notes||""})),r=JSON.stringify(t),a=btoa(unescape(encodeURIComponent(r)));return`${window.location.origin}/my-stack?stack=${a}`}formatStackText(e){if(!e||!e.length)return"Meu stack de suplementação está vazio.";let t=`💊 Meu Stack de Suplementação no SupliList:

`;return e.forEach(r=>{t+=`• ${r.name} — Dose: ${r.dosage} (Tomar: ${r.timeOfDay||"qualquer horário"})
`}),t+=`
Acompanhe e calcule suas doses em suplilist.com`,t}async shareStack(e){if(!e||!e.length)return!1;const t=this.generateShareUrl(e);if(this.formatStackText(e),navigator.share)try{return await navigator.share({title:"Meu Stack | SupliList",text:"Confira meu protocolo personalizado de suplementos!",url:t}),!0}catch(r){r.name!=="AbortError"&&console.error("[ShareService] Native share failed:",r)}return this.copyToClipboard(t,"Link do stack copiado para a área de transferência!")}async shareStreak(e){if(!e)return!1;const t=`🔥 Minha constância está em dia! Alcancei um streak de ${e} dias seguidos registrando meu consumo no SupliList. 💊`,r=window.location.origin;if(navigator.share)try{return await navigator.share({title:"Minha Constância | SupliList",text:t,url:r}),!0}catch(a){a.name!=="AbortError"&&console.error("[ShareService] Native streak share failed:",a)}return this.copyToClipboard(`${t} Acesse: ${r}`,"Mensagem de streak copiada com sucesso!")}async copyToClipboard(e,t="Copiado para a área de transferência!"){try{return await navigator.clipboard.writeText(e),E.emit("toast:show",{message:t,type:"success"}),!0}catch(r){return console.error("[ShareService] Clipboard copy failed:",r),window.prompt("Copie o link de compartilhamento:",e),!0}}getWhatsAppLink(e,t){const r=`${e}

Link do Stack:
${t}`;return`https://api.whatsapp.com/send?text=${encodeURIComponent(r)}`}getTelegramLink(e,t){return`https://t.me/share/url?url=${encodeURIComponent(t)}&text=${encodeURIComponent(e)}`}}class L{async renderQRCode(e,t){if(!e||!t)return;const r=document.documentElement.getAttribute("data-theme")==="dark",o={width:200,margin:2,errorCorrectionLevel:"H",color:{dark:r?"#10B981":"#047857",light:r?"#1e1e1e":"#FFFFFF"}};try{await $.toCanvas(e,t,o)}catch(l){console.error("[QRGenerator] QR code rendering failed:",l)}}}let f=null;async function z(){if(f)return f;try{f=await(await fetch("/data/prices.json")).json()}catch{f={}}return f}function y(i){return"R$ "+i.toFixed(2).replace(".",",")}function w(i){return i.reduce((e,t)=>{const a=h.find(d=>d.id===g(t))?.pricePerGram??0,s=parseFloat(t.dosage)||0,o=(t.unit||"g").toLowerCase();let l;if(o==="g")l=s;else if(o==="mg")l=s/1e3;else if(o==="mcg")l=s/1e6;else return e;return e+l*a*30},0)}function M(i){if(!i.length)return"0%";const e=c.checkins??[],t=new Set(i.map(a=>a.supplementId??a.id));let r=0;for(let a=0;a<7;a++){const s=_(a),o=new Set(e.filter(d=>d.date===s).map(d=>d.supplementId));[...t].every(d=>o.has(d))&&r++}return Math.round(r/7*100)+"%"}function T(i){const e=h.find(r=>r.id===g(i));return e?.image?e.image:`/assets/${(i.name??"").toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"")}.png`}function A(i){return h.find(t=>t.id===g(i))?.evidenceLevel??"C"}function q(i){const e=parseFloat(i.quantity),t=parseFloat(i.dosage);return!e||!t||t<=0?null:Math.max(0,Math.floor(e/t))}const R=`
  /* Layout */
  .msp-wrap {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 24px 16px 120px;
    max-width: 960px;
    margin: 0 auto;
    overflow-x: hidden;
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
    gap: 10px;
  }
  @media (max-width: 540px) {
    .msp-stats { grid-template-columns: 1fr 1fr; }
    .msp-stats .msp-stat-card:first-child { grid-column: 1 / -1; }
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
    font-size: clamp(24px, 4vw, 36px);
    font-weight: 800;
    color: var(--color-text-primary);
    line-height: 1.05;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.03em;
  }
  .msp-stat-value.brand { color: var(--color-brand); }
  .msp-stat-icon--ev { background: var(--ev-a-bg, rgba(52,211,153,0.12)); color: var(--ev-a, #34D399); }
  .msp-stat-icon--adherence { background: var(--ev-b-bg, rgba(251,191,36,0.12)); color: var(--ev-b, #FBBF24); }

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

  .msp-btn-share {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 9px 18px;
    background: transparent;
    border: 1.5px solid var(--color-border-strong);
    color: var(--color-text-primary);
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: all 150ms ease;
  }
  .msp-btn-share:hover {
    border-color: var(--color-brand);
    color: var(--color-brand);
    background: var(--color-surface-hover);
  }


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
    background: var(--color-surface-secondary, #191D25);
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
    color: var(--color-savings, #22C55E);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
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
`;class U{constructor(e){this.container=e,this._unsub=null,this._editId=null,this._modalOpen=!1,this._prices=null,this._docClickHandler=null,this.shareService=new I,this.qrGenerator=new L}mount(){this._isMounted=!0,this._attachStyles(),this._render(),z().then(e=>{this._isMounted&&(this._prices=e,this._renderReplenishment())}),this._unsub=c.subscribe((e,t)=>{if(!this._isMounted)return;(!t||["ADD_TO_STACK","REMOVE_FROM_STACK","UPDATE_STACK_ITEM","SET_STACK_QUANTITY","ADD_CHECKIN"].includes(t.type))&&this._renderAll()})}unmount(){this._isMounted=!1,this._docClickHandler&&(document.removeEventListener("click",this._docClickHandler),this._docClickHandler=null),this._unsub?.(),this._closeModal()}_attachStyles(){if(document.getElementById("msp2-styles"))return;const e=document.createElement("style");e.id="msp2-styles",e.textContent=R,document.head.appendChild(e)}_render(){this.container.innerHTML=`
      <div class="msp-wrap">
        <!-- Header -->
        <div>
          <h1 class="msp-header-title">Meu Stack</h1>
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
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button class="msp-btn-share" id="msp-share-stack">
                  <span>🔗</span> Compartilhar
                </button>
                <button class="msp-btn-add" id="msp-open-modal">
                  <span>+</span> Adicionar Suplemento
                </button>
              </div>
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
    `,this._renderAll(),this._attachDelegatedListeners(),this.container.querySelector("#msp-open-modal")?.addEventListener("click",()=>this._openModal()),this.container.querySelector("#msp-share-stack")?.addEventListener("click",()=>this._openShareModal())}_renderAll(){this._renderSubtitle(),this._renderStats(),this._renderList(),this._prices&&this._renderReplenishment()}_renderSubtitle(){const e=c.stack??[],t=w(e),r=this.container.querySelector("#msp-subtitle");r&&(r.textContent=`${e.length} suplemento${e.length!==1?"s":""} ativo${e.length!==1?"s":""} · ${y(t)}/mês estimado`)}_renderStats(){const e=this.container.querySelector("#msp-stats");if(!e)return;const t=c.stack??[],r=w(t),a=M(t);e.innerHTML=`
      <div class="msp-stat-card">
        <div class="msp-stat-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <span class="msp-stat-label">Investimento Mensal</span>
        <span class="msp-stat-value brand">${y(r)}</span>
        <span class="msp-stat-sub">Estimado por stack atual</span>
      </div>
      <div class="msp-stat-card">
        <div class="msp-stat-icon msp-stat-icon--ev">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
        </div>
        <span class="msp-stat-label">Ciclos Ativos</span>
        <span class="msp-stat-value">${t.length}</span>
        <span class="msp-stat-sub">${t.length>0?t.length+" suplemento"+(t.length!==1?"s":"")+" no protocolo":"Nenhum ativo"}</span>
      </div>
      <div class="msp-stat-card">
        <div class="msp-stat-icon msp-stat-icon--adherence">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
        <span class="msp-stat-label">Taxa de Adesão</span>
        <span class="msp-stat-value">${a}</span>
        <span class="msp-stat-sub">Últimos 7 dias</span>
      </div>
    `}_renderList(){const e=this.container.querySelector("#msp-list");if(!e)return;const t=c.stack??[];if(!t.length){e.innerHTML=`
        <div class="msp-empty">
          <div class="msp-empty-icon">📭</div>
          <p class="msp-empty-title">Seu stack está vazio</p>
          <p class="msp-empty-desc">Adicione os suplementos que você está tomando para acompanhar seu protocolo.</p>
          <button class="msp-empty-cta" id="msp-empty-cta">Explorar Catálogo →</button>
        </div>
      `,this.container.querySelector("#msp-empty-cta")?.addEventListener("click",()=>this._openModal());return}e.innerHTML="",t.forEach(r=>{const a=g(r),s=q(r),o=T(r),l=C(A(r)),d=document.createElement("div");d.className="msp-item",d.dataset.itemId=a;const n=h.find(S=>S.id===a),m=n?.category??"",v=n?.benefits?.[0]??"",x=k.getLinks(r.name);d.innerHTML=`
        <div class="msp-item-top">
          <img class="msp-item-img"
            src="${o}"
            alt="${r.name}"
            onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'72\\' height=\\'72\\'%3E%3Crect width=\\'72\\' height=\\'72\\' rx=\\'12\\' fill=\\'%23161616\\'/%3E%3Ctext x=\\'50%25\\' y=\\'55%25\\' text-anchor=\\'middle\\' dominant-baseline=\\'middle\\' font-size=\\'28\\' fill=\\'%23555555\\'%3E💊%3C/text%3E%3C/svg%3E'">
          <div class="msp-item-info">
            ${m?`<p class="msp-item-cat">${m}</p>`:""}
            <p class="msp-item-name">${p(r.name)}</p>
            <p class="msp-item-dosage">${r.dosage??"—"} ${p(r.unit??"g")}/dia</p>
            ${s!==null?`<p class="msp-item-days">~${s} dias restantes</p>`:""}
          </div>
          <div class="msp-item-right">
            ${l}
            <div class="msp-item-actions">
              <button class="msp-btn-icon" data-action="edit" data-id="${a}" aria-label="Editar ${p(r.name)}" title="Editar">✏️</button>
              <button class="msp-btn-icon del" data-action="remove" data-id="${a}" aria-label="Remover ${p(r.name)}" title="Remover">🗑️</button>
              <a class="msp-btn-reorder"
                 href="${x.amazon}"
                 target="_blank"
                 rel="noopener noreferrer"
                 data-aff-id="${p(a)}"
                 data-aff-mp="amazon"
                 title="Recomprar na Amazon"
                 aria-label="Recomprar ${p(r.name)} na Amazon">🛒 Recomprar</a>
            </div>
          </div>
        </div>
        ${v?`<div style="padding:0 16px 8px;font-size:12px;color:var(--color-text-secondary);line-height:1.5;">${v}</div>`:""}
        <div class="msp-item-footer">
          <button class="msp-btn-pause" data-action="edit" data-id="${a}">Editar</button>
          <button class="msp-btn-finish" data-action="remove" data-id="${a}">Remover</button>
        </div>
      `;const u=document.createElement("div");u.id=`msp-edit-${a}`,u.style.display="none",e.appendChild(d),e.appendChild(u)})}_renderReplenishment(){const e=this.container.querySelector("#msp-replenishment");if(!e)return;const t=c.stack??[],r=this._prices??{},a=t.filter(s=>{const o=g(s),l=r[o];return l&&Object.keys(l).length>0});if(!a.length){e.innerHTML='<p class="msp-replen-empty">Nenhum preço disponível para os itens do seu stack.</p>';return}e.innerHTML=a.map((s,o)=>{const l=g(s),d=r[l]??{},n=Object.values(d),m=n.reduce((x,u)=>x.price<u.price?x:u,n[0]),v=o<a.length-1?'<hr class="msp-replen-divider">':"";return`
        <div class="msp-replen-item">
          <span class="msp-replen-name">${p(s.name)}</span>
          <span class="msp-replen-price">Melhor: ${y(m.price)}</span>
          <span class="msp-replen-market">${p(m.label)}</span>
        </div>
        ${v}
      `}).join("")}_attachDelegatedListeners(){this.container.querySelector("#msp-list")?.addEventListener("click",e=>{const t=e.target.closest("[data-aff-mp]");t&&k.trackClick(t.dataset.affId,t.dataset.affMp);const r=e.target.closest("[data-action]");if(!r)return;const a=r.dataset.id;if(r.dataset.action==="edit"&&this._toggleInlineEdit(a),r.dataset.action==="remove"){const s=(c.stack??[]).find(o=>(o.supplementId??o.id)===a);if(!s||!confirm(`Remover "${s.name}" do stack?`))return;c.dispatch(b.REMOVE_FROM_STACK,{supplementId:a})}r.dataset.action==="save-edit"&&this._saveInlineEdit(a),r.dataset.action==="cancel-edit"&&this._closeInlineEdit(a)})}_toggleInlineEdit(e){const t=this.container.querySelector(`#msp-edit-${e}`);if(!t)return;if(t.style.display!=="none"){this._closeInlineEdit(e);return}this.container.querySelectorAll('[id^="msp-edit-"]').forEach(a=>{a.id!==`msp-edit-${e}`&&(a.style.display="none")});const r=(c.stack??[]).find(a=>(a.supplementId??a.id)===e);r&&(t.style.display="block",t.innerHTML=`
      <div class="msp-inline-edit">
        <p class="msp-inline-edit-title">Editar — ${p(r.name)}</p>
        <div class="msp-inline-row">
          <div class="msp-inline-field">
            <label class="msp-inline-label">Dosagem diária</label>
            <input type="number" class="msp-input" id="msp-ei-dosage-${e}" min="0.1" step="0.1" value="${r.dosage??""}">
          </div>
          <div class="msp-inline-field" style="max-width:90px;">
            <label class="msp-inline-label">Unidade</label>
            <select class="msp-select" id="msp-ei-unit-${e}">
              ${["g","mg","UI","mcg","cápsulas"].map(a=>`<option value="${a}" ${r.unit===a?"selected":""}>${a}</option>`).join("")}
            </select>
          </div>
          <div class="msp-inline-field">
            <label class="msp-inline-label">Estoque</label>
            <input type="number" class="msp-input" id="msp-ei-qty-${e}" min="0" value="${r.quantity??""}">
          </div>
        </div>
        <div class="msp-inline-btns">
          <button class="msp-btn-cancel" data-action="cancel-edit" data-id="${e}">Cancelar</button>
          <button class="msp-btn-save" data-action="save-edit" data-id="${e}">Salvar</button>
        </div>
      </div>
    `,t.scrollIntoView({behavior:"smooth",block:"nearest"}))}_closeInlineEdit(e){const t=this.container.querySelector(`#msp-edit-${e}`);t&&(t.style.display="none")}_saveInlineEdit(e){const t=parseFloat(this.container.querySelector(`#msp-ei-dosage-${e}`)?.value)||0,r=this.container.querySelector(`#msp-ei-unit-${e}`)?.value||"g",a=parseFloat(this.container.querySelector(`#msp-ei-qty-${e}`)?.value)||0;if(t<=0){alert("Informe uma dosagem válida.");return}c.dispatch(b.UPDATE_STACK_ITEM,{supplementId:e,dosage:t,unit:r,quantity:a}),this._closeInlineEdit(e)}_openModal(){if(this._modalOpen)return;this._modalOpen=!0;const e=document.createElement("div");e.className="msp-modal-overlay",e.id="msp-modal-overlay",e.setAttribute("role","dialog"),e.setAttribute("aria-modal","true"),e.setAttribute("aria-label","Adicionar suplemento"),e.innerHTML=`
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
    `,document.body.appendChild(e);const t=document.getElementById("router-outlet");t&&(t.style.overflow="hidden"),this._modalSelectedId=null,e.addEventListener("click",o=>{o.target===e&&this._closeModal()}),document.getElementById("msp-modal-close")?.addEventListener("click",()=>this._closeModal());const r=document.getElementById("msp-modal-search"),a=document.getElementById("msp-modal-results");let s;r?.addEventListener("input",o=>{clearTimeout(s),s=setTimeout(()=>{const l=o.target.value.trim().toLowerCase();if(l.length<2){a.style.display="none";return}const d=h.filter(n=>n.name.toLowerCase().includes(l)||(n.category??"").toLowerCase().includes(l)).slice(0,8);if(!d.length){a.style.display="none";return}a.innerHTML=d.map(n=>`
          <button class="msp-result-btn"
            data-id="${p(n.id)}"
            data-name="${p(n.name)}"
            data-unit="${p(n.dosage?.unit??"g")}"
            data-dosage="${n.dosage?.maintenance??5}"
            data-img="${p(n.image??"")}">
            <img class="msp-result-img" src="${p(n.image??"")}"
              alt="${p(n.name)}"
              onerror="this.style.display='none'">
            <div class="msp-result-info">
              <span class="msp-result-name">${p(n.name)}</span>
              <span class="msp-result-cat">${p(n.category??"")}</span>
            </div>
          </button>
        `).join(""),a.style.display="block",a.querySelectorAll(".msp-result-btn").forEach(n=>{n.addEventListener("click",m=>{m.preventDefault(),this._modalSelectedId=n.dataset.id,r.value=n.dataset.name,document.getElementById("msp-modal-dosage").value=n.dataset.dosage,document.getElementById("msp-modal-unit").value=n.dataset.unit,a.style.display="none"})})},180)}),this._docClickHandler=o=>{!r?.contains(o.target)&&!a?.contains(o.target)&&(a.style.display="none")},document.addEventListener("click",this._docClickHandler),document.getElementById("msp-modal-submit")?.addEventListener("click",()=>{const o=(document.getElementById("msp-modal-search")?.value??"").trim(),l=parseFloat(document.getElementById("msp-modal-dosage")?.value)||0,d=document.getElementById("msp-modal-unit")?.value||"g",n=parseFloat(document.getElementById("msp-modal-qty")?.value)||0;if(!o){alert("Informe o nome do suplemento.");return}if(l<=0){alert("Informe a dosagem diária.");return}const m=this._modalSelectedId??o.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"")+"-"+Date.now();c.dispatch(b.ADD_TO_STACK,{supplementId:m,name:o,dosage:l,unit:d,quantity:n||null}),this._closeModal()}),setTimeout(()=>r?.focus(),100)}_closeModal(){this._docClickHandler&&(document.removeEventListener("click",this._docClickHandler),this._docClickHandler=null),this._modalOpen=!1,this._modalSelectedId=null,document.getElementById("msp-modal-overlay")?.remove();const t=document.getElementById("router-outlet");t&&(t.style.overflow="")}_openShareModal(){const e=c.stack||[];if(!e.length){alert("Seu stack de suplementação está vazio. Adicione suplementos para poder compartilhá-lo!");return}const t=this.shareService.generateShareUrl(e),r=this.shareService.formatStackText(e),a=document.createElement("div");a.className="msp-modal-overlay",a.id="msp-share-modal",a.style.zIndex="2000",a.innerHTML=`
      <div class="msp-modal" style="max-width: 440px; padding: 24px; text-align: center;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 class="msp-modal-title" style="margin: 0; font-size: 18px;">Compartilhar Stack</h3>
          <button class="msp-btn-icon" id="msp-close-share" style="font-size: 20px;">✕</button>
        </div>

        <p style="color: var(--color-text-secondary); font-size: 13px; margin: 0 0 16px 0;">
          Compartilhe sua rotina de suplementação offline-first de forma 100% segura. Seus dados ficam no seu link!
        </p>

        <!-- QR Code Canvas Container -->
        <div style="background: var(--color-surface-secondary); padding: 16px; border-radius: 12px; display: inline-block; margin-bottom: 20px; border: 1px solid var(--color-border);">
          <canvas id="msp-share-qr-canvas" style="display: block; max-width: 100%; border-radius: 8px;"></canvas>
          <span style="font-size: 11px; color: var(--color-text-muted); display: block; margin-top: 8px;">Aponte a câmera para escanear e importar</span>
        </div>

        <!-- Sharing action buttons -->
        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
          <button class="msp-btn-save" id="msp-share-native-btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span>📱</span> Compartilhar no Aparelho
          </button>
          
          <div style="display: flex; gap: 8px;">
            <button class="msp-btn-cancel" id="msp-share-wa-btn" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; border-color: #25D366; color: #25D366; background: rgba(37,211,102,0.06);">
              <span>💬</span> WhatsApp
            </button>
            <button class="msp-btn-cancel" id="msp-share-tg-btn" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; border-color: #0088cc; color: #0088cc; background: rgba(0,136,204,0.06);">
              <span>✈️</span> Telegram
            </button>
          </div>

          <button class="msp-btn-cancel" id="msp-share-copy-btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <span>📋</span> Copiar Link de Importação
          </button>
        </div>
      </div>
    `,document.body.appendChild(a);const s=a.querySelector("#msp-share-qr-canvas");s&&this.qrGenerator.renderQRCode(s,t),a.querySelector("#msp-close-share")?.addEventListener("click",()=>a.remove()),a.querySelector("#msp-share-native-btn")?.addEventListener("click",async()=>{await this.shareService.shareStack(e)}),a.querySelector("#msp-share-wa-btn")?.addEventListener("click",()=>{const o=this.shareService.getWhatsAppLink(r,t);window.open(o,"_blank")}),a.querySelector("#msp-share-tg-btn")?.addEventListener("click",()=>{const o=this.shareService.getTelegramLink(r,t);window.open(o,"_blank")}),a.querySelector("#msp-share-copy-btn")?.addEventListener("click",async()=>{await this.shareService.copyToClipboard(t,"Link de importação copiado!")}),a.addEventListener("click",o=>{o.target===a&&a.remove()})}}export{U as MyStackPage,U as default};
