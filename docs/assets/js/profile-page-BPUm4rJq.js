import{s as a,A as g,e as p}from"./main-CfwEDZr2.js";const f=[{value:"bulk",label:"📈 Ganho de Massa (Bulk)"},{value:"cut",label:"🔥 Definição Muscular (Cut)"},{value:"strength",label:"💪 Força Máxima"},{value:"endurance",label:"🏃 Resistência / Cardio"},{value:"general",label:"🌿 Saúde Geral"}],v=[{value:"lactose",label:"Lactose"},{value:"gluten",label:"Glúten"},{value:"soy",label:"Soja"},{value:"stimulant",label:"Estimulantes"},{value:"creatine",label:"Creatina"}],n="width:100%;padding:11px 12px;background:var(--color-bg-secondary);border:1px solid var(--color-border);color:var(--color-text-primary);border-radius:10px;font-size:14px;font-family:inherit;box-sizing:border-box;";function s(c){return`<label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--color-text-secondary);margin-bottom:6px;">${c}</label>`}class m{constructor(r){this.container=r,this._form={}}mount(){const r=a.user;this._form={name:r.name||"",objective:r.objective||"general",weight:r.weight||75,trainingFrequency:r.trainingFrequency||4,trainingAge:r.trainingAge||1,budget:r.budget||200,restrictions:[...r.restrictions||[]]},this._render(),this._attachListeners()}unmount(){}_render(){const r=this._form,l=a.calculateStreak(),d=a.checkins.length;this.container.innerHTML=`
      <div style="padding:20px 16px;display:flex;flex-direction:column;gap:20px;padding-bottom:40px;">

        <header>
          <p style="color:var(--color-text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:0.07em;">Configurações</p>
          <h1 style="font-size:26px;font-weight:800;letter-spacing:-0.02em;margin-top:2px;">Meu Perfil</h1>
        </header>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:14px;padding:16px;text-align:center;">
            <div style="font-size:24px;font-weight:800;">${l}</div>
            <div style="font-size:11px;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-top:2px;">🔥 Streak</div>
          </div>
          <div style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:14px;padding:16px;text-align:center;">
            <div style="font-size:24px;font-weight:800;">${d}</div>
            <div style="font-size:11px;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-top:2px;">📋 Check-ins</div>
          </div>
        </div>

        <form id="profile-form" style="display:flex;flex-direction:column;gap:20px;">

          <div style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:14px;">
            <h2 style="font-size:14px;font-weight:700;margin-bottom:-2px;">Identidade</h2>
            <div>
              ${s("Nome")}
              <input id="field-name" type="text" value="${r.name}" placeholder="Seu nome" style="${n}" />
            </div>
          </div>

          <div style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:14px;">
            <h2 style="font-size:14px;font-weight:700;margin-bottom:-2px;">Objetivo Fitness</h2>
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${f.map(t=>{const e=r.objective===t.value;return`
                  <label style="display:flex;align-items:center;gap:12px;cursor:pointer;padding:12px;background:${e?"var(--color-brand-muted)":"var(--color-bg-secondary)"};border:1px solid ${e?"var(--color-brand)":"transparent"};border-radius:10px;">
                    <input type="radio" name="objective" value="${t.value}" ${e?"checked":""} style="accent-color:var(--color-brand);width:16px;height:16px;" />
                    <span style="font-size:14px;font-weight:${e?"700":"500"};color:${e?"var(--color-brand)":"inherit"};">${t.label}</span>
                  </label>
                `}).join("")}
            </div>
          </div>

          <div style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:14px;">
            <h2 style="font-size:14px;font-weight:700;margin-bottom:-2px;">Biometria & Treino</h2>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div>
                ${s("Peso (kg)")}
                <input id="field-weight" type="number" min="30" max="250" value="${r.weight}" style="${n}" />
              </div>
              <div>
                ${s("Treinos/semana")}
                <input id="field-freq" type="number" min="1" max="7" value="${r.trainingFrequency}" style="${n}" />
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div>
                ${s("Anos treinando")}
                <input id="field-training-age" type="number" min="0" max="50" value="${r.trainingAge}" style="${n}" />
              </div>
              <div>
                ${s("Budget mensal (R$)")}
                <input id="field-budget" type="number" min="0" max="5000" value="${r.budget}" style="${n}" />
              </div>
            </div>
          </div>

          <div style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:12px;">
            <h2 style="font-size:14px;font-weight:700;margin-bottom:-2px;">Restrições / Alergias</h2>
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
              ${v.map(t=>{const e=r.restrictions.includes(t.value);return`
                  <button type="button" class="btn-restriction" data-value="${t.value}" style="
                    background:${e?"var(--color-error-bg)":"var(--color-bg-secondary)"};
                    color:${e?"var(--color-error)":"var(--color-text-secondary)"};
                    border:1px solid ${e?"rgba(239,68,68,0.4)":"var(--color-border)"};
                    border-radius:20px;padding:7px 14px;font-size:13px;font-weight:600;cursor:pointer;
                  ">
                    ${e?"✕ ":""}${t.label}
                  </button>
                `}).join("")}
            </div>
          </div>

          <button type="submit" style="
            width:100%;background:var(--color-brand);color:#fff;border:none;
            border-radius:14px;padding:16px;font-weight:700;font-size:16px;
            cursor:pointer;font-family:inherit;
          ">
            Salvar Perfil
          </button>

        </form>

        <div style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:12px;">
          <h2 style="font-size:14px;font-weight:700;color:var(--color-error);">Zona de Perigo</h2>
          <button id="btn-reset-data" style="background:var(--color-error-bg);color:var(--color-error);border:1px solid rgba(239,68,68,0.3);border-radius:10px;padding:11px;font-weight:600;font-size:14px;cursor:pointer;width:100%;font-family:inherit;">
            Resetar todos os dados
          </button>
        </div>

      </div>
    `}_attachListeners(){[["#field-name","name","string"],["#field-weight","weight","number"],["#field-freq","trainingFrequency","number"],["#field-training-age","trainingAge","number"],["#field-budget","budget","number"]].forEach(([t,e,o])=>{const i=this.container.querySelector(t);i&&i.addEventListener("input",()=>{this._form[e]=o==="number"?parseFloat(i.value)||0:i.value})}),this.container.querySelectorAll('input[name="objective"]').forEach(t=>{t.addEventListener("change",()=>{this._form.objective=t.value,this.container.querySelectorAll('label:has(input[name="objective"])').forEach(e=>{const i=e.querySelector("input").value===this._form.objective;e.style.background=i?"var(--color-brand-muted)":"var(--color-bg-secondary)",e.style.borderColor=i?"var(--color-brand)":"transparent",e.querySelector("span").style.fontWeight=i?"700":"500",e.querySelector("span").style.color=i?"var(--color-brand)":"inherit"})})}),this.container.querySelectorAll(".btn-restriction").forEach(t=>{t.addEventListener("click",()=>{const e=t.dataset.value,o=this._form.restrictions.indexOf(e);o===-1?this._form.restrictions=[...this._form.restrictions,e]:this._form.restrictions=this._form.restrictions.filter((i,u)=>u!==o),this._render(),this._attachListeners()})});const l=this.container.querySelector("#profile-form");l&&l.addEventListener("submit",t=>{t.preventDefault(),a.dispatch(g.SET_USER_PROFILE,{name:this._form.name,objective:this._form.objective,weight:this._form.weight,trainingFrequency:this._form.trainingFrequency,trainingAge:this._form.trainingAge,budget:this._form.budget,restrictions:this._form.restrictions}),p.emit("ui:toastRequested",{message:"✅ Perfil salvo!",type:"success"})});const d=this.container.querySelector("#btn-reset-data");d&&d.addEventListener("click",()=>{confirm("Isso vai apagar seu stack, check-ins e preferências. Tem certeza?")&&(a.reset(),p.emit("ui:toastRequested",{message:"Dados resetados.",type:"info"}),window.location.hash="#/home")})}}export{m as default};
