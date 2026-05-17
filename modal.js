/**
 * ══════════════════════════════════════════════════════════════
 * js/modal.js — Gerenciamento de Modais e Focus Trap (SL-33)
 * Responsabilidade: Gerenciar abertura/fechamento de modais garantindo
 *                   que o foco permaneça preso dentro do container ativo.
 * ══════════════════════════════════════════════════════════════
 */

// Seletores de elementos que podem receber foco (Padrão W3C)
const FOCUSABLE_SELECTOR = 'button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';

// Estado persistente para controle de acessibilidade
let previousActiveElement = null;
let currentKeyDownHandler = null;

/**
 * Descobre dinamicamente todos os elementos focáveis visíveis dentro de um container.
 * @param {HTMLElement} container 
 * @returns {HTMLElement[]}
 */
function getFocusableElements(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR))
    .filter(el => {
      // Garante que o elemento não esteja desativado ou oculto
      const style = window.getComputedStyle(el);
      return !el.hasAttribute('disabled') && style.display !== 'none' && style.visibility !== 'hidden';
    });
}

/**
 * Abre um modal, armazena o foco anterior e ativa a armadilha de foco.
 * @param {HTMLElement} modalElement - O elemento do modal (overlay/backdrop).
 */
export function openModal(modalElement) {
  if (!modalElement) return;

  // 1. Armazena o elemento que tinha o foco antes de abrir o modal
  previousActiveElement = document.activeElement;

  // 2. Exibe o modal e atualiza estados ARIA
  modalElement.classList.add('on');
  modalElement.setAttribute('aria-hidden', 'false');

  // 3. Identifica elementos focáveis
  const focusableElements = getFocusableElements(modalElement);
  
  if (focusableElements.length > 0) {
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // 4. Handler para Tab e Escape
    currentKeyDownHandler = (e) => {
      // Atalho de fechamento instantâneo via Escape
      if (e.key === 'Escape') {
        closeModal(modalElement);
        return;
      }

      if (e.key === 'Tab') {
        if (e.shiftKey) { // Navegação reversa (Shift + Tab)
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else { // Navegação normal (Tab)
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', currentKeyDownHandler);
    
    // Move o foco inicial para o primeiro elemento do modal
    firstElement.focus();
  }
}

/**
 * Fecha o modal, limpa os escutadores e restaura o foco original.
 */
export function closeModal(modalElement) {
  if (!modalElement) return;

  modalElement.classList.remove('on');
  modalElement.setAttribute('aria-hidden', 'true');

  // Limpa o evento de teclado para evitar vazamento de memória (memory leak)
  if (currentKeyDownHandler) {
    document.removeEventListener('keydown', currentKeyDownHandler);
    currentKeyDownHandler = null;
  }

  // Restaura o foco para o elemento original da página
  if (previousActiveElement) {
    previousActiveElement.focus();
  }
}