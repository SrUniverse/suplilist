import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';

async function debugScrape() {
  const url = 'https://www.amazon.com.br/s?k=omega%203';

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    // Save HTML for inspection
    fs.writeFileSync('amazon-page.html', response.data);
    
    console.log('HTML saved to amazon-page.html');
    console.log('Response length:', response.data.length);
    
    // Try different selectors
    console.log('\n=== Trying different selectors ===');
    console.log('data-component-type selectors:', $('[data-component-type]').length);
    console.log('h2 a span:', $('h2 a span').length);
    console.log('[data-a-price-whole]:', $('[data-a-price-whole]').length);
    
    // Log first few product titles
    console.log('\n=== First 3 product titles ===');
    $('h2 a span').slice(0, 3).each((i, el) => {
      console.log(i + ':', $(el).text().trim());
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

await debugScrape();
