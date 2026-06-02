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
          const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          document.getElementById('lp-features')?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth' });
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
                  100% offline, sem assinatura.
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
            <p class="lp-cta__sub">Sem cadastro. Sem assinatura. Tudo no seu dispositivo.</p>
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

  // ──────────────────────────────────────────────────────────
  // Hero mock product cards
  // ──────────────────────────────────────────────────────────
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
        const ev = item.evidenceLevel || 'A';
        return `
          <div class="lp-mock-card">
            <div class="lp-mock-card__ev">EV. ${escapeHtml(String(ev))}</div>
            <div class="lp-mock-card__name">${escapeHtml(item.name)}</div>
            <div class="lp-mock-card__cat">${escapeHtml(item.category || '')}</div>
            <div class="lp-mock-card__price">R$ ${escapeHtml(monthPrice)}<span class="lp-mock-card__dose"> / mês</span></div>
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
      .lp-btn--sm { font-size: 14px; padding: 9px 16px; min-height: 44px; }
      .lp-btn--lg { font-size: 16px; padding: 15px 26px; }
      .lp-btn--outline {
        background: transparent; color: var(--color-text-primary, #F2F2F2);
        border-color: var(--color-border-strong, rgba(255,255,255,0.14));
      }
      .lp-btn--outline:hover { border-color: var(--color-text-secondary, #9A9A9A); }

      /* ── HERO ── */
      .lp-hero {
        position: relative; min-height: 100vh;
        display: flex; align-items: center; justify-content: center;
        text-align: center; padding: 140px 24px 100px; overflow: hidden;
      }
      .lp-hero__bg {
        position: absolute; inset: 0; z-index: 0; pointer-events: none;
        background:
          radial-gradient(70% 55% at 50% 0%, rgba(124,58,237,0.18), transparent 65%),
          radial-gradient(40% 30% at 80% 20%, rgba(124,58,237,0.06), transparent 60%),
          var(--color-bg-primary, #080808);
      }
      /* Two-column hero layout */
      .lp-hero__inner {
        position: relative; z-index: 1;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 72px;
        align-items: center;
        max-width: 1160px;
      }
      .lp-hero__left {
        display: flex; flex-direction: column; align-items: flex-start;
        text-align: left;
      }
      .lp-pill {
        display: inline-flex; align-items: center; gap: 8px;
        font-size: 13px; font-weight: 700;
        color: #9F7AEA;
        background: rgba(124,58,237,0.08);
        border: 1px solid rgba(124,58,237,0.25);
        padding: 7px 16px; border-radius: 999px; margin-bottom: 32px;
        letter-spacing: 0.01em;
      }
      .lp-hero__title {
        font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; font-weight: 800;
        font-size: clamp(36px, 4.5vw, 64px); line-height: 1.05;
        letter-spacing: -0.04em; margin: 0 0 28px;
        overflow-wrap: break-word;
      }
      .lp-accent { color: var(--color-brand, #7C3AED); }
      .lp-hero__sub {
        font-size: 19px; line-height: 1.65;
        color: var(--color-text-secondary, #9A9A9A);
        margin: 0 0 48px; max-width: 480px;
      }
      .lp-hero__cta {
        display: flex; gap: 18px;
        flex-wrap: wrap; margin-bottom: 56px;
        justify-content: flex-start;
      }
      .lp-btn--primary {
        background: var(--color-brand, #7C3AED); color: #fff;
        box-shadow: 0 4px 20px rgba(124,58,237,0.30);
      }
      .lp-btn--primary:hover {
        background: var(--color-brand-hover, #6D28D9);
        box-shadow: 0 6px 28px rgba(124,58,237,0.45);
        transform: translateY(-1px);
      }

      /* Mock product cards */
      .lp-mock-stack {
        display: flex; flex-direction: column; gap: 14px;
      }
      .lp-mock-card {
        background: var(--color-surface-primary, #111111);
        border: 1px solid var(--color-border, rgba(255,255,255,0.07));
        border-left: 4px solid var(--color-brand, #7C3AED);
        border-radius: 14px; padding: 22px 24px;
        display: flex; flex-direction: column; gap: 6px;
        transition: transform .28s ease, border-color .28s ease, box-shadow .28s ease;
        box-shadow: 0 2px 12px rgba(0,0,0,0.3);
      }
      .lp-mock-card:hover {
        transform: translateX(-6px);
        border-top-color: rgba(124,58,237,0.3);
        border-right-color: rgba(124,58,237,0.3);
        border-bottom-color: rgba(124,58,237,0.3);
        border-left-color: var(--color-brand, #7C3AED);
        box-shadow: 0 8px 28px rgba(0,0,0,0.45), 0 0 0 1px rgba(124,58,237,0.1);
      }
      .lp-mock-card__ev {
        font-size: 10px; font-weight: 700; letter-spacing: .08em;
        color: var(--color-success, #22C55E);
        background: rgba(34,197,94,0.12);
        padding: 2px 8px; border-radius: 999px;
        width: fit-content;
      }
      .lp-mock-card__name { font-size: 16px; font-weight: 700; color: var(--color-text-primary); }
      .lp-mock-card__cat  { font-size: 12px; color: var(--color-text-secondary, #9A9A9A); }
      .lp-mock-card__price { font-size: 15px; font-weight: 600; color: var(--color-brand); margin-top: 6px; }
      .lp-mock-card__dose  { font-size: 11px; color: var(--color-text-secondary, #9A9A9A); font-weight: 400; }
      .lp-hero__stats {
        font-size: 13px; color: var(--color-text-muted, #555555);
        margin: 0; letter-spacing: 0.02em;
      }

      /* ── SEÇÕES ── */
      .lp-section-wrap { width: 100%; border-top: 1px solid var(--color-border, rgba(255,255,255,0.07)); }
      .lp-section-wrap--alt {
        background: linear-gradient(180deg, rgba(124,58,237,0.03) 0%, var(--color-bg-secondary, #0F0F0F) 40%);
        border-top: 1px solid var(--color-border, rgba(255,255,255,0.07));
        border-bottom: 1px solid var(--color-border, rgba(255,255,255,0.07));
      }
      .lp-section { max-width: 1160px; margin: 0 auto; padding: 96px 24px; }
      .lp-h2 {
        font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; font-weight: 800;
        font-size: clamp(32px, 4.5vw, 56px); line-height: 1.08;
        letter-spacing: -0.03em; text-align: center; margin: 0 0 64px;
      }

      .lp-grid { display: grid; gap: 24px; }
      .lp-grid--3 { grid-template-columns: repeat(3, 1fr); }

      .lp-card, .lp-step {
        background: var(--color-surface-primary, #111111);
        border: 1px solid var(--color-border, rgba(255,255,255,0.07));
        border-left: 4px solid var(--color-brand, #7C3AED);
        border-radius: 16px; padding: 36px;
        transition: border-color .2s ease, transform .22s ease, box-shadow .22s ease;
      }
      .lp-card:hover, .lp-step:hover {
        border-top-color: rgba(124,58,237,0.3);
        border-right-color: rgba(124,58,237,0.3);
        border-bottom-color: rgba(124,58,237,0.3);
        border-left-color: var(--color-brand, #7C3AED);
        transform: translateY(-6px);
        box-shadow: 0 16px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(124,58,237,0.08);
      }
      .lp-card__icon {
        width: 64px; height: 64px; border-radius: 16px;
        display: flex; align-items: center; justify-content: center;
        background: linear-gradient(135deg, rgba(124,58,237,0.18), rgba(124,58,237,0.08));
        box-shadow: 0 4px 16px rgba(124,58,237,0.15);
        margin-bottom: 24px;
      }
      .lp-card__title {
        font-size: 20px; font-weight: 700; margin: 0 0 12px; line-height: 1.2;
        color: var(--color-text-primary, #F2F2F2);
      }
      .lp-card__text {
        font-size: 15px; line-height: 1.65; margin: 0;
        color: var(--color-text-secondary, #9A9A9A);
      }
      .lp-step__num {
        width: 56px; height: 56px; border-radius: 14px;
        display: flex; align-items: center; justify-content: center;
        font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; font-weight: 800; font-size: 24px;
        color: var(--color-brand, #7C3AED);
        background: linear-gradient(135deg, rgba(124,58,237,0.18), rgba(124,58,237,0.08));
        box-shadow: 0 4px 16px rgba(124,58,237,0.15);
        margin-bottom: 22px;
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
        border-left: 6px solid var(--mk-color, rgba(255,255,255,0.14));
        border-radius: 16px; padding: 32px 36px;
        display: flex; flex-direction: column;
        align-items: flex-start; gap: 20px;
        transition: border-color .22s ease, transform .22s ease, box-shadow .22s ease;
        background-image: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 60%);
      }
      .lp-market:hover {
        border-top-color: rgba(255,255,255,0.12);
        border-right-color: rgba(255,255,255,0.12);
        border-bottom-color: rgba(255,255,255,0.12);
        border-left-color: var(--mk-color, rgba(255,255,255,0.3));
        transform: translateY(-5px);
        box-shadow: 0 16px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06);
      }
      .lp-market__logo { display: flex; align-items: center; min-height: 40px; }
      .lp-market__badge {
        font-size: 12px; font-weight: 600;
        color: var(--color-success, #22C55E);
        background: rgba(34, 197, 94, 0.12);
        border: 1px solid rgba(34, 197, 94, 0.2);
        padding: 5px 14px; border-radius: 999px;
        letter-spacing: 0.02em;
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
      .lp-footer__link--ig { color: var(--color-text-secondary, #9A9A9A); display: inline-flex; align-items: center; }
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
        from { opacity: 0; transform: translateY(24px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes lp-fade-in-scale {
        from { opacity: 0; transform: scale(0.96) translateY(12px); }
        to   { opacity: 1; transform: scale(1) translateY(0); }
      }
      @keyframes lp-pulse-glow-opacity {
        0%, 100% { opacity: 0; transform: scale(0.95); }
        50%       { opacity: 1; transform: scale(1.05); }
      }
      .lp-anim {
        opacity: 0;
        animation: lp-fade-in-up .65s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        animation-delay: var(--d, 0s);
      }
      .lp-mock-card {
        animation: lp-fade-in-scale .5s cubic-bezier(0.16, 1, 0.3, 1) both;
      }
      .lp-mock-stack .lp-mock-card:nth-child(1) { animation-delay: .28s; }
      .lp-mock-stack .lp-mock-card:nth-child(2) { animation-delay: .38s; }
      .lp-mock-stack .lp-mock-card:nth-child(3) { animation-delay: .48s; }
      .lp-btn--primary { position: relative; overflow: visible; }
      .lp-btn--primary::after {
        content: ''; position: absolute; inset: -4px;
        border-radius: inherit;
        background: rgba(124,58,237,0.35); filter: blur(12px);
        opacity: 0; pointer-events: none; z-index: -1;
        animation: lp-pulse-glow-opacity 3s ease-in-out infinite;
      }
      .lp-btn--primary:hover::after { animation: none; opacity: 0; }

      /* ── 860px: hero single column ── */
      @media (max-width: 860px) {
        .lp-hero__inner {
          grid-template-columns: 1fr;
          text-align: center;
          gap: 48px;
        }
        .lp-hero__left { align-items: center; }
        .lp-hero__left .lp-hero__sub { max-width: 520px; }
        .lp-hero__cta  { justify-content: center; }
        .lp-hero__right { display: none; }
        .lp-pill { align-self: center; }
      }

      /* ── 768px: tablet ── */
      @media (max-width: 768px) {
        .lp-grid--3 { grid-template-columns: 1fr; }
        .lp-footer__grid { grid-template-columns: 1fr 1fr; }
        .lp-footer__brand { grid-column: 1 / -1; }
        .lp-section { padding: 64px 20px; }
        .lp-hero { padding: 110px 20px 72px; min-height: auto; }
        .lp-hero__cta .lp-btn { flex: 1 1 auto; min-height: 52px; }
        .lp-h2 { margin-bottom: 48px; }
        .lp-card, .lp-step { border-left-width: 3px; }
        .lp-market { border-left-width: 4px; padding: 24px 28px; }
        .lp-ig__inner { flex-direction: column; align-items: flex-start; gap: 20px; }
      }

      /* ── 480px: mobile ── */
      @media (max-width: 480px) {
        .lp-footer__grid { grid-template-columns: 1fr; }
        .lp-hero__title { font-size: clamp(28px, 9vw, 44px); }
        .lp-hero__sub { font-size: 17px; margin-bottom: 36px; }
        .lp-h2 { font-size: clamp(24px, 7vw, 36px); margin-bottom: 40px; }
        .lp-cta__title { font-size: clamp(26px, 8vw, 44px); }
        .lp-hero { padding: 96px 16px 60px; }
        .lp-section { padding: 56px 16px; }
        .lp-card, .lp-step { padding: 26px 20px; }
        .lp-card__icon { width: 52px; height: 52px; }
        .lp-step__num { width: 48px; height: 48px; font-size: 20px; }
        .lp-hero__cta { gap: 12px; }
        .lp-chips { gap: 10px; }
        .lp-chip { padding: 10px 18px; font-size: 14px; }
        .lp-pill { font-size: 12px; padding: 6px 14px; }
      }

      /* ── prefers-reduced-motion ── */
      @media (prefers-reduced-motion: reduce) {
        .lp-anim { animation: none; opacity: 1; }
        .lp-mock-card { animation: none; opacity: 1; }
        .lp-card:hover, .lp-step:hover { transform: none; box-shadow: none; }
        .lp-market:hover { transform: none; box-shadow: none; }
        .lp-btn--primary { animation: none; }
        .lp-btn--primary:hover { transform: none; }
        .lp-mock-card:hover { transform: none; }
      }
    `;
    document.head.appendChild(style);
    this._styleEl = style;
  }
}
