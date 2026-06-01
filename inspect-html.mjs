import * as cheerio from 'cheerio';
import fs from 'fs';

const html = fs.readFileSync('amazon-page.html', 'utf-8');
const $ = cheerio.load(html);

console.log('=== Inspecting first product container ===\n');

const firstContainer = $('div[data-component-type="s-search-result"]').first();
console.log('First container HTML:');
console.log(firstContainer.html().substring(0, 1000));

console.log('\n=== Looking for titles ===');
const titles = firstContainer.find('h2, .s-size-mini, span[data-component-type]');
console.log('Found elements:', titles.length);

titles.slice(0, 5).each((i, el) => {
  const text = $(el).text().trim().substring(0, 80);
  const tagName = el.name;
  const classes = $(el).attr('class');
  console.log(`${i}: <${tagName}> class="${classes}": ${text}`);
});

console.log('\n=== Looking for prices ===');
const prices = firstContainer.find('[data-a-color], span');
console.log('Found span elements:', prices.length);

prices.slice(0, 10).each((i, el) => {
  const text = $(el).text().trim();
  const attrs = $(el).attr('data-a-color');
  if (text.includes('R$') || text.match(/\d+/)) {
    console.log(`${i}: ${text} [data-a-color=${attrs}]`);
  }
});
