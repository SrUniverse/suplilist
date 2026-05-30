/**
 * PremiumPage v4.0 — SupliList
 * Página de upgrade: apresenta os planos, benefícios e CTA de upgrade.
 *
 * Design: value-first (mostra o que você GANHA), não paywall-first.
 * Referência visual: dark mode ultra-premium, tier cards com border accent,
 * billing toggle mensal/anual, feature comparison table, FAQ.
 */

import pts, { PremiumTierSystem } from '../premium/premium-tier-system.js';

export class PremiumPage {
  constructor(container) {
    this.container       = container;
    this._billing        = 'monthly'; // 'monthly' | 'annual'
    this._unsub          = null;
    this._upgradeHandler = null;
  }

  mount() {
    this._render();
    this._attachListeners();

    // Ouvir eventos externos de upgrade (disparados pelo pts.gate())
    this._upgradeHandler = (e) => this._highlightTier(e.detail.requiredTier);
    window.addEventListener('suplilist:upgrade_prompt', this._upgradeHandler);
  }

  unmount() {
    this._unsub?.();
    if (this._upgradeHandler) {
      window.removeEventListener('suplilist:upgrade_prompt', this._upgradeHandler);
    }
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  _render() {
    const current = pts.currentTier;

    this.container.innerHTML = `
      <div class="premium-page">

        <!-- ── Hero ── -->
        <div class="premium-hero">
          <p class="premium-hero-super">🚀 Desbloqueie o potencial máximo</p>
          <h1 class="premium-hero-title">Suplementação<br>no modo Pro</h1>
          <p class="premium-hero-sub">
            De graça pra sempre. Quando você quiser ir além, estamos aqui.
          </p>

          <!-- Billing Toggle -->
          <div class="billing-toggle" role="group" aria-label="Período de cobrança">
            <button
              class="billing-btn ${this._billing === 'monthly' ? 'active' : ''}"
              data-billing="monthly"
              aria-pressed="${this._billing === 'monthly'}"
            >Mensal</button>
            <button
              class="billing-btn ${this._billing === 'annual' ? 'active' : ''}"
              data-billing="annual"
              aria-pressed="${this._billing === 'annual'}"
            >Anual <span class="annual-badge">Até 25% off</span></button>
          </div>
        </div>

        <!-- ── Tier Cards ── -->
        <div class="tier-grid" id="tier-grid" role="list" aria-label="Planos disponíveis">
          ${Object.values(PremiumTierSystem.TIERS).map(tier => this._renderTierCard(tier, current)).join('')}
        </div>

        <!-- ── Feature Comparison Table ── -->
        <section class="feature-table-section">
          <h2 class="ft-title">Comparação completa</h2>
          ${this._renderFeatureTable(current)}
        </section>

        <!-- ── FAQ ── -->
        <section class="faq-section">
          <h2 class="faq-title">Perguntas frequentes</h2>
          ${this._renderFAQ()}
        </section>

        <!-- ── Footer Note ── -->
        <p class="premium-footer-note">
          Pagamentos processados com segurança via Stripe. Cancele a qualquer momento.<br>
          Sem taxas de cancelamento. Dados protegidos por LGPD.
        </p>

      </div>
    `;

    this._attachStyles();
  }

  _renderTierCard(tier, currentTier) {
    const isCurrentTier = currentTier.id === tier.id;
    const annualPricing = tier.annualDiscount ? pts.getAnnualPricing(tier.id) : null;
    const displayPrice  = this._billing === 'annual' && annualPricing
      ? annualPricing.annualPerMonth
      : tier.price;

    const gains = tier.id !== 'free' ? pts.getUpgradeGains('free', tier.id) : [];

    return `
      <div
        class="tier-card ${tier.popular ? 'tier-popular' : ''} ${isCurrentTier ? 'tier-current' : ''}"
        role="listitem"
        id="tier-card-${tier.id}"
        style="--tier-color:${tier.color}"
        aria-label="Plano ${tier.name}${isCurrentTier ? ' — seu plano atual' : ''}"
      >
        ${tier.popular    ? `<div class="tier-popular-badge">⭐ Mais Popular</div>` : ''}
        ${isCurrentTier   ? `<div class="tier-current-badge">✓ Plano Atual</div>` : ''}

        <!-- Tier Header -->
        <div class="tc-header">
          <span class="tc-emoji" aria-hidden="true">${tier.emoji}</span>
          <div>
            <h3 class="tc-name">${tier.name}</h3>
            <p class="tc-tagline">${tier.tagline}</p>
          </div>
        </div>

        <!-- Price -->
        <div class="tc-price-block">
          ${tier.price === 0 ? `
            <span class="tc-price">Grátis</span>
            <span class="tc-price-sub">para sempre</span>
          ` : `
            <div class="tc-price-row">
              <span class="tc-price">R$ ${displayPrice.toFixed(0)}</span>
              <span class="tc-price-period">/mês</span>
            </div>
            ${this._billing === 'annual' && annualPricing ? `
              <p class="tc-annual-info">
                R$ ${annualPricing.annual.toFixed(0)}/ano
                · Economize R$ ${annualPricing.savings.toFixed(0)}
              </p>
            ` : ''}
          `}
        </div>

        <!-- Feature Highlights -->
        <ul class="tc-features" aria-label="Principais recursos do plano ${tier.name}">
          ${tier.id === 'free' ? `
            <li class="tc-feature"><span class="tc-check" aria-hidden="true">✓</span><span>Stack com até 5 suplementos</span></li>
            <li class="tc-feature"><span class="tc-check" aria-hidden="true">✓</span><span>Comparador de preços (1 marketplace)</span></li>
            <li class="tc-feature"><span class="tc-check" aria-hidden="true">✓</span><span>Histórico de 7 dias</span></li>
            <li class="tc-feature"><span class="tc-check" aria-hidden="true">✓</span><span>Sistema de streaks e badges</span></li>
            <li class="tc-feature"><span class="tc-check" aria-hidden="true">✓</span><span>Alertas de reposição</span></li>
          ` : gains.slice(0, 5).map(g => `
            <li class="tc-feature">
              <span class="tc-check" aria-hidden="true">✓</span>
              <span>${g}</span>
            </li>
          `).join('')}
        </ul>

        <!-- CTA -->
        ${isCurrentTier ? `
          <div class="tc-cta-current" aria-label="Plano atual">✓ Plano atual</div>
        ` : tier.price === 0 ? `
          <button
            class="tc-cta tc-cta-ghost"
            data-action="downgrade"
            data-tier="${tier.id}"
            aria-label="Usar plano gratuito"
          >Usar gratuitamente</button>
        ` : `
          <button
            class="tc-cta tc-cta-upgrade"
            data-action="upgrade"
            data-tier="${tier.id}"
            data-billing="${this._billing}"
            style="background:${tier.color}"
            aria-label="Assinar plano ${tier.name}"
          >
            ${tier.emoji} Assinar ${tier.name}
            ${this._billing === 'annual' && annualPricing
              ? ` · R$ ${displayPrice.toFixed(0)}/mês`
              : ''
            }
          </button>
        `}
      </div>
    `;
  }

  _renderFeatureTable(currentTier) {
    const categories = {
      stack:         'Stack',
      comparator:    'Comparador',
      analytics:     'Histórico & Analytics',
      export:        'Exportação',
      ai:            'Inteligência Artificial',
      community:     'Comunidade',
      notifications: 'Notificações',
      support:       'Suporte',
      api:           'API & Integrações',
    };

    const tiers    = Object.values(PremiumTierSystem.TIERS);
    const features = PremiumTierSystem.FEATURE_LABELS;

    // Agrupar features por categoria
    const grouped = {};
    Object.entries(features).forEach(([key, meta]) => {
      if (!grouped[meta.category]) grouped[meta.category] = [];
      grouped[meta.category].push({ key, ...meta });
    });

    return `
      <div class="feature-table" role="table" aria-label="Comparação de recursos por plano">

        <!-- Header -->
        <div class="ft-header" role="row">
          <div class="ft-cell-label" role="columnheader">Recurso</div>
          ${tiers.map(t => `
            <div
              class="ft-cell-tier ${currentTier.id === t.id ? 'ft-current' : ''}"
              role="columnheader"
              style="--tier-color:${t.color}"
            >
              ${t.emoji} ${t.name}
            </div>
          `).join('')}
        </div>

        <!-- Rows grouped by category -->
        ${Object.entries(grouped).map(([catKey, featList]) => `
          <div class="ft-category-header" role="row">
            <div class="ft-cat-label" role="cell">
              ${categories[catKey] ?? catKey}
            </div>
          </div>

          ${featList.map(feat => `
            <div class="ft-row" role="row">
              <div class="ft-cell-label" role="cell">${feat.label}</div>
              ${tiers.map(t => {
                const val = t.features[feat.key];
                let display = '';
                if (typeof val === 'boolean') {
                  display = val
                    ? `<span class="ft-check" aria-label="Disponível">✓</span>`
                    : `<span class="ft-x"     aria-label="Não disponível">✕</span>`;
                } else if (val === Infinity) {
                  display = `<span class="ft-inf" aria-label="Ilimitado">∞</span>`;
                } else if (typeof val === 'number') {
                  display = `<span class="ft-num">${val}</span>`;
                }
                return `
                  <div class="ft-cell ${currentTier.id === t.id ? 'ft-current' : ''}" role="cell">
                    ${display}
                  </div>
                `;
              }).join('')}
            </div>
          `).join('')}
        `).join('')}
      </div>
    `;
  }

  _renderFAQ() {
    const faqs = [
      {
        q: 'Posso cancelar a qualquer momento?',
        a: 'Sim. Cancele quando quiser, sem multa ou taxa. Seu acesso premium dura até o fim do período pago.',
      },
      {
        q: 'O que acontece com meus dados no Free?',
        a: 'Seus dados ficam 100% seguros no seu dispositivo (local-first). Mesmo no plano Free, você tem soberania total sobre seus dados.',
      },
      {
        q: 'Vocês têm desconto para estudantes ou coaches?',
        a: 'Entre em contato via suporte para programas especiais. Coaches podem se qualificar para o plano Master com desconto.',
      },
      {
        q: 'O plano Master inclui acesso à API?',
        a: 'Sim. O plano Master inclui acesso à API REST do SupliList para integrar com seus próprios sistemas ou apps.',
      },
      {
        q: 'Aceita Pix?',
        a: 'Sim! Além de cartão de crédito via Stripe, aceitamos Pix para pagamentos anuais no Brasil.',
      },
    ];

    return `
      <div class="faq-list" role="list">
        ${faqs.map(faq => `
          <details class="faq-item" role="listitem">
            <summary class="faq-q">${faq.q}</summary>
            <p class="faq-a">${faq.a}</p>
          </details>
        `).join('')}
      </div>
    `;
  }

  // Scroll + pulse no card do tier requerido (chamado pelo upgrade prompt)
  _highlightTier(tierId) {
    const card = this.container.querySelector(`#tier-card-${tierId}`);
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('tier-highlight-pulse');
    setTimeout(() => card.classList.remove('tier-highlight-pulse'), 2000);
  }

  // ─────────────────────────────────────────────
  // EVENT LISTENERS
  // ─────────────────────────────────────────────

  _attachListeners() {
    // Billing toggle
    this.container.querySelectorAll('.billing-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._billing = btn.dataset.billing;

        this.container.querySelectorAll('.billing-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.billing === this._billing);
          b.setAttribute('aria-pressed', String(b.dataset.billing === this._billing));
        });

        const grid = this.container.querySelector('#tier-grid');
        if (grid) {
          grid.innerHTML = Object.values(PremiumTierSystem.TIERS)
            .map(t => this._renderTierCard(t, pts.currentTier))
            .join('');
        }
      });
    });

    // Upgrade / Downgrade CTAs (delegated)
    this.container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      if (btn.dataset.action === 'upgrade') {
        this._initiateUpgrade(btn.dataset.tier, btn.dataset.billing);
      }
      if (btn.dataset.action === 'downgrade') {
        this._initiateDowngrade();
      }
    });
  }

  _initiateUpgrade(tierId, billing) {
    const tier = PremiumTierSystem.TIERS[tierId];
    if (!tier) return;

    // Track intent no GA4
    if (typeof window !== 'undefined') {
      window.gtag?.('event', 'upgrade_initiated', {
        tier:    tierId,
        billing,
        price:   billing === 'annual'
          ? pts.getAnnualPricing(tierId)?.annual
          : tier.price,
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // PRODUCTION: Substituir por Stripe Checkout
    //
    // const res = await fetch('/api/stripe/create-checkout-session', {
    //   method:  'POST',
    //   body:    JSON.stringify({ tier: tierId, billing }),
    //   headers: { 'Content-Type': 'application/json' },
    // });
    // const { url } = await res.json();
    // window.location.href = url;
    // ──────────────────────────────────────────────────────────────────

    // Demo mode: simular confirmação
    const confirmed = window.confirm(
      `🚀 Assinar plano ${tier.name} por R$ ${tier.price}/mês?\n\n` +
      `(Integração Stripe — implementar em produção)`
    );

    if (confirmed) {
      pts.setTier(tierId);
      window.toast?.(`🎉 Bem-vindo ao ${tier.name}!`, 'success');
      this._render();
      this._attachListeners();
    }
  }

  _initiateDowngrade() {
    if (!window.confirm('Tem certeza que deseja voltar ao plano Free?')) return;
    pts.setTier('free');
    window.toast?.('Plano alterado para Free', 'info');
    this._render();
    this._attachListeners();
  }

  // ─────────────────────────────────────────────
  // STYLES (scoped, injetados uma vez)
  // ─────────────────────────────────────────────

  _attachStyles() {
    if (document.getElementById('premium-page-styles')) return;
    const style = document.createElement('style');
    style.id = 'premium-page-styles';
    style.textContent = `
      /* ── Layout ── */
      .premium-page {
        display: flex;
        flex-direction: column;
        gap: 40px;
        padding: 20px 16px 100px;
        max-width: 960px;
        margin: 0 auto;
      }

      /* ── Hero ── */
      .premium-hero { text-align: center; padding: 20px 0 8px; }
      .premium-hero-super {
        font-size: 13px;
        color: var(--color-brand, #7C3AED);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin: 0 0 10px;
      }
      .premium-hero-title {
        font-size: clamp(32px, 6vw, 52px);
        font-weight: 900;
        color: var(--color-text-primary, #FAFAFA);
        margin: 0 0 12px;
        line-height: 1.1;
      }
      .premium-hero-sub { font-size: 15px; color: var(--color-text-muted, #888); margin: 0 0 24px; }

      /* ── Billing Toggle ── */
      .billing-toggle {
        display: inline-flex;
        background: var(--color-surface-primary, #141414);
        border: 1px solid var(--color-border, rgba(255,255,255,0.08));
        border-radius: 999px;
        padding: 4px;
        gap: 4px;
      }
      .billing-btn {
        padding: 8px 20px;
        background: transparent;
        border: none;
        border-radius: 999px;
        color: var(--color-text-muted, #888);
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        font-family: inherit;
        transition: all 150ms;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .billing-btn.active {
        background: var(--color-brand, #7C3AED);
        color: #fff;
      }
      .annual-badge {
        background: var(--color-success, #22C55E);
        color: #0A0A0A;
        font-size: 10px;
        font-weight: 800;
        padding: 2px 7px;
        border-radius: 999px;
      }

      /* ── Tier Grid ── */
      .tier-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        align-items: start;
      }

      /* ── Tier Card ── */
      .tier-card {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 24px;
        background: var(--color-surface-primary, #141414);
        border: 1px solid var(--color-border, rgba(255,255,255,0.08));
        border-radius: 20px;
        transition: border-color 200ms, transform 200ms, box-shadow 200ms;
      }
      .tier-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 12px 32px rgba(0,0,0,0.4);
      }
      .tier-popular {
        border-color: var(--color-brand, #7C3AED);
        background: rgba(124,58,237,0.04);
        box-shadow: 0 0 32px rgba(124,58,237,0.12);
      }
      .tier-current {
        border-color: var(--color-success, #22C55E);
        background: rgba(34,197,94,0.03);
      }

      .tier-popular-badge,
      .tier-current-badge {
        position: absolute;
        top: -13px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 11px;
        font-weight: 800;
        padding: 3px 12px;
        border-radius: 999px;
        white-space: nowrap;
      }
      .tier-popular-badge { background: var(--color-brand, #7C3AED); color: #fff; }
      .tier-current-badge { background: var(--color-success, #22C55E); color: #0A0A0A; }

      @keyframes tier-pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(124,58,237,0); }
        50%       { box-shadow: 0 0 0 12px rgba(124,58,237,0.25); }
      }
      .tier-highlight-pulse {
        animation: tier-pulse 0.8s ease 2;
        border-color: var(--color-brand, #7C3AED) !important;
      }

      .tc-header { display: flex; align-items: center; gap: 12px; }
      .tc-emoji  { font-size: 28px; }
      .tc-name   { font-size: 18px; font-weight: 800; color: var(--color-text-primary, #FAFAFA); margin: 0 0 2px; }
      .tc-tagline { font-size: 12px; color: var(--color-text-muted, #888); margin: 0; }

      .tc-price-block { display: flex; flex-direction: column; gap: 4px; }
      .tc-price-row   { display: flex; align-items: baseline; gap: 3px; }
      .tc-price {
        font-size: 36px;
        font-weight: 900;
        color: var(--color-text-primary, #FAFAFA);
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        line-height: 1;
      }
      .tc-price-period { font-size: 14px; color: var(--color-text-muted, #888); }
      .tc-price-sub    { font-size: 13px; color: var(--color-text-muted, #888); }
      .tc-annual-info  { font-size: 12px; color: var(--color-text-muted, #888); margin: 0; }

      .tc-features {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex: 1;
      }
      .tc-feature {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        font-size: 13px;
        color: var(--color-text-primary, #FAFAFA);
        line-height: 1.4;
      }
      .tc-check {
        color: var(--tier-color, #7C3AED);
        font-weight: 700;
        flex-shrink: 0;
      }

      .tc-cta {
        width: 100%;
        padding: 13px;
        border: none;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        font-family: inherit;
        transition: opacity 150ms, transform 150ms;
      }
      .tc-cta:hover  { opacity: 0.9; transform: translateY(-1px); }
      .tc-cta:active { transform: scale(0.98); }
      .tc-cta-upgrade { color: #fff; }
      .tc-cta-ghost {
        background: transparent;
        border: 1px solid var(--color-border, rgba(255,255,255,0.08));
        color: var(--color-text-muted, #888);
      }
      .tc-cta-ghost:hover {
        border-color: var(--color-brand, #7C3AED);
        color: var(--color-text-primary, #FAFAFA);
      }
      .tc-cta-current {
        width: 100%;
        padding: 13px;
        text-align: center;
        background: rgba(34,197,94,0.08);
        border: 1px solid rgba(34,197,94,0.3);
        border-radius: 12px;
        color: var(--color-success, #22C55E);
        font-size: 14px;
        font-weight: 700;
      }

      /* ── Feature Table ── */
      .feature-table-section { overflow-x: auto; }
      .ft-title { font-size: 20px; font-weight: 800; color: var(--color-text-primary, #FAFAFA); margin: 0 0 16px; }

      .feature-table { width: 100%; }
      .ft-header {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 1fr;
        background: var(--color-surface-primary, #141414);
        border: 1px solid var(--color-border, rgba(255,255,255,0.08));
        border-radius: 12px 12px 0 0;
        overflow: hidden;
      }
      .ft-header > * { padding: 12px 16px; font-size: 13px; font-weight: 700; color: var(--color-text-muted, #888); }
      .ft-cell-tier.ft-current { color: var(--tier-color); }

      .ft-category-header {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 1fr;
        background: var(--color-bg-primary, #0A0A0A);
        padding: 8px 16px;
        border-top: 1px solid var(--color-border, rgba(255,255,255,0.08));
      }
      .ft-cat-label {
        font-size: 11px;
        font-weight: 700;
        color: var(--color-text-muted, #555);
        text-transform: uppercase;
        letter-spacing: 0.8px;
      }

      .ft-row {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 1fr;
        border-top: 1px solid rgba(255,255,255,0.04);
      }
      .ft-row:hover { background: var(--color-surface-primary, #141414); }
      .ft-cell-label {
        padding: 12px 16px;
        font-size: 13px;
        color: var(--color-text-primary, #FAFAFA);
      }
      .ft-cell {
        padding: 12px 16px;
        text-align: center;
        font-size: 14px;
      }
      .ft-cell.ft-current { background: rgba(124,58,237,0.04); }
      .ft-check { color: var(--color-success, #22C55E); font-weight: 700; }
      .ft-x     { color: var(--color-text-muted, #333); }
      .ft-inf   { color: var(--color-brand, #7C3AED); font-weight: 700; }
      .ft-num   {
        color: var(--color-text-primary, #FAFAFA);
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        font-weight: 600;
      }

      /* ── FAQ ── */
      .faq-title { font-size: 20px; font-weight: 800; color: var(--color-text-primary, #FAFAFA); margin: 0 0 16px; }
      .faq-list  { display: flex; flex-direction: column; gap: 8px; }
      .faq-item {
        padding: 16px 20px;
        background: var(--color-surface-primary, #141414);
        border: 1px solid var(--color-border, rgba(255,255,255,0.08));
        border-radius: 12px;
        transition: border-color 150ms;
      }
      .faq-item[open] { border-color: rgba(124,58,237,0.3); }
      .faq-q {
        font-size: 14px;
        font-weight: 700;
        color: var(--color-text-primary, #FAFAFA);
        cursor: pointer;
        list-style: none;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .faq-q::-webkit-details-marker { display: none; }
      .faq-q::after { content: '+'; color: var(--color-brand, #7C3AED); font-size: 18px; }
      .faq-item[open] .faq-q::after { content: '−'; }
      .faq-a { font-size: 13px; color: var(--color-text-muted, #888); margin: 12px 0 0; line-height: 1.6; }

      /* ── Footer ── */
      .premium-footer-note {
        font-size: 12px;
        color: var(--color-text-muted, #555);
        text-align: center;
        line-height: 1.6;
        padding: 0 16px;
      }

      /* ── Responsive ── */
      @media (max-width: 640px) {
        .tier-grid { grid-template-columns: 1fr; }
        .premium-hero-title { font-size: 28px; }
        .ft-header,
        .ft-row,
        .ft-category-header { grid-template-columns: 1.5fr 1fr 1fr 1fr; }
        .ft-cell-label,
        .ft-cell { padding: 10px; font-size: 12px; }
      }
    `;
    document.head.appendChild(style);
  }
}

export default PremiumPage;
