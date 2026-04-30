import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const DEST = '/Users/surachartlimrattanaphun/Desktop/KMS/ch3/screenshots';
const BASE = 'http://localhost:5173';

async function capture(page, name, waitMs = 1500) {
  await new Promise(r => setTimeout(r, waitMs));
  await page.screenshot({ path: path.join(DEST, name), fullPage: false });
  console.log(`✅ Saved: ${name}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // 1. HomePage
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  await capture(page, 'kiosk_home.png');

  // 2. KeyListPage — click เบิกกุญแจ
  try {
    await page.click('text=เบิกกุญแจ', { timeout: 3000 });
    await capture(page, 'kiosk_keylist.png');
  } catch (e) { console.log('⚠️  เบิกกุญแจ:', e.message); }

  // 3. ScanWaitingPage — click first key card
  try {
    // Try clicking any room/key card
    const cards = page.locator('.cursor-pointer, [role="button"], button');
    const count = await cards.count();
    console.log(`Found ${count} clickable elements on keylist`);
    if (count > 0) {
      await cards.first().click({ timeout: 2000 });
      await capture(page, 'kiosk_scan.png');
    }
  } catch (e) { console.log('⚠️  key card:', e.message); }

  // 4. คืนกุญแจ
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 10000 });
  try {
    await page.click('text=คืนกุญแจ', { timeout: 3000 });
    await capture(page, 'kiosk_waitreturn.png');
  } catch (e) { console.log('⚠️  คืนกุญแจ:', e.message); }

  // 5. สลับสิทธิ์
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 10000 });
  try {
    await page.click('text=สลับสิทธิ์', { timeout: 3000 });
    await capture(page, 'kiosk_swap.png');
  } catch (e) { console.log('⚠️  สลับสิทธิ์:', e.message); }

  // 6. โอนสิทธิ์
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 10000 });
  try {
    await page.click('text=โอนสิทธิ์', { timeout: 3000 });
    await capture(page, 'kiosk_transfer.png');
  } catch (e) { console.log('⚠️  โอนสิทธิ์:', e.message); }

  await browser.close();
  console.log('Done!');
})();
