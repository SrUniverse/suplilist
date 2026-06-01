import axios from 'axios';
import { load as loadHTML } from 'cheerio';

async function scrapeAmazonBrazil() {
  const url = 'https://www.amazon.com.br/s?k=whey%20protein';

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    const $ = loadHTML(response.data);
    const products = [];

    // Select product containers
    const productElements = $('div[data-component-type="s-search-result"]').slice(0, 3);

    productElements.each((index, element) => {
      const $product = $(element);

      // Extract product name from h2 span
      const name = $product.find('h2 span').text().trim();

      // Extract ASIN and build URL from it
      const asin = $product.attr('data-asin');
      let fullUrl = null;
      if (asin) {
        fullUrl = `https://www.amazon.com.br/dp/${asin}`;
      }

      // Extract price - look in the text for R$
      let priceText = 'N/A';
      const fullText = $product.text();
      const priceMatch = fullText.match(/R\$\s*[\d.,]+/);
      if (priceMatch) {
        priceText = priceMatch[0];
      }

      // Extract availability
      const unavailableText = $product.text();
      const availability = unavailableText.includes('Indisponível') || unavailableText.includes('Out of stock') ? 'Unavailable' : 'Available';

      // Extract brand from product name (usually first word or two)
      const brandMatch = name.match(/^([^\s]+(?:\s+[^\s]+)?)/);
      const brand = brandMatch ? brandMatch[1] : 'Unknown';

      if (name && name.length > 0) {
        products.push({
          brand: brand,
          price: priceText,
          url: fullUrl,
          available: availability
        });
      }
    });

    return products;
  } catch (error) {
    console.error('Error scraping Amazon:', error.message);
    return [];
  }
}

// Run the scraper
scrapeAmazonBrazil().then(products => {
  console.log(JSON.stringify(products, null, 2));
  process.exit(0);
}).catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
