import axios from 'axios';
import * as cheerio from 'cheerio';

async function scrapeAmazonBrazil() {
  const url = 'https://www.amazon.com.br/s?k=omega%203';

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const products = [];

    // Select product containers
    const productElements = $('[data-component-type="s-search-result"]').slice(0, 3);

    productElements.each((index, element) => {
      const $product = $(element);

      // Extract product name and brand
      const nameElement = $product.find('h2 a span');
      const name = nameElement.text().trim();

      // Extract URL
      const urlElement = $product.find('h2 a');
      const productUrl = urlElement.attr('href');
      const fullUrl = productUrl ? `https://www.amazon.com.br${productUrl}` : null;

      // Extract price
      const priceElement = $product.find('[data-a-price-whole]');
      const priceText = priceElement.text().trim();

      // Extract availability
      const availabilityElement = $product.find('[data-a-color="base"]');
      const availability = availabilityElement.length > 0 ? 'Available' : 'Check';

      // Try to extract brand from product name (usually first part)
      const brandMatch = name.match(/^([^\s]+(?:\s+[^\s]+)?)/);
      const brand = brandMatch ? brandMatch[1] : 'Unknown';

      if (name) {
        products.push({
          brand: brand,
          name: name,
          price: priceText || 'N/A',
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
const products = await scrapeAmazonBrazil();
console.log(JSON.stringify(products, null, 2));
