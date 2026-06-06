# Free Tier Strategy - SupliList with Firecrawl

## Overview

**300 credits/month** is enough for all supplements with smart caching strategy.

### Math:
- 1 scrape = 1 credit
- 300 credits = 300 supplements scraped
- 7-day cache = Each supplement needs refreshing ~4x/month
- **Budget: ~75 supplements per month with full coverage**

## Architecture

```
User Request
    ↓
Check Memory Cache (instant, free)
    ↓
    ├─ Found → Return cached
    └─ Not found
        ↓
    Check Firecrawl Cache (free)
        ↓
        ├─ Found & Fresh → Return
        └─ Not found or old
            ↓
        Scrape with Firecrawl (1 credit)
            ↓
        Store in Memory Cache (7 days)
            ↓
        Return to user
```

## Usage

### Simple Usage

```javascript
import SupplementPriceManager from './platform/supplement-price-manager.js';

// Get price for one supplement
const prices = await SupplementPriceManager.getPrice('Vitamin D');

// Result:
// {
//   supplementName: 'Vitamin D',
//   totalFound: 8,
//   products: [
//     { title: '...', price: 29.99, marketplace: 'Mercado Livre', ... },
//     { title: '...', price: 32.00, marketplace: 'Amazon', ... },
//     ...
//   ],
//   stats: {
//     lowestPrice: 29.99,
//     highestPrice: 35.00,
//     averagePrice: 31.50,
//     savings: 5.01,
//     marketplaceCount: 3
//   },
//   cached: false
// }
```

### Batch Usage (Smart)

```javascript
// Get prices for multiple supplements
// Automatically uses cache + scrapes only what's needed
const results = await SupplementPriceManager.getPrices([
  'Vitamin D',
  'Vitamin B12',
  'Cálcio',
  'Magnésio',
  'Zinco'
]);

// Result:
// {
//   supplements: 5,
//   total: 5,
//   cached: 3,        // Already had these
//   scraped: 2,       // Had to scrape these
//   data: [...]
// }
```

### Refresh When Needed

```javascript
// Only scrape if older than 24 hours
const prices = await SupplementPriceManager.refreshIfNeeded('Vitamin D', 24);

// Or force refresh
const prices = await SupplementPriceManager.refreshIfNeeded('Vitamin D', 0);
```

## Credit Budget

### Recommended Monthly Allocation

```
Total Budget: 300 credits

Allocation:
├─ Popular Supplements: 100 credits (20 supplements × 5 refreshes)
├─ Regular Supplements: 100 credits (40 supplements × 2.5 refreshes)
├─ Less Popular: 50 credits (50 supplements × 1 refresh)
└─ Buffer/Testing: 50 credits

This covers:
• 110+ unique supplements
• Regular price updates (5-20x/month per supplement)
• Live search requests
• Quality testing
```

### Per-Supplement Cost

```
Monthly Cost = Searches × Credits per search

Examples:
────────────────────────────────────
Vitamin D (popular):
  • Search frequency: 10x/month
  • Cost: 10 credits
  • Cache hit rate: ~70% (3 credits only)

Vitamin B12 (regular):
  • Search frequency: 5x/month
  • Cost: 5 credits
  • Cache hit rate: ~85% (0.75 credits only)

Obscure supplement:
  • Search frequency: 1x/month
  • Cost: 1 credit
  • Cache hit rate: ~0% (always fresh)
```

## Optimization Techniques

### 1. Cache Aggressively
```javascript
// 7-day cache by default
// Most supplements don't change much in a week
const cached = await SupplementPriceManager.getPrice('Vitamin D');
// Uses 0 credits if within 7 days
```

### 2. Batch Scraping
```javascript
// Scrape multiple at once (cheaper than individual)
const results = await SupplementPriceManager.getPrices([
  'Product 1',
  'Product 2',
  'Product 3'
  // Only new ones are scraped
]);
```

### 3. Queue for Off-Peak
```javascript
// Queue scraping for night (when credits matter less)
SupplementPriceManager.queueForLaterScraping('New Supplement', 'high');
SupplementPriceManager.queueForLaterScraping('Trending', 'medium');

// Process at night
await SupplementPriceManager.processQueue();
```

### 4. Smart Refresh
```javascript
// Only refresh if old enough
const prices = await SupplementPriceManager.refreshIfNeeded('Vitamin D', 24);
// If searched in last 24h, returns cache (free)
// If older, scrapes fresh data (1 credit)
```

## Monitoring Credits

### Check Current Status
```javascript
const health = SupplementPriceManager.getHealthReport();

console.log(health);
// {
//   cache: {
//     items: 45,
//     expired: 0,
//     expiresInDays: '7'
//   },
//   credits: {
//     used: 120,
//     remaining: 180,
//     percentUsed: '40%',
//     averagePerDay: '4',
//     estimatedDaysLeft: 45,
//     recommendation: '✅ Plenty of credits...'
//   },
//   queue: { pending: 0, isProcessing: false },
//   supplements: 45
// }
```

