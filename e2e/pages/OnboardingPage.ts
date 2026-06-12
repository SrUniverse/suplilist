import { Page, Locator, expect } from '@playwright/test';

export class OnboardingPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly weightInput: Locator;
  readonly nextBtn1: Locator;
  readonly nextBtn2: Locator;
  readonly finishBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.getByTestId('onboarding-input-name');
    this.weightInput = page.getByTestId('onboarding-input-weight');
    this.nextBtn1 = page.getByTestId('onboarding-btn-next-1');
    this.nextBtn2 = page.getByTestId('onboarding-btn-next-2');
    this.finishBtn = page.getByTestId('onboarding-btn-finish');
  }

  async goto() {
    await this.page.goto('/onboarding');
  }

  async fillName(name: string) {
    // Regra 3: Aguardando fluxos assíncronos (evitar waitForTimeout)
    await this.nameInput.waitFor({ state: 'visible' });
    await this.nameInput.fill(name);
  }

  async submitStep1() {
    await this.nextBtn1.click();
  }

  async selectGoal(goal: string) {
    const goalCard = this.page.getByTestId(`onboarding-goal-${goal}`);
    await goalCard.waitFor({ state: 'visible' });
    await goalCard.click();
  }

  /** Step 2 agora coleta biometria (peso obrigatório) para doses personalizadas. */
  async fillWeight(weight: number) {
    await this.weightInput.waitFor({ state: 'visible' });
    await this.weightInput.fill(String(weight));
  }

  async selectFrequency(freq: number) {
    const card = this.page.getByTestId(`onboarding-freq-${freq}`);
    await card.waitFor({ state: 'visible' });
    await card.click();
  }

  async submitStep2() {
    await this.nextBtn2.click();
  }

  async toggleSupplement(id: string) {
    const suppCard = this.page.getByTestId(`onboarding-supp-${id}`);
    await suppCard.waitFor({ state: 'visible' });
    await suppCard.click();
  }

  async finishOnboarding() {
    // Step 3 advances to step 4 (account creation). Step 4 has skip-register to finalize.
    await this.page.getByTestId('onboarding-btn-next-3').click();
    await this.page.getByTestId('onboarding-btn-skip-register').click();
  }

  async completeOnboarding(data: { name: string, goal: string, weight?: number, frequency?: number, unselectSupplements?: string[] }) {
    await this.goto();

    await this.fillName(data.name);
    await this.submitStep1();

    await this.selectGoal(data.goal);
    await this.fillWeight(data.weight ?? 75);
    if (data.frequency) await this.selectFrequency(data.frequency);
    await this.submitStep2();

    if (data.unselectSupplements && data.unselectSupplements.length > 0) {
      for (const supp of data.unselectSupplements) {
        await this.toggleSupplement(supp);
      }
    }
    await this.finishOnboarding();
  }
}
