import Fuse from 'fuse.js';

/**
 * Realiza a busca difusa (fuzzy search) na lista de dados isolando o Fuse.js.
 * @param {string} query - O termo de busca.
 * @param {Array} data - Os dados onde a busca será realizada.
 * @returns {Array} Lista de resultados ordenados por relevância.
 */
export function searchSupplements(query, data) {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return data;
    }

    const options = {
        keys: [
            { name: 'name', weight: 0.6 },
            { name: 'mechanism', weight: 0.2 },
            { name: 'category', weight: 0.2 }
        ],
        threshold: 0.3,
        ignoreLocation: true,
        useExtendedSearch: true
    };

    const fuse = new Fuse(data, options);
    const results = fuse.search(query);
    return results.map(result => result.item);
}