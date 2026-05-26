/**
 * @fileoverview Página de Receitas e Blends Clínicos — SupliList v3.0.
 * Fase 3: Protocolos pré-definidos compostos por suplementos reais do database.js.
 * Permite filtrar por objetivo e ativar protocolos (importar para My Stack) com 1 clique.
 *
 * @author SupliList Team
 * @version 3.0.0
 */

import { eventBus }      from '../core/eventbus.js';
import { logger }        from '../utils/logger.js';
import { supplementRepo } from '../features/supplements/supplementRepo.js';
import { stateManager }  from '../core/state-manager.js';
import { toast }         from './toast.js';
import { formatPrice }   from '../utils/formatters.js';

/* ══════════════════════════════════════════════════════════════
   ESTILOS
   ══════════════════════════════════════════════════════════════ */

function _injectStyles() {
  if (document.getElementById('recipe-page-styles')) return;
  const s = document.createElement('style');
  s.id = 'recipe-page-styles';
  s.textContent = `
    .rp-wrap {
      max-width: 900px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding-bottom: 40px;
    }
    .rp-header { display: flex; flex-direction: column; gap: 4px; }
    .rp-title {
      font-family: 'Outfit', sans-serif;
      font-size: 26px;
      font-weight: 850;
      color: var(--t1);
      margin: 0;
      letter-spacing: -0.02em;
    }
    .rp-subtitle { font-family: 'Inter', sans-serif; font-size: 13px; color: var(--t3); margin: 0; }

    /* ── Filtros ─────────────────────────────────────────────── */
    .rp-filters {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .rp-filter-btn {
      padding: 7px 16px;
      border-radius: 10px;
      font-family: 'Inter', sans-serif;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid var(--border-color);
      background: var(--bg-darker);
      color: var(--t2);
      transition: all 0.2s;
    }
    .rp-filter-btn:hover { color: var(--t1); border-color: var(--border-color); }
    .rp-filter-btn.active {
      background: var(--shadow-glow);
      border-color: var(--brand-primary);
      color: var(--brand-primary);
    }

    /* ── Grid de receitas ────────────────────────────────────── */
    .rp-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }

    /* ── Card de protocolo ───────────────────────────────────── */
    .rp-card {
      background: var(--bg-dark);
      border: 1px solid var(--border-color);
      border-radius: 24px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: border-color 0.2s, transform 0.2s;
    }
    .rp-card:hover { border-color: var(--brand-primary); transform: translateY(-2px); }

    .rp-card-banner {
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
      background: linear-gradient(135deg, var(--bg-dark) 0%, var(--bg-darker) 100%);
      border-bottom: 1px solid var(--border-color);
      position: relative;
      overflow: hidden;
    }
    .rp-card-banner::before {
      content: '';
      position: absolute;
      inset: 0;
      opacity: 0.08;
    }

    .rp-card-body { padding: 18px; display: flex; flex-direction: column; gap: 12px; flex: 1; }

    .rp-card-name {
      font-family: 'Outfit', sans-serif;
      font-size: 17px;
      font-weight: 800;
      color: var(--t1);
      margin: 0;
    }
    .rp-card-desc {
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      color: var(--t3);
      line-height: 1.6;
      margin: 0;
    }

    /* ── Tags de objetivo ────────────────────────────────────── */
    .rp-tags { display: flex; flex-wrap: wrap; gap: 6px; }
    .rp-tag {
      padding: 3px 10px;
      border-radius: 8px;
      font-family: 'Inter', sans-serif;
      font-size: 10px;
      font-weight: 600;
      background: var(--shadow-glow);
      color: var(--brand-primary);
      border: 1px solid var(--brand-primary);
    }

    /* ── Itens do protocolo ──────────────────────────────────── */
    .rp-items { display: flex; flex-direction: column; gap: 6px; }
    .rp-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: var(--bg-darker);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      gap: 8px;
    }
    .rp-item-name {
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      font-weight: 600;
      color: var(--t1);
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .rp-item-dose {
      font-family: 'Inter', sans-serif;
      font-size: 11px;
      color: var(--t3);
      white-space: nowrap;
    }
    .rp-item-missing {
      border-color: rgba(239,68,68,0.15);
    }
    .rp-item-missing .rp-item-name { color: var(--t3); }

    /* ── Footer do card ──────────────────────────────────────── */
    .rp-card-footer {
      padding: 14px 18px;
      border-top: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .rp-cost {
      display: flex;
      flex-direction: column;
    }
    .rp-cost-label { font-family: 'Inter', sans-serif; font-size: 10px; color: var(--t3); font-weight: 600; text-transform: uppercase; }
    .rp-cost-value { font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 800; color: var(--t1); }

    .rp-activate-btn {
      padding: 10px 18px;
      border-radius: 12px;
      font-family: 'Inter', sans-serif;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      background: var(--brand-primary);
      color: var(--text-inverse);
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    }
    .rp-activate-btn:hover { background: var(--brand-primary-hover); transform: translateY(-1px); box-shadow: var(--shadow-glow); }
    .rp-activate-btn.activated {
      background: rgba(16,185,129,0.12);
      color: var(--brand-green);
      border: 1px solid rgba(16,185,129,0.25);
      cursor: default;
      transform: none;
      box-shadow: none;
    }

    /* ── Empty state ────────────────────────────────────────── */
    .rp-empty {
      text-align: center;
      padding: 60px 20px;
      color: var(--t3);
    }
    .rp-empty-icon { font-size: 40px; margin-bottom: 12px; }
    .rp-empty p { font-family: 'Inter', sans-serif; font-size: 14px; }
  `;
  document.head.appendChild(s);
}

