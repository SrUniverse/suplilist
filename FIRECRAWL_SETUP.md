# Firecrawl Integration Setup

## Overview

Firecrawl is integrated into SupliList for intelligent web scraping of product prices across multiple marketplaces. It works alongside the existing API-based price aggregator.

## Installation & Setup

### 1. Get Firecrawl API Key

1. Visit [firecrawl.dev](https://firecrawl.dev)
2. Sign up for a free account
3. Get your API key from the dashboard
4. Free tier includes: 300 requests/month + LLM-powered extraction

### 2. Configure Environment Variables

Add to `.env`:

```bash
FIRECRAWL_API_KEY=your_api_key_here
USE_FIRECRAWL=true
```

Or set at runtime:

```javascript
process.env.FIRECRAWL_API_KEY = 'your_api_key';
process.env.USE_FIRECRAWL = 'true';
```

### 3. Initialize in Your App

```javascript
import { IntelligentPriceFetcher } from './platform/intelligent-price-fetcher.js';

// Fetch prices (automatically uses API + Firecrawl)
const prices = await IntelligentPriceFetcher.fetchPrices('Vitamin D');
console.log(prices);
// Output: { source: 'hybrid', augmented: true, allResults: [...] }
```

## Architecture

### Strategy: Hybrid Approach

```
┌─────────────────────────────────┐
│  fetchPrices('Vitamin D')       │
└────────────┬────────────────────┘
             │
             ▼
     ┌───────────────────┐
     │  Try API First    │ (Fast, reliable)
     └────────┬──────────┘
              │
         ┌────┴─────┐
         ▼          ▼
    ✓ Good   ✗ Sparse
    Results  Results
       │         │
       │         ▼
       │   ┌──────────────┐
       │   │ Augment with │
       │   │ Firecrawl    │ (Extra coverage)
       │   └──────┬───────┘
       │          │
       └──────┬───┘
              ▼
    Return Combined Results
```

### When to Use Each Source

| Source | When | Pros | Cons |
|--------|------|------|------|
| **API** | Always first | Fast, reliable, structured | Limited coverage |
| **Firecrawl** | API sparse (<3 results) | Comprehensive, handles JS | Slower, costs credits |
| **Hybrid** | Best of both | Maximizes coverage | Uses more credits |

## Usage Examples

### Basic Price Fetching

```javascript
import IntelligentPriceFetcher from './platform/intelligent-price-fetcher.js';

// Get prices - automatically uses best source
const prices = await IntelligentPriceFetcher.fetchPrices('Vitamin D');

console.log(prices);
// {
//   supplementName: 'Vitamin D',
//   source: 'hybrid',
//   augmented: true,
//   allResults: [
//     { marketplace: 'Mercado Livre', price: 29.99, ... },
//     { marketplace: 'Amazon', price: 32.00, ... },
//     ...
//   ],
//   stats: {
//     lowestPrice: 29.99,
//     averagePrice: 31.50,
//     highestPrice: 35.00
//   }
// }
```

### Scrape Specific Marketplace

```javascript
import firecrawlAdapter from './platform/firecrawl-adapter.js';

// Scrape Mercado Livre directly
const mlProducts = await firecrawlAdapter.scrapeMercadoLivre('Vitamin D');

// Scrape Amazon
const amazonProducts = await firecrawlAdapter.scrapeAmazon('Vitamin D');

// Scrape specific URL with details
const details = await firecrawlAdapter.scrapeProductDetails(
  'https://www.mercadolibre.com.br/item/XXX'
);
```

### Monitor Price Changes

```javascript
// Monitor single product
const priceChange = await firecrawlAdapter.monitorPrice(
  'https://example.com/product',
  previousPrice: 35.00
);

console.log(priceChange);
// {
//   currentPrice: 32.00,
//   priceChange: -3.00,
//   percentChange: -8.57,
//   direction: 'down',
//   alert: true  // Price changed > 10%
// }

// Continuous monitoring
const monitor = IntelligentPriceFetcher.startPriceMonitoring(
  'Vitamin D',
  3600000  // Check every hour
);

// Stop monitoring
monitor.stop();
```

### Batch Scraping

```javascript
// Scrape multiple URLs at once
const urls = [
  'https://site1.com/product',
  'https://site2.com/product',
  'https://site3.com/product'
];

const results = await firecrawlAdapter.batchScrape(urls);

// With rate limiting: 1 second between requests
// Total time: ~3-4 seconds for 3 URLs
```

### Competitive Analysis

```javascript
// Compare competitor prices
const competitors = [
  'https://competitor1.com/vitamin-d',
  'https://competitor2.com/vitamin-d',
  'https://competitor3.com/vitamin-d'
];

const analysis = await firecrawlAdapter.scrapeCompetitorPrices(
  'Vitamin D',
  competitors
);

console.log(analysis);
// {
//   supplementName: 'Vitamin D',
//   competitorCount: 3,
//   successfulScrapes: 3,
//   prices: [
//     { url: '...', price: 29.99, seller: '...', ... },
//     { url: '...', price: 32.00, seller: '...', ... },
//   ],
//   lowestPrice: 29.99,
//   averagePrice: 31.50
// }
```

## API Credits & Costs

### Free Plan
- **300 credits/month**
- Each scrape = ~1 credit
- Batch scraping uses multiple credits

### Paid Plans
- Starter: $29/month + $0.03 per credit
- Growth: $99/month + $0.02 per credit
- Enterprise: Custom pricing

### Check Usage

```javascript
const usage = await IntelligentPriceFetcher.getFirecrawlUsage();

console.log(usage);
// {
//   creditsUsed: 150,
//   creditsRemaining: 150,
//   creditsLimit: 300,
//   planType: 'free'
// }
```

## Enable/Disable Firecrawl

```javascript
// Disable Firecrawl (fallback to API only)
IntelligentPriceFetcher.setFirecrawlEnabled(false);

// Enable Firecrawl
IntelligentPriceFetcher.setFirecrawlEnabled(true);

// Validate connection
const isConnected = await IntelligentPriceFetcher.validateFirecrawl();
if (!isConnected) {
  console.error('Firecrawl API key invalid or service down');
}
```

## Error Handling

```javascript
try {
  const prices = await IntelligentPriceFetcher.fetchPrices('Vitamin D');
  
  if (!prices.allResults || prices.allResults.length === 0) {
    console.warn('No prices found');
  }
  
  if (prices.error) {
    console.error('Fetch error:', prices.error);
  }
} catch (error) {
  console.error('Critical error:', error.message);
  // Fallback to cached prices
}
```

## Best Practices

### 1. Rate Limiting
```javascript
// Don't scrape too frequently
const monitor = IntelligentPriceFetcher.startPriceMonitoring(
  'Vitamin D',
  3600000  // 1 hour minimum between checks
);
```

### 2. Batch Operations
```javascript
// Good: Batch multiple URLs
const results = await firecrawlAdapter.batchScrape(urls);

// Avoid: Individual requests in loop
for (url of urls) {
  await firecrawlAdapter.scrapeUrl(url); // ❌ Inefficient
}
```

### 3. Monitor Credits
```javascript
// Check before expensive operations
const usage = await IntelligentPriceFetcher.getFirecrawlUsage();

if (usage.creditsRemaining < 50) {
  console.warn('Low credits remaining');
  // Use API-only mode
  IntelligentPriceFetcher.setFirecrawlEnabled(false);
}
```

### 4. Handle Failures Gracefully
```javascript
const prices = await IntelligentPriceFetcher.fetchPrices('Vitamin D');

// Always have fallback
if (prices.error) {
  // Use cached prices
  // Show offline mode
  // Alert user
}
```

## Troubleshooting

### Invalid API Key
```
Error: HTTP 401 Unauthorized
Solution: Check FIRECRAWL_API_KEY in .env
```

### Rate Limit Exceeded
```
Error: HTTP 429 Too Many Requests
Solution: Increase delay between requests, use batch API
```

### Timeout
```
Error: Timeout after 30000ms
Solution: URL might be slow/blocked, increase timeout or skip
```

### No Results
```
Returns: { success: true, data: [] }
Solution: Website might require special handling, check robots.txt
```

## Testing

### Run Tests

```bash
npm test -- firecrawl-adapter.test.js
npm test -- intelligent-price-fetcher.test.js
npm test -- price-aggregator.test.js
```

### Mock Mode (for development)

```javascript
// Use mock adapters instead of real API
const fetcher = new IntelligentPriceFetcher();
fetcher.setFirecrawlEnabled(false); // Use API mocks only
```

## Monitoring & Alerts

```javascript
// Setup continuous monitoring
const monitor = IntelligentPriceFetcher.startPriceMonitoring('Vitamin D');

// Listen for price changes > 10%
// Automatically logs alerts
```

## Integration with SupliList

### In Price Comparison Page

```javascript
import IntelligentPriceFetcher from './platform/intelligent-price-fetcher.js';

class PriceComparisonPage {
  async mount() {
    // Automatically uses best source
    const prices = await IntelligentPriceFetcher.fetchPrices(
      this.supplementName
    );
    
    this.renderResults(prices);
  }
}
```

### In Shopping Flow

```javascript
// Get best deal when adding to cart
const prices = await IntelligentPriceFetcher.fetchPrices(supplementName);
const bestDeal = prices.allResults[0];

// Suggest marketplace with lowest price
showDealAlert(`Found ${supplementName} for R$ ${bestDeal.price} on ${bestDeal.marketplace}`);
```

## Future Enhancements

- [ ] Price history charts
- [ ] Automatic price drop alerts
- [ ] Inventory monitoring
- [ ] Competitor analysis dashboard
- [ ] Price prediction ML model
- [ ] Mobile app integration
- [ ] Real-time price sync

## Support

- Firecrawl Docs: https://docs.firecrawl.dev
- API Reference: https://api.firecrawl.dev/docs
- GitHub Issues: Report bugs to Firecrawl team
