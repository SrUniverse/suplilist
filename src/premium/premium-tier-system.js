/**
 * PremiumTierSystem v4.0 — SupliList
 * Feature gates, tier management, and upgrade flows.
 *
 * Uso:
 *   import pts from '../premium/premium-tier-system.js'; // singleton
 *   pts.can('unlimited_stack');        // → true/false
 *   pts.gate('unlimited_stack');       // → false + dispara upgrade prompt se bloqueado
 *   pts.setTier('pro');                // após pagamento confirmado
 */

export class PremiumTierSystem {

  // ─────────────────────────────────────────────
  // TIER DEFINITIONS
  // ─────────────────────────────────────────────

  static TIERS = {
    free: {
      id:       'free',
      name:     'Free',
      emoji:    '🌱',
      price:    0,
      currency: 'BRL',
      period:   'mês',
      color:    '#888',
      tagline:  'Para começar sua jornada',
      features: {
        stack_limit:             5,
        unlimited_stack:         false,
        comparator_marketplaces: 1,
        history_days:            7,
        export_csv:              false,
        export_pdf:              false,
        export_json:             false,
        ai_insights:             false,
        ai_coaching:             false,
        community_access:        true,
        community_create:        false,
        priority_support:        false,
        api_access:              false,
        white_label:             false,
        repurchase_alerts:       true,
        smart_notifications:     false,
      },
    },
    pro: {
      id:             'pro',
      name:           'Pro',
      emoji:          '⚡',
      price:          19,
      currency:       'BRL',
      period:         'mês',
      color:          '#7C3AED',
      tagline:        'Para o atleta que leva a sério',
      annualDiscount: 0.20,  // 20% off anual
      popular:        true,
      features: {
        stack_limit:             Infinity,
        unlimited_stack:         true,
        comparator_marketplaces: 3,
        history_days:            90,
        export_csv:              true,
        export_pdf:              false,
        export_json:             true,
        ai_insights:             false,
        ai_coaching:             false,
        community_access:        true,
        community_create:        true,
        priority_support:        false,
        api_access:              false,
        white_label:             false,
        repurchase_alerts:       true,
        smart_notifications:     true,
      },
    },
    master: {
      id:             'master',
      name:           'Master',
      emoji:          '👑',
      price:          49,
      currency:       'BRL',
      period:         'mês',
      color:          '#FFB74D',
      tagline:        'Para coaches e power users',
      annualDiscount: 0.25,  // 25% off anual
      features: {
        stack_limit:             Infinity,
        unlimited_stack:         true,
        comparator_marketplaces: 3,
        history_days:            Infinity,
        export_csv:              true,
        export_pdf:              true,
        export_json:             true,
        ai_insights:             true,
        ai_coaching:             true,
        community_access:        true,
        community_create:        true,
        priority_support:        true,
        api_access:              true,
        white_label:             true,
        repurchase_alerts:       true,
        smart_notifications:     true,
      },
    },
  };

  // ─────────────────────────────────────────────
  // FEATURE LABELS (for UI)
  // ─────────────────────────────────────────────

  static FEATURE_LABELS = {
    unlimited_stack:         { label: 'Stack ilimitado',             category: 'stack' },
    comparator_marketplaces: { label: 'Todos os marketplaces',       category: 'comparator' },
    history_days:            { label: 'Histórico completo',          category: 'analytics' },
    export_csv:              { label: 'Exportar CSV',                category: 'export' },
    export_pdf:              { label: 'Exportar PDF',                category: 'export' },
    export_json:             { label: 'Exportar JSON',               category: 'export' },
    ai_insights:             { label: 'Insights de IA',              category: 'ai' },
    ai_coaching:             { label: 'Coaching por IA',             category: 'ai' },
    community_create:        { label: 'Postar na comunidade',        category: 'community' },
    priority_support:        { label: 'Suporte prioritário',         category: 'support' },
    api_access:              { label: 'Acesso à API',                category: 'api' },
    white_label:             { label: 'Exportação white-label',      category: 'export' },
    smart_notifications:     { label: 'Notificações inteligentes',   category: 'notifications' },
  };

  // ─────────────────────────────────────────────
  // CONSTRUCTOR
  // ─────────────────────────────────────────────

  constructor() {
    this._currentTier = this._loadTier();
    this._listeners   = [];
  }

  // ─────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────

  /**
   * Get current tier definition.
   * @returns {TierDefinition}
   */
  get currentTier() {
    return PremiumTierSystem.TIERS[this._currentTier] ?? PremiumTierSystem.TIERS.free;
  }

  /**
   * Check if the current user can access a feature.
   *
   * @param {string} feature   - Feature key from TIERS[].features
   * @param {*}     [value]    - Optional: check numeric threshold
   *                             e.g., can('stack_limit', 6) → pode ter 6 suplementos?
   * @returns {boolean}
   */
  can(feature, value = null) {
    const tier         = this.currentTier;
    const featureValue = tier.features[feature];

    if (featureValue === undefined) return false;
    if (typeof featureValue === 'boolean') return featureValue;

    // Numeric limits
    if (value !== null && typeof featureValue === 'number') {
      return featureValue === Infinity || value <= featureValue;
    }

    return Boolean(featureValue);
  }

