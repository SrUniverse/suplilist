import{s as z,t as B,o as D}from"./main-CJX8mWV_.js";import{S as N}from"./stack-recommender-U9Cbt9HQ.js";import{e as h}from"./escape-Br5wU8qn.js";const F=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"],E=c=>{if(!c)return"";const[o,i]=c.split("-");return`${F[parseInt(i,10)-1]} ${o}`},Q=["Todos","Força & Performance","Proteínas","Vitaminas & Minerais","Adaptógenos & Foco","Cognição & Neuroproteção","Saúde Hormonal","Antioxidantes & Anti-inflamatórios","Sono & Recuperação","Saúde Geral"],R=()=>{const c={};for(const o of N)c[o.id]=o;return c},q=(c,o)=>{let i=0;for(const a of c){const u=a.supplementId??a.id,r=o[u];if(r&&r.dosage&&r.pricePerGram){const g=r.dosage.maintenance||5,d=(r.dosage.unit||"g").toLowerCase();let n;if(d==="g")n=g;else if(d==="mg")n=g/1e3;else if(d==="mcg")n=g/1e6;else continue;i+=n*r.pricePerGram}}return i};class U{constructor(o){this.container=o,this._unsubscribe=null,this._searchQuery="",this._activeCategory="Todos",this._expandedCards=new Set}mount(){this._injectStyles(),this._render(),this._unsubscribe=z.subscribe(()=>this._render())}unmount(){this._unsubscribe?.()}_injectStyles(){if(document.getElementById("history-page-styles-v2"))return;const o=document.createElement("style");o.id="history-page-styles-v2",o.textContent=`
      .hp-root { padding: 20px 16px 100px; display: flex; flex-direction: column; gap: 20px; font-family: 'Inter', sans-serif; }

      /* Stats grid */
      .hp-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
      .hp-stat-card {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 16px;
        padding: 16px 14px;
        display: flex; flex-direction: column; gap: 6px;
      }
      .hp-stat-icon {
        width: 28px; height: 28px;
        display: flex; align-items: center; justify-content: center;
        border-radius: 8px;
        background: var(--color-brand-muted);
        color: var(--color-brand);
        flex-shrink: 0;
        margin-bottom: 2px;
      }
      .hp-stat-label { font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
      .hp-stat-value { font-size: 26px; font-weight: 800; color: var(--color-text-primary); line-height: 1.1; font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; }
      .hp-stat-sub { font-size: 11px; color: var(--color-text-muted); }
      .hp-stat-sub.positive { color: var(--color-success); font-weight: 600; }
      .hp-progress-bar {
        height: 4px; border-radius: 2px;
        background: var(--color-border);
        overflow: hidden; margin-top: 4px;
      }
      .hp-progress-fill {
        height: 100%; border-radius: 2px;
        background: var(--color-brand);
        transition: width 0.6s ease;
      }

      /* Calendar row */
      .hp-calendar {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 16px;
        padding: 16px;
        display: flex; flex-direction: column; gap: 10px;
      }
      .hp-calendar-title { font-size: 12px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.6px; }
      .hp-calendar-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
      .hp-day-col { display: flex; flex-direction: column; align-items: center; gap: 4px; }
      .hp-day-label { font-size: 10px; color: var(--color-text-muted); font-weight: 600; }
      .hp-day-dot {
        width: 32px; height: 32px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 11px; font-weight: 700;
        transition: transform 0.15s;
      }
      .hp-day-dot.filled { background: var(--color-brand); color: #fff; }
      .hp-day-dot.today-filled { background: var(--color-brand); color: #fff; box-shadow: 0 0 0 2px rgba(124,58,237,0.4); }
      .hp-day-dot.empty { background: var(--color-bg-primary); border: 2px solid var(--color-border); color: var(--color-text-muted); }
      .hp-day-dot.today-empty { border-color: var(--color-brand); color: var(--color-brand); }

      /* Search */
      .hp-search-input {
        width: 100%; box-sizing: border-box;
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 12px; padding: 10px 14px;
        font-size: 14px; color: var(--color-text-primary);
        font-family: 'Inter', sans-serif;
        outline: none;
      }
      .hp-search-input::placeholder { color: var(--color-text-muted); }
      .hp-search-input:focus { border-color: var(--color-brand); }

      /* Category chips */
      .hp-chips { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 2px; scrollbar-width: none; }
      .hp-chips::-webkit-scrollbar { display: none; }
      .hp-chip {
        flex-shrink: 0;
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 20px; padding: 6px 14px;
        font-size: 12px; font-weight: 600;
        color: var(--color-text-secondary);
        cursor: pointer; white-space: nowrap;
        transition: all 0.15s;
      }
      .hp-chip.active { background: var(--color-brand); border-color: var(--color-brand); color: #fff; }
      .hp-chip:hover:not(.active) { border-color: var(--color-border-strong); color: var(--color-text-primary); }

      /* Supplement history card */
      .hp-sup-card {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 16px;
        overflow: hidden;
        transition: border-color 0.15s;
      }
      .hp-sup-card:hover { border-color: var(--color-border-strong); }
      .hp-sup-header {
        display: flex; align-items: center; gap: 12px;
        padding: 14px 16px; cursor: pointer;
      }
      .hp-sup-img {
        width: 50px; height: 50px; border-radius: 10px;
        object-fit: cover;
        background: var(--color-surface-secondary);
        flex-shrink: 0;
      }
      .hp-sup-img-placeholder {
        width: 50px; height: 50px; border-radius: 10px;
        background: var(--color-surface-secondary);
        border: 1px solid var(--color-border);
        display: flex; align-items: center; justify-content: center;
        font-size: 20px; flex-shrink: 0;
      }
      .hp-sup-info { flex: 1; min-width: 0; }
      .hp-sup-name { font-size: 15px; font-weight: 700; color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .hp-sup-meta { display: flex; align-items: center; gap: 6px; margin-top: 3px; flex-wrap: wrap; }
      .hp-sup-range { font-size: 12px; color: var(--color-text-muted); }
      .hp-adherence { font-size: 12px; font-weight: 700; }
      .hp-adherence.green { color: var(--color-success); }
      .hp-adherence.yellow { color: var(--color-warning); }
      .hp-adherence.red { color: var(--color-error); }
      .hp-badge-cat {
        font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 5px;
        background: var(--color-brand-muted); color: var(--color-brand);
        text-transform: uppercase;
      }
      .hp-expand-btn {
        font-size: 12px; color: var(--color-brand); font-weight: 600;
        background: none; border: none; cursor: pointer; white-space: nowrap;
        padding: 0; flex-shrink: 0;
      }
      .hp-logs-panel { padding: 0 16px 14px; display: none; flex-direction: column; gap: 6px; }
      .hp-logs-panel.open { display: flex; }
      .hp-log-date { font-size: 13px; color: var(--color-text-secondary); padding: 4px 0; border-bottom: 1px solid var(--color-border); }
      .hp-log-date:last-child { border-bottom: none; }

      /* Empty state */
      .hp-empty {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 16px;
        padding: 48px 24px; text-align: center;
        display: flex; flex-direction: column; align-items: center; gap: 12px;
      }
      .hp-empty-icon { font-size: 40px; }
      .hp-empty-title { font-size: 16px; font-weight: 700; color: var(--color-text-primary); }
      .hp-empty-sub { font-size: 14px; color: var(--color-text-secondary); }
      .hp-cta-btn {
        background: var(--color-brand); color: #fff;
        border: none; border-radius: 10px; padding: 10px 20px;
        font-size: 14px; font-weight: 600; cursor: pointer;
        font-family: 'Inter', sans-serif;
        margin-top: 4px;
      }
      .hp-section-title { font-size: 13px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    `,document.head.appendChild(o)}_render(){const o=z.getState(),i=o.checkins||[],a=o.stack||[],u=R(),r=B(),g=30,d=new Set(i.map(t=>t.date).filter(Boolean)),n=d.size;let C=0;for(let t=0;t<g;t++)d.has(D(t))&&C++;const S=Math.round(C/g*100),L=(q(a,u)*n).toFixed(2).replace(".",","),M=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"],_=[];for(let t=6;t>=0;t--){const e=D(t),s=new Date(e+"T12:00:00");_.push({iso:e,label:M[s.getDay()],isToday:t===0,hasCk:d.has(e),dayNum:s.getDate()})}const f={};for(const t of i){const e=t.supplementId||"unknown";f[e]||(f[e]=[]),f[e].push(t.date||"")}let l=Object.entries(f).map(([t,e])=>{const s=u[t],p=[...new Set(e)].filter(Boolean).sort(),v=p[0]||"",x=p[p.length-1]||"",y=p.length,k=v?Math.max(1,Math.ceil((new Date(r+"T12:00:00")-new Date(v+"T12:00:00"))/864e5)+1):1,b=Math.min(k,30),$=Math.round(y/b*100);return{sid:t,name:s?.name||t,category:s?.category||"",image:s?.image||null,firstDate:v,lastDate:x,totalDays:y,totalPossible:b,adPct:$,dates:p.reverse(),lastCheckin:x}});l.sort((t,e)=>e.lastCheckin.localeCompare(t.lastCheckin));const w=this._searchQuery.toLowerCase().trim();if(w&&(l=l.filter(t=>t.name.toLowerCase().includes(w)||t.category.toLowerCase().includes(w))),this._activeCategory!=="Todos"){const t=this._activeCategory.toLowerCase();l=l.filter(e=>{const s=(e.category||"").toLowerCase();return s===t?!0:t==="saúde geral"?["saúde cardiovascular","saúde articular & pele","saúde intestinal","queima de gordura & recovery"].includes(s):t==="cognição & neuroproteção"?s==="energéticos & foco":!1})}const P=`
      <div class="hp-stats">
        <div class="hp-stat-card">
          <div class="hp-stat-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <span class="hp-stat-label">Média de Adesão</span>
          <span class="hp-stat-value">${S}<span style="font-size:16px;font-weight:600;color:var(--color-text-muted)">%</span></span>
          <div class="hp-progress-bar">
            <div class="hp-progress-fill" style="width:${S}%"></div>
          </div>
        </div>
        <div class="hp-stat-card">
          <div class="hp-stat-icon" style="background:rgba(34,197,94,0.12);color:#22C55E;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <span class="hp-stat-label">Total de Ciclos</span>
          <span class="hp-stat-value">${n}</span>
          <span class="hp-stat-sub${n>0?" positive":""}">
            ${n>0?"+"+Math.min(n,2)+" no último trimestre":"Nenhum ciclo registrado"}
          </span>
        </div>
        <div class="hp-stat-card">
          <div class="hp-stat-icon" style="background:rgba(234,179,8,0.12);color:#EAB308;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <span class="hp-stat-label">Investimento Total Est.</span>
          <span class="hp-stat-value" style="font-size:20px;">R$ ${L}</span>
          <span class="hp-stat-sub">Calculado com base nos logs</span>
        </div>
      </div>
    `,I=`
      <div class="hp-calendar">
        <div class="hp-calendar-title">Últimos 7 dias</div>
        <div class="hp-calendar-row">
          ${_.map(t=>{const e=t.hasCk?t.isToday?"today-filled":"filled":t.isToday?"today-empty":"empty";return`
              <div class="hp-day-col">
                <div class="hp-day-label">${t.label}</div>
                <div class="hp-day-dot ${e}">${t.dayNum}</div>
              </div>
            `}).join("")}
        </div>
      </div>
    `,T=`
      <div style="display:flex;flex-direction:column;gap:10px;">
        <input
          type="search"
          class="hp-search-input"
          placeholder="Buscar suplemento..."
          value="${h(this._searchQuery)}"
          id="hp-search"
        />
        <div class="hp-chips">
          ${Q.map(t=>`
            <button class="hp-chip ${this._activeCategory===t?"active":""}" data-cat="${t}">${t}</button>
          `).join("")}
        </div>
      </div>
    `;let m;if(i.length===0)m=`
        <div class="hp-empty">
          <div class="hp-empty-icon">📋</div>
          <div class="hp-empty-title">Nenhum check-in registrado ainda</div>
          <div class="hp-empty-sub">Registre seus suplementos diários para acompanhar sua constância.</div>
          <button class="hp-cta-btn" id="hp-cta-checkin">Fazer Check-in Agora</button>
        </div>
      `;else if(l.length===0)m=`
        <div class="hp-empty">
          <div class="hp-empty-icon">🔍</div>
          <div class="hp-empty-title">Nenhum resultado</div>
          <div class="hp-empty-sub">Tente outro nome ou categoria.</div>
        </div>
      `;else{const t=l.map(e=>{const s=this._expandedCards.has(e.sid),p=e.adPct>=80?"green":e.adPct>=60?"yellow":"red",v=e.firstDate?E(e.firstDate):"—",x=e.lastDate===r?"Presente":e.lastDate?E(e.lastDate):"—",y=e.image?`<img class="hp-sup-img" src="${e.image}" alt="${e.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`:"",k=`<div class="hp-sup-img-placeholder" ${e.image?'style="display:none"':""}>💊</div>`,b=e.dates.map($=>{const[H,A,j]=$.split("-");return`<div class="hp-log-date">${new Date(parseInt(H),parseInt(A)-1,parseInt(j)).toLocaleDateString("pt-BR",{weekday:"short",day:"numeric",month:"short",year:"numeric"})}</div>`}).join("");return`
          <div class="hp-sup-card" data-sid="${h(e.sid)}">
            <div class="hp-sup-header" data-toggle="${h(e.sid)}">
              ${y}${k}
              <div class="hp-sup-info">
                <div class="hp-sup-name">${h(e.name)}</div>
                <div class="hp-sup-meta">
                  ${e.category?`<span class="hp-badge-cat">${h(e.category)}</span>`:""}
                  <span class="hp-sup-range">${v} → ${x}</span>
                </div>
                <div style="margin-top:4px;">
                  <span class="hp-adherence ${p}">${e.adPct}% adesão</span>
                  <span style="font-size:12px;color:var(--color-text-muted);"> (${e.totalDays}/${e.totalPossible} dias)</span>
                </div>
              </div>
              <button class="hp-expand-btn" data-toggle="${h(e.sid)}">${s?"Fechar ▲":"Ver Logs ▼"}</button>
            </div>
            <div class="hp-logs-panel ${s?"open":""}" id="hp-logs-${h(e.sid)}">
              <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:2px;">${e.totalDays} check-in${e.totalDays!==1?"s":""} registrado${e.totalDays!==1?"s":""}</div>
              ${b}
            </div>
          </div>
        `}).join("");m=`
        <div style="display:flex;flex-direction:column;gap:10px;">
          <div class="hp-section-title">${l.length} suplemento${l.length!==1?"s":""} com histórico</div>
          ${t}
        </div>
      `}this.container.innerHTML=`
      <div class="hp-root">
        <header>
          <h1 style="font-size:24px;font-weight:800;margin:0 0 4px;font-family:'Plus Jakarta Sans','Inter',sans-serif;color:var(--color-text-primary);">Histórico</h1>
          <p style="color:var(--color-text-secondary);font-size:14px;margin:0;">Acompanhe sua constância de suplementação.</p>
        </header>
        ${P}
        ${I}
        ${T}
        ${m}
      </div>
    `,this._attachListeners()}_attachListeners(){const o=this.container.querySelector("#hp-search");if(o){if(this._searchQuery){o.focus();const a=o.value.length;o.setSelectionRange(a,a)}o.addEventListener("input",a=>{this._searchQuery=a.target.value,this._render()})}this.container.querySelectorAll(".hp-chip").forEach(a=>{a.addEventListener("click",()=>{this._activeCategory=a.dataset.cat,this._render()})}),this.container.querySelectorAll("[data-toggle]").forEach(a=>{a.addEventListener("click",u=>{u.stopPropagation();const r=a.dataset.toggle;r&&(this._expandedCards.has(r)?this._expandedCards.delete(r):this._expandedCards.add(r),this._render())})});const i=this.container.querySelector("#hp-cta-checkin");i&&i.addEventListener("click",()=>{window.history.pushState(null,null,"/checkin"),window.dispatchEvent(new PopStateEvent("popstate"))})}}export{U as default};
