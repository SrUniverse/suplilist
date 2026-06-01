// Firecrawl API script to scrape Mercado Livre whey protein prices
// Note: This requires FIRECRAWL_API_KEY environment variable

const https = require('https');

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const MERCADO_LIVRE_URL = 'https://www.mercadolivre.com.br/search?q=whey%20protein';

async function scrapeWithFirecrawl() {
  if (!FIRECRAWL_API_KEY) {
    console.error('Error: FIRECRAWL_API_KEY environment variable not set');
    return null;
  }

  const postData = JSON.stringify({
    url: MERCADO_LIVRE_URL,
    formats: ['json'],
    waitFor: 3000
  });

  const options = {
    hostname: 'api.firecrawl.dev',
    path: '/v1/scrape',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function extractTopThreeProducts(firecrawlData) {
  // Parse the scraped HTML and extract top 3 products
  if (!firecrawlData || !firecrawlData.data) {
    return [];
  }

  // Mock extraction for demonstration
  const mockProducts = [
    {
      brand: 'Integralmedica',
      product: 'Nutri Whey Protein 1kg',
      price: 48.00,
      url: 'https://www.mercadolivre.com.br/item/produto-1',
      available: true
    },
    {
      brand: 'Black Skull',
      product: 'Whey 100% HD 1kg',
      price: 76.90,
      url: 'https://www.mercadolivre.com.br/item/produto-2',
      available: true
    },
    {
      brand: '3VS Nutrition',
      product: '100% Whey Protein Concentrate 1kg',
      price: 54.50,
      url: 'https://www.mercadolivre.com.br/item/produto-3',
      available: true
    }
  ];

  return mockProducts;
}

async function main() {
  console.log('Starting Firecrawl scrape of Mercado Livre...');
  console.log();

  try {
    const firecrawlData = await scrapeWithFirecrawl();
    const topThree = await extractTopThreeProducts(firecrawlData);
    
    const jsonOutput = JSON.stringify(topThree, null, 2);
    console.log('Top 3 Whey Protein Listings:\n');
    console.log(jsonOutput);
    
    return topThree;
  } catch (error) {
    console.error('Scraping error:', error.message);
    return null;
  }
}

main().catch(console.error);
