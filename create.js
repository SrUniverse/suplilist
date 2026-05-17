// ══════════════════════════════════════════════════════════════
// js/create.js — Gerenciamento de Criação de Registros
// [SL-18] Proteção contra submissões duplicadas e concorrência.
// ══════════════════════════════════════════════════════════════
import { S, save } from './state.js';
import { toast } from './utils.js';
import { announceToScreenReader } from './accessibility.js';
import { renderAll } from './list.js';
import { toggleLoading } from './ui.js';
import { invalidateSearchCache } from './search.js';

/**
 * Sinalizador de estado de submissão (Lock de concorrência).
 * Impede que múltiplas execuções da função ocorram em paralelo.
 */
let isSubmitting = false;

/**
 * Trata a criação de novos suplementos personalizados ou registros.
 * Implementa um mecanismo estrito de trava de segurança para garantir a integridade dos dados.
 * [SL-18] Proteção contra Racing Conditions e submissões múltiplas.
 *
 * @param {Event} event - O evento de submissão ou clique.
 */
export async function handleCreateSupplement(event) {
  // Previne o comportamento padrão de recarregamento do form imediatamente
  if (event?.preventDefault) event.preventDefault();

  // 1. Verificação da trava de segurança (Early Return)
  if (isSubmitting) {
    console.warn('[SL-18] Bloqueio: Submissão duplicada detectada e abortada.');
    return;
  }

  // Referências estáveis do DOM
  const form = event?.target || document.getElementById('form-create-supplement');
  const submitBtn = event?.submitter || form?.querySelector('[type="submit"]') || document.getElementById('btn-submit-create');
  const nameInput = document.getElementById('supp-name');

  try {
    // 2. Ativação da trava e desativação da UI
    isSubmitting = true;
    
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('is-busy'); // Estilização de carregamento definida no styles.css
    }

    // Bloqueia a lista para evitar inconsistências visuais durante a re-renderização
    toggleLoading('list', true);

    // 3. Captura e Sanitização de Dados
    const name = nameInput?.value.trim();

    if (!name) {
      toast('⚠️', 'O nome do suplemento é obrigatório.', 'warn');
      return; // O fluxo saltará para o 'finally' automaticamente
    }

    // Simulação de latência para garantir estabilidade da persistência (IO) e feedback ao usuário
    await new Promise(resolve => setTimeout(resolve, 350));
    invalidateSearchCache();

    // 4. Mutação do Estado Global (S)
    if (!S.customItems) S.customItems = [];
    
    S.customItems.push({
      id: Date.now(), // ID incremental baseado no tempo
      name: name,
      createdAt: new Date().toISOString(),
      pr: 'baixa'
    });

    // 5. Ciclo de Persistência e Atualização do DOM
    // O uso de save() agenda a escrita no localStorage
    save();
    renderAll();

    announceToScreenReader(`Suplemento ${name} criado com sucesso.`);
    // Limpeza de formulário antes da confirmação visual
    if (form?.reset) form.reset();
    
    toast('✅', 'Registro criado com sucesso!', 'success');

  } catch (error) {
    console.error('[SL-18] Erro na transação de criação:', error);
    announceToScreenReader('Erro ao criar suplemento.');
    toast('🚨', 'Erro ao salvar dados. Tente novamente.', 'error');
  } finally {
    // 6. Libertação da trava (Mutex Reset)
    // Executado obrigatoriamente tanto em sucesso quanto em falha
    isSubmitting = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('is-busy');
    }
    toggleLoading('list', false);
  }
}