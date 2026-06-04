import { Page, Locator, expect } from '@playwright/test';

export class CatalogPage {
  readonly page: Page;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByTestId('catalog-search');
  }

  async goto() {
    await this.page.goto('/list');
  }

  async search(term: string) {
    await this.searchInput.waitFor({ state: 'visible' });
    await this.searchInput.fill(term);
  }

  async toggleFavorite(supplementId: string) {
    const favBtn = this.page.getByTestId(`catalog-fav-btn-${supplementId}`);
    await favBtn.waitFor({ state: 'visible' });
    await favBtn.click();
  }
}
