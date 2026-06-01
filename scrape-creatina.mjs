import axios from 'axios';
import * as cheerio from 'cheerio';

async function scrapeMercadoLivre() {
  const url = 'https://www.mercadolivre.com.br/search?q=creatina%20monohidratada';
  
  try {
    console.log('Fetching Mercado Livre page...');
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    console.log('Page fetched, parsing HTML...');
    
    // Find product listings
    const listings = [];
    const items = $('[data-item-id]').slice(0, 3);
    
    items.each((index, element) => {
      const $item = $(element);
      
      const name = $item.find('h2 a span').text().trim();
      const priceText = $item.find('[class*="price"]').text().trim();
      const url = $item.find('h2 a').attr('href');
      
      if (name && url) {
        listings.push({
          brand: name.split(' ').slice(0, 2).join(' '),
          price: priceText,
          url: url,
          available: true
        });
      }
    });
    
    console.log('Extracted listings:', listings);
    console.log(JSON.stringify(listings, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

scrapeMercadoLivre();
