import { Page, Locator, expect } from '@playwright/test';

export class MyStackPage {
  readonly page: Page;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emptyState = page.getByTestId('stack-empty-state');
  }

  async goto() {
    await this.page.goto('/my-stack');
  }

  async verifyEmptyState() {
    await this.emptyState.waitFor({ state: 'visible' });
    await expect(this.emptyState).toBeVisible();
  }

  async verifyItemVisible(itemId: string) {
    const item = this.page.getByTestId(`stack-item-${itemId}`);
    await expect(item).toBeVisible();
  }

  async removeItem(itemId: string) {
    const removeBtn = this.page.getByTestId(`stack-remove-btn-${itemId}`);
    await removeBtn.waitFor({ state: 'visible' });
    
    // Playwright handles the native confirm dialog automatically by dismissing it unless we hook into it.
    // We need to accept the dialog before clicking
    this.page.once('dialog', dialog => dialog.accept());
    
    await removeBtn.click();
  }

  async addItem(searchTerm: string, itemId: string) {
    await this.page.getByTestId('stack-add-btn').click();
    
    const searchInput = this.page.getByTestId('stack-modal-search');
    await searchInput.waitFor({ state: 'visible' });
    await searchInput.fill(searchTerm);

    const resultBtn = this.page.getByTestId(`stack-modal-result-${itemId}`);
    await resultBtn.waitFor({ state: 'visible' });
    await resultBtn.click();

    await this.page.getByTestId('stack-modal-submit').click();
  }
}

