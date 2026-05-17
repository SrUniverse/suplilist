/**
 * ══════════════════════════════════════════════════════════════
 * js/accessibility.js — Motor de Acessibilidade e Anúncios ARIA
 * Responsabilidade: Gerenciar Live Regions para feedbacks verbais
 *                   em leitores de tela (Task SL-32).
 * ══════════════════════════════════════════════════════════════
 */

/**
 * Referência ao elemento de anúncio no DOM.
 * @type {HTMLElement|null}
 */
let _announcer = null;

/**
 * Inicializa o Announcer no final do <body>.
 * Configurado com aria-live="polite" para não interromper fluxos críticos,
 * mas informar mudanças assim que o usuário estiver ocioso.
 */
export function initAccessibility() {
  // Previne múltiplas inicializações e garante que _announcer esteja sempre referenciado
  if (document.getElementById('app-announcer')) {
    _announcer = document.getElementById('app-announcer');
    return;
  }

  _announcer = document.createElement('div');
  _announcer.id = 'app-announcer';

  /**
   * Propriedades ARIA Críticas:
   * sr-only: Invisível visualmente (via CSS), mas presente na árvore de acessibilidade.
   * aria-live="polite": Anuncia mudanças de forma não intrusiva.
   * aria-atomic="true": Garante que a mensagem inteira seja lida a cada atualização.
   */
  _announcer.className = 'sr-only'; // Assume que 'sr-only' está definido em styles.css
  _announcer.setAttribute('aria-live', 'polite');
  _announcer.setAttribute('aria-atomic', 'true');

  // Estilos inline de segurança para garantir o comportamento sr-only caso o CSS falhe
  Object.assign(_announcer.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: '0'
  });

  document.body.appendChild(_announcer);
  console.info('[SL-32] Motor de Acessibilidade (Live Region) inicializado.');
}

/**
 * Despacha uma mensagem para ser anunciada pelo leitor de tela.
 * @param {string} message - Texto a ser anunciado.
 */
export function announceToScreenReader(message) {
  if (!_announcer) {
    console.warn('[SL-32] Announcer não inicializado. Chamada ignorada.');
    return;
  }

  // Limpa o conteúdo para garantir que o leitor de tela anuncie a nova mensagem,
  // mesmo que seja idêntica à anterior. Um pequeno atraso ajuda na robustez.
  _announcer.textContent = '';
  setTimeout(() => {
    _announcer.textContent = message;
    console.debug(`[SL-32] Anunciado para leitor de tela: "${message}"`);
  }, 10); // Pequeno atraso para garantir que o DOM foi "resetado" antes da nova mensagem
}