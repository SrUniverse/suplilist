import { chromium } from 'playwright';
import * as fs from 'fs';

async function scrapeShopee() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to Shopee search...');
    await page.goto('https://shopee.com.br/search?keyword=magnesio%20glicinato', {
      waitUntil: 'networkidle'
    });
    
    // Wait for product listings to load
    await page.waitForSelector('[data-testid="product-item"]', { timeout: 10000 }).catch(() => {
      console.log('Product items not found with data-testid');
    });
    
    // Try alternative selectors
    await page.waitForTimeout(3000);
    
    // Get the page HTML and save it for inspection
    const html = await page.content();
    fs.writeFileSync('shopee_page.html', html);
    
    // Try to extract product data with multiple selectors
    const products = await page.evaluate(() => {
      const items = [];
      
      // Try multiple possible selectors
      const productElements = document.querySelectorAll('[data-testid="product-item"], .shopee-search-item-result, .common-product-item, [class*="product"]');
      
      console.log('Found elements:', productElements.length);
      
      productElements.forEach((el, idx) => {
        if (idx < 3) {
          const nameEl = el.querySelector('[data-testid="product-name"], h2, .product-name, [class*="name"]');
          const priceEl = el.querySelector('[data-testid="product-price"], .product-price, [class*="price"]');
          const linkEl = el.querySelector('a');
          
          items.push({
            name: nameEl?.textContent?.trim() || 'N/A',
            price: priceEl?.textContent?.trim() || 'N/A',
            url: linkEl?.href || 'N/A',
            html: el.outerHTML.substring(0, 500)
          });
        }
      });
      
      return items;
    });
    
    console.log('Extracted products:', JSON.stringify(products, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

scrapeShopee();
