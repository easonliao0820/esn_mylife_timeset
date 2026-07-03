import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto('http://localhost:5174/calendar');
await page.waitForTimeout(1800);
// navigate to sep 2026 (current is june 2026, need +3)
for(let i=0;i<3;i++){
  await page.locator('button', { hasText: '→' }).click();
  await page.waitForTimeout(350);
}
await page.waitForTimeout(500);
await page.screenshot({ path: process.argv[2], fullPage: true });
// click on Sep 1
const cells = page.locator('.dayCell, [class*="dayCell"]');
await browser.close();
