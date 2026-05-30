import{s,e as l,A as c}from"./main-4ndHjxTB.js";const p=[{value:"bulk",label:"📈 Ganho de Massa (Bulk)"},{value:"cut",label:"🔥 Definição Muscular (Cut)"},{value:"strength",label:"💪 Força Máxima"},{value:"endurance",label:"🏃 Resistência / Cardio"},{value:"general",label:"🌿 Saúde Geral"}],u=[{value:"lactose",label:"Lactose"},{value:"gluten",label:"Glúten"},{value:"soy",label:"Soja"},{value:"stimulant",label:"Estimulantes"},{value:"creatine",label:"Creatina"}];class g{constructor(e){this.container=e,this._listeners=[],this._form={}}mount(){this._loadForm(),this._render(),this._attachListeners()}unmount(){this._listeners.forEach(([e,o,a])=>e.removeEventListener(o,a)),this._listeners=[]}_on(e,o,a){e.addEventListener(o,a),this._listeners.push([e,o,a])}_loadForm(){const e=s.user;this._form={name:e.name||"",objective:e.objective||"general",weight:e.weight||75,trainingFrequency:e.trainingFrequency||4,trainingAge:e.trainingAge||1,budget:e.budget||200,restrictions:[...e.restrictions||[]]}}_inputStyle(){return"width:100%;padding:11px 12px;background:var(--color-bg-secondary);border:1px solid var(--color-border);color:var(--color-text-primary);border-radius:10px;font-size:14px;font-family:inherit;"}_label(e){return`<label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--color-text-secondary);margin-bottom:6px;">${e}</label>`}_render(){const e=this._form,o=s.calculateStreak(),a=s.checkins.length;this.container.innerHTML=`
      <div id="profile-root" style="padding:20px 16px;display:flex;flex-direction:column;gap:20px;padding-bottom:40px;">

        <header>
          <p style="color:var(--color-text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:0.07em;">Configurações</p>
          <h1 style="font-size:26px;font-weight:800;letter-spacing:-0.02em;margin-top:2px;">Meu Perfil</h1>
        </header>

        <!-- Stats Summary -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:14px;padding:16px;text-align:center;">
            <div style="font-size:24px;font-weight:800;">${o}</div>
            <div style="font-size:11px;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-top:2px;">🔥 Streak</div>
          </div>
          <div style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:14px;padding:16px;text-align:center;">
            <div style="font-size:24px;font-weight:800;">${a}</div>
            <div style="font-size:11px;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-top:2px;">📋 Check-ins</div>
          </div>
        </div>

        <!-- Form -->
        <form id="profile-form" style="display:flex;flex-direction:column;gap:20px;">

          <!-- Nome -->
          <div style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:14px;">
            <h2 style="font-size:14px;font-weight:700;margin-bottom:-2px;">Identidade</h2>
            <div>
              ${this._label("Nome")}
              <input id="field-name" type="text" value="${e.name}" placeholder="Seu nome" style="${this._inputStyle()}" />
            </div>
          </div>

          <!-- Objetivo -->
          <div style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:14px;">
            <h2 style="font-size:14px;font-weight:700;margin-bottom:-2px;">Objetivo Fitness</h2>
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${p.map(r=>`
                <label style="display:flex;align-items:center;gap:12px;cursor:pointer;padding:12px;background:${e.objective===r.value?"var(--color-brand-muted)":"var(--color-bg-secondary)"};border:1px solid ${e.objective===r.value?"var(--color-brand)":"transparent"};border-radius:10px;transition:all 0.15s;">
                  <input type="radio" name="objective" value="${r.value}" ${e.objective===r.value?"checked":""} style="accent-color:var(--color-brand);width:16px;height:16px;" />
                  <span style="font-size:14px;font-weight:${e.objective===r.value?"700":"500"};color:${e.objective===r.value?"var(--color-brand)":"inherit"};">${r.label}</span>
                </label>
              `).join("")}
            </div>
          </div>

          <!-- Biometria -->
          <div style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:14px;">
            <h2 style="font-size:14px;font-weight:700;margin-bottom:-2px;">Biometria & Treino</h2>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div>
                ${this._label("Peso (kg)")}
                <input id="field-weight" type="number" min="30" max="250" value="${e.weight}" style="${this._inputStyle()}" />
              </div>
              <div>
                ${this._label("Treinos/semana")}
                <input id="field-freq" type="number" min="1" max="7" value="${e.trainingFrequency}" style="${this._inputStyle()}" />
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div>
                ${this._label("Anos treinando")}
                <input id="field-training-age" type="number" min="0" max="50" value="${e.trainingAge}" style="${this._inputStyle()}" />
              </div>
              <div>
                ${this._label("Budget mensal (R$)")}
                <input id="field-budget" type="number" min="0" max="5000" value="${e.budget}" style="${this._inputStyle()}" />
              </div>
            </div>
          </div>

          <!-- Restrições -->
          <div style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:12px;">
            <h2 style="font-size:14px;font-weight:700;margin-bottom:-2px;">Restrições / Alergias</h2>
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
              ${u.map(r=>{const t=e.restrictions.includes(r.value);return`
                  <button type="button" class="btn-restriction" data-value="${r.value}" style="
                    background:${t?"var(--color-error-bg)":"var(--color-bg-secondary)"};
                    color:${t?"var(--color-error)":"var(--color-text-secondary)"};
                    border:1px solid ${t?"rgba(239,68,68,0.4)":"var(--color-border)"};
                    border-radius:20px;padding:7px 14px;font-size:13px;font-weight:600;cursor:pointer;
                    transition:all 0.15s;
                  ">
                    ${t?"✕ ":""}${r.label}
                  </button>
                `}).join("")}
            </div>
          </div>

          <!-- Save -->
          <button type="submit" id="btn-save-profile" style="
            width:100%;background:var(--color-brand);color:#fff;border:none;
            border-radius:14px;padding:16px;font-weight:700;font-size:16px;
            cursor:pointer;font-family:inherit;
          ">
            Salvar Perfil
          </button>

        </form>

        <!-- Danger Zone -->
        <div style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:12px;">
          <h2 style="font-size:14px;font-weight:700;color:var(--color-error);">Zona de Perigo</h2>
          <button id="btn-reset-data" style="background:var(--color-error-bg);color:var(--color-error);border:1px solid rgba(239,68,68,0.3);border-radius:10px;padding:11px;font-weight:600;font-size:14px;cursor:pointer;width:100%;font-family:inherit;">
            Resetar todos os dados
          </button>
        </div>

      </div>
    `}_attachListeners(){[["#field-name","name","string"],["#field-weight","weight","number"],["#field-freq","trainingFrequency","number"],["#field-training-age","trainingAge","number"],["#field-budget","budget","number"]].forEach(([r,t,n])=>{const i=this.container.querySelector(r);i&&this._on(i,"input",()=>{this._form[t]=n==="number"?parseFloat(i.value)||0:i.value})}),this.container.querySelectorAll('input[name="objective"]').forEach(r=>{this._on(r,"change",()=>{this._form.objective=r.value,this.container.querySelectorAll('label:has(input[name="objective"])').forEach(t=>{const i=t.querySelector("input").value===this._form.objective;t.style.background=i?"var(--color-brand-muted)":"var(--color-bg-secondary)",t.style.borderColor=i?"var(--color-brand)":"transparent",t.querySelector("span").style.fontWeight=i?"700":"500",t.querySelector("span").style.color=i?"var(--color-brand)":"inherit"})})}),this.container.querySelectorAll(".btn-restriction").forEach(r=>{this._on(r,"click",()=>{const t=r.dataset.value,n=this._form.restrictions.indexOf(t);n===-1?this._form.restrictions=[...this._form.restrictions,t]:this._form.restrictions=this._form.restrictions.filter((i,d)=>d!==n),this.unmount(),this._render(),this._attachListeners()})});const o=this.container.querySelector("#profile-form");o&&this._on(o,"submit",r=>{r.preventDefault(),this._saveProfile()});const a=this.container.querySelector("#btn-reset-data");a&&this._on(a,"click",()=>{confirm("Isso vai apagar seu stack, check-ins e preferências. Tem certeza?")&&(s.reset(),l.emit("ui:toastRequested",{message:"Dados resetados.",type:"info"}),window.location.hash="#/home")})}_saveProfile(){s.dispatch(c.SET_USER_PROFILE,{name:this._form.name,objective:this._form.objective,weight:this._form.weight,trainingFrequency:this._form.trainingFrequency,trainingAge:this._form.trainingAge,budget:this._form.budget,restrictions:this._form.restrictions}),l.emit("ui:toastRequested",{message:"✅ Perfil salvo!",type:"success"})}}export{g as default};
