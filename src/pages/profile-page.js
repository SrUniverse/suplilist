import { stateManager, ACTIONS } from '../state/state-manager.js';
import { eventBus } from '../core/event-bus.js';

const OBJECTIVES = [
  { value: 'bulk', label: '📈 Ganho de Massa (Bulk)' },
  { value: 'cut', label: '🔥 Definição Muscular (Cut)' },
  { value: 'strength', label: '💪 Força Máxima' },
  { value: 'endurance', label: '🏃 Resistência / Cardio' },
  { value: 'general', label: '🌿 Saúde Geral' },
];

const RESTRICTIONS = [
  { value: 'lactose', label: 'Lactose' },
  { value: 'gluten', label: 'Glúten' },
  { value: 'soy', label: 'Soja' },
  { value: 'stimulant', label: 'Estimulantes' },
  { value: 'creatine', label: 'Creatina' },
];

const inputStyle = 'width:100%;padding:11px 12px;background:var(--color-bg-secondary);border:1px solid var(--color-border);color:var(--color-text-primary);border-radius:10px;font-size:14px;font-family:inherit;box-sizing:border-box;';

function label(text) {
  return `<label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--color-text-secondary);margin-bottom:6px;">${text}</label>`;
}

export default class ProfilePage {
  constructor(container) {
    this.container = container;
    this._form = {};
  }

  mount() {
    const u = stateManager.user;
    this._form = {
      name: u.name || '',
      objective: u.objective || 'general',
      weight: u.weight || 75,
      trainingFrequency: u.trainingFrequency || 4,
      trainingAge: u.trainingAge || 1,
      budget: u.budget || 200,
      restrictions: [...(u.restrictions || [])],
    };
    this._render();
    this._attachListeners();
  }

  unmount() {}

