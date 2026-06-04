import QRCode from 'qrcode';

export default class QRGenerator {
  /**
   * Renders a premium, themed QR code directly into a canvas element.
   * Uses local theme matching dark/light variables for rich aesthetics.
   * @param {HTMLCanvasElement} canvasEl
   * @param {string} url
   * @returns {Promise<void>}
   */
  async renderQRCode(canvasEl, url) {
    if (!canvasEl || !url) return;
    
    // Read theme colors dynamically from the document styles
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    
    // Harmonious colors tailored for premium glassmorphism
    const darkColor = isDark ? '#10B981' : '#047857'; // Brand emerald colors matching SupliList theme
    const lightColor = isDark ? '#1e1e1e' : '#FFFFFF'; // Dark background matching dark-theme cards
    
    const options = {
      width: 200,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: darkColor,
        light: lightColor
      }
    };

    try {
      await QRCode.toCanvas(canvasEl, url, options);
    } catch (err) {
      console.error('[QRGenerator] QR code rendering failed:', err);
    }
  }
}
