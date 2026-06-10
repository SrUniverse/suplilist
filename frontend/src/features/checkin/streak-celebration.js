/**
 * StreakCelebration — retention micro-moment for adherence streaks.
 *
 * When the user's check-in streak reaches a milestone (3, 7, 14, 30, 60, 100,
 * 365 days) an overlay celebrates it once. The last celebrated milestone is
 * persisted so reloading or re-checking the page never repeats the moment.
 *
 * Pure CSS confetti (no library), honors prefers-reduced-motion, and offers
 * a share action (Web Share API with clipboard fallback).
 */
import { logger } from '../../utils/logger.js';

const MILESTONES = [3, 7, 14, 30, 60, 100, 365];
const STORAGE_KEY = 'suplilist:streak:lastCelebrated';

const MILESTONE_COPY = {
  3: { title: '3 dias seguidos!', text: 'O hábito está nascendo. Continue assim.' },
  7: { title: 'Uma semana completa!', text: '7 dias de consistência — seu corpo agradece.' },
  14: { title: '2 semanas de disciplina!', text: 'Você está na frente de 80% das pessoas.' },
  30: { title: '30 dias. Um mês inteiro!', text: 'Isso já é um estilo de vida.' },
  60: { title: '60 dias de constância!', text: 'Resultados compostos em ação.' },
  100: { title: '100 DIAS!', text: 'Você entrou para o clube dos imparáveis.' },
  365: { title: 'UM ANO COMPLETO!', text: 'Lendário. Simplesmente lendário.' },
};

