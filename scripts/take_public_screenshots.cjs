const fs = require('fs');
const path = require('path');

async function main() {
  const { chromium } = require('playwright');

  const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
  const outDir = process.env.OUT_DIR || path.join('screenshots', 'phase2-public');

  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const shot = async (name, route) => {
    await page.goto(baseUrl + route, { waitUntil: 'networkidle' });
    await wait(900);
    await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
  };

  await shot('home', '/');
  await shot('games', '/games');

  await page.goto(baseUrl + '/games', { waitUntil: 'networkidle' });
  await wait(900);
  const firstGameLink = await page.$('a[href^="/game/"]');
  if (firstGameLink) {
    await firstGameLink.click();
    await page.waitForURL(/\/game\//, { timeout: 15000 });
    await wait(900);
    await page.screenshot({ path: path.join(outDir, 'game-detail.png'), fullPage: true });
  } else {
    await shot('game-detail', '/game/test');
  }

  await shot('about', '/about');
  await shot('contact', '/contact');
  await shot('blog', '/blog');
  await shot('video-order', '/order-video');

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
