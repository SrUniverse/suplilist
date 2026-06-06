/**
 * Price Comparison Page — Show prices across marketplaces
 */

import priceAggregator from '../../platform/price-aggregator.js';
import { escapeHtml } from '../../utils/escape.js';

export class PriceComparisonPage {
  constructor(container, supplementName) {
    this.container = container;
    this.supplementName = supplementName;
    this.priceData = null;
    this.loading = false;
  }

  async mount() {
    this.loading = true;
    this.renderLoading();

    try {
      this.priceData = await priceAggregator.getPrices(this.supplementName);
      this.renderPage();
      this.attachListeners();
    } catch (error) {
      this.renderError(error.message);
    }

    this.loading = false;
  }

  renderLoading() {
    this.container.innerHTML = `
      <div class="price-comparison loading">
        <div class="spinner"></div>
        <p>Buscando preços em marketplaces...</p>
      </div>
    `;
  }

  renderError(message) {
    this.container.innerHTML = `
      <div class="price-comparison error">
        <h3>Erro ao buscar preços</h3>
        <p>${escapeHtml(message)}</p>
        <button class="btn-retry">Tentar Novamente</button>
      </div>
    `;
  }

  renderPage() {
    const data = this.priceData;

    const html = `
      <div class="price-comparison-page">
        <div class="comparison-header">
          <h2>${escapeHtml(data.supplementName)}</h2>
          <div class="price-stats">
            <div class="stat">
              <span class="label">Melhor Preço</span>
              <span class="value green">R$ ${data.stats.lowestPrice?.toFixed(2)}</span>
            </div>
            <div class="stat">
              <span class="label">Preço Médio</span>
              <span class="value">R$ ${data.stats.averagePrice?.toFixed(2)}</span>
            </div>
            <div class="stat">
              <span class="label">Maior Preço</span>
              <span class="value">R$ ${data.stats.highestPrice?.toFixed(2)}</span>
            </div>
            <div class="stat">
              <span class="label">Economia</span>
              <span class="value gold">R$ ${data.stats.savings?.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div class="comparison-controls">
          <button class="btn-primary" id="set-price-alert">
            🔔 Alerta de Preço
          </button>
          <button class="btn-secondary" id="view-trends">
            📈 Ver Tendências
          </button>
        </div>

        ${this.renderBestDeal(data.bestDeal)}

        <div class="marketplace-results">
          <h3>Ofertas por Marketplace</h3>
          <div class="results-tabs">
            ${Object.entries(data.byMarketplace).map(([marketplace, results]) => `
              <div class="tab-pane" data-marketplace="${marketplace}">
                <h4>${marketplace}</h4>
                ${results.length === 0 ? `
                  <p class="no-results">Nenhum resultado encontrado</p>
                ` : `
                  <div class="product-list">
                    ${results.slice(0, 3).map(product => this.renderProduct(product, marketplace)).join('')}
                  </div>
                `}
              </div>
            `).join('')}
          </div>
        </div>

        <div class="price-table">
          <h3>Todas as Ofertas</h3>
          <table>
            <thead>
              <tr>
                <th>Marketplace</th>
                <th>Preço</th>
                <th>Desconto</th>
                <th>Frete</th>
                <th>Avaliação</th>
                <th>Disponibilidade</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              ${data.allResults.map(result => `
                <tr>
                  <td><strong>${result.marketplace}</strong></td>
                  <td class="price">R$ ${result.price?.toFixed(2)}</td>
                  <td>
                    ${result.discount > 0 ? `
                      <span class="discount">${result.discount}% OFF</span>
                    ` : '-'}
                  </td>
                  <td>${result.shipping || '-'}</td>
                  <td>
                    ${result.rating ? `${result.rating.toFixed(1)}⭐` : '-'}
                    ${result.reviews ? `(${result.reviews})` : ''}
                  </td>
                  <td>
                    <span class="availability ${result.availability.includes('estoque') ? 'available' : 'unavailable'}">
                      ${result.availability}
                    </span>
                  </td>
                  <td>
                    <a href="${result.url}" target="_blank" class="btn-visit">
                      Visitar
                    </a>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="price-alert-section" id="price-alert-form" style="display:none;">
          <h3>Configurar Alerta de Preço</h3>
          <div class="form-group">
            <label>Preço Alvo (R$)</label>
            <input type="number" id="alert-target-price"
              value="${data.stats.lowestPrice?.toFixed(2)}"
              min="0" step="0.01" />
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" id="alert-email" checked />
              Notificar por Email
            </label>
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" id="alert-push" checked />
              Notificação Push
            </label>
          </div>
          <button class="btn-primary" id="confirm-alert">
            Configurar Alerta
          </button>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
  }

