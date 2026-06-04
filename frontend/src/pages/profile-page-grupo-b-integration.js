/**
 * @fileoverview Profile Page Integration for Grupo B Features
 * Shows how to integrate Stack Optimizer and Before/After Tracker into profile
 *
 * Add these methods to existing profile-page.js class:
 */

import { optimizeStack } from '../features/stack/stack-optimizer.js';
import { calculateTransformation, getMotivationMessage, generateTimeline } from '../features/progress/before-after-tracker.js';

/**
 * Render Stack Optimizer section in profile
 * Insert after _renderRefillAlertsSection()
 */
export function _renderStackOptimizerSection() {
  const container = document.getElementById('profile-stack-optimizer');
  if (!container) return;

  const { user, stackItems, purchases } = this.state;
  const optimization = optimizeStack(stackItems, purchases || [], user.goal, user.monthlyBudget || 500);

  container.innerHTML = `
    <div style="padding:20px;border-top:1px solid var(--color-border);">
      <h3 style="margin:0 0 16px;font-size:18px;font-weight:700;">🤖 Otimizador de Stack</h3>

      <!-- Optimization Stats -->
      <div style="
        background:var(--color-surface-primary);
        border-radius:12px;padding:16px;
        margin-bottom:16px;display:grid;grid-template-columns:1fr 1fr;gap:12px;
      ">
        <div>
          <div style="font-size:11px;color:var(--color-text-secondary);margin-bottom:6px;">Redundâncias</div>
          <div style="font-size:20px;font-weight:800;color:${optimization.redundancies.length > 0 ? 'var(--color-warning)' : 'var(--color-success)'};">
            ${optimization.redundancies.length}
          </div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--color-text-secondary);margin-bottom:6px;">Economias Potencial</div>
          <div style="font-size:20px;font-weight:800;color:var(--color-brand);">
            R$ ${optimization.savingsPotential.toFixed(2)}/mês
          </div>
        </div>
        <div style="grid-column:1/-1;">
          <div style="font-size:11px;color:var(--color-text-secondary);margin-bottom:6px;">Oportunidades</div>
          <div style="font-size:14px;color:var(--color-text-primary);font-weight:600;">
            ${optimization.gaps.length} suplemento${optimization.gaps.length !== 1 ? 's' : ''} recomendado${optimization.gaps.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <!-- Recommendation Card -->
      <div style="
        background:linear-gradient(135deg, var(--color-info-bg) 0%, var(--color-warning-bg) 100%);
        border:1px solid var(--color-info);
        border-radius:12px;padding:16px;
        margin-bottom:16px;
      ">
        <p style="margin:0;font-size:13px;color:var(--color-text-primary);line-height:1.6;">
          💡 ${optimization.recommendation}
        </p>
      </div>

      <!-- Redundancies List -->
      ${optimization.redundancies.length > 0 ? `
        <div style="margin-bottom:16px;">
          <h4 style="font-size:12px;font-weight:700;color:var(--color-text-secondary);margin:0 0 8px;text-transform:uppercase;">
            ⚠️ Redundâncias Detectadas
          </h4>
          ${optimization.redundancies.map(r => `
            <div style="
              background:var(--color-warning-bg);border:1px solid var(--color-warning);
              border-radius:8px;padding:12px;margin-bottom:8px;
            ">
              <div style="font-size:13px;font-weight:600;color:var(--color-text-primary);margin-bottom:4px;">
                ${r.category}
              </div>
              <div style="font-size:12px;color:var(--color-text-secondary);">
                ${r.supplements.join(', ')}
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- Gaps List -->
      ${optimization.gaps.length > 0 ? `
        <div>
          <h4 style="font-size:12px;font-weight:700;color:var(--color-text-secondary);margin:0 0 8px;text-transform:uppercase;">
            ✨ Recomendações (Alto ROI)
          </h4>
          ${optimization.gaps.slice(0, 3).map(g => `
            <div style="
              background:var(--color-success-bg);border:1px solid var(--color-success);
              border-radius:8px;padding:12px;margin-bottom:8px;
            ">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <div style="font-size:13px;font-weight:600;color:var(--color-text-primary);">
                  ${g.name}
                </div>
                <div style="font-size:12px;color:var(--color-success);font-weight:700;">
                  ${g.priority.toUpperCase()}
                </div>
              </div>
              <div style="font-size:12px;color:var(--color-text-secondary);">
                R$ ${g.cost}/mês • ROI: ${g.roi}%
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Render Before/After Progress section
 * Insert after _renderStackOptimizerSection()
 */
export function _renderProgressTrackerSection() {
  const container = document.getElementById('profile-progress-tracker');
  if (!container) return;

  const { progressRecords = [] } = this.state;

  // Get latest before and after records
  const latestBefore = progressRecords
    .filter(r => r.phase === 'before')
    .sort((a, b) => b.recordedAt - a.recordedAt)[0];

  const latestAfter = progressRecords
    .filter(r => r.phase === 'after')
    .sort((a, b) => b.recordedAt - a.recordedAt)[0];

  const transformation = latestBefore && latestAfter
    ? calculateTransformation(latestBefore, latestAfter, 30)
    : null;

  const timeline = generateTimeline(progressRecords);

  container.innerHTML = `
    <div style="padding:20px;border-top:1px solid var(--color-border);">
      <h3 style="margin:0 0 16px;font-size:18px;font-weight:700;">📸 Meu Progresso</h3>

      <!-- Current Transformation -->
      ${transformation ? `
        <div style="
          background:linear-gradient(135deg, var(--color-success-bg) 0%, var(--color-info-bg) 100%);
          border-radius:12px;padding:20px;margin-bottom:16px;
        ">
          <h4 style="margin:0 0 12px;font-size:14px;font-weight:700;color:var(--color-text-primary);">
            Transformação Atual
          </h4>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
            <div>
              <div style="font-size:11px;color:var(--color-text-secondary);margin-bottom:4px;">Peso</div>
              <div style="font-size:16px;font-weight:800;color:var(--color-success);">
                ${transformation.weightChange > 0 ? '+' : ''}${transformation.weightChange.toFixed(1)}kg
              </div>
              <div style="font-size:11px;color:var(--color-text-secondary);">
                (${transformation.weightChangePercent > 0 ? '+' : ''}${transformation.weightChangePercent}%)
              </div>
            </div>
            <div>
              <div style="font-size:11px;color:var(--color-text-secondary);margin-bottom:4px;">Cintura</div>
              <div style="font-size:16px;font-weight:800;color:${transformation.waistChange > 0 ? 'var(--color-error)' : 'var(--color-success)'};">
                ${transformation.waistChange > 0 ? '+' : ''}${transformation.waistChange.toFixed(1)}cm
              </div>
            </div>
            <div>
              <div style="font-size:11px;color:var(--color-text-secondary);margin-bottom:4px;">Peito</div>
              <div style="font-size:16px;font-weight:800;color:var(--color-info);">
                ${transformation.chestChange > 0 ? '+' : ''}${transformation.chestChange.toFixed(1)}cm
              </div>
            </div>
            <div>
              <div style="font-size:11px;color:var(--color-text-secondary);margin-bottom:4px;">Braços</div>
              <div style="font-size:16px;font-weight:800;color:var(--color-brand);">
                ${transformation.armsChange > 0 ? '+' : ''}${transformation.armsChange.toFixed(1)}cm
              </div>
            </div>
          </div>

          <div style="
            background:rgba(255,255,255,0.1);border-radius:8px;padding:12px;
            font-size:13px;color:var(--color-text-primary);line-height:1.6;
          ">
            ${getMotivationMessage(transformation, this.state.user.goal)}
          </div>
        </div>
      ` : `
        <div style="
          background:var(--color-surface-primary);
          border:2px dashed var(--color-border);
          border-radius:12px;padding:24px;
          text-align:center;margin-bottom:16px;
        ">
          <p style="margin:0;font-size:13px;color:var(--color-text-secondary);">
            📷 Captura uma foto do seu corpo e medições para começar a rastrear!
          </p>
          <button onclick="this.dispatchEvent(new CustomEvent('capture-before'))"
            style="
              margin-top:12px;
              background:var(--color-brand);color:white;
              border:none;border-radius:8px;
              padding:10px 16px;font-weight:600;
              cursor:pointer;
            ">
            Capturar Antes
          </button>
        </div>
      `}

      <!-- Timeline -->
      ${timeline.length > 0 ? `
        <div>
          <h4 style="font-size:12px;font-weight:700;color:var(--color-text-secondary);margin:0 0 12px;text-transform:uppercase;">
            Timeline de Progresso
          </h4>
          ${timeline.map((milestone, idx) => `
            <div style="
              background:var(--color-surface-primary);
              border:1px solid var(--color-border);
              border-radius:10px;padding:12px;margin-bottom:10px;
            ">
              <div style="font-size:12px;font-weight:700;color:var(--color-text-primary);margin-bottom:6px;">
                ${milestone.from} → ${milestone.to}
              </div>
              <div style="font-size:11px;color:var(--color-text-secondary);margin-bottom:6px;">
                ${milestone.duration} dias • ${milestone.transformation.phase.toUpperCase()}
              </div>
              <div style="font-size:12px;color:var(--color-brand);font-weight:600;">
                ${milestone.transformation.weightChange > 0 ? '+' : ''}${milestone.transformation.weightChange.toFixed(1)}kg
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Add to profile page render method:
 *
 * render() {
 *   const html = `
 *     ... existing sections ...
 *     <div id="profile-stack-optimizer"></div>
 *     <div id="profile-progress-tracker"></div>
 *   `;
 *
 *   this._renderStackOptimizerSection();
 *   this._renderProgressTrackerSection();
 * }
 */
