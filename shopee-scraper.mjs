/**
 * Shopee Creatina Monohidratada Scraper
 * 
 * Uses Firecrawl API to scrape JavaScript-rendered Shopee search results
 * Requires: FIRECRAWL_API_KEY environment variable
 * 
 * Usage:
 *   FIRECRAWL_API_KEY=your_api_key node shopee-scraper.mjs
 */

const FIRECRAWL_API = 'https://api.firecrawl.dev/v1/scrape';
const API_KEY = process.env.FIRECRAWL_API_KEY;

async function parseProducts(htmlContent) {
  /**
   * Parse Shopee product listings from HTML
   * Extracts: brand, price, url, availability
   */
  
  // This would be implemented with cheerio or similar HTML parser
  // Expected HTML structure from Shopee
  
  return [];
}

async function scrapeShopeeWithFirecrawl() {
  const url = 'https://shopee.com.br/search?keyword=creatina%20monohidratada';
  
  if (!API_KEY) {
    console.error('ERROR: FIRECRAWL_API_KEY environment variable not set');
    console.error('Get your key at: https://www.firecrawl.dev/');
    process.exit(1);
  }

  try {
    console.log('Scraping Shopee...');
    console.log(`URL: ${url}\n`);

    const response = await fetch(FIRECRAWL_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: url,
        formats: ['html', 'markdown'],
        timeout: 30000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(`Scraping failed: ${data.error}`);
    }

    // Parse HTML to extract product listings
    const htmlContent = data.data.html || data.data.markdown;
    
    if (!htmlContent) {
      throw new Error('No content returned from Firecrawl');
    }

    // TODO: Parse HTML with cheerio or similar
    // Extract top 3 products with: brand, price, url, available status
    
    console.log('Raw content length:', htmlContent.length);
    console.log('\n=== Sample Content ===');
    console.log(htmlContent.substring(0, 500));
    
    // Return empty array for now until HTML parsing is added
    const products = [];
    
    console.log('\n=== Top 3 Products ===\n');
    console.log(JSON.stringify(products, null, 2));
    
    return products;

  } catch (error) {
    console.error('Scraping error:', error.message);
    process.exit(1);
  }
}

// Run scraper
scrapeShopeeWithFirecrawl();
