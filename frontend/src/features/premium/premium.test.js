import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { stateManager, ACTIONS } from '../../state/state-manager.js';
import { eventBus } from '../../core/event-bus.js';
import { CheckoutModal } from './checkout-modal.js';
import ListPage from '../supplements/list-page.js';
import HistoryPage from '../history/history-page.js';
import SettingsPage from '../settings/settings-page.js';
import ExcelJS from 'exceljs';

// Mock VirtualScroller to safely test ListPage rendering under JSDOM
vi.mock('../../core/virtual-scroller.js', () => ({
  VirtualScroller: class {
    constructor(container, items, renderFn) {
      this.container = container;
      this.items = items;
      this.renderFn = renderFn;
    }
    mount() {
      this.container.innerHTML = this.items.map(item => this.renderFn(item)).join('');
    }
    unmount() {}
  }
}));

// Mock ExcelJS to isolate tests from heavy zip/binary operations
vi.mock('exceljs', () => {
  const mockWorksheet = {
    columns: [],
    addRow: vi.fn(),
    getRow: vi.fn(() => ({
      eachCell: vi.fn(cb => {
        cb({ fill: {}, font: {}, alignment: {} });
      })
    })),
    eachRow: vi.fn(cb => {
      cb({ eachCell: vi.fn() }, 2);
    })
  };
  const mockWorkbook = {
    creator: '',
    created: null,
    addWorksheet: vi.fn(() => mockWorksheet),
    xlsx: {
      writeBuffer: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]))
    }
  };
  return {
    default: {
      Workbook: function() {
        return mockWorkbook;
      }
    }
  };
});

