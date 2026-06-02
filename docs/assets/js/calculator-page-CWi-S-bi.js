var M=Object.defineProperty;var q=(n,e,a)=>e in n?M(n,e,{enumerable:!0,configurable:!0,writable:!0,value:a}):n[e]=a;var g=(n,e,a)=>q(n,typeof e!="symbol"?e+"":e,a);import{s as p,A as f,e as x}from"./main-CJX8mWV_.js";import{S as P}from"./stack-recommender-U9Cbt9HQ.js";import{e as l}from"./escape-Br5wU8qn.js";import{E as D}from"./evidence-D5RtUc7g.js";class j{constructor(){g(this,"FIXED_DOSE_SUPPLEMENTS",new Set(["vitamina-d3","omega-3","magnesio-bisglicinato","vitamina-c","ashwagandha"]));g(this,"WEIGHT_BASED_SUPPLEMENTS",new Map([["creatina-monohidratada",.07],["whey-protein",.4],["beta-alanina",.05],["l-carnitina",.02],["cafeina-teanina",3]]));g(this,"ACTIVITY_MULTIPLIERS",{low:.85,moderate:1,high:1.15});g(this,"OBJECTIVE_MULTIPLIERS",{bulk:1.2,strength:1.2,cut:.9,endurance:1,general:1});g(this,"TIMING_SCHEDULES",{preWorkout:"30-45 minutos antes do treino",postWorkout:"Pós-treino ou a qualquer hora com carboidratos",morning:"Pela manhã com refeição",night:"30-60 minutos antes de dormir"})}calculate(e,a){if(!e||!a)throw new Error("[DosageCalculator] Supplement and UserProfile are mandatory inputs");const t=a.weight||70,r=a.trainingFrequency||3,i=a.objective||"general",c=a.age||25;let o=e.dosage?.maintenance||0,s=e.dosage?.isFixed||this.FIXED_DOSE_SUPPLEMENTS.has(e.id),u="Dosagem clínica fixa recomendada.";if(!s){const I=this.WEIGHT_BASED_SUPPLEMENTS.get(e.id)||e.dosage?.multiplier||.05,R=this._getActivityLevel(r),T=this.ACTIVITY_MULTIPLIERS[R]||1,A=this.OBJECTIVE_MULTIPLIERS[i]||1,z=this._getAgeMultiplier(c);o=t*I*T*A*z,u=`Cálculo biométrico baseado no peso corporal (${t}kg), frequência de treinos (${r}x/semana) e objetivo de ${i}.`}const d=e.dosage?.upperLimit||o*2;let m=!0;o>=d&&(o=d,m=!1);const h=e.dosage?.unit||"g";o=(h==="g"?1:0)===1?Math.round(o*10)/10:Math.round(o);const y=o*7,_=o*30,w=this._getDosageFrequency(e,i),S=e.dosage?.timing||"A qualquer hora",L=e.id==="vitamina-d3"||e.id==="omega-3",E=e.id==="creatina-monohidratada"?"Beba com pelo menos 300ml de água e mantenha alta ingestão hídrica diária (3L+)":"Beba com um copo de água (200ml)",$=e.id==="creatina-monohidratada"?"A creatina funciona por saturação acumulativa, consuma todos os dias inclusive nos dias de descanso.":null;let b=null;e.dosage?.loading&&(b={dose:e.dosage.loading,unit:h,duration:"5-7 dias",frequency:"Fracionado 4x ao dia",description:`Protocolo opcional de saturação inicial: tome ${e.dosage.loading}${h} por dia durante 5-7 dias para saturar os estoques musculares rapidamente, depois retorne à dose de manutenção de ${o}${h}.`});const C=this._buildRationale(e,o,h,t,i,s),k=this._generateWarnings(e,o,d,c);return{daily:o,unit:h,weekly:y,monthly:_,frequency:w,timing:S,withFood:L,withWater:E,note:$,loadingProtocol:b,withinSafetyLimits:m,upperLimit:d,rationale:C,warnings:k,methodology:u}}calculateStack(e,a){return Array.isArray(e)?e.map(t=>({supplementId:t.id,supplementName:t.name,dosage:this.calculate(t,a)})):[]}calculateStackCost(e,a){if(!Array.isArray(e))return 0;let t=0;return e.forEach(r=>{const i=this.calculate(r,a),c=r.pricePerGram||.05;let o=i.daily;i.unit==="mg"?o=i.daily/1e3:i.unit==="mcg"?o=i.daily/1e6:i.unit==="UI"&&(o=i.daily*25e-6),t+=o*30*c}),Math.round(t*100)/100}_getActivityLevel(e){return e>=5?"high":e>=3?"moderate":"low"}_getAgeMultiplier(e){return e>=60?.9:1}_getDosageFrequency(e,a){return e.id==="cafeina-teanina"?"Somente nos dias de treino (pré-treino)":"Diariamente"}_buildRationale(e,a,t,r,i,c){return c?`Dose fixa padrão de ${a}${t} recomendada clinicamente, sem necessidade de alteração baseada no peso corporal.`:`Dose diária sugerida de ${a}${t} calculada com base no seu peso corporal (${r}kg) e no objetivo de ${i}.`}_generateWarnings(e,a,t,r){const i=[];return r<18&&i.push({type:"warning",message:"Atenção: Suplemento recomendado para maiores de 18 anos. Consulte um médico ou nutricionista."}),a>=t*.9&&i.push({type:"caution",message:"Cuidado: Sua dosagem está muito próxima ao limite máximo de segurança estabelecido."}),i}}const B=new j,N=[{value:"sedentary",label:"Sedentário"},{value:"moderate",label:"Moderado"},{value:"active",label:"Ativo"},{value:"athlete",label:"Atleta"}],F=[{value:"bulk",label:"Bulk"},{value:"cut",label:"Cut"},{value:"strength",label:"Força"},{value:"endurance",label:"Resistência"},{value:"general",label:"Saúde Geral"}],v=D;class J{constructor(e){this.container=e,this._weight=p.user?.weight??75,this._bodyfat=p.user?.bodyfat??null,this._activityLevel="moderate",this._objective=p.user?.objective??"general",this._searchQuery="",this._selectedSupp=null,this._phase="maintenance",this._calcResult=null,this._debounce=null,this._allSupps=P??[]}mount(){this._attachStyles(),this._render(),this._attachListeners()}unmount(){clearTimeout(this._debounce)}_render(){this.container.innerHTML=`
      <div class="calcp-root">
        <div class="calcp-header">
          <h1 class="calcp-title">Calculadora</h1>
          <p class="calcp-subtitle">Dosagem personalizada por biometria científica</p>
        </div>

        <div class="calcp-split">

          <!-- LEFT COLUMN -->
          <div class="calcp-left">

            <!-- Biometrics -->
            <div class="calcp-card" id="card-biometrics">
              <h2 class="calcp-card-title">⚗️ Dados Biométricos</h2>

              <div class="calcp-field">
                <label class="calcp-label" for="inp-weight">Peso (kg)</label>
                <input id="inp-weight" class="calcp-input" type="number"
                  min="40" max="200" step="1" value="${this._weight}"
                  aria-label="Peso em quilogramas">
              </div>

              <div class="calcp-field">
                <label class="calcp-label" for="inp-bodyfat">Gordura Corporal (%) <span class="calcp-optional">opcional</span></label>
                <input id="inp-bodyfat" class="calcp-input" type="number"
                  min="5" max="50" step="0.5" value="${this._bodyfat??""}"
                  placeholder="ex: 18" aria-label="Percentual de gordura corporal">
              </div>

              <div class="calcp-field">
                <label class="calcp-label" for="sel-activity">Nível de Atividade</label>
                <select id="sel-activity" class="calcp-select" aria-label="Nível de atividade">
                  ${N.map(e=>`
                    <option value="${e.value}"${this._activityLevel===e.value?" selected":""}>${e.label}</option>
                  `).join("")}
                </select>
              </div>

              <div class="calcp-field">
                <label class="calcp-label" for="sel-objective">Objetivo</label>
                <select id="sel-objective" class="calcp-select" aria-label="Objetivo principal">
                  ${F.map(e=>`
                    <option value="${e.value}"${this._objective===e.value?" selected":""}>${e.label}</option>
                  `).join("")}
                </select>
              </div>
            </div>

            <!-- Compound selection -->
            <div class="calcp-card" id="card-compounds">
              <h2 class="calcp-card-title">🔬 Seleção de Composto</h2>

              <div class="calcp-search-wrap">
                <span class="calcp-search-icon" aria-hidden="true">🔍</span>
                <input id="inp-search" class="calcp-search" type="search"
                  placeholder="Buscar suplemento..."
                  value="${this._searchQuery}"
                  aria-label="Buscar suplemento">
              </div>

              <div class="calcp-chips" id="supp-list" role="listbox" aria-label="Lista de suplementos">
                ${this._renderChips()}
              </div>
            </div>

          </div>

          <!-- RIGHT COLUMN -->
          <div class="calcp-right">
            <div class="calcp-card calcp-result-card" id="result-card">
              ${this._renderResult()}
            </div>
          </div>

        </div>

        <p class="calcp-disclaimer">
          ⚠️ As recomendações são baseadas em evidências científicas e no perfil informado.
          Consulte um médico ou nutricionista antes de iniciar qualquer protocolo.
        </p>
      </div>
    `}_renderChips(){const e=this._searchQuery.toLowerCase().trim(),a=e?this._allSupps.filter(t=>t.name.toLowerCase().includes(e)||(t.category??"").toLowerCase().includes(e)):this._allSupps;return a.length?a.map(t=>{const r=this._selectedSupp?.id===t.id,i=t.evidenceLevel??"D",c=v[i]??v.C;return`
        <button class="calcp-chip${r?" calcp-chip--active":""}"
          role="option" aria-selected="${r}"
          data-supp-id="${l(t.id)}" title="${l(t.name)}">
          <span class="calcp-chip-name">${l(t.name)}</span>
          <span class="calcp-chip-cat">${l(t.category??"")}</span>
          <span class="calcp-ev-badge" style="background:${c.bg};color:${c.color}">${i}</span>
        </button>`}).join(""):'<p class="calcp-empty-chips">Nenhum suplemento encontrado.</p>'}_renderResult(){if(!this._selectedSupp)return`
        <div class="calcp-placeholder">
          <div class="calcp-placeholder-icon">⚗️</div>
          <p class="calcp-placeholder-title">Selecione um composto</p>
          <p class="calcp-placeholder-sub">Escolha um suplemento na lista ao lado para ver o resultado de dosagem personalizado.</p>
        </div>`;const e=this._selectedSupp,a=this._calcResult,t=e.evidenceLevel??"D",r=v[t]??v.C;let i="—",c=e.dosage?.unit??"g";a?i=this._phase==="loading"?a.loading??a.daily??"—":a.daily??a.maintenance??"—":e.dosage&&(i=this._phase==="loading"?e.dosage.loading??e.dosage.maintenance??"—":e.dosage.maintenance??"—");const o=a?.rationale??e.dosage?.timing??"",s=e.safetyScore??0,u=!!(e.dosage?.loading||a?.loading),d=(p.stack??[]).some(m=>m.supplementId===e.id);return`
      <!-- Result header -->
      <div class="calcp-result-header">
        <h2 class="calcp-result-title">Resultado da Otimização</h2>
        ${u?`
          <div class="calcp-phase-toggle" role="group" aria-label="Fase de protocolo">
            <button class="calcp-phase-btn${this._phase==="maintenance"?" calcp-phase-btn--active":""}"
              data-phase="maintenance">Manutenção</button>
            <button class="calcp-phase-btn${this._phase==="loading"?" calcp-phase-btn--active":""}"
              data-phase="loading">Carga</button>
          </div>`:""}
      </div>

      <!-- Big dose number -->
      <div class="calcp-dose-display">
        <span class="calcp-dose-value">${i}</span>
        <span class="calcp-dose-unit">${c}/dia</span>
      </div>

      <!-- Validated label -->
      <div class="calcp-validated">
        <span class="calcp-validated-dot"></span>
        Protocolo Validado por Estudos Clínicos
      </div>

      <!-- Add to protocol button -->
      <button class="calcp-btn-add${d?" calcp-btn-add--in":""}"
        id="btn-add-protocol" data-supp-id="${l(e.id)}" data-supp-name="${l(e.name)}">
        ${d?"✓ No meu Protocolo":"+ Adicionar ao meu Protocolo"}
      </button>

      <hr class="calcp-sep">

      <!-- Scientific context card -->
      <div class="calcp-sci-card">
        <h3 class="calcp-sci-title">Contexto Científico</h3>

        <div class="calcp-sci-section">
          <p class="calcp-sci-label">Racional da Dosagem</p>
          <p class="calcp-sci-text">${l(o||"Dosagem baseada em estudos clínicos controlados.")}</p>
        </div>

        <div class="calcp-sci-section">
          <p class="calcp-sci-label">Nível de Evidência</p>
          <div class="calcp-progress-row">
            <span class="calcp-ev-badge" style="background:${r.bg};color:${r.color}">${t}</span>
            <div class="calcp-progress-bar" role="progressbar"
              aria-valuenow="${t==="A"?100:t==="B"?65:35}" aria-valuemin="0" aria-valuemax="100">
              <div class="calcp-progress-fill" style="width:${t==="A"?100:t==="B"?65:35}%;background:${r.color}"></div>
            </div>
          </div>
        </div>

        <div class="calcp-sci-section">
          <p class="calcp-sci-label">Segurança</p>
          <div class="calcp-progress-row">
            <span class="calcp-sci-pct" style="color:${s>=90?"#22C55E":s>=70?"#F59E0B":"#EF4444"}">${s}/100</span>
            <div class="calcp-progress-bar" role="progressbar"
              aria-valuenow="${s}" aria-valuemin="0" aria-valuemax="100">
              <div class="calcp-progress-fill"
                style="width:${s}%;background:${s>=90?"#22C55E":s>=70?"#F59E0B":"#EF4444"}"></div>
            </div>
          </div>
        </div>

        ${e.dosage?.timing?`
          <div class="calcp-sci-section">
            <p class="calcp-sci-label">Timing Recomendado</p>
            <p class="calcp-timing-text">⏱ ${l(e.dosage.timing)}</p>
          </div>`:""}
      </div>
    `}_calculate(){if(!this._selectedSupp){this._calcResult=null;return}const e={weight:this._weight,bodyfat:this._bodyfat,activityLevel:this._activityLevel,objective:this._objective,trainingFrequency:this._activityLevel==="athlete"?6:this._activityLevel==="active"?5:this._activityLevel==="moderate"?3:2};try{const a=B.calculate(this._selectedSupp,e);this._calcResult=a??null}catch{this._calcResult=null}}_refreshResult(){clearTimeout(this._debounce),this._debounce=setTimeout(()=>{this._calculate();const e=this.container.querySelector("#result-card");e&&(e.innerHTML=this._renderResult()),this._attachResultListeners()},80)}_refreshChips(){const e=this.container.querySelector("#supp-list");e&&(e.innerHTML=this._renderChips())}_attachListeners(){this.container.querySelector("#inp-weight")?.addEventListener("input",e=>{const a=parseFloat(e.target.value);!isNaN(a)&&a>=40&&a<=200&&(this._weight=a,this._refreshResult())}),this.container.querySelector("#inp-bodyfat")?.addEventListener("input",e=>{const a=parseFloat(e.target.value);this._bodyfat=isNaN(a)?null:a,this._refreshResult()}),this.container.querySelector("#sel-activity")?.addEventListener("change",e=>{this._activityLevel=e.target.value,this._refreshResult()}),this.container.querySelector("#sel-objective")?.addEventListener("change",e=>{this._objective=e.target.value,this._refreshResult()}),this.container.querySelector("#inp-search")?.addEventListener("input",e=>{this._searchQuery=e.target.value,this._refreshChips(),this._attachChipListeners()}),this._attachChipListeners(),this._attachResultListeners()}_attachChipListeners(){this.container.querySelectorAll("[data-supp-id]").forEach(e=>{e.classList.contains("calcp-chip")&&e.addEventListener("click",()=>{const a=e.dataset.suppId;this._selectedSupp?.id===a?this._selectedSupp=null:this._selectedSupp=this._allSupps.find(t=>t.id===a)??null,this._refreshChips(),this._attachChipListeners(),this._refreshResult()})})}_attachResultListeners(){this.container.querySelectorAll("[data-phase]").forEach(a=>{a.addEventListener("click",()=>{this._phase=a.dataset.phase;const t=this.container.querySelector("#result-card");t&&(t.innerHTML=this._renderResult()),this._attachResultListeners()})});const e=this.container.querySelector("#btn-add-protocol");e&&e.addEventListener("click",()=>{const a=e.dataset.suppId,t=e.dataset.suppName;if((p.stack??[]).some(c=>c.supplementId===a))p.dispatch(f.REMOVE_FROM_STACK,{supplementId:a}),x.emit("toast:show",{message:`${t} removido do protocolo`,type:"info"});else{const c=this._selectedSupp,o=this._calcResult,s=this._phase==="loading"?o?.loading??o?.daily??c?.dosage?.loading??c?.dosage?.maintenance??0:o?.daily??c?.dosage?.maintenance??0,u=c?.dosage?.unit??"g";p.dispatch(f.ADD_TO_STACK,{supplementId:a,name:t,dosage:s,unit:u,frequency:"diário"}),x.emit("toast:show",{message:`✓ ${t} adicionado ao protocolo!`,type:"success"})}const i=this.container.querySelector("#result-card");i&&(i.innerHTML=this._renderResult()),this._attachResultListeners()})}_attachStyles(){if(document.getElementById("calcp-styles"))return;const e=document.createElement("style");e.id="calcp-styles",e.textContent=`
      /* Root */
      .calcp-root {
        display: flex;
        flex-direction: column;
        gap: 24px;
        padding: 24px 16px 100px;
        max-width: 1100px;
        margin: 0 auto;
        font-family: 'Inter', sans-serif;
      }

      /* Header */
      .calcp-header { margin-bottom: 4px; }
      .calcp-title {
        font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
        font-weight: 800;
        font-size: 28px;
        color: var(--color-text-primary);
        margin: 0 0 6px;
      }
      .calcp-subtitle {
        font-size: 14px;
        color: var(--color-text-muted);
        margin: 0;
      }

      /* Split layout */
      .calcp-split {
        display: grid;
        grid-template-columns: 1fr;
        gap: 20px;
      }
      @media (min-width: 768px) {
        .calcp-split {
          grid-template-columns: 380px 1fr;
          align-items: start;
        }
      }

      .calcp-left, .calcp-right {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      /* Card */
      .calcp-card {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 16px;
        padding: 20px;
      }
      .calcp-card-title {
        font-size: 15px;
        font-weight: 700;
        color: var(--color-text-primary);
        margin: 0 0 18px;
      }

      /* Form fields */
      .calcp-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 16px;
      }
      .calcp-field:last-child { margin-bottom: 0; }
      .calcp-label {
        font-size: 12px;
        font-weight: 600;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: .5px;
      }
      .calcp-optional {
        font-weight: 400;
        text-transform: none;
        letter-spacing: 0;
        color: var(--color-text-muted);
        opacity: .6;
        font-size: 11px;
      }
      .calcp-input, .calcp-select {
        padding: 10px 14px;
        background: var(--color-bg-primary);
        border: 1px solid var(--color-border);
        border-radius: 10px;
        color: var(--color-text-primary);
        font-size: 14px;
        font-family: 'Inter', sans-serif;
        outline: none;
        transition: border-color 150ms;
        -webkit-appearance: none;
      }
      .calcp-input:focus, .calcp-select:focus {
        border-color: var(--color-brand);
        box-shadow: 0 0 0 3px rgba(124,58,237,.12);
      }
      .calcp-input::placeholder { color: var(--color-text-muted); }
      .calcp-select {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239A9A9A' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 12px center;
        padding-right: 36px;
        cursor: pointer;
      }

      /* Search */
      .calcp-search-wrap {
        position: relative;
        margin-bottom: 12px;
      }
      .calcp-search-icon {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 14px;
        pointer-events: none;
      }
      .calcp-search {
        width: 100%;
        box-sizing: border-box;
        padding: 10px 14px 10px 36px;
        background: var(--color-bg-primary);
        border: 1px solid var(--color-border);
        border-radius: 10px;
        color: var(--color-text-primary);
        font-size: 14px;
        font-family: 'Inter', sans-serif;
        outline: none;
        transition: border-color 150ms;
      }
      .calcp-search:focus { border-color: var(--color-brand); }
      .calcp-search::placeholder { color: var(--color-text-muted); }

      /* Supplement chips */
      .calcp-chips {
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: 320px;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: var(--color-border) transparent;
      }
      .calcp-chip {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        background: var(--color-bg-primary);
        border: 1px solid var(--color-border);
        border-radius: 10px;
        cursor: pointer;
        text-align: left;
        transition: border-color 150ms, background 150ms;
        font-family: 'Inter', sans-serif;
        width: 100%;
      }
      .calcp-chip:hover {
        border-color: var(--color-border-strong);
        background: var(--color-surface-hover);
      }
      .calcp-chip--active {
        border-color: var(--color-brand);
        background: var(--color-brand-muted);
      }
      .calcp-chip-name {
        flex: 1;
        font-size: 13px;
        font-weight: 600;
        color: var(--color-text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .calcp-chip-cat {
        font-size: 11px;
        color: var(--color-text-muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100px;
      }
      .calcp-ev-badge {
        flex-shrink: 0;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 5px;
        text-transform: uppercase;
      }
      .calcp-empty-chips {
        font-size: 13px;
        color: var(--color-text-muted);
        text-align: center;
        padding: 20px 0;
        margin: 0;
      }

      /* Result card */
      .calcp-result-card { position: relative; }

      /* Placeholder */
      .calcp-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        min-height: 320px;
        text-align: center;
        padding: 32px 16px;
      }
      .calcp-placeholder-icon { font-size: 48px; opacity: .3; }
      .calcp-placeholder-title {
        font-size: 17px;
        font-weight: 700;
        color: var(--color-text-secondary);
        margin: 0;
      }
      .calcp-placeholder-sub {
        font-size: 13px;
        color: var(--color-text-muted);
        margin: 0;
        max-width: 260px;
        line-height: 1.5;
      }

      /* Result header */
      .calcp-result-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 28px;
      }
      .calcp-result-title {
        font-size: 15px;
        font-weight: 700;
        color: var(--color-text-primary);
        margin: 0;
      }

      /* Phase toggle */
      .calcp-phase-toggle {
        display: flex;
        gap: 4px;
        background: var(--color-bg-primary);
        border: 1px solid var(--color-border);
        border-radius: 8px;
        padding: 3px;
      }
      .calcp-phase-btn {
        padding: 5px 12px;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: var(--color-text-muted);
        font-size: 12px;
        font-weight: 600;
        font-family: 'Inter', sans-serif;
        cursor: pointer;
        transition: background 150ms, color 150ms;
      }
      .calcp-phase-btn--active {
        background: var(--color-brand);
        color: #fff;
      }

      /* Big dose display */
      .calcp-dose-display {
        display: flex;
        align-items: baseline;
        justify-content: center;
        gap: 8px;
        margin-bottom: 14px;
      }
      .calcp-dose-value {
        font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
        font-weight: 800;
        font-size: 64px;
        line-height: 1;
        color: var(--color-brand);
        letter-spacing: -2px;
      }
      .calcp-dose-unit {
        font-size: 20px;
        font-weight: 600;
        color: var(--color-text-muted);
        font-family: 'Inter', sans-serif;
      }

      /* Validated label */
      .calcp-validated {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        font-size: 12px;
        font-weight: 600;
        color: var(--color-success);
        margin-bottom: 20px;
      }
      .calcp-validated-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--color-success);
        flex-shrink: 0;
      }

      /* Add button */
      .calcp-btn-add {
        width: 100%;
        padding: 13px 20px;
        background: var(--color-brand);
        color: #fff;
        border: none;
        border-radius: 10px;
        font-size: 15px;
        font-weight: 600;
        font-family: 'Inter', sans-serif;
        cursor: pointer;
        transition: background 150ms, transform 100ms;
        margin-bottom: 20px;
      }
      .calcp-btn-add:hover { background: var(--color-brand-hover); }
      .calcp-btn-add:active { transform: scale(.98); }
      .calcp-btn-add--in {
        background: var(--color-success-bg);
        color: var(--color-success);
        border: 1px solid rgba(34,197,94,.25);
      }
      .calcp-btn-add--in:hover { background: rgba(34,197,94,.18); }

      /* Separator */
      .calcp-sep {
        border: none;
        border-top: 1px solid var(--color-border);
        margin: 0 0 20px;
      }

      /* Scientific card */
      .calcp-sci-card { display: flex; flex-direction: column; gap: 0; }
      .calcp-sci-title {
        font-size: 14px;
        font-weight: 700;
        color: var(--color-text-primary);
        margin: 0 0 16px;
      }
      .calcp-sci-section { margin-bottom: 16px; }
      .calcp-sci-section:last-child { margin-bottom: 0; }
      .calcp-sci-label {
        font-size: 11px;
        font-weight: 700;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: .5px;
        margin: 0 0 6px;
      }
      .calcp-sci-text {
        font-size: 13px;
        color: var(--color-text-secondary);
        margin: 0;
        line-height: 1.55;
      }
      .calcp-timing-text {
        font-size: 13px;
        color: var(--color-text-secondary);
        margin: 0;
        padding: 8px 12px;
        background: var(--color-bg-primary);
        border-radius: 8px;
        border-left: 3px solid var(--color-brand);
      }

      /* Progress bars */
      .calcp-progress-row {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .calcp-progress-bar {
        flex: 1;
        height: 6px;
        background: var(--color-border);
        border-radius: 999px;
        overflow: hidden;
      }
      .calcp-progress-fill {
        height: 100%;
        border-radius: 999px;
        transition: width 500ms ease;
      }
      .calcp-sci-pct {
        font-size: 12px;
        font-weight: 700;
        font-family: 'Inter', sans-serif;
        min-width: 44px;
      }

      /* Disclaimer */
      .calcp-disclaimer {
        font-size: 12px;
        color: var(--color-text-muted);
        line-height: 1.6;
        padding: 12px;
        border: 1px solid var(--color-border);
        border-radius: 10px;
        background: var(--color-surface-primary);
        margin: 0;
      }

      /* Mobile tweaks */
      @media (max-width: 767px) {
        .calcp-root { padding: 16px 12px 100px; }
        .calcp-title { font-size: 22px; }
        .calcp-dose-value { font-size: 48px; }
        .calcp-chips { max-height: 240px; }
      }
    `,document.head.appendChild(e)}}export{J as default};
