# Learning category icon source audit

Inspected 26 October 2026, using the signed-in running app at `http://localhost:4200/content`.
The app uses `https://devapis.supermeapp.com/v1` in this development configuration.
These findings apply to the inspected development data; production data was not authenticated or audited.

## Confirmed cause

The **Articles** category API supplies 48×69-pixel PNGs for every listed category except Motivation, which is 1024×1024. In all 12 records, `image` and `thumbnailUrl` are the **same URL**. The frontend already prefers `image`, so there is no alternative high-resolution URL available in these responses.

This was verified twice: by reading the actual browser image `currentSrc`, `naturalWidth`, and `naturalHeight`, and by downloading each exact URL with a no-cache request and decoding the returned PNG. All 24 article/quiz asset requests returned HTTP 200. This is an asset/data problem, not a CSS blur effect or a failure to prefer the `image` field.

Motivation's article and quiz files are byte-for-byte identical (SHA-256 verified), both 1024×1024. The other article files are only 4,366–7,611 bytes and 48×69 pixels. Their available detail is already lost before rendering. At a 48-CSS-pixel icon width, a 3×-DPI display needs 144 source pixels horizontally; the article icons only supply 48. The desktop parent layout can reach 72 CSS pixels, needing 216 pixels at 3× DPI. Source padding can further reduce the pixels devoted to the artwork.

The Quiz response supplies substantially larger images. Category names alone do not prove these are interchangeable: for example, the Education artwork differs between the current article thumbnail and quiz original. No cross-category or cross-feed replacement was made.

## Actual API fields and dimensions

Observed requests use the existing authenticated endpoints:

- `GET /v1/articles/categories` (existing age/user/profile filters remain in place).
- `GET /v1/challenges/categories/summary?challengeType=QUIZ` (existing age/user/profile filters remain in place).

Only category names and `image`/`thumbnailUrl` were captured for the audit. No bearer tokens, identity data, or unrelated responses were recorded. In the table below, **each linked URL is the value of both `image` and `thumbnailUrl` in that endpoint's response**.

