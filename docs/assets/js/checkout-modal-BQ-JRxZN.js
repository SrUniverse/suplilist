var b=Object.defineProperty;var m=(o,e,a)=>e in o?b(o,e,{enumerable:!0,configurable:!0,writable:!0,value:a}):o[e]=a;var d=(o,e,a)=>m(o,typeof e!="symbol"?e+"":e,a);import{s as h,A as x,S as g,e as l}from"./main-Bqgd7Ma9.js";class v{static show(e={}){const a=document.getElementById("premium-checkout-overlay");if(a&&(a.remove(),this._activeOverlay=null),this._activeOverlay)return;const i=e.tier==="elite"?"elite":"pro";this._injectStyles();const t=document.createElement("div");t.id="premium-checkout-overlay",t.setAttribute("role","dialog"),t.setAttribute("aria-modal","true"),t.setAttribute("aria-label","Ativar Plano Premium (Demonstração)"),t.innerHTML=`
      <div id="premium-checkout-card">
        <button id="premium-checkout-close" aria-label="Fechar">✕</button>
        
        <div class="checkout-header">
          <span class="checkout-badge">UPGRADE</span>
          <h2>Eleve sua consistência 🌟</h2>
          <p>Desbloqueie o SupliList Premium e alcance suas metas mais rápido.</p>
        </div>

        <div class="checkout-tiers">
          <div class="checkout-tier-card ${i==="pro"?"active":""}" data-tier="pro">
            <div class="tier-radio"></div>
            <div class="tier-info">
              <span class="tier-title">SupliList PRO</span>
              <span class="tier-desc">Ad adherence charts, analytics, Excel exports & ad-free catalog.</span>
            </div>
            <div class="tier-price">
              <span class="price-val">R$ 14,90</span>
              <span class="price-period">/mês</span>
            </div>
          </div>

          <div class="checkout-tier-card ${i==="elite"?"active":""}" data-tier="elite">
            <div class="tier-radio"></div>
            <div class="tier-info">
              <span class="tier-title">SupliList ELITE</span>
              <span class="tier-desc">Tudo do PRO + Recomendações avançadas de IA e suporte premium.</span>
            </div>
            <div class="tier-price">
              <span class="price-val">R$ 29,90</span>
              <span class="price-period">/mês</span>
            </div>
          </div>
        </div>

        <div class="demo-notice">
          <p class="demo-notice__text">Este é um modo de demonstração. Nenhum pagamento real será processado. Clique no botão abaixo para simular a ativação do plano.</p>
        </div>

        <div id="checkout-form">
          <button type="button" id="checkout-submit-btn">
            <span class="btn-text" id="checkout-btn-label">Ativar PRO (Demo)</span>
          </button>
        </div>

        <div id="checkout-status-panel" class="status-panel-hidden">
          <div class="status-spinner"></div>
          <p id="checkout-status-message">Ativando plano...</p>
        </div>

        <div class="checkout-footer">
          🔒 Pagamento simulado 100% offline-first. Nenhuma cobrança real será realizada.
        </div>
      </div>
    `,document.body.appendChild(t),this._activeOverlay=t,this._attachListeners(t,i)}static dismiss(){this._activeOverlay&&(this._activeOverlay.remove(),this._activeOverlay=null)}static _injectStyles(){if(document.getElementById("premium-checkout-styles"))return;const e=document.createElement("style");e.id="premium-checkout-styles",e.textContent=`
      #premium-checkout-overlay {
        position: fixed;
        inset: 0;
        z-index: 500;
        background: rgba(8, 8, 12, 0.75);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        animation: co-fade-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      #premium-checkout-overlay.fade-out {
        animation: co-fade-out 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      @keyframes co-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes co-fade-out {
        from { opacity: 1; }
        to { opacity: 0; }
      }

      #premium-checkout-card {
        background: #111115;
        border: 1px solid rgba(124, 58, 237, 0.25);
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6), 0 0 40px rgba(124, 58, 237, 0.08);
        border-radius: 24px;
        width: 100%;
        max-width: 480px;
        position: relative;
        padding: 32px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: 20px;
        animation: co-slide-up 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        color: #f3f4f6;
        font-family: 'Inter', sans-serif;
      }

      @keyframes co-slide-up {
        from { opacity: 0; transform: translateY(40px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      #premium-checkout-close {
        position: absolute;
        top: 20px;
        right: 20px;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: #9ca3af;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        transition: all 0.15s ease;
      }

      #premium-checkout-close:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #ffffff;
        transform: rotate(90deg);
      }

      .checkout-header {
        text-align: center;
        padding-top: 10px;
      }

      .checkout-badge {
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: #ffffff;
        background: linear-gradient(135deg, #7c3aed, #a78bfa);
        padding: 4px 10px;
        border-radius: 999px;
        display: inline-block;
        margin-bottom: 12px;
        box-shadow: 0 2px 10px rgba(124, 58, 237, 0.3);
      }

      .checkout-header h2 {
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-weight: 800;
        font-size: 22px;
        margin: 0 0 6px 0;
        letter-spacing: -0.01em;
        background: linear-gradient(to right, #ffffff, #e5e7eb);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .checkout-header p {
        font-size: 13.5px;
        color: #9ca3af;
        margin: 0;
        line-height: 1.45;
      }

      .checkout-tiers {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .checkout-tier-card {
        border: 1.5px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.02);
        border-radius: 16px;
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 14px;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        position: relative;
      }

      .checkout-tier-card:hover {
        border-color: rgba(124, 58, 237, 0.4);
        background: rgba(255, 255, 255, 0.04);
      }

      .checkout-tier-card.active {
        border-color: #7c3aed;
        background: rgba(124, 58, 237, 0.06);
        box-shadow: 0 4px 20px rgba(124, 58, 237, 0.15);
      }

      .tier-radio {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.2);
        flex-shrink: 0;
        position: relative;
        transition: all 0.15s ease;
      }

      .checkout-tier-card.active .tier-radio {
        border-color: #7c3aed;
        background: #7c3aed;
      }

      .checkout-tier-card.active .tier-radio::after {
        content: '';
        position: absolute;
        inset: 4px;
        background: #ffffff;
        border-radius: 50%;
      }

      .tier-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .tier-title {
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-weight: 700;
        font-size: 13.5px;
        color: #ffffff;
        letter-spacing: 0.02em;
      }

      .tier-desc {
        font-size: 11px;
        color: #9ca3af;
        line-height: 1.35;
      }

      .tier-price {
        text-align: right;
        display: flex;
        flex-direction: column;
      }

      .price-val {
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-weight: 800;
        font-size: 15px;
        color: #ffffff;
      }

      .price-period {
        font-size: 10px;
        color: #6b7280;
      }

      /* Demo notice */
      .demo-notice {
        background: rgba(124, 58, 237, 0.08);
        border: 1px solid rgba(124, 58, 237, 0.25);
        border-radius: 12px;
        padding: 14px 16px;
      }

      .demo-notice__text {
        margin: 0;
        font-size: 13px;
        color: #c4b5fd;
        line-height: 1.55;
        text-align: center;
      }

      /* Activate button */
      #checkout-form {
        display: flex;
        flex-direction: column;
      }

      #checkout-submit-btn {
        background: linear-gradient(135deg, #7c3aed, #6d28d9);
        color: #ffffff;
        border: none;
        border-radius: 12px;
        padding: 14px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        margin-top: 6px;
        box-shadow: 0 4px 16px rgba(124, 58, 237, 0.3);
      }

      #checkout-submit-btn:hover {
        background: linear-gradient(135deg, #8b5cf6, #7c3aed);
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4);
      }

      #checkout-submit-btn:active {
        transform: translateY(0);
      }

      #checkout-submit-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      /* Status/Spinner panel */
      #checkout-status-panel {
        position: absolute;
        inset: 0;
        background: rgba(17, 17, 21, 0.95);
        border-radius: 24px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        z-index: 10;
        transition: all 0.25s ease;
      }

      .status-panel-hidden {
        opacity: 0;
        pointer-events: none;
        visibility: hidden;
      }

      .status-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgba(124, 58, 237, 0.15);
        border-top-color: #7c3aed;
        border-radius: 50%;
        animation: co-spin 0.8s linear infinite;
      }

      @keyframes co-spin {
        to { transform: rotate(360deg); }
      }

      #checkout-status-message {
        font-weight: 600;
        font-size: 14px;
        color: #ffffff;
        margin: 0;
        text-align: center;
      }

      .checkout-footer {
        text-align: center;
        font-size: 11px;
        color: #4b5563;
        line-height: 1.4;
      }
    `,document.head.appendChild(e)}static _attachListeners(e,a){let i=a;e.querySelector("#premium-checkout-close").addEventListener("click",()=>{this.dismiss()}),e.addEventListener("click",r=>{r.target===e&&this.dismiss()});const t=e.querySelectorAll(".checkout-tier-card"),c=e.querySelector("#checkout-btn-label");t.forEach(r=>{r.addEventListener("click",()=>{t.forEach(f=>f.classList.remove("active")),r.classList.add("active"),i=r.dataset.tier;const s=i==="elite"?"Elite":"PRO";c&&(c.textContent=`Ativar ${s} (Demo)`)})});const n=e.querySelector("#checkout-submit-btn"),p=e.querySelector("#checkout-status-panel"),u=e.querySelector("#checkout-status-message");n.addEventListener("click",async()=>{n.disabled=!0,p.className="",u.textContent="Ativando plano...",await new Promise(s=>setTimeout(s,1e3)),h.dispatch(x.SET_TIER,{tier:i}),g.setItem("suplilist:tier",i);const r=i==="elite"?"Elite":"Pro";l.emit("toast:show",{message:`Parabéns! Sua assinatura SupliList ${r} foi ativada! 🎉`,type:"success",duration:3500}),l.emit("premium:unlocked",{tier:i}),this.dismiss()})}}d(v,"_activeOverlay",null);export{v as C};
