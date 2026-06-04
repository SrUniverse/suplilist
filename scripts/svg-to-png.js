const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function convert() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const svgPath = path.join(__dirname, '../frontend/public/logo.svg');
  const svgContent = fs.readFileSync(svgPath, 'utf-8');
  
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { margin: 0; padding: 0; background: transparent; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
          svg { width: 100%; height: 100%; display: block; }
          .maskable-container {
            width: 100%; height: 100%; background: #080808; padding: 20%; box-sizing: border-box; display: flex; align-items: center; justify-content: center;
          }
        </style>
      </head>
      <body>
        <div id="standard" style="width:100%;height:100%;position:absolute;top:0;left:0;">
          ${svgContent}
        </div>
        <div id="maskable" class="maskable-container" style="position:absolute;top:0;left:0;visibility:hidden;">
          ${svgContent}
        </div>
      </body>
    </html>
  `);

  const standard = await page.$('#standard');
  if (standard) {
    await standard.screenshot({ path: path.join(__dirname, '../frontend/public/icon-512.png'), omitBackground: true, clip: { x:0, y:0, width: 512, height: 512 } });
    await standard.screenshot({ path: path.join(__dirname, '../frontend/public/icon-192.png'), omitBackground: true, clip: { x:0, y:0, width: 192, height: 192 } });
  }

  await page.evaluate(() => {
    document.getElementById('standard').style.visibility = 'hidden';
    document.getElementById('maskable').style.visibility = 'visible';
  });

  const maskable = await page.$('#maskable');
  if (maskable) {
    await maskable.screenshot({ path: path.join(__dirname, '../frontend/public/icon-maskable-192.png'), omitBackground: false, clip: { x:0, y:0, width: 192, height: 192 } });
  }

  await browser.close();
}

convert().catch(console.error);
