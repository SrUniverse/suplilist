/**
 * ══════════════════════════════════════════════════════════════
 * js/i18n.js — Motor de Internacionalização (Sprint 4 - SL-31)
 * Responsabilidade: Gerenciar dicionários, tradução dinâmica e 
 *                   persistência de localidade.
 * ══════════════════════════════════════════════════════════════
 */

import { S, save } from './state.js';

/**
 * Dicionários de Tradução Estruturados
 */
const dictionaries = {
    'pt-BR': {
        app: {
            title: 'SupliList Pro',
            subtitle: 'Seu guia científico de suplementação',
            confirm_lang: 'Deseja mudar o idioma para Inglês? A interface será traduzida instantaneamente.'
        },
        buttons: {
            save: 'Salvar Alterações',
            cancel: 'Cancelar',
            add: 'Adicionar Item',
            buy: 'Comprar Agora',
            see_prices: 'Ver melhores preços',
            close_options: 'Fechar opções',
            buy_at: 'Comprar no {shop}'
        },
        badges: {
            popular: 'Popular',
            best_cb: 'Melhor C/B',
            economic: 'Econômico'
        },
        search: {
            placeholder: 'Buscar suplemento, objetivo ou tag...',
            no_results: 'Nenhum resultado encontrado para '
        },
        status: {
            saving: 'Sincronizando...',
            saved: 'Salvo localmente'
        },
        items: {
            one: '1 item',
            other: '{count} itens'
        },
        compare: {
            title: 'Comparativo de Performance',
            dock_label: 'Comparar {count}',
            best_value: 'Melhor Custo-Benefício',
            cost_per_dose: 'Custo por Dose',
            cost_per_gram: 'Custo por Grama',
            winner: 'Vencedor Matemático',
            empty: 'Selecione suplementos para comparar benefícios e preços.',
            add_announcement: '{name} adicionado à comparação.',
            limit_reached: '⚠️ Máximo de {n} itens para comparar.',
            label_category: 'Categoria',
            label_price: 'Preço',
            science_label: 'Evidência',
            science_level: 'Nível de Evidência',
            efficacy: 'Eficácia',
            dose: 'Dose'
        }
    },
    'en': {
        app: {
            title: 'SupliList Pro',
            subtitle: 'Your scientific supplementation guide',
            confirm_lang: 'Switch language to Portuguese? The interface will be translated instantly.'
        },
        buttons: {
            save: 'Save Changes',
            cancel: 'Cancel',
            add: 'Add Item',
            buy: 'Buy Now',
            see_prices: 'See best prices',
            close_options: 'Close options',
            buy_at: 'Buy at {shop}'
        },
        search: {
            placeholder: 'Search supplement, goal or tag...',
            no_results: 'No results found for '
        },
        status: {
            saving: 'Syncing...',
            saved: 'Saved locally'
        },
        items: {
            one: '1 item',
            other: '{count} items'
        },
        compare: {
            title: 'Performance Comparison',
            dock_label: 'Compare {count}',
            best_value: 'Best Value',
            cost_per_dose: 'Cost per Dose',
            cost_per_gram: 'Cost per Gram',
            winner: 'Mathematical Winner',
            empty: 'Select supplements to compare benefits and prices.',
            add_announcement: '{name} added to comparison.',
            limit_reached: '⚠️ Maximum of {n} items to compare.',
            label_category: 'Category',
            label_price: 'Price',
            science_label: 'Evidence',
            science_level: 'Evidence Level',
            efficacy: 'Efficacy',
            dose: 'Dose'
        }
    }
};

/**
 * Retorna a tradução baseada em uma chave de caminho (dot notation).
 * Suporta interpolação simples via chaves (ex: {count}).
 * @param {string} path - Ex: 'buttons.save'
 * @param {Object} params - Objeto com valores para substituir no texto.
 * @returns {string} Texto traduzido ou a própria chave em caso de falha.
 */
export function t(path, params = {}) {
    const lang = S.lang || 'pt-BR';
    const keys = path.split('.');
    
    let translation = keys.reduce((obj, key) => (obj && obj[key] !== undefined) ? obj[key] : undefined, dictionaries[lang]);
    
    // Fallback: se não achar no idioma atual, tenta no pt-BR, se não, retorna a chave bruta
    if (translation === undefined && lang !== 'pt-BR') {
        translation = keys.reduce((obj, key) => (obj && obj[key] !== undefined) ? obj[key] : undefined, dictionaries['pt-BR']);
    }

    if (translation === undefined) return path;

    // Interpolação de parâmetros
    return Object.keys(params).reduce((str, param) => {
        return str.replace(`{${param}}`, params[param]);
    }, translation);
}

/**
 * Atalho para pluralização baseada na contagem.
 */
export function p(baseKey, count) {
    const key = count === 1 ? `${baseKey}.one` : `${baseKey}.other`;
    return t(key, { count });
}

/**
 * Varre o DOM em busca de elementos com atributos data-i18n e atualiza seus conteúdos.
 * Suporta: texto interno, placeholders e títulos (tooltips nativos).
 */
export function translatePage() {
    // Tradução de TextContent
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.getAttribute('data-i18n'));
    });

    // Tradução de Placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });

    // Tradução de Atributos de Título
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        el.title = t(el.getAttribute('data-i18n-title'));
    });
    
    // Atualiza o atributo lang do HTML para SEO e Acessibilidade
    document.documentElement.lang = S.lang;
}

/**
 * Altera o idioma global do sistema.
 * @param {string} lang - 'pt-BR' ou 'en'
 */
export function setLanguage(lang) {
    if (!dictionaries[lang]) {
        console.error(`[i18n] Idioma "${lang}" não suportado.`);
        return;
    }

    S.lang = lang;
    save(); // Persiste no localStorage via camada de estado
    translatePage();
}