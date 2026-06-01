import { chromium } from 'playwright';

async function inspectShopee() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    const url = 'https://shopee.com.br/search?keyword=creatina%20monohidratada';
    
    console.log('Navigating to Shopee...');
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    
    // Wait a bit for dynamic content
    await page.waitForTimeout(3000);
    
    // Get page structure info
    const pageInfo = await page.evaluate(() => {
      const selectors = [
        '[data-testid]',
        '[class*="product"]',
        '[class*="item"]',
        '[class*="card"]',
        'a[href*="/p/"]'
      ];
      
      const results = {};
      for (const sel of selectors) {
        const els = document.querySelectorAll(sel);
        if (els.length > 0) {
          results[sel] = els.length;
        }
      }
      return results;
    });
    
    console.log('Available selectors:', pageInfo);
    
    // Try to find product links directly
    const links = await page.locator('a[href*="/p/"]').all();
    console.log(`Found ${links.length} product links`);
    
    const products = [];
    for (let i = 0; i < Math.min(3, links.length); i++) {
      const link = links[i];
      const href = await link.getAttribute('href');
      const text = await link.textContent();
      products.push({ url: href, text: text?.substring(0, 100) });
    }
    
    console.log('\nProducts found:', JSON.stringify(products, null, 2));
    
    // Don't close browser yet - keep it open for inspection
    console.log('\nBrowser window open for inspection. Close manually to continue.');
    await page.waitForTimeout(5000);
    
    await browser.close();
    
  } catch (error) {
    console.error('Error:', error.message);
    await browser.close();
  }
}

inspectShopee();