  /**
   * Gate a feature: retorna true se permitido, false + dispara upgrade flow se bloqueado.
   * Uso: if (!pts.gate('ai_insights', { context: 'stack-page' })) return;
   *
   * @param {string}   feature
   * @param {Object}   [opts]
   * @param {string}   [opts.context]   - Onde o gate foi disparado (analytics)
   * @param {Function} [opts.onBlocked] - Callback customizado quando bloqueado
   * @returns {boolean}
   */
  gate(feature, opts = {}) {
    if (this.can(feature)) return true;

    const requiredTier = this._findMinTier(feature);
    const event = {
      type:         'gate_triggered',
      feature,
      currentTier:  this._currentTier,
      requiredTier,
      context:      opts.context ?? 'unknown',
    };

    this._emit(event);
    this._trackGateEvent(feature, requiredTier, opts.context);

    if (opts.onBlocked) {
      opts.onBlocked(event);
    } else {
      this._showUpgradePrompt(feature, requiredTier);
    }

    return false;
  }

  /**
   * Qual é o tier mínimo necessário para um feature?
   * @param {string} feature
   * @returns {'free'|'pro'|'master'}
   */
  requiredTierFor(feature) {
    return this._findMinTier(feature);
  }

  /**
   * Define o tier do usuário (chamar após pagamento confirmado / restore purchase).
   * @param {'free'|'pro'|'master'} tierId
   */
  setTier(tierId) {
    if (!PremiumTierSystem.TIERS[tierId]) return;
    const from = this._currentTier;
    this._currentTier = tierId;
    this._saveTier(tierId);
    this._emit({ type: 'tier_changed', from, to: tierId });
    this._trackTierChange(tierId);
  }

  /**
   * Quais features o usuário GANHA ao mudar de tier?
   * @param {string} fromTier
   * @param {string} toTier
   * @returns {string[]} Array de labels de features ganhas
   */
  getUpgradeGains(fromTier, toTier) {
    const from  = PremiumTierSystem.TIERS[fromTier]?.features ?? {};
    const to    = PremiumTierSystem.TIERS[toTier]?.features   ?? {};
    const gains = [];

    Object.keys(to).forEach(key => {
      const toVal   = to[key];
      const fromVal = from[key];
      const label   = PremiumTierSystem.FEATURE_LABELS[key]?.label;
      if (!label) return;

      if (typeof toVal === 'boolean' && toVal && !fromVal) {
        gains.push(label);
      } else if (typeof toVal === 'number' && toVal > fromVal) {
        gains.push(label);
      }
    });

    return gains;
  }

  /**
   * Preços anuais com desconto.
   * @param {'pro'|'master'} tierId
   * @returns {{ monthly, annual, annualPerMonth, savings }|null}
   */
  getAnnualPricing(tierId) {
    const tier = PremiumTierSystem.TIERS[tierId];
    if (!tier || !tier.annualDiscount) return null;

    const monthly        = tier.price;
    const annual         = +(monthly * 12 * (1 - tier.annualDiscount)).toFixed(2);
    const savings        = +(monthly * 12 - annual).toFixed(2);
    const annualPerMonth = +(annual / 12).toFixed(2);

    return { monthly, annual, annualPerMonth, savings };
  }

  /**
   * Subscribe a eventos de tier (gate_triggered, tier_changed).
   * @param {Function} fn
   * @returns {Function} Unsubscribe
   */
  onEvent(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(f => f !== fn); };
  }

  // ─────────────────────────────────────────────
  // PRIVATE
  // ─────────────────────────────────────────────

  _findMinTier(feature) {
    const order = ['free', 'pro', 'master'];
    for (const tierId of order) {
      const val = PremiumTierSystem.TIERS[tierId].features[feature];
      if (val === true || (typeof val === 'number' && val > 0 && val !== 5)) {
        return tierId;
      }
    }
    return 'master';
  }

  _showUpgradePrompt(feature, requiredTier) {
    const tier  = PremiumTierSystem.TIERS[requiredTier];
    const label = PremiumTierSystem.FEATURE_LABELS[feature]?.label ?? feature;
    const gains = this.getUpgradeGains(this._currentTier, requiredTier);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('suplilist:upgrade_prompt', {
        detail: { feature, requiredTier, tierName: tier.name, label, gains },
      }));
    }
  }

  _trackGateEvent(feature, requiredTier, context) {
    if (typeof window !== 'undefined') {
      window.gtag?.('event', 'premium_gate_triggered', {
        feature,
        required_tier: requiredTier,
        current_tier:  this._currentTier,
        context:       context ?? 'unknown',
      });
    }
  }

  _trackTierChange(tierId) {
    if (typeof window !== 'undefined') {
      window.gtag?.('event', 'tier_changed', { new_tier: tierId });
    }
  }

  _loadTier() {
    try {
      return localStorage.getItem('suplilist_tier') ?? 'free';
    } catch {
      return 'free';
    }
  }

  _saveTier(tierId) {
    try {
      localStorage.setItem('suplilist_tier', tierId);
    } catch { /* fail silently — SSR ou storage desabilitado */ }
  }

  _emit(event) {
    this._listeners.forEach(fn => fn(event));
  }
}

// Singleton — importar como default para garantir instância única por sessão
const pts = new PremiumTierSystem();
export { pts };
export default pts;
