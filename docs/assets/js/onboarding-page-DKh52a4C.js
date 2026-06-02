import{s as i,A as o,e as r,E as l}from"./main-BWFwH5mN.js";import{r as c}from"./stack-recommender-JQlhCcvA.js";import{e as s}from"./escape-Br5wU8qn.js";const p=[{key:"bulk",emoji:"💪",label:"Hipertrofia"},{key:"strength",emoji:"⚡",label:"Força"},{key:"cut",emoji:"🔥",label:"Emagrecimento"},{key:"endurance",emoji:"🏃",label:"Resistência"},{key:"general",emoji:"🛡️",label:"Saúde Geral"}];class m{constructor(t){this.container=t,this.step=1,this.data={name:"",goal:null,selectedIds:new Set},this._suggestions=[],this._clickHandler=null,this._popstateHandler=null}mount(){this._popstateHandler=()=>{window.history.replaceState(null,null,"/onboarding")},window.addEventListener("popstate",this._popstateHandler),this._render()}unmount(){this._popstateHandler&&(window.removeEventListener("popstate",this._popstateHandler),this._popstateHandler=null),this._clickHandler&&(this.container.removeEventListener("click",this._clickHandler),this._clickHandler=null),this.container.innerHTML=""}_render(){switch(this._clickHandler&&(this.container.removeEventListener("click",this._clickHandler),this._clickHandler=null),this.step){case 1:this._renderStep1();break;case 2:this._renderStep2();break;case 3:this._renderStep3();break}this._clickHandler=t=>this._handleClick(t),this.container.addEventListener("click",this._clickHandler)}_renderStep1(){this.container.innerHTML=`
      <div class="onboarding-wrap">
        <div class="onboarding-card">
          <p class="onboarding-progress">1 / 3</p>
          <h1 class="onboarding-title">Bem-vindo ao SupliList</h1>
          <p class="onboarding-subtitle">Vamos montar seu stack personalizado em 2 minutos.</p>
          <input
            class="onboarding-input"
            type="text"
            placeholder="Seu nome"
            autocomplete="given-name"
            value="${s(this.data.name)}"
            style="margin-bottom:1.75rem"
          />
          <div class="onboarding-actions">
            <button class="onboarding-btn-next" ${this.data.name.trim()?"":"disabled"}>
              Começar →
            </button>
          </div>
        </div>
      </div>`;const t=this.container.querySelector(".onboarding-input"),a=this.container.querySelector(".onboarding-btn-next");t.addEventListener("input",()=>{this.data.name=t.value,a.disabled=!t.value.trim()}),setTimeout(()=>t.focus(),50)}_renderStep2(){const t=p.map(a=>`
      <button
        class="onboarding-goal-card${this.data.goal===a.key?" selected":""}"
        data-goal="${a.key}"
      >
        <span class="onboarding-goal-card__emoji">${a.emoji}</span>
        <span class="onboarding-goal-card__label">${a.label}</span>
      </button>`).join("");this.container.innerHTML=`
      <div class="onboarding-wrap">
        <div class="onboarding-card">
          <p class="onboarding-progress">2 / 3</p>
          <h1 class="onboarding-title">Qual é seu principal objetivo?</h1>
          <p class="onboarding-subtitle">Vamos personalizar seu stack baseado nisso.</p>
          <div class="onboarding-goal-grid">${t}</div>
          <div class="onboarding-actions">
            <button class="onboarding-btn-back">← Voltar</button>
            <button class="onboarding-btn-next" ${this.data.goal?"":"disabled"}>
              Continuar →
            </button>
          </div>
        </div>
      </div>`}_renderStep3(){this._suggestions.length||(this._suggestions=c.recommend({objective:this.data.goal}),this.data.selectedIds=new Set(this._suggestions.map(a=>a.id)));const t=this._suggestions.length?this._suggestions.map(a=>{const e=this.data.selectedIds.has(a.id);return`
            <div class="onboarding-supp-card${e?" selected":""}" data-supp="${s(a.id)}">
              <div class="onboarding-supp-card__check">${e?"✓":""}</div>
              <div class="onboarding-supp-card__info">
                <div class="onboarding-supp-card__name">${s(a.name)}</div>
                <div class="onboarding-supp-card__meta">${s(a.category)} · ${s(String(a.dosage.daily))}${s(a.dosage.unit)}/dia · Evidência ${s(a.evidenceLevel??a.priority)}</div>
              </div>
            </div>`}).join(""):'<div class="onboarding-supp-empty">Nenhuma sugestão encontrada. Você pode explorar o catálogo após o cadastro.</div>';this.container.innerHTML=`
      <div class="onboarding-wrap">
        <div class="onboarding-card">
          <p class="onboarding-progress">3 / 3</p>
          <h1 class="onboarding-title">Seu stack recomendado</h1>
          <p class="onboarding-subtitle">Baseado no seu objetivo. Você pode ajustar depois.</p>
          <div class="onboarding-supp-list">${t}</div>
          <div class="onboarding-actions">
            <button class="onboarding-btn-back">← Voltar</button>
            <button class="onboarding-btn-next">Adicionar ao meu stack e começar!</button>
          </div>
        </div>
      </div>`}_handleClick(t){if(t.target.closest(".onboarding-btn-back")){this.step=Math.max(1,this.step-1),this._render();return}const a=t.target.closest("[data-goal]");if(a){if(a.dataset.goal===this.data.goal)return;this.data.goal=a.dataset.goal,this._suggestions=[],this.data.selectedIds=new Set,this.container.querySelectorAll(".onboarding-goal-card").forEach(d=>{d.classList.toggle("selected",d.dataset.goal===this.data.goal)});const n=this.container.querySelector(".onboarding-btn-next");n&&(n.disabled=!1);return}const e=t.target.closest("[data-supp]");if(e){const n=e.dataset.supp;this.data.selectedIds.has(n)?(this.data.selectedIds.delete(n),e.classList.remove("selected"),e.querySelector(".onboarding-supp-card__check").textContent=""):(this.data.selectedIds.add(n),e.classList.add("selected"),e.querySelector(".onboarding-supp-card__check").textContent="✓");return}t.target.closest(".onboarding-btn-next")&&(this.step<3?(this.step++,this._render()):this._submit())}_submit(){i.dispatch(o.SET_USER_PROFILE,{name:this.data.name.trim(),objective:this.data.goal}),this._suggestions.filter(t=>this.data.selectedIds.has(t.id)).forEach(t=>{i.dispatch(o.ADD_TO_STACK,{supplementId:t.id,name:t.name,dosage:t.dosage.daily,unit:t.dosage.unit})}),i.dispatch(o.COMPLETE_ONBOARDING),r.emit(l.ROUTER_NAVIGATE,{path:"/my-stack"})}}export{m as default};
