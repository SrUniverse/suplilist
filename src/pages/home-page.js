// ============================================================
// home-page.js — Landing page de marketing (dark / premium)
// Estilo Linear / Vercel / Raycast. Sem sidebar/topbar.
// ============================================================

import { SUPPLEMENTS_DB } from '../ai/stack-recommender.js';

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
        const hash = navTarget.getAttribute('data-nav');
        if (hash) window.location.hash = hash;
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
        icon: '💰',
        title: 'Comparação de Preços',
        text: 'Amazon, Mercado Livre e Shopee lado a lado. Compre sempre pelo melhor preço, sem sair do app.',
      },
      {
        icon: '⚗️',
        title: 'Dosagem Científica',
        text: 'Doses calculadas pelo seu peso, objetivo e biometria — sem chute, baseadas em evidência.',
      },
      {
        icon: '⭐',
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

    const markets = ['Amazon', 'Mercado Livre', 'Shopee'];

    return `
      <div class="lp-root">

        <nav class="lp-nav" aria-label="Navegação principal">
          <div class="lp-nav__inner">
            <a class="lp-logo" data-nav="#/home" href="#/home" aria-label="SupliList — início">SupliList</a>
            <button class="lp-btn lp-btn--primary lp-btn--sm" data-nav="#/list" type="button">
              Entrar no App →
            </button>
          </div>
        </nav>

        <main>

          <section class="lp-hero" aria-label="Apresentação">
            <div class="lp-hero__bg" aria-hidden="true"></div>
            <div class="lp-hero__inner">
              <span class="lp-pill lp-anim" style="--d:0s">✦ Suplementação com Ciência</span>
              <h1 class="lp-hero__title lp-anim" style="--d:.08s">
                SUPLEMENTAÇÃO BASEADA EM <span class="lp-accent">EVIDÊNCIAS.</span>
              </h1>
              <p class="lp-hero__sub lp-anim" style="--d:.16s">
                Compare preços, calcule dosagens personalizadas e monitore sua adesão.
                100% offline, sem assinatura.
              </p>
              <div class="lp-hero__cta lp-anim" style="--d:.24s">
                <button class="lp-btn lp-btn--primary lp-btn--lg" data-nav="#/list" type="button">Começar Agora →</button>
                <button class="lp-btn lp-btn--outline lp-btn--lg" data-action="scroll-features" type="button">Ver Recursos ↓</button>
              </div>
              <p class="lp-hero__stats lp-anim" style="--d:.32s">
                ${count}+ Suplementos · 3 Marketplaces · 100% Offline · Evidência Clínica
              </p>
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

          <section class="lp-section" aria-label="Filtro por treino">
            <h2 class="lp-h2">FILTRADO POR COMO VOCÊ TREINA.</h2>
            <div class="lp-chips">
              ${goals
                .map(
                  (g) => `<button class="lp-chip" data-nav="#/list" type="button">${g}</button>`
                )
                .join('')}
            </div>
          </section>

          <section class="lp-section" aria-label="Marketplaces">
            <h2 class="lp-h2">OS MAIORES MARKETPLACES DO BRASIL.</h2>
            <div class="lp-grid lp-grid--3">
              ${markets
                .map(
                  (m) => `
                <article class="lp-market">
                  <span class="lp-market__name">${m}</span>
                  <span class="lp-market__badge">Integrado</span>
                </article>`
                )
                .join('')}
            </div>
          </section>

          <section class="lp-cta" aria-label="Comece agora">
            <h2 class="lp-cta__title">PARE DE ADIVINHAR.<br>COMECE COM CIÊNCIA.</h2>
            <p class="lp-cta__sub">Sem cadastro. Sem assinatura. Tudo no seu dispositivo.</p>
            <button class="lp-btn lp-btn--primary lp-btn--lg" data-nav="#/list" type="button">Abrir o App →</button>
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
              <a class="lp-footer__link" data-nav="#/list" href="#/list">Catálogo</a>
              <a class="lp-footer__link" data-nav="#/dosage" href="#/dosage">Calculadora</a>
              <a class="lp-footer__link" data-nav="#/my-stack" href="#/my-stack">Meu Stack</a>
            </div>

            <div class="lp-footer__col">
              <h3 class="lp-footer__head">Suporte</h3>
              <a class="lp-footer__link" data-nav="#/faq" href="#/faq">FAQ</a>
              <a class="lp-footer__link" data-nav="#/settings" href="#/settings">Configurações</a>
            </div>

            <div class="lp-footer__col">
              <h3 class="lp-footer__head">Legal</h3>
              <a class="lp-footer__link" data-nav="#/legal?doc=termos" href="#/legal?doc=termos">Termos de Uso</a>
              <a class="lp-footer__link" data-nav="#/legal?doc=privacidade" href="#/legal?doc=privacidade">Privacidade</a>
              <a class="lp-footer__link" data-nav="#/legal?doc=medico" href="#/legal?doc=medico">Aviso Médico</a>
              <a class="lp-footer__link" data-nav="#/legal?doc=afiliados" href="#/legal?doc=afiliados">Afiliados</a>
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
      .lp-logo {
        font-family: 'Syne', sans-serif; font-weight: 800;
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
      .lp-hero__inner { position: relative; z-index: 1; max-width: 760px; }
      .lp-pill {
        display: inline-block; font-size: 13px; font-weight: 500;
        color: var(--color-text-secondary, #9A9A9A);
        background: var(--color-surface-secondary, #161616);
        border: 1px solid var(--color-border, rgba(255,255,255,0.07));
        padding: 7px 16px; border-radius: 999px; margin-bottom: 28px;
      }
      .lp-hero__title {
        font-family: 'Syne', sans-serif; font-weight: 800;
        font-size: clamp(44px, 8vw, 96px); line-height: 1.05;
        letter-spacing: -0.03em; margin: 0 0 24px;
      }
      .lp-accent { color: var(--color-brand, #7C3AED); }
      .lp-hero__sub {
        font-size: 18px; line-height: 1.6;
        color: var(--color-text-secondary, #9A9A9A);
        max-width: 560px; margin: 0 auto 36px;
      }
      .lp-hero__cta {
        display: flex; gap: 14px; justify-content: center;
        flex-wrap: wrap; margin-bottom: 40px;
      }
      .lp-hero__stats {
        font-size: 14px; color: var(--color-text-muted, #555555);
        margin: 0; letter-spacing: 0.01em;
      }

      /* ── SEÇÕES ── */
      .lp-section { max-width: 1160px; margin: 0 auto; padding: 80px 24px; }
      .lp-h2 {
        font-family: 'Syne', sans-serif; font-weight: 800;
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
      .lp-card__icon { font-size: 30px; margin-bottom: 18px; }
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
        font-family: 'Syne', sans-serif; font-weight: 800; font-size: 20px;
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
        display: flex; align-items: center; justify-content: space-between;
        transition: border-color .2s ease;
      }
      .lp-market:hover { border-color: var(--color-border-strong, rgba(255,255,255,0.14)); }
      .lp-market__name { font-size: 18px; font-weight: 700; }
      .lp-market__badge {
        font-size: 12px; font-weight: 600;
        color: var(--color-success, #22C55E);
        background: rgba(34, 197, 94, 0.12);
        padding: 5px 12px; border-radius: 999px;
      }

      /* ── CTA FINAL ── */
      .lp-cta { max-width: 760px; margin: 0 auto; padding: 110px 24px; text-align: center; }
      .lp-cta__title {
        font-family: 'Syne', sans-serif; font-weight: 800;
        font-size: clamp(32px, 6vw, 64px); line-height: 1.08;
        letter-spacing: -0.03em; margin: 0 0 20px;
      }
      .lp-cta__sub { font-size: 17px; color: var(--color-text-secondary, #9A9A9A); margin: 0 0 32px; }

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
