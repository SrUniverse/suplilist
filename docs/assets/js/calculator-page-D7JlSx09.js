import{s as c,A as u}from"./main-4ndHjxTB.js";import f,{SUPPLEMENTS_DB as m}from"./stack-recommender-nYYO0cNz.js";import{c as b}from"./dosage-calculator-CXjJtoIl.js";class y{constructor(e){this.container=e,this._profile=this._loadProfile(),this._results=[],this._debounce=null}mount(){this._render(),this._attachListeners(),this._calculate()}unmount(){clearTimeout(this._debounce)}_loadProfile(){const e=c.user??{};return{objective:e.objective??"general",weight:e.weight??75,height:e.height??175,age:e.age??28,trainingAge:e.trainingAge??2,trainingFrequency:e.trainingFrequency??4,budget:e.budget??250,restrictions:e.restrictions?[...e.restrictions]:[]}}_render(){this._attachStyles();const e=this._profile;this.container.innerHTML=`
      <div class="calc-page">

        <div class="page-header">
          <h1 class="page-title">⚗️ Calculadora</h1>
          <p class="page-subtitle">Dosagem personalizada por biometria científica</p>
        </div>

        <section class="profile-form card" aria-label="Perfil biométrico">
          <h2 class="section-title">Seu Perfil</h2>

          <!-- Objetivo -->
          <div class="form-group">
            <label class="form-label">🎯 Objetivo Principal</label>
            <div class="objective-pills" role="radiogroup" aria-label="Objetivo">
              ${[{value:"bulk",label:"📈 Bulk",desc:"Ganho de massa"},{value:"cut",label:"🔥 Cut",desc:"Perda de gordura"},{value:"strength",label:"💪 Força",desc:"Força máxima"},{value:"endurance",label:"🏃 Resistência",desc:"Cardio/endurance"},{value:"general",label:"🌿 Saúde",desc:"Bem-estar geral"}].map(t=>`
                <button class="objective-pill${e.objective===t.value?" active":""}"
                  data-value="${t.value}" data-field="objective"
                  role="radio" aria-checked="${e.objective===t.value}" title="${t.desc}"
                >${t.label}</button>`).join("")}
            </div>
          </div>

          <!-- Peso + Altura -->
          <div class="form-row">
            ${this._sliderGroup("weight","⚖️ Peso",40,150,1,e.weight,"kg")}
            ${this._sliderGroup("height","📏 Altura",140,220,1,e.height,"cm")}
          </div>

          <!-- Idade + Anos treino -->
          <div class="form-row">
            ${this._sliderGroup("age","🎂 Idade",15,75,1,e.age,"anos")}
            ${this._sliderGroup("trainingAge","🏋️ Anos treinando",0,20,.5,e.trainingAge,"anos")}
          </div>

          <!-- Frequência + Budget -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">📅 Dias de treino/semana</label>
              <div class="frequency-pills" role="radiogroup" aria-label="Frequência">
                ${[2,3,4,5,6,7].map(t=>`
                  <button class="freq-pill${e.trainingFrequency===t?" active":""}"
                    data-value="${t}" data-field="trainingFrequency"
                    role="radio" aria-checked="${e.trainingFrequency===t}"
                    aria-label="${t} dias por semana"
                  >${t}×</button>`).join("")}
              </div>
            </div>
            ${this._sliderGroup("budget","💵 Orçamento mensal",50,1e3,10,e.budget,"R$",!0)}
          </div>

          <!-- Restrições -->
          <div class="form-group">
            <label class="form-label">🚫 Restrições / Alergias</label>
            <div class="restriction-pills" role="group" aria-label="Restrições">
              ${[{value:"gluten",label:"🌾 Glúten"},{value:"lactose",label:"🥛 Lactose"},{value:"shellfish",label:"🦐 Crustáceos"},{value:"soy",label:"🫘 Soja"},{value:"vegetarian",label:"🥦 Vegetariano"},{value:"vegan",label:"🌱 Vegano"}].map(t=>`
                <button class="restriction-pill${e.restrictions.includes(t.value)?" active-danger":""}"
                  data-value="${t.value}" data-action="toggle-restriction"
                  aria-pressed="${e.restrictions.includes(t.value)}"
                >${t.label}</button>`).join("")}
            </div>
          </div>

          <button class="btn-save-profile" data-action="save-profile">💾 Salvar perfil</button>
        </section>

        <div class="calc-divider" aria-hidden="true"><span>Recomendações para você</span></div>

        <section class="results-section" id="results-section" aria-live="polite" aria-label="Resultados">
          <div class="results-loading" id="results-loading">
            <div class="spinner"></div>
            <p>Calculando seu stack ideal...</p>
          </div>
          <div class="results-grid" id="results-grid"></div>
        </section>

        <section class="budget-section card" id="budget-section" style="display:none">
          <h2 class="section-title">💵 Resumo de Custo</h2>
          <div class="budget-grid" id="budget-grid"></div>
          <div class="budget-total" id="budget-total"></div>
        </section>

        <p class="disclaimer">
          ⚠️ As recomendações são baseadas em evidências científicas e perfil informado.
          Consulte um médico ou nutricionista antes de iniciar qualquer protocolo.
        </p>
      </div>
    `}_sliderGroup(e,t,r,s,a,i,o,l=!1){const p=l?`<span class="unit-label">${o}</span>`:"",d=l?"":`<span class="unit-label">${o}</span>`;return`
      <div class="form-group">
        <label class="form-label">${t}</label>
        <div class="input-with-unit">
          <input type="range" id="${e}-slider" class="range-slider"
            min="${r}" max="${s}" step="${a}" value="${i}"
            data-field="${e}" aria-label="${t}">
          <div class="range-value-row">
            ${p}
            <input type="number" id="${e}" class="number-input"
              min="${r}" max="${s}" step="${a}" value="${i}"
              data-field="${e}" aria-label="${t}">
            ${d}
          </div>
        </div>
      </div>`}_calculate(){const e=this.container.querySelector("#results-loading"),t=this.container.querySelector("#results-grid");e&&(e.style.display="flex"),t&&(t.innerHTML=""),clearTimeout(this._debounce),this._debounce=setTimeout(()=>{try{const r=f.recommend(this._profile,8);this._results=r.map(s=>{let a=s.dosage??{};try{const i=m.find(o=>o.id===s.id);if(i){const o=b.calculate(i,this._profile);o&&(a={...a,daily:o.daily,scientificRationale:o.rationale??a.scientificRationale})}}catch(i){console.warn("[DosageCalculatorPage] Dosage calculation error for",s.id,i)}return{...s,dosage:a}})}catch(r){console.warn("[DosageCalculatorPage] _calculate error",r),this._results=[]}this._renderResults(),this._renderBudget(),e&&(e.style.display="none")},180)}_renderResults(){const e=this.container.querySelector("#results-grid");if(!e)return;if(!this._results.length){e.innerHTML=`
        <div class="empty-state">
          <p style="font-size:32px">🤷</p>
          <p>Nenhum suplemento encontrado. Ajuste as restrições ou objetivo.</p>
        </div>`;return}const t=document.createDocumentFragment(),r=c.getState?.()?.favorites??c.favorites??[],s=c.stack??[];this._results.forEach((a,i)=>{const o=document.createElement("div");o.className="result-card",o.dataset.id=a.id,o.role="article",o.style.animationDelay=`${i*60}ms`;const l=Math.round((a.score??0)*100),p=l>=80?"#00E676":l>=60?"#7C3AED":"#FFB74D",d=r.some(n=>n===a.id||n.supplementId===a.id),g=s.some(n=>n.supplementId===a.id);o.innerHTML=`
        <div class="result-rank" aria-label="Posição ${i+1}">#${i+1}</div>
        <div class="result-header">
          <div class="result-meta">
            <p class="result-category">${a.category??""}</p>
            <h3 class="result-name">${a.name}</h3>
          </div>
          <evidence-pill level="${a.evidenceLevel??a.evidence??"D"}"></evidence-pill>
        </div>
        <div class="score-section" aria-label="Compatibilidade: ${l}%">
          <div class="score-label">
            <span>Compatibilidade</span>
            <span style="color:${p};font-weight:700;font-family:'JetBrains Mono',monospace">${l}%</span>
          </div>
          <div class="score-bar" role="progressbar" aria-valuenow="${l}" aria-valuemin="0" aria-valuemax="100">
            <div class="score-fill" style="width:${l}%;background:${p}"></div>
          </div>
        </div>
        <div class="dosage-block">
          <div class="dosage-main">
            <span class="dosage-value">${a.dosage?.daily??a.dosage?.maintenance??"—"}</span>
            <span class="dosage-unit">${a.dosage?.unit??"g"}/dia</span>
          </div>
          <p class="dosage-rationale">${a.dosage?.scientificRationale??""}</p>
        </div>
        ${a.benefits?.length?`
          <div class="benefits-row" aria-label="Benefícios">
            ${a.benefits.slice(0,3).map(n=>`
              <span class="benefit-chip">
                <span class="benefit-label">${typeof n=="string"?n:n.label}</span>
                ${n.likelihood?`<span class="benefit-pct">${n.likelihood}</span>`:""}
              </span>`).join("")}
          </div>`:""}
        <div class="result-cost">
          <span class="cost-label">Custo estimado</span>
          <span class="cost-value">R$ ${(a.cost?.perMonth??0).toFixed(2)}/mês</span>
        </div>
        ${a.warnings?.length>1?`
          <div class="warnings-section">
            ${a.warnings.slice(1).map(n=>`<p class="warning-item">⚠️ ${n}</p>`).join("")}
          </div>`:""}
        ${a.interactions?.length?`
          <div class="interactions-section">
            ${a.interactions.map(n=>`
              <p class="interaction-item interaction-${n.severity??"info"}">⚡ ${n.message??n}</p>`).join("")}
          </div>`:""}
        <div class="result-actions">
          <button class="btn-action${d?" active-fav":""}" data-action="toggle-fav"
            data-id="${a.id}" data-name="${a.name}"
            aria-label="${d?"Remover favorito":"Adicionar favorito"}" aria-pressed="${d}">
            ${d?"♥ Favorito":"♡ Favoritar"}
          </button>
          <button class="btn-action btn-action-primary${g?" active-stack":""}" data-action="toggle-stack"
            data-id="${a.id}" data-name="${a.name}"
            aria-label="${g?"Remover do stack":"Adicionar ao stack"}" aria-pressed="${g}">
            ${g?"✓ No stack":"+ Stack"}
          </button>
        </div>
      `,t.appendChild(o)}),e.appendChild(t)}_renderBudget(){const e=this.container.querySelector("#budget-section"),t=this.container.querySelector("#budget-grid"),r=this.container.querySelector("#budget-total");if(!e||!t||!r||!this._results.length)return;e.style.display="block";const s=this._results.reduce((i,o)=>i+(o.cost?.perMonth??0),0),a=this._profile.budget-s;t.innerHTML=this._results.map(i=>`
      <div class="budget-item">
        <span class="budget-item-name">${i.name}</span>
        <span class="budget-item-cost">R$ ${(i.cost?.perMonth??0).toFixed(2)}</span>
      </div>`).join(""),r.innerHTML=`
      <div class="budget-total-row">
        <span>Total do stack</span>
        <span class="budget-total-value" style="color:${s>this._profile.budget?"#EF5350":"#00E676"}">
          R$ ${s.toFixed(2)}
        </span>
      </div>
      <div class="budget-total-row" style="font-size:13px;color:#888">
        <span>Orçamento</span><span>R$ ${this._profile.budget.toFixed(2)}</span>
      </div>
      <div class="budget-total-row" style="font-size:13px">
        <span>${a>=0?"Saldo restante":"Excede orçamento em"}</span>
        <span style="color:${a>=0?"#00E676":"#EF5350"}">
          ${a>=0?"+":""}R$ ${Math.abs(a).toFixed(2)}
        </span>
      </div>`}_attachListeners(){this.container.querySelectorAll(".objective-pill").forEach(e=>{e.addEventListener("click",()=>{this.container.querySelectorAll(".objective-pill").forEach(t=>{t.classList.remove("active"),t.setAttribute("aria-checked","false")}),e.classList.add("active"),e.setAttribute("aria-checked","true"),this._profile.objective=e.dataset.value,this._calculate()})}),this.container.querySelectorAll(".freq-pill").forEach(e=>{e.addEventListener("click",()=>{this.container.querySelectorAll(".freq-pill").forEach(t=>{t.classList.remove("active"),t.setAttribute("aria-checked","false")}),e.classList.add("active"),e.setAttribute("aria-checked","true"),this._profile.trainingFrequency=parseInt(e.dataset.value),this._calculate()})}),this.container.querySelectorAll('[data-action="toggle-restriction"]').forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.value,r=this._profile.restrictions.indexOf(t);r===-1?(this._profile.restrictions.push(t),e.classList.add("active-danger"),e.setAttribute("aria-pressed","true")):(this._profile.restrictions.splice(r,1),e.classList.remove("active-danger"),e.setAttribute("aria-pressed","false")),this._calculate()})}),["weight","height","age","trainingAge","budget"].forEach(e=>{const t=this.container.querySelector(`#${e}-slider`),r=this.container.querySelector(`#${e}`);if(!t||!r)return;const s=a=>{const i=parseFloat(a);isNaN(i)||(this._profile[e]=i,t.value=i,r.value=i,this._calculate())};t.addEventListener("input",a=>s(a.target.value)),r.addEventListener("change",a=>{const i=Math.min(Math.max(parseFloat(a.target.value),parseFloat(r.min)),parseFloat(r.max));s(i)})}),this.container.querySelector('[data-action="save-profile"]')?.addEventListener("click",()=>{c.dispatch(u.SET_USER_PROFILE??"SET_USER_PROFILE",{...this._profile}),window.SupliToast&&window.SupliToast.show("✓ Perfil salvo!","success")}),this.container.addEventListener("click",e=>{const t=e.target.closest('[data-action="toggle-fav"],[data-action="toggle-stack"]');if(!t)return;const{action:r}=t.dataset,s=t.dataset.id,a=t.dataset.name;if(r==="toggle-fav"){const i=c.getState?.()?.favorites?.some(o=>o===s||o.supplementId===s)??!1;c.dispatch(i?u.REMOVE_FAVORITE:u.ADD_FAVORITE,{supplementId:s}),t.textContent=i?"♡ Favoritar":"♥ Favorito",t.classList.toggle("active-fav",!i),t.setAttribute("aria-pressed",String(!i)),window.SupliToast&&window.SupliToast.show(i?`${a} removido dos favoritos`:`♥ ${a} favoritado!`,i?"info":"success")}if(r==="toggle-stack"){const i=c.stack?.some(o=>o.supplementId===s)??!1;if(i)c.dispatch(u.REMOVE_FROM_STACK,{supplementId:s});else{const o=this._results.find(d=>d.id===s),l=o?.dosage?.daily??o?.dosage?.maintenance??0,p=o?.dosage?.unit??"g";c.dispatch(u.ADD_TO_STACK,{supplementId:s,name:a,dosage:l,unit:p,frequency:"diário"})}t.textContent=i?"+ Stack":"✓ No stack",t.classList.toggle("active-stack",!i),t.setAttribute("aria-pressed",String(!i)),window.SupliToast&&window.SupliToast.show(i?`${a} removido do stack`:`✓ ${a} adicionado!`,i?"info":"success")}})}_attachStyles(){if(document.getElementById("calc-page-styles"))return;const e=document.createElement("style");e.id="calc-page-styles",e.textContent=`
      .calc-page { display:flex; flex-direction:column; gap:24px; padding:20px 16px 100px; max-width:900px; margin:0 auto; }
      .card { background:#141414; border:1px solid #2A2A2A; border-radius:16px; padding:20px; }
      .page-header { margin-bottom:4px; }
      .page-title { font-size:24px; font-weight:800; color:#FAFAFA; margin:0 0 4px; }
      .page-subtitle { font-size:14px; color:#888; margin:0; }
      .section-title { font-size:16px; font-weight:700; color:#FAFAFA; margin:0 0 16px; }
      .form-row { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
      .form-group { display:flex; flex-direction:column; gap:8px; margin-bottom:16px; }
      .form-label { font-size:13px; font-weight:600; color:#888; text-transform:uppercase; letter-spacing:.5px; }
      .input-with-unit { display:flex; flex-direction:column; gap:6px; }
      .range-slider { -webkit-appearance:none; width:100%; height:4px; background:#2A2A2A; border-radius:999px; outline:none; cursor:pointer; }
      .range-slider::-webkit-slider-thumb { -webkit-appearance:none; width:18px; height:18px; border-radius:50%; background:#7C3AED; cursor:pointer; border:2px solid #FAFAFA; box-shadow:0 0 8px rgba(124,58,237,.5); transition:transform 150ms; }
      .range-slider::-webkit-slider-thumb:hover { transform:scale(1.2); }
      .range-value-row { display:flex; align-items:center; gap:6px; }
      .number-input { width:72px; padding:6px 10px; background:#1E1E1E; border:1px solid #2A2A2A; border-radius:8px; color:#FAFAFA; font-size:15px; font-family:'JetBrains Mono',monospace; font-weight:700; text-align:center; outline:none; }
      .number-input:focus { border-color:#7C3AED; }
      .unit-label { font-size:13px; color:#888; white-space:nowrap; }
      .objective-pills, .frequency-pills, .restriction-pills { display:flex; flex-wrap:wrap; gap:8px; }
      .objective-pill, .freq-pill, .restriction-pill { padding:8px 14px; background:#1E1E1E; border:1px solid #2A2A2A; border-radius:999px; color:#888; font-size:13px; font-weight:600; cursor:pointer; transition:all 150ms; font-family:inherit; }
      .objective-pill:hover, .freq-pill:hover { border-color:#7C3AED; color:#FAFAFA; }
      .objective-pill.active, .freq-pill.active { background:#7C3AED22; border-color:#7C3AED; color:#7C3AED; }
      .freq-pill { padding:8px 12px; min-width:44px; text-align:center; }
      .restriction-pill.active-danger { background:#EF535011; border-color:#EF5350; color:#EF5350; }
      .btn-save-profile { width:100%; padding:13px; margin-top:8px; background:#7C3AED; color:#fff; border:none; border-radius:12px; font-size:15px; font-weight:700; cursor:pointer; transition:opacity 150ms,transform 150ms; font-family:inherit; }
      .btn-save-profile:hover { opacity:.9; }
      .btn-save-profile:active { transform:scale(.98); }
      .calc-divider { display:flex; align-items:center; gap:12px; color:#444; font-size:12px; text-transform:uppercase; letter-spacing:1px; font-weight:700; }
      .calc-divider::before, .calc-divider::after { content:''; flex:1; height:1px; background:#2A2A2A; }
      .results-loading { display:flex; flex-direction:column; align-items:center; gap:12px; padding:48px 20px; color:#888; }
      .spinner { width:32px; height:32px; border:3px solid #2A2A2A; border-top-color:#7C3AED; border-radius:50%; animation:spin .8s linear infinite; }
      @keyframes spin { to { transform:rotate(360deg); } }
      .results-grid { display:grid; grid-template-columns:1fr; gap:16px; }
      .result-card { background:#141414; border:1px solid #2A2A2A; border-radius:16px; padding:20px; position:relative; animation:cardIn 400ms ease both; transition:border-color 150ms,box-shadow 150ms; }
      .result-card:hover { border-color:#7C3AED44; box-shadow:0 0 20px rgba(124,58,237,.1); }
      @keyframes cardIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      .result-rank { position:absolute; top:-10px; left:16px; background:#7C3AED; color:#fff; font-size:11px; font-weight:800; font-family:'JetBrains Mono',monospace; padding:2px 8px; border-radius:999px; }
      .result-header { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:14px; }
      .result-category { font-size:11px; color:#888; text-transform:uppercase; letter-spacing:.5px; margin:0 0 3px; }
      .result-name { font-size:17px; font-weight:700; color:#FAFAFA; margin:0; line-height:1.2; }
      .score-section { margin-bottom:14px; }
      .score-label { display:flex; justify-content:space-between; font-size:12px; color:#888; margin-bottom:6px; }
      .score-bar { height:5px; background:#2A2A2A; border-radius:999px; overflow:hidden; }
      .score-fill { height:100%; border-radius:999px; transition:width 500ms ease; }
      .dosage-block { display:flex; flex-direction:column; gap:4px; padding:12px; background:#1E1E1E; border-radius:10px; margin-bottom:12px; }
      .dosage-main { display:flex; align-items:baseline; gap:4px; }
      .dosage-value { font-size:28px; font-weight:900; font-family:'JetBrains Mono',monospace; color:#7C3AED; }
      .dosage-unit { font-size:14px; color:#888; font-family:'JetBrains Mono',monospace; }
      .dosage-rationale { font-size:12px; color:#666; margin:0; line-height:1.4; }
      .benefits-row { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px; }
      .benefit-chip { display:inline-flex; align-items:center; gap:4px; padding:4px 10px; background:#1E1E1E; border:1px solid #2A2A2A; border-radius:999px; font-size:12px; }
      .benefit-label { color:#FAFAFA; }
      .benefit-pct { color:#00E676; font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:700; }
      .result-cost { display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:#1E1E1E; border-radius:8px; margin-bottom:12px; }
      .cost-label { font-size:12px; color:#888; }
      .cost-value { font-size:14px; font-weight:700; color:#FFB74D; font-family:'JetBrains Mono',monospace; }
      .warnings-section, .interactions-section { margin-bottom:10px; }
      .warning-item, .interaction-item { font-size:12px; color:#FFB74D; margin:4px 0; line-height:1.4; }
      .result-actions { display:flex; gap:8px; margin-top:4px; }
      .btn-action { flex:1; padding:9px 14px; background:#1E1E1E; border:1px solid #2A2A2A; border-radius:999px; color:#888; font-size:13px; font-weight:600; cursor:pointer; transition:all 150ms; font-family:inherit; }
      .btn-action:hover { border-color:#7C3AED; color:#FAFAFA; }
      .btn-action-primary { background:#7C3AED22; border-color:#7C3AED44; color:#7C3AED; }
      .btn-action-primary:hover { background:#7C3AED; color:#fff; }
      .active-fav { background:#EF535011; border-color:#EF535044; color:#EF5350; }
      .active-stack { background:#00E67611; border-color:#00E67644; color:#00E676; }
      .budget-grid { display:flex; flex-direction:column; gap:6px; margin-bottom:12px; }
      .budget-item { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #1E1E1E; font-size:14px; }
      .budget-item-name { color:#FAFAFA; }
      .budget-item-cost { color:#888; font-family:'JetBrains Mono',monospace; }
      .budget-total { display:flex; flex-direction:column; gap:6px; padding-top:10px; border-top:1px solid #2A2A2A; }
      .budget-total-row { display:flex; justify-content:space-between; font-size:15px; font-weight:600; color:#FAFAFA; }
      .budget-total-value { font-family:'JetBrains Mono',monospace; font-size:18px; font-weight:800; }
      .disclaimer { font-size:12px; color:#555; line-height:1.6; padding:12px; border:1px solid #2A2A2A; border-radius:10px; background:#141414; margin:0; }
      .empty-state { text-align:center; padding:48px 20px; color:#888; display:flex; flex-direction:column; align-items:center; gap:12px; grid-column:1/-1; }
      @media (max-width:560px) { .form-row { grid-template-columns:1fr; gap:0; } .calc-page { padding:16px 12px 100px; } }
      @media (min-width:640px) { .results-grid { grid-template-columns:repeat(2,1fr); } }
      @media (min-width:1024px) { .results-grid { grid-template-columns:repeat(4,1fr); } .calc-page { padding:32px 24px 80px; } }
    `,document.head.appendChild(e)}}export{y as DosageCalculatorPage,y as default};
