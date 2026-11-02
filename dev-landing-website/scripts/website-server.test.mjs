import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { websiteRoutes } from './website-routes.mjs';
import { websiteServer } from './serve-website.mjs';

test('homepage raw metadata follows current admin SEO response without rebuilding', async () => {
  let current = { title: 'First admin title', description: 'First admin description', canonical: 'https://supermeapp.com/' };
  const calls = [];
  const server = websiteServer(resolve('dist/superme-website/browser'), websiteRoutes().patterns, {
    seoFetch: async url => {
      calls.push(String(url));
      return new Response(JSON.stringify(current), { status: 200 });
    }
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const title of ['First admin title', 'Updated admin title']) {
      const html = await (await fetch(base + '/')).text();
      assert.match(html, new RegExp(`<title>${title}<\\/title>`));
      assert.match(html, new RegExp(`<meta property="og:title" content="${title}">`));
      assert.match(html, new RegExp(`<meta name="twitter:title" content="${title}">`));
      assert.match(html, /<meta name="description" content="[^"]+">/);
      assert.match(html, /rel="canonical" href="https:\/\/supermeapp.com\/"/);
      current = { ...current, title: 'Updated admin title', description: 'Updated admin description' };
    }
    assert.equal(calls.length, 2);
    assert.ok(calls.every(url => new URL(url).searchParams.get('pageName') === 'https://supermeapp.com/'));
    const head = await fetch(base + '/', { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
  } finally { await new Promise(done => server.close(done)); }
});

test('real HTTP status codes for all defined routes, sitemap URLs and missing paths', async () => {
  const { paths, patterns } = websiteRoutes();
  // Production passes a directory URL, which resolves to a path ending in '/'.
  const server = websiteServer(resolve('dist/superme-website/browser') + '/', patterns);
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const sitemap = [...readFileSync('public/sitemap.xml', 'utf8').matchAll(/<loc>https:\/\/supermeapp.com([^<]*)<\/loc>/g)].map(m => m[1]);
    for (const path of new Set([...paths.filter(path => path !== '/article/:slug').map(path => path.replace(/:[^/]+/g, '123')), ...sitemap, '/blogs/', '/blogs?test=1', '/shop/books/class-1/english'])) {
      for (const method of ['GET', 'HEAD']) {
        const response = await fetch(base + path, { method, redirect: 'manual' });
        if (path === '/articles/123' || path === '/app/content/article/123') {
          assert.ok([301, 404].includes(response.status), `${method} ${path}`);
          if (response.status === 301) assert.match(response.headers.get('location'), /^\/article\/[^/]+$/);
          continue;
        }
        if (path === '/blogs/') {
          assert.equal(response.status, 301);
          assert.equal(response.headers.get('location'), '/blogs');
          continue;
        }
        if (['/articles', '/Articles', '/article', '/blog'].includes(path)) {
          assert.equal(response.status, 301, `${method} ${path}`);
          assert.equal(response.headers.get('location'), '/blogs');
          continue;
        }
        if (['/refund-and-cancellation', '/privacy', '/terms-use', '/meet-the-team', '/notes', '/list-your-business'].includes(path)) {
          assert.equal(response.status, 301, `${method} ${path}`);
          assert.equal(response.headers.get('location'), {
            '/refund-and-cancellation': '/refund-cancellation',
            '/privacy': '/privacy-policy',
            '/terms-use': '/terms-of-use',
            '/meet-the-team': '/about',
            '/notes': '/note-taking-app',
            '/list-your-business': '/advertise-with-us'
          }[path]);
          continue;
        }
        assert.equal(response.status, path === '/404' ? 404 : 200, `${method} ${path}`);
        if (method === 'GET') assert.match(await response.text(), /<app-root/);
      }
    }
    for (const path of ['/this-page-does-not-exist-12345', '/blogs/not-a-route', '/habit-tracker/unknown', '/auth/not-a-route', '/home/not-a-route', '/assets/missing.png', '/missing.js', '/this-page-does-not-exist-12345?test=1']) {
      for (const method of ['GET', 'HEAD']) {
        assert.equal((await fetch(base + path, { method, redirect: 'manual' })).status, 404, `${method} ${path}`);
      }
    }
    const missing = await fetch(base + '/this-page-does-not-exist-12345');
    const missingHtml = await missing.text();
    assert.match(missingHtml, /Oops! you took a wrong turn\./);
    assert.match(missingHtml, /Go to home/);
    assert.match(missingHtml, /<meta name="robots" content="noindex,follow">/);
    assert.doesNotMatch(missingHtml, /<link rel="canonical"/);
    assert.equal(missing.headers.get('x-robots-tag'), 'noindex, follow');
    assert.doesNotMatch(readFileSync('public/sitemap.xml', 'utf8'), /<loc>[^<]*\/404<\/loc>/);
    for (const [path, heading] of [['/habit-tracker', 'Habit'], ['/blogs', 'Blogs']]) {
      const html = await (await fetch(base + path)).text();
      assert.match(html, new RegExp(`<h1[^>]*>[^<]*${heading}`), `raw HTML heading for ${path}`);
      assert.match(html, new RegExp(`rel="canonical" href="https://supermeapp.com${path}"`));
      for (const policyPath of ['/child-safety', '/privacy-policy', '/cookie-policy']) {
        assert.match(html, new RegExp(`href="${policyPath}"`), `${path} footer links to ${policyPath}`);
      }
      assert.doesNotMatch(html, /href="\/app\/privacy-policy"|href="\/privacy-policy#cookies"/, `${path} has no stale public policy links`);
    }
    for (const file of ['robots.txt', 'sitemap.xml']) {
      const response = await fetch(base + '/' + file);
      assert.equal(response.status, 200);
      assert.equal(await response.text(), readFileSync('public/' + file, 'utf8'));
    }
    for (const file of ['assetlinks.json', 'apple-app-site-association']) {
      const path = `/.well-known/${file}`;
      for (const method of ['GET', 'HEAD']) {
        const response = await fetch(base + path, { method, redirect: 'manual' });
        assert.equal(response.status, 200, `${method} ${path}`);
        assert.match(response.headers.get('content-type') ?? '', /^application\/json(?:;|$)/, path);
        assert.equal(response.headers.get('location'), null, `${path} must not redirect`);
        if (method === 'GET') {
          assert.deepEqual(JSON.parse(await response.text()), JSON.parse(readFileSync(`public/.well-known/${file}`, 'utf8')));
        }
      }
    }
    console.log(`Verified ${paths.length} defined route patterns and ${sitemap.length} sitemap URLs`);
  } finally { await new Promise(done => server.close(done)); }
});

test('public policies render full initial HTML and legacy URLs redirect', async () => {
  const { patterns } = websiteRoutes();
  const server = websiteServer(resolve('dist/superme-website/browser'), patterns);
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const [path, title, heading, content] of [
      ['/privacy-policy', 'Privacy Policy', 'Privacy Policy', 'Collection of Personal Data'],
      ['/child-safety', 'Child Safety Policy', 'Child Safety, Our Top Priority', 'Mandatory Parental Consent'],
      ['/cookie-policy', 'Cookie Policy', 'Cookie Policy', 'cookies'],
      ['/terms-of-use', 'Terms of Use', 'Terms of Use', 'Description of Services'],
      ['/app/privacy-policy', 'Child Safety Policy', 'Child Safety, Our Top Priority', 'Mandatory Parental Consent'],
      ['/refund-cancellation', 'Refund &amp; Cancellation Policy', 'Refund &amp; Cancellation', 'processed to the original payment method']
    ]) {
      const response = await fetch(base + path);
      assert.equal(response.status, 200, path);
      const html = await response.text();
      assert.match(html, new RegExp(`<title>${title} \\| SuperMeApp<\\/title>`), path);
      assert.match(html, new RegExp(`rel="canonical" href="https://supermeapp.com${path}"`), path);
      assert.match(html, new RegExp(`<h1[^>]*>\\s*${heading}`), path);
      assert.match(html, new RegExp(content), path);
      assert.doesNotMatch(html, /Loading policy/i, path);
    }
    for (const [path, target] of [
      ['/privacy', '/privacy-policy'],
      ['/terms-use', '/terms-of-use'],
      ['/terms', '/terms-of-use'],
      ['/refund-and-cancellation', '/refund-cancellation']
    ]) {
      for (const method of ['GET', 'HEAD']) {
        const response = await fetch(base + path, { method, redirect: 'manual' });
        assert.equal(response.status, 301, `${method} ${path}`);
        assert.equal(response.headers.get('location'), target);
      }
    }
  } finally { await new Promise(done => server.close(done)); }
});