  _render() {
    const f = this._form;
    const streak = stateManager.calculateStreak();
    const checkins = stateManager.checkins.length;

    this.container.innerHTML = `
      <div style="padding:20px 16px;display:flex;flex-direction:column;gap:20px;padding-bottom:40px;">

        <header>
          <p style="color:var(--color-text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:0.07em;">Configurações</p>
          <h1 style="font-size:26px;font-weight:800;letter-spacing:-0.02em;margin-top:2px;">Meu Perfil</h1>
        </header>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:14px;padding:16px;text-align:center;">
            <div style="font-size:24px;font-weight:800;">${streak}</div>
            <div style="font-size:11px;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-top:2px;">🔥 Streak</div>
          </div>
          <div style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:14px;padding:16px;text-align:center;">
            <div style="font-size:24px;font-weight:800;">${checkins}</div>
            <div style="font-size:11px;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-top:2px;">📋 Check-ins</div>
          </div>
        </div>

        <form id="profile-form" style="display:flex;flex-direction:column;gap:20px;">

          <div style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:14px;">
            <h2 style="font-size:14px;font-weight:700;margin-bottom:-2px;">Identidade</h2>
            <div>
              ${label('Nome')}
              <input id="field-name" type="text" value="${f.name}" placeholder="Seu nome" style="${inputStyle}" />
            </div>
          </div>

          <div style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:14px;">
            <h2 style="font-size:14px;font-weight:700;margin-bottom:-2px;">Objetivo Fitness</h2>
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${OBJECTIVES.map(obj => {
                const active = f.objective === obj.value;
                return `
                  <label style="display:flex;align-items:center;gap:12px;cursor:pointer;padding:12px;background:${active ? 'var(--color-brand-muted)' : 'var(--color-bg-secondary)'};border:1px solid ${active ? 'var(--color-brand)' : 'transparent'};border-radius:10px;">
                    <input type="radio" name="objective" value="${obj.value}" ${active ? 'checked' : ''} style="accent-color:var(--color-brand);width:16px;height:16px;" />
                    <span style="font-size:14px;font-weight:${active ? '700' : '500'};color:${active ? 'var(--color-brand)' : 'inherit'};">${obj.label}</span>
                  </label>
                `;
              }).join('')}
            </div>
          </div>

          <div style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:14px;">
            <h2 style="font-size:14px;font-weight:700;margin-bottom:-2px;">Biometria & Treino</h2>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div>
                ${label('Peso (kg)')}
                <input id="field-weight" type="number" min="30" max="250" value="${f.weight}" style="${inputStyle}" />
              </div>
              <div>
                ${label('Treinos/semana')}
                <input id="field-freq" type="number" min="1" max="7" value="${f.trainingFrequency}" style="${inputStyle}" />
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div>
                ${label('Anos treinando')}
                <input id="field-training-age" type="number" min="0" max="50" value="${f.trainingAge}" style="${inputStyle}" />
              </div>
              <div>
                ${label('Budget mensal (R$)')}
                <input id="field-budget" type="number" min="0" max="5000" value="${f.budget}" style="${inputStyle}" />
              </div>
            </div>
          </div>

          <div style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:12px;">
            <h2 style="font-size:14px;font-weight:700;margin-bottom:-2px;">Restrições / Alergias</h2>
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
              ${RESTRICTIONS.map(r => {
                const active = f.restrictions.includes(r.value);
                return `
                  <button type="button" class="btn-restriction" data-value="${r.value}" style="
                    background:${active ? 'var(--color-error-bg)' : 'var(--color-bg-secondary)'};
                    color:${active ? 'var(--color-error)' : 'var(--color-text-secondary)'};
                    border:1px solid ${active ? 'rgba(239,68,68,0.4)' : 'var(--color-border)'};
                    border-radius:20px;padding:7px 14px;font-size:13px;font-weight:600;cursor:pointer;
                  ">
                    ${active ? '✕ ' : ''}${r.label}
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <button type="submit" style="
            width:100%;background:var(--color-brand);color:#fff;border:none;
            border-radius:14px;padding:16px;font-weight:700;font-size:16px;
            cursor:pointer;font-family:inherit;
          ">
            Salvar Perfil
          </button>

        </form>

        <div style="background:var(--color-surface-primary);border:1px solid var(--color-border);border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:12px;">
          <h2 style="font-size:14px;font-weight:700;color:var(--color-error);">Zona de Perigo</h2>
          <button id="btn-reset-data" style="background:var(--color-error-bg);color:var(--color-error);border:1px solid rgba(239,68,68,0.3);border-radius:10px;padding:11px;font-weight:600;font-size:14px;cursor:pointer;width:100%;font-family:inherit;">
            Resetar todos os dados
          </button>
        </div>

      </div>
    `;
  }

  _attachListeners() {
    const fields = [
      ['#field-name', 'name', 'string'],
      ['#field-weight', 'weight', 'number'],
      ['#field-freq', 'trainingFrequency', 'number'],
      ['#field-training-age', 'trainingAge', 'number'],
      ['#field-budget', 'budget', 'number'],
    ];
    fields.forEach(([sel, key, type]) => {
      const el = this.container.querySelector(sel);
      if (!el) return;
      el.addEventListener('input', () => {
        this._form[key] = type === 'number' ? parseFloat(el.value) || 0 : el.value;
      });
    });

    this.container.querySelectorAll('input[name="objective"]').forEach(radio => {
      radio.addEventListener('change', () => {
        this._form.objective = radio.value;
        this.container.querySelectorAll('label:has(input[name="objective"])').forEach(lbl => {
          const val = lbl.querySelector('input').value;
          const active = val === this._form.objective;
          lbl.style.background = active ? 'var(--color-brand-muted)' : 'var(--color-bg-secondary)';
          lbl.style.borderColor = active ? 'var(--color-brand)' : 'transparent';
          lbl.querySelector('span').style.fontWeight = active ? '700' : '500';
          lbl.querySelector('span').style.color = active ? 'var(--color-brand)' : 'inherit';
        });
      });
    });

    this.container.querySelectorAll('.btn-restriction').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.value;
        const idx = this._form.restrictions.indexOf(val);
        if (idx === -1) {
          this._form.restrictions = [...this._form.restrictions, val];
        } else {
          this._form.restrictions = this._form.restrictions.filter((_, i) => i !== idx);
        }
        this._render();
        this._attachListeners();
      });
    });

    const form = this.container.querySelector('#profile-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        stateManager.dispatch(ACTIONS.SET_USER_PROFILE, {
          name: this._form.name,
          objective: this._form.objective,
          weight: this._form.weight,
          trainingFrequency: this._form.trainingFrequency,
          trainingAge: this._form.trainingAge,
          budget: this._form.budget,
          restrictions: this._form.restrictions,
        });
        eventBus.emit('ui:toastRequested', { message: '✅ Perfil salvo!', type: 'success' });
      });
    }

    const resetBtn = this.container.querySelector('#btn-reset-data');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Isso vai apagar seu stack, check-ins e preferências. Tem certeza?')) {
          stateManager.reset();
          eventBus.emit('ui:toastRequested', { message: 'Dados resetados.', type: 'info' });
          window.location.hash = '#/home';
        }
      });
    }
  }
}
