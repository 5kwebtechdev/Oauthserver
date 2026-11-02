const assert = require('node:assert/strict');
const { mkdirSync } = require('node:fs');
const { chromium } = require('playwright');

// Run against a built preview or production; all requests are read-only.
const base = process.env.SEO_REVIEW_URL || 'http://127.0.0.1:4328';
const screenshots = process.env.SEO_REVIEW_SCREENSHOTS || '/tmp/superme-seo-review';
const slug = 'the-productivity-reset-you-actually-need-right-now';
const intro = "Here's a pattern most 16–17 year olds know intimately:";

(async () => {
  mkdirSync(screenshots, { recursive: true });
  const about = await fetch(base + '/about');
  assert.equal(about.status, 200);
  const rawAbout = await about.text();
  assert.doesNotMatch(rawAbout, /class="team-card"|>\s*(Name|Designation)\s*</);
  assert.match(rawAbout, /<title>About SuperMeApp \| Personal Growth &amp; Productivity Platform<\/title>/);
  assert.match(rawAbout, /rel="canonical" href="https:\/\/supermeapp.com\/about"/);
  const team = await fetch(base + '/meet-the-team', { redirect: 'manual' });
  assert.equal(team.status, 301);
  assert.equal(team.headers.get('location'), '/about');
  const article = await fetch(base + '/article/' + slug);
  assert.equal(article.status, 200);
  const rawArticle = (await article.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
  assert.equal(rawArticle.split(intro).length - 1, 1);
  assert.match(rawArticle, /Published On:/);
  assert.match(rawArticle, /13 July 2026/);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const width of [360, 375, 390, 414, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.goto(base + '/', { waitUntil: 'networkidle' });
      const homepageHeading = width < 768
        ? page.locator('p:visible').filter({ hasText: 'Super App for Super You' }).first()
        : page.getByRole('heading', { name: 'Daily Routine Planner App' });
      assert.ok(await homepageHeading.isVisible(), `Homepage heading hidden at ${width}`);
      assert.ok((await homepageHeading.boundingBox()).height > 30, `Homepage heading collapsed at ${width}`);
      await page.goto(base + '/task-manager', { waitUntil: 'networkidle' });
      const taskHeading = page.getByRole('heading', { name: 'Task Manager' });
      assert.ok(await taskHeading.isVisible(), `Task Manager heading hidden at ${width}`);
      assert.ok((await taskHeading.boundingBox()).height > 20, `Task Manager heading collapsed at ${width}`);
      await page.goto(base + '/about', { waitUntil: 'networkidle' });
      assert.equal(await page.locator('.company-team').count(), 0);
      assert.equal(await page.locator('h1').count(), 1);
      assert.equal(await page.locator('a[href="/meet-the-team"]').count(), 0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `About overflow at ${width}`);
      await page.screenshot({ path: `${screenshots}/about-${width}.png`, fullPage: true });
      await page.goto(base + '/article/' + slug, { waitUntil: 'networkidle' });
      assert.equal((await page.locator('.body-content').innerText()).split(intro).length - 1, 1);
      assert.equal(await page.locator('h1').count(), 1);
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://supermeapp.com/article/' + slug);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Article overflow at ${width}`);
      const related = await page.locator('.related-grid a').count();
      await page.screenshot({ path: `${screenshots}/article-${width}.png`, fullPage: true });
      const refresh = await page.reload({ waitUntil: 'networkidle' });
      assert.equal(refresh.status(), 200);
      assert.equal((await page.locator('.body-content').innerText()).split(intro).length - 1, 1);
      console.log(`PASS ${width}px: About, article, refresh, canonical, no overflow; ${related} related links`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