  renderBestDeal(bestDeal) {
    if (!bestDeal) return '';

    return `
      <div class="best-deal-card">
        <div class="badge">Melhor Oferta</div>
        <div class="deal-content">
          <h3>${escapeHtml(bestDeal.title)}</h3>
          <div class="deal-price">
            <span class="amount">R$ ${bestDeal.price?.toFixed(2)}</span>
            ${bestDeal.originalPrice ? `
              <span class="original">R$ ${bestDeal.originalPrice?.toFixed(2)}</span>
            ` : ''}
          </div>
          <div class="deal-info">
            <span>🏪 ${bestDeal.marketplace}</span>
            <span>⭐ ${bestDeal.rating?.toFixed(1)}</span>
            <span>📦 ${bestDeal.shipping}</span>
          </div>
          <a href="${bestDeal.url}" target="_blank" class="btn-buy">
            Comprar Agora
          </a>
        </div>
      </div>
    `;
  }

  renderProduct(product, marketplace) {
    return `
      <div class="product-card">
        <h5>${escapeHtml(product.title)}</h5>
        <div class="product-price">
          <span class="price">R$ ${product.price?.toFixed(2)}</span>
          ${product.discount > 0 ? `
            <span class="discount-badge">${product.discount}%</span>
          ` : ''}
        </div>
        <div class="product-meta">
          <span>${product.rating?.toFixed(1)}⭐ (${product.reviews})</span>
          <span>${product.shipping}</span>
        </div>
        <a href="${product.url}" target="_blank" class="btn-visit-small">
          Ver em ${marketplace}
        </a>
      </div>
    `;
  }

  attachListeners() {
    // Price alert button
    this.container.querySelector('#set-price-alert')?.addEventListener('click', () => {
      const form = this.container.querySelector('#price-alert-form');
      form.style.display = form.style.display === 'none' ? 'block' : 'none';
    });

    // Confirm alert
    this.container.querySelector('#confirm-alert')?.addEventListener('click', () => {
      const targetPrice = parseFloat(
        this.container.querySelector('#alert-target-price').value
      );
      const notifyEmail = this.container.querySelector('#alert-email').checked;
      const notifyPush = this.container.querySelector('#alert-push').checked;

      priceAggregator.setPriceAlert(this.supplementName, targetPrice, {
        notifyEmail,
        notifyPush
      });

      alert(`Alerta configurado para R$ ${targetPrice.toFixed(2)}`);
      this.container.querySelector('#price-alert-form').style.display = 'none';
    });

    // Retry button
    this.container.querySelector('.btn-retry')?.addEventListener('click', () => {
      this.mount();
    });

    // View trends
    this.container.querySelector('#view-trends')?.addEventListener('click', () => {
      this.renderTrends();
    });
  }

  renderTrends() {
    const trends = priceAggregator.getPriceTrend(this.supplementName);

    if (trends.length === 0) {
      alert('Sem histórico de preços ainda. Tente novamente em alguns dias.');
      return;
    }

    const trendHTML = `
      <div class="price-trends-modal">
        <h3>Tendência de Preços - ${this.supplementName}</h3>
        <table>
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Menor Preço</th>
              <th>Preço Médio</th>
              <th>Maior Preço</th>
            </tr>
          </thead>
          <tbody>
            ${trends.map(trend => `
              <tr>
                <td>${new Date(trend.timestamp).toLocaleString('pt-BR')}</td>
                <td>R$ ${trend.lowestPrice?.toFixed(2)}</td>
                <td>R$ ${trend.averagePrice?.toFixed(2)}</td>
                <td>R$ ${trend.highestPrice?.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Simple modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = trendHTML;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  unmount() {
    this.container.innerHTML = '';
  }
}

export default PriceComparisonPage;
