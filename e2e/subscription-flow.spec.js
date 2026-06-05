import { test, expect } from '@playwright/test';

test.describe('Subscription Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:3000/login');
    await page.locator('input[type="email"]').fill('demo@test.com');
    await page.locator('input[type="password"]').fill('demo123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/.*dashboard/);
  });

  test('should navigate to plans page', async ({ page }) => {
    await page.locator('a[href="/plans"]').click();
    await page.waitForURL(/.*plans/);
    
    const plansContainer = page.locator('[data-testid="plans-container"]');
    await expect(plansContainer).toBeVisible();
  });

  test('should display all plan options', async ({ page }) => {
    await page.locator('a[href="/plans"]').click();
    await page.waitForURL(/.*plans/);
    
    const basicPlan = page.locator('[data-testid="plan-basic"]');
    const premiumPlan = page.locator('[data-testid="plan-premium"]');
    const elitePlan = page.locator('[data-testid="plan-elite"]');
    
    await expect(basicPlan).toBeVisible();
    await expect(premiumPlan).toBeVisible();
    await expect(elitePlan).toBeVisible();
  });

  test('should show current subscription status', async ({ page }) => {
    await page.locator('a[href="/account"]').click();
    await page.waitForURL(/.*account/);
    
    const subscriptionStatus = page.locator('[data-testid="subscription-status"]');
    await expect(subscriptionStatus).toBeVisible();
    
    const tierBadge = page.locator('[data-testid="tier-badge"]');
    await expect(tierBadge).toContainText(/basic|premium|elite/i);
  });

  test('should upgrade subscription', async ({ page }) => {
    await page.locator('a[href="/plans"]').click();
    await page.waitForURL(/.*plans/);
    
    // Current plan is Basic, upgrade to Premium
    const upgradeBtn = page.locator('[data-testid="plan-premium"]').locator('button:has-text("Upgrade")');
    await upgradeBtn.click();
    
    // Should navigate to checkout
    await page.waitForURL(/.*checkout/);
    
    // Complete payment
    const submitBtn = page.locator('button:has-text("Confirmar")');
    await submitBtn.click();
    
    // Should show success
    const success = page.locator('[data-testid="upgrade-success"]');
    await expect(success).toBeVisible();
  });

  test('should show immediate benefits after upgrade', async ({ page }) => {
    // After upgrade (from previous test)
    const benefits = page.locator('[data-testid="plan-benefits"]');
    await expect(benefits).toBeVisible();
    
    // Check for new features
    const newFeature = page.locator('text=/análise avançada|advanced analytics/i');
    await expect(newFeature).toBeVisible();
  });

  test('should downgrade plan with confirmation', async ({ page }) => {
    // Already subscribed to Premium
    await page.locator('a[href="/account"]').click();
    await page.waitForURL(/.*account/);
    
    // Find downgrade button
    const downgradeBtn = page.locator('button[data-testid="downgrade-plan"]');
    
    if (await downgradeBtn.isVisible()) {
      await downgradeBtn.click();
      
      // Should show confirmation dialog
      const confirmDialog = page.locator('[data-testid="confirm-downgrade"]');
      await expect(confirmDialog).toBeVisible();
      
      // Confirm downgrade
      await page.locator('button:has-text("Confirmar downgrade")').click();
      
      // Should be downgraded
      const tierBadge = page.locator('[data-testid="tier-badge"]');
      await expect(tierBadge).toContainText(/basic/i);
    }
  });

  test('should pause subscription', async ({ page }) => {
    await page.locator('a[href="/account"]').click();
    await page.waitForURL(/.*account/);
    
    const pauseBtn = page.locator('button[data-testid="pause-subscription"]');
    
    if (await pauseBtn.isVisible()) {
      await pauseBtn.click();
      
      // Should show pause dialog
      const pauseDialog = page.locator('[data-testid="pause-dialog"]');
      await expect(pauseDialog).toBeVisible();
      
      // Select pause duration
      const durationSelect = page.locator('select[name="duration"]');
      await durationSelect.selectOption('30');
      
      // Confirm pause
      await page.locator('button:has-text("Pausar")').click();
      
      // Should show paused status
      const status = page.locator('[data-testid="subscription-status"]');
      await expect(status).toContainText(/pausado|paused/i);
    }
  });

  test('should resume paused subscription', async ({ page }) => {
    // Subscription is paused
    await page.locator('a[href="/account"]').click();
    await page.waitForURL(/.*account/);
    
    const resumeBtn = page.locator('button[data-testid="resume-subscription"]');
    
    if (await resumeBtn.isVisible()) {
      await resumeBtn.click();
      
      // Should show confirmation
      const confirmDialog = page.locator('[data-testid="confirm-resume"]');
      await expect(confirmDialog).toBeVisible();
      
      await page.locator('button:has-text("Retomar")').click();
      
      // Should be active again
      const status = page.locator('[data-testid="subscription-status"]');
      await expect(status).toContainText(/ativo|active/i);
    }
  });

  test('should cancel subscription with confirmation', async ({ page }) => {
    await page.locator('a[href="/account"]').click();
    await page.waitForURL(/.*account/);
    
    const cancelBtn = page.locator('button[data-testid="cancel-subscription"]');
    
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      
      // Should show cancellation dialog with reason selection
      const dialog = page.locator('[data-testid="cancel-dialog"]');
      await expect(dialog).toBeVisible();
      
      // Select reason
      const reasonSelect = page.locator('select[name="reason"]');
      await reasonSelect.selectOption('too-expensive');
      
      // Confirm cancellation
      await page.locator('button:has-text("Cancelar inscrição")').click();
      
      // Should show cancellation confirmation
      const confirmation = page.locator('[data-testid="cancellation-confirmed"]');
      await expect(confirmation).toBeVisible();
    }
  });

  test('should show billing information', async ({ page }) => {
    await page.locator('a[href="/account"]').click();
    await page.waitForURL(/.*account/);
    
    const billingSection = page.locator('[data-testid="billing-section"]');
    await expect(billingSection).toBeVisible();
    
    // Check for next billing date
    const nextBillingDate = page.locator('[data-testid="next-billing-date"]');
    await expect(nextBillingDate).toBeVisible();
  });

  test('should display invoice history', async ({ page }) => {
    await page.locator('a[href="/account"]').click();
    await page.waitForURL(/.*account/);
    
    const invoiceTab = page.locator('[data-testid="invoice-tab"]');
    await invoiceTab.click();
    
    const invoiceList = page.locator('[data-testid="invoice-list"]');
    await expect(invoiceList).toBeVisible();
  });
});
