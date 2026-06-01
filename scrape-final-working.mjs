import { chromium } from '@playwright/test';

async function scrapeFinal() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto('https://www.amazon.com.br/s?k=omega%203', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Wait for products to appear
    await page.waitForSelector('div[data-component-type="s-search-result"]', {
      timeout: 15000
    });

    // Small delay for rendering
    await page.waitForTimeout(2000);

    // Get product data
    const products = await page.evaluate(() => {
      const items = [];
      const containers = document.querySelectorAll('div[data-component-type="s-search-result"]');
      
      for (let i = 0; i < Math.min(3, containers.length); i++) {
        const container = containers[i];
        const text = container.innerText;
        
        // Skip if product isn't available or is irrelevant
        if (text.length < 50) continue;
        
        // Get title from h2
        const h2 = container.querySelector('h2');
        const title = h2 ? h2.innerText.trim() : '';
        
        if (!title.includes('mega') && !title.includes('mega')) continue;
        
        // Get price
        let price = 'N/A';
        const priceMatch = text.match(/R\$[\s]*[\d.,]+/);
        if (priceMatch) {
          price = priceMatch[0].replace(/\s+/g, '');
        }
        
        // Get URL
        const link = container.querySelector('a[href*="/dp/"]');
        const url = link ? link.href : null;
        
        // Check availability
        const available = !text.includes('Fora de estoque');
        
        // Extract brand
        const titleWords = title.split(' ').filter(w => w.length > 0);
        let brand = titleWords[0] || 'Unknown';
        
        if (title.length > 10) {
          items.push({
            brand: brand,
            price: price,
            url: url,
            available: available
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

const result = await scrapeFinal();
console.log(JSON.stringify(result, null, 2));
