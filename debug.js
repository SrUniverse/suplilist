import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err));
  
  console.log('Navigating...');
  await page.goto('http://localhost:5173/#/list');
  console.log('Waiting 3s...');
  await page.waitForTimeout(3000);
  console.log('Done waiting. HTML snippet:');
  const html = await page.content();
  console.log(html.substring(0, 500));
  await browser.close();
})();
