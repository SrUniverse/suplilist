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
        formats: ['markdown', 'html']
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('API Response Status:', data.success);
    
    if (data.success && data.data) {
      console.log('\n=== Scraped Data ===');
      console.log(JSON.stringify(data.data, null, 2));
    }

  } catch (error) {
    console.error('Scraping failed:', error.message);
    process.exit(1);
  }
}

scrapeShopee();
