import { Page, Locator, expect } from '@playwright/test';

export class FavoritesPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/favorites');
  }

  async verifyCardVisible(supplementId: string) {
    const card = this.page.getByTestId(`fav-card-${supplementId}`);
    await expect(card).toBeVisible();
  }

  async removeFavorite(supplementId: string) {
    const removeBtn = this.page.getByTestId(`fav-remove-btn-${supplementId}`);
    await removeBtn.waitFor({ state: 'visible' });
    await removeBtn.click();
  }
}
