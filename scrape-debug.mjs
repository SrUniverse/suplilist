import puppeteer from 'puppeteer';

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1280, height: 720 });
    
    await page.goto('https://www.mercadolivre.com.br/search?q=omega%203', { 
      waitUntil: 'load',
      timeout: 45000 
    });
    
    // Wait for any product list to appear
    try {
      await page.waitForSelector('li[class*="poly"], [data-testid*="item"]', { timeout: 10000 });
    } catch {
      console.error('Product selector timeout');
    }
    
    // Give JS time to render
    await new Promise(r => setTimeout(r, 2000));
    
    // Check what's on the page
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        listElements: document.querySelectorAll('li').length,
        polyElements: document.querySelectorAll('li[class*="poly"]').length,
        articles: document.querySelectorAll('article').length,
        allLinks: document.querySelectorAll('a').length,
        bodyHTML: document.body.innerHTML.substring(0, 500)
      };
    });
    
    console.error('Page info:', pageInfo);
    
    const products = await page.evaluate(() => {
      const items = [];
      
      // Get all list items
      const allLis = Array.from(document.querySelectorAll('li')).slice(0, 10);
      
      for (const li of allLis) {
        const html = li.innerHTML;
        
        // Skip navigation/UI elements
        if (html.length < 100 || html.includes('nav') || html.includes('button')) continue;
        
        const a = li.querySelector('a[href]');
        const title = a ? (a.title || a.textContent).trim() : '';
        
        // Look for price pattern
        const fullText = li.innerText || '';
        const priceMatch = fullText.match(/R\$\s*([\d.,]+)/);
        const price = priceMatch ? parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.')) : 0;
        const url = a ? a.href : '';
        
        if (title.length > 10 && price > 10) {
          items.push({
            brand: title.substring(0, 120),
            price: price,
            url: url,
            available: true
          });
        }
      }
      
      return items.slice(0, 3);
    });
    
    console.log(JSON.stringify(products, null, 2));
    await browser.close();
  } catch (error) {
    console.error('Fatal error:', error.message);
    console.log('[]');
    if (browser) await browser.close();
  }
})();
