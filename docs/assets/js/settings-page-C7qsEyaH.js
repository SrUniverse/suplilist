import{S as g,s as u,A as x}from"./main-BWFwH5mN.js";class k{constructor(t,o){this.container=t,this.params=o}mount(){this._injectStyles(),this.container.innerHTML=this._render(),this._bindEvents()}unmount(){this.container.innerHTML=""}_injectStyles(){if(document.getElementById("settings-page-styles"))return;const t=document.createElement("style");t.id="settings-page-styles",t.textContent=`
      .sp-page {
        padding: 24px;
        max-width: 700px;
        display: flex;
        flex-direction: column;
        gap: 24px;
        margin: 0 auto;
      }

      .sp-header h1 {
        font-size: 28px;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: var(--color-text-primary);
        margin: 0 0 6px 0;
      }

      .sp-header p {
        color: var(--color-text-secondary);
        margin: 0;
        font-size: 15px;
      }

      .sp-card {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 16px;
        padding: 24px;
      }

      .sp-section-label {
        text-transform: uppercase;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.07em;
        color: var(--color-text-muted);
        margin: 0 0 16px 0;
      }

      /* Toggle rows */
      .sp-toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 0;
        border-bottom: 1px solid var(--color-border);
      }

      .sp-toggle-row:last-of-type {
        border-bottom: none;
      }

      .sp-toggle-label {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 15px;
        color: var(--color-text-primary);
      }

      .sp-toggle-icon {
        font-size: 18px;
        line-height: 1;
      }

      /* Switch pill */
      .sp-switch {
        position: relative;
        width: 44px;
        height: 24px;
        flex-shrink: 0;
      }

      .sp-switch input {
        opacity: 0;
        width: 0;
        height: 0;
        position: absolute;
      }

      .sp-switch-track {
        position: absolute;
        inset: 0;
        background: var(--color-surface-secondary);
        border: 1.5px solid var(--color-border-strong);
        border-radius: 999px;
        cursor: pointer;
        transition: background 0.2s ease, border-color 0.2s ease;
      }

      .sp-switch input:checked + .sp-switch-track {
        background: var(--color-brand);
        border-color: var(--color-brand);
      }

      .sp-switch-track::after {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 16px;
        height: 16px;
        background: #fff;
        border-radius: 50%;
        transition: transform 0.2s ease;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      }

      .sp-switch input:checked + .sp-switch-track::after {
        transform: translateX(20px);
      }

      /* Notif note */
      .sp-notif-note {
        font-size: 12px;
        color: var(--color-text-muted);
        margin: 12px 0 0 0;
      }

      /* Privacy highlight box */
      .sp-privacy-box {
        background: var(--color-brand-muted);
        border: 1px solid color-mix(in srgb, var(--color-brand) 30%, transparent);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 20px;
        font-size: 14px;
        color: var(--color-text-secondary);
        line-height: 1.5;
      }

      /* Action rows */
      .sp-action-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 0;
        border-bottom: 1px solid var(--color-border);
      }

      .sp-action-row:last-of-type {
        border-bottom: none;
      }

      .sp-action-label {
        font-size: 15px;
        color: var(--color-text-primary);
      }

      /* Buttons */
      .sp-btn {
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s ease, border-color 0.15s ease;
        background: transparent;
      }

      .sp-btn-outline {
        border: 1.5px solid var(--color-border-strong);
        color: var(--color-text-primary);
      }

      .sp-btn-outline:hover {
        border-color: var(--color-brand);
        color: var(--color-brand);
      }

      .sp-btn-danger {
        border: 1.5px solid var(--color-error);
        color: var(--color-error);
      }

      .sp-btn-danger:hover {
        background: color-mix(in srgb, var(--color-error) 10%, transparent);
      }

      /* About version */
      .sp-version {
        font-size: 13px;
        color: var(--color-text-muted);
        margin: 0 0 20px 0;
      }

      /* Legal link rows */
      .sp-link-btn {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 16px;
        border-radius: 10px;
        border: 1px solid var(--color-border);
        margin-bottom: 8px;
        background: transparent;
        cursor: pointer;
        font-size: 15px;
        color: var(--color-text-primary);
        text-align: left;
        transition: border-color 0.15s ease, background 0.15s ease;
        box-sizing: border-box;
      }

      .sp-link-btn:last-child {
        margin-bottom: 0;
      }

      .sp-link-btn:hover {
        border-color: var(--color-brand);
        background: var(--color-surface-secondary);
      }

      .sp-link-arrow {
        color: var(--color-text-muted);
        font-size: 14px;
        flex-shrink: 0;
      }
    `,document.head.appendChild(t)}_getThemeState(){const t=localStorage.getItem(g.THEME);return t?t==="dark":document.documentElement.getAttribute("data-theme")==="dark"}_getBoolPref(t){return localStorage.getItem(t)==="true"}_switchHTML(t,o,r,c){return`
      <div class="sp-toggle-row">
        <span class="sp-toggle-label">
          <span class="sp-toggle-icon" id="${t}-icon">${c}</span>
          ${r}
        </span>
        <label class="sp-switch" aria-label="${r}">
          <input type="checkbox" id="${t}"${o?" checked":""}>
          <span class="sp-switch-track"></span>
        </label>
      </div>
    `}_render(){const t=this._getThemeState(),o=this._getBoolPref("suplilist:notif-checkin"),r=this._getBoolPref("suplilist:notif-restock");return`
      <div class="sp-page">

        <!-- Header -->
        <div class="sp-header">
          <h1>Configurações</h1>
          <p>Preferências do app, dados e privacidade</p>
        </div>

        <!-- Aparência -->
        <div class="sp-card">
          <h2 class="sp-section-label">Aparência</h2>
          ${this._switchHTML("sp-theme-toggle",t,"Tema escuro",t?"🌙":"☀️")}
        </div>

        <!-- Notificações -->
        <div class="sp-card">
          <h2 class="sp-section-label">Notificações</h2>
          ${this._switchHTML("sp-notif-checkin",o,"Lembrete diário de check-in","💊")}
          ${this._switchHTML("sp-notif-restock",r,"Alertas de reposição de estoque","📦")}
          <p class="sp-notif-note">Notificações são locais e não requerem cadastro. Nada é enviado para servidores.</p>
        </div>

        <!-- Dados & Privacidade -->
        <div class="sp-card">
          <h2 class="sp-section-label">Dados &amp; Privacidade</h2>
          <div class="sp-privacy-box">
            🔒 Seus dados ficam 100% no seu dispositivo. Não temos servidores e nunca coletamos informações pessoais. (LGPD)
          </div>
          <div class="sp-action-row">
            <span class="sp-action-label">Exportar meus dados</span>
            <button class="sp-btn sp-btn-outline" id="sp-export-btn">Exportar</button>
          </div>
          <div class="sp-action-row">
            <span class="sp-action-label">Limpar histórico de check-ins</span>
            <button class="sp-btn sp-btn-outline" id="sp-clear-checkins-btn">Limpar</button>
          </div>
          <div class="sp-action-row">
            <span class="sp-action-label">Resetar tudo</span>
            <button class="sp-btn sp-btn-danger" id="sp-reset-btn">Resetar</button>
          </div>
        </div>

        <!-- Sobre & Legal -->
        <div class="sp-card">
          <h2 class="sp-section-label">Sobre &amp; Legal</h2>
          <p class="sp-version">SupliList v4.0.0 · Feito com ❤️ e ciência</p>
          <button class="sp-link-btn" data-path="/faq">
            <span>❓ Perguntas Frequentes (FAQ)</span>
            <span class="sp-link-arrow">→</span>
          </button>
          <button class="sp-link-btn" data-path="/legal?doc=termos">
            <span>📋 Termos de Uso</span>
            <span class="sp-link-arrow">→</span>
          </button>
          <button class="sp-link-btn" data-path="/legal?doc=privacidade">
            <span>🔒 Política de Privacidade</span>
            <span class="sp-link-arrow">→</span>
          </button>
          <button class="sp-link-btn" data-path="/legal?doc=medico">
            <span>⚕️ Aviso Médico</span>
            <span class="sp-link-arrow">→</span>
          </button>
          <button class="sp-link-btn" data-path="/legal?doc=afiliados">
            <span>🔗 Divulgação de Afiliados</span>
            <span class="sp-link-arrow">→</span>
          </button>
        </div>

      </div>
    `}_bindEvents(){const t=this.container.querySelector("#sp-theme-toggle");t&&t.addEventListener("change",()=>{const e=t.checked,n=e?"dark":"light";document.documentElement.setAttribute("data-theme",n),localStorage.setItem(g.THEME,n);const i=this.container.querySelector("#sp-theme-toggle-icon");i&&(i.textContent=e?"🌙":"☀️");const s=e?'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>':'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',h=document.querySelector("#btn-theme .sb-item__icon");h&&(h.innerHTML=s);const b=document.getElementById("btn-theme-mobile");b&&(b.innerHTML=s)});const o=this.container.querySelector("#sp-notif-checkin");o&&o.addEventListener("change",()=>{localStorage.setItem("suplilist:notif-checkin",o.checked?"true":"false")});const r=this.container.querySelector("#sp-notif-restock");r&&r.addEventListener("change",()=>{localStorage.setItem("suplilist:notif-restock",r.checked?"true":"false")});const c=this.container.querySelector("#sp-export-btn");c&&c.addEventListener("click",()=>{const e={};for(let l=0;l<localStorage.length;l++){const s=localStorage.key(l);if(s&&s.startsWith("suplilist"))try{e[s]=JSON.parse(localStorage.getItem(s))}catch{e[s]=localStorage.getItem(s)}}const n=new Blob([JSON.stringify(e,null,2)],{type:"application/json"}),i=URL.createObjectURL(n),a=document.createElement("a");a.href=i,a.download=`suplilist-export-${new Date().toISOString().slice(0,10)}.json`,document.body.appendChild(a),a.click(),document.body.removeChild(a),setTimeout(()=>URL.revokeObjectURL(i),1e3)});const p=this.container.querySelector("#sp-clear-checkins-btn");p&&p.addEventListener("click",()=>{confirm("Deseja limpar todo o histórico de check-ins? Esta ação não pode ser desfeita.")&&u.dispatch(x.CLEAR_CHECKINS)});const d=this.container.querySelector("#sp-reset-btn");d&&d.addEventListener("click",()=>{confirm("⚠️ ATENÇÃO: Isso vai apagar TODOS os seus dados (stack, check-ins, perfil). Não há como desfazer.")&&(Object.keys(localStorage).filter(e=>e.startsWith("suplilist")).forEach(e=>localStorage.removeItem(e)),location.reload())}),this.container.querySelectorAll(".sp-link-btn[data-path]").forEach(e=>{e.addEventListener("click",()=>{const n=e.getAttribute("data-path");window.history.pushState(null,null,n),window.dispatchEvent(new PopStateEvent("popstate"))})})}}export{k as default};
