import { FirecrawlApp } from 'firecrawl';

async function scrapeShopee() {
  const app = new FirecrawlApp({
    apiKey: process.env.FIRECRAWL_API_KEY || 'test'
  });

  try {
    const url = 'https://shopee.com.br/search?keyword=magnesio%20glicinato';
    
    const result = await app.scrapeUrl(url, {
      formats: ['markdown', 'html'],
      waitFor: 3000
    });

    console.log('Scrape result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

scrapeShopee();
