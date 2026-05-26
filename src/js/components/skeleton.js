/**
 * @fileoverview Componente visual SkeletonLoader do SupliList v2.0.
 * Gera elementos com animação de pulsação suave em dark mode para representar
 * o estado de carregamento de dados em andamento.
 */

class SkeletonLoader {
  /**
   * Renderiza os esqueletos de placeholders (skeletons) dentro de um elemento container.
   * @param {number} count - Quantidade de itens de esqueleto a renderizar.
   * @param {HTMLElement} container - O elemento pai onde os skeletons serão inseridos.
   * @param {'card' | 'list' | 'stat'} [variant='card'] - Variante visual ('card'|'list'|'stat').
   * @returns {void}
   */
  render(count, container, variant = 'card') {
    if (!container || !(container instanceof HTMLElement)) return;

    // Limpa o conteúdo existente do container antes de injetar os placeholders
    container.innerHTML = '';

    const fragment = document.createDocumentFragment();

    for (let i = 0; i < count; i++) {
      const skeletonNode = document.createElement('div');
      skeletonNode.setAttribute('data-skeleton', 'true');

      if (variant === 'card') {
        skeletonNode.className = 'w-full bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-4 flex flex-col gap-4 h-[340px] animate-pulse';
        skeletonNode.innerHTML = `
          <div class="w-full h-36 bg-zinc-800/50 rounded-2xl"></div>
          <div class="flex flex-col gap-2">
            <div class="w-2/3 h-5 bg-zinc-800/50 rounded-lg"></div>
            <div class="w-1/3 h-3.5 bg-zinc-800/30 rounded-lg"></div>
            <div class="w-full h-10 bg-zinc-800/20 rounded-lg mt-2"></div>
          </div>
          <div class="w-full h-10 bg-zinc-800/40 rounded-xl mt-auto"></div>
        `;
      } else if (variant === 'list') {
        skeletonNode.className = 'flex items-center justify-between p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl w-full animate-pulse';
        skeletonNode.innerHTML = `
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-zinc-800/50 rounded-xl"></div>
            <div class="flex flex-col gap-1.5">
              <div class="w-32 h-4 bg-zinc-800/50 rounded-md"></div>
              <div class="w-20 h-3 bg-zinc-800/30 rounded-md"></div>
            </div>
          </div>
          <div class="w-16 h-8 bg-zinc-800/40 rounded-lg"></div>
        `;
      } else if (variant === 'stat') {
        skeletonNode.className = 'flex flex-col gap-2 p-6 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl w-full text-center animate-pulse';
        skeletonNode.innerHTML = `
          <div class="w-16 h-8 bg-zinc-800/50 rounded-lg mx-auto"></div>
          <div class="w-24 h-4 bg-zinc-800/30 rounded-md mx-auto"></div>
        `;
      }

      fragment.appendChild(skeletonNode);
    }

    container.appendChild(fragment);
  }

  /**
   * Remove todos os elementos de esqueleto ativos contidos em um determinado elemento pai.
   * @param {HTMLElement} container - O elemento pai a ser limpo.
   * @returns {void}
   */
  clear(container) {
    if (!container || !(container instanceof HTMLElement)) return;
    
    const skeletons = container.querySelectorAll('[data-skeleton="true"]');
    skeletons.forEach((s) => {
      try {
        if (s.parentNode) {
          s.parentNode.removeChild(s);
        }
      } catch {
        // Ignora falhas síncronas de remoção pontuais
      }
    });
  }
}

export const skeleton = new SkeletonLoader();
