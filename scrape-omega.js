const puppeteer = require('puppeteer');

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1280, height: 720 });
    console.error('Navigating to page...');
    
    await page.goto('https://www.mercadolivre.com.br/search?q=omega%203', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    console.error('Page loaded, extracting data...');
    
    const products = await page.evaluate(() => {
      const items = [];
      
      // Find all product items
      const productElements = document.querySelectorAll('li[class*="item"], div[data-testid*="item"], article');
      
      for (let i = 0; i < Math.min(productElements.length, 3); i++) {
        const el = productElements[i];
        
        // Get title/brand
        const titleEl = el.querySelector('h2, h3, span[class*="title"], a.poly-component__title');
        const title = titleEl ? titleEl.textContent.trim().substring(0, 100) : '';
        
        // Get price
        const priceEl = el.querySelector('[class*="price"], .poly-component__price, span[class*="currency"]');
        let price = 0;
        if (priceEl) {
          const priceText = priceEl.textContent.trim();
          const match = priceText.match(/(\d+[.,]\d+)/);
          if (match) {
            price = parseFloat(match[0].replace('.', '').replace(',', '.'));
          }
        }
        
        // Get URL
        const linkEl = el.querySelector('a[href]');
        const url = linkEl ? linkEl.getAttribute('href') : '';
        
        if (title && price > 0) {
          items.push({
            brand: title,
            price: price,
            url: url,
            available: true
          });
        }
      }
      
      return items;
    });
    
    console.log(JSON.stringify(products, null, 2));
    await browser.close();
  } catch (error) {
    console.error('Error:', error.message);
    console.log('[]');
    if (browser) await browser.close();
  }
})();
