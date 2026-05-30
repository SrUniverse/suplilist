var M=Object.defineProperty;var T=(u,e,a)=>e in u?M(u,e,{enumerable:!0,configurable:!0,writable:!0,value:a}):u[e]=a;var m=(u,e,a)=>T(u,typeof e!="symbol"?e+"":e,a);import{s as d,A as v}from"./main-CfwEDZr2.js";import{r as I,S as j}from"./stack-recommender-DOv4qzO8.js";class C{constructor(){m(this,"FIXED_DOSE_SUPPLEMENTS",new Set(["vitamina-d3","omega-3","magnesio-bisglicinato","vitamina-c","ashwagandha"]));m(this,"WEIGHT_BASED_SUPPLEMENTS",new Map([["creatina-monohidratada",.07],["whey-protein",.4],["beta-alanina",.05],["l-carnitina",.02],["cafeina",3]]));m(this,"ACTIVITY_MULTIPLIERS",{low:.85,moderate:1,high:1.15});m(this,"OBJECTIVE_MULTIPLIERS",{bulk:1.2,strength:1.2,cut:.9,endurance:1,general:1});m(this,"TIMING_SCHEDULES",{preWorkout:"30-45 minutos antes do treino",postWorkout:"Pós-treino ou a qualquer hora com carboidratos",morning:"Pela manhã com refeição",night:"30-60 minutos antes de dormir"})}calculate(e,a){if(!e||!a)throw new Error("[DosageCalculator] Supplement and UserProfile are mandatory inputs");const i=a.weight||70,s=a.trainingFrequency||3,t=a.objective||"general",o=a.age||25;let r=e.dosage?.maintenance||0,l=e.dosage?.isFixed||this.FIXED_DOSE_SUPPLEMENTS.has(e.id),p="Dosagem clínica fixa recomendada.";if(!l){const E=this.WEIGHT_BASED_SUPPLEMENTS.get(e.id)||e.dosage.multiplier||.05,A=this._getActivityLevel(s),L=this.ACTIVITY_MULTIPLIERS[A]||1,F=this.OBJECTIVE_MULTIPLIERS[t]||1,q=this._getAgeMultiplier(o);r=i*E*L*F*q,p=`Cálculo biométrico baseado no peso corporal (${i}kg), frequência de treinos (${s}x/semana) e objetivo de ${t}.`}const c=e.dosage?.upperLimit||r*2;let g=!0;r>=c&&(r=c,g=!1);const n=e.dosage?.unit||"g";r=(n==="g"?1:0)===1?Math.round(r*10)/10:Math.round(r);const b=r*7,h=r*30,x=this._getDosageFrequency(e,t),y=e.dosage?.timing||"A qualquer hora",$=e.id==="vitamina-d3"||e.id==="omega-3",w=e.id==="creatina-monohidratada"?"Beba com pelo menos 300ml de água e mantenha alta ingestão hídrica diária (3L+)":"Beba com um copo de água (200ml)",_=e.id==="creatina-monohidratada"?"A creatina funciona por saturação acumulativa, consuma todos os dias inclusive nos dias de descanso.":null;let f=null;e.dosage?.loading&&(f={dose:e.dosage.loading,unit:n,duration:"5-7 dias",frequency:"Fracionado 4x ao dia",description:`Protocolo opcional de saturação inicial: tome ${e.dosage.loading}${n} por dia durante 5-7 dias para saturar os estoques musculares rapidamente, depois retorne à dose de manutenção de ${r}${n}.`});const k=this._buildRationale(e,r,n,i,t,l),S=this._generateWarnings(e,r,c,o);return{daily:r,unit:n,weekly:b,monthly:h,frequency:x,timing:y,withFood:$,withWater:w,note:_,loadingProtocol:f,withinSafetyLimits:g,upperLimit:c,rationale:k,warnings:S,methodology:p}}calculateStack(e,a){return Array.isArray(e)?e.map(i=>({supplementId:i.id,supplementName:i.name,dosage:this.calculate(i,a)})):[]}calculateStackCost(e,a){if(!Array.isArray(e))return 0;let i=0;return e.forEach(s=>{const t=this.calculate(s,a),o=s.pricePerGram||.05;let r=t.daily;t.unit==="mg"?r=t.daily/1e3:t.unit==="UI"&&(r=t.daily*25e-6),i+=r*30*o}),Math.round(i*100)/100}_getActivityLevel(e){return e>=5?"high":e>=3?"moderate":"low"}_getAgeMultiplier(e){return e>=60?.9:1}_getDosageFrequency(e,a){return e.id==="cafeina"?"Somente nos dias de treino (pré-treino)":"Diariamente"}_buildRationale(e,a,i,s,t,o){return o?`Dose fixa padrão de ${a}${i} recomendada clinicamente, sem necessidade de alteração baseada no peso corporal.`:`Dose diária sugerida de ${a}${i} calculada com base no seu peso corporal (${s}kg) e no objetivo de ${t}.`}_generateWarnings(e,a,i,s){const t=[];return s<18&&t.push({type:"warning",message:"Atenção: Suplemento recomendado para maiores de 18 anos. Consulte um médico ou nutricionista."}),a>=i*.9&&t.push({type:"caution",message:"Cuidado: Sua dosagem está muito próxima ao limite máximo de segurança estabelecido."}),t}}const R=new C;class O{constructor(e){this.container=e,this._profile=this._loadProfile(),this._results=[],this._debounce=null}mount(){this._attachStyles(),this._render(),this._attachListeners(),this._calculate()}unmount(){clearTimeout(this._debounce)}_loadProfile(){const e=d.user??{};return{objective:e.objective??"general",weight:e.weight??75,height:e.height??175,age:e.age??28,trainingAge:e.trainingAge??2,trainingFrequency:e.trainingFrequency??4,budget:e.budget??250,restrictions:e.restrictions?[...e.restrictions]:[]}}_render(){const e=this._profile;this.container.innerHTML=`
      <div class="calc-page">

        <div class="page-header">
          <h1 class="page-title">⚗️ Calculadora</h1>
          <p class="page-subtitle">Dosagem personalizada por biometria científica</p>
        </div>

        <section class="calc-card profile-form" aria-label="Perfil biométrico">
          <h2 class="section-title">Seu Perfil</h2>

          <!-- Objetivo -->
          <div class="form-group">
            <label class="form-label">🎯 Objetivo Principal</label>
            <div class="objective-pills" role="radiogroup" aria-label="Objetivo">
              ${[{value:"bulk",label:"📈 Bulk",desc:"Ganho de massa"},{value:"cut",label:"🔥 Cut",desc:"Perda de gordura"},{value:"strength",label:"💪 Força",desc:"Força máxima"},{value:"endurance",label:"🏃 Resistência",desc:"Cardio/endurance"},{value:"general",label:"🌿 Saúde",desc:"Bem-estar geral"}].map(a=>`
                <button class="objective-pill${e.objective===a.value?" active":""}"
                  data-value="${a.value}" data-field="objective"
                  role="radio" aria-checked="${e.objective===a.value}" title="${a.desc}"
                >${a.label}</button>`).join("")}
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
                ${[2,3,4,5,6,7].map(a=>`
                  <button class="freq-pill${e.trainingFrequency===a?" active":""}"
                    data-value="${a}" data-field="trainingFrequency"
                    role="radio" aria-checked="${e.trainingFrequency===a}"
                    aria-label="${a} dias por semana"
                  >${a}×</button>`).join("")}
              </div>
            </div>
            ${this._sliderGroup("budget","💵 Orçamento mensal",50,1e3,10,e.budget,"R$",!0)}
          </div>

          <!-- Restrições -->
          <div class="form-group">
            <label class="form-label">🚫 Restrições / Alergias</label>
            <div class="restriction-pills" role="group" aria-label="Restrições">
              ${[{value:"gluten",label:"🌾 Glúten"},{value:"lactose",label:"🥛 Lactose"},{value:"shellfish",label:"🦐 Crustáceos"},{value:"soy",label:"🫘 Soja"},{value:"vegetarian",label:"🥦 Vegetariano"},{value:"vegan",label:"🌱 Vegano"}].map(a=>`
                <button class="restriction-pill${e.restrictions.includes(a.value)?" active-danger":""}"
                  data-value="${a.value}" data-action="toggle-restriction"
                  aria-pressed="${e.restrictions.includes(a.value)}"
                >${a.label}</button>`).join("")}
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

        <section class="calc-card budget-section" id="budget-section" style="display:none">
          <h2 class="section-title">💵 Resumo de Custo</h2>
          <div class="budget-grid" id="budget-grid"></div>
          <div class="budget-total" id="budget-total"></div>
        </section>

        <p class="disclaimer">
          ⚠️ As recomendações são baseadas em evidências científicas e perfil informado.
          Consulte um médico ou nutricionista antes de iniciar qualquer protocolo.
        </p>
      </div>
    `}_sliderGroup(e,a,i,s,t,o,r,l=!1){const p=l?`<span class="unit-label">${r}</span>`:"",c=l?"":`<span class="unit-label">${r}</span>`;return`
      <div class="form-group">
        <label class="form-label">${a}</label>
        <div class="input-with-unit">
          <input type="range" id="${e}-slider" class="range-slider"
            min="${i}" max="${s}" step="${t}" value="${o}"
            data-field="${e}" aria-label="${a}">
          <div class="range-value-row">
            ${p}
            <input type="number" id="${e}" class="number-input"
              min="${i}" max="${s}" step="${t}" value="${o}"
              data-field="${e}" aria-label="${a}">
            ${c}
          </div>
        </div>
      </div>`}_calculate(){const e=this.container.querySelector("#results-loading"),a=this.container.querySelector("#results-grid");e&&(e.style.display="flex"),a&&(a.innerHTML=""),clearTimeout(this._debounce),this._debounce=setTimeout(()=>{try{const i=I.recommend(this._profile,8);this._results=i.map(s=>{let t=s.dosage??{};try{const o=j.find(r=>r.id===s.id);if(o){const r=R.calculate(o,this._profile);r&&(t={...t,daily:r.daily,scientificRationale:r.rationale??t.scientificRationale})}}catch(o){console.warn("[DosageCalculatorPage] Dosage calculation error for",s.id,o)}return{...s,dosage:t}})}catch(i){console.warn("[DosageCalculatorPage] _calculate error",i),this._results=[]}this._renderResults(),this._renderBudget(),e&&(e.style.display="none")},180)}_renderResults(){const e=this.container.querySelector("#results-grid");if(!e)return;if(!this._results.length){e.innerHTML=`
        <div class="empty-state">
          <p style="font-size:32px">🤷</p>
          <p>Nenhum suplemento encontrado. Ajuste as restrições ou objetivo.</p>
        </div>`;return}const a=document.createDocumentFragment(),i=d.getState?.()?.favorites??d.favorites??[],s=d.stack??[];this._results.forEach((t,o)=>{const r=document.createElement("div");r.className="result-card",r.dataset.id=t.id,r.role="article",r.style.animationDelay=`${o*60}ms`;const l=Math.round((t.score??0)*100),p=l>=80?"var(--color-success)":l>=60?"var(--color-brand)":"#FFB74D",c=i.some(n=>n===t.id||n.supplementId===t.id),g=s.some(n=>n.supplementId===t.id);r.innerHTML=`
        <div class="result-rank" aria-label="Posição ${o+1}">#${o+1}</div>
        <div class="result-header">
          <div class="result-meta">
            <p class="result-category">${t.category??""}</p>
            <h3 class="result-name">${t.name}</h3>
          </div>
          <evidence-pill level="${t.evidenceLevel??t.evidence??"D"}"></evidence-pill>
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
            <span class="dosage-value">${t.dosage?.daily??t.dosage?.maintenance??"—"}</span>
            <span class="dosage-unit">${t.dosage?.unit??"g"}/dia</span>
          </div>
          <p class="dosage-rationale">${t.dosage?.scientificRationale??""}</p>
        </div>
        ${t.benefits?.length?`
          <div class="benefits-row" aria-label="Benefícios">
            ${t.benefits.slice(0,3).map(n=>`
              <span class="benefit-chip">
                <span class="benefit-label">${typeof n=="string"?n:n.label}</span>
                ${n.likelihood?`<span class="benefit-pct">${n.likelihood}</span>`:""}
              </span>`).join("")}
          </div>`:""}
        <div class="result-cost">
          <span class="cost-label">Custo estimado</span>
          <span class="cost-value">R$ ${(t.cost?.perMonth??0).toFixed(2)}/mês</span>
        </div>
        ${t.warnings?.length>1?`
          <div class="warnings-section">
            ${t.warnings.slice(1).map(n=>`<p class="warning-item">⚠️ ${n}</p>`).join("")}
          </div>`:""}
        ${t.interactions?.length?`
          <div class="interactions-section">
            ${t.interactions.map(n=>`
              <p class="interaction-item interaction-${n.severity??"info"}">⚡ ${n.message??n}</p>`).join("")}
          </div>`:""}
        <div class="result-actions">
          <button class="btn-action${c?" active-fav":""}" data-action="toggle-fav"
            data-id="${t.id}" data-name="${t.name}"
            aria-label="${c?"Remover favorito":"Adicionar favorito"}" aria-pressed="${c}">
            ${c?"♥ Favorito":"♡ Favoritar"}
          </button>
          <button class="btn-action btn-action-primary${g?" active-stack":""}" data-action="toggle-stack"
            data-id="${t.id}" data-name="${t.name}"
            aria-label="${g?"Remover do stack":"Adicionar ao stack"}" aria-pressed="${g}">
            ${g?"✓ No stack":"+ Stack"}
          </button>
        </div>
      `,a.appendChild(r)}),e.appendChild(a)}_renderBudget(){const e=this.container.querySelector("#budget-section"),a=this.container.querySelector("#budget-grid"),i=this.container.querySelector("#budget-total");if(!e||!a||!i||!this._results.length)return;e.style.display="block";const s=this._results.reduce((o,r)=>o+(r.cost?.perMonth??0),0),t=this._profile.budget-s;a.innerHTML=this._results.map(o=>`
      <div class="budget-item">
        <span class="budget-item-name">${o.name}</span>
        <span class="budget-item-cost">R$ ${(o.cost?.perMonth??0).toFixed(2)}</span>
      </div>`).join(""),i.innerHTML=`
      <div class="budget-total-row">
        <span>Total do stack</span>
        <span class="budget-total-value" style="color:${s>this._profile.budget?"var(--color-error)":"var(--color-success)"}">
          R$ ${s.toFixed(2)}
        </span>
      </div>
      <div class="budget-total-row" style="font-size:13px;color:var(--color-text-muted)">
        <span>Orçamento</span><span>R$ ${this._profile.budget.toFixed(2)}</span>
      </div>
      <div class="budget-total-row" style="font-size:13px">
        <span>${t>=0?"Saldo restante":"Excede orçamento em"}</span>
        <span style="color:${t>=0?"var(--color-success)":"var(--color-error)"}">
          ${t>=0?"+":""}R$ ${Math.abs(t).toFixed(2)}
        </span>
      </div>`}_attachListeners(){this.container.querySelectorAll(".objective-pill").forEach(e=>{e.addEventListener("click",()=>{this.container.querySelectorAll(".objective-pill").forEach(a=>{a.classList.remove("active"),a.setAttribute("aria-checked","false")}),e.classList.add("active"),e.setAttribute("aria-checked","true"),this._profile.objective=e.dataset.value,this._calculate()})}),this.container.querySelectorAll(".freq-pill").forEach(e=>{e.addEventListener("click",()=>{this.container.querySelectorAll(".freq-pill").forEach(a=>{a.classList.remove("active"),a.setAttribute("aria-checked","false")}),e.classList.add("active"),e.setAttribute("aria-checked","true"),this._profile.trainingFrequency=parseInt(e.dataset.value),this._calculate()})}),this.container.querySelectorAll('[data-action="toggle-restriction"]').forEach(e=>{e.addEventListener("click",()=>{const a=e.dataset.value,i=this._profile.restrictions.indexOf(a);i===-1?(this._profile.restrictions.push(a),e.classList.add("active-danger"),e.setAttribute("aria-pressed","true")):(this._profile.restrictions.splice(i,1),e.classList.remove("active-danger"),e.setAttribute("aria-pressed","false")),this._calculate()})}),["weight","height","age","trainingAge","budget"].forEach(e=>{const a=this.container.querySelector(`#${e}-slider`),i=this.container.querySelector(`#${e}`);if(!a||!i)return;const s=t=>{const o=parseFloat(t);isNaN(o)||(this._profile[e]=o,a.value=o,i.value=o,this._calculate())};a.addEventListener("input",t=>s(t.target.value)),i.addEventListener("change",t=>{const o=Math.min(Math.max(parseFloat(t.target.value),parseFloat(i.min)),parseFloat(i.max));s(o)})}),this.container.querySelector('[data-action="save-profile"]')?.addEventListener("click",()=>{d.dispatch(v.SET_USER_PROFILE??"SET_USER_PROFILE",{...this._profile}),window.SupliToast&&window.SupliToast.show("✓ Perfil salvo!","success")}),this.container.addEventListener("click",e=>{const a=e.target.closest('[data-action="toggle-fav"],[data-action="toggle-stack"]');if(!a)return;const{action:i}=a.dataset,s=a.dataset.id,t=a.dataset.name;if(i==="toggle-fav"){const o=d.getState?.()?.favorites?.some(r=>r===s||r.supplementId===s)??!1;d.dispatch(o?v.REMOVE_FAVORITE:v.ADD_FAVORITE,{supplementId:s}),a.textContent=o?"♡ Favoritar":"♥ Favorito",a.classList.toggle("active-fav",!o),a.setAttribute("aria-pressed",String(!o)),window.SupliToast&&window.SupliToast.show(o?`${t} removido dos favoritos`:`♥ ${t} favoritado!`,o?"info":"success")}if(i==="toggle-stack"){const o=d.stack?.some(r=>r.supplementId===s)??!1;if(o)d.dispatch(v.REMOVE_FROM_STACK,{supplementId:s});else{const r=this._results.find(c=>c.id===s),l=r?.dosage?.daily??r?.dosage?.maintenance??0,p=r?.dosage?.unit??"g";d.dispatch(v.ADD_TO_STACK,{supplementId:s,name:t,dosage:l,unit:p,frequency:"diário"})}a.textContent=o?"+ Stack":"✓ No stack",a.classList.toggle("active-stack",!o),a.setAttribute("aria-pressed",String(!o)),window.SupliToast&&window.SupliToast.show(o?`${t} removido do stack`:`✓ ${t} adicionado!`,o?"info":"success")}})}_attachStyles(){if(document.getElementById("calc-page-styles"))return;const e=document.createElement("style");e.id="calc-page-styles",e.textContent=`
      .calc-page { display:flex; flex-direction:column; gap:24px; padding:20px 16px 100px; max-width:900px; margin:0 auto; }
      .calc-card { background:var(--color-surface-primary); border:1px solid var(--color-border); border-radius:16px; padding:20px; }
      .page-header { margin-bottom:4px; }
      .page-title { font-size:24px; font-weight:800; color:var(--color-text-primary); margin:0 0 4px; }
      .page-subtitle { font-size:14px; color:var(--color-text-muted); margin:0; }
      .section-title { font-size:16px; font-weight:700; color:var(--color-text-primary); margin:0 0 16px; }
      .form-row { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
      .form-group { display:flex; flex-direction:column; gap:8px; margin-bottom:16px; }
      .form-label { font-size:13px; font-weight:600; color:var(--color-text-muted); text-transform:uppercase; letter-spacing:.5px; }
      .input-with-unit { display:flex; flex-direction:column; gap:6px; }
      .range-slider { -webkit-appearance:none; width:100%; height:4px; background:var(--color-border); border-radius:999px; outline:none; cursor:pointer; }
      .range-slider::-webkit-slider-thumb { -webkit-appearance:none; width:18px; height:18px; border-radius:50%; background:var(--color-brand); cursor:pointer; border:2px solid var(--color-text-primary); box-shadow:0 0 8px rgba(124,58,237,.5); transition:transform 150ms; }
      .range-slider::-webkit-slider-thumb:hover { transform:scale(1.2); }
      .range-value-row { display:flex; align-items:center; gap:6px; }
      .number-input { width:72px; padding:6px 10px; background:var(--color-bg-primary); border:1px solid var(--color-border); border-radius:8px; color:var(--color-text-primary); font-size:15px; font-family:'JetBrains Mono',monospace; font-weight:700; text-align:center; outline:none; }
      .number-input:focus { border-color:var(--color-brand); }
      .unit-label { font-size:13px; color:var(--color-text-muted); white-space:nowrap; }
      .objective-pills, .frequency-pills, .restriction-pills { display:flex; flex-wrap:wrap; gap:8px; }
      .objective-pill, .freq-pill, .restriction-pill { padding:8px 14px; background:var(--color-bg-primary); border:1px solid var(--color-border); border-radius:999px; color:var(--color-text-muted); font-size:13px; font-weight:600; cursor:pointer; transition:all 150ms; font-family:inherit; }
      .objective-pill:hover, .freq-pill:hover { border-color:var(--color-brand); color:var(--color-text-primary); }
      .objective-pill.active, .freq-pill.active { background:var(--color-brand-muted); border-color:var(--color-brand); color:var(--color-brand); }
      .freq-pill { padding:8px 12px; min-width:44px; text-align:center; }
      .restriction-pill.active-danger { background:rgba(239,83,80,.07); border-color:var(--color-error); color:var(--color-error); }
      .btn-save-profile { width:100%; padding:13px; margin-top:8px; background:var(--color-brand); color:#fff; border:none; border-radius:12px; font-size:15px; font-weight:700; cursor:pointer; transition:opacity 150ms,transform 150ms; font-family:inherit; }
      .btn-save-profile:hover { opacity:.9; }
      .btn-save-profile:active { transform:scale(.98); }
      .calc-divider { display:flex; align-items:center; gap:12px; color:var(--color-text-muted); font-size:12px; text-transform:uppercase; letter-spacing:1px; font-weight:700; }
      .calc-divider::before, .calc-divider::after { content:''; flex:1; height:1px; background:var(--color-border); }
      .results-loading { display:flex; flex-direction:column; align-items:center; gap:12px; padding:48px 20px; color:var(--color-text-muted); }
      .spinner { width:32px; height:32px; border:3px solid var(--color-border); border-top-color:var(--color-brand); border-radius:50%; animation:calc-spin .8s linear infinite; }
      @keyframes calc-spin { to { transform:rotate(360deg); } }
      .results-grid { display:grid; grid-template-columns:1fr; gap:16px; }
      .result-card { background:var(--color-surface-primary); border:1px solid var(--color-border); border-radius:16px; padding:20px; position:relative; animation:calcCardIn 400ms ease both; transition:border-color 150ms,box-shadow 150ms; }
      .result-card:hover { border-color:rgba(124,58,237,.27); box-shadow:0 0 20px rgba(124,58,237,.1); }
      @keyframes calcCardIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      .result-rank { position:absolute; top:-10px; left:16px; background:var(--color-brand); color:#fff; font-size:11px; font-weight:800; font-family:'JetBrains Mono',monospace; padding:2px 8px; border-radius:999px; }
      .result-header { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:14px; }
      .result-category { font-size:11px; color:var(--color-text-muted); text-transform:uppercase; letter-spacing:.5px; margin:0 0 3px; }
      .result-name { font-size:17px; font-weight:700; color:var(--color-text-primary); margin:0; line-height:1.2; }
      .score-section { margin-bottom:14px; }
      .score-label { display:flex; justify-content:space-between; font-size:12px; color:var(--color-text-muted); margin-bottom:6px; }
      .score-bar { height:5px; background:var(--color-border); border-radius:999px; overflow:hidden; }
      .score-fill { height:100%; border-radius:999px; transition:width 500ms ease; }
      .dosage-block { display:flex; flex-direction:column; gap:4px; padding:12px; background:var(--color-bg-primary); border-radius:10px; margin-bottom:12px; }
      .dosage-main { display:flex; align-items:baseline; gap:4px; }
      .dosage-value { font-size:28px; font-weight:900; font-family:'JetBrains Mono',monospace; color:var(--color-brand); }
      .dosage-unit { font-size:14px; color:var(--color-text-muted); font-family:'JetBrains Mono',monospace; }
      .dosage-rationale { font-size:12px; color:var(--color-text-secondary); margin:0; line-height:1.4; }
      .benefits-row { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px; }
      .benefit-chip { display:inline-flex; align-items:center; gap:4px; padding:4px 10px; background:var(--color-bg-primary); border:1px solid var(--color-border); border-radius:999px; font-size:12px; }
      .benefit-label { color:var(--color-text-primary); }
      .benefit-pct { color:var(--color-success); font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:700; }
      .result-cost { display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:var(--color-bg-primary); border-radius:8px; margin-bottom:12px; }
      .cost-label { font-size:12px; color:var(--color-text-muted); }
      .cost-value { font-size:14px; font-weight:700; color:#FFB74D; font-family:'JetBrains Mono',monospace; }
      .warnings-section, .interactions-section { margin-bottom:10px; }
      .warning-item, .interaction-item { font-size:12px; color:#FFB74D; margin:4px 0; line-height:1.4; }
      .result-actions { display:flex; gap:8px; margin-top:4px; }
      .btn-action { flex:1; padding:9px 14px; background:var(--color-bg-primary); border:1px solid var(--color-border); border-radius:999px; color:var(--color-text-muted); font-size:13px; font-weight:600; cursor:pointer; transition:all 150ms; font-family:inherit; }
      .btn-action:hover { border-color:var(--color-brand); color:var(--color-text-primary); }
      .btn-action-primary { background:var(--color-brand-muted); border-color:rgba(124,58,237,.27); color:var(--color-brand); }
      .btn-action-primary:hover { background:var(--color-brand); color:#fff; }
      .active-fav { background:rgba(239,83,80,.07); border-color:rgba(239,83,80,.27); color:var(--color-error); }
      .active-stack { background:rgba(0,230,118,.07); border-color:rgba(0,230,118,.27); color:var(--color-success); }
      .budget-section .budget-grid { display:flex; flex-direction:column; gap:6px; margin-bottom:12px; }
      .budget-item { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--color-bg-primary); font-size:14px; }
      .budget-item-name { color:var(--color-text-primary); }
      .budget-item-cost { color:var(--color-text-muted); font-family:'JetBrains Mono',monospace; }
      .budget-total { display:flex; flex-direction:column; gap:6px; padding-top:10px; border-top:1px solid var(--color-border); }
      .budget-total-row { display:flex; justify-content:space-between; font-size:15px; font-weight:600; color:var(--color-text-primary); }
      .budget-total-value { font-family:'JetBrains Mono',monospace; font-size:18px; font-weight:800; }
      .disclaimer { font-size:12px; color:var(--color-text-secondary); line-height:1.6; padding:12px; border:1px solid var(--color-border); border-radius:10px; background:var(--color-surface-primary); margin:0; }
      .empty-state { text-align:center; padding:48px 20px; color:var(--color-text-muted); display:flex; flex-direction:column; align-items:center; gap:12px; grid-column:1/-1; }
      @media (max-width:560px) { .form-row { grid-template-columns:1fr; gap:0; } .calc-page { padding:16px 12px 100px; } }
      @media (min-width:640px) { .results-grid { grid-template-columns:repeat(2,1fr); } }
      @media (min-width:1024px) { .results-grid { grid-template-columns:repeat(4,1fr); } .calc-page { padding:32px 24px 80px; } }
    `,document.head.appendChild(e)}}export{O as default};
