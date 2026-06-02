import{t as g,s as n,A as d,e as p}from"./main-CflUif-F.js";import{S as f}from"./stack-recommender-L2OG55lm.js";import{e as l}from"./escape-Br5wU8qn.js";class v{constructor(e){this.container=e,this._internalNavHandler=null}mount(){this._render(),this._attachListeners(),this._internalNavHandler=e=>{const t=e.target.closest("[data-nav-internal]");if(!t)return;e.preventDefault();const a=t.getAttribute("data-nav-internal");window.history.pushState(null,null,a),window.dispatchEvent(new PopStateEvent("popstate"))},this.container.addEventListener("click",this._internalNavHandler)}unmount(){this._internalNavHandler&&(this.container.removeEventListener("click",this._internalNavHandler),this._internalNavHandler=null),this.container.innerHTML=""}_getTodayStr(){return g()}_getCheckedIds(){const e=this._getTodayStr();return new Set(n.checkins.filter(t=>t.date===e).map(t=>t.supplementId))}_render(){const e=n.stack,t=n.calculateStreak(),a=this._getCheckedIds(),r=e.length,o=a.size,s=r>0&&o>=r,i=r>0?Math.round(o/r*100):0,c=new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"}),h=c.charAt(0).toUpperCase()+c.slice(1);this.container.innerHTML=`
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
            ">${h}</p>
            <h1 style="
              font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
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
        ${r>0?this._progressCard(o,r,i,s):""}

        <!-- SUPPLEMENT LIST / EMPTY -->
        ${r===0?this._emptyStack():this._supplementList(e,a)}

        <!-- CHECK ALL BUTTON -->
        ${r>0&&!s?`
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
    `}_progressCard(e,t,a,r){return`
      <div style="
        background: ${r?"rgba(34,197,94,0.08)":"var(--color-surface-primary)"};
        border: ${r?"1px solid rgba(34,197,94,0.30)":"1px solid var(--color-border)"};
        border-radius: 16px;
        padding: 24px 20px 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
      ">
        <!-- Percentage display -->
        <div style="
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: 52px;
          font-weight: 800;
          letter-spacing: -0.04em;
          color: ${r?"var(--color-success)":"var(--color-text-primary)"};
          line-height: 1;
        ">${a}%</div>

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
            width: ${a}%;
            background: ${r?"var(--color-success)":"var(--color-brand)"};
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
          ${r?'<span style="color:var(--color-success);font-weight:700;">✅ Protocolo completo hoje!</span>':`<strong style="color:var(--color-text-primary);">${e}</strong> de <strong style="color:var(--color-text-primary);">${t}</strong> suplementos tomados hoje`}
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
          ${e.map(a=>this._supplementCard(a,t.has(a.supplementId))).join("")}
        </div>
      </section>
    `}_supplementCard(e,t){const r=f.find(i=>i.id===e.supplementId)?.image||`/assets/${(e.supplementId||"").replace(/-/g,"_")}.png`,o=e.dosage?`${e.dosage}${e.unit||"g"}/dia`:"",s=e.timing||"";return`
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
          src="${r}"
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
          ">${l(e.name)}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:3px;flex-wrap:wrap;">
            ${o?`<span style="font-size:12px;color:var(--color-text-secondary);">${o}</span>`:""}
            ${s?`<span style="font-size:11px;color:var(--color-text-muted);">· ${s}</span>`:""}
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
              data-id="${l(e.supplementId)}"
              data-name="${l(e.name)}"
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
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
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
        <a href="/my-stack" data-nav-internal="/my-stack" style="
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
    `}_attachListeners(){this.container.querySelectorAll(".btn-checkin-single").forEach(t=>{t.addEventListener("click",a=>{a.stopPropagation(),this._doCheckin(t.dataset.id,t.dataset.name)})});const e=this.container.querySelector("#btn-checkin-all");e&&e.addEventListener("click",()=>{const t=this._getCheckedIds(),a=this._getTodayStr();n.stack.forEach(r=>{t.has(r.supplementId)||n.dispatch(d.ADD_CHECKIN,{supplementId:r.supplementId,date:a})}),this._refresh(),p.emit("toast:show",{message:"🎉 Check-in completo!",type:"success"})})}_doCheckin(e,t,a=!0){n.dispatch(d.ADD_CHECKIN,{supplementId:e,date:this._getTodayStr()}),a&&p.emit("toast:show",{message:`✅ ${t} marcado!`,type:"success"}),this._refresh()}_refresh(){this._render(),this._attachListeners()}}export{v as default};
