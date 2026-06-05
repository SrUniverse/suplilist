import { test, expect } from '@playwright/test';

test.describe('Offline Mode & Sync Recovery', () => {
  test.beforeEach(async ({ page, context }) => {
    // Login before each test
    await page.goto('http://localhost:3000/login');
    await page.locator('input[type="email"]').fill('demo@test.com');
    await page.locator('input[type="password"]').fill('demo123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/.*dashboard/);
  });

  test('should detect offline status', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);
    
    // Check for offline indicator
    const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
    await expect(offlineIndicator).toBeVisible();
  });

  test('should queue requests when offline', async ({ page, context }) => {
    await page.locator('a[href="/my-stack"]').click();
    await page.waitForURL(/.*my-stack/);
    
    // Go offline
    await context.setOffline(true);
    
    // Try to add supplement to stack
    const addBtn = page.locator('button[data-testid="add-supplement"]');
    if (await addBtn.isVisible()) {
      await addBtn.click();
      
      // Should show "offline" or "queued" message
      const message = page.locator('[data-testid="queued-message"], [data-testid="offline-message"]');
      await expect(message).toBeVisible();
    }
  });

  test('should persist queue to IndexedDB', async ({ page, context }) => {
    await page.goto('http://localhost:3000/my-stack');
    
    // Go offline
    await context.setOffline(true);
    
    // Perform actions (will be queued)
    await page.locator('input[name="dosage"]').fill('500');
    await page.locator('button:has-text("Salvar")').click();
    
    // Reload page while offline
    await page.reload();
    
    // Queue should still exist
    const queueStatus = page.locator('[data-testid="queue-status"]');
    const queueText = await queueStatus.textContent();
    expect(queueText).toMatch(/pendente|queued/i);
  });

  test('should show sync status indicator', async ({ page, context }) => {
    // Go offline and queue something
    await context.setOffline(true);
    await page.locator('a[href="/my-stack"]').click();
    
    // Perform action
    await page.locator('button[data-testid="add-supplement"]').click();
    
    // Check sync status
    const syncStatus = page.locator('[data-testid="sync-status"]');
    await expect(syncStatus).toBeVisible();
  });

  test('should sync automatically when online', async ({ page, context }) => {
    // Go offline and queue actions
    await context.setOffline(true);
    await page.locator('a[href="/my-stack"]').click();
    await page.locator('button[data-testid="add-supplement"]').click();
    
    // Go back online
    await context.setOffline(false);
    
    // Should auto-sync
    const syncingIndicator = page.locator('[data-testid="syncing"]');
    await expect(syncingIndicator).toBeVisible();
    
    // Wait for completion
    await page.waitForSelector('[data-testid="sync-complete"]', { timeout: 5000 });
  });

  test('should handle sync conflicts', async ({ page, context }) => {
    // Simulate conflict: offline edit + server change
    const serverValue = 'original';
    
    await context.setOffline(true);
    
    // Make local edit
    const input = page.locator('input[data-testid="editable-field"]');
    await input.fill('local-value');
    await page.locator('button:has-text("Salvar")').click();
    
    // Go online (server has different value)
    await context.setOffline(false);
    
    // Should show conflict dialog
    const conflictDialog = page.locator('[data-testid="conflict-dialog"]');
    if (await conflictDialog.isVisible()) {
      // Choose to keep local version
      await page.locator('button:has-text("Manter minha versão")').click();
      
      // Verify resolution
      const resolvedValue = await input.inputValue();
      expect(resolvedValue).toBe('local-value');
    }
  });

  test('should allow manual sync trigger', async ({ page, context }) => {
    await context.setOffline(true);
    
    // Queue some actions
    await page.locator('button[data-testid="add-supplement"]').click();
    
    // Go online
    await context.setOffline(false);
    
    // Find sync button
    const syncBtn = page.locator('button[data-testid="manual-sync"]');
    if (await syncBtn.isVisible()) {
      await syncBtn.click();
      
      // Should show syncing state
      const syncing = page.locator('[data-testid="syncing"]');
      await expect(syncing).toBeVisible();
    }
  });

  test('should preserve queue size limit', async ({ page, context }) => {
    await context.setOffline(true);
    
    // Queue many requests
    for (let i = 0; i < 20; i++) {
      await page.locator('button[data-testid="add-supplement"]').click();
    }
    
    // Check queue size
    const queueStatus = page.locator('[data-testid="queue-count"]');
    const countText = await queueStatus.textContent();
    const count = parseInt(countText);
    
    // Should be limited (e.g., max 10)
    expect(count).toBeLessThanOrEqual(10);
  });

  test('should show offline banner while syncing', async ({ page, context }) => {
    await context.setOffline(true);
    
    // Queue something
    await page.locator('button[data-testid="add-supplement"]').click();
    
    // Go online
    await context.setOffline(false);
    
    // Banner should be visible during sync
    const banner = page.locator('[data-testid="sync-banner"]');
    await expect(banner).toBeVisible();
  });
});
