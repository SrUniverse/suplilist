import { eventBus } from '../core/eventbus.js';
import { Modal } from './modal.js';
import { EVIDENCE_LEVELS, GOALS } from '../utils/constants.js';

export class AdvancedFilterModal {
    static open(currentFilters) {
        const modalDiv = document.createElement('div');
        modalDiv.className = 'flex flex-col gap-5 text-zinc-300';

        const maxCost = currentFilters.maxCostPerDose || 10;

        modalDiv.innerHTML = `
      <!-- Slider custo por dose -->
      <div class="flex flex-col gap-2">
        <div class="flex justify-between items-center">
          <span class="text-xs font-bold text-zinc-400 uppercase tracking-wider">Custo Máximo / Dose</span>
          <span class="text-xs font-bold text-purple-400" id="modal-cost-value">R$ ${maxCost.toFixed(2)}</span>
        </div>
        <input type="range" id="modal-cost-slider" min="0.5" max="10" step="0.5" value="${maxCost}" class="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500">
      </div>

      <!-- Checkbox por nível de evidência -->
      <div class="flex flex-col gap-2">
        <span class="text-xs font-bold text-zinc-400 uppercase tracking-wider">Nível de Evidência</span>
        <div class="flex flex-col gap-2">
          ${EVIDENCE_LEVELS.map(ev => {
            const isChecked = currentFilters.evidenceLevel.includes(ev) ? 'checked' : '';
            return `
              <label class="flex items-center gap-3 cursor-pointer text-xs select-none py-1">
                <input type="checkbox" class="modal-ev-checkbox form-checkbox rounded border-zinc-800 bg-zinc-950 text-purple-600 focus:ring-purple-500" value="${ev}" ${isChecked}>
                <span>Nível ${ev} ${ev === 'A' ? '(Alta comprovação)' : ev === 'B' ? '(Média comprovação)' : '(Evidência preliminar)'}</span>
              </label>
            `;
        }).join('')}
        </div>
      </div>

      <!-- Checkbox por objetivo -->
      <div class="flex flex-col gap-2">
        <span class="text-xs font-bold text-zinc-400 uppercase tracking-wider">Objetivos Saudáveis</span>
        <div class="grid grid-cols-2 gap-2">
          ${GOALS.map(goal => {
            const isChecked = currentFilters.goals.includes(goal) ? 'checked' : '';
            return `
              <label class="flex items-center gap-3 cursor-pointer text-xs select-none py-1">
                <input type="checkbox" class="modal-goal-checkbox form-checkbox rounded border-zinc-800 bg-zinc-950 text-purple-600 focus:ring-purple-500" value="${goal}" ${isChecked}>
                <span>${goal}</span>
              </label>
            `;
        }).join('')}
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="flex justify-between items-center pt-4 border-t border-zinc-800/40 mt-2">
        <button id="modal-clear-btn" class="text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-colors py-2 px-1 focus:outline-none">Limpar Tudo</button>
        <div class="flex gap-2">
          <button id="modal-cancel-btn" class="btn-outline text-xs px-4 py-2 rounded-xl font-semibold">Cancelar</button>
          <button id="modal-apply-btn" class="btn-primary text-xs px-5 py-2.5 rounded-xl font-bold hover:shadow-[0_0_12px_rgba(124,58,237,0.4)]">Aplicar Filtros</button>
        </div>
      </div>
    `;

        const modal = new Modal('Filtros Avançados', modalDiv);
        modal.open();

        const costSlider = modalDiv.querySelector('#modal-cost-slider');
        const costValue = modalDiv.querySelector('#modal-cost-value');
        const clearBtn = modalDiv.querySelector('#modal-clear-btn');
        const cancelBtn = modalDiv.querySelector('#modal-cancel-btn');
        const applyBtn = modalDiv.querySelector('#modal-apply-btn');

        costSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            costValue.textContent = `R$ ${val.toFixed(2)}`;
        });

        cancelBtn.addEventListener('click', () => modal.close());

        clearBtn.addEventListener('click', () => {
            costSlider.value = '10';
            costValue.textContent = 'R$ 10.00';
            modalDiv.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        });

        applyBtn.addEventListener('click', () => {
            const maxCostVal = parseFloat(costSlider.value);
            const selectedEvs = Array.from(modalDiv.querySelectorAll('.modal-ev-checkbox:checked')).map(cb => cb.value);
            const selectedGoals = Array.from(modalDiv.querySelectorAll('.modal-goal-checkbox:checked')).map(cb => cb.value);

            const updatedFilters = {
                categories: currentFilters.categories,
                evidenceLevel: selectedEvs,
                goals: selectedGoals,
                maxCostPerDose: maxCostVal === 10 ? 0 : maxCostVal
            };

            eventBus.emit('list:advanced-filter:applied', updatedFilters);
            modal.close();
        });
    }
}