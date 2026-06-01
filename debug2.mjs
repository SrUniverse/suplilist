import * as cheerio from 'cheerio';
import fs from 'fs';

const html = fs.readFileSync('amazon-page.html', 'utf-8');
const $ = cheerio.load(html);

console.log('=== Debug Selectors ===\n');

const containers = $('div[data-component-type="s-search-result"]');
console.log('Total containers:', containers.length);

const first = containers.first();

console.log('\n=== First container h2 elements ===');
const h2s = first.find('h2');
console.log('h2 count:', h2s.length);
h2s.each((i, el) => {
  console.log(`h2[${i}]:`, $(el).text().trim().substring(0, 60));
  const link = $(el).find('a');
  console.log(`  - has a tag:`, link.length > 0);
  const span = link.find('span');
  console.log(`  - has span:`, span.length > 0);
  if (span.length > 0) {
    console.log(`  - span text:`, span.text().trim().substring(0, 60));
  }
});

console.log('\n=== Alternative approach: get all text from h2 ===');
const h2Text = first.find('h2').text().trim();
console.log('H2 text:', h2Text);

console.log('\n=== Alternative: use specific celwidget ===');
const widget = $('div[cel_widget_id^="MAIN-SEARCH_RESULTS"]').first();
const widgetH2 = widget.find('h2 a span').text();
console.log('Widget h2 a span:', widgetH2);
