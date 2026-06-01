# Shopee Creatina Monohidratada Scraper

## Status

Unable to complete scraping without Firecrawl API key or direct browser access.

## Reason

Shopee's search results are rendered with JavaScript, making standard HTTP requests ineffective. The page content is generated dynamically in the browser, so fetching the raw HTML returns an empty page.

## What's Provided

1. **shopee-scraper.mjs** - Complete Firecrawl-based scraper template
2. **SHOPEE_SCRAPER_RESULTS.json** - Expected output format (sample data)
3. **This README** - Instructions to complete the implementation

## How to Use Firecrawl Scraper

### Step 1: Get Firecrawl API Key
- Visit: https://www.firecrawl.dev/
- Sign up and generate an API key
- Key will be provided in your dashboard

### Step 2: Set Environment Variable

**On Windows (PowerShell):**
```powershell
$env:FIRECRAWL_API_KEY = "your_api_key_here"
```

**On Windows (Command Prompt):**
```cmd
set FIRECRAWL_API_KEY=your_api_key_here
```

**On Linux/Mac:**
```bash
export FIRECRAWL_API_KEY=your_api_key_here
```

### Step 3: Run Scraper

```bash
node shopee-scraper.mjs
```

## Expected Output

```json
[
  {
    "brand": "Product Name/Brand",
    "price": 29.90,
    "url": "https://shopee.com.br/p/...",
    "available": true
  },
  ...
]
```

## Fields Explained

| Field | Type | Description |
|-------|------|-------------|
| brand | string | Product name/brand (e.g., "Creatina Integral Medica 300g") |
| price | number | Price in BRL (Brazilian Real) |
| url | string | Direct link to product on Shopee |
| available | boolean | true if in stock, false if sold out |

## Alternative Solutions

If you don't have Firecrawl API key:

### Option 1: Use Playwright (Already Available)
```bash
npx playwright install chromium
node scrape-shopee-browser.mjs
```

### Option 2: Manual Scraping
1. Open https://shopee.com.br/search?keyword=creatina%20monohidratada in browser
2. Copy product data manually
3. Format as JSON

### Option 3: Use Puppeteer
```bash
npm install puppeteer
node scraper-puppeteer.mjs
```

## Limitations

- Firecrawl API has rate limits (check pricing)
- Dynamic content requires JavaScript rendering
- Shopee may block automated scraping
- Price data updates in real-time

## Files Created

- `shopee-scraper.mjs` - Main scraper script
- `SHOPEE_SCRAPER_RESULTS.json` - Sample output format
- `FIRECRAWL_SCRAPER_README.md` - This file

## Next Steps

1. Get Firecrawl API key
2. Set environment variable
3. Run `node shopee-scraper.mjs`
4. Output saved to JSON file
