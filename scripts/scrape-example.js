#!/usr/bin/env node

/**
 * Firecrawl Scraping Example
 * Demonstrates real-world usage with marketplace scraping
 */

const API_KEY = 'FIRECRAWL_KEY_REMOVED';
const BASE_URL = 'https://api.firecrawl.dev/v1';

class FirecrawlExample {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = BASE_URL;
  }

  async scrapeMercadoLivre(productName) {
    console.log(`\n🔍 Scraping Mercado Livre for: "${productName}"\n`);

    const searchUrl = `https://listado.mercadolibre.com.br/${encodeURIComponent(productName)}`;

    const schema = {
      type: 'object',
      properties: {
        products: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              price: { type: 'number' },
              originalPrice: { type: 'number' },
              discount: { type: 'number' },
              seller: { type: 'string' },
              rating: { type: 'number' },
              reviews: { type: 'number' },
              availability: { type: 'string' },
              url: { type: 'string' }
            }
          }
        }
      }
    };

    try {
      const response = await fetch(`${this.baseUrl}/extract`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: searchUrl,
          schema: schema,
          prompt: `Extract all product listings for "${productName}" including title, price, original price, discount percentage, seller name, rating, number of reviews, availability status, and product URL. Return as JSON array.`
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.data && data.data.products) {
        this.displayResults(data.data.products);
        return data.data.products;
      } else {
        console.log('⚠️  No products extracted');
        return [];
      }
    } catch (error) {
      console.error('❌ Scraping error:', error.message);
      return [];
    }
  }

  async scrapeAmazon(productName) {
    console.log(`\n🔍 Scraping Amazon for: "${productName}"\n`);

    const searchUrl = `https://www.amazon.com.br/s?k=${encodeURIComponent(productName)}`;

    const schema = {
      type: 'object',
      properties: {
        products: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              price: { type: 'number' },
              rating: { type: 'number' },
              reviews: { type: 'number' },
              prime: { type: 'boolean' },
              availability: { type: 'string' },
              url: { type: 'string' }
            }
          }
        }
      }
    };

    try {
      const response = await fetch(`${this.baseUrl}/extract`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: searchUrl,
          schema: schema,
          prompt: `Extract product listings for "${productName}" from Amazon Brazil including title, price in BRL, customer rating, number of reviews, whether it has Prime shipping, availability status, and product URL.`
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.data && data.data.products) {
        this.displayResults(data.data.products);
        return data.data.products;
      } else {
        console.log('⚠️  No products extracted');
        return [];
      }
    } catch (error) {
      console.error('❌ Scraping error:', error.message);
      return [];
    }
  }

  async comparePrice(productName) {
    console.log(`\n💰 Price Comparison for: "${productName}"\n`);

    const [mlProducts, amazonProducts] = await Promise.all([
      this.scrapeMercadoLivre(productName),
      this.scrapeAmazon(productName)
    ]);

    const allProducts = [
      ...mlProducts.map(p => ({ ...p, marketplace: 'Mercado Livre' })),
      ...amazonProducts.map(p => ({ ...p, marketplace: 'Amazon' }))
    ].sort((a, b) => (a.price || Infinity) - (b.price || Infinity));

    if (allProducts.length === 0) {
      console.log('❌ No products found on any marketplace');
      return;
    }

    console.log('\n📊 COMPARISON SUMMARY');
    console.log('═'.repeat(80));

    const bestPrice = allProducts[0];
    const avgPrice = allProducts.reduce((sum, p) => sum + (p.price || 0), 0) / allProducts.length;
    const maxPrice = allProducts[allProducts.length - 1];

    console.log(`\n💎 BEST DEAL:`);
    console.log(`   R$ ${bestPrice.price?.toFixed(2)} at ${bestPrice.marketplace}`);
    console.log(`   ${bestPrice.title?.substring(0, 50)}...`);

    console.log(`\n📈 PRICE RANGE:`);
    console.log(`   Lowest:  R$ ${bestPrice.price?.toFixed(2)}`);
    console.log(`   Average: R$ ${avgPrice.toFixed(2)}`);
    console.log(`   Highest: R$ ${maxPrice.price?.toFixed(2)}`);

    console.log(`\n💵 POTENTIAL SAVINGS:`);
    const savings = (maxPrice.price - bestPrice.price).toFixed(2);
    const percent = ((savings / maxPrice.price) * 100).toFixed(1);
    console.log(`   R$ ${savings} (${percent}%) by buying at best price`);

    console.log('\n' + '═'.repeat(80) + '\n');
  }

  displayResults(products) {
    if (!products || products.length === 0) {
      console.log('No products found');
      return;
    }

    console.log(`Found ${products.length} products:\n`);

    products.slice(0, 5).forEach((product, index) => {
      console.log(`${index + 1}. ${product.title?.substring(0, 50)}...`);
      console.log(`   Price: R$ ${product.price?.toFixed(2)}`);
      if (product.originalPrice) {
        console.log(`   Original: R$ ${product.originalPrice?.toFixed(2)}`);
      }
      if (product.discount) {
        console.log(`   Discount: ${product.discount}%`);
      }
      if (product.rating) {
        console.log(`   Rating: ${product.rating.toFixed(1)}⭐ (${product.reviews} reviews)`);
      }
      if (product.seller) {
        console.log(`   Seller: ${product.seller}`);
      }
      console.log('');
    });
  }
}

// Main execution
async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║     Firecrawl Marketplace Scraper     ║');
  console.log('║        SupliList Integration          ║');
  console.log('╚════════════════════════════════════════╝');

  const scraper = new FirecrawlExample(API_KEY);

  // Example: Scrape for supplements
  const products = [
    'Vitamina D 2000 IU',
    'Vitamina B12',
    'Cálcio'
  ];

  for (const product of products) {
    await scraper.comparePrice(product);

    // Rate limiting: wait 2 seconds between requests
    if (products.indexOf(product) < products.length - 1) {
      console.log('⏳ Waiting for rate limit... (2s)\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n✅ Scraping complete!\n');
  console.log('Next steps:');
  console.log('  • Integrate results into price-aggregator.js');
  console.log('  • Setup continuous monitoring');
  console.log('  • Configure price alerts');
  console.log('  • Deploy to production\n');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
