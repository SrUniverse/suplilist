import{S as d}from"./stack-recommender-ijuYb9dJ.js";import{s as l,A as p}from"./main-Bqgd7Ma9.js";import{E as c}from"./evidence-D5RtUc7g.js";import{e as o}from"./escape-Br5wU8qn.js";const v=()=>{const i=l.favorites;return Array.isArray(i)?i:[]},f=i=>{l.dispatch(p.REMOVE_FAVORITE,{supplementId:i})},u=[{key:"all",label:"Todos"},{key:"bulk",label:"Hipertrofia"},{key:"endurance",label:"Performance"},{key:"general",label:"Saúde Geral"},{key:"cut",label:"Emagrecimento"}];function g(i,e){return e==="all"?!0:(i.targets?.[e]??0)>0}function b(i,e){const a=[...i];if(e==="evidence"){const t={A:0,B:1,C:2};return a.sort((r,n)=>(t[r.evidenceLevel]??3)-(t[n.evidenceLevel]??3))}return e==="az"?a.sort((t,r)=>t.name.localeCompare(r.name)):a}class w{constructor(e){this.container=e,this._activeGoal="all",this._sortKey="evidence",this._unsub=null}mount(){this._injectStyles(),this._unsub=l.subscribe(()=>this._render()),this._render()}unmount(){this._unsub?.(),this.container.innerHTML=""}_getFavoriteSupplements(){return v().map(a=>d.find(t=>t.id===a)).filter(Boolean)}_injectStyles(){if(document.getElementById("fav-page-styles-v3"))return;const e=document.createElement("style");e.id="fav-page-styles-v3",e.textContent=`
      .fv-root {
        padding: 0 0 120px;
        min-height: 100%;
        font-family: 'Inter', sans-serif;
      }
      /* ── Header ── */
      .fv-header {
        padding: 20px 20px 0;
        display: flex; flex-direction: column; gap: 14px;
      }
      .fv-breadcrumb {
        font-size: 12px; color: var(--color-text-muted);
        display: flex; align-items: center; gap: 6px;
      }
      .fv-breadcrumb-sep { opacity: 0.4; }
      .fv-title-row {
        display: flex; align-items: center;
        justify-content: space-between; gap: 12px;
        flex-wrap: wrap;
      }
      .fv-title {
        font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; font-weight: 800;
        font-size: clamp(22px, 5vw, 32px); margin: 0;
        color: var(--color-text-primary);
      }
      .fv-btn-optimize {
        display: flex; align-items: center; gap: 7px;
        padding: 9px 16px; border-radius: 10px; border: none;
        background: var(--color-brand); color: #fff;
        font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600;
        cursor: pointer; white-space: nowrap;
        transition: background 0.15s;
      }
      .fv-btn-optimize:hover { background: var(--color-brand-hover); }
      /* ── Controls ── */
      .fv-controls {
        padding: 16px 20px 0;
        display: flex; align-items: center;
        justify-content: space-between; gap: 12px;
        flex-wrap: wrap;
      }
      .fv-chips {
        display: flex; gap: 8px; overflow-x: auto;
        scrollbar-width: none;
      }
      .fv-chips::-webkit-scrollbar { display: none; }
      .fv-chip {
        flex-shrink: 0; padding: 7px 16px;
        border-radius: 20px; border: 1.5px solid var(--color-border);
        background: transparent; color: var(--color-text-secondary);
        font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500;
        cursor: pointer; white-space: nowrap;
        transition: all 0.15s;
      }
      .fv-chip:hover:not(.active) { border-color: var(--color-brand); color: var(--color-brand); }
      .fv-chip.active {
        background: var(--color-brand-muted);
        border-color: var(--color-brand);
        color: var(--color-brand); font-weight: 600;
      }
      .fv-sort-wrap {
        display: flex; align-items: center; gap: 8px; flex-shrink: 0;
      }
      .fv-sort-label {
        font-size: 11px; font-weight: 700; text-transform: uppercase;
        letter-spacing: 0.06em; color: var(--color-text-muted);
        white-space: nowrap;
      }
      .fv-sort-select {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 8px; padding: 6px 10px;
        font-size: 12px; font-weight: 600;
        color: var(--color-text-primary);
        font-family: 'Inter', sans-serif;
        cursor: pointer; outline: none;
      }
      .fv-sort-select:focus { border-color: var(--color-brand); }
      /* ── Grid ── */
      .fv-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
        padding: 20px;
      }
      @media (max-width: 480px) {
        .fv-grid { grid-template-columns: 1fr; }
      }
      @media (min-width: 900px) {
        .fv-grid { grid-template-columns: repeat(3, 1fr); }
      }
      /* ── Card ── */
      .fv-card {
        background: var(--color-surface-primary);
        border: 1px solid var(--color-border);
        border-radius: 16px; overflow: hidden;
        display: flex; flex-direction: column;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .fv-card:hover {
        border-color: var(--color-brand);
        box-shadow: var(--shadow-brand, 0 0 0 1px rgba(139,92,246,0.20), 0 8px 32px -8px rgba(139,92,246,0.40));
      }
      .fv-card-img-wrap {
        position: relative;
        aspect-ratio: 4/3;
        background: #111;
        overflow: hidden;
      }
      .fv-card-img {
        width: 100%; height: 100%;
        object-fit: contain;
        padding: 12px;
      }
      .fv-card-fav-btn {
        position: absolute; top: 8px; right: 8px;
        width: 32px; height: 32px; border-radius: 50%;
        background: rgba(0,0,0,0.5);
        border: 1px solid rgba(255,255,255,0.15);
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; font-size: 15px;
        transition: background 0.15s;
        color: #EF4444;
      }
      .fv-card-fav-btn:hover { background: rgba(239,68,68,0.2); }
      .fv-card-body { padding: 14px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
      .fv-card-badges { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
      .fv-badge-ev {
        font-size: 10px; font-weight: 700; padding: 2px 8px;
        border-radius: 5px; text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .fv-badge-cat {
        font-size: 10px; color: var(--color-text-muted);
        text-transform: uppercase; letter-spacing: 0.04em;
      }
      .fv-card-name {
        font-size: 15px; font-weight: 700;
        color: var(--color-text-primary); margin: 0;
        line-height: 1.3;
      }
      .fv-card-desc {
        font-size: 12px; color: var(--color-text-secondary);
        line-height: 1.5; margin: 0;
        display: -webkit-box; -webkit-line-clamp: 2;
        -webkit-box-orient: vertical; overflow: hidden;
      }
      .fv-card-price-row {
        display: flex; align-items: center; gap: 8px;
        padding: 8px 0 0;
        border-top: 1px solid var(--color-border);
        margin-top: auto;
      }
      .fv-card-price-label {
        font-size: 10px; font-weight: 600;
        color: var(--color-text-muted); text-transform: uppercase;
        letter-spacing: 0.04em; flex-shrink: 0;
      }
      .fv-card-price-val {
        font-size: 15px; font-weight: 800;
        color: var(--color-text-primary);
      }
      .fv-card-price-unit {
        font-size: 11px; font-weight: 500;
        color: var(--color-text-muted);
      }
      .fv-card-actions {
        display: flex; gap: 8px; margin-top: 8px;
      }
      .fv-btn-detail {
        flex: 1; padding: 9px 12px;
        border-radius: 10px;
        border: 1px solid var(--color-border-strong);
        background: transparent; color: var(--color-text-secondary);
        font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600;
        cursor: pointer; text-align: center;
        transition: background 0.15s;
      }
      .fv-btn-detail:hover { background: var(--color-surface-hover); color: var(--color-text-primary); }
      .fv-btn-buy {
        flex: 1; padding: 9px 12px;
        border-radius: 10px; border: none;
        background: var(--color-brand); color: #fff;
        font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 700;
        cursor: pointer; text-align: center;
        transition: background 0.15s;
      }
      .fv-btn-buy:hover { background: var(--color-brand-hover); }
      /* ── Empty ── */
      .fv-empty {
        grid-column: 1/-1; text-align: center;
        padding: 60px 20px; display: flex;
        flex-direction: column; align-items: center; gap: 12px;
      }
      .fv-empty-icon { font-size: 48px; opacity: 0.5; }
      .fv-empty-title {
        font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; font-weight: 800;
        font-size: 20px; color: var(--color-text-primary); margin: 0;
      }
      .fv-empty-sub {
        font-size: 14px; color: var(--color-text-secondary);
        margin: 0; max-width: 300px; line-height: 1.6;
      }
      .fv-empty-btn {
        background: var(--color-brand); color: #fff;
        border: none; border-radius: 10px; padding: 11px 24px;
        font-size: 14px; font-weight: 600; cursor: pointer;
        font-family: 'Inter', sans-serif; margin-top: 4px;
        transition: background 0.15s;
      }
      .fv-empty-btn:hover { background: var(--color-brand-hover); }
    `,document.head.appendChild(e)}_render(){const e=this._getFavoriteSupplements(),a=e.filter(r=>g(r,this._activeGoal)),t=b(a,this._sortKey);this.container.innerHTML=`
      <div class="fv-root">
        <div class="fv-header">
          <nav class="fv-breadcrumb" aria-label="Breadcrumb">
            <span>Home</span>
            <span class="fv-breadcrumb-sep">/</span>
            <span>Favoritos</span>
          </nav>
          <div class="fv-title-row">
            <h1 class="fv-title">Meus Favoritos</h1>
            <button class="fv-btn-optimize" id="fv-btn-optimize" aria-label="Otimizar todos">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              Otimizar Todos
            </button>
          </div>
        </div>

        ${e.length===0?`
          <div class="fv-grid">
            <div class="fv-empty">
              <div class="fv-empty-icon">🤍</div>
              <h2 class="fv-empty-title">Nenhum favorito ainda</h2>
              <p class="fv-empty-sub">Explore o catálogo e toque ♥ para salvar seus suplementos favoritos aqui.</p>
              <button class="fv-empty-btn" id="fv-go-catalog">Ver Catálogo →</button>
            </div>
          </div>
        `:`
          <div class="fv-controls">
            <div class="fv-chips" role="group" aria-label="Filtrar por objetivo">
              ${u.map(r=>`
                <button class="fv-chip${this._activeGoal===r.key?" active":""}"
                  data-goal="${r.key}" type="button">
                  ${r.label}
                </button>`).join("")}
            </div>
            <div class="fv-sort-wrap">
              <span class="fv-sort-label">Ordenar por</span>
              <select class="fv-sort-select" id="fv-sort">
                <option value="evidence" ${this._sortKey==="evidence"?"selected":""}>Maior Evidência</option>
                <option value="az" ${this._sortKey==="az"?"selected":""}>A–Z</option>
                <option value="default" ${this._sortKey==="default"?"selected":""}>Padrão</option>
              </select>
            </div>
          </div>

          <div class="fv-grid" id="fv-grid">
            ${t.length===0?`<div class="fv-empty">
                   <div class="fv-empty-icon">🔍</div>
                   <h2 class="fv-empty-title">Nenhum resultado</h2>
                   <p class="fv-empty-sub">Nenhum favorito neste objetivo.</p>
                 </div>`:t.map(r=>this._renderCard(r)).join("")}
          </div>
        `}
      </div>
    `,this._bindEvents()}_renderCard(e){const a=e.image||`/assets/${e.id.replace(/-/g,"_")}.png`,t=c[e.evidenceLevel]??c.C,r=e.benefits?.[0]??"",n=e.pricePerGram?Math.round((e.dosage?.maintenance??5)*e.pricePerGram*30):null,s=n?`R$ ${n}`:null;return`
      <article class="fv-card" data-id="${o(e.id)}">
        <div class="fv-card-img-wrap">
          <img class="fv-card-img"
            src="${o(a)}" alt="${o(e.name)}"
            loading="lazy"
            onerror="this.style.opacity='0'"
          />
          <button class="fv-card-fav-btn" data-action="remove-fav" data-id="${o(e.id)}"
            aria-label="Remover dos favoritos" type="button">♥</button>
        </div>
        <div class="fv-card-body">
          <div class="fv-card-badges">
            <span class="fv-badge-ev" style="background:${t.bg};color:${t.color};">
              NÍVEL ${o(e.evidenceLevel??"C")}
            </span>
            <span class="fv-badge-cat">${o(e.category??"")}</span>
          </div>
          <h3 class="fv-card-name">${o(e.name)}</h3>
          ${r?`<p class="fv-card-desc">${o(r)}</p>`:""}
          ${s?`
            <div class="fv-card-price-row">
              <span class="fv-card-price-label">Melhor Preço</span>
              <span class="fv-card-price-val">${o(s)}</span>
              <span class="fv-card-price-unit">/mês</span>
            </div>
          `:""}
          <div class="fv-card-actions">
            <button class="fv-btn-detail" data-action="go-list" data-id="${o(e.id)}" type="button">
              Detalhes
            </button>
            <button class="fv-btn-buy" data-action="go-list" data-id="${o(e.id)}" type="button">
              Ver Preços
            </button>
          </div>
        </div>
      </article>
    `}_bindEvents(){const e=this.container.querySelector(".fv-root");if(!e)return;e.addEventListener("click",t=>{const r=t.target.closest("[data-goal]");if(r){this._activeGoal=r.dataset.goal,this._render();return}const n=t.target.closest('[data-action="remove-fav"]');if(n){f(n.dataset.id),this._render();return}if(t.target.closest('[data-action="go-list"]')){window.history.pushState(null,null,"/list"),window.dispatchEvent(new PopStateEvent("popstate"));return}if(t.target.closest("#fv-btn-optimize")){window.history.pushState(null,null,"/my-stack"),window.dispatchEvent(new PopStateEvent("popstate"));return}if(t.target.closest("#fv-go-catalog")){window.history.pushState(null,null,"/list"),window.dispatchEvent(new PopStateEvent("popstate"));return}});const a=e.querySelector("#fv-sort");a&&a.addEventListener("change",t=>{this._sortKey=t.target.value,this._render()})}}export{w as default};