test('article hub aliases permanently redirect to the prerendered blogs hub', async () => {
  const { patterns } = websiteRoutes();
  const server = websiteServer(resolve('dist/superme-website/browser'), patterns);
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const path of ['/articles', '/articles/', '/Articles', '/article']) {
      for (const method of ['GET', 'HEAD']) {
        const response = await fetch(`${base}${path}?utm_source=audit`, { method, redirect: 'manual' });
        assert.equal(response.status, 301, `${method} ${path}`);
        assert.equal(response.headers.get('location'), '/blogs?utm_source=audit');
        assert.equal(await response.text(), '', 'aliases must not expose duplicate homepage HTML');
      }
    }
    const response = await fetch(`${base}/articles`);
    assert.equal(response.status, 200);
    assert.equal(new URL(response.url).pathname, '/blogs');
    const html = await response.text();
    assert.match(html, /<title>Blogs on Habits, Productivity and Growth \| SuperMeApp<\/title>/);
    assert.match(html, /<h1[^>]*>\s*Blogs\s*<\/h1>/);
    assert.match(html, /rel="canonical" href="https:\/\/supermeapp.com\/blogs"/);
    assert.match(html, /Explore parenting blogs with practical tips/);
    assert.doesNotMatch(html, /Super App for Super You/);
    assert.doesNotMatch(html, /href="\/articles"/);
  } finally { await new Promise(done => server.close(done)); }
});

