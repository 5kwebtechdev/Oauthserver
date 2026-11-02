// Run after the production build. Playwright and Chrome must be available.
const assert = require('node:assert/strict');
const { mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const { websiteServer } = await import('./serve-website.mjs');
  const { websiteRoutes } = await import('./website-routes.mjs');
  const server = websiteServer(resolve('dist/superme-website/browser'), websiteRoutes().patterns);
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const screenshots = mkdtempSync(join(tmpdir(), 'superme-articles-hub-'));
  const checkHeading = async page => {
    await page.locator('h1').waitFor({ state: 'visible' });
    assert.equal(await page.locator('h1').count(), 1);
    // The SEO service expands the authored H1 with the approved API heading
    // after hydration; both must stay specific to the Blogs hub.
    assert.match((await page.locator('h1').innerText()).trim(), /^Blogs(?: on Habits, Productivity and Personal Growth)?$/);
  };
  try {
    for (const width of [1440, 360, 375, 390, 414]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      // Exercise the generated frontend without authentication or writes to APIs.
      await page.route('**/*', route => route.request().url().startsWith(origin)
        ? route.continue() : route.abort());
      const response = await page.goto(`${origin}/articles`, { waitUntil: 'networkidle' });
      assert.equal(response.status(), 200);
      assert.equal(new URL(page.url()).pathname, '/blogs');
      await checkHeading(page);
      assert.equal(await page.title(), 'Blogs on Habits, Productivity and Growth | SuperMeApp');
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://supermeapp.com/blogs');
      await page.reload({ waitUntil: 'networkidle' });
      await checkHeading(page);
      assert.equal(await page.locator('a[href="/articles"]').count(), 0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `overflow at ${width}`);
      await page.screenshot({ path: join(screenshots, `blogs-${width}.png`), fullPage: true });

      await page.goto(`${origin}/habit-tracker`, { waitUntil: 'networkidle' });
      if (width < 900) {
        await page.getByRole('button', { name: 'Open menu', exact: true }).click();
        await page.locator('.mobile-navigation').getByRole('link', { name: 'Parenting', exact: true }).click();
      } else {
        await page.locator('.desktop-navigation').getByRole('button', { name: 'Parenting', exact: true }).click();
      }
      await page.waitForURL('**/blogs');
      await checkHeading(page);
      await page.goBack({ waitUntil: 'networkidle' });
      assert.equal(new URL(page.url()).pathname, '/habit-tracker');
      console.log(`PASS ${width}px: redirect, refresh, title/H1/canonical, Parenting navigation, Back, no overflow`);
      await context.close();
    }
    console.log(`Screenshots: ${screenshots}`);
  } finally {
    await browser.close();
    await new Promise(done => server.close(done));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
