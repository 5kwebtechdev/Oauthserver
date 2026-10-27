// Uses the real selector stylesheet and compact-picker markup structure.
// Run with NODE_PATH pointing to an installed Playwright package if not local.
const fs = require('fs');
const http = require('http');
const path = require('path');
const assert = require('node:assert/strict');
const sass = require('sass');
const { chromium, webkit } = require('playwright');

const root = path.resolve(__dirname, '..');
const names = ['Excited', 'Happy', 'Calm', 'Anxious', 'Sad', 'Frustrated'];
const css = sass.compile(path.join(root, 'src/app/core/components/mood-selector/mood-selector.component.scss')).css.replaceAll(':host', '.fixture');
const html = `<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><style>
*{box-sizing:border-box}body{margin:0;background:#aaa;font-family:Arial,sans-serif}.fixture{position:absolute;bottom:0;width:100%}.home-mood-dialog__body{border-radius:32px 32px 0 0}
${css}</style><div class="fixture"><div class="home-mood-dialog__body"><header class="home-mood-dialog__heading"><h2>How are you feeling now?</h2><p>Select a mood to update your vibe.</p></header><div class="entry-mood-content"><div class="entry-mood-options">${names.map(n => `<button class="entry-mood-option"><span class="entry-mood-art"><img src="/assets/figma/child-home/moods/normalized-v1/${n.toLowerCase()}.svg" alt="${n}"></span><span class="entry-mood-label">${n}</span></button>`).join('')}</div><button class="entry-mood-submit">Set the Vibe</button></div></div></div>`;
const server = http.createServer((req, res) => {
  if (req.url === '/') { res.setHeader('Content-Type', 'text/html'); return res.end(html); }
  const file = path.resolve(root, 'www', '.' + req.url);
  if (!file.startsWith(path.join(root, 'www') + path.sep) || !fs.existsSync(file)) { res.statusCode = 404; return res.end(); }
  res.setHeader('Content-Type', 'image/svg+xml'); res.end(fs.readFileSync(file));
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const output = path.join(root, 'artifacts/mood-layout'); fs.mkdirSync(output, { recursive: true });
  const engines = [['chromium', chromium, { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' }]];
  if (fs.existsSync(webkit.executablePath())) engines.push(['webkit', webkit, {}]);
  else console.log('WebKit unavailable: iOS device rendering still requires verification.');
  for (const [name, engine, options] of engines) {
    const browser = await engine.launch({ headless: true, ...options });
    try {
      for (const width of [360, 375, 390, 414]) {
        const page = await browser.newPage({ viewport: { width, height: 844 }, deviceScaleFactor: 3, isMobile: true });
        await page.goto(`http://127.0.0.1:${server.address().port}`);
        await page.locator('img').evaluateAll(images => Promise.all(images.map(i => i.decode())));
        const sizes = await page.locator('.entry-mood-art img').evaluateAll(images => images.map(i => {
          const b = i.getBoundingClientRect(); return { width: b.width, height: b.height, top: b.top, fit: getComputedStyle(i).objectFit, loaded: i.naturalWidth };
        }));
        assert.equal(sizes.length, 6);
        for (const size of sizes) { assert.deepEqual(size, sizes[0]); assert.equal(size.fit, 'contain'); assert.equal(size.loaded, 100); }
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal overflow');
        const labels = await page.locator('.entry-mood-label').evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().top));
        assert(labels.every(top => top === labels[0]), 'Misaligned labels');
        await page.locator('.home-mood-dialog__body').screenshot({ path: path.join(output, `${name}-${width}.png`) });
        console.log(`${name} ${width}: all six images equal, loaded, labels aligned, no overflow`);
        await page.close();
      }
    } finally { await browser.close(); }
  }
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => server.close());
