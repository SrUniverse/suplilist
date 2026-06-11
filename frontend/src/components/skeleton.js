/**
 * skeleton.js — Componente visual para estados de carregamento (Skeleton UI)
 * 
 * Fornece métodos utilitários para gerar HTML de skeletons de vários tipos,
 * evitando a necessidade de escrever o HTML manualmente em cada componente.
 *
 * @module components/skeleton
 */

export const Skeleton = {
  /**
   * Retorna o HTML para um skeleton genérico (retângulo)
   * @param {string} [height='1rem'] Altura do skeleton
   * @param {string} [width='100%'] Largura do skeleton
   * @param {string} [radius='4px'] Border-radius do skeleton
   * @returns {string}
   */
  box(height = '1rem', width = '100%', radius = '4px') {
    return `<div class="skeleton" style="height: ${height}; width: ${width}; border-radius: ${radius};"></div>`;
  },

  /**
   * Retorna o HTML para uma ou mais linhas de texto
   * @param {number} [lines=3] Número de linhas a gerar
   * @returns {string}
   */
  text(lines = 3) {
    let html = '';
    for (let i = 0; i < lines; i++) {
      // A última linha fica um pouco mais curta por padrão
      const width = i === lines - 1 ? '70%' : '100%';
      html += `<div class="skeleton skeleton-text" style="width: ${width};"></div>`;
    }
    return html;
  },

  /**
   * Retorna o HTML para um card completo de suplemento (imagem + body)
   * Igual ao que é usado no ListPage
   * @returns {string}
   */
  supplementCard() {
    return `
      <div class="skeleton-card" style="padding: 0; gap: 0;">
        <div class="skeleton" style="height: 190px; border-radius: 16px 16px 0 0;"></div>
        <div style="padding: 14px; display: flex; flex-direction: column; gap: 10px;">
          ${this.box('1.5rem', '80%')}
          ${this.box('1rem', '50%')}
          <div style="display: flex; gap: 8px; margin-top: auto; padding-top: 10px;">
            ${this.box('44px', '44px', '8px')}
            ${this.box('44px', '100%', '8px')}
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Retorna o HTML para o dashboard / history card
   * @returns {string}
   */
  historyCard() {
    return `
      <div class="skeleton-card" style="flex-direction: row; align-items: center; justify-content: space-between;">
        <div style="display: flex; flex-direction: column; gap: 8px; flex: 1;">
          ${this.box('1.2rem', '50%')}
          ${this.box('0.8rem', '30%')}
        </div>
        ${this.box('32px', '80px', '16px')}
      </div>
    `;
  }
};
