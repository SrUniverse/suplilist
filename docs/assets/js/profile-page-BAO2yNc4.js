import{s as l,A as C,e as u,S as c,a as j}from"./main-g91Ku98a.js";import{e as _}from"./escape-Br5wU8qn.js";const L=[{value:"bulk",label:"Bulk",desc:"Ganho de Massa"},{value:"cut",label:"Cut",desc:"Definição Muscular"},{value:"strength",label:"Força",desc:"Força Máxima"},{value:"endurance",label:"Resistência",desc:"Cardio & Endurance"},{value:"general",label:"Saúde",desc:"Bem-estar Geral"}],m=["width:100%","padding:11px 14px","background:var(--color-bg-secondary)","border:1px solid var(--color-border)","color:var(--color-text-primary)","border-radius:10px","font-size:14px","font-family:inherit","box-sizing:border-box","outline:none","transition:border-color 0.15s"].join(";"),z=m+";appearance:none;cursor:pointer;";function b(g){return`<label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--color-text-secondary);margin-bottom:6px;">${g}</label>`}function y(g,e,a=""){return`
    <div style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:16px;${a}">
      <h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--color-text-secondary);margin:0;">${g}</h2>
      ${e}
    </div>
  `}class q{constructor(e){this.container=e,this._form={},this._editingName=!1}mount(){const e=l.user||{};this._form={name:e.name||"Usuário",objective:e.objective||"general",weight:e.weight||"",height:e.height||"",age:e.age||""},this._render(),this._attachListeners()}unmount(){}_getObjectiveLabel(){const e=L.find(a=>a.value===this._form.objective);return e?e.label:"Saúde"}_getInitial(){return(this._form.name||"U").trim()[0].toUpperCase()}_render(){const e=this._form,a=this._getInitial(),f=this._getObjectiveLabel(),s=document.documentElement.getAttribute("data-theme")!=="light";this.container.innerHTML=`
      <div style="padding:24px 16px 60px;display:flex;flex-direction:column;gap:20px;max-width:600px;margin:0 auto;">

        <!-- HEADER -->
        <div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:24px 0 8px;">
          <div id="profile-avatar-initial" style="
            width:72px;height:72px;border-radius:50%;
            background:var(--color-brand);
            display:flex;align-items:center;justify-content:center;
            font-size:28px;font-weight:800;color:#fff;font-family:'Plus Jakarta Sans','Inter',sans-serif;
            flex-shrink:0;
          ">${a}</div>

          <div style="text-align:center;">
            <div id="name-display" style="display:flex;align-items:center;gap:8px;justify-content:center;">
              <span id="name-text" style="font-size:22px;font-weight:800;font-family:'Plus Jakarta Sans','Inter',sans-serif;letter-spacing:-0.02em;">${_(e.name)}</span>
              <button id="btn-edit-name" title="Editar nome" style="background:none;border:none;cursor:pointer;color:var(--color-text-muted);padding:2px;display:flex;align-items:center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
            </div>
            <div id="name-edit" style="display:none;margin-top:6px;">
              <input id="inline-name-input" type="text" value="${_(e.name)}" style="${m};text-align:center;font-size:16px;font-weight:700;max-width:220px;" />
              <div style="display:flex;gap:8px;justify-content:center;margin-top:8px;">
                <button id="btn-name-confirm" style="background:var(--color-brand);color:#fff;border:none;border-radius:8px;padding:7px 18px;font-weight:600;font-size:13px;cursor:pointer;font-family:inherit;">OK</button>
                <button id="btn-name-cancel" style="background:transparent;border:1px solid var(--color-border-strong);color:var(--color-text-secondary);border-radius:8px;padding:7px 14px;font-weight:600;font-size:13px;cursor:pointer;font-family:inherit;">Cancelar</button>
              </div>
            </div>
            <div style="margin-top:8px;">
              <span style="
                background:var(--color-brand-muted);
                color:var(--color-brand);
                font-size:11px;font-weight:700;
                padding:3px 10px;border-radius:20px;
                text-transform:uppercase;letter-spacing:0.06em;
              ">${f}</span>
            </div>
          </div>
        </div>

        <!-- 1. DADOS BIOMÉTRICOS -->
        ${y("Dados Biométricos",`
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
            <div>
              ${b("Peso (kg)")}
              <input id="field-weight" type="number" min="30" max="300" value="${e.weight}" placeholder="—" style="${m}" />
            </div>
            <div>
              ${b("Altura (cm)")}
              <input id="field-height" type="number" min="100" max="250" value="${e.height}" placeholder="—" style="${m}" />
            </div>
            <div>
              ${b("Idade")}
              <input id="field-age" type="number" min="10" max="100" value="${e.age}" placeholder="—" style="${m}" />
            </div>
          </div>
          <div>
            ${b("Objetivo Principal")}
            <div style="position:relative;">
              <select id="field-objective" style="${z}">
                ${L.map(i=>`<option value="${i.value}" ${e.objective===i.value?"selected":""}>${i.label} — ${i.desc}</option>`).join("")}
              </select>
              <svg style="position:absolute;right:12px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--color-text-secondary);" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>
          <button id="btn-save-bio" style="
            background:var(--color-brand);color:#fff;border:none;
            border-radius:10px;padding:11px 20px;
            font-weight:700;font-size:14px;cursor:pointer;font-family:inherit;
            align-self:flex-start;
          ">Salvar</button>
        `)}

        <!-- 2. APARÊNCIA -->
        ${y("Aparência",`
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:10px;">
              <span id="theme-icon" style="font-size:20px;">${s?"🌙":"☀️"}</span>
              <div>
                <div style="font-size:14px;font-weight:600;" id="theme-label">${s?"Tema Escuro":"Tema Claro"}</div>
                <div style="font-size:12px;color:var(--color-text-secondary);">Aparência do app</div>
              </div>
            </div>
            <button id="theme-toggle" role="switch" aria-checked="${s}" style="
              position:relative;width:52px;height:28px;
              background:${s?"var(--color-brand)":"var(--color-surface-secondary)"};
              border:1px solid ${s?"var(--color-brand)":"var(--color-border-strong)"};
              border-radius:50px;cursor:pointer;transition:background 0.2s,border-color 0.2s;
              flex-shrink:0;
            ">
              <span style="
                position:absolute;top:3px;
                left:${s?"26px":"3px"};
                width:20px;height:20px;border-radius:50%;
                background:#fff;transition:left 0.2s;
                display:flex;align-items:center;justify-content:center;
                font-size:11px;
              ">${s?"🌙":"☀️"}</span>
            </button>
          </div>
        `)}

        <!-- 3. DADOS & PRIVACIDADE -->
        ${y("Dados & Privacidade",`
          <p style="font-size:13px;color:var(--color-text-secondary);margin:0;line-height:1.5;">
            Seus dados ficam 100% no seu dispositivo. Nunca enviamos nada para servidores.
          </p>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <button id="btn-export" style="
              background:transparent;color:var(--color-text-primary);
              border:1px solid var(--color-border-strong);
              border-radius:10px;padding:11px 16px;
              font-weight:600;font-size:14px;cursor:pointer;font-family:inherit;
              display:flex;align-items:center;gap:8px;
            ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Exportar Dados
            </button>
            <button id="btn-clear-checkins" style="
              background:var(--color-warning-bg);color:var(--color-warning);
              border:1px solid rgba(245,158,11,0.3);
              border-radius:10px;padding:11px 16px;
              font-weight:600;font-size:14px;cursor:pointer;font-family:inherit;
              display:flex;align-items:center;gap:8px;
            ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
              Limpar Histórico de Check-ins
            </button>
            <button id="btn-reset-data" style="
              background:var(--color-error-bg);color:var(--color-error);
              border:1px solid rgba(239,68,68,0.3);
              border-radius:10px;padding:11px 16px;
              font-weight:600;font-size:14px;cursor:pointer;font-family:inherit;
              display:flex;align-items:center;gap:8px;
            ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              Resetar Tudo
            </button>
          </div>
        `)}

        <!-- 4. SOBRE O APP -->
        ${y("Sobre o App",`
          <div style="display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:13px;color:var(--color-text-secondary);">Versão</span>
              <span style="font-size:13px;font-weight:600;">4.0.0</span>
            </div>
            <div style="height:1px;background:var(--color-border);"></div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:13px;color:var(--color-text-secondary);">Repositório</span>
              <a href="https://github.com/suplilist/suplilist" target="_blank" rel="noopener noreferrer" style="font-size:13px;font-weight:600;color:var(--color-brand);text-decoration:none;">GitHub ↗</a>
            </div>
            <div style="height:1px;background:var(--color-border);"></div>
            <div style="text-align:center;padding-top:4px;">
              <span style="font-size:13px;color:var(--color-text-secondary);">Feito com ❤️ e ciência</span>
            </div>
          </div>
        `)}

      </div>
    `}_attachListeners(){const e=this.container.querySelector("#btn-edit-name"),a=this.container.querySelector("#name-display"),f=this.container.querySelector("#name-edit"),s=this.container.querySelector("#name-text"),i=this.container.querySelector("#inline-name-input"),v=this.container.querySelector("#btn-name-confirm"),x=this.container.querySelector("#btn-name-cancel");e&&e.addEventListener("click",()=>{a.style.display="none",f.style.display="block",i.focus(),i.select()}),v&&v.addEventListener("click",()=>{const t=(i.value||"").trim();if(t){this._form.name=t,s.textContent=t;const n=this.container.querySelector("#profile-avatar-initial");n&&(n.textContent=t[0].toUpperCase())}f.style.display="none",a.style.display="flex"}),x&&x.addEventListener("click",()=>{i.value=this._form.name,f.style.display="none",a.style.display="flex"}),i&&i.addEventListener("keydown",t=>{t.key==="Enter"&&v&&v.click(),t.key==="Escape"&&x&&x.click()});const k=this.container.querySelector("#btn-save-bio");if(k){const t=this.container.querySelector("#field-weight"),n=this.container.querySelector("#field-height"),o=this.container.querySelector("#field-age"),r=this.container.querySelector("#field-objective");k.addEventListener("click",()=>{const p=A=>{const $=parseFloat(A);return isNaN($)?void 0:$};this._form.weight=p(t.value),this._form.height=p(n.value),this._form.age=p(o.value),this._form.objective=r.value,l.dispatch(C.SET_USER_PROFILE,{name:this._form.name,weight:this._form.weight,height:this._form.height,age:this._form.age,objective:this._form.objective}),u.emit("toast:show",{message:"Dados biométricos salvos!",type:"success"});const h=this.container.querySelector('span[style*="brand-muted"]');h&&(h.textContent=this._getObjectiveLabel())})}const d=this.container.querySelector("#theme-toggle");d&&d.addEventListener("click",()=>{const n=document.documentElement.getAttribute("data-theme")!=="light"?"light":"dark";document.documentElement.setAttribute("data-theme",n),c.setItem(j.THEME,n);const o=n==="dark";d.style.background=o?"var(--color-brand)":"var(--color-surface-secondary)",d.style.borderColor=o?"var(--color-brand)":"var(--color-border-strong)",d.setAttribute("aria-checked",o);const r=d.querySelector("span");r&&(r.style.left=o?"26px":"3px",r.textContent=o?"🌙":"☀️");const p=this.container.querySelector("#theme-icon"),h=this.container.querySelector("#theme-label");p&&(p.textContent=o?"🌙":"☀️"),h&&(h.textContent=o?"Tema Escuro":"Tema Claro")});const w=this.container.querySelector("#btn-export");w&&w.addEventListener("click",()=>{try{const t={user:l.user,stack:l.stack,checkins:l.checkins,exportedAt:new Date().toISOString()},n=new Blob([JSON.stringify(t,null,2)],{type:"application/json"}),o=URL.createObjectURL(n),r=document.createElement("a");r.href=o,r.download=`suplilist-backup-${new Date().toISOString().slice(0,10)}.json`,document.body.appendChild(r),r.click(),document.body.removeChild(r),setTimeout(()=>URL.revokeObjectURL(o),1e3),u.emit("toast:show",{message:"Dados exportados!",type:"success"})}catch{u.emit("toast:show",{message:"Erro ao exportar dados.",type:"error"})}});const E=this.container.querySelector("#btn-clear-checkins");E&&E.addEventListener("click",()=>{confirm("Apagar todo o histórico de check-ins? Esta ação não pode ser desfeita.")&&(l.dispatch(C.CLEAR_CHECKINS),u.emit("toast:show",{message:"Histórico de check-ins apagado.",type:"info"}))});const S=this.container.querySelector("#btn-reset-data");S&&S.addEventListener("click",()=>{const t=prompt("Para confirmar, digite RESETAR:");t==="RESETAR"?(l.reset(),c.removeItem("suplilist:favorites"),c.removeItem(j.THEME),c.removeItem("theme"),c.removeItem("suplilist:notif-checkin"),c.removeItem("suplilist:notif-restock"),c.removeItem("suplilist:sidebar-collapsed"),u.emit("toast:show",{message:"App resetado com sucesso.",type:"info"}),window.history.pushState(null,null,"/home"),window.dispatchEvent(new PopStateEvent("popstate"))):t!==null&&u.emit("toast:show",{message:"Texto incorreto. Reset cancelado.",type:"error"})})}}export{q as default};
