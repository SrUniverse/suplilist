// ============================================================
// home-page.js — Landing page de marketing (dark / premium)
// Estilo Linear / Vercel / Raycast. Sem sidebar/topbar.
// ============================================================

import { SUPPLEMENTS_DB } from '../ai/stack-recommender.js';
import { escapeHtml } from '../utils/escape.js';

export default class HomePage {
  constructor(container) {
    this.container = container;
    this._styleEl = null;
    this._onClick = null;
  }

  mount() {
    this._injectStyle();
    this.container.innerHTML = this._template();
    this._bindEvents();
  }

  unmount() {
    if (this._onClick) {
      this.container.removeEventListener('click', this._onClick);
      this._onClick = null;
    }
    this.container.innerHTML = '';
  }

  // ──────────────────────────────────────────────────────────
  // Eventos — delegação para qualquer [data-nav]
  // ──────────────────────────────────────────────────────────
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
          document.getElementById('lp-features')?.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };
    this.container.addEventListener('click', this._onClick);
  }

  // ──────────────────────────────────────────────────────────
  // Template
  // ──────────────────────────────────────────────────────────
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
        logo: `<svg width="90" height="28" viewBox="0 0 90 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><text x="0" y="22" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#FF9900">amazon</text></svg>`,
      },
      {
        name: 'Mercado Livre',
        color: '#FFE600',
        logo: `<svg width="110" height="28" viewBox="0 0 110 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><text x="0" y="22" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#FFE600">Mercado Livre</text></svg>`,
      },
      {
        name: 'Shopee',
        color: '#EE4D2D',
        logo: `<svg width="80" height="28" viewBox="0 0 80 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><text x="0" y="22" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#EE4D2D">shopee</text></svg>`,
      },
    ];

    return `
      <div class="lp-root">

        <nav class="lp-nav" aria-label="Navegação principal">
          <div class="lp-nav__inner">
            <a class="lp-logo" data-nav="/home" href="/home" aria-label="SupliList — início">SupliList</a>
            <div class="lp-nav__actions">
              <a class="lp-nav__ig" href="https://www.instagram.com/suplilist/" target="_blank" rel="noopener" aria-label="Instagram SupliList">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                @suplilist
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
                  100% offline, sem assinatura.
                </p>
                <div class="lp-hero__cta lp-anim" style="--d:.24s">
                  <button class="lp-btn lp-btn--primary lp-btn--lg" data-nav="/list" type="button">Começar Agora →</button>
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
                  (g) => `<button class="lp-chip" data-nav="/list?objective=${encodeURIComponent(g)}" type="button">${g}</button>`
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
            <p class="lp-cta__sub">Sem cadastro. Sem assinatura. Tudo no seu dispositivo.</p>
            <button class="lp-btn lp-btn--primary lp-btn--lg" data-nav="/list" type="button">Abrir o App →</button>
          </section>

          <section class="lp-section lp-instagram" aria-label="Instagram">
            <div class="lp-ig__card">
              <div class="lp-ig__inner">
                <div class="lp-ig__left">
                  <div class="lp-ig__icon" aria-hidden="true">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
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
                  rel="noopener"
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
              <a class="lp-footer__link lp-footer__link--ig" href="https://www.instagram.com/suplilist/" target="_blank" rel="noopener">
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

  // ──────────────────────────────────────────────────────────
  // Hero mock product cards
  // ──────────────────────────────────────────────────────────
  _heroMockupCards() {
    const items = SUPPLEMENTS_DB.slice(0, 3);
    return `<div class="lp-mock-stack">
      ${items.map(item => {
        const monthPrice = ((item.dosage?.maintenance ?? 5) * (item.pricePerGram ?? 0.3) * 30)
          .toFixed(2).replace('.', ',');
        const ev = item.evidenceLevel || 'A';
        return `
          <div class="lp-mock-card">
            <div class="lp-mock-card__ev">EV. ${escapeHtml(String(ev))}</div>
            <div class="lp-mock-card__name">${escapeHtml(item.name)}</div>
            <div class="lp-mock-card__cat">${escapeHtml(item.category || '')}</div>
            <div class="lp-mock-card__price">R$ ${monthPrice}<span class="lp-mock-card__dose"> / mês</span></div>
          </div>`;
      }).join('')}
    </div>`;
  }

  // ──────────────────────────────────────────────────────────
  // Estilos
  // ──────────────────────────────────────────────────────────
  _injectStyle() {
    if (document.querySelector('[data-page="home"]')) return;
    const style = document.createElement('style');
    style.setAttribute('data-page', 'home');
    style.textContent = `
      .lp-root {
        background: var(--color-bg-primary, #080808);
        color: var(--color-text-primary, #F2F2F2);
        font-family: 'Inter', sans-serif;
        -webkit-font-smoothing: antialiased;
        min-height: 100vh;
        overflow-x: hidden;
      }
      .lp-root *, .lp-root *::before, .lp-root *::after { box-sizing: border-box; }

      /* ── NAV ── */
      .lp-nav {
        position: fixed; top: 0; left: 0; right: 0; z-index: 100;
        background: rgba(8, 8, 8, 0.8);
        backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--color-border, rgba(255,255,255,0.07));
      }
      .lp-nav__inner {
        max-width: 1160px; margin: 0 auto; padding: 14px 24px;
        display: flex; align-items: center; justify-content: space-between;
      }
      .lp-nav__actions {
        display: flex; align-items: center; gap: 16px;
      }
      .lp-nav__ig {
        display: flex; align-items: center; gap: 7px;
        font-size: 14px; font-weight: 500; text-decoration: none;
        color: var(--color-text-secondary, #9A9A9A);
        transition: color .15s ease;
      }
      .lp-nav__ig:hover { color: var(--color-text-primary, #F2F2F2); }
      .lp-logo {
        font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; font-weight: 800;
        font-size: 22px; letter-spacing: -0.02em;
        color: var(--color-brand, #7C3AED); text-decoration: none;
      }

      /* ── BOTÕES ── */
      .lp-btn {
        font-family: 'Inter', sans-serif; font-weight: 600;
        border-radius: 10px; cursor: pointer; border: 1px solid transparent;
        transition: background .18s ease, border-color .18s ease, transform .12s ease;
        white-space: nowrap; line-height: 1;
      }
      .lp-btn:active { transform: translateY(1px); }
      .lp-btn--sm { font-size: 14px; padding: 9px 16px; }
      .lp-btn--lg { font-size: 16px; padding: 15px 26px; }
      .lp-btn--primary { background: var(--color-brand, #7C3AED); color: #fff; }
      .lp-btn--primary:hover { background: var(--color-brand-hover, #6D28D9); }
      .lp-btn--outline {
        background: transparent; color: var(--color-text-primary, #F2F2F2);
        border-color: var(--color-border-strong, rgba(255,255,255,0.14));
      }
      .lp-btn--outline:hover { border-color: var(--color-text-secondary, #9A9A9A); }

      /* ── HERO ── */
      .lp-hero {
        position: relative; min-height: 100vh;
        display: flex; align-items: center; justify-content: center;
        text-align: center; padding: 120px 24px 80px; overflow: hidden;
      }
      .lp-hero__bg {
        position: absolute; inset: 0; z-index: 0; pointer-events: none;
        background:
          radial-gradient(60% 50% at 50% 0%, var(--color-brand-muted, rgba(124,58,237,0.12)), transparent 70%),
          var(--color-bg-primary, #080808);
      }
      /* Two-column hero layout */
      .lp-hero__inner {
        position: relative; z-index: 1;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 64px;
        align-items: center;
        max-width: 1160px;
      }
      .lp-hero__left {
        display: flex; flex-direction: column; align-items: flex-start;
        text-align: left;
      }
      .lp-pill {
        display: inline-block; font-size: 13px; font-weight: 500;
        color: var(--color-text-secondary, #9A9A9A);
        background: var(--color-surface-secondary, #161616);
        border: 1px solid var(--color-border, rgba(255,255,255,0.07));
        padding: 7px 16px; border-radius: 999px; margin-bottom: 28px;
      }
      .lp-hero__title {
        font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; font-weight: 800;
        font-size: clamp(28px, 8vw, 96px); line-height: 1.05;
        letter-spacing: -0.03em; margin: 0 0 24px;
        overflow-wrap: break-word; word-break: break-word;
      }
      .lp-accent { color: var(--color-brand, #7C3AED); }
      .lp-hero__sub {
        font-size: 18px; line-height: 1.6;
        color: var(--color-text-secondary, #9A9A9A);
        margin: 0 0 36px;
      }
      .lp-hero__cta {
        display: flex; gap: 14px;
        flex-wrap: wrap; margin-bottom: 40px;
        justify-content: flex-start;
      }

      /* Mock product cards */
      .lp-mock-stack {
        display: flex; flex-direction: column; gap: 12px;
      }
      .lp-mock-card {
        background: var(--color-surface-primary, #111111);
        border: 1px solid var(--color-border, rgba(255,255,255,0.07));
        border-radius: 14px; padding: 20px 22px;
        display: flex; flex-direction: column; gap: 6px;
        transition: transform .3s ease, border-color .3s ease;
      }
      .lp-mock-card:hover {
        transform: translateX(-4px);
        border-color: var(--color-border-strong, rgba(255,255,255,0.14));
      }
      .lp-mock-card__ev {
        font-size: 10px; font-weight: 700; letter-spacing: .08em;
        color: var(--color-success, #22C55E);
        background: rgba(34,197,94,0.12);
        padding: 2px 8px; border-radius: 999px;
        width: fit-content;
      }
      .lp-mock-card__name { font-size: 16px; font-weight: 700; color: var(--color-text-primary); }
      .lp-mock-card__cat  { font-size: 12px; color: var(--color-text-muted); }
      .lp-mock-card__price { font-size: 15px; font-weight: 600; color: var(--color-brand); margin-top: 4px; }
      .lp-mock-card__dose  { font-size: 11px; color: var(--color-text-muted); font-weight: 400; }
      .lp-hero__stats {
        font-size: 14px; color: var(--color-text-muted, #555555);
        margin: 0; letter-spacing: 0.01em;
      }

      /* ── SEÇÕES ── */
      .lp-section-wrap { width: 100%; }
      .lp-section-wrap--alt { background: var(--color-bg-secondary, #0F0F0F); }
      .lp-section { max-width: 1160px; margin: 0 auto; padding: 80px 24px; }
      .lp-h2 {
        font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; font-weight: 800;
        font-size: clamp(28px, 4.5vw, 48px); line-height: 1.1;
        letter-spacing: -0.02em; text-align: center; margin: 0 0 56px;
      }

      .lp-grid { display: grid; gap: 20px; }
      .lp-grid--3 { grid-template-columns: repeat(3, 1fr); }

      .lp-card, .lp-step {
        background: var(--color-surface-primary, #111111);
        border: 1px solid var(--color-border, rgba(255,255,255,0.07));
        border-radius: 16px; padding: 32px;
        transition: border-color .2s ease, transform .2s ease;
      }
      .lp-card:hover, .lp-step:hover {
        border-color: var(--color-border-strong, rgba(255,255,255,0.14));
        transform: translateY(-3px);
      }
      .lp-card__icon {
        width: 52px; height: 52px; border-radius: 14px;
        display: flex; align-items: center; justify-content: center;
        background: var(--color-brand-muted, rgba(124,58,237,0.12));
        margin-bottom: 20px;
      }
      .lp-card__title {
        font-size: 19px; font-weight: 700; margin: 0 0 10px;
        color: var(--color-text-primary, #F2F2F2);
      }
      .lp-card__text {
        font-size: 15px; line-height: 1.6; margin: 0;
        color: var(--color-text-secondary, #9A9A9A);
      }
      .lp-step__num {
        width: 44px; height: 44px; border-radius: 12px;
        display: flex; align-items: center; justify-content: center;
        font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; font-weight: 800; font-size: 20px;
        color: var(--color-brand, #7C3AED);
        background: var(--color-brand-muted, rgba(124,58,237,0.12));
        margin-bottom: 18px;
      }

      /* ── CHIPS ── */
      .lp-chips { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }
      .lp-chip {
        font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 500;
        color: var(--color-text-primary, #F2F2F2);
        background: var(--color-surface-secondary, #161616);
        border: 1px solid var(--color-border, rgba(255,255,255,0.07));
        padding: 11px 22px; border-radius: 999px; cursor: pointer;
        transition: border-color .18s ease, background .18s ease, color .18s ease;
      }
      .lp-chip:hover {
        border-color: var(--color-brand, #7C3AED);
        background: var(--color-brand-muted, rgba(124,58,237,0.12));
      }

      /* ── MARKETPLACES ── */
      .lp-market {
        background: var(--color-surface-primary, #111111);
        border: 1px solid var(--color-border, rgba(255,255,255,0.07));
        border-radius: 16px; padding: 28px 32px;
        display: flex; flex-direction: column;
        align-items: flex-start; gap: 20px;
        transition: border-color .2s ease, transform .2s ease;
      }
      .lp-market:hover {
        border-color: var(--mk-color, rgba(255,255,255,0.14));
        transform: translateY(-2px);
      }
      .lp-market__logo { display: flex; align-items: center; }
      .lp-market__badge {
        font-size: 12px; font-weight: 600;
        color: var(--color-success, #22C55E);
        background: rgba(34, 197, 94, 0.12);
        padding: 5px 12px; border-radius: 999px;
      }

      /* ── CTA FINAL ── */
      .lp-cta { max-width: 760px; margin: 0 auto; padding: 110px 24px; text-align: center; }
      .lp-cta__title {
        font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; font-weight: 800;
        font-size: clamp(32px, 6vw, 64px); line-height: 1.08;
        letter-spacing: -0.03em; margin: 0 0 20px;
      }
      .lp-cta__sub { font-size: 17px; color: var(--color-text-secondary, #9A9A9A); margin: 0 0 32px; }

      /* ── INSTAGRAM SECTION ── */
      .lp-instagram { padding-top: 40px; padding-bottom: 40px; }
      .lp-ig__card {
        max-width: 720px; margin: 0 auto 20px;
        padding: 2px; border-radius: 20px;
        background: linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%);
      }
      .lp-ig__inner {
        background: var(--color-bg-primary, #0A0A0A);
        border-radius: 18px; padding: 28px 32px;
        display: flex; align-items: center; justify-content: space-between;
        gap: 24px; flex-wrap: wrap;
      }
      .lp-ig__left {
        display: flex; align-items: center; gap: 20px; flex: 1;
      }
      .lp-ig__icon {
        width: 60px; height: 60px; border-radius: 16px; flex-shrink: 0;
        background: linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%);
        display: flex; align-items: center; justify-content: center;
      }
      .lp-ig__handle {
        font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; font-weight: 800;
        font-size: 20px; margin: 0 0 6px;
        background: linear-gradient(135deg, #c056ff, #ff6b35);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .lp-ig__bio {
        font-size: 14px; line-height: 1.5; margin: 0;
        color: var(--color-text-secondary, #9A9A9A);
      }
      .lp-btn--ig {
        display: flex; align-items: center; gap: 8px;
        font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600;
        padding: 12px 20px; border-radius: 12px; border: none;
        background: linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%);
        color: #fff; cursor: pointer; text-decoration: none; white-space: nowrap;
        transition: opacity .18s ease, transform .12s ease;
      }
      .lp-btn--ig:hover { opacity: 0.88; transform: translateY(-1px); }
      .lp-btn--ig:active { transform: translateY(1px); }
      .lp-ig__cta-text {
        text-align: center; font-size: 14px;
        color: var(--color-text-muted, #555555); max-width: 480px; margin: 0 auto;
      }

      /* ── FOOTER ── */
      .lp-footer {
        border-top: 1px solid var(--color-border, rgba(255,255,255,0.07));
        background: var(--color-surface-primary, #111111);
        padding: 64px 24px 40px;
      }
      .lp-footer__grid {
        max-width: 1160px; margin: 0 auto;
        display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 40px;
      }
      .lp-footer__brand .lp-logo { display: inline-block; margin-bottom: 14px; }
      .lp-footer__tagline { font-size: 14px; color: var(--color-text-secondary, #9A9A9A); margin: 0 0 8px; }
      .lp-footer__meta { font-size: 13px; color: var(--color-text-muted, #555555); margin: 0; }
      .lp-footer__head {
        font-size: 13px; font-weight: 600; text-transform: uppercase;
        letter-spacing: 0.06em; color: var(--color-text-muted, #555555); margin: 0 0 16px;
      }
      .lp-footer__link {
        display: block; font-size: 15px; text-decoration: none;
        color: var(--color-text-secondary, #9A9A9A);
        margin-bottom: 12px; transition: color .15s ease; cursor: pointer;
      }
      .lp-footer__link:hover { color: var(--color-text-primary, #F2F2F2); }
      .lp-disclaimer {
        max-width: 1160px; margin: 56px auto 0; padding-top: 28px;
        border-top: 1px solid var(--color-border, rgba(255,255,255,0.07));
        font-size: 12px; line-height: 1.6; color: var(--color-text-muted, #555555);
      }
      .lp-copyright {
        max-width: 1160px; margin: 20px auto 0;
        font-size: 12px; color: var(--color-text-muted, #555555);
      }

      /* ── ANIMAÇÃO ── */
      @keyframes lp-fade-in-up {
        from { opacity: 0; transform: translateY(20px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .lp-anim { opacity: 0; animation: lp-fade-in-up .6s ease forwards; animation-delay: var(--d, 0s); }

      /* Mobile: single column, hide right panel */
      @media (max-width: 860px) {
        .lp-hero__inner {
          grid-template-columns: 1fr;
          text-align: center;
        }
        .lp-hero__left { align-items: center; }
        .lp-hero__cta  { justify-content: center; }
        .lp-hero__right { display: none; }
      }

      /* ── RESPONSIVO ── */
      @media (max-width: 768px) {
        .lp-grid--3 { grid-template-columns: 1fr; }
        .lp-footer__grid { grid-template-columns: 1fr 1fr; }
        .lp-footer__brand { grid-column: 1 / -1; }
        .lp-section { padding: 56px 20px; }
        .lp-hero { padding: 100px 20px 64px; }
        .lp-hero__cta .lp-btn { flex: 1 1 auto; }
      }
      @media (max-width: 480px) {
        .lp-footer__grid { grid-template-columns: 1fr; }
        .lp-hero__title { font-size: clamp(24px, 9vw, 40px); }
        .lp-h2 { font-size: clamp(20px, 7vw, 32px); margin-bottom: 36px; }
        .lp-cta__title { font-size: clamp(24px, 8vw, 40px); }
        .lp-hero { padding: 90px 16px 56px; }
        .lp-section { padding: 48px 16px; }
        .lp-card, .lp-step { padding: 24px 20px; }
      }
      @media (prefers-reduced-motion: reduce) {
        .lp-anim { animation: none; opacity: 1; }
        .lp-card:hover, .lp-step:hover { transform: none; }
      }
    `;
    document.head.appendChild(style);
    this._styleEl = style;
  }
}
