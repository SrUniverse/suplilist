const m=[{category:"Geral",items:[{q:"O SupliList é gratuito?",a:"Sim, 100% gratuito. Sem plano pago, sem assinatura oculta, sem anúncios no app. As comissões de afiliados (opcionais) ajudam a manter o projeto."},{q:"Preciso criar uma conta?",a:"Não. O SupliList não tem sistema de login. Tudo funciona localmente no seu dispositivo, sem nenhum cadastro."},{q:"Funciona sem internet?",a:"Sim. É um PWA (Progressive Web App). Após o primeiro acesso, funciona completamente offline. Você pode instalá-lo na tela inicial do celular como um app nativo."}]},{category:"Suplementos & Dosagens",items:[{q:"As dosagens são recomendações médicas?",aHtml:'NÃO. As dosagens exibidas são baseadas em literatura científica e têm caráter exclusivamente educativo e informativo. Elas não constituem prescrição ou aconselhamento médico. Sempre consulte um médico ou nutricionista antes de iniciar, alterar ou interromper qualquer suplementação. Acesse nosso <a class="faq-link" data-href="#/legal?doc=medico">Aviso Médico</a> completo.'},{q:"De onde vêm as informações dos suplementos?",a:"De estudos clínicos, revisões sistemáticas e meta-análises publicadas em bases científicas. Cada suplemento possui um Nível de Evidência (A, B ou C) que reflete a robustez das evidências disponíveis."},{q:"O que significam os níveis de evidência?",a:"Grau A: evidência forte, múltiplos estudos de alta qualidade confirmam o efeito. Grau B: evidência moderada, estudos sugerem efeito mas com limitações. Grau C: evidência preliminar ou limitada, mais pesquisas necessárias."}]},{category:"Preços & Compras",items:[{q:"Os preços são atualizados em tempo real?",a:"Os preços exibidos são referências e podem não refletir o valor atual. Sempre confirme o preço final diretamente no site do vendedor (Amazon, Mercado Livre ou Shopee) antes de comprar."},{q:"Vocês ganham comissão nas compras?",aHtml:'Sim, alguns links são de programas de afiliados (Amazon Associates, ML Afiliados, Shopee Afiliados). Ao comprar por esses links, podemos receber uma pequena comissão, sem nenhum custo adicional para você. Isso ajuda a manter o SupliList gratuito. Veja nossa política completa de <a class="faq-link" data-href="#/legal?doc=afiliados">afiliados</a>.'}]},{category:"Privacidade & Dados",items:[{q:"Meus dados são seguros?",aHtml:'Sim. Toda a sua informação (stack, check-ins, perfil) fica armazenada exclusivamente no localStorage do seu navegador. Não possuímos servidores, não coletamos dados pessoais e não temos acesso a nenhuma informação sua. Consulte nossa <a class="faq-link" data-href="#/legal?doc=privacidade">Política de Privacidade</a>.'},{q:"Como faço backup dos meus dados?",aHtml:'Acesse <a class="faq-link" data-href="#/settings">Configurações</a> → Dados &amp; Privacidade → Exportar meus dados. Um arquivo JSON com todos os seus dados será baixado para o seu dispositivo.'},{q:"Como apago tudo?",a:"Acesse Configurações → Dados & Privacidade → Resetar tudo. Atenção: esta ação é irreversível."}]}],p=`
.faq-page {
  padding: 24px;
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.faq-header h1 {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-text-primary);
  margin: 0 0 8px;
}

.faq-header p {
  font-size: 15px;
  color: var(--color-text-secondary);
  margin: 0;
}

.faq-search {
  width: 100%;
  padding: 12px 16px;
  border-radius: 10px;
  background: var(--color-surface-primary);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s ease;
}

.faq-search:focus {
  border-color: var(--color-border-strong);
}

.faq-search::placeholder {
  color: var(--color-text-muted);
}

.faq-categories {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.faq-category {
  display: flex;
  flex-direction: column;
}

.faq-category-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin: 24px 0 12px;
}

.faq-item {
  margin-bottom: 8px;
}

.faq-item-btn {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: none;
  color: var(--color-text-primary);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
  gap: 12px;
}

.faq-item-btn:hover {
  background: var(--color-surface-primary);
}

.faq-item-icon {
  color: var(--color-brand);
  font-size: 20px;
  font-weight: 400;
  line-height: 1;
  flex-shrink: 0;
}

.faq-item-body {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.25s ease;
}

.faq-item-body-inner {
  padding: 0 16px 16px;
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.7;
}

.faq-link {
  cursor: pointer;
  color: var(--color-brand);
  font-weight: 600;
  text-decoration: underline;
}

.faq-footer {
  font-size: 13px;
  color: var(--color-text-muted);
  padding-top: 8px;
}

.faq-footer p {
  margin: 0;
}

.faq-footer-link {
  cursor: pointer;
  color: var(--color-brand);
  font-weight: 600;
  text-decoration: underline;
}
`;class f{constructor(e,a){this.container=e,this.params=a||{},this._onLinkClick=this._onLinkClick.bind(this),this._onSearch=this._onSearch.bind(this)}mount(){this._injectStyles(),this.container.innerHTML=this._render(),this._bindEvents()}unmount(){this.container.innerHTML=""}_injectStyles(){if(!document.getElementById("faq-page-styles")){const e=document.createElement("style");e.id="faq-page-styles",e.textContent=p,document.head.appendChild(e)}}_render(){return`
      <div class="faq-page">
        <div class="faq-header">
          <h1>Perguntas Frequentes</h1>
          <p>Tudo que você precisa saber sobre o SupliList</p>
        </div>

        <input
          type="text"
          class="faq-search"
          placeholder="Buscar pergunta..."
          aria-label="Buscar pergunta"
        />

        <div class="faq-categories">
          ${m.map((e,a)=>this._renderCategory(e,a)).join("")}
        </div>

        <div class="faq-footer">
          <p>Não encontrou sua resposta? <a class="faq-footer-link" data-href="#/legal">Consulte os Termos de Uso</a></p>
        </div>
      </div>
    `}_renderCategory(e,a){return`
      <div class="faq-category" data-category-index="${a}">
        <h2 class="faq-category-label">${this._escapeHtml(e.category)}</h2>
        ${e.items.map((o,t)=>this._renderItem(o,a,t)).join("")}
      </div>
    `}_renderItem(e,a,o){const t=e.aHtml?e.aHtml:this._escapeHtml(e.a||"");return`
      <div class="faq-item" data-category="${a}" data-item="${o}">
        <button
          class="faq-item-btn"
          aria-expanded="false"
          data-ci="${a}"
          data-ii="${o}"
        >
          <span class="faq-item-question">${this._escapeHtml(e.q)}</span>
          <span class="faq-item-icon" aria-hidden="true">+</span>
        </button>
        <div class="faq-item-body" id="faq-body-${a}-${o}">
          <div class="faq-item-body-inner">${t}</div>
        </div>
      </div>
    `}_escapeHtml(e){return String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}_bindEvents(){const e=this.container.querySelector(".faq-page");e.querySelectorAll(".faq-item-btn").forEach(o=>{o.addEventListener("click",()=>this._toggleItem(o))}),e.addEventListener("click",this._onLinkClick),e.querySelector(".faq-search").addEventListener("input",this._onSearch)}_toggleItem(e){const a=e.dataset.ci,o=e.dataset.ii,t=this.container.querySelector(`#faq-body-${a}-${o}`),s=e.querySelector(".faq-item-icon");e.getAttribute("aria-expanded")==="true"?(t.style.maxHeight="0",e.setAttribute("aria-expanded","false"),s.textContent="+"):(t.style.maxHeight=t.scrollHeight+"px",e.setAttribute("aria-expanded","true"),s.textContent="−")}_onLinkClick(e){const a=e.target.closest(".faq-link, .faq-footer-link");if(!a)return;e.preventDefault();const o=a.dataset.href;o&&(window.location.hash=o)}_onSearch(e){const a=e.target.value.trim().toLowerCase();this.container.querySelectorAll(".faq-category").forEach(t=>{const s=t.querySelectorAll(".faq-item");let i=0;s.forEach(r=>{const d=r.querySelector(".faq-item-question").textContent.toLowerCase(),n=r.querySelector(".faq-item-body-inner"),l=n?n.textContent.toLowerCase():"",c=!a||d.includes(a)||l.includes(a);r.style.display=c?"":"none",c&&i++}),t.style.display=i>0?"":"none"})}}export{f as default};
