import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ShareService from './share-service.js';
import QRGenerator from './qr-generator.js';
import { stateManager } from '../../state/state-manager.js';
import QRCode from 'qrcode';

// Mock QRCode library
vi.mock('qrcode', () => ({
  default: {
    toCanvas: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('Social Sharing Layer', () => {
  let shareService;
  let qrGenerator;
  let originalNavigatorShare;
  let originalClipboardWriteText;

  beforeEach(() => {
    localStorage.clear();
    shareService = new ShareService();
    qrGenerator = new QRGenerator();

    // Mock navigator.share
    originalNavigatorShare = navigator.share;
    navigator.share = vi.fn().mockResolvedValue(undefined);

    // Mock navigator.clipboard
    originalClipboardWriteText = navigator.clipboard?.writeText;
    if (!navigator.clipboard) {
      navigator.clipboard = {};
    }
    navigator.clipboard.writeText = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    navigator.share = originalNavigatorShare;
    if (originalClipboardWriteText) {
      navigator.clipboard.writeText = originalClipboardWriteText;
    } else {
      delete navigator.clipboard;
    }
    vi.restoreAllMocks();
  });

  describe('ShareService', () => {
    const mockStack = [
      { id: '1', name: 'Creatina Monohidratada', dosage: 5, quantity: 100, frequency: '1x ao dia', timeOfDay: 'Manhã', notes: 'Com água' },
      { id: '2', name: 'Whey Protein', dosage: 30, quantity: 900, frequency: '1x ao dia', timeOfDay: 'Pós-treino', notes: '' }
    ];

    it('generates a base64 encoded share URL supporting UTF-8 characters', () => {
      const url = shareService.generateShareUrl(mockStack);
      expect(url).toContain(`${window.location.origin}/my-stack?stack=`);

      const base64 = url.split('stack=')[1];
      const decoded = decodeURIComponent(escape(atob(base64)));
      const parsed = JSON.parse(decoded);

      expect(parsed.length).toBe(2);
      expect(parsed[0].name).toBe('Creatina Monohidratada');
      expect(parsed[1].name).toBe('Whey Protein');
    });

    it('returns empty string if stack is empty or missing', () => {
      expect(shareService.generateShareUrl([])).toBe('');
      expect(shareService.generateShareUrl(null)).toBe('');
    });

    it('formats stack items list into a friendly clean text summary', () => {
      const text = shareService.formatStackText(mockStack);
      expect(text).toContain('Meu Stack de Suplementação no SupliList:');
      expect(text).toContain('• Creatina Monohidratada — Dose: 5');
      expect(text).toContain('• Whey Protein — Dose: 30');
    });

    it('calls native navigator.share if available', async () => {
      const success = await shareService.shareStack(mockStack);
      expect(navigator.share).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Meu Stack | SupliList',
        url: expect.stringContaining('?stack=')
      }));
      expect(success).toBe(true);
    });

    it('falls back to clipboard copy if navigator.share is not supported', async () => {
      delete navigator.share;
      const success = await shareService.shareStack(mockStack);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('?stack='));
      expect(success).toBe(true);
    });

    it('shares check-in streak status via native share', async () => {
      const success = await shareService.shareStreak(7);
      expect(navigator.share).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Minha Constância | SupliList',
        text: expect.stringContaining('streak de 7 dias')
      }));
      expect(success).toBe(true);
    });

    it('generates pre-filled WhatsApp link with text and URL', () => {
      const link = shareService.getWhatsAppLink('Hello', 'http://test.com');
      expect(link).toBe('https://api.whatsapp.com/send?text=Hello%0A%0ALink%20do%20Stack%3A%0Ahttp%3A%2F%2Ftest.com');
    });

    it('generates pre-filled Telegram link', () => {
      const link = shareService.getTelegramLink('Hello', 'http://test.com');
      expect(link).toBe('https://t.me/share/url?url=http%3A%2F%2Ftest.com&text=Hello');
    });
  });

  describe('QRGenerator', () => {
    it('renders QR code directly to canvas using qrcode npm library', async () => {
      const canvasEl = document.createElement('canvas');
      const testUrl = 'http://suplilist.com/my-stack?stack=123';
      
      await qrGenerator.renderQRCode(canvasEl, testUrl);

      expect(QRCode.toCanvas).toHaveBeenCalledWith(
        canvasEl,
        testUrl,
        expect.objectContaining({
          width: 200,
          errorCorrectionLevel: 'H'
        })
      );
    });
  });

  describe('StateManager IMPORT_STACK Action', () => {
    it('reducer replaces the active stack with action payload and normalizes IDs', () => {
      stateManager.dispatch('CLEAR_STACK');
      
      const payload = [
        { id: 'supA', name: 'Creatina', quantity: 100, dosage: 5 },
        { supplementId: 'supB', name: 'Whey', quantity: 900, dosage: 30 }
      ];

      stateManager.dispatch('IMPORT_STACK', payload);

      const currentStack = stateManager.get('stack');
      expect(currentStack.length).toBe(2);
      expect(currentStack[0].supplementId).toBe('supA');
      expect(currentStack[0].id).toBe('supA');
      expect(currentStack[1].supplementId).toBe('supB');
      expect(currentStack[1].id).toBe('supB');
    });
  });
});
