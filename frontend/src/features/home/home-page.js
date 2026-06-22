// ============================================================
// home-page.js — Landing page de marketing (dark / premium)
// Estilo Linear / Vercel / Raycast. Sem sidebar/topbar.
// ============================================================

import { SUPPLEMENTS_DB } from '../stack/stack-recommender.js';
import { escapeHtml } from '../../utils/escape.js';
import { SchemaManager } from '../../platform/schema-manager.js';
import './home-page.css';

export default class HomePage {
  /**
   * Initialize the HomePage component.
   * @param {HTMLElement} container - The DOM container element where the landing page will render.
   */
  constructor(container) {
    this.container = container;
    this._onClick = null;
  }

  /**
   * Mount the landing page component. Injects styles, renders the template, binds event listeners,
   * and inserts WebApplication schema for SEO.
   * @returns {void}
   */
  mount() {
    this.container.innerHTML = this._template();
    this._bindEvents();

    // Insert WebApplication + Organization schema for SEO
    SchemaManager.insertSchema(SchemaManager.createWebApplicationSchema());
    SchemaManager.insertSchema(SchemaManager.createOrganizationSchema());
  }

  /**
   * Unmount the landing page component. Removes event listeners and clears DOM content.
   * @returns {void}
   */
  unmount() {
    if (this._onClick) {
      this.container.removeEventListener('click', this._onClick);
      this._onClick = null;
    }
    this.container.innerHTML = '';
  }