### Recommendations by Credit Level

```
✅ 0-30% used (210+ credits remaining)
  → Can scrape aggressively
  → Refresh popular items weekly
  → Test new features

⚠️  30-60% used (120-210 credits remaining)
  → Be selective with scrapes
  → Refresh only popular items
  → Use cache more

🟡 60-80% used (60-120 credits remaining)
  → Only scrape on demand
  → Extend cache to 10+ days
  → Heavy reliance on cache

🔴 80-95% used (15-60 credits remaining)
  → Critical items only
  → Cache everything possible
  → Plan for next month

❌ 95%+ used (0-15 credits remaining)
  → Read-only mode
  → Rely 100% on cache
  → Wait for reset
```

## Implementation in UI

### Price Comparison Page
```javascript
import SupplementPriceManager from './platform/supplement-price-manager.js';

class PriceComparisonPage {
  async mount(supplementName) {
    // This is all you need!
    const prices = await SupplementPriceManager.getPrice(supplementName);
    
    // It automatically:
    // 1. Checks local cache
    // 2. Checks Firecrawl cache (7 days)
    // 3. Scrapes if needed (1 credit)
    // 4. Returns data
    
    this.renderPrices(prices);
  }
}
```

### Supplement List
```javascript
class SupplementListPage {
  async mount() {
    // Get all popular supplements efficiently
    const allSupplements = [
      'Vitamina D',
      'Vitamina B12',
      'Cálcio',
      'Magnésio',
      'Zinc',
      // ... more
    ];
    
    // Smart: uses cache for most, scrapes only new
    const results = await SupplementPriceManager.getPrices(allSupplements);
    
    // Max 10-15 new scrapes per page load
    // Most will be cached
    
    this.renderList(results);
  }
}
```

## Real-World Scenarios

### Scenario 1: Normal Day
```
10:00 AM - User searches 5 popular supplements
  → 4 from cache (0 credits)
  → 1 scrape (1 credit)
  Total: 1 credit

2:00 PM - Different user searches same 5
  → 5 from cache (0 credits)
  Total: 0 credits

8:00 PM - User searches 3 new supplements
  → 3 scrapes (3 credits)
  Total: 3 credits

Daily cost: 4 credits (for ~8 supplement searches)
Monthly: 4 × 30 = 120 credits (leaving 180 for buffer)
```

### Scenario 2: High Traffic Day
```
Rush hour - 100 supplement searches
  → 70 from cache (0 credits)
  → 30 scrapes (30 credits)
  
Still affordable!
300 credits / 30 = 10 days of high traffic
```

### Scenario 3: New Features
```
Add price alerts feature
  → Check each alert once daily
  → 50 alerts × 1 credit = 50 credits
  → Still 250 left for regular use

Add trending supplements
  → Refresh top 20 daily
  → 20 credits/day = 600/month (TOO MUCH!)
  → Instead: refresh 5/day = 150/month (OK)
```

## Best Practices

### ✅ DO

- ✅ Use cache aggressively (7+ days)
- ✅ Batch scrape when possible
- ✅ Queue non-urgent scrapes for off-peak
- ✅ Monitor credit usage daily
- ✅ Refresh only when needed
- ✅ Reuse search results
- ✅ Export/import cache for backups

### ❌ DON'T

- ❌ Refresh everything daily (wastes credits)
- ❌ Scrape on every page visit
- ❌ Individual scrapes in loop (use batch)
- ❌ Cache less than 1 day
- ❌ Ignore credit warnings
- ❌ Scrape all 1000+ supplements monthly
- ❌ Real-time price tracking (not viable)

## Extending Beyond Free Tier

If you hit limits:

```
Option 1: Upgrade Firecrawl Plan
  → Starter: $29/month + $0.03/credit
  → 1000+ credits/month = ~$30/month
  
Option 2: Hybrid Approach
  → Firecrawl for popular supplements
  → Static/manual prices for others
  
Option 3: API Fallback (later)
  → Use marketplace APIs when available
  → Firecrawl as backup when APIs fail
```

## Troubleshooting

### "Out of credits"
→ Use cache only mode
→ Wait for monthly reset
→ Check which supplements are most expensive

### "Slow responses"
→ Increase cache TTL (7 → 14 days)
→ Reduce scrape frequency
→ Use memory cache (instant)

### "Inconsistent prices"
→ Different marketplaces at different times
→ This is normal - show all options

### "Missing marketplaces"
→ Firecrawl extracts what's available
→ Some sites block scraping
→ Cache ensures data availability

## Summary

**300 credits/month is MORE than enough** if you:

1. ✅ Cache aggressively (7 days)
2. ✅ Batch scrape when possible
3. ✅ Monitor credit usage
4. ✅ Refresh strategically
5. ✅ Queue non-urgent scrapes

**Result:** Full price coverage for 100+ supplements with actual marketplace data.