/* ══════════════════════════════════════════════════════════════
   PROTOCOLOS CLÍNICOS
   Compostos por slugs do database.js — resolvidos dinamicamente
   ══════════════════════════════════════════════════════════════ */

const PROTOCOLS = [
  {
    id: 'sleep-stack',
    name: 'Sleep & Recovery Stack',
    emoji: '🌙',
    accentColor: '#7c3aed',
    description: 'Protocolo para otimizar qualidade do sono, redução de cortisol e recuperação muscular noturna.',
    goals: ['Sono', 'Recuperação', 'Anti-estresse'],
    items: [
      { slugHint: 'magnesio', customDose: '400mg', note: 'Antes de dormir' },
      { slugHint: 'ashwagandha', customDose: '300mg', note: 'À noite' },
      { slugHint: 'melatonina', customDose: '1mg', note: '30min antes de dormir' },
      { slugHint: 'zinco', customDose: '15mg', note: 'Junto ao jantar' },
    ],
  },
  {
    id: 'energy-stack',
    name: 'Energy & Focus Stack',
    emoji: '⚡',
    accentColor: '#f59e0b',
    description: 'Blend para energia sustentada, foco cognitivo e performance física ao longo do dia.',
    goals: ['Energia', 'Cognição', 'Performance'],
    items: [
      { slugHint: 'cafeina', customDose: '200mg', note: 'Pela manhã' },
      { slugHint: 'creatina', customDose: '5g', note: 'Qualquer horário' },
      { slugHint: 'vitamina-b12', customDose: '1000mcg', note: 'Com o café da manhã' },
      { slugHint: 'coenzima-q10', customDose: '100mg', note: 'Com refeição' },
    ],
  },
  {
    id: 'longevity-stack',
    name: 'Longevidade Stack',
    emoji: '♾️',
    accentColor: '#22c55e',
    description: 'Protocolo cientificamente embasado para saúde metabólica, anti-inflamatório e longevidade celular.',
    goals: ['Longevidade', 'Saúde Geral', 'Anti-inflamatório'],
    items: [
      { slugHint: 'omega-3', customDose: '3g', note: 'Com as refeições' },
      { slugHint: 'vitamina-d3', customDose: '5000UI', note: 'Pela manhã' },
      { slugHint: 'resveratrol', customDose: '500mg', note: 'Com refeição' },
      { slugHint: 'nac', customDose: '600mg', note: 'Em jejum' },
    ],
  },
  {
    id: 'hypertrophy-stack',
    name: 'Hipertrofia Stack',
    emoji: '💪',
    accentColor: '#ef4444',
    description: 'Stack clínico para maximizar síntese proteica, volumização muscular e performance em treino de força.',
    goals: ['Hipertrofia', 'Força', 'Recuperação'],
    items: [
      { slugHint: 'creatina', customDose: '5g', note: 'Pós-treino' },
      { slugHint: 'whey', customDose: '30g', note: 'Pós-treino' },
      { slugHint: 'beta-alanina', customDose: '3.2g', note: 'Pré-treino' },
      { slugHint: 'glutamina', customDose: '10g', note: 'Pós-treino' },
    ],
  },
  {
    id: 'immunity-stack',
    name: 'Imunidade Stack',
    emoji: '🛡️',
    accentColor: '#06b6d4',
    description: 'Protocolo para fortalecer o sistema imune, reduzir oxidação e prevenir deficiências sazonais.',
    goals: ['Imunidade', 'Anti-oxidante', 'Saúde Geral'],
    items: [
      { slugHint: 'vitamina-c', customDose: '1000mg', note: '2x ao dia' },
      { slugHint: 'vitamina-d3', customDose: '4000UI', note: 'Pela manhã' },
      { slugHint: 'zinco', customDose: '30mg', note: 'Com refeição' },
      { slugHint: 'elderberry', customDose: '500mg', note: 'Com suco' },
    ],
  },
  {
    id: 'stress-stack',
    name: 'Anti-Stress Stack',
    emoji: '🧘',
    accentColor: '#8b5cf6',
    description: 'Adaptógenos e moduladores de cortisol para equilíbrio emocional, HPA axis e resiliência ao estresse.',
    goals: ['Anti-estresse', 'Cognição', 'Equilíbrio'],
    items: [
      { slugHint: 'ashwagandha', customDose: '600mg', note: '2x ao dia' },
      { slugHint: 'rhodiola', customDose: '400mg', note: 'Pela manhã' },
      { slugHint: 'magnesio', customDose: '300mg', note: 'À noite' },
      { slugHint: 'gaba', customDose: '500mg', note: 'À noite' },
    ],
  },
];

