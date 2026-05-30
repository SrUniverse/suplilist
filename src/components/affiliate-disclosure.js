/**
 * AffiliateDisclosure Web Component v4.0 — SupliList
 *
 * Web Component reutilizável com Shadow DOM.
 * Compliance: FTC (16 CFR Part 255), CVM (Instrução CVM nº 598/2018), LGPD (Lei nº 13.709/2018).
 *
 * Uso:
 *   <affiliate-disclosure locale="pt-BR"></affiliate-disclosure>
 *   <affiliate-disclosure locale="en-US" expanded></affiliate-disclosure>
 *   <affiliate-disclosure locale="pt-BR" sticky></affiliate-disclosure>
 *
 * Atributos:
 *   locale   — 'pt-BR' | 'en-US' | 'es-ES'  (default: 'pt-BR')
 *   expanded — boolean: mostrar texto completo imediatamente
 *   sticky   — boolean: renderizar como footer fixo (bottom: 72px, acima da nav)
 */

class AffiliateDisclosure extends HTMLElement {

  // ─────────────────────────────────────────────
  // CONTENT DEFINITIONS (por jurisdição)
  // ─────────────────────────────────────────────

  static CONTENT = {
    'pt-BR': {
      compact:       '💰 SupliList pode receber comissão pelos links. Seu preço não muda.',
      expandLabel:   'Saiba mais',
      collapseLabel: 'Recolher',
      title:         'Divulgação de Afiliado',
      full: `
        O SupliList pode receber uma comissão quando você realiza uma compra através
        dos links de afiliado neste aplicativo. Esta comissão é paga pelos marketplaces
        parceiros (Shopee, Mercado Livre, Amazon), <strong>não por você</strong>.
        <br><br>
        <strong>Seu preço não aumenta.</strong> A comissão é descontada da margem do marketplace,
        não adicionada ao seu valor de compra.
        <br><br>
        Seguimos as diretrizes da <strong>CVM</strong> (Instrução CVM nº 598/2018),
        <strong>FTC</strong> (16 CFR Part 255) e <strong>LGPD</strong>
        (Lei nº 13.709/2018). Todos os links patrocinados são claramente identificados
        com o ícone 💰.
        <br><br>
        <a href="/legal/affiliate-disclosure" target="_blank" rel="noopener">
          Política de afiliados completa →
        </a>
      `,
      badge: 'Parceria declarada',
    },

    'en-US': {
      compact:       "💰 SupliList may earn a commission from links. Your price won't change.",
      expandLabel:   'Learn more',
      collapseLabel: 'Show less',
      title:         'Affiliate Disclosure',
      full: `
        SupliList may earn a commission when you purchase through affiliate links
        on this app. This commission is paid by our partner marketplaces,
        <strong>not by you</strong>.
        <br><br>
        <strong>Your price does not increase.</strong> The commission is deducted from
        the marketplace's margin, not added to your purchase price.
        <br><br>
        We comply with <strong>FTC guidelines</strong> (16 CFR Part 255) and applicable
        consumer protection laws. All sponsored links are clearly identified with the 💰 icon.
        <br><br>
        <a href="/legal/affiliate-disclosure" target="_blank" rel="noopener">
          Full affiliate policy →
        </a>
      `,
      badge: 'Declared partnership',
    },

    'es-ES': {
      compact:       '💰 SupliList puede recibir comisión por los enlaces. Tu precio no cambia.',
      expandLabel:   'Saber más',
      collapseLabel: 'Colapsar',
      title:         'Divulgación de Afiliado',
      full: `
        SupliList puede recibir una comisión cuando realizas una compra a través de
        los enlaces de afiliado en esta aplicación. Esta comisión la pagan los
        marketplaces asociados, <strong>no tú</strong>.
        <br><br>
        <strong>Tu precio no aumenta.</strong> La comisión se descuenta del margen
        del marketplace.
        <br><br>
        <a href="/legal/affiliate-disclosure" target="_blank" rel="noopener">
          Política de afiliados completa →
        </a>
      `,
      badge: 'Asociación declarada',
    },
  };

  // ─────────────────────────────────────────────
  // WEB COMPONENT LIFECYCLE
  // ─────────────────────────────────────────────

  static get observedAttributes() {
    return ['locale', 'expanded', 'sticky'];
  }

