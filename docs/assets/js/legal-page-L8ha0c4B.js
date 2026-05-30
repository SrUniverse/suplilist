const n={termos:"Termos de Uso",privacidade:"Política de Privacidade",medico:"Aviso Médico",afiliados:"Divulgação de Afiliados"};class i{constructor(e){this.container=e}_resolveDoc(){const e=window.location.hash||"",o=e.indexOf("?");return o===-1?null:new URLSearchParams(e.slice(o+1)).get("doc")}mount(){const e=this._resolveDoc(),o=n[e]||"Informações Legais";this.container.innerHTML=`
      <section style="padding:32px 24px;max-width:720px;margin:0 auto;">
        <h1 style="font-family:'Syne',sans-serif;font-weight:800;font-size:28px;margin:0 0 12px;">${o}</h1>
        <p style="color:var(--color-text-secondary,#9A9A9A);">Conteúdo em breve.</p>
      </section>
    `}unmount(){this.container.innerHTML=""}}export{i as default};
