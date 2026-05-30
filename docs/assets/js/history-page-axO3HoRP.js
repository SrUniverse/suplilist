import{s as v}from"./main-CfwEDZr2.js";class w{constructor(c){this.container=c}mount(){if(!document.getElementById("history-page-styles")){const e=document.createElement("style");e.id="history-page-styles",e.textContent=`
        .history-date-group { border: 1px solid var(--color-border); border-radius: 12px; overflow: hidden; }
        .history-date-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 14px 16px; background: var(--color-surface-primary);
          cursor: pointer; user-select: none;
        }
        .history-date-header:hover { background: var(--color-bg-primary); }
        .history-date-body { padding: 0 16px 14px; background: var(--color-surface-primary); display: none; }
        .history-date-body.open { display: block; }
        .history-sup-pill {
          display: inline-block; padding: 4px 10px; margin: 4px 4px 0 0;
          background: var(--color-brand-muted); color: var(--color-brand);
          border-radius: 20px; font-size: 13px; font-weight: 500;
        }
        .week-dot {
          width: 28px; height: 28px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 600;
        }
        .week-dot.filled { background: var(--color-brand); color: #fff; }
        .week-dot.empty { background: var(--color-bg-primary); border: 2px solid var(--color-border); color: var(--color-text-muted); }
      `,document.head.appendChild(e)}const p=v.getState().checkins||[];if(p.length===0){this.container.innerHTML=`
        <div style="padding: 24px; display: flex; flex-direction: column; gap: 20px;">
          <header>
            <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 4px;">Histórico</h1>
            <p style="color: var(--color-text-secondary); font-size: 14px;">Acompanhe sua constância de suplementação.</p>
          </header>
          <div style="background: var(--color-surface-primary); border: 1px solid var(--color-border); border-radius: 16px; padding: 48px 24px; text-align: center;">
            <div style="font-size: 40px; margin-bottom: 12px;">📋</div>
            <p style="color: var(--color-text-secondary); font-size: 15px;">Nenhum check-in ainda.</p>
            <p style="color: var(--color-text-muted); font-size: 13px; margin-top: 4px;">Faça seu primeiro check-in na aba Hoje.</p>
          </div>
        </div>
      `;return}const o={};for(const e of p){const t=e.date||e.timestamp?.slice(0,10)||"unknown";o[t]||(o[t]=[]),o[t].push(e)}const x=Object.keys(o).sort((e,t)=>t.localeCompare(e)),r=new Date,a=e=>String(e).padStart(2,"0"),n=e=>`${e.getFullYear()}-${a(e.getMonth()+1)}-${a(e.getDate())}`;let i=0;const d=new Date(r);for(;;){const e=n(d);if(o[e])i++,d.setDate(d.getDate()-1);else break}const y=[];for(let e=6;e>=0;e--){const t=new Date(r);t.setDate(t.getDate()-e);const l=n(t),g=["D","S","T","Q","Q","S","S"][t.getDay()];y.push({label:g,filled:!!o[l]})}const m=y.map(e=>`<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
        <div class="week-dot ${e.filled?"filled":"empty"}">${e.label}</div>
      </div>`).join(""),f=x.map((e,t)=>{const l=o[e],g=l.map(u=>`<span class="history-sup-pill">${u.name||u.supplementId||"Suplemento"}</span>`).join(""),h=b(e);return`
        <div class="history-date-group" data-idx="${t}">
          <div class="history-date-header" onclick="this.nextElementSibling.classList.toggle('open')">
            <span style="font-weight: 600; font-size: 15px; color: var(--color-text-primary);">${h}</span>
            <span style="font-size: 13px; color: var(--color-text-muted);">${l.length} item${l.length!==1?"s":""} ▾</span>
          </div>
          <div class="history-date-body${t===0?" open":""}">${g}</div>
        </div>
      `}).join("");this.container.innerHTML=`
      <div style="padding: 24px; display: flex; flex-direction: column; gap: 20px;">
        <header>
          <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 4px;">Histórico</h1>
          <p style="color: var(--color-text-secondary); font-size: 14px;">Acompanhe sua constância de suplementação.</p>
        </header>

        <div style="display: flex; gap: 16px;">
          <div style="flex:1; background: var(--color-surface-primary); border: 1px solid var(--color-border); border-radius: 16px; padding: 20px; text-align: center;">
            <div style="font-size: 36px; font-weight: 800; color: var(--color-brand);">${i}</div>
            <div style="font-size: 13px; color: var(--color-text-secondary); margin-top: 2px;">dia${i!==1?"s":""} seguido${i!==1?"s":""} 🔥</div>
          </div>
          <div style="flex:2; background: var(--color-surface-primary); border: 1px solid var(--color-border); border-radius: 16px; padding: 20px;">
            <div style="font-size: 12px; color: var(--color-text-muted); margin-bottom: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Últimos 7 dias</div>
            <div style="display: flex; gap: 8px; justify-content: space-around;">${m}</div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <h2 style="font-size: 16px; font-weight: 700; color: var(--color-text-primary);">Registros</h2>
          ${f}
        </div>
      </div>
    `}unmount(){}}function b(s){if(!s||s==="unknown")return"Data desconhecida";const[c,p,o]=s.split("-").map(Number),x=new Date(c,p-1,o),r=new Date,a=new Date(r);a.setDate(r.getDate()-1);const n=y=>String(y).padStart(2,"0"),i=`${r.getFullYear()}-${n(r.getMonth()+1)}-${n(r.getDate())}`,d=`${a.getFullYear()}-${n(a.getMonth()+1)}-${n(a.getDate())}`;return s===i?"Hoje":s===d?"Ontem":x.toLocaleDateString("pt-BR",{weekday:"short",day:"numeric",month:"short"})}export{w as default};
