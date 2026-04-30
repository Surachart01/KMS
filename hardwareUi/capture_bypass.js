import { chromium } from 'playwright';
import path from 'path';

const DEST = '/Users/surachartlimrattanaphun/Desktop/KMS/ch3/screenshots';
const BASE = 'http://localhost:5173';

const PAGES = [
  'kiosk_home.png',
  'kiosk_keylist.png',
  'kiosk_scan.png',
  'kiosk_confirm.png',
  'kiosk_reason.png',
  'kiosk_waitreturn.png',
  'kiosk_swap.png',
  'kiosk_transfer.png',
  'kiosk_success.png',
];

async function capture(page, name, waitMs = 500) {
  await new Promise(r => setTimeout(r, waitMs));
  // hide the debug UI before screenshot
  await page.evaluate(() => {
    const el = document.getElementById('debug-ui');
    if(el) el.style.opacity = '0';
  });
  await page.screenshot({ path: path.join(DEST, name), fullPage: false });
  // restore debug UI
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
  
  for (let i = 0; i < PAGES.length; i++) {
    await capture(page, PAGES[i]);
    if (i < PAGES.length - 1) {
      await page.click('text=next ▶');
    }
  }

  await browser.close();
  console.log('Done!');
})();
