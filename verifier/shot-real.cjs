// 截图验证：增强版 × 真实数据 = 4 种组合
const { chromium } = require('playwright-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE || 'http://localhost:5199/';

(async () => {
  const browser = await chromium.launch({ executablePath: EDGE, headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (e) => console.log('PAGEERROR:', String(e)));
  await page.goto(BASE, { waitUntil: 'load' });
  await page.locator('#simulator').scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  const pause = () => page.locator('button[aria-label="暂停"]').click().catch(() => {});
  const slider = page.locator('#simulator input[type="range"]');
  const switches = page.locator('#simulator [role="switch"]');
  const shot = async (t, name) => {
    await slider.fill(String(t));
    await page.waitForTimeout(450);
    await page.locator('#simulator').screenshot({ path: `verifier/runs/${name}.png` });
    console.log('saved', name);
  };
  // 组合1：原版 + 抽象
  await pause();
  await shot(13, 'combo-base-abstract');
  // 组合2：原版 + 真实数据
  await switches.nth(1).click(); // 真实数据 on
  await page.waitForTimeout(600);
  await pause();
  await shot(13, 'combo-base-real');
  await shot(15.5, 'combo-base-real-retry');
  // 组合3：增强版 + 真实数据
  await switches.nth(0).click(); // 增强版 on
  await page.waitForTimeout(600);
  await pause();
  await shot(15.5, 'combo-plus-real');
  await shot(29.2, 'combo-plus-real-recycle');
  // 组合4：增强版 + 抽象
  await switches.nth(1).click(); // 真实数据 off
  await page.waitForTimeout(600);
  await pause();
  await shot(15.5, 'combo-plus-abstract');
  await browser.close();
})();
