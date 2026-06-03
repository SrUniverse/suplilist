import{N as k,s as d,S as r,a as x,A as m}from"./main-5Kzhlj7v.js";import{C as y}from"./checkout-modal-BfEP-pK-.js";class A{constructor(e,o){this.container=e,this.params=o,this.notifService=new k}mount(){this._injectStyles();const e=d.getState();this._lastTier=e.user?.tier??"free",this.container.innerHTML=this._render(),this._bindEvents(),this._unsubscribe=d.subscribe(()=>{const s=d.getState().user?.tier??"free";if(s===this._lastTier)return;this._lastTier=s;const n=this.container.querySelector(".sp-subscription-section");n&&(n.outerHTML=`<div class="sp-subscription-section">${this._renderSubscriptionSection(s)}</div>`,this._bindSubscriptionEvents())})}unmount(){this._unsubscribe?.(),this.container.innerHTML=""}_injectStyles(){if(document.getElementById("settings-page-styles"))return;const e=document.createElement("style");e.id="settings-page-styles",e.textContent=`
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
    `,document.head.appendChild(e)}_getThemeState(){const e=r.getItem(x.THEME);return e?e==="dark":document.documentElement.getAttribute("data-theme")==="dark"}_getBoolPref(e){return r.getItem(e)==="true"}_switchHTML(e,o,s,n){return`
      <div class="sp-toggle-row">
        <span class="sp-toggle-label">
          <span class="sp-toggle-icon" id="${e}-icon">${n}</span>
          ${s}
        </span>
        <label class="sp-switch" aria-label="${s}">
          <input type="checkbox" id="${e}"${o?" checked":""}>
          <span class="sp-switch-track"></span>
        </label>
      </div>
    `}_renderSubscriptionSection(e){return e==="free"?`
        <div class="sp-card" style="border: 1px dashed rgba(124, 58, 237, 0.4); background: rgba(124, 58, 237, 0.02);">
          <h2 class="sp-section-label" style="color: var(--color-brand); margin-bottom: 12px;">Assinatura Premium</h2>
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap;">
            <div>
              <div style="font-size: 15px; font-weight: 700; color: var(--color-text-primary); display: flex; align-items: center; gap: 6px;">Plano Atual: Gratuito 🟢</div>
              <p style="font-size: 12px; color: var(--color-text-secondary); margin: 4px 0 0 0; max-width: 340px; line-height: 1.45;">Desbloqueie consistência avançada, remova anúncios e baixe relatórios em Excel.</p>
            </div>
            <button class="sp-btn" id="sp-upgrade-btn" style="background: var(--color-brand); color: #fff; border: none; font-weight: 700; height: 38px; border-radius: 8px; box-shadow: 0 4px 12px rgba(139,92,246,0.25); cursor: pointer; padding: 0 20px;">Quero Premium</button>
          </div>
        </div>
      `:`
      <div class="sp-card" style="border: 1px solid rgba(34, 197, 94, 0.4); background: rgba(34, 197, 94, 0.02);">
        <h2 class="sp-section-label" style="color: #22c55e; margin-bottom: 12px;">Minha Assinatura</h2>
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap;">
          <div>
            <div style="font-size: 15px; font-weight: 700; color: var(--color-text-primary);">Plano Ativo: SupliList ${e==="elite"?"ELITE 🏆":"PRO ⭐"}</div>
            <p style="font-size: 12px; color: var(--color-text-secondary); margin: 4px 0 0 0; max-width: 320px; line-height: 1.45;">Seu acesso premium está ativo. Obrigado por apoiar o SupliList!</p>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="sp-btn sp-btn-outline" id="sp-manage-plan-btn" style="height: 38px; padding: 0 16px;">Alterar</button>
            <button class="sp-btn" id="sp-cancel-plan-btn" style="border: 1.5px solid var(--color-error); color: var(--color-error); background: transparent; font-weight: 600; height: 38px; border-radius: 8px; cursor: pointer; padding: 0 16px;">Cancelar</button>
          </div>
        </div>
      </div>
    `}_bindSubscriptionEvents(){const e=this.container.querySelector("#sp-upgrade-btn");e&&e.addEventListener("click",()=>{y.show({tier:"pro"})});const o=this.container.querySelector("#sp-manage-plan-btn");o&&o.addEventListener("click",()=>{y.show({tier:"elite"})});const s=this.container.querySelector("#sp-cancel-plan-btn");s&&s.addEventListener("click",()=>{confirm("Deseja realmente cancelar sua assinatura Premium? Você perderá acesso aos anúncios removidos e análises de gráficos.")&&(d.dispatch(m.SET_TIER,{tier:"free"}),r.setItem("suplilist:tier","free"),alert("Sua assinatura foi cancelada e sua conta retornou ao plano gratuito."))})}_render(){const e=this._getThemeState(),o=this._getBoolPref("suplilist:notif-checkin"),s=this._getBoolPref("suplilist:notif-restock"),i=d.getState().user?.tier??"free";return`
      <div class="sp-page">

        <!-- Header -->
        <div class="sp-header">
          <h1>Configurações</h1>
          <p>Preferências do app, dados e privacidade</p>
        </div>

        <!-- Assinatura -->
        <div class="sp-subscription-section">${this._renderSubscriptionSection(i)}</div>

        <!-- Aparência -->
        <div class="sp-card">
          <h2 class="sp-section-label">Aparência</h2>
          ${this._switchHTML("sp-theme-toggle",e,"Tema escuro",e?"🌙":"☀️")}
        </div>

        <!-- Notificações -->
        <div class="sp-card">
          <h2 class="sp-section-label">Notificações</h2>
          ${this._switchHTML("sp-notif-checkin",o,"Lembrete diário de check-in","💊")}
          ${this._switchHTML("sp-notif-restock",s,"Alertas de reposição de estoque","📦")}
          <p class="sp-notif-note">Notificações são locais e não requerem cadastro. Nada é enviado para servidores.</p>
        </div>

        <!-- Dados & Privacidade -->
        <div class="sp-card">
          <h2 class="sp-section-label">Dados &amp; Privacidade</h2>
          <div class="sp-privacy-box">
            🔒 Seus dados ficam 100% no seu dispositivo. Não temos servidores e nunca coletamos informações pessoais. (LGPD)
          </div>
          <div class="sp-action-row">
            <span class="sp-action-label">Exportar meus dados (download)</span>
            <button class="sp-btn sp-btn-outline" id="sp-export-btn">Exportar</button>
          </div>
          <div class="sp-action-row" id="sp-export-file-row" style="display:none;">
            <span class="sp-action-label">Salvar backup (no seu PC)</span>
            <button class="sp-btn sp-btn-outline" id="sp-export-file-btn">Salvar</button>
          </div>
          <div class="sp-action-row" id="sp-import-file-row" style="display:none;">
            <span class="sp-action-label">Restaurar backup (do seu PC)</span>
            <button class="sp-btn sp-btn-outline" id="sp-import-file-btn">Restaurar</button>
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
    `}_bindEvents(){this._bindSubscriptionEvents();const e=this.container.querySelector("#sp-theme-toggle");e&&e.addEventListener("change",()=>{const t=e.checked,l=t?"dark":"light";document.documentElement.setAttribute("data-theme",l),r.setItem(x.THEME,l);const u=this.container.querySelector("#sp-theme-toggle-icon");u&&(u.textContent=t?"🌙":"☀️");const a=t?'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>':'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',f=document.querySelector("#btn-theme .sb-item__icon");f&&(f.innerHTML=a);const v=document.getElementById("btn-theme-mobile");v&&(v.innerHTML=a)});const o=this.container.querySelector("#sp-notif-checkin");o&&o.addEventListener("change",async()=>{if(o.checked){if(!await this.notifService.requestPermission()){alert("Permissão de notificações negada. Por favor, ative as notificações nas configurações do seu navegador para receber lembretes."),o.checked=!1;return}this.notifService.sendLocalNotification("Lembretes Ativados! 💊",{body:"Agora você receberá lembretes diários para não esquecer seus suplementos.",data:{url:"/settings"}})}r.setItem("suplilist:notif-checkin",o.checked?"true":"false")});const s=this.container.querySelector("#sp-notif-restock");s&&s.addEventListener("change",async()=>{if(s.checked){if(!await this.notifService.requestPermission()){alert("Permissão de notificações negada. Por favor, ative as notificações nas configurações do seu navegador para receber alertas de estoque."),s.checked=!1;return}this.notifService.sendLocalNotification("Alertas de Estoque Ativados! 📦",{body:"Você receberá avisos quando seus suplementos estiverem acabando.",data:{url:"/settings"}})}r.setItem("suplilist:notif-restock",s.checked?"true":"false")});const n=this.container.querySelector("#sp-export-btn");n&&n.addEventListener("click",()=>{const t={},l=r.getAllKeys();for(const a of l)if(a&&a.startsWith("suplilist"))try{t[a]=JSON.parse(r.getItem(a))}catch{t[a]=r.getItem(a)}const u=new Blob([JSON.stringify(t,null,2)],{type:"application/json"}),b=URL.createObjectURL(u),p=document.createElement("a");p.href=b,p.download=`suplilist-export-${new Date().toISOString().slice(0,10)}.json`,document.body.appendChild(p),p.click(),document.body.removeChild(p),setTimeout(()=>URL.revokeObjectURL(b),1e3)});const i=this.container.querySelector("#sp-export-file-btn");i&&r.isFileSystemAPIAvailable()&&(this.container.querySelector("#sp-export-file-row").style.display="flex",i.addEventListener("click",async()=>{i.disabled=!0,i.textContent="Salvando...";try{const t=await r.exportToFile();alert(t.message),t.success&&(i.textContent="✓ Salvo",setTimeout(()=>{i.textContent="Salvar"},2e3))}finally{i.disabled=!1}}));const c=this.container.querySelector("#sp-import-file-btn");c&&r.isFileSystemAPIAvailable()&&(this.container.querySelector("#sp-import-file-row").style.display="flex",c.addEventListener("click",async()=>{c.disabled=!0,c.textContent="Restaurando...";try{const t=await r.importFromFile();alert(t.message),t.success&&(c.textContent="✓ Restaurado",setTimeout(()=>{c.textContent="Restaurar",location.reload()},2e3))}finally{c.disabled=!1}}));const h=this.container.querySelector("#sp-clear-checkins-btn");h&&h.addEventListener("click",()=>{confirm("Deseja limpar todo o histórico de check-ins? Esta ação não pode ser desfeita.")&&d.dispatch(m.CLEAR_CHECKINS)});const g=this.container.querySelector("#sp-reset-btn");g&&g.addEventListener("click",()=>{confirm("⚠️ ATENÇÃO: Isso vai apagar TODOS os seus dados (stack, check-ins, perfil). Não há como desfazer.")&&(Object.keys(localStorage).filter(t=>t.startsWith("suplilist")).forEach(t=>r.removeItem(t)),location.reload())}),this.container.querySelectorAll(".sp-link-btn[data-path]").forEach(t=>{t.addEventListener("click",()=>{const l=t.getAttribute("data-path");window.history.pushState(null,null,l),window.dispatchEvent(new PopStateEvent("popstate"))})})}}export{A as default};
