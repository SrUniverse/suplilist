import{s as n,e as i,A as s}from"./main-CfwEDZr2.js";class l{constructor(o){this.container=o}mount(){this._render(),this._attachListeners()}unmount(){this.container.innerHTML=""}_getTodayStr(){return new Date().toISOString().split("T")[0]}_getCheckedIds(){const o=this._getTodayStr();return new Set(n.checkins.filter(e=>e.date===o).map(e=>e.supplementId))}_render(){const o=n.stack,e=n.calculateStreak(),t=this._getCheckedIds(),r=o.length>0&&t.size>=o.length,a=new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"});this.container.innerHTML=`
      <div style="padding:20px 16px;display:flex;flex-direction:column;gap:20px;padding-bottom:32px;">

        <header>
          <p style="color:var(--color-text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:0.07em;">${a}</p>
          <h1 style="font-size:26px;font-weight:800;letter-spacing:-0.02em;margin-top:2px;">Check-in</h1>
        </header>

        <!-- Streak Banner -->
        <div style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:16px;padding:20px;display:flex;align-items:center;gap:16px;">
          <div style="font-size:44px;line-height:1;">${e>0?"🔥":"⏳"}</div>
          <div>
            <div style="font-size:28px;font-weight:800;letter-spacing:-0.02em;">${e} ${e===1?"dia":"dias"}</div>
            <div style="font-size:13px;color:var(--color-text-secondary);margin-top:2px;">
              ${e===0?"Comece o seu streak hoje!":e<7?"Ótimo começo! Continue!":e<30?"Sequência incrível! 🚀":"Lendário! 🏆"}
            </div>
          </div>
        </div>

        ${r?this._allDoneBanner():""}

        <!-- Supplement List -->
        ${o.length===0?this._emptyStack():this._supplementList(o,t)}

        <!-- Check-in All Button -->
        ${o.length>0&&!r?`
          <button id="btn-checkin-all" style="width:100%;background:var(--color-brand);color:#fff;border:none;border-radius:14px;padding:16px;font-weight:700;font-size:16px;cursor:pointer;margin-top:4px;">
            ✅ Marcar todos como feitos
          </button>
        `:""}

      </div>
    `}_supplementList(o,e){return`
      <section>
        <h2 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--color-text-secondary);margin-bottom:12px;">
          Seu Stack de Hoje — ${e.size}/${o.length} marcados
        </h2>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${o.map(t=>{const r=e.has(t.supplementId);return`
              <div style="
                background:var(--color-surface-primary);
                border:1px solid ${r?"rgba(34,197,94,0.4)":"var(--color-border)"};
                border-radius:14px;
                padding:16px;
                display:flex;
                align-items:center;
                gap:14px;
                cursor:${r?"default":"pointer"};
                transition:border-color 0.2s,background 0.2s;
              ">
                <div style="
                  width:28px;height:28px;border-radius:50%;flex-shrink:0;
                  display:flex;align-items:center;justify-content:center;
                  font-size:16px;
                  border:2px solid ${r?"var(--color-success)":"var(--color-border)"};
                  background:${r?"var(--color-success)":"transparent"};
                  color:#fff;
                  transition:all 0.2s;
                ">
                  ${r?"✓":""}
                </div>
                <div style="flex:1;min-width:0;">
                  <div style="font-weight:700;font-size:15px;${r?"color:var(--color-success);":""}">${t.name}</div>
                  ${t.dosage?`<div style="font-size:12px;color:var(--color-text-secondary);margin-top:2px;">${t.dosage}${t.unit||"g"} · ${t.frequency||"diário"}</div>`:""}
                </div>
                ${r?'<span style="font-size:12px;color:var(--color-success);font-weight:600;white-space:nowrap;">Feito ✓</span>':`<button class="btn-checkin-single" data-id="${t.supplementId}" data-name="${t.name}" style="background:var(--color-brand-muted);color:var(--color-brand);border:none;border-radius:8px;padding:8px 12px;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap;">Marcar</button>`}
              </div>
            `}).join("")}
        </div>
      </section>
    `}_allDoneBanner(){return`
      <div style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);border-radius:14px;padding:20px;text-align:center;">
        <div style="font-size:36px;margin-bottom:8px;">🎉</div>
        <div style="font-weight:700;font-size:17px;color:var(--color-success);">Tudo feito hoje!</div>
        <div style="font-size:13px;color:var(--color-text-secondary);margin-top:4px;">Seu streak continua. Até amanhã!</div>
      </div>
    `}_emptyStack(){return`
      <div style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:16px;padding:40px 20px;text-align:center;">
        <div style="font-size:40px;margin-bottom:12px;">📋</div>
        <div style="font-weight:700;font-size:17px;margin-bottom:8px;">Stack vazio</div>
        <div style="font-size:14px;color:var(--color-text-secondary);margin-bottom:16px;line-height:1.5;">
          Adicione suplementos ao seu stack para começar a registrar check-ins.
        </div>
        <a href="#/list" style="display:inline-block;background:var(--color-brand);color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:10px;">Ir ao Catálogo</a>
      </div>
    `}_attachListeners(){this.container.querySelectorAll(".btn-checkin-single").forEach(e=>{e.addEventListener("click",t=>{t.stopPropagation(),this._doCheckin(e.dataset.id,e.dataset.name)})});const o=this.container.querySelector("#btn-checkin-all");o&&o.addEventListener("click",()=>{const e=this._getCheckedIds();n.stack.forEach(t=>{e.has(t.supplementId)||this._doCheckin(t.supplementId,t.name,!1)}),this._refresh(),i.emit("toast:show",{message:"🎉 Check-in completo!",type:"success"})})}_doCheckin(o,e,t=!0){n.dispatch(s.ADD_CHECKIN,{supplementId:o,date:this._getTodayStr()}),t&&i.emit("toast:show",{message:`✅ ${e} marcado!`,type:"success"}),this._refresh()}_refresh(){this._render(),this._attachListeners()}}export{l as default};
