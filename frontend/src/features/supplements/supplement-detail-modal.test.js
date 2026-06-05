import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SupplementDetailModal } from './supplement-detail-modal.js';

describe('Supplement Detail Modal', () => {
  let mockPurchases;
  let now;

  beforeEach(() => {
    now = Date.now();
    mockPurchases = [
      {
        supplementId: 'creatine',
        quantity: 300,
        dailyConsumption: 5,
        purchasedAt: now - (90 * 24 * 60 * 60 * 1000), // 90 days ago
        price: 42.00,
        source: 'Nutrilibrium',
        status: 'active',
      },
      {
        supplementId: 'creatine',
        quantity: 300,
        dailyConsumption: 5,
        purchasedAt: now - (45 * 24 * 60 * 60 * 1000), // 45 days ago
        price: 45.90,
        source: 'Amazon',
        status: 'active',
      },
      {
        supplementId: 'creatine',
        quantity: 300,
        dailyConsumption: 5,
        purchasedAt: now - (5 * 24 * 60 * 60 * 1000), // 5 days ago
        price: 44.50,
        source: 'Amazon',
        status: 'active',
      },
    ];
  });

  afterEach(() => {
    SupplementDetailModal.dismiss();
  });

  describe('show', () => {
    it('should create modal element with correct structure', () => {
      SupplementDetailModal.show('creatine', { name: 'Creatina' }, mockPurchases);

      const modal = document.getElementById('supplement-detail-modal');
      expect(modal).toBeDefined();
      expect(modal.getAttribute('role')).toBe('dialog');
    });

    it('should prevent multiple modals', () => {
      SupplementDetailModal.show('creatine', { name: 'Creatina' }, mockPurchases);
      const firstModal = document.getElementById('supplement-detail-modal');

      SupplementDetailModal.show('whey', { name: 'Whey' }, mockPurchases);
      const secondModal = document.getElementById('supplement-detail-modal');

      expect(firstModal).not.toBe(secondModal);
    });

    it('should display supplement name', () => {
      SupplementDetailModal.show('creatine', { name: 'Creatina Monoidrato' }, mockPurchases);

      const modal = document.getElementById('supplement-detail-modal');
      const heading = modal.querySelector('h2');
      expect(heading.textContent).toContain('Creatina Monoidrato');
    });

    it('should display spending stats', () => {
      SupplementDetailModal.show('creatine', { name: 'Creatina' }, mockPurchases);

      const modal = document.getElementById('supplement-detail-modal');
      // Total should be 42.00 + 45.90 + 44.50 = 132.40
      expect(modal.textContent).toContain('132.40');
      expect(modal.textContent).toContain('3 compras');
    });

    it('should display purchase history', () => {
      SupplementDetailModal.show('creatine', { name: 'Creatina' }, mockPurchases);

      const modal = document.getElementById('supplement-detail-modal');
      const purchases = modal.querySelectorAll('[style*="grid"]');
      expect(purchases.length).toBeGreaterThan(0);
    });

    it('should handle empty purchases', () => {
      SupplementDetailModal.show('unknown', { name: 'Desconhecido' }, mockPurchases);

      const modal = document.getElementById('supplement-detail-modal');
      expect(modal).toBeDefined();
      expect(modal.textContent).toContain('Nenhuma compra registrada');
    });

    it('should highlight best price source', () => {
      SupplementDetailModal.show('creatine', { name: 'Creatina' }, mockPurchases);

      const modal = document.getElementById('supplement-detail-modal');
      // Nutrilibrium has the best price (42.00)
      expect(modal.textContent).toContain('Nutrilibrium');
      expect(modal.textContent).toContain('42.00');
    });
  });

  describe('dismiss', () => {
    it('should remove modal from DOM', () => {
      SupplementDetailModal.show('creatine', { name: 'Creatina' }, mockPurchases);
      expect(document.getElementById('supplement-detail-modal')).toBeDefined();

      SupplementDetailModal.dismiss();
      expect(document.getElementById('supplement-detail-modal')).toBeNull();
    });

    it('should remove event listeners', () => {
      SupplementDetailModal.show('creatine', { name: 'Creatina' }, mockPurchases);
      SupplementDetailModal.dismiss();

      // Simulate ESC key
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);

      // Modal should stay dismissed (no error)
      expect(document.getElementById('supplement-detail-modal')).toBeNull();
    });
  });

  describe('User Interactions', () => {
    it('should close on close button click', () => {
      SupplementDetailModal.show('creatine', { name: 'Creatina' }, mockPurchases);

      const closeBtn = document.getElementById('supplement-detail-close');
      expect(closeBtn).toBeDefined();

      closeBtn.click();
      expect(document.getElementById('supplement-detail-modal')).toBeNull();
    });

    it('should close on ESC key', () => {
      SupplementDetailModal.show('creatine', { name: 'Creatina' }, mockPurchases);

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);

      expect(document.getElementById('supplement-detail-modal')).toBeNull();
    });

    it('should close on backdrop click', () => {
      SupplementDetailModal.show('creatine', { name: 'Creatina' }, mockPurchases);

      const backdrop = document.getElementById('supplement-detail-backdrop');
      expect(backdrop).toBeDefined();

      backdrop.click();
      expect(document.getElementById('supplement-detail-modal')).toBeNull();
    });

    it('should not close on modal content click', () => {
      SupplementDetailModal.show('creatine', { name: 'Creatina' }, mockPurchases);

      const modal = document.getElementById('supplement-detail-modal');
      const content = modal.querySelector('[style*="padding:24px"]');

      content.click();
      expect(document.getElementById('supplement-detail-modal')).toBeDefined();
    });
  });

  describe('Data Display', () => {
    it('should calculate days of use', () => {
      SupplementDetailModal.show('creatine', { name: 'Creatina' }, mockPurchases);

      const modal = document.getElementById('supplement-detail-modal');
      // Should show 90 days (first purchase was 90 days ago)
      expect(modal.textContent).toContain('90 dias');
    });

    it('should sort purchases by date (newest first)', () => {
      SupplementDetailModal.show('creatine', { name: 'Creatina' }, mockPurchases);

      const modal = document.getElementById('supplement-detail-modal');
      const historyText = modal.textContent;

      // Newest purchase (5 days ago) should be listed first
      const newestIndex = historyText.indexOf('#3');
      const oldestIndex = historyText.indexOf('#1');

      expect(newestIndex).toBeLessThan(oldestIndex);
    });
  });
});