/* ══════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════ */

/**
 * Tenta encontrar o suplemento no repositório por slug parcial.
 * @param {string} slugHint - Trecho do slug (ex: 'creatina')
 * @returns {import('../features/supplements/supplementRepo.js').Supplement|null}
 */
function _resolveSupp(slugHint) {
  const all = supplementRepo.getAll();
  return all.find(s => s.id?.toLowerCase().includes(slugHint.toLowerCase())
                    || s.name?.toLowerCase().includes(slugHint.toLowerCase()))
    || null;
}

/**
 * Calcula o custo total/dia de um protocolo com base nos preços reais.
 * @param {Array} items
 * @returns {number}
 */
function _calcProtocolCost(items) {
  return items.reduce((total, item) => {
    const supp = _resolveSupp(item.slugHint);
    return total + (supp?.costPerDose ?? 0);
  }, 0);
}

/** Verifica se um protocolo já está ativo no My Stack. */
function _isActivated(protocolId) {
  const stack = stateManager.getState('stack') || {};
  const items = Array.isArray(stack) ? stack : (stack.items || []);
  return items.some(i => i.protocolId === protocolId);
}

/* ══════════════════════════════════════════════════════════════
   CLASSE PRINCIPAL
   ══════════════════════════════════════════════════════════════ */

class RecipePageController {
  constructor(container) {
    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;
    this._activeFilter = 'Todos';
    this._cleanupFns   = [];
  }

  init() {
    _injectStyles();
    this._render();
    this._setupListeners();
  }

  /* ── Renderização ──────────────────────────────────────────── */

  _render() {
    if (!this.container) return;

    // Coleta todos os goals únicos dos protocolos
    const allGoals = ['Todos', ...new Set(PROTOCOLS.flatMap(p => p.goals))];

    // Filtra protocolos pelo objetivo ativo
    const visible = this._activeFilter === 'Todos'
      ? PROTOCOLS
      : PROTOCOLS.filter(p => p.goals.includes(this._activeFilter));

    const filtersHtml = allGoals.map(g => `
      <button class="rp-filter-btn ${g === this._activeFilter ? 'active' : ''}" data-filter="${g}">${g}</button>
    `).join('');

    const cardsHtml = visible.length === 0
      ? `<div class="rp-empty"><div class="rp-empty-icon">📄</div><p>Nenhum protocolo encontrado para este objetivo.</p></div>`
      : visible.map(proto => this._renderCard(proto)).join('');

    this.container.innerHTML = `
      <div class="rp-wrap">
        <div class="rp-header">
          <h1 class="rp-title">📄 Receitas e Blends Clínicos</h1>
          <p class="rp-subtitle">Protocolos pré-definidos baseados em evidências. Ative com um clique para importar ao seu My Stack.</p>
        </div>

        <div class="rp-filters" id="rp-filters">${filtersHtml}</div>

        <div class="rp-grid" id="rp-grid">${cardsHtml}</div>
      </div>
    `;
  }