| Category | Article PNG / pixels | Quiz PNG / pixels |
|---|---|---|
| Motivation | [1024×1024](https://devapis.supermeapp.com/v1/articles/categories/thumbnail/de95b3bc-d378-4420-85a9-ebfb5622fae3.png) | [1024×1024](https://devapis.supermeapp.com/v1/challenges/categories/thumbnail/4748d97a-353d-4bb3-aab6-7675c28d0329.png) |
| Education | [48×69](https://devapis.supermeapp.com/v1/articles/categories/thumbnail/c4e9ead6-468f-4a01-a565-9f995dd79dc7.png) | [1254×1254](https://devapis.supermeapp.com/v1/challenges/categories/thumbnail/e4877034-51b7-400c-8f74-31b546b8b7af.png) |
| People & Vlogs | [48×69](https://devapis.supermeapp.com/v1/articles/categories/thumbnail/54ccbb0c-abe2-40ca-8554-cb71e5709d3b.png) | [1536×1024](https://devapis.supermeapp.com/v1/challenges/categories/thumbnail/784df93f-8517-4508-8a9a-48cee794e519.png) |
| Productivity | [48×69](https://devapis.supermeapp.com/v1/articles/categories/thumbnail/870e505b-6b0d-4b42-8699-a9541b151beb.png) | [1254×1254](https://devapis.supermeapp.com/v1/challenges/categories/thumbnail/1b276bc9-7fca-4175-9102-3eadc25c4048.png) |
| STEM | [48×69](https://devapis.supermeapp.com/v1/articles/categories/thumbnail/7daa05da-2c1e-4822-9884-6040670482cb.png) | [1024×1024](https://devapis.supermeapp.com/v1/challenges/categories/thumbnail/cb800ce8-a8d9-4804-a262-46d27213fe67.png) |
| Animals & Nature | [48×69](https://devapis.supermeapp.com/v1/articles/categories/thumbnail/b9f7e030-c231-465e-8fd2-800fe3ed8f70.png) | [1024×1024](https://devapis.supermeapp.com/v1/challenges/categories/thumbnail/32e34877-d5ff-43b2-af4b-5729034ff023.png) |
| Arts & Creativity | [48×69](https://devapis.supermeapp.com/v1/articles/categories/thumbnail/5880fa82-2e37-480a-b06d-786c10883968.png) | [628×476](https://devapis.supermeapp.com/v1/challenges/categories/thumbnail/2c8a5af0-9b60-4a65-ae0d-9dc9f904033d.png) |
| Food & Recipes | [48×69](https://devapis.supermeapp.com/v1/articles/categories/thumbnail/9b9f279d-8325-4dc0-97de-55baffa8ec6f.png) | [1254×1254](https://devapis.supermeapp.com/v1/challenges/categories/thumbnail/3175398d-320c-4e52-a451-165d41009ef0.png) |
| Gaming | [48×69](https://devapis.supermeapp.com/v1/articles/categories/thumbnail/d89415aa-d8f1-411f-9d17-4bf8980d3174.png) | [1254×1254](https://devapis.supermeapp.com/v1/challenges/categories/thumbnail/41d50eac-63dd-4168-81c3-d1e5a2bc46f0.png) |
| How-to | [48×69](https://devapis.supermeapp.com/v1/articles/categories/thumbnail/7872da53-a4b0-42f4-b4f7-663aa3966cf2.png) | [626×487](https://devapis.supermeapp.com/v1/challenges/categories/thumbnail/2a4f841b-2c0b-4dbb-bf95-b90c5e0ea6ad.png) |
| Sports & Fitness | [48×69](https://devapis.supermeapp.com/v1/articles/categories/thumbnail/848fecf0-d582-426a-95dd-9a1122dfa96d.png) | [1024×1024](https://devapis.supermeapp.com/v1/challenges/categories/thumbnail/c88b2f9f-e916-4062-b291-e9b094abe774.png) |
| Entertainment | [48×69](https://devapis.supermeapp.com/v1/articles/categories/thumbnail/a7f34d73-39a9-4690-9180-9410abf1aaf2.png) | [1024×1024](https://devapis.supermeapp.com/v1/challenges/categories/thumbnail/b7fe71c1-a4be-49db-be84-658afd0719ca.png) |

Quiz labels differ slightly: `Food and Recipes`, `Fitness & Sports`, and `How to`; they are grouped above only for comparison, not used as a replacement mapping.

Machine-readable URLs, decoded dimensions, byte sizes, source SHA-256 hashes, and response cache headers: `artifacts/learning-icon-audit/source-audit.json`. The audit can be repeated with `node artifacts/learning-icon-audit/inspect-sources.mjs`.

## Frontend trace

- `src/app/core/services/learning.service.ts`: `fetchArticleCategories()` and `fetchChallengeCategorySummary()` receive the responses; `normalizeLearningCategories()` retains the source fields and normalizes URLs. `normalizeApiImageUrl()` does not resize images or add quality-reduction parameters.
- `src/app/core/components/learning-section/learning-main/learning-main.component.ts`: `getCategoryImage()` already selects `item.image || item.thumbnailUrl`. Changing this order again would have no effect on these identical URLs.
- The parent, child, and legacy category grid templates in `learning-main.component.html` share `getCategoryImage()`. Their `app-img` renderer uses `object-fit: contain` for the icon layouts.
- `src/app/core/components/skeleton-image/`: the shared renderer applies loading opacity/shimmer and the supplied `objectFit`, with no blur filter, raster optimization, or resize request.
- `src/theme/child-learning-figma.scss` and `learning-main.component.scss`: shared icon boxes are 40–72 CSS pixels depending on layout. No per-category Motivation exception was found.
- Article content cards use the article's own image, separate from category artwork. No replacement of content images is needed.

## Cache and packaged assets

The affected icons are fetched from the development backend at runtime; they are not bundled PNGs in `www`, Android, or iOS. Fresh direct downloads reproduce the 48×69 result, so deleting generated build output cannot recover the lost image detail.

The separate local Reels set in `src/assets/figma/reels/categories/` has 12 1024×1024 WebP files. Their source, `www`, Android public, and iOS public hashes all match, but they use different artwork and are not the assets used on the affected Learning page. They were neither substituted nor removed.

## Copy-ready backend/data correction request

Please correct the article category image data used by `GET /v1/articles/categories` on the development environment. The authenticated localhost app currently receives the same URL in `image` and `thumbnailUrl` for every category. Motivation points to a 1024×1024 PNG; the other 11 categories listed in this report point to 48×69 PNGs. Direct fresh downloads confirm those dimensions.

The frontend already prefers `image` over `thumbnailUrl` and uses `object-fit: contain`. There is no higher-resolution alternative in the existing response, so no frontend preference or CSS change can restore detail.

Minimum correction:

1. Locate the original, approved artwork for Education, People & Vlogs, Productivity, STEM, Animals & Nature, Arts & Creativity, Food & Recipes, Gaming, How-to, Sports & Fitness, and Entertainment. Do not upscale the existing 48×69 files or use unrelated replacement artwork.
2. Return the correct full-quality asset URL in the existing `image` field. `thumbnailUrl` may remain a separate small preview if needed. If the endpoint intentionally exposes only one asset, both fields can point to the full-quality asset. No new response fields or endpoints are required.
3. Preserve the original aspect ratio and proper transparency. Use source exports with enough actual artwork pixels for a 72-CSS-pixel icon at 3× DPI (at least 216 pixels across the rendered artwork; preferably a suitable 512px or larger original). Do not flatten editor checkerboards into exports.
4. The quiz category collection has larger files, but verify artwork identity before reusing them. Matching category names are not sufficient: some current artwork differs between feeds.
5. Use new/versioned URLs for replacements or correctly invalidate caches, so devices stop retrieving the old small files.
6. Inspect the upload/thumbnail-generation path to explain how the 48×69 files were stored and prevent full-image references from being overwritten with tiny preview exports again. The frontend audit cannot establish whether those files came from an upload, crop, screenshot, or backend resize.
7. Return the corrected category-name/`image`/`thumbnailUrl` list for verification. Keep category IDs, role/age eligibility, counts, and assignments unchanged.

Acceptance: request both category APIs, decode every returned image, compare all 12 categories on localhost at mobile/tablet/desktop and 2×/3× DPR, verify image load success and category identity, and confirm fresh/cache-warm navigation uses the full-quality URLs. Check the intended production dataset separately before any rollout.

## Completion status

The root cause is confirmed; the visual issue remains pending corrected backend image data/original artwork. No category image replacements, CSS workarounds, asset deletions, or app behavior changes were made. Temporary development-only response logging was removed after capturing the sanitized fields. No production deployment was performed. A clean app rebuild was not run for this investigation because no app implementation changed and the defective files are remote runtime assets; rebuilding cannot fix the source files. Full-quality visuals cannot yet be confirmed.
