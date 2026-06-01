import { chromium } from 'playwright';

async function scrapeShopee() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    const url = 'https://shopee.com.br/search?keyword=creatina%20monohidratada';
    
    console.log('Navigating to Shopee...');
    await page.goto(url, { waitUntil: 'networkidle' });
    
    // Wait for product listings to load
    await page.waitForSelector('[data-sqe="product"]', { timeout: 10000 }).catch(() => {
      console.log('Product selector not found, trying alternative...');
    });
    
    // Extract top 3 products
    const products = await page.evaluate(() => {
      const items = [];
      const productElements = document.querySelectorAll('[data-sqe="product"]');
      
      for (let i = 0; i < Math.min(3, productElements.length); i++) {
        const el = productElements[i];
        
        const nameEl = el.querySelector('[data-sqe="name"]');
        const priceEl = el.querySelector('[data-sqe="price"]');
        const linkEl = el.querySelector('a[href*="/p/"]');
        
        items.push({
          name: nameEl?.textContent?.trim() || 'N/A',
          price: priceEl?.textContent?.trim() || 'N/A',
          url: linkEl?.href || 'N/A',
          available: !el.querySelector('[data-sqe="soldout"]')
        });
      }
      
      return items;
    });
    
    console.log('\n=== Top 3 Products ===\n');
    console.log(JSON.stringify(products, null, 2));
    
    await browser.close();
    
  } catch (error) {
    console.error('Error:', error.message);
    await browser.close();
    process.exit(1);
  }
}

scrapeShopee();
