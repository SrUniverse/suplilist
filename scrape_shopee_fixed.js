import { chromium } from 'playwright';
import * as fs from 'fs';

async function scrapeShopee() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  const page = await context.newPage();
  
  try {
    console.log('Navigating to Shopee search...');
    await page.goto('https://shopee.com.br/search?keyword=magnesio%20glicinato', {
      waitUntil: 'load',
      timeout: 30000
    });
    
    console.log('Waiting for products to render...');
    await page.waitForTimeout(5000);
    
    // Check what's actually on the page
    const pageText = await page.textContent();
    const hasProducts = pageText.toLowerCase().includes('magnes');
    console.log('Page has magnesio content:', hasProducts);
    
    if (!hasProducts) {
      console.log('Warning: page may not have fully loaded products');
      console.log('Page text length:', pageText.length);
    }
    
    // Extract all product containers
    const products = await page.evaluate(() => {
      const results = [];
      
      // Look for divs or sections that contain price information
      const allDivs = document.querySelectorAll('[class*="product"], [class*="item"], [data-testid*="product"]');
      
      for (let el of allDivs) {
        if (results.length >= 3) break;
        
        const text = el.textContent || '';
        
        // Check if this element has magnesium product info
        if (text.toLowerCase().includes('magnes') && text.length > 20) {
          // Extract price
          const priceMatch = text.match(/R\$\s*([\d.,]+)/);
          const price = priceMatch ? 'R$ ' + priceMatch[1] : 'N/A';
          
          // Find the link
          const link = el.querySelector('a');
          const url = link?.href || '#';
          
          // Check availability
          const available = !text.toLowerCase().includes('indisponível') && !text.toLowerCase().includes('fora de estoque');
          
          results.push({
            name: text.trim().substring(0, 100),
            price: price,
            url: url,
            available: available
          });
        }
      }
      
      return results;
    });
    
    console.log('Found products:', products.length);
    console.log(JSON.stringify(products, null, 2));
    
    // Save HTML for inspection
    const html = await page.content();
    fs.writeFileSync('shopee_result.html', html);
    
  } catch (error) {
    console.error('Scraping error:', error.message);
  } finally {
    await context.close();
    await browser.close();
  }
}

scrapeShopee();
