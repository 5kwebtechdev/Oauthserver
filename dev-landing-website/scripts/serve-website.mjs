import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import serve from 'serve-handler';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

const notFoundHtml = root => readFileSync(resolve(root, '404/index.html'), 'utf8')
  .replace(/<link\b(?=[^>]*\brel="canonical")[^>]*>\s*/i, '');


function homepageHtml(shell, config) {
  if (!config || typeof config !== 'object') return shell;
  const title = typeof config.title === 'string' ? config.title.trim() : '';
  const description = typeof config.description === 'string' ? config.description.trim() : '';
  const canonical = typeof config.canonical === 'string' && /^https:\/\/supermeapp\.com\/?$/.test(config.canonical.trim())
    ? config.canonical.trim() : 'https://supermeapp.com/';
  let html = shell;
  if (title) html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
  for (const [attribute, name, value] of [
    ['name', 'description', description],
    ['property', 'og:title', title],
    ['property', 'og:description', description],
    ['property', 'og:url', canonical],
    ['name', 'twitter:title', title],
    ['name', 'twitter:description', description]
  ]) {
    if (value) html = html.replace(new RegExp(`<meta ${attribute}="${name}" content="[^"]*">`),
      `<meta ${attribute}="${name}" content="${escapeHtml(value)}">`);
  }
  return html.replace(/<link rel="canonical" href="[^"]*">/,
    `<link rel="canonical" href="${escapeHtml(canonical)}">`);
}