test('obsolete singular blog route redirects to the blogs hub', async () => {
  const { patterns } = websiteRoutes();
  const server = websiteServer(resolve('dist/superme-website/browser'), patterns);
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const method of ['GET', 'HEAD']) {
      const response = await fetch(`${base}/blog?utm_source=old`, { method, redirect: 'manual' });
      assert.equal(response.status, 301);
      assert.equal(response.headers.get('location'), '/blogs?utm_source=old');
      assert.equal(await response.text(), '');
    }
  } finally { await new Promise(done => server.close(done)); }
});

test('legacy public aliases redirect and second-hand listing serves its own HTML', async () => {
  const { patterns } = websiteRoutes();
  const server = websiteServer(resolve('dist/superme-website/browser'), patterns);
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const [path, target] of [
      ['/notes', '/note-taking-app'],
      ['/list-your-business', '/advertise-with-us']
    ]) {
      for (const method of ['GET', 'HEAD']) {
        const response = await fetch(`${base}${path}?utm_source=old`, { method, redirect: 'manual' });
        assert.equal(response.status, 301, `${method} ${path}`);
        assert.equal(response.headers.get('location'), `${target}?utm_source=old`);
        assert.equal(await response.text(), '');
      }
      const destination = await fetch(`${base}${path}`);
      assert.equal(destination.status, 200);
      assert.equal(new URL(destination.url).pathname, target);
      assert.doesNotMatch(await destination.text(), /Super App for Super You/);
    }
    const listing = await fetch(`${base}/list-second-hand-books`);
    assert.equal(listing.status, 200);
    const html = await listing.text();
    assert.match(html, /<title>List Second-Hand Books \| SuperMeApp<\/title>/);
    assert.match(html, /<h1[^>]*>[\s\S]*?Second-Hand Books[\s\S]*?<\/h1>/);
    assert.match(html, /rel="canonical" href="https:\/\/supermeapp\.com\/list-second-hand-books"/);
    assert.doesNotMatch(html, /Super App for Super You/);
    const missing = await fetch(`${base}/unknown-public-page-9876`);
    assert.equal(missing.status, 404);
    assert.doesNotMatch(await missing.text(), /<link\b[^>]*rel="canonical"/);
  } finally { await new Promise(done => server.close(done)); }
});

test('shared public feature-page Google Play CTA uses the store URL', () => {
  const root = resolve('dist/superme-website/browser');
  for (const path of [
    'habit-tracker', 'task-manager', 'daily-journal', 'productivity-calendar',
    'quiz', 'puzzle', 'master-class', 'note-taking-app', 'reels',
    'school-uniforms', 'entrance-exam-books', 'general-books'
  ]) {
    const html = readFileSync(resolve(root, path, 'index.html'), 'utf8');
    const cta = html.match(/max-w-\[281px\]"?><a\b([^>]+)>/);
    assert.ok(cta, `${path}: feature CTA exists`);
    assert.match(cta[1], /href="https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.superme\.app"/, path);
    assert.match(cta[1], /target="_blank"/, path);
    assert.match(cta[1], /rel="noopener noreferrer"/, path);
    assert.match(html, /https:\/\/apps\.apple\.com\/us\/app\/supermeapp\/id6781971277/, `${path}: App Store remains`);
  }
});

test('article slug returns raw canonical metadata and unavailable articles return real errors', async () => {
  const { patterns } = websiteRoutes();
  const articleFetch = async url => {
    if (url.endsWith('/missing-article')) return { status: 404, ok: false };
    return {
      status: 200, ok: true,
      json: async () => ({ slug: 'believe-in-yourself', title: 'Believe in yourself', description: 'A useful article.' })
    };
  };
  const server = websiteServer(resolve('dist/superme-website/browser') + '/', patterns, { articleFetch });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(`${base}/article/believe-in-yourself`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /<title>Believe in yourself \| SuperMeApp<\/title>/);
    assert.match(html, /<link rel="canonical" href="https:\/\/supermeapp\.com\/article\/believe-in-yourself">/);
    assert.match(html, /<meta property="og:url" content="https:\/\/supermeapp\.com\/article\/believe-in-yourself">/);
    assert.equal((await fetch(`${base}/article/missing-article`)).status, 404);
    const redirect = await fetch(`${base}/article/old-slug`, { redirect: 'manual' });
    assert.equal(redirect.status, 301);
    assert.equal(redirect.headers.get('location'), '/article/believe-in-yourself');
    const oldPath = await fetch(`${base}/articles/believe-in-yourself`, { redirect: 'manual' });
    assert.equal(oldPath.status, 301);
    assert.equal(oldPath.headers.get('location'), '/article/believe-in-yourself');
  } finally { await new Promise(done => server.close(done)); }
});
