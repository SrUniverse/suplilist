import axios from 'axios';
import * as cheerio from 'cheerio';

async function scrapeAmazonBrazil() {
  const url = 'https://www.amazon.com.br/s?k=omega%203';

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const products = [];

    // Find all product containers
    const productContainers = $('div[data-component-type="s-search-result"]');
    
    productContainers.slice(0, 3).each((index, element) => {
      const $container = $(element);
      
      // Get product title from h2
      const titleEl = $container.find('h2 a span').first();
      const title = titleEl.text().trim();
      
      // Get URL
      const urlEl = $container.find('h2 a');
      const productUrl = urlEl.attr('href');
      const fullUrl = productUrl ? `https://www.amazon.com.br${productUrl}` : null;
      
      // Get price - extract from text content
      const allText = $container.text();
      const priceMatch = allText.match(/R\$[\s]*[\d.,]+/);
      let price = 'N/A';
      if (priceMatch) {
        price = priceMatch[0].trim();
      }
      
      // Check availability - look for "Fora de estoque" or similar
      const available = !allText.includes('Fora de estoque');
      
      // Extract brand from title
      const titleWords = title.split(' ');
      let brand = titleWords[0];
      if (titleWords.length > 1 && titleWords[1].length < 15) {
        brand = titleWords.slice(0, 2).join(' ');
      }
      
      if (title && title.length > 0) {
        products.push({
          brand: brand,
          price: price,
          url: fullUrl,
          available: available
        });
      }
    });

    return products;
  } catch (error) {
    console.error('Error scraping:', error.message);
    return [];
  }
}

const products = await scrapeAmazonBrazil();
console.log(JSON.stringify(products, null, 2));
