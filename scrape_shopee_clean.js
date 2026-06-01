import { chromium } from 'playwright';

async function scrapeShopee() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  const page = await context.newPage();
  
  try {
    console.log('Navigating to Shopee...');
    await page.goto('https://shopee.com.br/search?keyword=magnesio%20glicinato', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    console.log('Waiting for content...');
    await page.waitForTimeout(5000);
    
    // Get all text
    const fullText = await page.locator('body').textContent();
    console.log('Page loaded, length:', fullText.length);
    console.log('Has magnesio:', fullText.toLowerCase().includes('magnes'));
    
    // Try to find product items
    const products = [];
    const productDivs = await page.locator('[class*="ProductItem"]').all();
    console.log('Found product items:', productDivs.length);
    
    for (let i = 0; i < Math.min(3, productDivs.length); i++) {
      const div = productDivs[i];
      const text = await div.textContent();
      const link = await div.locator('a').first().getAttribute('href');
      
      products.push({
        name: text.substring(0, 80),
        link: link
      });
    }
    
    console.log('Extracted:', JSON.stringify(products, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await context.close();
    await browser.close();
  }
}

scrapeShopee();
