class e{constructor(n){this.container=n}mount(){this.container.innerHTML=`
      <section style="padding:32px 24px;max-width:720px;margin:0 auto;">
        <h1 style="font-family:'Syne',sans-serif;font-weight:800;font-size:28px;margin:0 0 12px;">FAQ</h1>
        <p style="color:var(--color-text-secondary,#9A9A9A);">Em breve.</p>
      </section>
    `}unmount(){this.container.innerHTML=""}}export{e as default};
