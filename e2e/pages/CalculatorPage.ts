import { Page, Locator, expect } from '@playwright/test';

export class CalculatorPage {
  readonly page: Page;
  readonly weightInput: Locator;
  readonly bodyfatInput: Locator;
  readonly activitySelect: Locator;
  readonly objectiveSelect: Locator;
  readonly searchInput: Locator;
  readonly resultValue: Locator;
  readonly addProtocolBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.weightInput = page.getByTestId('calc-weight');
    this.bodyfatInput = page.getByTestId('calc-bodyfat');
    this.activitySelect = page.getByTestId('calc-activity');
    this.objectiveSelect = page.getByTestId('calc-objective');
    this.searchInput = page.getByTestId('calc-search');
    this.resultValue = page.getByTestId('calc-result-value');
    this.addProtocolBtn = page.getByTestId('calc-add-protocol');
  }

  async goto() {
    await this.page.goto('/dosage');
  }

  async setBiometrics(weight: string, bodyfat?: string) {
    await this.weightInput.fill(weight);
    if (bodyfat) {
      await this.bodyfatInput.fill(bodyfat);
    }
  }

  async selectSupplement(supplementId: string, searchTerm?: string) {
    if (searchTerm) {
      await this.searchInput.fill(searchTerm);
    }
    const chip = this.page.getByTestId(`calc-chip-${supplementId}`);
    await chip.waitFor({ state: 'visible' });
    await chip.click();
  }

  async verifyResultVisible() {
    await expect(this.resultValue).toBeVisible();
    await expect(this.resultValue).not.toHaveText('—');
  }

  async addToProtocol() {
    await this.addProtocolBtn.waitFor({ state: 'visible' });
    await this.addProtocolBtn.click();
  }
}
