import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitBtn: Locator;
  readonly errorMsg: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId('login-email');
    this.passwordInput = page.getByTestId('login-password');
    this.submitBtn = page.getByTestId('login-submit');
    this.errorMsg = page.getByTestId('login-error');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async fillCredentials(email: string, pass: string) {
    await this.emailInput.waitFor({ state: 'visible' });
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
  }

  async submit() {
    await this.submitBtn.click();
  }

  async login(email: string, pass: string) {
    await this.goto();
    await this.fillCredentials(email, pass);
    await this.submit();
  }

  async getErrorMessage() {
    await this.errorMsg.waitFor({ state: 'visible' });
    return this.errorMsg.textContent();
  }
}
