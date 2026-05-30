import{s as r}from"./main-CfwEDZr2.js";class x{constructor(e){this.container=e,this._unsub=null}mount(){this._injectStyles(),this._render(),this._unsub=r.subscribe(()=>this._render())}unmount(){this._unsub&&(this._unsub(),this._unsub=null)}_injectStyles(){if(document.getElementById("home-page-styles"))return;const e=document.createElement("style");e.id="home-page-styles",e.textContent=`
      #home-root {
        padding: 20px 16px 80px;
        display: flex; flex-direction: column; gap: 20px;
      }
      .hp-section-label {
        font-size: 11px; font-weight: 700; text-transform: uppercase;
        letter-spacing: 0.07em; color: var(--color-text-secondary); margin-bottom: 12px;
      }
      .hp-stats-grid {
        display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
      }
      .hp-stat-card {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 14px; padding: 14px 10px; text-align: center;
      }
      .hp-stat-icon  { font-size: 22px; margin-bottom: 4px; }
      .hp-stat-value { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; color: var(--color-text-primary); }
      .hp-stat-label {
        font-size: 10px; color: var(--color-text-secondary);
        text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px;
      }
      .hp-quick-grid {
        display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
      }
      @media (min-width: 480px) { .hp-quick-grid { grid-template-columns: repeat(4, 1fr); } }
    `,document.head.appendChild(e)}_greeting(){const e=new Date().getHours();return e<12?"Bom dia":e<18?"Boa tarde":"Boa noite"}_calcAdherence(e,t){if(!e.length)return 0;const o=Date.now()-7*864e5,i=t.filter(n=>n.timestamp>=o);return Math.min(100,Math.round(i.length/(e.length*7)*100))}_statCard(e,t,o){return`
      <div class="hp-stat-card">
        <div class="hp-stat-icon">${e}</div>
        <div class="hp-stat-value">${t}</div>
        <div class="hp-stat-label">${o}</div>
      </div>`}_quickAction(e,t,o,i){return`
      <a href="${e}" style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:14px;padding:16px;text-decoration:none;color:inherit;display:flex;flex-direction:column;gap:6px;">
        <span style="font-size:22px;">${t}</span>
        <div style="font-weight:700;font-size:14px;">${o}</div>
        <div style="font-size:12px;color:var(--color-text-secondary);">${i}</div>
      </a>`}_render(){const e=r.user,t=r.stack,o=r.calculateStreak(),i=r.getTodayCheckins?r.getTodayCheckins():[],n=r.getState?.()?.checkins??r.checkins??[],l=this._calcAdherence(t,n),a=i.length,s=t.length>0,c=e?.name?e.name.split(" ")[0]:null,p=s?a>=t.length?`
          <div style="background:var(--color-surface-primary);border:1px solid var(--color-success);border-radius:14px;padding:16px;display:flex;align-items:center;gap:12px;">
            <span style="font-size:28px;">🎯</span>
            <div>
              <div style="font-weight:700;color:var(--color-success);">Check-in completo!</div>
              <div style="font-size:13px;color:var(--color-text-secondary);margin-top:2px;">${a} de ${t.length} suplemento(s) hoje</div>
            </div>
          </div>`:`
        <div id="hp-checkin-cta" style="background:linear-gradient(135deg,var(--color-brand),#6D28D9);border-radius:16px;padding:20px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;gap:12px;">
          <div>
            <div style="font-weight:700;font-size:16px;color:#fff;">Check-in de hoje</div>
            <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:2px;">
              ${a>0?`${a} de ${t.length} registrados`:"Você ainda não registrou sua adesão"}
            </div>
          </div>
          <div style="background:rgba(255,255,255,0.2);border-radius:10px;padding:10px 16px;font-weight:700;font-size:14px;color:#fff;white-space:nowrap;">Fazer ✓</div>
        </div>`:"",h=s?"":`
      <div style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:16px;padding:32px 20px;text-align:center;">
        <div style="font-size:40px;margin-bottom:12px;">🚀</div>
        <div style="font-weight:700;font-size:17px;margin-bottom:8px;">Monte seu stack</div>
        <div style="font-size:14px;color:var(--color-text-secondary);line-height:1.5;margin-bottom:16px;">Explore o catálogo e adicione seus primeiros suplementos.</div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
          <a href="#/list" style="display:inline-block;background:var(--color-brand);color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:11px 20px;border-radius:10px;">Ver Catálogo</a>
          <a href="#/profile" style="display:inline-block;background:var(--color-surface-primary);border:1px solid var(--color-border);color:var(--color-text-primary);text-decoration:none;font-weight:700;font-size:14px;padding:11px 20px;border-radius:10px;">Configurar Perfil</a>
        </div>
      </div>`;this.container.innerHTML=`
      <div id="home-root">

        <header>
          <p style="color:var(--color-text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:0.07em;">${this._greeting()}</p>
          <h1 style="font-size:26px;font-weight:800;letter-spacing:-0.02em;margin-top:2px;color:var(--color-text-primary);">
            ${c?`Olá, ${c} 👋`:"Seu Painel"}
          </h1>
        </header>

        <section>
          <div class="hp-stats-grid">
            ${this._statCard("🔥",o,"Streak")}
            ${this._statCard("💊",t.length,"No Stack")}
            ${this._statCard("📊",l+"%","Aderência")}
          </div>
        </section>

        ${p}

        ${h}

        <section>
          <p class="hp-section-label">Ações Rápidas</p>
          <div class="hp-quick-grid">
            ${this._quickAction("#/list","🔍","Catálogo","Explorar suplementos")}
            ${this._quickAction("#/my-stack","📦","Meu Stack","Gerenciar stack")}
            ${this._quickAction("#/checkin","📋","Check-in","Adesão de hoje")}
            ${this._quickAction("#/history","📈","Histórico","Ver evolução")}
          </div>
        </section>

      </div>
    `;const d=this.container.querySelector("#hp-checkin-cta");d&&d.addEventListener("click",()=>{window.location.hash="#/checkin"})}}export{x as default};