export function websiteServer(root, patterns, { articleFetch = fetch, articleApiBase = 'https://api.supermeapp.com/v1', seoFetch = fetch, seoApiBase = 'https://api.supermeapp.com/v1' } = {}) {
  root = resolve(root);
  const renderPublic = async (request, context) => {
    const { renderPublicRequest } = await import(pathToFileURL(resolve(root, '../server/server.mjs')).href);
    const rendered = await renderPublicRequest(request, context);
    if (!rendered || !rendered.ok) throw new Error('Public page render failed');
    return rendered.text();
  };
  const publicGet = path => articleFetch(`${articleApiBase}/public/articles${path}`, {
    headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000)
  });
  const articleNotFound = (request, response) => {
    response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex, follow', 'Cache-Control': 'no-cache' });
    const page = resolve(root, '404/index.html');
    response.end(request.method === 'HEAD' ? undefined : existsSync(page) ? notFoundHtml(root) : 'Article not found');
  };
  const routes = patterns.map(pattern => new RegExp(pattern));
  return createServer((request, response) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
    catch { response.writeHead(400); response.end('Bad Request'); return; }
    // Apple's extensionless association file must be served as JSON.
    if (pathname === '/.well-known/apple-app-site-association') {
      response.setHeader('Content-Type', 'application/json');
    }
    // Preserve Angular matrix parameters without allowing extra path segments.
    const routePath = pathname.split('/').map(segment => segment.split(';')[0]).join('/');
    if (routePath === '/' && ['GET', 'HEAD'].includes(request.method)) {
      void (async () => {
        try {
          const shell = readFileSync(resolve(root, 'index.html'), 'utf8');
          const url = new URL(`${seoApiBase}/metatags/by-page`);
          url.searchParams.set('pageName', 'https://supermeapp.com/');
          const result = await seoFetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(3000) });
          const html = homepageHtml(shell, result.ok ? await result.json() : null);
          response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
          response.end(request.method === 'HEAD' ? undefined : html);
        } catch {
          // Keep the last successfully prerendered homepage available if SEO API is down.
          try {
            response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
            response.end(request.method === 'HEAD' ? undefined : readFileSync(resolve(root, 'index.html'), 'utf8'));
          } catch { response.writeHead(503); response.end('Homepage temporarily unavailable'); }
        }
      })();
      return;
    }
    const legacyPolicyTarget = {
      '/meet-the-team': '/about',
      '/privacy': '/privacy-policy',
      '/terms-use': '/terms-of-use',
      '/terms': '/terms-of-use',
      '/refund-and-cancellation': '/refund-cancellation',
      '/notes': '/note-taking-app',
      '/list-your-business': '/advertise-with-us'
    }[routePath.replace(/\/$/, '')];
    if (routePath === '/blog' && ['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(301, { Location: `/blogs${new URL(request.url, 'http://localhost').search}` });
      response.end();
      return;
    }
    if (legacyPolicyTarget && ['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(301, { Location: `${legacyPolicyTarget}${new URL(request.url, 'http://localhost').search}` });
      response.end();
      return;
    }
    // These hub aliases have no prerendered document. Redirect before the
    // general SPA fallback can serve the homepage at an articles URL.
    if (/^\/(?:articles|Articles|article)\/?$/.test(routePath) && ['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(301, { Location: `/blogs${new URL(request.url, 'http://localhost').search}` });
      response.end();
      return;
    }
    const oldArticleMatch = /^\/articles\/([^/]+)\/?$/.exec(routePath);
    if (oldArticleMatch && !/^\d+$/.test(oldArticleMatch[1]) && ['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(301, { Location: `/article/${encodeURIComponent(oldArticleMatch[1])}${new URL(request.url, 'http://localhost').search}` });
      response.end();
      return;
    }
    // Resolve old public numeric links from the public feed, never from a guessed slug.
    const legacyId = /^\/(?:articles|app\/content\/article)\/([1-9]\d*)\/?$/.exec(routePath);
    if (legacyId && ['GET', 'HEAD'].includes(request.method)) {
      void (async () => {
        try {
          for (let page = 0; page < 100; page++) {
            const result = await publicGet(`?page=${page}&size=20`);
            if (!result.ok) throw new Error('Feed unavailable');
            const data = await result.json();
            const article = data.articles?.find(item => Number(item.id) === Number(legacyId[1]) && item.slug);
            if (article) {
              response.writeHead(301, { Location: `/article/${encodeURIComponent(article.slug)}${new URL(request.url, 'http://localhost').search}` });
              response.end(); return;
            }
            if (!data.hasNext) break;
          }
          articleNotFound(request, response);
        } catch { response.writeHead(503); response.end('Articles temporarily unavailable'); }
      })();
      return;
    }
    if (/^\/blogs\/?$/.test(routePath) && ['GET', 'HEAD'].includes(request.method)) {
      void (async () => {
        const raw = new URL(request.url, 'http://localhost').searchParams.get('page');
        if (raw !== null && (!/^(0|[1-9]\d*)$/.test(raw) || Number(raw) > 10000)) {
          response.writeHead(404, { 'X-Robots-Tag': 'noindex, follow' }); response.end('Article page not found'); return;
        }
        const page = Number(raw || 0);
        if (raw === '0' || routePath.endsWith('/')) {
          response.writeHead(301, { Location: page ? `/blogs?page=${page}` : '/blogs' }); response.end(); return;
        }
        try {
          const result = await publicGet(`?page=${page}&size=20`);
          if (!result.ok) throw new Error('Feed unavailable');
          const data = await result.json();
          if (!Array.isArray(data.articles) || page > 0 && page >= data.totalPages) {
            response.writeHead(404, { 'X-Robots-Tag': 'noindex, follow' }); response.end('Article page not found'); return;
          }
          const html = await renderPublic(request, { archive: data, articleFetch: publicGet });
          response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
          response.end(request.method === 'HEAD' ? undefined : html);
        } catch (error) {
          console.error('Public blogs render failed:', error.message);
          response.writeHead(503); response.end('Articles temporarily unavailable');
        }
      })();
      return;
    }
    const articleMatch = /^\/article\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(routePath);
    if (/^\/article\/[^/]+\/?$/.test(routePath) && !articleMatch && ['GET', 'HEAD'].includes(request.method)) {
      articleNotFound(request, response); return;
    }
    if (articleMatch && ['GET', 'HEAD'].includes(request.method)) {
      void (async () => {
        try {
          const result = await articleFetch(`${articleApiBase}/public/articles/${encodeURIComponent(articleMatch[1])}`, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(8000)
          });
          if (result.status === 404) { articleNotFound(request, response); return; }
          if (!result.ok) { response.writeHead(503); response.end('Article temporarily unavailable'); return; }
          const article = await result.json();
          if (!article?.slug || !article?.title) { response.writeHead(502); response.end('Invalid article response'); return; }
          if (article.slug !== articleMatch[1]) {
            response.writeHead(301, { Location: `/article/${encodeURIComponent(article.slug)}` });
            response.end();
            return;
          }
          const html = await renderPublic(request, { article, articleFetch: publicGet });
          response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
          response.end(request.method === 'HEAD' ? undefined : html);
        } catch {
          response.writeHead(503);
          response.end('Article temporarily unavailable');
        }
      })();
      return;
    }
    const known = routes.some(route => route.test(routePath));
    if (['GET', 'HEAD'].includes(request.method) && (routePath === '/404' || (!known && !routePath.startsWith('/.well-known/') && !/\.[^/]+$/.test(routePath)))) {
      try {
        const html = notFoundHtml(root);
        response.writeHead(404, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
          'X-Robots-Tag': 'noindex, follow'
        });
        response.end(request.method === 'HEAD' ? undefined : html);
      } catch {
        response.writeHead(404, { 'X-Robots-Tag': 'noindex, follow' });
        response.end('Page not found');
      }
      return;
    }
    if (known && ['GET', 'HEAD'].includes(request.method)) {
      const prerendered = resolve(root, `.${routePath}`, 'index.html');
      request.url = prerendered.startsWith(root + '/') && existsSync(prerendered)
        ? `${routePath.replace(/\/$/, '')}/index.html`
        : '/index.html';
    }
    // No blanket SPA rewrite: missing files and unknown paths return real 404s.
    serve(request, response, { public: root, cleanUrls: false, directoryListing: false, renderSingle: false })
      .catch(() => { if (!response.headersSent) response.writeHead(500); response.end(); });
  });
}

if (process.env.pm_id !== undefined || (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)) {
  const { patterns } = JSON.parse(readFileSync(new URL('../dist/superme-website/routes.json', import.meta.url)));
  websiteServer(fileURLToPath(new URL('../dist/superme-website/browser/', import.meta.url)), patterns)
    .listen(Number(process.env.PORT || 4200), '127.0.0.1');
}