describe('Premium Features & Checkout Suite', () => {
  let container;

  beforeEach(() => {
    localStorage.clear();
    stateManager.reset();
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.spyOn(eventBus, 'emit');
  });

  afterEach(() => {
    container.remove();
    CheckoutModal.dismiss();
    vi.restoreAllMocks();
  });

  describe('1. State Transition', () => {
    it('handles ACTIONS.SET_TIER correctly in state manager reducer', () => {
      expect(stateManager.state.user.tier).toBe('free');

      stateManager.dispatch(ACTIONS.SET_TIER, { tier: 'pro' });
      expect(stateManager.state.user.tier).toBe('pro');

      stateManager.dispatch(ACTIONS.SET_TIER, { tier: 'elite' });
      expect(stateManager.state.user.tier).toBe('elite');
    });
  });

  describe('2. CheckoutModal Overlay Simulation', () => {
    it('creates overlay, accepts billing details, and upgrades user tier to pro', async () => {
      CheckoutModal.show({ tier: 'pro' });

      const overlay = document.getElementById('premium-checkout-overlay');
      expect(overlay).not.toBeNull();

      // Verify tier cards exist and initial selections are active
      const proCard = overlay.querySelector('.checkout-tier-card[data-tier="pro"]');
      const eliteCard = overlay.querySelector('.checkout-tier-card[data-tier="elite"]');
      expect(proCard.classList.contains('active')).toBe(true);
      expect(eliteCard.classList.contains('active')).toBe(false);

      // Simulate switching to Elite
      eliteCard.click();
      expect(proCard.classList.contains('active')).toBe(false);
      expect(eliteCard.classList.contains('active')).toBe(true);

      // Click the demo activate button
      const submitBtn = overlay.querySelector('#checkout-submit-btn');
      submitBtn.click();

      // Wait for simulated processing timer (1000ms) plus buffer
      await new Promise(r => setTimeout(r, 1200));

      // Assert user upgraded to elite
      expect(stateManager.state.user.tier).toBe('elite');

      // Assert toast emitted
      expect(eventBus.emit).toHaveBeenCalledWith('toast:show', expect.objectContaining({
        message: expect.stringContaining('Elite foi ativada!'),
        type: 'success'
      }));

      // Verify modal dismissed
      expect(document.getElementById('premium-checkout-overlay')).toBeNull();
    });

    it('can dismiss modal safely using the close button', () => {
      CheckoutModal.show();
      expect(document.getElementById('premium-checkout-overlay')).not.toBeNull();

      document.getElementById('premium-checkout-close').click();
      expect(document.getElementById('premium-checkout-overlay')).toBeNull();
    });
  });

  describe('3. Supplement Catalog (ListPage) Ad-Free experience', () => {
    it('injects sponsored advertisement card for free users', () => {
      stateManager.dispatch(ACTIONS.SET_TIER, { tier: 'free' });

      const page = new ListPage(container);
      page.mount();

      // Verify that results list has the sponsored item at index 3
      const items = page._filtered;
      expect(items.length).toBeGreaterThan(3);
      expect(items[3].id).toBe('sponsored-ad');
      expect(items[3].isAd).toBe(true);

      // Verify that sponsored-ad is rendered in DOM
      const card = container.querySelector('.sponsored-ad-card');
      expect(card).not.toBeNull();
      expect(card.textContent).toContain('Ativar PRO');

      page.unmount();
    });

    it('removes sponsored ad card for premium users', () => {
      stateManager.dispatch(ACTIONS.SET_TIER, { tier: 'pro' });

      const page = new ListPage(container);
      page.mount();

      // Verify that results list has NO sponsored item
      const items = page._filtered;
      const adItem = items.find(i => i.isAd);
      expect(adItem).toBeUndefined();

      // Verify DOM has no ad card
      const card = container.querySelector('.sponsored-ad-card');
      expect(card).toBeNull();

      page.unmount();
    });
  });

  describe('4. Consistency Dashboard (HistoryPage)', () => {
    it('displays lock card overlay and prevents metrics access for free tier', () => {
      stateManager.dispatch(ACTIONS.SET_TIER, { tier: 'free' });

      const page = new HistoryPage(container);
      page.mount();

      // Assert lock card is rendered
      const lockCard = container.querySelector('.hp-premium-lock-card');
      expect(lockCard).not.toBeNull();
      expect(lockCard.textContent).toContain('Desbloqueie o Painel Analítico Premium');

      // Assert advanced dashboard is NOT rendered
      const dashboard = container.querySelector('.hp-advanced-dashboard');
      expect(dashboard).toBeNull();

      page.unmount();
    });

    it('renders advanced heatmap, SVG lines, sync indicators, and Excel export for premium tier', () => {
      stateManager.dispatch(ACTIONS.SET_TIER, { tier: 'pro' });

      const page = new HistoryPage(container);
      page.mount();

      // Assert lock card is NOT rendered
      const lockCard = container.querySelector('.hp-premium-lock-card');
      expect(lockCard).toBeNull();

      // Assert advanced dashboard IS rendered
      const dashboard = container.querySelector('.hp-advanced-dashboard');
      expect(dashboard).not.toBeNull();

      // Assert weekly trend sparkline SVG is rendered
      const svg = dashboard.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg.innerHTML).toContain('Semana 4');

      // Assert heatmap cells exist
      const cells = dashboard.querySelectorAll('.hp-heatmap-cell');
      expect(cells.length).toBe(30);

      // Assert excel export button exists
      const excelBtn = dashboard.querySelector('#hp-export-excel-btn');
      expect(excelBtn).not.toBeNull();

      page.unmount();
    });

    it('triggers Excel spreadsheet downloads on export button click', async () => {
      stateManager.dispatch(ACTIONS.SET_TIER, { tier: 'pro' });

      const page = new HistoryPage(container);
      page.mount();

      const excelBtn = container.querySelector('#hp-export-excel-btn');
      expect(excelBtn).not.toBeNull();

      // Mock anchor element download triggers
      const clickSpy = vi.fn();
      const originalCreate = document.createElement;
      document.createElement = vi.fn().mockImplementation(function(tag) {
        if (tag === 'a') {
          const realAnchor = originalCreate.call(document, 'a');
          realAnchor.click = clickSpy;
          return realAnchor;
        }
        return originalCreate.call(document, tag);
      });

      excelBtn.click();

      // Wait for async exceljs buffer operations
      await new Promise(r => setTimeout(r, 100));

      expect(clickSpy).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalledWith('toast:show', expect.objectContaining({
        message: expect.stringContaining('Excel gerado com sucesso!'),
        type: 'success'
      }));

      document.createElement = originalCreate;
      page.unmount();
    });
  });

  describe('5. Settings Page Subscription Controls', () => {
    it('renders Plano Gratuito card and lets free users click upgrade', () => {
      stateManager.dispatch(ACTIONS.SET_TIER, { tier: 'free' });

      const page = new SettingsPage(container);
      page.mount();

      const upgradeBtn = container.querySelector('#sp-upgrade-btn');
      expect(upgradeBtn).not.toBeNull();
      expect(container.innerHTML).toContain('Plano Atual: Gratuito');

      upgradeBtn.click();
      expect(document.getElementById('premium-checkout-overlay')).not.toBeNull();

      page.unmount();
    });

    it('renders active plan info card for premium users and supports cancellations', () => {
      stateManager.dispatch(ACTIONS.SET_TIER, { tier: 'pro' });

      const page = new SettingsPage(container);
      page.mount();

      expect(container.innerHTML).toContain('Plano Ativo: SupliList PRO');
      const cancelBtn = container.querySelector('#sp-cancel-plan-btn');
      expect(cancelBtn).not.toBeNull();

      // Mock window.confirm
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      vi.spyOn(window, 'alert').mockImplementation(() => {});

      cancelBtn.click();

      expect(stateManager.state.user.tier).toBe('free');

      page.unmount();
    });
  });

  describe('6. Tier hydration on app boot', () => {
    // Simulates the boot logic from src/core/app.js:
    //   const savedTier = StorageManager.getItem('suplilist:tier');
    //   if (savedTier && VALID_TIERS.includes(savedTier)) {
    //     stateManager.dispatch(ACTIONS.SET_TIER, { tier: savedTier });
    //   }
    function simulateBoot() {
      const VALID_TIERS = ['free', 'pro', 'elite'];
      const savedTier = localStorage.getItem('suplilist:tier');
      if (savedTier && VALID_TIERS.includes(savedTier)) {
        stateManager.dispatch(ACTIONS.SET_TIER, { tier: savedTier });
      }
    }

    it('hydrates tier "pro" when localStorage has suplilist:tier = "pro"', () => {
      // Arrange
      localStorage.setItem('suplilist:tier', 'pro');
      stateManager.reset();

      // Act
      simulateBoot();

      // Assert
      expect(stateManager.state.user.tier).toBe('pro');
    });

    it('hydrates tier "elite" when localStorage has suplilist:tier = "elite"', () => {
      // Arrange
      localStorage.setItem('suplilist:tier', 'elite');
      stateManager.reset();

      // Act
      simulateBoot();

      // Assert
      expect(stateManager.state.user.tier).toBe('elite');
    });

    it('keeps tier "free" when localStorage has no suplilist:tier key', () => {
      // Arrange — localStorage already cleared in beforeEach
      stateManager.reset();

      // Act
      simulateBoot();

      // Assert
      expect(stateManager.state.user.tier).toBe('free');
    });

    it('keeps tier "free" when localStorage has invalid value "god"', () => {
      // Arrange
      localStorage.setItem('suplilist:tier', 'god');
      stateManager.reset();

      // Act
      simulateBoot();

      // Assert
      expect(stateManager.state.user.tier).toBe('free');
    });

    it('keeps tier "free" when localStorage has empty string value', () => {
      // Arrange
      localStorage.setItem('suplilist:tier', '');
      stateManager.reset();

      // Act
      simulateBoot();

      // Assert
      expect(stateManager.state.user.tier).toBe('free');
    });
  });

  describe('7. CheckoutModal demo flow', () => {
    it('modal does NOT render credit card input fields', () => {
      // Arrange + Act
      CheckoutModal.show({ tier: 'pro' });
      const overlay = document.getElementById('premium-checkout-overlay');

      // Assert — no card number input
      expect(overlay.querySelector('input[autocomplete="cc-number"]')).toBeNull();
      expect(overlay.querySelector('#checkout-card-number')).toBeNull();
    });

    it('modal shows demo notice text', () => {
      // Arrange + Act
      CheckoutModal.show({ tier: 'pro' });
      const overlay = document.getElementById('premium-checkout-overlay');

      // Assert
      const notice = overlay.querySelector('.demo-notice');
      expect(notice).not.toBeNull();
      expect(notice.textContent.length).toBeGreaterThan(0);
    });

    it('clicking activate button dispatches SET_TIER after delay', async () => {
      // Arrange
      CheckoutModal.show({ tier: 'pro' });
      const overlay = document.getElementById('premium-checkout-overlay');
      const submitBtn = overlay.querySelector('#checkout-submit-btn');

      // Act
      submitBtn.click();
      await new Promise(r => setTimeout(r, 1200));

      // Assert
      expect(stateManager.state.user.tier).toBe('pro');
    });

    it('clicking cancel/close does NOT dispatch SET_TIER', () => {
      // Arrange
      stateManager.reset();
      CheckoutModal.show({ tier: 'pro' });
      const overlay = document.getElementById('premium-checkout-overlay');
      const closeBtn = overlay.querySelector('#premium-checkout-close');

      // Act
      closeBtn.click();

      // Assert — tier stays free
      expect(stateManager.state.user.tier).toBe('free');
    });
  });
});