  _renderCard(proto) {
    const totalCostPerDay = _calcProtocolCost(proto.items);
    const activated = _isActivated(proto.id);

    const tagsHtml = proto.goals.map(g => `<span class="rp-tag">${g}</span>`).join('');

    const itemsHtml = proto.items.map(item => {
      const supp = _resolveSupp(item.slugHint);
      return `
        <div class="rp-item ${supp ? '' : 'rp-item-missing'}">
          <span class="rp-item-name">${supp ? supp.name : item.slugHint + ' (não encontrado)'}</span>
          <span class="rp-item-dose">${item.customDose} · ${item.note}</span>
        </div>
      `;
    }).join('');

    return `
      <div class="rp-card" data-protocol-id="${proto.id}">
        <div class="rp-card-banner" style="background:linear-gradient(135deg,${proto.accentColor}18,var(--bg-dark));">
          <span style="font-size:40px;">${proto.emoji}</span>
        </div>
        <div class="rp-card-body">
          <h2 class="rp-card-name">${proto.name}</h2>
          <p class="rp-card-desc">${proto.description}</p>
          <div class="rp-tags">${tagsHtml}</div>
          <div class="rp-items">${itemsHtml}</div>
        </div>
        <div class="rp-card-footer">
          <div class="rp-cost">
            <span class="rp-cost-label">Custo / Dia</span>
            <span class="rp-cost-value">${formatPrice(totalCostPerDay)}</span>
          </div>
          <button class="rp-activate-btn ${activated ? 'activated' : ''}"
                  data-activate="${proto.id}"
                  ${activated ? 'disabled' : ''}>
            ${activated ? '✓ Ativado' : '⚡ Ativar Protocolo'}
          </button>
        </div>
      </div>
    `;
  }

  /* ── Listeners ─────────────────────────────────────────────── */

  _setupListeners() {
    // Filtros
    this.container?.querySelector('#rp-filters')
      ?.addEventListener('click', e => {
        const btn = e.target.closest('[data-filter]');
        if (!btn) return;
        this._activeFilter = btn.dataset.filter;
        this._render();
        this._setupListeners();
      });

    // Ativar protocolo
    this.container?.querySelector('#rp-grid')
      ?.addEventListener('click', e => {
        const btn = e.target.closest('[data-activate]');
        if (!btn || btn.disabled) return;
        this._activateProtocol(btn.dataset.activate);
      });
  }

  /**
   * Importa todos os suplementos de um protocolo para o My Stack.
   * @param {string} protocolId
   */
  _activateProtocol(protocolId) {
    const proto = PROTOCOLS.find(p => p.id === protocolId);
    if (!proto) return;

    const stack = stateManager.getState('stack') || {};
    const existingItems = Array.isArray(stack) ? stack : (stack.items || []);

    let added = 0;
    const newItems = [...existingItems];

    proto.items.forEach(item => {
      const supp = _resolveSupp(item.slugHint);
      if (!supp) return;
      // Evita duplicata
      if (newItems.some(i => i.supplementId === supp.id)) return;
      newItems.push({
        supplementId: supp.id,
        name: supp.name,
        dose: item.customDose,
        note: item.note,
        protocolId: proto.id,
        addedAt: new Date().toISOString(),
      });
      added++;
    });

    try {
      stateManager.setState('stack', { items: newItems });
      eventBus.emit('stack:protocol:activated', { protocolId, added });

      if (added > 0) {
        toast.show(`✅ ${added} suplemento${added !== 1 ? 's' : ''} adicionado${added !== 1 ? 's' : ''} ao My Stack!`, 'success');
      } else {
        toast.show('Todos os suplementos já estão no seu Stack.', 'info');
      }

      // Re-renderiza para marcar o botão como ativado
      this._render();
      this._setupListeners();
    } catch (err) {
      logger.error('RecipePage: Erro ao ativar protocolo', err);
      toast.show('Erro ao ativar protocolo. Tente novamente.', 'danger');
    }
  }

  destroy() {
    this._cleanupFns.forEach(fn => { try { fn(); } catch (_) {} });
    this._cleanupFns = [];
    logger.info('RecipePageController destruído.');
  }
}

/* ══════════════════════════════════════════════════════════════
   FACTORY EXPORT
   ══════════════════════════════════════════════════════════════ */

const _createRecipePage = (container = '#page-content') => {
  const ctrl = new RecipePageController(container);
  ctrl.init();
  return ctrl;
};

export const createRecipePage = _createRecipePage;
