const SITE = 'https://supermeapp.com';
const FALLBACK_IMAGE = `${SITE}/assets/Images-Thumbnails/Image-Content-ThumbnailRandom.jpg`;

export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

const safeImage = value => {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : FALLBACK_IMAGE;
  } catch { return FALLBACK_IMAGE; }
};

const setMeta = (html, attribute, name, content) => {
  const tag = `<meta ${attribute}="${name}" content="${escapeHtml(content)}">`;
  const pattern = new RegExp(`<meta ${attribute}="${name}" content="[^"]*">`);
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace('</head>', `${tag}</head>`);
};

function documentWithContent(shell, { title, description, canonical, image, type = 'website', content }) {
  let html = shell
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${escapeHtml(canonical)}">`);
  for (const [attribute, name, value] of [
    ['name', 'description', description],
    ['property', 'og:type', type],
    ['property', 'og:title', title],
    ['property', 'og:description', description],
    ['property', 'og:url', canonical],
    ['property', 'og:image', image],
    ['property', 'og:image:secure_url', image],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'twitter:title', title],
    ['name', 'twitter:description', description],
    ['name', 'twitter:image', image]
  ]) html = setMeta(html, attribute, name, value);
  html = html.replace(/<meta property="og:image:(?:width|height|type)" content="[^"]*">/g, '');
  // Angular re-renders this page after bootstrap; ngSkipHydration avoids
  // reconciling API-driven request HTML against a different build-time page.
  return html.replace('<app-root></app-root>', `<app-root ngSkipHydration>${content}</app-root>`);
}

const dateText = value => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? '' : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
};

const pageUrl = page => page === 0 ? '/blogs' : `/blogs?page=${page}`;

const sharedStyle = `<style data-public-articles>
  .public-articles { width:min(1200px,calc(100% - 32px)); margin:0 auto; padding:96px 0 72px; font-family:Nunito,Arial,sans-serif; color:#292329 }
  .public-articles h1 { font-size:clamp(34px,5vw,54px); color:#412479; text-align:center; margin:0 0 12px }
  .public-articles .intro { text-align:center; max-width:800px; margin:0 auto 42px; color:#615d64; line-height:1.55 }
  .public-articles .grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:24px }
  .public-articles article { border:1px solid #eee9f3; border-radius:20px; overflow:hidden; box-shadow:0 8px 26px rgba(57,35,85,.07) }
  .public-articles article a { display:block; color:inherit; text-decoration:none }
  .public-articles article img { display:block; width:100%; aspect-ratio:16/10; object-fit:cover }
  .public-articles article .card-body { padding:20px }
  .public-articles article h2 { font-size:22px; margin:8px 0; line-height:1.3 }
  .public-articles article p { color:#67616b; line-height:1.5 }
  .public-articles .pagination { display:flex; justify-content:center; gap:16px; margin-top:36px }
  .public-articles .pagination a { color:#493078 }
  .public-articles .detail { max-width:760px; margin:auto; font-size:17px; line-height:1.8 }
  .public-articles .detail h1 { text-align:left; line-height:1.25 }
  .public-articles .detail img { max-width:100%; border-radius:16px }
  @media(max-width:900px){.public-articles .grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:600px){.public-articles{width:min(100% - 24px,440px)}.public-articles .grid{grid-template-columns:1fr}}
</style>`;

export function archiveHtml(shell, data, page) {
  const articles = Array.isArray(data.articles) ? data.articles.filter(article => article?.slug && article?.title) : [];
  const cards = articles.map(article => {
    const url = `/article/${encodeURIComponent(article.slug)}`;
    const image = safeImage(article.imageUrl);
    const published = dateText(article.publishedDate);
    return `<article><a href="${escapeHtml(url)}"><img src="${escapeHtml(image)}" alt="${escapeHtml(article.title)}" loading="lazy"><div class="card-body">
      ${article.category ? `<span>${escapeHtml(article.category)}</span>` : ''}
      <h2>${escapeHtml(article.title)}</h2>
      ${article.excerpt ? `<p>${escapeHtml(article.excerpt)}</p>` : ''}
      <small>${escapeHtml(article.author || '')}${published ? ` · <time datetime="${escapeHtml(article.publishedDate)}">${escapeHtml(published)}</time>` : ''}</small>
    </div></a></article>`;
  }).join('');
  const totalPages = Number(data.totalPages) || 0;
  const pagination = totalPages > 1 ? `<nav class="pagination" aria-label="Article pages">
    ${page > 0 ? `<a href="${pageUrl(page - 1)}" rel="prev">Previous</a>` : ''}
    <span>Page ${page + 1} of ${totalPages}</span>
    ${data.hasNext ? `<a href="${pageUrl(page + 1)}" rel="next">Next</a>` : ''}
  </nav>` : '';
  const content = `${sharedStyle}<main class="public-articles"><p><a href="/">SuperMeApp</a></p><h1>Blogs</h1>
    <p class="intro">Big ideas. Short reads. Explore parenting blogs with practical tips and fresh perspectives to support your family, one small step at a time.</p>
    ${cards ? `<section class="grid" aria-label="Articles">${cards}</section>` : '<p>No articles are available yet.</p>'}
    ${pagination}</main>`;
  return documentWithContent(shell, {
    title: page ? `Blogs — Page ${page + 1} | SuperMeApp` : 'Blogs on Habits, Productivity and Growth | SuperMeApp',
    description: 'Explore parenting blogs with practical tips and fresh perspectives to support your family, one small step at a time.',
    canonical: `${SITE}${pageUrl(page)}`,
    image: FALLBACK_IMAGE,
    content
  });
}

function plainArticleContent(html) {
  return String(html ?? '')
    .replace(/<(script|style|iframe)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<\s*\/?\s*(?:p|h[1-6]|div|li|br|blockquote)\b[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .split(/\n+/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map(line => `<p>${escapeHtml(line)}</p>`)
    .join('');
}

export function articleHtml(shell, article) {
  const canonical = `${SITE}/article/${encodeURIComponent(article.slug)}`;
  const title = `${article.title} | SuperMeApp`;
  const description = article.description || 'Read this article on SuperMeApp.';
  const image = safeImage(article.thumbnailUrl || article.imageUrl);
  const published = dateText(article.publishedAt || article.publishedDate);
  const content = `${sharedStyle}<main class="public-articles"><div class="detail">
    <p><a href="/blogs">← Back to Blogs</a></p><article><h1>${escapeHtml(article.title)}</h1>
    <p>${escapeHtml(description)}</p>
    ${published ? `<p><time datetime="${escapeHtml(article.publishedAt || article.publishedDate)}">${escapeHtml(published)}</time></p>` : ''}
    ${image !== FALLBACK_IMAGE ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(article.title)}">` : ''}
    <div>${plainArticleContent(article.content)}</div></article></div></main>`;
  return documentWithContent(shell, { title, description, canonical, image, type: 'article', content });
}
