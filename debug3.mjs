import * as cheerio from 'cheerio';
import fs from 'fs';

const html = fs.readFileSync('amazon-page.html', 'utf-8');
const $ = cheerio.load(html);

const containers = $('div[data-component-type="s-search-result"]').slice(0, 3);

containers.each((idx, container) => {
  console.log(`\n=== Product ${idx + 1} ===`);
  const $container = $(container);
  
  // Get the entire text to understand structure
  const allText = $container.text();
  
  // Find the product title - usually first significant text
  const lines = allText.split('\n').map(l => l.trim()).filter(l => l.length > 5);
  
  console.log('Text lines (first 10):');
  lines.slice(0, 10).forEach((line, i) => {
    console.log(`${i}: ${line.substring(0, 80)}`);
  });
  
  // Extract price
  const priceMatch = allText.match(/R\$[\s]*[\d.,]+/);
  console.log('\nPrice found:', priceMatch ? priceMatch[0] : 'N/A');
  
  // Get title (usually first substantive line that's not a button/label)
  const title = lines.find(l => l.length > 20 && !l.includes('Patrocinado'));
  console.log('Title:', title);
});
