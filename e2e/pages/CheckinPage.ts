import { Page, Locator, expect } from '@playwright/test';

export class CheckinPage {
  readonly page: Page;
  readonly checkAllBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.checkAllBtn = page.getByTestId('checkin-all-btn');
  }

  async goto() {
    await this.page.goto('/checkin');
  }

  async checkInItem(supplementId: string) {
    const btn = this.page.getByTestId(`checkin-btn-${supplementId}`);
    await btn.waitFor({ state: 'visible' });
    await btn.click();
  }

  async verifyItemChecked(supplementId: string) {
    const doneText = this.page.getByTestId(`checkin-done-${supplementId}`);
    await expect(doneText).toBeVisible();
  }

  async checkAll() {
    await this.checkAllBtn.waitFor({ state: 'visible' });
    await this.checkAllBtn.click();
  }
}
