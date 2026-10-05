// Run after `ng build --configuration development`. Requires Playwright and
// Chrome; it does not authenticate or send requests to the production API.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../www');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '');
  let file = path.resolve(root, relative || 'index.html');
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  let count = 0;
  const failures = [];
  try {
    const page = await browser.newPage();
    await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
    await page.goto(origin + '/login');
    await page.locator('#login-email').waitFor({ state: 'visible' });
    for (const width of [320, 360, 390, 412, 600, 768]) {
      for (const height of [800, 320]) {
        for (const scale of [1, 2]) {
          await page.setViewportSize({ width, height });
          await page.evaluate(scale => document.documentElement.style.fontSize = `${16 * scale}px`, scale);
          await page.locator('#login-email').fill('not-a-valid-address-with-a-long-name');
          await page.locator('#login-password').fill('ExampleOnly123');
          await page.locator('#login-email').focus();
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const errors = await page.evaluate(async () => {
            const issues = [];
            const content = document.querySelector('ion-content');
            const scroll = await content.getScrollElement();
            if (scroll.scrollWidth > scroll.clientWidth + 1) issues.push(`page overflow ${scroll.scrollWidth}/${scroll.clientWidth}`);
            for (const selector of ['.login-title', '.login-error', '.login-primary-btn', '.login-input-wrap', '.login-password-wrap']) {
              const el = document.querySelector(selector);
              if (!el) { issues.push(`missing ${selector}`); continue; }
              if (el.scrollWidth > el.clientWidth + 1) issues.push(`${selector} horizontal clipping`);
              if (el.scrollHeight > el.clientHeight + 1) issues.push(`${selector} vertical clipping`);
            }
            for (const el of document.querySelectorAll('.login-form input')) {
              const css = getComputedStyle(el);
              if (el.clientHeight < parseFloat(css.lineHeight)) issues.push('input line clipped');
            }
            const button = document.querySelector('.login-primary-btn');
            button.scrollIntoView({ block: 'center' });
            const rect = button.getBoundingClientRect();
            if (rect.bottom > innerHeight + 1 || rect.top < -1) issues.push('Login button unreachable');
            return issues;
          });
          if (errors.length) failures.push({ width, height, scale, errors });
          count++;
        }
      }
    }
    console.log(JSON.stringify({ cases: count, failures, note: 'Actual login route; reduced viewport and root font simulation, not native keyboard/font-scale proof.' }, null, 2));
    if (failures.length) process.exitCode = 1;
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
