/**
 * image-focus.js — Posição focal (object-position) das fotos de produto.
 *
 * As fotos dos suplementos são quadradas (640×640) mas aparecem em caixas
 * landscape (cards do catálogo e hero do modal de detalhe) com `object-fit:
 * cover`. Sem ajuste, o `cover` centraliza e corta o topo/base — cortando o
 * rótulo do produto. Estes valores deslocam o foco pra cima por categoria para
 * manter o produto e o rótulo visíveis. Compartilhado entre card e modal para
 * que o enquadramento seja consistente nas duas superfícies.
 *
 * @module features/supplements/image-focus
 */

const OBJECT_POSITION_BY_CATEGORY = {
  'Proteínas':   'center 20%',
  'Creatinas':   'center 30%',
  'Vitaminas':   'center 15%',
  'Aminoácidos': 'center 25%',
  'Cognitivos':  'center 30%',
  'Performance': 'center 30%',
  'Adaptógenos': 'center 25%',
  'Minerais':    'center 20%',
};

/**
 * Retorna o object-position ideal para a foto de um suplemento.
 * @param {string} category - Categoria do suplemento (item.category)
 * @returns {string} valor de object-position (ex.: 'center 30%')
 */
export function getImageObjectPosition(category) {
  return OBJECT_POSITION_BY_CATEGORY[category] ?? 'center 35%';
}
