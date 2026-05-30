import{s as D}from"./main-7QosEGf5.js";import{S as F}from"./stack-recommender-b07295YU.js";const m=a=>String(a).padStart(2,"0"),B=()=>{const a=new Date;return`${a.getFullYear()}-${m(a.getMonth()+1)}-${m(a.getDate())}`},_=a=>{const o=new Date;return o.setDate(o.getDate()-a),`${o.getFullYear()}-${m(o.getMonth()+1)}-${m(o.getDate())}`},N=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"],z=a=>{if(!a)return"";const[o,i]=a.split("-");return`${N[parseInt(i,10)-1]} ${o}`},q=["Todos","Proteínas","Aminoácidos","Adaptógenos","Vitaminas","Energéticos & Foco","Força & Performance","Antioxidantes & Saúde"],O=()=>{const a={};for(const o of F)a[o.id]=o;return a},Q=(a,o)=>{let i=0;for(const s of a){const d=s.supplementId??s.id,r=o[d];r&&r.dosage&&r.pricePerGram&&(i+=(r.dosage.maintenance||5)*r.pricePerGram)}return i};class V{constructor(o){this.container=o,this._unsubscribe=null,this._searchQuery="",this._activeCategory="Todos",this._expandedCards=new Set}mount(){this._injectStyles(),this._render(),this._unsubscribe=D.subscribe(()=>this._render())}unmount(){this._unsubscribe?.()}_injectStyles(){if(document.getElementById("history-page-styles-v2"))return;const o=document.createElement("style");o.id="history-page-styles-v2",o.textContent=`
      .hp-root { padding: 20px 16px 100px; display: flex; flex-direction: column; gap: 20px; font-family: 'Inter', sans-serif; }

      /* Stats grid */
      .hp-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
      .hp-stat-card {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 16px;
        padding: 14px 12px;
        display: flex; flex-direction: column; gap: 4px;
        align-items: center; text-align: center;
      }
      .hp-stat-value { font-size: 22px; font-weight: 800; color: var(--color-brand); line-height: 1; }
      .hp-stat-label { font-size: 11px; color: var(--color-text-secondary); line-height: 1.3; }

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
    `,document.head.appendChild(o)}_render(){const o=D.getState(),i=o.checkins||[],s=o.stack||[],d=O(),r=B(),$=30,f=new Set(i.map(t=>t.date).filter(Boolean)),k=f.size;let S=0;for(let t=0;t<$;t++)f.has(_(t))&&S++;const E=Math.round(S/$*100),M=(Q(s,d)*k).toFixed(2).replace(".",","),L=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"],C=[];for(let t=6;t>=0;t--){const e=_(t),c=new Date(e+"T12:00:00");C.push({iso:e,label:L[c.getDay()],isToday:t===0,hasCk:f.has(e),dayNum:c.getDate()})}const h={};for(const t of i){const e=t.supplementId||"unknown";h[e]||(h[e]=[]),h[e].push(t.date||"")}let n=Object.entries(h).map(([t,e])=>{const c=d[t],l=[...new Set(e)].filter(Boolean).sort(),p=l[0]||"",g=l[l.length-1]||"",x=l.length,b=p?Math.max(1,Math.ceil((new Date(r)-new Date(p))/864e5)+1):1,v=Math.min(b,30),w=Math.round(x/v*100);return{sid:t,name:c?.name||t,category:c?.category||"",image:c?.image||null,firstDate:p,lastDate:g,totalDays:x,totalPossible:v,adPct:w,dates:l.reverse(),lastCheckin:g}});n.sort((t,e)=>e.lastCheckin.localeCompare(t.lastCheckin));const y=this._searchQuery.toLowerCase().trim();y&&(n=n.filter(t=>t.name.toLowerCase().includes(y)||t.category.toLowerCase().includes(y))),this._activeCategory!=="Todos"&&(n=n.filter(t=>t.category===this._activeCategory));const P=`
      <div class="hp-stats">
        <div class="hp-stat-card">
          <div class="hp-stat-value">${E}%</div>
          <div class="hp-stat-label">Média de Adesão<br><span style="color:var(--color-text-muted);font-size:10px;">(últimos 30 dias)</span></div>
        </div>
        <div class="hp-stat-card">
          <div class="hp-stat-value">${k}</div>
          <div class="hp-stat-label">Total de<br>Ciclos</div>
        </div>
        <div class="hp-stat-card">
          <div class="hp-stat-value" style="font-size:16px;">R$${M}</div>
          <div class="hp-stat-label">Investimento<br>Total</div>
        </div>
      </div>
    `,T=`
      <div class="hp-calendar">
        <div class="hp-calendar-title">Últimos 7 dias</div>
        <div class="hp-calendar-row">
          ${C.map(t=>{const e=t.hasCk?t.isToday?"today-filled":"filled":t.isToday?"today-empty":"empty";return`
              <div class="hp-day-col">
                <div class="hp-day-label">${t.label}</div>
                <div class="hp-day-dot ${e}">${t.dayNum}</div>
              </div>
            `}).join("")}
        </div>
      </div>
    `,I=`
      <div style="display:flex;flex-direction:column;gap:10px;">
        <input
          type="search"
          class="hp-search-input"
          placeholder="Buscar suplemento..."
          value="${this._searchQuery.replace(/"/g,"&quot;")}"
          id="hp-search"
        />
        <div class="hp-chips">
          ${q.map(t=>`
            <button class="hp-chip ${this._activeCategory===t?"active":""}" data-cat="${t}">${t}</button>
          `).join("")}
        </div>
      </div>
    `;let u;if(i.length===0)u=`
        <div class="hp-empty">
          <div class="hp-empty-icon">📋</div>
          <div class="hp-empty-title">Nenhum check-in registrado ainda</div>
          <div class="hp-empty-sub">Registre seus suplementos diários para acompanhar sua constância.</div>
          <button class="hp-cta-btn" id="hp-cta-checkin">Fazer Check-in Agora</button>
        </div>
      `;else if(n.length===0)u=`
        <div class="hp-empty">
          <div class="hp-empty-icon">🔍</div>
          <div class="hp-empty-title">Nenhum resultado</div>
          <div class="hp-empty-sub">Tente outro nome ou categoria.</div>
        </div>
      `;else{const t=n.map(e=>{const c=this._expandedCards.has(e.sid),l=e.adPct>=80?"green":e.adPct>=60?"yellow":"red",p=e.firstDate?z(e.firstDate):"—",g=e.lastDate===r?"Presente":e.lastDate?z(e.lastDate):"—",x=e.image?`<img class="hp-sup-img" src="${e.image}" alt="${e.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`:"",b=`<div class="hp-sup-img-placeholder" ${e.image?'style="display:none"':""}>💊</div>`,v=e.dates.map(w=>{const[A,H,j]=w.split("-");return`<div class="hp-log-date">${new Date(parseInt(A),parseInt(H)-1,parseInt(j)).toLocaleDateString("pt-BR",{weekday:"short",day:"numeric",month:"short",year:"numeric"})}</div>`}).join("");return`
          <div class="hp-sup-card" data-sid="${e.sid}">
            <div class="hp-sup-header" data-toggle="${e.sid}">
              ${x}${b}
              <div class="hp-sup-info">
                <div class="hp-sup-name">${e.name}</div>
                <div class="hp-sup-meta">
                  ${e.category?`<span class="hp-badge-cat">${e.category}</span>`:""}
                  <span class="hp-sup-range">${p} → ${g}</span>
                </div>
                <div style="margin-top:4px;">
                  <span class="hp-adherence ${l}">${e.adPct}% adesão</span>
                  <span style="font-size:12px;color:var(--color-text-muted);"> (${e.totalDays}/${e.totalPossible} dias)</span>
                </div>
              </div>
              <button class="hp-expand-btn" data-toggle="${e.sid}">${c?"Fechar ▲":"Ver Logs ▼"}</button>
            </div>
            <div class="hp-logs-panel ${c?"open":""}" id="hp-logs-${e.sid}">
              <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:2px;">${e.totalDays} check-in${e.totalDays!==1?"s":""} registrado${e.totalDays!==1?"s":""}</div>
              ${v}
            </div>
          </div>
        `}).join("");u=`
        <div style="display:flex;flex-direction:column;gap:10px;">
          <div class="hp-section-title">${n.length} suplemento${n.length!==1?"s":""} com histórico</div>
          ${t}
        </div>
      `}this.container.innerHTML=`
      <div class="hp-root">
        <header>
          <h1 style="font-size:24px;font-weight:800;margin:0 0 4px;font-family:'Syne',sans-serif;color:var(--color-text-primary);">Histórico</h1>
          <p style="color:var(--color-text-secondary);font-size:14px;margin:0;">Acompanhe sua constância de suplementação.</p>
        </header>
        ${P}
        ${T}
        ${I}
        ${u}
      </div>
    `,this._attachListeners()}_attachListeners(){const o=this.container.querySelector("#hp-search");o&&o.addEventListener("input",s=>{this._searchQuery=s.target.value,this._render()}),this.container.querySelectorAll(".hp-chip").forEach(s=>{s.addEventListener("click",()=>{this._activeCategory=s.dataset.cat,this._render()})}),this.container.querySelectorAll("[data-toggle]").forEach(s=>{s.addEventListener("click",d=>{d.stopPropagation();const r=s.dataset.toggle;r&&(this._expandedCards.has(r)?this._expandedCards.delete(r):this._expandedCards.add(r),this._render())})});const i=this.container.querySelector("#hp-cta-checkin");i&&i.addEventListener("click",()=>{window.location.hash="#/checkin"})}}export{V as default};
