import { chromium } from 'playwright';
import * as fs from 'fs';

async function scrapeShopee() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Set user agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  
  try {
    console.log('Navigating to Shopee search...');
    await page.goto('https://shopee.com.br/search?keyword=magnesio%20glicinato', {
      waitUntil: 'domcontentloaded'
    });
    
    // Wait longer for content to load
    console.log('Waiting for products to render...');
    await page.waitForTimeout(5000);
    
    // Try scrolling to trigger lazy loading
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
    
    await page.waitForTimeout(2000);
    
    // Extract product data using a more flexible approach
    const products = await page.evaluate(() => {
      const results = [];
      
      // Get all visible links that might be products
      const allElements = document.querySelectorAll('a, div[class*="item"], li[class*="product"]');
      
      const seen = new Set();
      
      for (let el of allElements) {
        if (results.length >= 3) break;
        
        const text = el.textContent || '';
        const href = el.getAttribute('href') || '';
        
        // Look for Magnésio products
        if (text.toLowerCase().includes('magnes') && text.length > 10 && !seen.has(text)) {
          // Find price in nearby elements
          let priceText = '';
          let parent = el;
          for (let i = 0; i < 5; i++) {
            parent = parent?.parentElement;
            if (!parent) break;
            const priceMatch = parent.textContent?.match(/R\$\s*[\d.,]+/);
            if (priceMatch) {
              priceText = priceMatch[0];
              break;
            }
          }
          
          results.push({
            name: text.trim().substring(0, 100),
            price: priceText || 'N/A',
            url: href.startsWith('http') ? href : 'https://shopee.com.br' + href,
            available: !text.toLowerCase().includes('fora de estoque')
          });
          
          seen.add(text);
        }
      }
      
      return results;
    });
    
    if (products.length === 0) {
      console.log('No products found with text search. Checking page structure...');
      const pageText = await page.textContent();
      const hasContent = pageText.includes('magnes') || pageText.includes('Magnes');
      console.log('Page contains magnesio:', hasContent);
      console.log('First 500 chars of page:', pageText.substring(0, 500));
    }
    
    console.log('Extracted products:', JSON.stringify(products, null, 2));
    
    // Save detailed HTML for debugging
    const html = await page.content();
    fs.writeFileSync('shopee_detailed.html', html);
    console.log('Saved HTML to shopee_detailed.html');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

scrapeShopee();
