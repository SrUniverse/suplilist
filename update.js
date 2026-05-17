// ══════════════════════════════════════════════════════════════
// js/update.js — Gerenciamento de Edição de Registros
// [SL-20] Bloqueio de atualizações duplicadas concorrentes.
// ══════════════════════════════════════════════════════════════
import { S, save } from './state.js';
import { toast } from './utils.js';
import { announceToScreenReader } from './accessibility.js';
import { renderAll } from './list.js';
import { toggleLoading } from './ui.js';
import { invalidateSearchCache } from './search.js';

/**
 * Trava de segurança (Mutex) para operações de escrita.
 * Impede que múltiplos cliques no botão "Salvar" disparem processos paralelos.
 */
let isUpdating = false;

/**
 * Processa a atualização de um suplemento existente.
 * @param {Event} event - Evento de submissão do formulário.
 */
export async function handleUpdateRegister(event) {
  if (event?.preventDefault) event.preventDefault();

  // 1. Cláusula de Guarda: Aborta se já houver uma atualização em curso
  if (isUpdating) {
    console.warn('[SL-20] Bloqueio: Tentativa de atualização concorrente ignorada.');
    return;
  }

  const form = event?.target;
  const submitBtn = event?.submitter || form?.querySelector('[type="submit"]');
  
  // Captura de dados do formulário
  const formData = new FormData(form);
  const id = parseInt(formData.get('supp-id'));
  const newName = formData.get('supp-name')?.trim();

  try {
    // 2. Ativação da trava e feedback visual (UX)
    isUpdating = true;
    
    if (submitBtn) {
      submitBtn.disabled = true; // Desativa o botão fisicamente
      submitBtn.classList.add('is-busy'); // Estilização de carregamento do design system
    }

    // Bloqueia a UI da lista para evitar inconsistências durante a mutação
    toggleLoading('list', true);

    // Validação básica
    if (!id || !newName) {
      toast('⚠️', 'Dados insuficientes para atualização.', 'warn');
      return;
    }

    // Simulação de latência de persistência para estabilizar o IO do localStorage
    await new Promise(resolve => setTimeout(resolve, 400));
    invalidateSearchCache();

    // 3. Mutação Atômica do Estado
    const itemIdx = S.customItems?.findIndex(item => item.id === id);
    
    if (itemIdx !== -1 && S.customItems) {
      S.customItems[itemIdx].name = newName;
      S.customItems[itemIdx].updatedAt = new Date().toISOString();
      
      // Persistência e Re-renderização
      announceToScreenReader(`Suplemento ${newName} atualizado com sucesso.`);
      save();
      renderAll();
      toast('✅', 'Alterações salvas com sucesso!', 'success');
    } else {
      announceToScreenReader('Erro: Registro não encontrado para atualização.');
      throw new Error('Registro não encontrado no estado local.');
    }

  } catch (error) {
    console.error('[SL-20] Erro na transação de update:', error);
    toast('🚨', 'Falha ao atualizar registro.', 'error');
  } finally {
    // 4. Liberação da trava e restauração da UI
    isUpdating = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('is-busy');
    }
    toggleLoading('list', false);
  }
}