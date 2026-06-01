import { chromium } from '@playwright/test';

async function scrapeWithPlaywright() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Set language
  await page.context().addInitScript(() => {
    Object.defineProperty(navigator, 'language', {
      get: function() { return 'pt-BR'; }
    });
  });

  try {
    await page.goto('https://www.amazon.com.br/s?k=omega%203', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for products to load
    await page.waitForSelector('div[data-component-type="s-search-result"]', {
      timeout: 10000
    });

    // Get product data
    const products = await page.evaluate(() => {
      const items = [];
      const containers = document.querySelectorAll('div[data-component-type="s-search-result"]');
      
      for (let i = 0; i < Math.min(3, containers.length); i++) {
        const container = containers[i];
        
        // Get title
        const titleEl = container.querySelector('h2');
        const title = titleEl ? titleEl.innerText : '';
        
        // Get price
        const priceEl = container.querySelector('[data-a-price]');
        const price = priceEl ? priceEl.innerText : 'N/A';
        
        // Get URL
        const linkEl = container.querySelector('a[href*="/dp/"]');
        const url = linkEl ? linkEl.href : null;
        
        // Get availability
        const unavailable = container.innerText.includes('Fora de estoque');
        
        // Extract brand
        const titleWords = title.split(' ');
        let brand = titleWords[0];
        if (titleWords.length > 1 && titleWords[1].length < 15) {
          brand = titleWords.slice(0, 2).join(' ');
        }
        
        if (title.length > 0) {
          items.push({
            brand: brand || 'Unknown',
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

const result = await scrapeWithPlaywright();
console.log(JSON.stringify(result, null, 2));
