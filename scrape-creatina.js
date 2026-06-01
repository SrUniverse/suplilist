const { FirecrawlApp } = require('@firecrawl/sdk');

const app = new FirecrawlApp();

async function scrapeMercadoLivre() {
  const url = 'https://www.mercadolivre.com.br/search?q=creatina%20monohidratada';
  
  try {
    console.log('Scraping Mercado Livre...');
    const result = await app.scrapeUrl(url, {
      formats: ['markdown', 'html']
    });
    
    console.log('Raw data received');
    console.log(JSON.stringify(result, null, 2).substring(0, 1000));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

scrapeMercadoLivre();
