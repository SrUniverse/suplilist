// ══════════════ CONFIGURAÇÃO DE AFILIADOS ══════════════
const AFF_CONFIG = {
    amazonTag: "SUA_TAG_AMAZON-20", // Substitua pelo seu ID da Amazon
    shopeeId: "SEU_ID_SHOPEE",     // Seu ID ou apenas para controle
    mlId: "SEU_ID_ML"              // Seu ID ou apenas para controle
};

/**
 * Gera os links de busca automática ou usa o link direto se existir
 * @param {Object} item - O objeto do suplemento vindo do data.js
 */
function getAffiliateLinks(item) {
    const query = encodeURIComponent(item.name);
    
    return {
        // Amazon: Busca por melhores avaliações (&s=review-rank)
        amazon: item.linkAmazon || `https://www.amazon.com.br/s?k=${query}&tag=${AFF_CONFIG.amazonTag}&s=review-rank`,
        
        // Shopee: Busca por mais vendidos (&sortBy=sales)
        shopee: item.linkShopee || `https://shopee.com.br/search?keyword=${query}&sortBy=sales`,
        
        // Mercado Livre: Busca geral (ML já prioriza custo-benefício no "Relevantes")
        ml: item.linkML || `https://lista.mercadolivre.com.br/${query}`
    };
}

/**
 * Cria o HTML dos botões de compra
 */
function renderAffiliateButtons(item) {
    const links = getAffiliateLinks(item);

    const container = document.createElement('div');
    container.className = 'aff-container';

    const title = document.createElement('p');
    title.className = 'aff-title';
    title.textContent = '🛒 Onde comprar (Melhor Avaliado):';
    container.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'aff-grid';

    const buttons = [
        { href: links.amazon, label: 'Amazon', cls: 'aff-btn btn-amazon' },
        { href: links.shopee, label: 'Shopee', cls: 'aff-btn btn-shopee' },
        { href: links.ml, label: 'M. Livre', cls: 'aff-btn btn-ml' }
    ];

    buttons.forEach(btn => {
        const anchor = document.createElement('a');
        anchor.href = btn.href;
        anchor.target = '_blank';
        anchor.rel = 'sponsored noopener';
        anchor.className = btn.cls;

        const span = document.createElement('span');
        span.textContent = btn.label;
        anchor.appendChild(span);

        grid.appendChild(anchor);
    });

    container.appendChild(grid);

    const disclaimer = document.createElement('p');
    disclaimer.className = 'aff-disclaimer';
    disclaimer.textContent = '* Preços e estoque sujeitos a alteração nas lojas.';
    container.appendChild(disclaimer);

    return container.outerHTML;
}