const assert = require('node:assert/strict');
const { mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const { websiteServer } = await import('./serve-website.mjs');
  const { websiteRoutes } = await import('./website-routes.mjs');
  const article = { id: 901, slug: 'review-article', title: 'A long article title about building small habits and making meaningful progress every day', description: 'A dynamic description from the article API.', publishedBy: 'Test Editor', publishedAt: '2026-10-13T08:00:00', thumbnailUrl: '/assets/images/article-image.png', content: '<h1>Authored body heading</h1><h2>Section</h2><h3>Subsection</h3><p>' + 'A long paragraph for responsive reading. '.repeat(100) + '</p><img src="/assets/images/article-image.png" alt="In-content image"><a href="/habit-tracker">Habit tracker</a>', tags: ['Habits'] };
  const summary = { id: article.id, slug: article.slug, title: article.title, imageUrl: article.thumbnailUrl, publishedDate: article.publishedAt, author: article.publishedBy, category: 'Motivation' };
  const second = { ...article, id: 902, slug: 'second-review', title: 'Second dynamic article', publishedBy: null, publishedAt: null, thumbnailUrl: null, content: '<h2>A different section</h2><p>Related article body.</p>' };
  const secondSummary = { ...summary, id: second.id, slug: second.slug, title: second.title, imageUrl: null, author: null, publishedDate: null };
  const response = url => {
    const u = new URL(url);
    if (u.pathname.endsWith('/public/articles')) {
      const page = Number(u.searchParams.get('page') || 0);
      return { articles: page === 0 ? [summary, secondSummary] : page === 1 ? [summary] : [], page, size: 20, totalElements: 21, totalPages: 2, hasNext: page === 0 };
    }
    if (u.pathname.endsWith('/review-article')) return article;
    if (u.pathname.endsWith('/second-review')) return second;
    return null;
  };
  const server = websiteServer(resolve('dist/superme-website/browser'), websiteRoutes().patterns, {
    articleFetch: async url => { const data = response(url); return new Response(JSON.stringify(data), { status: data ? 200 : 404 }); }
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const screenshots = mkdtempSync(join(tmpdir(), 'superme-blog-review-'));
  try {
    const raw = await (await fetch(base + '/article/review-article')).text();
    assert.equal((raw.match(/<h1\b/g) || []).length, 1);
    assert.match(raw, /<h2>Authored body heading<\/h2>/);
    assert.match(raw, /Published By:/);
    assert.match(raw, /Test Editor/);
    assert.match(raw, /13 October 2026/);
    assert.match(raw, /article-schema/);
    assert.match(raw, /In-content image/);
    for (const width of [360, 375, 390, 414, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      await page.route('https://api.supermeapp.com/**', route => {
        const data = response(route.request().url());
        return route.fulfill({ status: data ? 200 : 404, contentType: 'application/json', body: JSON.stringify(data) });
      });
      await page.goto(base + '/article/review-article', { waitUntil: 'networkidle' });
      await page.locator('.article-title').waitFor({ state: 'visible' });
      assert.equal(await page.locator('h1').count(), 1);
      assert.equal(await page.locator('.article-title').innerText(), article.title);
      assert.equal(await page.locator('.body-content h2').count(), 2);
      assert.equal(await page.locator('.body-content img').count(), 1);
      assert.ok(await page.locator('.article-featured-image').isVisible());
      assert.match(await page.locator('.article-byline').innerText(), /Published By: Test Editor/);
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://supermeapp.com/article/review-article');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `overflow at ${width}`);
      await page.screenshot({ path: join(screenshots, `article-${width}.png`), fullPage: true });
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(await page.locator('h1').count(), 1);
      assert.match(await page.locator('.article-tags').innerText(), /Habits/);
      assert.equal(await page.locator('.related-grid a[href="/article/review-article"]').count(), 0);
      await page.locator('.related-grid a[href="/article/second-review"]').click();
      await page.waitForURL('**/article/second-review');
      await page.getByRole('heading', { level: 1, name: second.title, exact: true }).waitFor();
      assert.equal(await page.locator('.article-byline').count(), 0);
      assert.equal(await page.locator('.article-featured-image').count(), 0);
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://supermeapp.com/article/second-review');
      await page.getByRole('button', { name: 'Back to Blogs' }).click();
      await page.waitForURL('**/article/review-article');
      await page.getByRole('heading', { level: 1, name: article.title, exact: true }).waitFor();
      await page.getByRole('button', { name: 'Back to Blogs' }).click();
      await page.waitForURL('**/blogs');
      await page.locator('.article-card').first().waitFor({ state: 'visible' });
      assert.ok(await page.locator('.article-card').count() > 0);
      await page.goto(base + '/blogs?page=1', { waitUntil: 'networkidle' });
      await page.locator('.article-card a').first().click();
      await page.waitForURL('**/article/review-article');
      await page.getByRole('button', { name: 'Back to Blogs' }).click();
      await page.waitForURL('**/blogs?page=1');
      const missing = await page.goto(base + '/article/missing-review', { waitUntil: 'networkidle' });
      assert.equal(missing.status(), 404);
      assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex,follow');
      assert.equal(await page.locator('link[rel="canonical"]').count(), 0);
      console.log(`PASS ${width}px: HTML, headings, images, byline, tags, related navigation/back, missing fields, pagination, refresh, 404, no overflow`);
      await context.close();
    }
    console.log(`Screenshots: ${screenshots}`);
  } finally { await browser.close(); await new Promise(done => server.close(done)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