export const StreakCelebration = {
  /** Largest milestone ≤ streak, or null. */
  _milestoneFor(streak) {
    let hit = null;
    for (const m of MILESTONES) {
      if (streak >= m) hit = m;
    }
    return hit;
  },

  _lastCelebrated() {
    try {
      return parseInt(localStorage.getItem(STORAGE_KEY), 10) || 0;
    } catch {
      return 0;
    }
  },

  _markCelebrated(milestone) {
    try {
      localStorage.setItem(STORAGE_KEY, String(milestone));
    } catch (err) {
      logger.warn('[StreakCelebration] Could not persist milestone:', err);
    }
  },

  /** Next milestone above the current streak (for progress hints). */
  nextMilestone(streak) {
    return MILESTONES.find(m => m > streak) ?? null;
  },

  /**
   * Show the celebration if `streak` just reached an uncelebrated milestone.
   * Safe to call after every check-in — it no-ops almost always.
   * @param {number} streak — current streak in days
   * @returns {boolean} whether a celebration was shown
   */
  maybeCelebrate(streak) {
    const milestone = this._milestoneFor(streak);
    if (!milestone || milestone <= this._lastCelebrated()) return false;
    this._markCelebrated(milestone);
    this._show(milestone, streak);
    return true;
  },

  _show(milestone, streak) {
    if (document.getElementById('streak-celebration')) return;
    this._injectStyles();

    const copy = MILESTONE_COPY[milestone] ?? {
      title: `${milestone} dias seguidos!`,
      text: 'Consistência é o que separa resultado de intenção.',
    };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const confetti = reduced ? '' : `
      <div class="strc-confetti" aria-hidden="true">
        ${Array.from({ length: 24 }, (_, i) => `
          <span class="strc-piece" style="
            left:${(i * 41) % 100}%;
            animation-delay:${(i % 8) * 0.12}s;
            animation-duration:${2 + (i % 5) * 0.35}s;
            background:${['#8B5CF6', '#34D399', '#FBBF24', '#F472B6'][i % 4]};
          "></span>`).join('')}
      </div>`;

    const overlay = document.createElement('div');
    overlay.id = 'streak-celebration';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', `Marco de ${milestone} dias atingido`);
    overlay.innerHTML = `
      ${confetti}
      <div class="strc-card">
        <div class="strc-flame" aria-hidden="true">🔥</div>
        <div class="strc-days tabular">${streak}</div>
        <h2 class="strc-title">${copy.title}</h2>
        <p class="strc-text">${copy.text}</p>
        <div class="strc-actions">
          <button type="button" class="strc-btn strc-btn--ghost" data-action="share">Compartilhar</button>
          <button type="button" class="strc-btn" data-action="close">Continuar 💪</button>
        </div>
      </div>`;

    const close = () => {
      overlay.classList.add('strc-out');
      setTimeout(() => overlay.remove(), 250);
    };

    overlay.addEventListener('click', async (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (e.target === overlay || action === 'close') return close();
      if (action === 'share') {
        const text = `🔥 ${streak} dias seguidos de consistência na suplementação com o SupliList! suplilist.com`;
        try {
          if (navigator.share) {
            await navigator.share({ text });
          } else {
            await navigator.clipboard.writeText(text);
            const btn = overlay.querySelector('[data-action="share"]');
            if (btn) btn.textContent = 'Copiado!';
          }
        } catch (err) {
          logger.warn('[StreakCelebration] Share failed:', err);
        }
      }
    });

    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') {
        close();
        document.removeEventListener('keydown', esc);
      }
    });

    document.body.appendChild(overlay);
  },

  _injectStyles() {
    if (document.getElementById('strc-styles')) return;
    const style = document.createElement('style');
    style.id = 'strc-styles';
    style.textContent = `
      #streak-celebration {
        position: fixed; inset: 0; z-index: 600;
        background: rgba(8, 8, 12, 0.78);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        display: flex; align-items: center; justify-content: center;
        padding: 20px;
        animation: strc-fade 0.25s ease forwards;
        overflow: hidden;
      }
      #streak-celebration.strc-out { animation: strc-fade-out 0.25s ease forwards; }
      @keyframes strc-fade { from { opacity: 0; } to { opacity: 1; } }
      @keyframes strc-fade-out { from { opacity: 1; } to { opacity: 0; } }
      .strc-card {
        background: var(--color-surface-primary, #13161C);
        border: 1px solid var(--color-border-brand, rgba(139,92,246,0.3));
        border-radius: 28px;
        box-shadow: 0 0 0 1px rgba(139,92,246,0.15), 0 24px 80px rgba(0,0,0,0.6);
        max-width: 380px; width: 100%;
        padding: 36px 28px;
        display: flex; flex-direction: column; align-items: center; gap: 8px;
        text-align: center;
        animation: strc-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      @keyframes strc-pop {
        from { opacity: 0; transform: scale(0.85) translateY(24px); }
        to   { opacity: 1; transform: scale(1) translateY(0); }
      }
      .strc-flame { font-size: 44px; line-height: 1; filter: drop-shadow(0 4px 16px rgba(251,146,60,0.45)); }
      .strc-days {
        font-size: clamp(3rem, 10vw, 4.5rem); font-weight: 800;
        letter-spacing: -0.04em; line-height: 1;
        color: var(--color-text-primary, #F1F5F9);
        font-variant-numeric: tabular-nums;
      }
      .strc-title {
        font-size: 20px; font-weight: 800; letter-spacing: -0.02em;
        color: var(--color-brand, #8B5CF6); margin: 4px 0 0;
      }
      .strc-text { font-size: 14px; color: var(--color-text-secondary, #94A3B8); margin: 0; line-height: 1.5; }
      .strc-actions { display: flex; gap: 10px; width: 100%; margin-top: 16px; }
      .strc-btn {
        flex: 1; padding: 12px; border: none; border-radius: 12px;
        background: var(--color-brand, #8B5CF6); color: #fff;
        font-size: 14px; font-weight: 700; cursor: pointer;
        transition: filter 0.15s ease;
      }
      .strc-btn:hover { filter: brightness(1.1); }
      .strc-btn--ghost {
        background: transparent;
        color: var(--color-brand, #8B5CF6);
        border: 1px solid var(--color-border-brand, rgba(139,92,246,0.3));
      }
      .strc-confetti { position: absolute; inset: 0; pointer-events: none; }
      .strc-piece {
        position: absolute; top: -12px;
        width: 8px; height: 14px; border-radius: 2px;
        opacity: 0.9;
        animation-name: strc-fall;
        animation-timing-function: linear;
        animation-iteration-count: infinite;
      }
      @keyframes strc-fall {
        from { transform: translateY(-5vh) rotate(0deg); }
        to   { transform: translateY(110vh) rotate(540deg); }
      }
      @media (prefers-reduced-motion: reduce) {
        #streak-celebration, .strc-card { animation: none; }
      }
    `;
    document.head.appendChild(style);
  },
};

export default StreakCelebration;
