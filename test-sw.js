const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://mv.ztmr.club/');
  const content = await page.content();
  console.log("Content contains API relative URL:", content.includes('/api/mvs'));
  console.log("Content contains Unexpected token:", content.includes('Unexpected token'));
  await browser.close();
})();
