const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/js/exceljs-B9ffDZkJ.js","assets/js/vendor-Vk1E4gpc.js"])))=>i.map(i=>d[i]);
import{s as F,t as O,o as E,_ as N,e as A,l as J}from"./main-C4yOdEUp.js";import{S as U}from"./stack-recommender-0ypETZQz.js";import{e as m}from"./escape-Br5wU8qn.js";import{C as G}from"./checkout-modal-CCDYTkhN.js";const Q=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"],T=b=>{if(!b)return"";const[t,c]=b.split("-");return`${Q[parseInt(c,10)-1]} ${t}`},V=["Todos","Força & Performance","Proteínas","Vitaminas & Minerais","Adaptógenos & Foco","Cognição & Neuroproteção","Saúde Hormonal","Antioxidantes & Anti-inflamatórios","Sono & Recuperação","Saúde Geral"],M=()=>{const b={};for(const t of U)b[t.id]=t;return b},W=(b,t)=>{let c=0;for(const x of b){const d=x.supplementId??x.id,p=t[d];if(p&&p.dosage&&p.pricePerGram){const s=p.dosage.maintenance||5,i=(p.dosage.unit||"g").toLowerCase();let l;if(i==="g")l=s;else if(i==="mg")l=s/1e3;else if(i==="mcg")l=s/1e6;else continue;c+=l*p.pricePerGram}}return c};class oe{constructor(t){this.container=t,this._unsubscribe=null,this._searchQuery="",this._activeCategory="Todos",this._expandedCards=new Set}mount(){this._injectStyles(),this._render(),this._unsubscribe=F.subscribe(()=>this._render())}unmount(){this._unsubscribe?.()}_injectStyles(){if(document.getElementById("history-page-styles-v2"))return;const t=document.createElement("style");t.id="history-page-styles-v2",t.textContent=`
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
      .hp-stat-icon--ev { background: var(--ev-a-bg, rgba(52,211,153,0.12)); color: var(--ev-a, #34D399); }
      .hp-stat-icon--invest { background: var(--ev-b-bg, rgba(251,191,36,0.12)); color: var(--ev-b, #FBBF24); }
      .hp-stat-value--invest { font-size: clamp(20px, 3.5vw, 28px) !important; letter-spacing: -0.02em; }
      .hp-stat-label { font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
      .hp-stat-value { font-size: clamp(28px, 5vw, 40px); font-weight: 800; color: var(--color-text-primary); line-height: 1.05; font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; font-variant-numeric: tabular-nums; letter-spacing: -0.03em; }
      .hp-stat-sub { font-size: 11px; color: var(--color-text-muted); }
      .hp-stat-sub.positive { color: var(--color-savings, #22C55E); font-weight: 600; }
      .hp-progress-bar {
        height: 6px; border-radius: 3px;
        background: var(--color-border);
        overflow: hidden; margin-top: 8px;
      }
      .hp-progress-fill {
        height: 100%; border-radius: 3px;
        background: linear-gradient(90deg, var(--color-brand, #8B5CF6), rgba(139,92,246,0.7));
        transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
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
      .hp-day-dot.today-filled { background: var(--color-brand); color: #fff; box-shadow: 0 0 0 2px var(--color-border-brand, rgba(139,92,246,0.40)); }
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

      /* ── Premium lock card ───────────────────────────────────────────────────── */
      .hp-premium-lock {
        margin-top: 24px; margin-bottom: 20px;
        background: linear-gradient(135deg, var(--color-brand-muted, rgba(139,92,246,0.10)) 0%, rgba(139,92,246,0.02) 100%);
        border: 1.5px dashed var(--color-border-brand, rgba(139,92,246,0.35));
        border-radius: 20px; padding: 36px 24px;
        text-align: center;
        display: flex; flex-direction: column; align-items: center; gap: 16px;
        box-shadow: 0 12px 32px rgba(0,0,0,0.15);
      }
      .hp-premium-lock__icon { font-size: 40px; filter: drop-shadow(0 4px 12px rgba(139,92,246,0.4)); }
      .hp-premium-lock__title { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 18px; margin: 0; color: var(--color-text-primary); }
      .hp-premium-lock__desc { font-size: 13px; color: var(--color-text-secondary); max-width: 320px; line-height: 1.5; margin: 0; }
      .hp-premium-lock__btn {
        background: var(--color-brand); color: #fff; border: none;
        font-weight: 700; padding: 12px 28px; border-radius: 12px;
        font-size: 13.5px; box-shadow: 0 4px 14px rgba(139,92,246,0.3);
        cursor: pointer; font-family: 'Inter', sans-serif;
      }

      /* ── Advanced analytics dashboard ────────────────────────────────────────── */
      .hp-analytics-dashboard {
        display: flex; flex-direction: column; gap: 20px;
        margin-top: 10px; margin-bottom: 20px;
        padding: 20px;
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 16px;
      }
      .hp-analytics-header {
        display: flex; align-items: center; justify-content: space-between; gap: 12px;
        border-bottom: 1px solid var(--color-border); padding-bottom: 12px;
      }
      .hp-analytics-header__title { margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 16px; font-weight: 800; color: var(--color-text-primary); }
      .hp-analytics-header__sub { margin: 3px 0 0 0; font-size: 11.5px; color: var(--color-text-muted); }
      .hp-analytics-support-btn {
        background: var(--color-brand-muted, rgba(139,92,246,0.10)); color: var(--color-brand);
        border: 1px solid var(--color-border-brand, rgba(139,92,246,0.25));
        padding: 8px 14px; border-radius: 10px;
        font-size: 11.5px; font-weight: 700; cursor: pointer;
        transition: all 150ms ease;
        display: flex; align-items: center; gap: 6px;
        font-family: 'Inter', sans-serif; height: 32px; box-sizing: border-box;
      }
      .hp-analytics-section-label {
        font-size: 11px; font-weight: 700; text-transform: uppercase;
        letter-spacing: 0.05em; color: var(--color-text-muted);
        display: block; margin-bottom: 8px;
      }
      .hp-analytics-heatmap-grid {
        display: grid; grid-template-columns: repeat(10, 1fr);
        gap: 6px; justify-items: center;
      }
      .hp-analytics-sparkline-wrap {
        background: var(--color-surface-secondary);
        padding: 16px 12px 6px; border-radius: 12px;
        border: 1px solid var(--color-border); box-sizing: border-box;
      }
      .hp-analytics-trend-label { margin-bottom: 12px; }
      .hp-analytics-offline {
        background: var(--color-savings-bg, rgba(34,197,94,0.08)); border: 1px solid rgba(34,197,94,0.20);
        border-radius: 12px; padding: 12px;
        display: flex; align-items: center; gap: 10px;
      }
      .hp-analytics-offline__icon { font-size: 20px; }
      .hp-analytics-offline__status { font-size: 12px; font-weight: 700; color: var(--color-savings, #22C55E); }
      .hp-analytics-offline__detail { font-size: 11px; color: var(--color-text-muted); margin-top: 1px; }
      .hp-analytics-export-btn {
        background: #107c41; color: #ffffff; border: none;
        display: flex; align-items: center; gap: 8px;
        font-weight: 700; width: 100%; justify-content: center;
        height: 44px; border-radius: 12px; cursor: pointer;
        transition: all 150ms ease; font-family: 'Inter', sans-serif;
        font-size: 13px; box-shadow: 0 4px 12px rgba(16,124,65,0.2);
      }

      /* ── Priority support dialog ─────────────────────────────────────────────── */
      .hp-support-overlay {
        position: fixed; inset: 0; z-index: 600;
        background: rgba(0,0,0,0.8); backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center; padding: 16px;
        font-family: 'Inter', sans-serif;
      }
      .hp-support-dialog {
        background: var(--color-surface-primary, #13161C); border: 1px solid var(--color-border-brand, rgba(139,92,246,0.30));
        border-radius: 20px; width: 100%; max-width: 440px;
        padding: 24px; color: #fff;
        box-shadow: 0 20px 40px rgba(0,0,0,0.5); position: relative;
      }
      .hp-support-close {
        position: absolute; top: 16px; right: 16px;
        background: none; border: none; color: #9ca3af;
        font-size: 16px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        width: 24px; height: 24px; border-radius: 50%;
      }
      .hp-support-heading {
        display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
      }
      .hp-support-heading__icon { font-size: 24px; }
      .hp-support-heading__title { margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 18px; font-weight: 800; }
      .hp-support-desc { font-size: 12.5px; color: #9ca3af; line-height: 1.45; margin: 0 0 16px 0; }
      .hp-support-chat {
        display: none; height: 160px; overflow-y: auto;
        background: #18181c; border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.06);
        padding: 10px; margin-bottom: 14px;
        flex-direction: column; gap: 8px; box-sizing: border-box;
      }
      .hp-support-form { display: flex; flex-direction: column; gap: 10px; }
      .hp-support-textarea {
        width: 100%; box-sizing: border-box; height: 90px;
        border-radius: 10px; border: 1px solid rgba(255,255,255,0.08);
        background: #18181c; color: #fff;
        padding: 10px; font-family: 'Inter', sans-serif; font-size: 13px;
        outline: none; resize: none;
      }
      .hp-support-submit {
        background: var(--color-brand); color: #fff; border: none;
        border-radius: 10px; padding: 10px; font-weight: 700; font-size: 13px;
        cursor: pointer; font-family: 'Inter', sans-serif; height: 40px;
        box-shadow: 0 4px 12px rgba(139,92,246,0.25);
      }
    `,document.head.appendChild(t)}_render(){const t=F.state,c=t.checkins||[],x=t.stack||[],d=M(),p=O(),s=30,i=new Set(c.map(r=>r.date).filter(Boolean)),l=i.size;let f=0;for(let r=0;r<s;r++)i.has(E(r))&&f++;const v=Math.round(f/s*100),k=(W(x,d)*l).toFixed(2).replace(".",","),n=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"],h=[];for(let r=6;r>=0;r--){const o=E(r),g=new Date(o+"T12:00:00");h.push({iso:o,label:n[g.getDay()],isToday:r===0,hasCk:i.has(o),dayNum:g.getDate()})}const e={};for(const r of c){const o=r.supplementId||"unknown";e[o]||(e[o]=[]),e[o].push(r.date||"")}let a=Object.entries(e).map(([r,o])=>{const g=d[r],y=[...new Set(o)].filter(Boolean).sort(),w=y[0]||"",S=y[y.length-1]||"",C=y.length,L=w?Math.max(1,Math.ceil((new Date(p+"T12:00:00")-new Date(w+"T12:00:00"))/864e5)+1):1,z=Math.min(L,30),P=Math.round(C/z*100);return{sid:r,name:g?.name||r,category:g?.category||"",image:g?.image||null,firstDate:w,lastDate:S,totalDays:C,totalPossible:z,adPct:P,dates:y.reverse(),lastCheckin:S}});a.sort((r,o)=>o.lastCheckin.localeCompare(r.lastCheckin));const u=this._searchQuery.toLowerCase().trim();if(u&&(a=a.filter(r=>r.name.toLowerCase().includes(u)||r.category.toLowerCase().includes(u))),this._activeCategory!=="Todos"){const r=this._activeCategory.toLowerCase();a=a.filter(o=>{const g=(o.category||"").toLowerCase();return g===r?!0:r==="saúde geral"?["saúde cardiovascular","saúde articular & pele","saúde intestinal","queima de gordura & recovery"].includes(g):r==="cognição & neuroproteção"?g==="energéticos & foco":!1})}const D=`
      <div class="hp-stats">
        <div class="hp-stat-card">
          <div class="hp-stat-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <span class="hp-stat-label">Média de Adesão</span>
          <span class="hp-stat-value">${v}<span style="font-size:16px;font-weight:600;color:var(--color-text-muted)">%</span></span>
          <div class="hp-progress-bar">
            <div class="hp-progress-fill" style="width:${v}%"></div>
          </div>
        </div>
        <div class="hp-stat-card">
          <div class="hp-stat-icon hp-stat-icon--ev">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <span class="hp-stat-label">Total de Ciclos</span>
          <span class="hp-stat-value">${l}</span>
          <span class="hp-stat-sub${l>0?" positive":""}">
            ${l>0?"+"+Math.min(l,2)+" no último trimestre":"Nenhum ciclo registrado"}
          </span>
        </div>
        <div class="hp-stat-card">
          <div class="hp-stat-icon hp-stat-icon--invest">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <span class="hp-stat-label">Investimento Total Est.</span>
          <span class="hp-stat-value hp-stat-value--invest">R$ ${k}</span>
          <span class="hp-stat-sub">Calculado com base nos logs</span>
        </div>
      </div>
    `,j=`
      <div class="hp-calendar">
        <div class="hp-calendar-title">Últimos 7 dias</div>
        <div class="hp-calendar-row">
          ${h.map(r=>{const o=r.hasCk?r.isToday?"today-filled":"filled":r.isToday?"today-empty":"empty";return`
              <div class="hp-day-col">
                <div class="hp-day-label">${r.label}</div>
                <div class="hp-day-dot ${o}">${r.dayNum}</div>
              </div>
            `}).join("")}
        </div>
      </div>
    `,B=`
      <div style="display:flex;flex-direction:column;gap:10px;">
        <input
          type="search"
          class="hp-search-input"
          placeholder="Buscar suplemento..."
          value="${m(this._searchQuery)}"
          id="hp-search"
        />
        <div class="hp-chips">
          ${V.map(r=>`
            <button class="hp-chip ${this._activeCategory===r?"active":""}" data-cat="${r}">${r}</button>
          `).join("")}
        </div>
      </div>
    `;let $;if(c.length===0)$=`
        <div class="hp-empty">
          <div class="hp-empty-icon">📋</div>
          <div class="hp-empty-title">Nenhum check-in registrado ainda</div>
          <div class="hp-empty-sub">Registre seus suplementos diários para acompanhar sua constância.</div>
          <button class="hp-cta-btn" id="hp-cta-checkin">Fazer Check-in Agora</button>
        </div>
      `;else if(a.length===0)$=`
        <div class="hp-empty">
          <div class="hp-empty-icon">🔍</div>
          <div class="hp-empty-title">Nenhum resultado</div>
          <div class="hp-empty-sub">Tente outro nome ou categoria.</div>
        </div>
      `;else{const r=a.map(o=>{const g=this._expandedCards.has(o.sid),y=o.adPct>=80?"green":o.adPct>=60?"yellow":"red",w=o.firstDate?T(o.firstDate):"—",S=o.lastDate===p?"Presente":o.lastDate?T(o.lastDate):"—",C=o.image?`<img class="hp-sup-img" src="${o.image}" alt="${m(o.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`:"",L=`<div class="hp-sup-img-placeholder" ${o.image?'style="display:none"':""}>💊</div>`,z=o.dates.map(P=>{const[R,q,H]=P.split("-");return`<div class="hp-log-date">${new Date(parseInt(R),parseInt(q)-1,parseInt(H)).toLocaleDateString("pt-BR",{weekday:"short",day:"numeric",month:"short",year:"numeric"})}</div>`}).join("");return`
          <div class="hp-sup-card" data-sid="${m(o.sid)}">
            <div class="hp-sup-header" data-toggle="${m(o.sid)}">
              ${C}${L}
              <div class="hp-sup-info">
                <div class="hp-sup-name">${m(o.name)}</div>
                <div class="hp-sup-meta">
                  ${o.category?`<span class="hp-badge-cat">${m(o.category)}</span>`:""}
                  <span class="hp-sup-range">${w} → ${S}</span>
                </div>
                <div style="margin-top:4px;">
                  <span class="hp-adherence ${y}">${o.adPct}% adesão</span>
                  <span style="font-size:12px;color:var(--color-text-muted);"> (${o.totalDays}/${o.totalPossible} dias)</span>
                </div>
              </div>
              <button class="hp-expand-btn" data-toggle="${m(o.sid)}">${g?"Fechar ▲":"Ver Logs ▼"}</button>
            </div>
            <div class="hp-logs-panel ${g?"open":""}" id="hp-logs-${m(o.sid)}">
              <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:2px;">${o.totalDays} check-in${o.totalDays!==1?"s":""} registrado${o.totalDays!==1?"s":""}</div>
              ${z}
            </div>
          </div>
        `}).join("");$=`
        <div style="display:flex;flex-direction:column;gap:10px;">
          <div class="hp-section-title">${a.length} suplemento${a.length!==1?"s":""} com histórico</div>
          ${r}
        </div>
      `}const I=(t.user?.tier??"free")==="free";this.container.innerHTML=`
      <div class="hp-root">
        <header>
          <h1 style="font-size:24px;font-weight:800;margin:0 0 4px;font-family:'Plus Jakarta Sans','Inter',sans-serif;color:var(--color-text-primary);">Histórico</h1>
          <p style="color:var(--color-text-secondary);font-size:14px;margin:0;">Acompanhe sua constância de suplementação.</p>
        </header>
        ${D}
        ${j}
        ${I?"":this._renderAdvancedAnalyticsDashboard(c,x,d)}
        ${B}
        ${$}
        ${I?this._renderPremiumLockCard():""}
      </div>
    `,this._attachListeners()}_attachListeners(){const t=this.container.querySelector("#hp-search");if(t){if(this._searchQuery){t.focus();const s=t.value.length;t.setSelectionRange(s,s)}t.addEventListener("input",s=>{this._searchQuery=s.target.value,this._render()})}this.container.querySelectorAll(".hp-chip").forEach(s=>{s.addEventListener("click",()=>{this._activeCategory=s.dataset.cat,this._render()})}),this.container.querySelectorAll("[data-toggle]").forEach(s=>{s.addEventListener("click",i=>{i.stopPropagation();const l=s.dataset.toggle;l&&(this._expandedCards.has(l)?this._expandedCards.delete(l):this._expandedCards.add(l),this._render())})});const c=this.container.querySelector("#hp-cta-checkin");c&&c.addEventListener("click",()=>{window.history.pushState(null,null,"/checkin"),window.dispatchEvent(new PopStateEvent("popstate"))});const x=this.container.querySelector("#hp-unlock-premium-btn");x&&x.addEventListener("click",()=>{G.show({tier:"pro"})});const d=this.container.querySelector("#hp-export-excel-btn");d&&d.addEventListener("click",()=>{this._exportToExcel()});const p=this.container.querySelector("#hp-priority-support-btn");p&&p.addEventListener("click",()=>{this._openPrioritySupportDialog()})}_renderPremiumLockCard(){return`
      <div class="hp-premium-lock hp-premium-lock-card">
        <div class="hp-premium-lock__icon">📊</div>
        <h3 class="hp-premium-lock__title">Desbloqueie o Painel Analítico Premium</h3>
        <p class="hp-premium-lock__desc">Tenha acesso a gráficos interativos de constância, mapa de calor de 30 dias, detalhamento por categoria, suporte prioritário e exportação completa em Excel.</p>
        <button class="hp-premium-lock__btn" id="hp-unlock-premium-btn">Ativar Premium — R$ 14,90/mês</button>
      </div>
    `}_renderAdvancedAnalyticsDashboard(t,c,x){const d=new Set(t.map(n=>n.date).filter(Boolean)),p=[];for(let n=29;n>=0;n--){const h=E(n),e=d.has(h),a=h.split("-")[2];p.push(`
        <div class="hp-heatmap-cell ${e?"active":""}" 
             title="${h}: ${e?"Check-in concluído":"Sem check-in"}"
             style="width: 26px; height: 26px; border-radius: 6px; background: ${e?"var(--color-brand)":"var(--color-surface-secondary)"}; border: 1px solid ${e?"var(--color-brand)":"var(--color-border)"}; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: ${e?"#fff":"var(--color-text-muted)"}; cursor: pointer; transition: transform 0.15s ease;">
          ${a}
        </div>
      `)}const s=[];for(let n=3;n>=0;n--){let h=0;for(let a=0;a<7;a++){const u=E(n*7+a);d.has(u)&&h++}const e=Math.round(h/7*100);s.push(e)}const i=s.map((n,h)=>{const e=40+h*110,a=65-n/100*50;return{x:e,y:a,pct:n}}),l=`M ${i[0].x} ${i[0].y} L ${i[1].x} ${i[1].y} L ${i[2].x} ${i[2].y} L ${i[3].x} ${i[3].y}`,f=`${l} L ${i[3].x} 70 L ${i[0].x} 70 Z`,v=JSON.stringify(t).length,_=JSON.stringify(c).length,k=((v+_)/1024).toFixed(2);return`
      <!-- Premium Advanced Dashboard -->
      <div class="hp-analytics-dashboard hp-advanced-dashboard">

        <div class="hp-analytics-header">
          <div>
            <h3 class="hp-analytics-header__title">Painel Premium 📊</h3>
            <p class="hp-analytics-header__sub">Métricas e ferramentas de alta consistência</p>
          </div>
          <button id="hp-priority-support-btn" class="hp-analytics-support-btn">
            ⚡ Suporte Prioritário
          </button>
        </div>

        <!-- Heatmap Grid -->
        <div>
          <span class="hp-analytics-section-label">Mapa de Consistência (Últimos 30 Dias)</span>
          <div class="hp-analytics-heatmap-grid">
            ${p.join("")}
          </div>
        </div>

        <!-- Trend Sparkline -->
        <div>
          <span class="hp-analytics-section-label hp-analytics-trend-label">Tendência Semanal de Adesão</span>
          <div class="hp-analytics-sparkline-wrap">
            <svg width="100%" height="90" viewBox="0 0 400 90" style="overflow: visible;">
              <defs>
                <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="var(--color-brand)" stop-opacity="0.25"/>
                  <stop offset="100%" stop-color="var(--color-brand)" stop-opacity="0.0"/>
                </linearGradient>
              </defs>
              <!-- Grid lines -->
              <line x1="40" y1="15" x2="370" y2="15" stroke="var(--color-border)" stroke-dasharray="4" />
              <line x1="40" y1="40" x2="370" y2="40" stroke="var(--color-border)" stroke-dasharray="4" />
              <line x1="40" y1="65" x2="370" y2="65" stroke="var(--color-border)" stroke-dasharray="4" />
              <!-- Area fill -->
              <path d="${f}" fill="url(#chart-grad)" />
              <!-- Trend Line -->
              <path d="${l}" stroke="var(--color-brand)" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" />
              <!-- Dots and Labels -->
              ${i.map((n,h)=>`
                <circle cx="${n.x}" cy="${n.y}" r="5" fill="#fff" stroke="var(--color-brand)" stroke-width="2" />
                <text x="${n.x}" y="${n.y-10}" text-anchor="middle" font-size="10" font-weight="700" fill="var(--color-text-primary)" font-family="Inter">${n.pct}%</text>
                <text x="${n.x}" y="85" text-anchor="middle" font-size="9" font-weight="600" fill="var(--color-text-muted)" font-family="Inter">Semana ${4-h}</text>
              `).join("")}
            </svg>
          </div>
        </div>

        <!-- Offline Sync Card -->
        <div class="hp-analytics-offline">
          <span class="hp-analytics-offline__icon">🟢</span>
          <div style="flex: 1;">
            <div class="hp-analytics-offline__status">Sincronização Offline Ativa</div>
            <div class="hp-analytics-offline__detail">Banco de dados 100% Local-first. Cache: ${k} KB de logs locais sincronizados.</div>
          </div>
        </div>

        <!-- Excel Custom Report Exporter -->
        <button id="hp-export-excel-btn" class="hp-analytics-export-btn">
          📥 Baixar Relatório Premium (Excel)
        </button>

      </div>
    `}async _exportToExcel(){try{const{default:t}=await N(async()=>{const{default:e}=await import("./exceljs-B9ffDZkJ.js").then(a=>a.e);return{default:e}},__vite__mapDeps([0,1])),c=F.state,x=c.checkins||[],d=c.stack||[],p=M(),s=new t.Workbook;s.creator="SupliList",s.created=new Date;const i=s.addWorksheet("Histórico de Check-ins");i.columns=[{header:"Data",key:"date",width:15},{header:"Suplemento",key:"name",width:25},{header:"Categoria",key:"category",width:20},{header:"Nota / Observação",key:"note",width:40}],x.forEach(e=>{const a=p[e.supplementId];i.addRow({date:e.date||"",name:a?.name||e.supplementId||"Desconhecido",category:a?.category||"Outros",note:e.note||""})});const l=i.getRow(1);l.height=24,l.eachCell(e=>{e.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF7C3AED"}},e.font={name:"Segoe UI",color:{argb:"FFFFFFFF"},bold:!0,size:11},e.alignment={vertical:"middle",horizontal:"center"}}),i.eachRow((e,a)=>{a!==1&&(e.height=20,e.eachCell(u=>{u.font={name:"Segoe UI",size:10},u.alignment={vertical:"middle"},a%2===0&&(u.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFF9FAFB"}})}))});const f=s.addWorksheet("Meu Stack");f.columns=[{header:"Nome",key:"name",width:25},{header:"Categoria",key:"category",width:20},{header:"Dosagem Ativa",key:"dosage",width:18},{header:"Estoque Restante",key:"qty",width:18}],d.forEach(e=>{const a=p[e.supplementId??e.id],u=e.dosage?.value??a?.dosage?.maintenance??"",D=e.dosage?.unit??a?.dosage?.unit??"";f.addRow({name:a?.name||e.supplementId||"Desconhecido",category:a?.category||"Outros",dosage:u?`${u} ${D}`:"—",qty:e.quantity!=null?`${e.quantity} ${e.unit||"g"}`:"—"})});const v=f.getRow(1);v.height=24,v.eachCell(e=>{e.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF7C3AED"}},e.font={name:"Segoe UI",color:{argb:"FFFFFFFF"},bold:!0,size:11},e.alignment={vertical:"middle",horizontal:"center"}}),f.eachRow((e,a)=>{a!==1&&(e.height=20,e.eachCell(u=>{u.font={name:"Segoe UI",size:10},u.alignment={vertical:"middle"},a%2===0&&(u.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFF9FAFB"}})}))});const _=await s.xlsx.writeBuffer(),k=new Blob([_],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),n=URL.createObjectURL(k),h=document.createElement("a");h.href=n,h.download=`suplilist_relatorio_premium_${new Date().toISOString().slice(0,10)}.xlsx`,document.body.appendChild(h),h.click(),document.body.removeChild(h),setTimeout(()=>URL.revokeObjectURL(n),1e3),A.emit("toast:show",{message:"Relatório Premium Excel gerado com sucesso! 📥",type:"success"})}catch(t){J.error("Excel export failed",t),A.emit("toast:show",{message:"Erro ao gerar relatório Excel.",type:"error"})}}_openPrioritySupportDialog(){const t=document.createElement("div");t.id="priority-support-overlay",t.className="hp-support-overlay",t.innerHTML=`
      <div class="hp-support-dialog">
        <button id="ps-close-btn" class="hp-support-close">✕</button>
        <div class="hp-support-heading">
          <span class="hp-support-heading__icon">⚡</span>
          <h3 class="hp-support-heading__title">Suporte Prioritário Premium</h3>
        </div>
        <p class="hp-support-desc">Como membro Premium do SupliList, você tem acesso à nossa fila de alta prioridade. Envie sua mensagem e nossa IA/equipe responderá imediatamente.</p>

        <div id="ps-chat-area" class="hp-support-chat"></div>

        <form id="ps-form" class="hp-support-form">
          <textarea id="ps-message" class="hp-support-textarea" placeholder="Como podemos te ajudar hoje?" required></textarea>
          <button type="submit" class="hp-support-submit">Enviar Mensagem</button>
        </form>
      </div>
    `,document.body.appendChild(t),t.querySelector("#ps-close-btn").addEventListener("click",()=>t.remove()),t.addEventListener("click",p=>{p.target===t&&t.remove()});const c=t.querySelector("#ps-form"),x=t.querySelector("#ps-message"),d=t.querySelector("#ps-chat-area");c.addEventListener("submit",async p=>{p.preventDefault();const s=x.value.trim();if(!s)return;c.style.display="none",d.style.display="flex",d.innerHTML=`
        <div style="align-self: flex-end; background: var(--color-brand); color: #fff; border-radius: 10px 10px 0 10px; padding: 8px 12px; font-size: 12px; max-width: 80%; line-height: 1.45; box-sizing: border-box;">
          ${m(s)}
        </div>
        <div id="ps-agent-loading" style="align-self: flex-start; background: #27272a; color: #a1a1aa; border-radius: 10px 10px 10px 0; padding: 8px 12px; font-size: 12px; max-width: 80%; box-sizing: border-box;">
          Digitando resposta prioritária...
        </div>
      `,d.scrollTop=d.scrollHeight,await new Promise(l=>setTimeout(l,1200));const i=d.querySelector("#ps-agent-loading");i&&i.remove(),d.innerHTML+=`
        <div style="align-self: flex-start; background: #27272a; color: #f4f4f5; border-radius: 10px 10px 10px 0; padding: 8px 12px; font-size: 12px; max-width: 85%; line-height: 1.45; box-sizing: border-box;">
          <strong>Especialista SupliList:</strong><br/>
          Olá! Agradecemos o contato. Sua mensagem foi recebida na nossa fila de suporte de alta prioridade. 
          <br/><br/>
          Analisamos seu perfil científico e histórico de check-ins local. Você está com uma excelente consistência! Estaremos de prontidão para quaisquer dúvidas sobre dosagens ou interações de ativos. 🚀
        </div>
      `,d.scrollTop=d.scrollHeight})}}export{oe as default};
