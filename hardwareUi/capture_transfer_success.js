import { chromium } from 'playwright';
import path from 'path';

const DEST = '/Users/surachartlimrattanaphun/Desktop/KMS/ch3/screenshots';
const BASE = 'http://localhost:5173';

async function capture(page, name, waitMs = 1500) {
  await new Promise(r => setTimeout(r, waitMs));
  await page.evaluate(() => {
    const el = document.getElementById('debug-ui');
    if(el) el.style.opacity = '0';
  });
  await page.screenshot({ path: path.join(DEST, name), fullPage: false });
  await page.evaluate(() => {
    const el = document.getElementById('debug-ui');
    if(el) el.style.opacity = '1';
  });
  console.log(`✅ Saved: ${name}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  
  // click next 7 times to reach transferConfirm (index 7)
  for (let i = 0; i < 7; i++) {
    await page.click('text=next ▶');
    await new Promise(r => setTimeout(r, 200));
  }
  await capture(page, 'kiosk_transfer.png', 1000);

  // click next 1 time to reach success (index 8)
  await page.click('text=next ▶');
  await capture(page, 'kiosk_success.png', 500);

  await browser.close();
  console.log('Done!');
})();
