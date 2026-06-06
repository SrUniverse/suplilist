/**
 * Advanced Search Page — Full search UI with compatibility validation
 */

import { stateManager, ACTIONS } from '../../state/state-manager.js';
import AdvancedSearch from './advanced-search.js';
import CompatibilityValidator from './compatibility-validator.js';
import { escapeHtml } from '../../utils/escape.js';

export class AdvancedSearchPage {
  constructor(container) {
    this.container = container;
    this.search = AdvancedSearch;
    this.currentResults = [];
    this.currentFilters = {};
    this.filterOptions = this.search.getFilterOptions();
  }

  mount() {
    this.renderPage();
    this.attachListeners();
  }

  renderPage() {
    const html = `
      <div class="advanced-search-page">
        <div class="search-header">
          <h1>Busca Avançada de Suplementos</h1>
          <p class="subtitle">Encontre o suplemento perfeito com segurança</p>
        </div>

        <div class="search-container">
          <div class="search-input-wrapper">
            <input
              type="text"
              id="search-input"
              class="search-input"
              placeholder="Busque por nome, benefício ou marca..."
              autocomplete="off"
            />
            <div id="autocomplete-suggestions" class="autocomplete-suggestions"></div>
          </div>

          <div class="filters-section">
            <h3>Filtros</h3>

            <!-- Category Filter -->
            <div class="filter-group">
              <label>Categoria</label>
              <select id="filter-category">
                <option value="">Todas</option>
                ${this.filterOptions.categories.map(cat =>
                  `<option value="${cat}">${cat}</option>`
                ).join('')}
              </select>
            </div>

            <!-- Price Range -->
            <div class="filter-group">
              <label>Preço (R$)</label>
              <div class="price-range">
                <input
                  type="number"
                  id="filter-minPrice"
                  placeholder="Mín"
                  min="${this.filterOptions.priceRange.min}"
                />
                <span>-</span>
                <input
                  type="number"
                  id="filter-maxPrice"
                  placeholder="Máx"
                  max="${this.filterOptions.priceRange.max}"
                />
              </div>
            </div>

            <!-- Evidence Level -->
            <div class="filter-group">
              <label>Nível de Evidência</label>
              <select id="filter-evidence">
                <option value="">Todos</option>
                ${this.filterOptions.evidenceLevels.map(level =>
                  `<option value="${level}">Evidência ${level}</option>`
                ).join('')}
              </select>
            </div>

            <!-- Rating -->
            <div class="filter-group">
              <label>Avaliação Mínima</label>
              <select id="filter-rating">
                <option value="">Qualquer</option>
                <option value="3">3+ ⭐</option>
                <option value="3.5">3.5+ ⭐</option>
                <option value="4">4+ ⭐</option>
                <option value="4.5">4.5+ ⭐</option>
              </select>
            </div>

            <!-- In Stock -->
            <div class="filter-group">
              <label>
                <input type="checkbox" id="filter-inStock" />
                Apenas em Estoque
              </label>
            </div>

            <!-- Sort -->
            <div class="filter-group">
              <label>Ordenar por</label>
              <select id="filter-sort">
                <option value="relevance">Relevância</option>
                <option value="price-asc">Menor Preço</option>
                <option value="price-desc">Maior Preço</option>
                <option value="rating">Melhor Avaliação</option>
                <option value="evidence">Melhor Evidência</option>
              </select>
            </div>

            <button id="apply-filters" class="btn-primary">Aplicar Filtros</button>
            <button id="clear-filters" class="btn-secondary">Limpar</button>
          </div>
        </div>

        <div class="results-container">
          <div class="results-header">
            <h2>Resultados</h2>
            <span id="result-count" class="result-count">0 suplementos encontrados</span>
          </div>

          <div id="results-list" class="results-list"></div>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
  }

  attachListeners() {
    // Search input with debounce
    const searchInput = this.container.querySelector('#search-input');
    let searchTimeout;

    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value;

      if (query.length >= 2) {
        // Show autocomplete
        const suggestions = this.search.getSuggestions(query, 5);
        this.renderSuggestions(suggestions);

        // Debounced search
        searchTimeout = setTimeout(() => {
          this.performSearch();
        }, 300);
      } else {
        this.renderSuggestions([]);
      }
    });

    // Click suggestion
    this.container.addEventListener('click', (e) => {
      if (e.target.closest('.suggestion-item')) {
        const supplementId = e.target.closest('.suggestion-item').dataset.id;
        searchInput.value = this.search.searchIndex.find(s => s.id === supplementId).name;
        this.renderSuggestions([]);
        this.performSearch();
      }
    });

    // Filter changes
    const filterInputs = this.container.querySelectorAll('[id^="filter-"]');
    filterInputs.forEach(input => {
      input.addEventListener('change', () => this.performSearch());
    });

    // Apply/Clear buttons
    this.container.querySelector('#apply-filters').addEventListener('click', () => {
      this.performSearch();
    });

    this.container.querySelector('#clear-filters').addEventListener('click', () => {
      filterInputs.forEach(input => {
        if (input.type === 'checkbox') input.checked = false;
        else input.value = '';
      });
      searchInput.value = '';
      this.performSearch();
    });
  }

  performSearch() {
    const query = this.container.querySelector('#search-input').value;
    const filters = {
      category: this.container.querySelector('#filter-category').value,
      minPrice: parseInt(this.container.querySelector('#filter-minPrice').value) || undefined,
      maxPrice: parseInt(this.container.querySelector('#filter-maxPrice').value) || undefined,
      evidenceLevel: this.container.querySelector('#filter-evidence').value,
      minRating: parseFloat(this.container.querySelector('#filter-rating').value) || undefined,
      inStockOnly: this.container.querySelector('#filter-inStock').checked,
      sortBy: this.container.querySelector('#filter-sort').value
    };

    this.currentFilters = filters;
    this.currentResults = this.search.searchWithFilters(query, filters);
    this.renderResults();
  }

  renderResults() {
    const resultsList = this.container.querySelector('#results-list');
    const resultCount = this.container.querySelector('#result-count');

    resultCount.textContent = `${this.currentResults.length} suplemento${this.currentResults.length !== 1 ? 's' : ''} encontrado${this.currentResults.length !== 1 ? 's' : ''}`;

    if (this.currentResults.length === 0) {
      resultsList.innerHTML = '<div class="no-results">Nenhum resultado encontrado. Tente outros termos ou filtros.</div>';
      return;
    }

    const userStack = stateManager.select(s => s.stack) || [];
    const html = this.currentResults.map(supplement => {
      const compatibility = CompatibilityValidator.getCompatibilityScore(supplement.id, userStack);
      const compatColor = compatibility.score >= 80 ? 'green' : compatibility.score >= 60 ? 'yellow' : 'red';

      return `
        <div class="supplement-result" data-id="${supplement.id}">
          <div class="result-header">
            <h4>${escapeHtml(supplement.name)}</h4>
            <span class="badge badge-${supplement.evidenceLevel.toLowerCase()}">
              Evidência ${supplement.evidenceLevel}
            </span>
          </div>

          <div class="result-meta">
            <span class="brand">${escapeHtml(supplement.brand || 'N/A')}</span>
            <span class="category">${supplement.category}</span>
            <span class="rating">${supplement.rating}⭐ (${supplement.reviews} reviews)</span>
          </div>

          <div class="result-price">
            <span class="price">R$ ${supplement.price.toFixed(2)}</span>
            <span class="per-unit">${supplement.pricePerGram.toFixed(2)} por ${supplement.unit}</span>
          </div>

          ${userStack.length > 0 ? `
            <div class="compatibility-indicator" style="border-left: 4px solid ${compatColor}">
              <strong>Compatibilidade:</strong> ${compatibility.score}%
              <p>${compatibility.recommendation}</p>
            </div>
          ` : ''}

          <div class="result-actions">
            <button class="btn-add-stack" data-id="${supplement.id}">
              Adicionar ao Stack
            </button>
            <button class="btn-view-details" data-id="${supplement.id}">
              Detalhes
            </button>
          </div>
        </div>
      `;
    }).join('');

    resultsList.innerHTML = html;

    // Attach add-to-stack handlers
    resultsList.querySelectorAll('.btn-add-stack').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const supplementId = e.target.dataset.id;
        const supplement = this.currentResults.find(s => s.id === supplementId);
        stateManager.dispatch(ACTIONS.ADD_TO_STACK, {
          supplementId,
          name: supplement.name
        });
        alert(`${supplement.name} adicionado ao stack!`);
      });
    });
  }

  renderSuggestions(suggestions) {
    const container = this.container.querySelector('#autocomplete-suggestions');

    if (suggestions.length === 0) {
      container.innerHTML = '';
      return;
    }

    const html = suggestions.map(s => `
      <div class="suggestion-item" data-id="${s.id}">
        <span class="suggestion-name">${escapeHtml(s.name)}</span>
        <span class="suggestion-brand">${s.brand ? `de ${s.brand}` : ''}</span>
      </div>
    `).join('');

    container.innerHTML = html;
  }

  unmount() {
    this.container.innerHTML = '';
  }
}

export default AdvancedSearchPage;
