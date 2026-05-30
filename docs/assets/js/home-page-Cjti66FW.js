import{s as n,A as g,e as u}from"./main-4ndHjxTB.js";import m,{SUPPLEMENTS_DB as f}from"./stack-recommender-nYYO0cNz.js";import{c as x}from"./dosage-calculator-CXjJtoIl.js";class _{constructor(e){this.container=e,this._listeners=[],this._slCheckinHandler=null}mount(){this._attachStyles(),this._render(),this._attachListeners(),this._slCheckinHandler=e=>{const{supplementId:t,supplementName:i}=e.detail??{};t&&(n.dispatch(g.ADD_CHECKIN,{supplementId:t,name:i,timestamp:Date.now()}),u.emit("toast:show",{message:`💊 ${i||"Suplemento"} registrado!`,type:"success"}),this._updateCheckinSection())},document.addEventListener("sl-checkin",this._slCheckinHandler)}unmount(){this._listeners.forEach(([e,t,i])=>e.removeEventListener(t,i)),this._listeners=[],this._slCheckinHandler&&(document.removeEventListener("sl-checkin",this._slCheckinHandler),this._slCheckinHandler=null)}_on(e,t,i){e.addEventListener(t,i),this._listeners.push([e,t,i])}_attachStyles(){if(document.getElementById("home-page-styles"))return;const e=document.createElement("style");e.id="home-page-styles",e.textContent=`
      #home-root {
        padding: 20px 16px 80px;
        display: flex; flex-direction: column; gap: 20px;
      }
      .hp-section-label {
        font-size: 11px; font-weight: 700; text-transform: uppercase;
        letter-spacing: 0.07em; color: var(--color-text-secondary); margin-bottom: 12px;
      }
      .hp-stats-grid {
        display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;
      }
      @media (min-width: 768px) {
        .hp-stats-grid { grid-template-columns: repeat(4, 1fr); }
      }
      .hp-stat-card {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 14px; padding: 14px 10px; text-align: center;
      }
      .hp-stat-icon  { font-size: 22px; margin-bottom: 4px; }
      .hp-stat-value { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
      .hp-stat-label {
        font-size: 10px; color: var(--color-text-secondary);
        text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px;
      }
      .hp-quick-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      @media (min-width: 480px) { .hp-quick-grid { grid-template-columns: repeat(4, 1fr); } }
      @keyframes hp-confetti-fall {
        0%   { transform: translateY(-10px) rotate(0deg);   opacity: 1; }
        100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
      }
      .hp-confetti-piece {
        position: fixed; top: -10px; width: 8px; height: 8px;
        border-radius: 2px; pointer-events: none; z-index: 9999;
        animation: hp-confetti-fall linear forwards;
      }
    `,document.head.appendChild(e)}_getData(){const e=n.user,t=n.stack,i=n.calculateStreak(),o=n.getTodayCheckins();let a=[];if(e.objective)try{a=m.recommend(e,3)}catch{}return{user:e,stack:t,streak:i,todayCheckins:o,topRecs:a}}_greeting(){const e=new Date().getHours();return e<12?"Bom dia":e<18?"Boa tarde":"Boa noite"}_calcAdherence(){const e=n.getState?.()?.checkins??n.checkins??[],t=n.stack;if(!e.length||!t.length)return 0;const i=Date.now()-7*864e5,o=e.filter(a=>a.timestamp>=i);return Math.min(100,Math.round(o.length/(t.length*7)*100))}_calcMonthlyInvestment(){const e=n.stack.reduce((t,i)=>t+parseFloat(i.monthlyPrice??i.price??0),0);return e>0?e.toFixed(2):null}_totalCheckins(){return(n.getState?.()?.checkins??n.checkins??[]).length}_celebrate(){const e=["#7C3AED","#22C55E","#F59E0B","#3B82F6","#EF4444","#EC4899"];for(let t=0;t<60;t++){const i=document.createElement("div");i.className="hp-confetti-piece",i.style.cssText=[`left:${Math.random()*100}vw`,`background:${e[Math.floor(Math.random()*e.length)]}`,`width:${6+Math.random()*8}px`,`height:${6+Math.random()*8}px`,`animation-duration:${1.2+Math.random()*1.5}s`,`animation-delay:${Math.random()*.5}s`].join(";"),document.body.appendChild(i),i.addEventListener("animationend",()=>i.remove())}}_updateCheckinSection(){const e=n.getTodayCheckins(),t=n.stack,i=this.container.querySelector("#home-checkin-section");if(!i)return;const o=t.length>0&&e.length>=t.length;i.innerHTML=o?this._checkedBanner(e.length,t.length):this._checkinCTA(),o&&this._celebrate()}_updateStackSection(){this._listeners.forEach(([e,t,i])=>e.removeEventListener(t,i)),this._listeners=[],this._render(),this._attachListeners()}_statCardHtml(e,t,i){return`
      <div class="hp-stat-card">
        <div class="hp-stat-icon">${e}</div>
        <div class="hp-stat-value">${t}</div>
        <div class="hp-stat-label">${i}</div>
      </div>`}_checkinCTA(){return`
      <div id="home-checkin-cta" style="background:linear-gradient(135deg,var(--color-brand),#6D28D9);border-radius:16px;padding:20px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;gap:12px;">
        <div>
          <div style="font-weight:700;font-size:16px;color:#fff;">Check-in de hoje</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:2px;">Você ainda não registrou sua adesão</div>
        </div>
        <div style="background:rgba(255,255,255,0.2);border-radius:10px;padding:10px 16px;font-weight:700;font-size:14px;color:#fff;white-space:nowrap;">Fazer ✓</div>
      </div>`}_checkedBanner(e,t){return`
      <div style="background:var(--color-success-bg);border:1px solid rgba(34,197,94,0.3);border-radius:14px;padding:16px;display:flex;align-items:center;gap:12px;">
        <span style="font-size:28px;">🎯</span>
        <div>
          <div style="font-weight:700;color:var(--color-success);">Check-in completo!</div>
          <div style="font-size:13px;color:var(--color-text-secondary);margin-top:2px;">${e} de ${t} suplemento(s) hoje</div>
        </div>
      </div>`}_suggestionCard(e){const t=e[0],i=JSON.stringify(e.map(o=>o.id));return`
      <section>
        <p class="hp-section-label">⚡ Sugestão de IA</p>
        <div style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-left:3px solid var(--color-brand);border-radius:14px;padding:18px;">
          <div style="font-weight:700;font-size:16px;margin-bottom:6px;">${t.name}</div>
          <div style="font-size:13px;color:var(--color-text-secondary);line-height:1.5;margin-bottom:12px;">
            ${t.benefits?.[0]||"Baseado no seu perfil e objetivo."}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
            ${e.map(o=>`<span style="background:var(--color-brand-muted);color:var(--color-brand);font-size:12px;font-weight:600;padding:4px 10px;border-radius:20px;">${o.name}</span>`).join("")}
          </div>
          <button id="btn-add-suggestion" data-sup-ids='${i}'
            style="width:100%;background:var(--color-brand);color:#fff;border:none;border-radius:10px;padding:11px;font-weight:700;font-size:14px;cursor:pointer;">
            Adicionar ao Stack
          </button>
        </div>
      </section>`}_emptyStateCard(e){return e?"":`
      <div style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:16px;padding:32px 20px;text-align:center;">
        <div style="font-size:40px;margin-bottom:12px;">🚀</div>
        <div style="font-weight:700;font-size:17px;margin-bottom:8px;">Monte seu stack</div>
        <div style="font-size:14px;color:var(--color-text-secondary);line-height:1.5;margin-bottom:16px;">Configure seu perfil e explore o catálogo para recomendações de IA.</div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
          <a href="#/profile" style="display:inline-block;background:var(--color-surface-hover);border:1px solid var(--color-border);color:var(--color-text-primary);text-decoration:none;font-weight:700;font-size:14px;padding:11px 20px;border-radius:10px;">Configurar Perfil</a>
          <a href="#/list"    style="display:inline-block;background:var(--color-brand);color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:11px 20px;border-radius:10px;">Ver Catálogo</a>
        </div>
      </div>`}_quickAction(e,t,i,o){return`
      <a href="${e}" style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:14px;padding:16px;text-decoration:none;color:inherit;display:flex;flex-direction:column;gap:6px;">
        <span style="font-size:22px;">${t}</span>
        <div style="font-weight:700;font-size:14px;">${i}</div>
        <div style="font-size:12px;color:var(--color-text-secondary);">${o}</div>
      </a>`}_stackPreview(e){return`
      <section>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <p class="hp-section-label" style="margin:0;">Meu Stack</p>
          <a href="#/my-stack" style="font-size:13px;color:var(--color-brand);text-decoration:none;font-weight:600;">Ver tudo</a>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${e.map(t=>`
            <div style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:12px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;">
              <div>
                <div style="font-weight:600;font-size:15px;">${t.name}</div>
                ${t.dosage?`<div style="font-size:12px;color:var(--color-text-secondary);margin-top:2px;">${t.dosage}${t.unit||"g"} · ${t.frequency||"diário"}</div>`:""}
              </div>
              <span style="font-size:20px;">💊</span>
            </div>`).join("")}
        </div>
      </section>`}_render(){const{user:e,stack:t,streak:i,todayCheckins:o,topRecs:a}=this._getData(),r=e.name?e.name.split(" ")[0]:null,s=t.length>0,d=o.length,h=this._calcAdherence(),c=this._totalCheckins(),p=this._calcMonthlyInvestment();this.container.innerHTML=`
      <div id="home-root">

        <header>
          <p style="color:var(--color-text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:0.07em;">${this._greeting()}</p>
          <h1 style="font-size:26px;font-weight:800;letter-spacing:-0.02em;margin-top:2px;">
            ${r?`Olá, ${r} 👋`:"Seu Painel"}
          </h1>
        </header>

        <section>
          <div class="hp-stats-grid">
            ${this._statCardHtml("🔥",i,"Streak")}
            ${this._statCardHtml("💊",t.length,"No Stack")}
            ${this._statCardHtml("📊",h+"%","Aderência")}
            ${p?this._statCardHtml("💰","R$ "+p,"Mês"):this._statCardHtml("✅",c,"Check-ins")}
          </div>
        </section>

        <div id="home-checkin-section">
          ${s&&d===0?this._checkinCTA():""}
          ${s&&d>0?this._checkedBanner(d,t.length):""}
        </div>

        ${a.length>0?this._suggestionCard(a):this._emptyStateCard(s)}

        <section>
          <p class="hp-section-label">Ações Rápidas</p>
          <div class="hp-quick-grid">
            ${this._quickAction("#/list","🔍","Catálogo","Explorar suplementos")}
            ${this._quickAction("#/stack","⚗️","Calculadora","Dosagem personalizada")}
            ${this._quickAction("#/checkin","📋","Check-in","Adesão de hoje")}
            ${this._quickAction("#/history","📈","Histórico","Ver evolução")}
          </div>
        </section>

        ${s?this._stackPreview(t.slice(0,3)):""}

      </div>
    `}_attachListeners(){const e=this.container.querySelector("#home-checkin-cta");e&&this._on(e,"click",()=>{window.location.hash="#/checkin"});const t=this.container.querySelector("#btn-confirm-all-checkin");t&&this._on(t,"click",()=>{const a=n.getTodayCheckins(),r=n.stack.filter(s=>!a.some(d=>d.supplementId===s.supplementId));r.forEach(s=>{n.dispatch(g.ADD_CHECKIN,{supplementId:s.supplementId,name:s.name,timestamp:Date.now()})}),r.length>0&&(u.emit("toast:show",{message:`✅ ${r.length} check-in(s) registrados!`,type:"success"}),this._updateCheckinSection())});const i=this.container.querySelector("#btn-enable-notifications");i&&this._on(i,"click",async()=>{if(!("Notification"in window))return;const a=await Notification.requestPermission();u.emit("toast:show",{message:a==="granted"?"🔔 Notificações ativadas!":"Permissão negada.",type:a==="granted"?"success":"warning"})});const o=this.container.querySelector("#btn-add-suggestion");o&&this._on(o,"click",()=>{const a=JSON.parse(o.dataset.supIds||"[]"),r=n.user;let s=0;a.forEach(h=>{const c=f.find(l=>l.id===h);if(!c||n.stack.some(l=>l.supplementId===h))return;let p=c.dosage?.maintenance;try{const l=x.calculate(c,r);l?.daily&&(p=l.daily)}catch{}n.dispatch(g.ADD_TO_STACK,{supplementId:c.id,name:c.name,dosage:p,unit:c.dosage?.unit||"g",frequency:"diário"}),s++});const d=s>0?`✅ ${s} suplemento(s) adicionados!`:"Suplementos já estão no seu stack.";u.emit("toast:show",{message:d,type:s>0?"success":"info"}),s>0&&this._updateStackSection()})}}export{_ as default};
