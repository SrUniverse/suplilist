# Shopee Creatina Monohidratada Scraper

## Requirements

The Shopee search page is JavaScript-rendered (dynamic content), which means:
- Standard HTTP requests won't capture the product data
- Need Firecrawl, Playwright, or similar JavaScript-capable tool

## Solution Options

### Option 1: Firecrawl API (Recommended)
Requires: `FIRECRAWL_API_KEY` environment variable

```bash
FIRECRAWL_API_KEY=your_key_here node scraper.mjs
```

### Option 2: Playwright + Browser
Already available in your project (playwright@1.60.0)

### Option 3: Puppeteer
Lightweight alternative to Playwright

## Implementation

Create `.env` file with your Firecrawl API key:
```
FIRECRAWL_API_KEY=your_api_key_here
```

Then run the scraper script provided.

## Expected Output Format

```json
[
  {
    "brand": "Creatina Monohidratada Brand A",
    "price": 29.90,
    "url": "https://shopee.com.br/p/xxxxx",
    "available": true
  },
  {
    "brand": "Creatina Monohidratada Brand B", 
    "price": 34.50,
    "url": "https://shopee.com.br/p/yyyyy",
    "available": true
  },
  {
    "brand": "Creatina Monohidratada Brand C",
    "price": 39.99,
    "url": "https://shopee.com.br/p/zzzzz",
    "available": false
  }
]
```

## To Use This Scraper

1. Get a Firecrawl API key from: https://www.firecrawl.dev/
2. Set your API key: `export FIRECRAWL_API_KEY=your_key`
3. Run: `node shopee-scraper.mjs`
