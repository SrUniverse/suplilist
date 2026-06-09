/**
 * Firecrawl Service Testing
 * Simulates scraping "creatina" from each marketplace
 * Tests price extraction, product name extraction, and affiliate URL generation
 */

import FirecrawlService from './firecrawl.service.js';

// Simulated Firecrawl markdown responses for each marketplace
// These are realistic examples of what Firecrawl would return

const mockAmazonResponse = `
# Resultados de Busca para Creatina

## [CREATINA MONOHIDRATADA 500G 100% PURA](https://amazon.com.br/s?k=creatina)
Marca: KM Nutrition
**R$ 59,90**
⭐ 4.8 (2341 reviews)
Frete grátis

## CREATINA CREAPURE 300G IMPORTADA
Marca: Ultimate Nutrition
**R$ 89,90**
⭐ 4.7 (1250 reviews)
Enviado pela Amazon

## Creatina em Pó 500g Pura Importada
Marca: Growth Supplements
**R$ 45,50**
⭐ 4.6 (890 reviews)
Promoção relâmpago
`;

const mockMercadoLivreResponse = `
Creatina em Mercado Livre

1. **CREATINA MONOHIDRATADA 500G PURA CREAPURE** |
   Vendedor: Suplementos Prime |
   💰 R$ 54,90 |
   ⭐ Avaliação: 4.9
   Compre e ganhe 2 de desconto

2. CREATINA 300G 100% PURA IMPORTADA |
   Vendedor: FitShop Brasil |
   Preço: R$ 79,50 |
   ⭐ 4.8 (567 avaliações)
   Frete grátis acima de R$ 100

3. Suplemento Creatina 500g Monohidrato
   Por: Supplement Store |
   R$ 64,00 |
   ⭐ Avaliação: 4.7 (342 reviews)
   Entrega em 1-2 dias
`;

const mockShopeeResponse = `
Creatina na Shopee

[CREATINA 500G 100% PURA IMPORTADA KM NUTRITION](shopee.com.br/product/123)
Loja: Nutrition Store
🏷️ R$ 56,90 | Original: R$ 89,90 | 36% OFF
⭐ 4.9 (1890 compras)
Frete Grátis

CREATINA CREAPURE 300G - IMPORTADA
Loja: Mega Supplements
R$ 85,00
⭐ 4.8 | 562 vendidos

Creatina Monohidrato 500g Pura
Loja: Growth Store
Preço: R$ 49,90
⭐ 4.6 (234 compras)
Promoção do mês
`;

/**
 * Test function to validate Firecrawl parsing
 */
async function testFirecrawlParsing() {
  console.log('\n========================================');
  console.log('🧪 FIRECRAWL PARSING TEST - CREATINA');
  console.log('========================================\n');

  const tests = [
    { source: 'amazon' as const, response: mockAmazonResponse, name: 'Amazon.com.br' },
    { source: 'mercadolivre' as const, response: mockMercadoLivreResponse, name: 'Mercado Livre' },
    { source: 'shopee' as const, response: mockShopeeResponse, name: 'Shopee' },
  ];

  const allResults: Array<{
    source: string;
    name: string;
    price: number;
    url: string;
  }> = [];

  for (const test of tests) {
    console.log(`\n--- Testing ${test.name} ---\n`);

    // Access private method for testing (using type assertion)
    const service = FirecrawlService as any;
    const results = service.parseSupplements(test.response, test.source);

    console.log(`✓ Found ${results.length} products\n`);

    if (results.length === 0) {
      console.log('⚠️ WARNING: No products found!');
      console.log('Check parsing logic for marketplace format changes.\n');
      continue;
    }

    // Display results
    results.forEach((product, idx) => {
      console.log(`${idx + 1}. ${product.name}`);
      console.log(`   Price: R$ ${product.price.toFixed(2)}`);
      console.log(`   Source: ${product.source}`);
      console.log(`   Affiliate URL: ${product.url}`);
      console.log();

      allResults.push({
        source: test.source,
        name: product.name,
        price: product.price,
        url: product.url,
      });
    });
  }

  // Summary and best price analysis
  console.log('\n========================================');
  console.log('📊 PRICE COMPARISON SUMMARY');
  console.log('========================================\n');

  // Group by similar products (normalize names)
  const productMap = new Map<string, typeof allResults>();
  allResults.forEach((result) => {
    const key = result.name
      .toLowerCase()
      .replace(/\s+/g, '')
      .substring(0, 30);
    if (!productMap.has(key)) {
      productMap.set(key, []);
    }
    productMap.get(key)!.push(result);
  });

  // Find best price overall
  let bestPrice = Infinity;
  let bestDeal: (typeof allResults)[0] | null = null;

  allResults.forEach((result) => {
    if (result.price < bestPrice) {
      bestPrice = result.price;
      bestDeal = result;
    }
  });

  if (bestDeal) {
    console.log(`🏆 BEST PRICE: ${bestDeal.name}`);
    console.log(`   R$ ${bestDeal.price.toFixed(2)} on ${bestDeal.source.toUpperCase()}`);
    console.log(`   Link: ${bestDeal.url}\n`);
  }

  // Verify affiliate codes in URLs
  console.log('✅ AFFILIATE CODE VERIFICATION\n');
  const affiliateCheck = {
    amazon: results.filter(r => r.source === 'amazon').some(r => r.url.includes('tag=suplilist01-20')),
    mercadolivre: allResults.some(r => r.source === 'mercadolivre' && r.url.includes('FULZ93-PCG7')),
    shopee: allResults.some(r => r.source === 'shopee' && r.url.includes('affid=CLH-CZB-PNR')),
  };

  console.log(`Amazon: ${affiliateCheck.amazon ? '✓ CORRECT' : '✗ MISSING'}`);
  console.log(`Mercado Livre: ${affiliateCheck.mercadolivre ? '✓ CORRECT' : '✗ MISSING'}`);
  console.log(`Shopee: ${affiliateCheck.shopee ? '✓ CORRECT' : '✗ MISSING'}`);

  console.log('\n========================================\n');
}

// Run the test
testFirecrawlParsing().catch(console.error);
