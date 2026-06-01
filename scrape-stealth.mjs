import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled'
      ]
    });
    
    const page = await browser.newPage();
    
    // Spoof user agent and headers
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 720 });
    
    console.error('Loading page with stealth...');
    
    await page.goto('https://www.mercadolivre.com.br/search?q=omega%203', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    
    // Wait for content
    await new Promise(r => setTimeout(r, 3000));
    
    const products = await page.evaluate(() => {
      const items = [];
      
      // Get all visible text content to find prices
      const bodyText = document.body.innerText || '';
      const lines = bodyText.split('\n');
      
      for (let i = 0; i < lines.length && items.length < 3; i++) {
        const line = lines[i];
        // Look for lines with prices (R$ format)
        if (line.includes('R$') || line.match(/\d+,\d{2}/)) {
          const nextLines = lines.slice(Math.max(0, i-3), i+3).join(' ');
          const priceMatch = nextLines.match(/R\$\s*([\d.,]+)/);
          const price = priceMatch ? parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.')) : 0;
          
          if (price > 10 && nextLines.length > 20) {
            items.push({
              brand: nextLines.substring(0, 100).trim(),
              price: price,
              url: 'https://www.mercadolivre.com.br',
              available: true
            });
          }
        }
      }
      
      return items.slice(0, 3);
    });
    
    console.log(JSON.stringify(products, null, 2));
    await browser.close();
  } catch (error) {
    console.error('Error:', error.message);
    console.log('[]');
    if (browser) await browser.close();
  }
})();
