# SEO module

Dynamic, API-driven page metadata (title, description, keywords, canonical, Open Graph, Twitter card, heading tags) applied per-route on the client. No hardcoded per-page SEO remains in the codebase.

## Data model

`src/app/core/models/metatag.model.ts`

```ts
export interface MetaTagConfig {
  id: number;
  pageName: string;
  title: string;
  description: string;
  keywords: string;
  robots?: string;
  canonical?: string;
  author?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogUrl?: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  h1?: string;
  h2?: string;
  h3?: string;
  h4?: string;
  h5?: string;
  h6?: string;
}
```

`pageName` is the absolute page URL (e.g. `https://supermeapp.com/habit`) — it's both what the backend stores and what the frontend sends as the lookup key.

## API

`SeoService` fetches metadata for one page at a time:

```
GET {environment.apiUrl}/metatags/by-page?pageName=<absolute page URL>   ->  MetaTagConfig
```

e.g. `GET https://api.supermeapp.com/v1/metatags/by-page?pageName=https%3A%2F%2Fsupermeapp.com%2Fhabit`

- `environment.apiUrl` is `https://api.supermeapp.com/v1` (prod) — see `src/environments/environment.ts`.
- The `pageName` param is always built as `https://supermeapp.com<path>` regardless of the origin the app is actually running on (so local/staging builds still query using the production URL the backend has rows for).
- Each page's response is cached in-memory per URL via `shareReplay(1)` for the lifetime of the app (no `TransferState`/SSR caching, since there is no server render), so revisiting a page doesn't refire the request.
- On request failure, the service logs the error and falls back to `null` — that route then uses the built-in fallback title/description (see below), never a hardcoded per-page value.

## Where it's wired in

- **Service**: `src/app/core/services/seo.service.ts`
- **Resolver**: `src/app/core/guards/seo.resolver.ts` — a functional `ResolveFn<void>` that calls `SeoService.resolveForUrl(url, route)`.
- **Routes**: `src/app/app.routes.ts` attaches the resolver to every **public** route (i.e. every route except redirects and anything gated by `AuthGuard`):

  ```ts
  export const routes: Routes = routeDefinitions.map(route => {
    const isPublic = route.redirectTo === undefined && !route.canActivate?.includes(AuthGuard);
    return isPublic
      ? { ...route, resolve: { ...(route.resolve || {}), seo: seoResolver } }
      : route;
  });
  ```

  This means the Angular Router waits for `resolveForUrl` to complete (i.e. the metatags to load and apply) before finishing navigation to any public/logged-out page. Routes behind `AuthGuard` are only ever reached by an authenticated user (never crawled/indexed), so they skip the resolver entirely and never call the metatags API.

## Page lookup

Unlike the old list-and-match approach, the API now does the matching server-side: the frontend sends the current page's absolute URL as `pageName` and gets back at most one `MetaTagConfig` (or a failure, treated as "no config"). There is no more client-side candidate matching, and route-level `data: { seoPageName: ... }` overrides no longer exist/are read.

If the lookup fails or a field on the returned config is blank, `applyMeta` falls back to hardcoded **generic** defaults (not page-specific): `SuperMe` as title, a generic description, and computed `og:*`/`twitter:*` fields derived from the title/description/canonical. This is a safety net, not per-page hardcoding — every real page's SEO content should come from the API.

## What gets set

`applyMeta` sets, via Angular's `Title` and `Meta` services:

- `<title>`
- `<meta name="description">`, `keywords`, `robots`, `author`
- `<meta property="og:type">` (`website`), `og:site_name` (`SuperMe`), `og:title`, `og:description`, `og:url`, `og:image` (only if provided)
- `<meta name="twitter:card">` (`summary_large_image`), `twitter:title`, `twitter:description`, `twitter:image` (only if provided)
- `<link rel="canonical">` (created if missing, otherwise updated)

`applyHeadings` additionally overwrites the text content of the page's `<h1>`-`<h6>` elements (`document.querySelector('h1')`, etc.) whenever the API sends non-blank copy for that level — e.g. the habit page's hardcoded `<h1>Habit</h1>` becomes whatever `h1` the API returns for that `pageName`. A heading level is left untouched (keeping the component's own hardcoded copy) if the API doesn't supply it, so h2-h6 elements that exist purely for page layout aren't clobbered when the backend has nothing SEO-specific to say about them.

## Backend responsibilities

To control SEO for a page, add/update a row via the `/metatags` API keyed by the page's absolute `pageName` URL (e.g. `https://supermeapp.com/habit`). No frontend deploy is required to change SEO copy or heading text — it's fully data-driven.

## History / why there's no SSR

An earlier iteration added Angular SSR (`@angular/ssr`, `@angular/platform-server`) plus a custom Express `server.ts` specifically to serve real meta tags to crawlers before JS executes. That `server.ts` did not actually perform Angular server-side rendering — it served the static browser build and string-replaced a `<!-- SEO_START/END -->` block in `index.html` using a second, separately hardcoded `SEO_BY_PATH` map (duplicating `HARD_CODED_METATAGS` in `seo.service.ts`). This dual hardcoding was actually a maintenance hazard, and the SSR build wiring caused Angular build/dev-server failures.

Both were removed:

- SSR entry points (`src/server.ts`, `src/main.server.ts`, `src/app/app.config.server.ts`, `src/app/app.routes.server.ts`), the `server`/`ssr` options in `angular.json`, and the `@angular/ssr`/`@angular/platform-server`/`express`/`@types/express` dependencies.
- The hardcoded `HARD_CODED_METATAGS` array in `seo.service.ts` and the static SEO block in `index.html`.

**Trade-off to be aware of**: without SSR, meta tags are applied client-side after Angular bootstraps and the resolver's HTTP call completes. Search engine crawlers that execute JavaScript (modern Googlebot) will still see correct tags; crawlers/social-media unfurlers that only read the initial HTML (some link-preview bots) will see the static fallback in `index.html` (`<title>SuperMe</title>`, no other meta) until/unless SSR or pre-rendering is reintroduced.
