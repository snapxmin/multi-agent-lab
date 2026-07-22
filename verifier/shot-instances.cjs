// 截图验证：subagent 实例拆分 + 销毁动画
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
  // 暂停播放，手动 seek
  await page.locator('button[aria-label="暂停"]').click().catch(() => {});
  const slider = page.locator('#simulator input[type="range"]');
  for (const [t, name] of [[8, 't08-dev1'], [12.5, 't12-test1'], [16.5, 't16-dev2-new'], [19.6, 't19-dev2-destroyed'], [24, 't24-dev3'], [31, 't31-all-gone']]) {
    await slider.fill(String(t));
    await page.waitForTimeout(400);
    await page.locator('#simulator').screenshot({ path: `verifier/runs/inst-${name}.png` });
    console.log('saved', name);
  }
  await browser.close();
})();