  constructor() {
    super();
    this._expanded = false;
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this._expanded = this.hasAttribute('expanded');
    this._render();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    if (name === 'expanded') this._expanded = newVal !== null;
    if (name === 'locale' || name === 'sticky') this._render();
  }

  // ─────────────────────────────────────────────
  // RENDER (Shadow DOM — estilos completamente isolados)
  // ─────────────────────────────────────────────

  _render() {
    const locale  = this.getAttribute('locale') || 'pt-BR';
    const content = AffiliateDisclosure.CONTENT[locale]
                 ?? AffiliateDisclosure.CONTENT['pt-BR']; // fallback

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }

        /* ── Container ── */
        .disclosure {
          padding: 12px 16px;
          background: #141414;
          border: 1px solid #2A2A2A;
          border-radius: 10px;
          font-size: 12px;
          color: #888;
          line-height: 1.5;
          transition: border-color 200ms;
        }
        .disclosure:focus-within { border-color: rgba(124,58,237,0.25); }

        /* Sticky variant — fixed footer acima da bottom nav */
        :host([sticky]) .disclosure {
          position: fixed;
          bottom: 72px;
          left: 16px;
          right: 16px;
          z-index: 50;
          border-radius: 12px;
          box-shadow: 0 -4px 24px rgba(0,0,0,0.5);
          max-width: 560px;
          margin: 0 auto;
        }

        /* ── Compact Row (sempre visível) ── */
        .disclosure-compact {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .disclosure-text {
          flex: 1;
          min-width: 0;
          color: #888;
          font-size: 12px;
          margin: 0;
        }

        .disclosure-badge {
          flex-shrink: 0;
          padding: 3px 8px;
          background: rgba(124,58,237,0.08);
          border: 1px solid rgba(124,58,237,0.2);
          border-radius: 999px;
          font-size: 10px;
          color: #7C3AED;
          font-weight: 600;
          white-space: nowrap;
        }

        /* ── Expand Button ── */
        .expand-btn {
          flex-shrink: 0;
          background: none;
          border: none;
          color: #7C3AED;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          padding: 4px 0;
          font-family: inherit;
          white-space: nowrap;
          text-decoration: underline;
          text-decoration-style: dotted;
          text-underline-offset: 2px;
          transition: color 150ms;
        }
        .expand-btn:hover { color: #9F67FF; }
        .expand-btn:focus-visible {
          outline: 2px solid #7C3AED;
          outline-offset: 2px;
          border-radius: 3px;
        }

        /* ── Full Text (colapsável) ── */
        .disclosure-full {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #2A2A2A;
          font-size: 12px;
          color: #888;
          line-height: 1.7;
          animation: disclosure-slide-down 200ms ease;
        }

        @keyframes disclosure-slide-down {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .disclosure-full strong { color: #FAFAFA; }
        .disclosure-full a {
          color: #7C3AED;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .disclosure-full a:hover { color: #9F67FF; }

        .disclosure-title {
          font-size: 13px;
          font-weight: 700;
          color: #FAFAFA;
          margin: 0 0 8px;
        }
      </style>

      <div
        class="disclosure"
        role="note"
        aria-label="${content.title}"
        itemscope
        itemtype="https://schema.org/DisclosureNotice"
      >
        <!-- Compact row — sempre visível -->
        <div class="disclosure-compact">
          <p class="disclosure-text" itemprop="text">${content.compact}</p>
          <span class="disclosure-badge" aria-hidden="true">${content.badge}</span>
          <button
            class="expand-btn"
            aria-expanded="${this._expanded}"
            aria-controls="disclosure-full-text"
          >${this._expanded ? content.collapseLabel : content.expandLabel}</button>
        </div>

        <!-- Full text — colapsável -->
        ${this._expanded ? `
          <div
            class="disclosure-full"
            id="disclosure-full-text"
            role="region"
            aria-label="${content.title}"
          >
            <p class="disclosure-title">${content.title}</p>
            <div>${content.full}</div>
          </div>
        ` : ''}
      </div>
    `;

    // Listener de expand/collapse
    this.shadowRoot.querySelector('.expand-btn')?.addEventListener('click', () => {
      this._expanded = !this._expanded;
      this._render();
    });
  }
}

// Guard: não registrar duas vezes
if (!customElements.get('affiliate-disclosure')) {
  customElements.define('affiliate-disclosure', AffiliateDisclosure);
}

export default AffiliateDisclosure;
