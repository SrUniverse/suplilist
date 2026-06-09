/**
 * Integrated Price Page â€” Full Firecrawl + API Integration
 * Real-time pricing with marketplace comparison
 */

import EnhancedPriceAggregator from '../../platform/price-aggregator-enhanced.js';
import { escapeHtml } from '../../utils/escape.js';
import { logger } from '../../utils/logger.js';

export class IntegratedPricePage {
  constructor(container, supplementName) {
    this.container = container;
    this.supplementName = supplementName;
    this.priceData = null;
    this.analysis = null;
    this.loading = false;
  }

  async mount() {
    this.loading = true;
    this.renderLoading();

    try {
      logger.info(`Loading prices for: ${this.supplementName}`);

      // Fetch prices (automatically uses API + Firecrawl)
      this.priceData = await EnhancedPriceAggregator.getPrices(this.supplementName);

      // Get detailed market analysis
      this.analysis = await EnhancedPriceAggregator.analyzeMarket(this.supplementName);

      this.renderPage();
      this.attachListeners();

      logger.info(`Prices loaded (source: ${this.priceData.source})`);
    } catch (error) {
      logger.error(`Failed to load prices: ${this.supplementName}`, error);
      this.renderError(error.message);
    }

    this.loading = false;
  }

  renderLoading() {
    this.container.innerHTML = `
      <div class="integrated-price-loading">
        <div class="spinner"></div>
        <p>Buscando preÃ§os em marketplaces...</p>
        <small>${this.priceData?.source === 'hybrid' ? '(API + Web Scraping)' : '(API)'}</small>
      </div>
    `;
  }

  renderError(message) {
    this.container.innerHTML = `
      <div class="price-error">
        <h3>âŒ Erro ao buscar preÃ§os</h3>
        <p>${escapeHtml(message)}</p>
        <button class="btn-retry">Tentar Novamente</button>
      </div>
    `;

    this.container.querySelector('.btn-retry')?.addEventListener('click', () => {
      this.mount();
    });
  }

  renderPage() {
    const html = `
      <div class="integrated-price-page">
        ${this.renderHeader()}
        ${this.renderSourceBadge()}
        ${this.renderPriceStats()}
        ${this.renderBestDeal()}
        ${this.renderMarketAnalysis()}
        ${this.renderMarketplaceComparison()}
        ${this.renderAllListings()}
      </div>
    `;

    this.container.innerHTML = html;
  }

  renderHeader() {
    return `
      <div class="price-header">
        <h2>${escapeHtml(this.supplementName)}</h2>
        <p class="timestamp">Atualizado em ${new Date().toLocaleTimeString('pt-BR')}</p>
      </div>
    `;
  }

  renderSourceBadge() {
    const data = this.priceData;

    return `
      <div class="source-badge ${data.source}">
        ${data.source === 'hybrid' ? `
          <span class="badge-api">API</span>
          <span class="badge-plus">+</span>
          <span class="badge-firecrawl">Web Scraping</span>
        ` : `
          <span class="badge-api">API Only</span>
        `}
        ${data.scrapedCount ? `<span class="scraped-count">${data.scrapedCount} resultados scraped</span>` : ''}
      </div>
    `;
  }

  renderPriceStats() {
    const stats = this.priceData.stats;
    const analysis = this.analysis;

    return `
      <div class="price-stats-grid">
        <div class="stat-card">
          <div class="stat-label">Melhor PreÃ§o</div>
          <div class="stat-value green">R$ ${stats.lowestPrice?.toFixed(2)}</div>
          <div class="stat-meta">${this.priceData.bestDeal?.marketplace}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">PreÃ§o MÃ©dio</div>
          <div class="stat-value">R$ ${stats.averagePrice?.toFixed(2)}</div>
          <div class="stat-meta">Mediana: R$ ${analysis.priceAnalysis.median?.toFixed(2)}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Maior PreÃ§o</div>
          <div class="stat-value">R$ ${stats.highestPrice?.toFixed(2)}</div>
          <div class="stat-meta">VariaÃ§Ã£o: ${analysis.priceAnalysis.stdDev?.toFixed(2)}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Economia PossÃ­vel</div>
          <div class="stat-value gold">R$ ${stats.savings?.toFixed(2)}</div>
          <div class="stat-meta">${((stats.savings / stats.highestPrice) * 100).toFixed(1)}% menos</div>
        </div>
      </div>
    `;
  }

