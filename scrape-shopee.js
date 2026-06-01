const https = require('https');

// Firecrawl API endpoint
const FIRECRAWL_API = 'https://api.firecrawl.dev/v1/scrape';
const API_KEY = process.env.FIRECRAWL_API_KEY;

async function scrapeShopee() {
  const url = 'https://shopee.com.br/search?keyword=creatina%20monohidratada';
  
  if (!API_KEY) {
    console.error('Error: FIRECRAWL_API_KEY environment variable not set');
    process.exit(1);
  }

  try {
    const response = await fetch(FIRECRAWL_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: url,
        formats: ['markdown']
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Firecrawl Response:', JSON.stringify(data, null, 2));

    // Parse the markdown to extract product information
    if (data.success && data.data && data.data.markdown) {
      const markdown = data.data.markdown;
      console.log('\n=== Raw Markdown ===\n', markdown);
    }

  } catch (error) {
    console.error('Scraping failed:', error.message);
    process.exit(1);
  }
}

scrapeShopee();
