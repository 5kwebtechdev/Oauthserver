# SuperMe Website

Angular 20 (standalone components) web app for SuperMe — a personal growth / habit-tracking / kids learning & marketplace platform.

## Tech stack

- **Framework**: Angular 20, standalone components, `@angular/build:application` builder (esbuild/Vite-based).
- **Rendering**: Client-side rendering only (browser build). SSR (`@angular/ssr`, `@angular/platform-server`) was removed — see [SEO.md](SEO.md) for why.
- **UI**: Ionic (`@ionic/angular`), Bootstrap 5, custom SCSS, GSAP for animation, Leaflet for maps.
- **State/HTTP**: `HttpClient` with a functional `authInterceptor`; no NgRx — services hold state directly.
- **Other libs**: `angularx-qrcode`, `@emailjs/browser`, `@fortawesome/fontawesome-free`.

## Structure

```
src/
  app/
    app.ts, app.config.ts, app.routes.ts    — root component, providers, route table
    authentication/                          — login/signup/parent-account flows
    core/
      api/                                   — low-level API clients
      auth-guard/                            — route guards for authenticated areas
      components/                            — shared UI (ad-slider, buttons, cards, sidebars, ...)
      guards/                                — functional resolvers/guards (e.g. seo.resolver.ts)
      interceptors/                          — HTTP interceptors (auth token attach, etc.)
      models/                                — shared TypeScript interfaces (e.g. metatag.model.ts)
      pages/                                 — top-level routed pages (profile-section, onboarding, ...)
      services/                              — app-wide services (SeoService, AdsService, UserService, ...)
    home/                                     — home module/page
    landing/                                  — public marketing site: pages, sections, components per feature
  environments/                               — environment.ts / environment.prod.ts (apiUrl, etc.)
  index.html                                  — app shell; minimal static <title>/<base>, no hardcoded SEO
  main.ts                                      — browser bootstrap entry point
```

## Build & run

```bash
npm install
npm start        # ng serve (dev server)
npm run build    # ng build (production browser bundle -> dist/superme-website/browser)
npm test         # karma/jasmine unit tests
```

There is **no server-side rendering**. `npm run build` outputs a static browser bundle only — deploy it as a static SPA (serve `dist/superme-website/browser`, with a fallback to `index.html` for client-side routes).

## Key domain services

- `SeoService` (`src/app/core/services/seo.service.ts`) — fetches page metadata from the backend and applies `<title>`/meta tags per route. See [SEO.md](SEO.md).
- `AdsService` (`src/app/core/services/ads.service.ts`) — fetches age/screen-targeted ads (`GET /ads/age`) consumed by `AdSliderComponent`, embedded across ~11 pages (home, coin pages, tutor pages, academy, school store, etc.).
- `UserService` — current user/profile state, used e.g. to resolve a child's age for ad targeting.

## Notable recent changes

- Removed Angular SSR (`@angular/ssr`, `@angular/platform-server`, `express`, custom `src/server.ts`) that had been added alongside the SEO work — it wasn't doing real Angular server rendering (the custom `server.ts` only string-injected a hardcoded SEO block into a static `index.html`) and was causing build/dev-server issues. The app now runs as a pure client-side SPA.
- Removed all hardcoded SEO fallbacks (in `seo.service.ts` and `index.html`); SEO metadata is now sourced entirely from the `/metatags` API. See [SEO.md](SEO.md).
