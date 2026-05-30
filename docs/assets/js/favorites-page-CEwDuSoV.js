import{S as d}from"./stack-recommender-b07295YU.js";import{S as s,e as l,s as c,A as f}from"./main-epZNF2O8.js";import{r as v}from"./evidence-D5RtUc7g.js";const p=()=>JSON.parse(localStorage.getItem(s.FAVORITES)||"[]"),u=n=>{const e=p(),t=e.indexOf(n);t===-1?e.push(n):e.splice(t,1),localStorage.setItem(s.FAVORITES,JSON.stringify(e))},h=()=>{try{const n=c.getState();return n&&n.stack?n.stack:[]}catch{return JSON.parse(localStorage.getItem(s.STACK)||"[]")}};class b{constructor(e){this.container=e,this._activeFilter="all",this._handleStorageChange=this._onStorageChange.bind(this)}mount(){window.addEventListener("storage",this._handleStorageChange),this._render()}unmount(){window.removeEventListener("storage",this._handleStorageChange),this.container.innerHTML=""}_onStorageChange(e){(e.key===s.FAVORITES||e.key===s.STACK)&&this._render()}_getFavoriteSupplements(){return p().map(t=>d.find(r=>r.id===t)).filter(Boolean)}_getCategories(e){return["all",...new Set(e.map(r=>r.category))]}_render(){const e=this._getFavoriteSupplements(),t=this._activeFilter==="all"?e:e.filter(a=>a.category===this._activeFilter),r=this._getCategories(e),o=h();this.container.innerHTML=`
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
                 </div>`:t.map(a=>this._renderCard(a,o)).join("")}
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
    `}_renderCard(e,t){const r=Array.isArray(t)&&t.some(a=>(typeof a=="string"?a:a.id)===e.id),o=e.image||`/assets/${e.id.replace(/-/g,"_")}.png`;return`
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
            src="${o}"
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
            ${v(e.evidenceLevel)}
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
    `}_bindEvents(){const e=this.container.querySelector("#btn-go-catalog");e&&e.addEventListener("click",()=>{window.location.hash="#/list"}),this.container.querySelectorAll("[data-filter]").forEach(t=>{t.addEventListener("click",r=>{this._activeFilter=r.currentTarget.dataset.filter,this._render()})}),this.container.querySelectorAll(".btn-remove-fav").forEach(t=>{t.addEventListener("click",r=>{const o=r.currentTarget.dataset.id;u(o),l.emit("favorites:changed",{id:o,action:"removed"}),this._render()})}),this.container.querySelectorAll(".btn-add-stack").forEach(t=>{t.addEventListener("click",r=>{const o=r.currentTarget.dataset.id,a=Number(o),i=d.find(g=>g.id===a);i&&(c.dispatch(f.ADD_TO_STACK,{supplementId:i.id,name:i.name,dosage:i.dosage?.maintenance??5,unit:i.dosage?.unit??"g",quantity:0}),l.emit("stack:changed",{id:a,action:"added"}),this._render())})}),this.container.querySelectorAll(".fav-card").forEach(t=>{t.addEventListener("mouseenter",()=>{t.style.borderColor="var(--color-border-strong,rgba(255,255,255,0.14))"}),t.addEventListener("mouseleave",()=>{t.style.borderColor="var(--color-border,rgba(255,255,255,0.07))"})}),this.container.querySelectorAll(".btn-remove-fav").forEach(t=>{t.addEventListener("mouseenter",()=>{t.style.background="var(--color-error-bg,rgba(239,68,68,0.10))"}),t.addEventListener("mouseleave",()=>{t.style.background="transparent"})}),this.container.querySelectorAll(".btn-add-stack").forEach(t=>{t.addEventListener("mouseenter",()=>{t.style.background="var(--color-brand-hover,#6D28D9)"}),t.addEventListener("mouseleave",()=>{t.style.background="var(--color-brand,#7C3AED)"})})}}export{b as default};
