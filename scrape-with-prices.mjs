import { chromium } from '@playwright/test';

async function scrapeWithPrices() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto('https://www.amazon.com.br/s?k=omega%203', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for products to load
    await page.waitForSelector('div[data-component-type="s-search-result"]', {
      timeout: 10000
    });

    // Get product data with better price extraction
    const products = await page.evaluate(() => {
      const items = [];
      const containers = document.querySelectorAll('div[data-component-type="s-search-result"]');
      
      for (let i = 0; i < Math.min(3, containers.length); i++) {
        const container = containers[i];
        
        // Get title from h2
        const titleEl = container.querySelector('h2');
        const title = titleEl ? titleEl.innerText.trim() : '';
        
        // Get price - try multiple selectors
        let price = 'N/A';
        
        // Try all price-related elements
        const priceSelectors = [
          '.a-price-whole',
          '[data-a-price-whole]',
          '.a-price-symbol ~ .a-price-whole',
          'span[data-a-color="price"]'
        ];
        
        for (const selector of priceSelectors) {
          const el = container.querySelector(selector);
          if (el && el.innerText.trim().length > 0) {
            price = el.innerText.trim();
            break;
          }
        }
        
        // If still not found, search for R$ pattern in text
        if (price === 'N/A') {
          const text = container.innerText;
          const match = text.match(/R\$[\s]*[\d.,]+/);
          if (match) {
            price = match[0];
          }
        }
        
        // Get URL
        const linkEl = container.querySelector('a[href*="/dp/"]');
        const url = linkEl ? linkEl.href : null;
        
        // Get availability
        const unavailable = container.innerText.includes('Fora de estoque');
        
        // Extract brand from title - usually first 1-3 words
        const titleWords = title.split(' ').filter(w => w.length > 0);
        let brand = titleWords[0] || 'Unknown';
        if (titleWords.length > 1 && titleWords[1].length < 15) {
          brand = titleWords.slice(0, 2).join(' ');
        }
        
        if (title.length > 0) {
          items.push({
            brand: brand,
            price: price,
            url: url,
            available: !unavailable
          });
        }
      }
      
      return items;
    });

    return products;
  } catch (error) {
    console.error('Error:', error.message);
    return [];
  } finally {
    await browser.close();
  }
}

const result = await scrapeWithPrices();
console.log(JSON.stringify(result, null, 2));