  renderBestDeal() {
    const bestDeal = this.priceData.bestDeal;
    if (!bestDeal) return '';

    return `
      <div class="best-deal-banner">
        <div class="best-deal-content">
          <div class="deal-badge">ðŸ† MELHOR OFERTA</div>
          <h3>${escapeHtml(bestDeal.title)}</h3>
          <div class="deal-price">
            <span class="amount">R$ ${bestDeal.price?.toFixed(2)}</span>
            ${bestDeal.originalPrice ? `
              <span class="original">R$ ${bestDeal.originalPrice?.toFixed(2)}</span>
            ` : ''}
          </div>
          <div class="deal-info">
            <span>ðŸª ${bestDeal.marketplace}</span>
            <span>â­ ${bestDeal.rating?.toFixed(1) || 'N/A'}</span>
            <span>ðŸ“¦ ${bestDeal.shipping || 'A calcular'}</span>
          </div>
          <a href="${bestDeal.url}" target="_blank" class="btn-buy-now">
            Comprar Agora
          </a>
        </div>
      </div>
    `;
  }

  renderMarketAnalysis() {
    const analysis = this.analysis;
    const rec = analysis.recommendation;

    return `
      <div class="market-analysis">
        <h3>ðŸ“Š AnÃ¡lise de Mercado</h3>

        <div class="analysis-grid">
          <div class="analysis-card">
            <div class="analysis-label">Total de Ofertas</div>
            <div class="analysis-value">${analysis.totalListings}</div>
            <div class="analysis-meta">
              ${analysis.sources.api} API + ${analysis.sources.scraped} Scraped
            </div>
          </div>

          <div class="analysis-card">
            <div class="analysis-label">RecomendaÃ§Ã£o</div>
            <div class="analysis-value">${rec.recommendation}</div>
            <div class="analysis-meta">${rec.reasoning}</div>
          </div>

          <div class="analysis-card">
            <div class="analysis-label">Amplitude de PreÃ§o</div>
            <div class="analysis-value">${rec.priceRange}</div>
            <div class="analysis-meta">Desvio padrÃ£o: R$ ${analysis.priceAnalysis.stdDev?.toFixed(2)}</div>
          </div>
        </div>
      </div>
    `;
  }

  renderMarketplaceComparison() {
    const breakdown = this.analysis.marketplaceBreakdown;

    return `
      <div class="marketplace-comparison">
        <h3>ðŸ¬ Por Marketplace</h3>
        <div class="comparison-table">
          <table>
            <thead>
              <tr>
                <th>Marketplace</th>
                <th>Ofertas</th>
                <th>Melhor PreÃ§o</th>
                <th>PreÃ§o MÃ©dio</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(breakdown).map(([marketplace, data]) => `
                <tr>
                  <td><strong>${marketplace}</strong></td>
                  <td>${data.count}</td>
                  <td>R$ ${data.minPrice?.toFixed(2)}</td>
                  <td>R$ ${data.avgPrice?.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  renderAllListings() {
    const results = this.priceData.allResults;

    return `
      <div class="all-listings">
        <h3>ðŸ“‹ Todas as Ofertas (${results.length})</h3>

        <div class="listings-grid">
          ${results.map((product, idx) => `
            <div class="listing-card" data-index="${idx}">
              <div class="listing-header">
                <h4>${escapeHtml(product.title?.substring(0, 40) || 'Sem tÃ­tulo')}</h4>
                <span class="source-badge-small ${product.source || 'api'}">
                  ${product.source === 'firecrawl' ? 'ðŸ”— Scraped' : 'API'}
                </span>
              </div>

              <div class="listing-price">
                <span class="price">R$ ${product.price?.toFixed(2)}</span>
                ${product.discount > 0 ? `
                  <span class="discount">${product.discount}% OFF</span>
                ` : ''}
              </div>

              <div class="listing-meta">
                <span>ðŸª ${product.marketplace}</span>
                <span>â­ ${product.rating?.toFixed(1) || 'N/A'}</span>
                <span>ðŸ“¦ ${product.shipping || '-'}</span>
              </div>

              <div class="listing-availability ${product.availability?.includes('estoque') ? 'available' : 'unavailable'}">
                ${product.availability || 'Verificar'}
              </div>

              <a href="${product.url}" target="_blank" class="btn-visit">
                Ver Oferta
              </a>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  attachListeners() {
    // All links already have target="_blank"
    logger.info('Integrated price page listeners attached');
  }

  unmount() {
    this.container.innerHTML = '';
  }
}

export default IntegratedPricePage;


