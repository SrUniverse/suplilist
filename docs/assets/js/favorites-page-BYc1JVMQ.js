import{S as c}from"./stack-recommender-b07295YU.js";import{e as n,s as l}from"./main-7QosEGf5.js";const d=()=>JSON.parse(localStorage.getItem("suplilist:favorites")||"[]"),p=i=>{const e=d(),t=e.indexOf(i);t===-1?e.push(i):e.splice(t,1),localStorage.setItem("suplilist:favorites",JSON.stringify(e))},s=()=>{try{const i=l.getState();return i&&i.stack?i.stack:[]}catch{return JSON.parse(localStorage.getItem("suplilist:stack")||"[]")}},g=i=>{const e={A:{bg:"rgba(34,197,94,0.12)",color:"#22C55E"},B:{bg:"rgba(245,158,11,0.12)",color:"#F59E0B"},C:{bg:"rgba(163,163,163,0.12)",color:"#9A9A9A"}},t=e[i]||e.C;return`<span style="background:${t.bg};color:${t.color};font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px;text-transform:uppercase;letter-spacing:0.04em;">Evidência ${i}</span>`};class u{constructor(e){this.container=e,this._activeFilter="all",this._handleStorageChange=this._onStorageChange.bind(this)}mount(){window.addEventListener("storage",this._handleStorageChange),this._render()}unmount(){window.removeEventListener("storage",this._handleStorageChange),this.container.innerHTML=""}_onStorageChange(e){(e.key==="suplilist:favorites"||e.key==="suplilist:stack")&&this._render()}_getFavoriteSupplements(){return d().map(t=>c.find(r=>r.id===t)).filter(Boolean)}_getCategories(e){return["all",...new Set(e.map(r=>r.category))]}_render(){const e=this._getFavoriteSupplements(),t=this._activeFilter==="all"?e:e.filter(o=>o.category===this._activeFilter),r=this._getCategories(e),a=s();this.container.innerHTML=`
      <div style="min-height:100vh;background:var(--color-bg-primary,#080808);color:var(--color-text-primary,#F2F2F2);font-family:'Inter',sans-serif;">

        <!-- Header -->
        <div style="padding:32px 24px 0;">
          <h1 style="font-family:'Syne',sans-serif;font-weight:800;font-size:clamp(24px,5vw,36px);margin:0 0 6px;line-height:1.15;">
            ❤️ Favoritos
          </h1>
          <p style="margin:0;color:var(--color-text-secondary,#9A9A9A);font-size:14px;">
            ${e.length} suplemento${e.length!==1?"s":""} salvo${e.length!==1?"s":""}
          </p>
        </div>

        ${e.length===0?this._renderEmpty():`
          <!-- Filtros de categoria -->
          ${e.length>0?this._renderFilters(r):""}

          <!-- Grid de cards -->
          <div id="fav-grid" style="
            display:grid;
            grid-template-columns:repeat(auto-fill,minmax(260px,1fr));
            gap:16px;
            padding:24px;
          ">
            ${t.length===0?`<div style="grid-column:1/-1;text-align:center;padding:48px 0;color:var(--color-text-muted,#555);">
                   Nenhum favorito nesta categoria.
                 </div>`:t.map(o=>this._renderCard(o,a)).join("")}
          </div>
        `}

      </div>
    `,this._bindEvents()}_renderFilters(e){return`
      <div style="padding:20px 24px 0;display:flex;gap:8px;flex-wrap:wrap;">
        ${e.map(t=>{const r=this._activeFilter===t;return`<button
            data-filter="${t}"
            style="
              padding:6px 14px;
              border-radius:20px;
              border:1px solid ${r?"var(--color-brand,#7C3AED)":"var(--color-border-strong,rgba(255,255,255,0.14))"};
              background:${r?"var(--color-brand-muted,rgba(124,58,237,0.12))":"transparent"};
              color:${r?"var(--color-brand,#7C3AED)":"var(--color-text-secondary,#9A9A9A)"};
              font-size:13px;
              font-weight:${r?"600":"400"};
              cursor:pointer;
              transition:all 0.15s;
              font-family:'Inter',sans-serif;
            "
          >${t==="all"?"Todos":t}</button>`}).join("")}
      </div>
    `}_renderCard(e,t){const r=Array.isArray(t)&&t.some(o=>(typeof o=="string"?o:o.id)===e.id),a=e.image||`/assets/${e.id.replace(/-/g,"_")}.png`;return`
      <div class="fav-card" data-id="${e.id}" style="
        background:var(--color-surface-primary,#111111);
        border:1px solid var(--color-border,rgba(255,255,255,0.07));
        border-radius:16px;
        overflow:hidden;
        display:flex;
        flex-direction:column;
        transition:border-color 0.2s;
      ">
        <!-- Imagem -->
        <div style="height:160px;overflow:hidden;background:var(--color-surface-secondary,#161616);display:flex;align-items:center;justify-content:center;">
          <img
            src="${a}"
            alt="${e.name}"
            style="width:100%;height:100%;object-fit:cover;"
            onerror="this.style.display='none';this.parentElement.innerHTML='<span style=\\'font-size:48px;\\'>💊</span>'"
          />
        </div>

        <!-- Body -->
        <div style="padding:16px;flex:1;display:flex;flex-direction:column;gap:10px;">
          <!-- Categoria + Badge -->
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="font-size:11px;color:var(--color-text-muted,#555);text-transform:uppercase;letter-spacing:0.05em;">${e.category}</span>
            ${g(e.evidenceLevel)}
          </div>

          <!-- Nome -->
          <h3 style="margin:0;font-size:16px;font-weight:700;line-height:1.3;color:var(--color-text-primary,#F2F2F2);">${e.name}</h3>

          <!-- Benefício principal -->
          ${e.benefits&&e.benefits[0]?`
            <p style="margin:0;font-size:13px;color:var(--color-text-secondary,#9A9A9A);line-height:1.5;">
              ${e.benefits[0]}
            </p>
          `:""}

          <!-- Ações -->
          <div style="display:flex;gap:8px;margin-top:auto;padding-top:4px;">
            <!-- Remover dos favoritos -->
            <button
              class="btn-remove-fav"
              data-id="${e.id}"
              title="Remover dos favoritos"
              style="
                flex:1;
                display:flex;align-items:center;justify-content:center;gap:6px;
                padding:9px 12px;
                border-radius:10px;
                border:1px solid var(--color-border-strong,rgba(255,255,255,0.14));
                background:transparent;
                color:var(--color-error,#EF4444);
                font-size:13px;
                font-weight:600;
                cursor:pointer;
                transition:background 0.15s;
                font-family:'Inter',sans-serif;
              "
            >
              💔 Remover
            </button>

            <!-- Adicionar ao stack -->
            ${r?`
              <span style="
                flex:1;
                display:flex;align-items:center;justify-content:center;
                padding:9px 12px;
                border-radius:10px;
                background:var(--color-success-bg,rgba(34,197,94,0.10));
                color:var(--color-success,#22C55E);
                font-size:12px;
                font-weight:600;
              ">✓ No stack</span>
            `:`
              <button
                class="btn-add-stack"
                data-id="${e.id}"
                title="Adicionar ao stack"
                style="
                  flex:1;
                  display:flex;align-items:center;justify-content:center;gap:6px;
                  padding:9px 12px;
                  border-radius:10px;
                  border:none;
                  background:var(--color-brand,#7C3AED);
                  color:#fff;
                  font-size:13px;
                  font-weight:600;
                  cursor:pointer;
                  transition:background 0.15s;
                  font-family:'Inter',sans-serif;
                "
              >
                + Stack
              </button>
            `}
          </div>
        </div>
      </div>
    `}_renderEmpty(){return`
      <div style="display:flex;align-items:center;justify-content:center;min-height:60vh;padding:24px;">
        <div style="
          background:var(--color-surface-primary,#111111);
          border:1px solid var(--color-border,rgba(255,255,255,0.07));
          border-radius:16px;
          padding:48px 40px;
          text-align:center;
          max-width:380px;
          width:100%;
        ">
          <div style="font-size:56px;margin-bottom:20px;opacity:0.6;">🤍</div>
          <h2 style="font-family:'Syne',sans-serif;font-weight:800;font-size:22px;margin:0 0 10px;">
            Nenhum suplemento favorito ainda
          </h2>
          <p style="color:var(--color-text-secondary,#9A9A9A);font-size:14px;margin:0 0 28px;line-height:1.6;">
            Explore o catálogo e toque ♥ para salvar seus suplementos favoritos aqui.
          </p>
          <button id="btn-go-catalog" style="
            background:var(--color-brand,#7C3AED);
            color:#fff;
            border:none;
            border-radius:10px;
            padding:12px 28px;
            font-size:15px;
            font-weight:600;
            cursor:pointer;
            font-family:'Inter',sans-serif;
            transition:background 0.15s;
          ">Ver Catálogo →</button>
        </div>
      </div>
    `}_bindEvents(){const e=this.container.querySelector("#btn-go-catalog");e&&e.addEventListener("click",()=>{window.location.hash="#/list"}),this.container.querySelectorAll("[data-filter]").forEach(t=>{t.addEventListener("click",r=>{this._activeFilter=r.currentTarget.dataset.filter,this._render()})}),this.container.querySelectorAll(".btn-remove-fav").forEach(t=>{t.addEventListener("click",r=>{const a=r.currentTarget.dataset.id;p(a),n.emit("favorites:changed",{id:a,action:"removed"}),this._render()})}),this.container.querySelectorAll(".btn-add-stack").forEach(t=>{t.addEventListener("click",r=>{const a=r.currentTarget.dataset.id;try{l.addToStack(a)}catch{const o=s();o.includes(a)||(o.push(a),localStorage.setItem("suplilist:stack",JSON.stringify(o)))}n.emit("stack:changed",{id:a,action:"added"}),this._render()})}),this.container.querySelectorAll(".fav-card").forEach(t=>{t.addEventListener("mouseenter",()=>{t.style.borderColor="var(--color-border-strong,rgba(255,255,255,0.14))"}),t.addEventListener("mouseleave",()=>{t.style.borderColor="var(--color-border,rgba(255,255,255,0.07))"})}),this.container.querySelectorAll(".btn-remove-fav").forEach(t=>{t.addEventListener("mouseenter",()=>{t.style.background="var(--color-error-bg,rgba(239,68,68,0.10))"}),t.addEventListener("mouseleave",()=>{t.style.background="transparent"})}),this.container.querySelectorAll(".btn-add-stack").forEach(t=>{t.addEventListener("mouseenter",()=>{t.style.background="var(--color-brand-hover,#6D28D9)"}),t.addEventListener("mouseleave",()=>{t.style.background="var(--color-brand,#7C3AED)"})})}}export{u as default};