  /**
   * Bind click event listeners to the container. Delegates navigation clicks on [data-nav]
   * elements to perform client-side routing, and handles custom actions like scroll-features.
   * @private
   * @returns {void}
   */
  _bindEvents() {
    this._onClick = (e) => {
      const navTarget = e.target.closest('[data-nav]');
      if (navTarget) {
        e.preventDefault();
        const path = navTarget.getAttribute('data-nav');
        if (path && path.startsWith('/')) {
          window.history.pushState(null, null, path);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
        return;
      }
      const actionTarget = e.target.closest('[data-action]');
      if (actionTarget) {
        const action = actionTarget.getAttribute('data-action');
        if (action === 'scroll-features') {
          const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          document.getElementById('lp-features')?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth' });
        }
      }
    };
    this.container.addEventListener('click', this._onClick);
  }

  /**
   * Generate the complete landing page HTML template. Includes hero section with mockup cards,
   * feature cards, step-by-step guide, goal filter chips, marketplace integration cards, CTA sections,
   * Instagram promotion, and footer with navigation links.
   * @private
   * @returns {string} The complete HTML template string.
   */
  _template() {
    const count = SUPPLEMENTS_DB.length;

    const features = [
      {
        icon: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
        title: 'Comparação de Preços',
        text: 'Amazon, Mercado Livre e Shopee lado a lado. Compre sempre pelo melhor preço, sem sair do app.',
      },
      {
        icon: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/></svg>`,
        title: 'Dosagem Científica',
        text: 'Doses calculadas pelo seu peso, objetivo e biometria — sem chute, baseadas em evidência.',
      },
      {
        icon: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
        title: 'Stack Personalizado',
        text: 'Monte, monitore e evolua seu protocolo de suplementação ao longo do tempo.',
      },
    ];

    const steps = [
      { n: '1', title: 'Defina seus Objetivos', text: 'Hipertrofia, longevidade, foco ou performance — você escolhe o caminho.' },
      { n: '2', title: 'Compare Preços e Doses', text: 'Cruze evidência clínica e o melhor preço entre 3 marketplaces.' },
      { n: '3', title: 'Monitore e Avance', text: 'Acompanhe sua adesão e ajuste o protocolo conforme você evolui.' },
    ];

    const goals = ['Hipertrofia', 'Saúde Geral', 'Longevidade', 'Performance', 'Foco', 'Emagrecimento'];

    const markets = [
      {
        name: 'Amazon',
        color: '#FF9900',
        logo: `<svg width="116" height="40" viewBox="0 0 116 40" xmlns="http://www.w3.org/2000/svg" aria-label="Amazon" role="img">
          <text x="0" y="26" font-family="Arial,sans-serif" font-size="28" font-weight="700" fill="#FF9900" letter-spacing="-1">amazon</text>
          <path d="M8 33 C22 40 52 40 66 33" stroke="#FF9900" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <path d="M63 30 L67 33 L62 36" stroke="#FF9900" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`,
      },
      {
        name: 'Mercado Livre',
        color: '#FFE600',
        logo: `<svg width="160" height="40" viewBox="0 0 160 40" xmlns="http://www.w3.org/2000/svg" aria-label="Mercado Livre" role="img">
          <!-- Ícone carrinho ML -->
          <path d="M4 8 L8 8 L12 24 L32 24 L36 12 L10 12" stroke="#3483FA" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M14 30 A2 2 0 1 0 14.01 30" stroke="#3483FA" stroke-width="2.5" fill="#3483FA"/>
          <path d="M28 30 A2 2 0 1 0 28.01 30" stroke="#3483FA" stroke-width="2.5" fill="#3483FA"/>
          <!-- Texto -->
          <text x="42" y="18" font-family="Arial,sans-serif" font-size="13" font-weight="800" fill="#FFE600">Mercado</text>
          <text x="42" y="34" font-family="Arial,sans-serif" font-size="13" font-weight="800" fill="#3483FA">Livre</text>
        </svg>`,
      },
      {
        name: 'Shopee',
        color: '#EE4D2D',
        logo: `<svg width="120" height="40" viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg" aria-label="Shopee" role="img">
          <!-- Ícone sacola Shopee -->
          <path d="M4 14 L4 34 Q4 38 8 38 L28 38 Q32 38 32 34 L32 14 Z" fill="#EE4D2D"/>
          <path d="M10 14 Q10 6 18 6 Q26 6 26 14" stroke="#EE4D2D" stroke-width="3" fill="none" stroke-linecap="round"/>
          <path d="M10 14 Q10 6 18 6 Q26 6 26 14" stroke="rgba(255,255,255,0.4)" stroke-width="3" fill="none" stroke-linecap="round"/>
          <path d="M10 22 Q18 28 26 22" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>
          <!-- Texto -->
          <text x="38" y="27" font-family="Arial,sans-serif" font-size="22" font-weight="800" fill="#EE4D2D" letter-spacing="-0.5">shopee</text>
        </svg>`,
      },
    ];

    return `
      <div class="lp-root">

        <nav class="lp-nav" aria-label="Navegação principal">
          <div class="lp-nav__inner">
            <a class="lp-logo" data-nav="/home" href="/home" aria-label="SupliList — início">SupliList</a>
            <div class="lp-nav__actions">
              <a class="lp-nav__ig" href="https://www.instagram.com/suplilist/" target="_blank" rel="noopener noreferrer" aria-label="Instagram @suplilist">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
              <button class="lp-btn lp-btn--primary lp-btn--sm" data-nav="/list" type="button">
                Entrar no App →
              </button>
            </div>
          </div>
        </nav>

        <main>

          <section class="lp-hero" aria-label="Apresentação">
            <div class="lp-hero__bg" aria-hidden="true"></div>
            <div class="lp-hero__inner">
              <div class="lp-hero__left">
                <span class="lp-pill lp-anim" style="--d:0s">✦ Suplementação com Ciência</span>
                <h1 class="lp-hero__title lp-anim" style="--d:.08s">
                  SUPLEMENTAÇÃO BASEADA EM <span class="lp-accent">EVIDÊNCIAS.</span>
                </h1>
                <p class="lp-hero__sub lp-anim" style="--d:.16s">
                  Compare preços, calcule dosagens personalizadas e monitore sua adesão.
                  100% offline. Grátis, com plano PRO opcional.
                </p>
                <div class="lp-hero__cta lp-anim" style="--d:.24s">
                  <button class="lp-btn lp-btn--primary lp-btn--lg" data-nav="/onboarding" type="button">Começar Agora →</button>
                  <button class="lp-btn lp-btn--outline lp-btn--lg" data-action="scroll-features" type="button">Ver Recursos ↓</button>
                </div>
                <p class="lp-hero__stats lp-anim" style="--d:.32s">
                  ${count}+ Suplementos · 3 Marketplaces · 100% Offline · Evidência Clínica
                </p>
              </div>
              <div class="lp-hero__right lp-anim" style="--d:.2s" aria-hidden="true">
                ${this._heroMockupCards()}
              </div>
            </div>
          </section>

          <section class="lp-section" id="lp-features" aria-label="Recursos">
            <h2 class="lp-h2">TUDO QUE VOCÊ PRECISA. JUNTO.</h2>
            <div class="lp-grid lp-grid--3">
              ${features
                .map(
                  (f) => `
                <article class="lp-card">
                  <div class="lp-card__icon" aria-hidden="true">${f.icon}</div>
                  <h3 class="lp-card__title">${f.title}</h3>
                  <p class="lp-card__text">${f.text}</p>
                </article>`
                )
                .join('')}
            </div>
          </section>

          <div class="lp-section-wrap lp-section-wrap--alt">
          <section class="lp-section" aria-label="Como funciona">
            <h2 class="lp-h2">3 PASSOS PARA COMPRAR CERTO.</h2>
            <div class="lp-grid lp-grid--3">
              ${steps
                .map(
                  (s) => `
                <article class="lp-step">
                  <div class="lp-step__num" aria-hidden="true">${s.n}</div>
                  <h3 class="lp-card__title">${s.title}</h3>
                  <p class="lp-card__text">${s.text}</p>
                </article>`
                )
                .join('')}
            </div>
          </section>
          </div>

          <section class="lp-section" aria-label="Filtro por treino">
            <h2 class="lp-h2">FILTRADO POR COMO VOCÊ TREINA.</h2>
            <div class="lp-chips">
              ${goals
                .map(
                  (g) => `<button class="lp-chip" data-nav="/list?objective=${encodeURIComponent(g)}" type="button" aria-label="Ver suplementos para ${escapeHtml(g)}">${escapeHtml(g)}</button>`
                )
                .join('')}
            </div>
          </section>

          <div class="lp-section-wrap lp-section-wrap--alt">
          <section class="lp-section" aria-label="Marketplaces">
            <h2 class="lp-h2">OS MAIORES MARKETPLACES DO BRASIL.</h2>
            <div class="lp-grid lp-grid--3">
              ${markets
                .map(
                  (m) => `
                <article class="lp-market" style="--mk-color: ${m.color}">
                  <div class="lp-market__logo">${m.logo}</div>
                  <span class="lp-market__badge">Integrado</span>
                </article>`
                )
                .join('')}
            </div>
          </section>
          </div>

          <section class="lp-cta" aria-label="Comece agora">
            <h2 class="lp-cta__title">PARE DE ADIVINHAR.<br>COMECE COM CIÊNCIA.</h2>
            <p class="lp-cta__sub">Sem cadastro. Grátis, com plano PRO opcional. Tudo no seu dispositivo.</p>
            <button class="lp-btn lp-btn--primary lp-btn--lg" data-nav="/list" type="button">Abrir o App →</button>
          </section>

          <section class="lp-section lp-instagram" aria-label="Instagram">
            <div class="lp-ig__card">
              <div class="lp-ig__inner">
                <div class="lp-ig__left">
                  <div class="lp-ig__icon" aria-hidden="true">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                  </div>
                  <div>
                    <p class="lp-ig__handle">@suplilist</p>
                    <p class="lp-ig__bio">Suplementação baseada em ciência. Compare preços, calcule doses, monte seu stack. 💊🔬</p>
                  </div>
                </div>
                <a
                  class="lp-btn lp-btn--ig"
                  href="https://www.instagram.com/suplilist/?utm_source=site&utm_medium=landing&utm_campaign=seguir"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Seguir @suplilist no Instagram"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                  Seguir no Instagram
                </a>
              </div>
            </div>
            <p class="lp-ig__cta-text">Dicas semanais de suplementação, promoções e novidades do app — tudo no Instagram.</p>
          </section>

        </main>

        <footer class="lp-footer" aria-label="Rodapé">
          <div class="lp-footer__grid">
            <div class="lp-footer__brand">
              <span class="lp-logo">SupliList</span>
              <p class="lp-footer__tagline">Suplementação baseada em evidências.</p>
              <p class="lp-footer__meta">100% offline · sem cadastro · LGPD</p>
            </div>

            <div class="lp-footer__col">
              <h3 class="lp-footer__head">Produto</h3>
              <a class="lp-footer__link" data-nav="/list" href="/list">Catálogo</a>
              <a class="lp-footer__link" data-nav="/dosage" href="/dosage">Calculadora</a>
              <a class="lp-footer__link" data-nav="/my-stack" href="/my-stack">Meu Stack</a>
            </div>

            <div class="lp-footer__col">
              <h3 class="lp-footer__head">Suporte</h3>
              <a class="lp-footer__link" data-nav="/faq" href="/faq">FAQ</a>
              <a class="lp-footer__link" data-nav="/settings" href="/settings">Configurações</a>
            </div>

            <div class="lp-footer__col">
              <h3 class="lp-footer__head">Legal</h3>
              <a class="lp-footer__link" data-nav="/legal?doc=termos" href="/legal?doc=termos">Termos de Uso</a>
              <a class="lp-footer__link" data-nav="/legal?doc=privacidade" href="/legal?doc=privacidade">Privacidade</a>
              <a class="lp-footer__link" data-nav="/legal?doc=medico" href="/legal?doc=medico">Aviso Médico</a>
              <a class="lp-footer__link" data-nav="/legal?doc=afiliados" href="/legal?doc=afiliados">Afiliados</a>
            </div>

            <div class="lp-footer__col">
              <h3 class="lp-footer__head">Redes Sociais</h3>
              <a class="lp-footer__link lp-footer__link--ig" href="https://www.instagram.com/suplilist/" target="_blank" rel="noopener noreferrer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:inline;vertical-align:middle;margin-right:6px"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                Instagram
              </a>
            </div>
          </div>

          <p class="lp-disclaimer">
            ⚕️ O SupliList é uma ferramenta educativa e não substitui orientação médica ou
            nutricional. Consulte um profissional antes de iniciar qualquer suplementação.
          </p>

          <p class="lp-copyright">© 2026 SupliList · Feito com ciência</p>
        </footer>

      </div>
    `;
  }

  /**
   * Generate hero section mockup product cards showing the first 3 supplements from SUPPLEMENTS_DB.
   * Displays supplement name, category, evidence level badge, and calculated monthly cost based on
   * dosage and price per gram.
   * @private
   * @returns {string} HTML string containing the mock product cards.
   */
  _heroMockupCards() {
    const items = SUPPLEMENTS_DB.slice(0, 3);
    return `<div class="lp-mock-stack">
      ${items.map(item => {
        let dailyGrams = item.dosage?.maintenance ?? 5;
        const unit = item.dosage?.unit || 'g';
        if (unit === 'mg') {
          dailyGrams = dailyGrams / 1000;
        } else if (unit === 'mcg') {
          dailyGrams = dailyGrams / 1_000_000;
        } else if (unit === 'UI') {
          dailyGrams = dailyGrams * 0.000025;
        }
        const monthPrice = (dailyGrams * (item.pricePerGram ?? 0.3) * 30)
          .toFixed(2).replace('.', ',');
        return `
          <div class="lp-mock-card">
            <div class="lp-mock-card__name">${escapeHtml(item.name)}</div>
            <div class="lp-mock-card__cat">${escapeHtml(item.category || '')}</div>
            <div class="lp-mock-card__price">R$ ${escapeHtml(monthPrice)}<span class="lp-mock-card__dose"> / mês</span></div>
          </div>`;
      }).join('')}
    </div>`;
  }
}
