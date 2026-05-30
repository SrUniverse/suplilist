// legal-page.js — Documentos legais (placeholder mínimo)
// Contrato: export default class { constructor(container, params); mount(); unmount() }
// Lê o documento solicitado via query string (#/legal?doc=termos).

const DOCS = {
  termos: 'Termos de Uso',
  privacidade: 'Política de Privacidade',
  medico: 'Aviso Médico',
  afiliados: 'Divulgação de Afiliados',
};

export default class LegalPage {
  constructor(container) {
    this.container = container;
  }

  _resolveDoc() {
    const hash = window.location.hash || '';
    const qIndex = hash.indexOf('?');
    if (qIndex === -1) return null;
    const params = new URLSearchParams(hash.slice(qIndex + 1));
    return params.get('doc');
  }

  mount() {
    const key = this._resolveDoc();
    const title = DOCS[key] || 'Informações Legais';
    this.container.innerHTML = `
      <section style="padding:32px 24px;max-width:720px;margin:0 auto;">
        <h1 style="font-family:'Syne',sans-serif;font-weight:800;font-size:28px;margin:0 0 12px;">${title}</h1>
        <p style="color:var(--color-text-secondary,#9A9A9A);">Conteúdo em breve.</p>
      </section>
    `;
  }

  unmount() {
    this.container.innerHTML = '';
  }
}
