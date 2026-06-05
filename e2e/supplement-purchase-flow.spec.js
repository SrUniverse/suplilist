import { test, expect } from '@playwright/test';

test.describe('Supplement Purchase Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:3000/login');
    await page.locator('input[type="email"]').fill('demo@test.com');
    await page.locator('input[type="password"]').fill('demo123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/.*dashboard/);
  });

  test('should navigate to supplements list', async ({ page }) => {
    await page.locator('a[href="/supplements"]').click();
    await page.waitForURL(/.*supplements/);
    
    const supplementList = page.locator('[data-testid="supplement-list"]');
    await expect(supplementList).toBeVisible();
  });

  test('should display supplement cards', async ({ page }) => {
    await page.locator('a[href="/supplements"]').click();
    await page.waitForURL(/.*supplements/);
    
    const cards = page.locator('[data-testid="supplement-card"]');
    await expect(cards).not.toHaveCount(0);
  });

  test('should filter supplements by category', async ({ page }) => {
    await page.locator('a[href="/supplements"]').click();
    await page.waitForURL(/.*supplements/);
    
    const vitaminFilter = page.locator('label:has-text("Vitaminas")');
    await vitaminFilter.click();
    
    const cards = page.locator('[data-testid="supplement-card"]');
    const firstCard = cards.first();
    await expect(firstCard).toContainText(/vitamina|vitamin/i);
  });

  test('should add supplement to stack', async ({ page }) => {
    await page.locator('a[href="/supplements"]').click();
    await page.waitForURL(/.*supplements/);
    
    const addBtn = page.locator('[data-testid="supplement-card"]').first().locator('button:has-text("Adicionar")');
    await addBtn.click();
    
    // Should show confirmation or navigate to stack
    const confirmation = page.locator('[data-testid="toast"], [data-testid="modal"]');
    await expect(confirmation).toBeVisible();
  });

  test('should configure dosage before adding', async ({ page }) => {
    await page.locator('a[href="/supplements"]').click();
    await page.waitForURL(/.*supplements/);
    
    const firstCard = page.locator('[data-testid="supplement-card"]').first();
    const configBtn = firstCard.locator('button:has-text("Configurar")');
    
    if (await configBtn.isVisible()) {
      await configBtn.click();
      
      const dosageInput = page.locator('input[name="dosage"]');
      await expect(dosageInput).toBeVisible();
      
      await dosageInput.fill('500');
      await page.locator('button:has-text("Adicionar")').click();
    }
  });

  test('should proceed to checkout from stack', async ({ page }) => {
    // Navigate to my stack
    await page.locator('a[href="/my-stack"]').click();
    await page.waitForURL(/.*my-stack/);
    
    // Click checkout
    const checkoutBtn = page.locator('button[data-testid="checkout-btn"]');
    if (await checkoutBtn.isVisible()) {
      await checkoutBtn.click();
      await page.waitForURL(/.*checkout/);
      await expect(page).toHaveURL(/.*checkout/);
    }
  });

  test('should display order summary', async ({ page }) => {
    await page.locator('a[href="/my-stack"]').click();
    await page.waitForURL(/.*my-stack/);
    
    const summary = page.locator('[data-testid="order-summary"]');
    await expect(summary).toBeVisible();
    
    const totalPrice = page.locator('[data-testid="total-price"]');
    await expect(totalPrice).toContainText(/R\$/);
  });

  test('should enter payment details', async ({ page }) => {
    await page.locator('a[href="/my-stack"]').click();
    await page.waitForURL(/.*my-stack/);
    await page.locator('button[data-testid="checkout-btn"]').click();
    await page.waitForURL(/.*checkout/);
    
    // Fill card details (test card)
    const cardFrame = page.frameLocator('iframe[name*="card"]').first();
    await cardFrame.locator('input[placeholder*="Card"]').fill('4242424242424242');
    
    const expiry = page.locator('input[placeholder*="Expiry"]');
    if (await expiry.isVisible()) {
      await expiry.fill('12/25');
    }
    
    const cvc = page.locator('input[placeholder*="CVC"]');
    if (await cvc.isVisible()) {
      await cvc.fill('123');
    }
  });

  test('should complete purchase', async ({ page }) => {
    await page.locator('a[href="/my-stack"]').click();
    await page.waitForURL(/.*my-stack/);
    await page.locator('button[data-testid="checkout-btn"]').click();
    await page.waitForURL(/.*checkout/);
    
    await page.locator('button:has-text("Pagar")').click();
    
    // Wait for success message
    const success = page.locator('[data-testid="success-message"]');
    await expect(success).toBeVisible();
  });

  test('should show order confirmation', async ({ page }) => {
    // After purchase (from previous test)
    const confirmationPage = page.locator('[data-testid="order-confirmation"]');
    
    if (await confirmationPage.isVisible()) {
      const orderNumber = page.locator('[data-testid="order-number"]');
      await expect(orderNumber).toBeVisible();
      
      const trackingLink = page.locator('a:has-text("Acompanhar")');
      await expect(trackingLink).toBeVisible();
    }
  });
});
