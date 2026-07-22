// 截图验证：增强版开关 + 六大增强机制
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
  const shot = async (t, name) => {
    await slider.fill(String(t));
    await page.waitForTimeout(400);
    await page.locator('#simulator').screenshot({ path: `verifier/runs/${name}.png` });
    console.log('saved', name);
  };
  // ① 开关关 = 原版
  await pause();
  await shot(16, 'plus-off-original');
  // ② 打开增强版
  await page.locator('#simulator [role="switch"]').click();
  await page.waitForTimeout(800);
  await pause();
  await shot(3.8, 'plus-t03-blackboard-write');
  await shot(9.5, 'plus-t09-grandchild');
  await shot(17.9, 'plus-t17-coldstart');
  await shot(29.2, 'plus-t29-recycle');
  await shot(39.2, 'plus-t39-end');
  await browser.close();
})();
