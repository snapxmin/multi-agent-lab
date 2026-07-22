// E2E test for the deployed GitHub Pages site using local Edge via CDP.
const { chromium } = require('playwright-core');

const BASE = 'https://snapxmin.github.io/multi-agent-lab/';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  const browser = await chromium.launch({ executablePath: EDGE, headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('requestfailed', (r) => failedRequests.push(`${r.url()} :: ${r.failure()?.errorText}`));
  page.on('response', (r) => r.status() >= 400 && failedRequests.push(`${r.url()} :: HTTP ${r.status()}`));

  const results = [];
  const check = (name, ok, detail = '') =>
    results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);

  // 1. Home page loads and renders
  await page.goto(BASE, { waitUntil: 'load' });
  const rootChildren = await page.locator('#root > *').count();
  check('首页渲染非空白', rootChildren > 0, `#root 子节点 ${rootChildren} 个`);
  check('标题正确', (await page.title()).includes('Multi-Agent'), await page.title());

  // 2. Click "进入架构模拟器" and verify page stays rendered + scrolls to #simulator
  const heroBtn = page.getByRole('link', { name: '进入架构模拟器' }).first();
  await heroBtn.click();
  await page.waitForTimeout(1200);
  const afterClickChildren = await page.locator('#root > *').count();
  check('点击后页面未变白', afterClickChildren > 0, `#root 子节点 ${afterClickChildren} 个`);
  const simVisible = await page.locator('#simulator').isVisible();
  check('模拟器区块存在且可见', simVisible);
  const scrollInfo = await page.evaluate(() => {
    const el = document.querySelector('#simulator');
    const rect = el.getBoundingClientRect();
    return { scrollY: window.scrollY, top: Math.round(rect.top), hash: location.hash };
  });
  check('点击后滚动到模拟器区块', scrollInfo.scrollY > 100 && scrollInfo.top < 900,
    `scrollY=${Math.round(scrollInfo.scrollY)}, top=${scrollInfo.top}, hash=${scrollInfo.hash}`);

  // 3. Simulator interactive controls render
  const simText = await page.locator('#simulator').innerText();
  check('模拟器包含拓扑/控制内容', simText.length > 50, `文本长度 ${simText.length}`);

  // 4. Nav anchor links work too (八维对比 / 竞速实验室)
  for (const [name, id] of [['八维对比', '#comparison'], ['竞速实验室', '#race']]) {
    await page.getByRole('link', { name }).first().click();
    await page.waitForTimeout(1000);
    const visible = await page.locator(id).isVisible();
    const y = await page.evaluate(() => window.scrollY);
    const ok = visible && (await page.locator('#root > *').count()) > 0;
    check(`导航「${name}」跳转后页面正常`, ok, `scrollY=${Math.round(y)}`);
  }

  // 5. No console errors / failed requests
  check('无 JS 运行时错误', pageErrors.length === 0, pageErrors[0] || '');
  check('无 console.error', consoleErrors.length === 0, consoleErrors[0] || '');
  check('无失败/4xx+ 资源请求', failedRequests.length === 0, failedRequests[0] || '');

  // 6. Direct deep-link load with hash (刷新/分享链接场景)
  await page.goto(BASE + '#race', { waitUntil: 'load' });
  check('带 hash 直接访问页面正常渲染', (await page.locator('#root > *').count()) > 0);

  await page.screenshot({ path: 'e2e-simulator-clicked.png' });

  console.log(results.join('\n'));
  const failed = results.filter((r) => r.startsWith('FAIL')).length;
  console.log(`\n${results.length - failed}/${results.length} 项通过`);
  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('E2E crashed:', e); process.exit(2); });
