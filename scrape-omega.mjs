import puppeteer from 'puppeteer';

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
      
      // Find all product container elements
      const containers = document.querySelectorAll('li[class*="poly-component"], li[data-item-id], article[data-item-id], div[data-testid*="item-card"]');
      
      if (containers.length === 0) {
        // Fallback: look for any li elements with links
        const fallback = document.querySelectorAll('li > a');
        for (let i = 0; i < Math.min(fallback.length, 3); i++) {
          const link = fallback[i];
          const parent = link.closest('li');
          if (parent) containers.push(parent);
        }
      }
      
      for (let i = 0; i < Math.min(containers.length, 3); i++) {
        const el = containers[i];
        
        // Extract title
        let title = '';
        const titleSelectors = ['h2', 'a[title]', '.poly-component__title', 'span[class*="title"]'];
        for (const sel of titleSelectors) {
          const el_title = el.querySelector(sel);
          if (el_title) {
            title = el_title.textContent.trim().substring(0, 150);
            if (el_title.getAttribute('title')) {
              title = el_title.getAttribute('title');
            }
            break;
          }
        }
        
        // Extract price
        let price = 0;
        const priceSelectors = ['.poly-component__price', '[class*="price"]', 'span[class*="amount"]'];
        for (const sel of priceSelectors) {
          const priceEl = el.querySelector(sel);
          if (priceEl) {
            const text = priceEl.textContent.trim();
            const match = text.match(/R\$?\s*([\d.,]+)/);
            if (match) {
              price = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
              break;
            }
          }
        }
        
        // Extract URL
        let url = '';
        const linkEl = el.querySelector('a[href*="item"]') || el.querySelector('a[href]');
        if (linkEl) {
          url = linkEl.getAttribute('href');
        }
        
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
    
    if (products.length === 0) {
      console.error('No products extracted, checking page content...');
      const pageText = await page.content();
      if (pageText.includes('forbid') || pageText.includes('403')) {
        console.error('Page appears blocked (403)');
      }
    }
    
    console.log(JSON.stringify(products, null, 2));
    await browser.close();
  } catch (error) {
    console.error('Error:', error.message);
    console.log('[]');
    if (browser) await browser.close();
  }
})();
