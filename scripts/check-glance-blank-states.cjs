// Run while the focused Karma server is running (see tsconfig.glance-spec.json).
// PLAYWRIGHT_MODULE can point to a locally installed Playwright package.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
(async () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'superme-glance-'));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await page.addInitScript(() => { window.__GLANCE_VISUAL__ = true; });
  page.on('pageerror', error => console.error(error.message));
  await page.goto('http://localhost:9876/debug.html');
  await page.waitForFunction(() => typeof window.renderGlanceVisual === 'function', { timeout: 120000 });
  await page.evaluate(() => { document.body.style.display = 'block'; });
  const states = ['habits-empty', 'habits-completed', 'habits-passed', 'tasks-empty', 'tasks-completed',
    'tasks-passed', 'timetable-empty', 'all-empty', 'all-completed', 'all-passed', 'all-mixed-passed'];
  const measurements = [];
  for (const width of [390, 320, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const key of states) {
      await page.evaluate(({key, width}) => window.renderGlanceVisual(key, width), {key, width});
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(Array.from(document.querySelectorAll('[data-visual-fixture] img')).map(img => img.decode()));
      });
      const card = page.locator('[data-visual-fixture] .glance-card');
      const metrics = await card.evaluate(el => ({
        width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height,
        overflow: el.scrollWidth > el.clientWidth,
        background: getComputedStyle(el).backgroundColor,
        images: Array.from(el.querySelectorAll('img')).map(img => ({
          src: img.getAttribute('src'), loaded: img.naturalWidth > 0,
          width: img.getBoundingClientRect().width, height: img.getBoundingClientRect().height
        })),
        tabs: Array.from(el.querySelectorAll('[role=tab]')).map(tab => ({
          clipped: tab.scrollWidth > tab.clientWidth, height: tab.getBoundingClientRect().height
        }))
      }));
      measurements.push({key, viewport: width, ...metrics});
      if (metrics.overflow || metrics.images.some(img => !img.loaded) || metrics.tabs.some(tab => tab.clipped)) {
        throw new Error(`Layout/assets failed: ${key} at ${width}px: ${JSON.stringify(metrics)}`);
      }
      if (width === 390) await card.screenshot({ path: path.join(output, key + '.png') });
    }
  }
  await page.evaluate(() => window.finishGlanceVisual());
  fs.writeFileSync(path.join(output, 'measurements.json'), JSON.stringify(measurements, null, 2));
  console.log(output);
  console.log('PASS: all 11 states at 390, 320 and 430px; all assets loaded; no clipped tabs or horizontal overflow');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
