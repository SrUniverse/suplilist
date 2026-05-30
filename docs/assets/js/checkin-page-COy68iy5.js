import{s as n,e as l,A as p}from"./main-BNCydJh8.js";class x{constructor(e){this.container=e}mount(){this._render(),this._attachListeners()}unmount(){this.container.innerHTML=""}_getTodayStr(){return new Date().toISOString().split("T")[0]}_getCheckedIds(){const e=this._getTodayStr();return new Set(n.checkins.filter(t=>t.date===e).map(t=>t.supplementId))}_render(){const e=n.stack,t=n.calculateStreak(),r=this._getCheckedIds(),o=e.length,s=r.size,a=o>0&&s>=o,i=o>0?Math.round(s/o*100):0,c=new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"}),d=c.charAt(0).toUpperCase()+c.slice(1);this.container.innerHTML=`
      <div style="
        padding: 24px 16px 40px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        font-family: 'Inter', sans-serif;
      ">

        <!-- HEADER -->
        <header style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
          <div>
            <p style="
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: var(--color-text-secondary);
              margin: 0 0 6px;
            ">${d}</p>
            <h1 style="
              font-family: 'Syne', sans-serif;
              font-weight: 800;
              font-size: 30px;
              letter-spacing: -0.03em;
              color: var(--color-text-primary);
              margin: 0;
              line-height: 1.1;
            ">Check-in Diário</h1>
          </div>
          <!-- Streak badge -->
          <div style="
            display: flex;
            align-items: center;
            gap: 6px;
            background: rgba(124,58,237,0.15);
            border: 1px solid rgba(124,58,237,0.35);
            border-radius: 10px;
            padding: 8px 14px;
            flex-shrink: 0;
          ">
            <span style="font-size:20px;line-height:1;">🔥</span>
            <span style="
              font-weight: 800;
              font-size: 17px;
              color: var(--color-brand);
              letter-spacing: -0.02em;
              line-height: 1;
            ">${t} ${t===1?"dia":"dias"}</span>
          </div>
        </header>

        <!-- PROGRESS CARD -->
        ${o>0?this._progressCard(s,o,i,a):""}

        <!-- SUPPLEMENT LIST / EMPTY -->
        ${o===0?this._emptyStack():this._supplementList(e,r)}

        <!-- CHECK ALL BUTTON -->
        ${o>0&&!a?`
          <button id="btn-checkin-all" style="
            width: 100%;
            background: var(--color-brand);
            color: #fff;
            border: none;
            border-radius: 12px;
            padding: 16px;
            font-family: 'Inter', sans-serif;
            font-weight: 700;
            font-size: 15px;
            cursor: pointer;
            letter-spacing: 0.01em;
          ">✅ Marcar todos como feitos</button>
        `:""}

      </div>
    `}_progressCard(e,t,r,o){return`
      <div style="
        background: ${o?"rgba(34,197,94,0.08)":"var(--color-surface-primary)"};
        border: ${o?"1px solid rgba(34,197,94,0.30)":"1px solid var(--color-border)"};
        border-radius: 16px;
        padding: 24px 20px 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
      ">
        <!-- Percentage display -->
        <div style="
          font-family: 'Syne', sans-serif;
          font-size: 52px;
          font-weight: 800;
          letter-spacing: -0.04em;
          color: ${o?"var(--color-success)":"var(--color-text-primary)"};
          line-height: 1;
        ">${r}%</div>

        <!-- Progress bar -->
        <div style="
          width: 100%;
          height: 10px;
          background: var(--color-surface-hover);
          border-radius: 999px;
          overflow: hidden;
        ">
          <div style="
            height: 100%;
            width: ${r}%;
            background: ${o?"var(--color-success)":"var(--color-brand)"};
            border-radius: 999px;
            transition: width 0.5s ease;
          "></div>
        </div>

        <!-- Label -->
        <p style="
          font-size: 14px;
          color: var(--color-text-secondary);
          margin: 0;
          text-align: center;
        ">
          ${o?'<span style="color:var(--color-success);font-weight:700;">✅ Protocolo completo hoje!</span>':`<strong style="color:var(--color-text-primary);">${e}</strong> de <strong style="color:var(--color-text-primary);">${t}</strong> suplementos tomados hoje`}
        </p>
      </div>
    `}_supplementList(e,t){return`
      <section>
        <h2 style="
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.09em;
          color: var(--color-text-muted);
          margin: 0 0 12px;
        ">Seu Stack de Hoje</h2>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${e.map(r=>this._supplementCard(r,t.has(r.supplementId))).join("")}
        </div>
      </section>
    `}_supplementCard(e,t){const o=`/assets/${(e.slug||e.name||"").toLowerCase().replace(/\s+/g,"_").replace(/-/g,"_")}.png`,s=e.dosage?`${e.dosage}${e.unit||"g"}/dia`:"",a=e.dosage?.timing||e.timing||"";return`
      <div style="
        background: var(--color-surface-primary);
        border: 1px solid ${t?"rgba(34,197,94,0.35)":"var(--color-border)"};
        border-radius: 14px;
        padding: 14px 16px;
        display: flex;
        align-items: center;
        gap: 14px;
        transition: border-color 0.2s, background 0.2s;
        ${t?"background: rgba(34,197,94,0.05);":""}
      ">

        <!-- Checkbox circle -->
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid ${t?"var(--color-success)":"var(--color-brand)"};
          background: ${t?"var(--color-success)":"transparent"};
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          transition: all 0.25s ease;
        ">${t?"✓":""}</div>

        <!-- Supplement image -->
        <img
          src="${o}"
          alt="${e.name}"
          width="40"
          height="40"
          style="
            width: 40px;
            height: 40px;
            object-fit: contain;
            border-radius: 8px;
            background: var(--color-surface-secondary);
            flex-shrink: 0;
          "
          onerror="this.style.display='none'"
        />

        <!-- Info -->
        <div style="flex:1;min-width:0;">
          <div style="
            font-weight: 700;
            font-size: 15px;
            color: ${t?"var(--color-success)":"var(--color-text-primary)"};
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          ">${e.name}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:3px;flex-wrap:wrap;">
            ${s?`<span style="font-size:12px;color:var(--color-text-secondary);">${s}</span>`:""}
            ${a?`<span style="font-size:11px;color:var(--color-text-muted);">· ${a}</span>`:""}
          </div>
        </div>

        <!-- Action -->
        ${t?`<span style="
              font-size: 12px;
              color: var(--color-success);
              font-weight: 700;
              white-space: nowrap;
              flex-shrink: 0;
            ">Feito ✓</span>`:`<button
              class="btn-checkin-single"
              data-id="${e.supplementId}"
              data-name="${e.name}"
              style="
                background: var(--color-brand-muted);
                color: var(--color-brand);
                border: none;
                border-radius: 8px;
                padding: 9px 14px;
                font-family: 'Inter', sans-serif;
                font-weight: 700;
                font-size: 13px;
                cursor: pointer;
                white-space: nowrap;
                flex-shrink: 0;
                transition: background 0.15s;
              "
            >Marcar</button>`}
      </div>
    `}_emptyStack(){return`
      <div style="
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 16px;
        padding: 48px 24px;
        text-align: center;
      ">
        <div style="font-size:44px;margin-bottom:14px;">📋</div>
        <div style="
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 20px;
          color: var(--color-text-primary);
          margin-bottom: 8px;
        ">Stack vazio</div>
        <p style="
          font-size: 14px;
          color: var(--color-text-secondary);
          margin: 0 0 20px;
          line-height: 1.6;
        ">Adicione suplementos ao seu stack para começar a registrar check-ins diários.</p>
        <a href="#/my-stack" style="
          display: inline-block;
          background: var(--color-brand);
          color: #fff;
          text-decoration: none;
          font-weight: 700;
          font-size: 14px;
          padding: 12px 28px;
          border-radius: 10px;
        ">Ver Meu Stack</a>
      </div>
    `}_attachListeners(){this.container.querySelectorAll(".btn-checkin-single").forEach(t=>{t.addEventListener("click",r=>{r.stopPropagation(),this._doCheckin(t.dataset.id,t.dataset.name)})});const e=this.container.querySelector("#btn-checkin-all");e&&e.addEventListener("click",()=>{const t=this._getCheckedIds();n.stack.forEach(r=>{t.has(r.supplementId)||this._doCheckin(r.supplementId,r.name,!1)}),this._refresh(),l.emit("toast:show",{message:"🎉 Check-in completo!",type:"success"})})}_doCheckin(e,t,r=!0){n.dispatch(p.ADD_CHECKIN,{supplementId:e,date:this._getTodayStr()}),r&&l.emit("toast:show",{message:`✅ ${t} marcado!`,type:"success"}),this._refresh()}_refresh(){this._render(),this._attachListeners()}}export{x as default};
