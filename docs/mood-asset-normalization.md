# Mood artwork normalization — 26 October 2026

## Root cause

The selector and other screens did not use the same Calm artwork. The selector
loaded `assets/figma/child-home/moods/calm-reference.png` (196×160), while Home's
saved pill, Journal cards/composer/history and analytics loaded `Calm.svg`
(65×56). The PNG tightly fills its canvas; the SVG has substantial transparent
padding. A CSS compensation written for the SVG survived the switch to PNG:

- Inline picker: Calm 65×56, others 50×40; a smaller breakpoint used Calm 57×49
  versus 46×37.
- Bottom-sheet/entry picker: Calm image 58×48 versus 54×48.
- Journal retained obsolete Calm cropping at 187%×133% with a translation.

Equal CSS dimensions alone would still leave unequal face sizes because these
exports have different internal padding and decorations. This explains why
changing a single CSS width or a single asset mapping did not cover every view.

## Measured original assets

Bounds below are nontransparent artwork bounds `(left, top, right, bottom)` in
SVG units, sampled at 10× with alpha >40. Decorations are included in these
bounds. Original SVGs contain embedded WebP artwork, rather than vector faces.

| Mood | Original canvas | Visible artwork bounds |
|---|---|---|
| Excited | 50×48 | 8.3, 5.1, 40.9, 43.1 |
| Happy | 50×40 | 8.8, 0.7, 38.5, 38.7 |
| Calm SVG | 65×56 | 11.9, 7.9, 53.3, 41.9 |
| Anxious | 50×40 | 7.1, 2.1, 40.5, 38.9 |
| Sad | 51×40 | 11.3, 0.6, 41.6, 39.1 |
| Frustrated | 50×43 | 10.7, 1.2, 41.6, 41.7 |

The old Calm PNG is 196×160; measured on a 650×560 analysis canvas, its visible
bounds were 13,13–641,559: effectively no bottom padding. `Calm.webp` (65×56)
also exists as an older export. The source, web and iOS SVG hashes matched
before cleanup. Android also had the same SVG; its PNG went through the existing
lossless packaging optimizer. There was no evidence that a stale SVG copy was
the cause of this screenshot.

## Correction

- `scripts/normalize-mood-assets.mjs` wraps the unchanged original SVG artwork
  in normalized 100×100 SVG canvases. It measures the largest connected warm
  region (the face), separating detached sparkles/leaves/lightning. Each face
  has width 64 and baseline 88, horizontally centered. All decorations fit
  inside the canvas. No per-mood CSS scale/crop is required.
- The only active Calm asset is now
  `assets/figma/child-home/moods/normalized-v1/calm.svg`.
- `src/app/core/models/mood-assets.ts` provides the shared six-asset mapping and
  API aliases. Selector, Home header, parent summary, daily mood records,
  analytics, calendar and shared mood model use it. Journal post cards and
  Journal output already consume daily mood records.
- All moods share the same box within each presentation and `object-fit:
  contain`. Selector Calm/Frustrated sizing and Journal Calm/Anxious cropping
  overrides were removed. Pet sprite positioning is a different feature and
  was left intact.
- The distinct neutral/no-selection placeholder is retained. It is not the
  confirmed Calm mood image.
- Original exports remain in source for reproducible regeneration; Angular's
  asset exclusions prevent the originals, old PNG and low-resolution WebPs
  from entering release bundles. The versioned runtime path avoids reuse of
  the old image cache key.
- `scripts/verify-mood-assets.mjs` checks source and output hashes, common
  canvas/face geometry, retired runtime references and forbidden per-mood CSS.
  It runs before/after `npm run build` and after Capacitor copy. It can also
  verify any generated output directory explicitly.

## Verification procedure

Files changed for this fix:

- `src/app/core/models/mood-assets.ts` (new), `mood.model.ts`
- `src/app/core/components/mood-selector/mood-selector.component.ts`, `.html`, `.scss`
- `src/app/core/components/home-mood-header/home-mood-header.component.ts`, `.spec.ts`
- `src/app/core/services/daily-mood-records.service.ts`
- `src/app/core/components/analytics-section/analytics.component.ts`
- `src/app/core/components/superme-inputs/superme-calendar/superme-calendar.component.ts`
- `src/app/authenticated/parent-account/parent-account.component.ts`
- `src/app/core/components/journals/journals.component.ts`
- `src/app/core/components/journals/journal-input/journal-input.component.html`, `.scss`
- `src/global.scss`, `angular.json`, `package.json`
- `src/assets/figma/child-home/moods/normalized-v1/` (six SVGs and source manifest)
- `scripts/normalize-mood-assets.mjs`, `scripts/verify-mood-assets.mjs`,
  `scripts/check-mood-layout.cjs`, `tsconfig.mood-assets-spec.json`

The existing manual-picker close test was corrected to provide a saved mood,
matching the existing rule that the first unsaved check-in cannot be dismissed.
No dismissal/save business logic was changed.

1. Remove only generated `www`, Android `assets/public`, and iOS `App/public`;
   clear Angular build cache. No project/source files are deleted.
2. Run `npm run build -- --configuration production --progress=false`.
3. Run `npx cap sync android` and `npx cap sync ios`.
4. Run `node scripts/verify-mood-assets.mjs www android/app/src/main/assets/public ios/App/App/public`.
5. Run the existing Home mood and daily record/Journal tests using
   `tsconfig.mood-assets-spec.json`.
6. `scripts/check-mood-layout.cjs` uses the real selector SCSS and compact picker
   markup structure with generated production assets. It checks loaded images,
   equal boxes, aligned labels and overflow at 360/375/390/414 in Chromium and
   WebKit, and writes screenshots to `artifacts/mood-layout`.

Browser fixtures validate rendering independently of login/API data. They are
not physical Android/iPhone testing or an installed APK/IPA verification.
No deployment, push or store upload is part of this change.

## Results

- Clean production build: passed, including prebuild and generated-bundle checks.
  Existing Sass deprecation/component-style budget warnings remain.
- Existing Home mood, daily record and Journal tests: 30 passed.
- Chromium and WebKit: passed at 360, 375, 390 and 414 pixels (eight fixtures);
  previews visually inspected at 360 and 390.
- Android and iOS Capacitor sync: passed. Their normalized assets and `www`
  match source SHA-256 hashes, and all retired mood exports are absent.
- Final Calm SHA-256:
  `e5d73dced4a051031a8f8e0d0d4cb5435eb3538005cb2f53cde25c2d5c9098a2`.
- No Android device is connected and no iOS simulator was booted; physical
  device/installed APK/IPA testing was not performed.
- Capacitor rewrote the existing iOS Analytics subspec during sync. Its Podfile
  and lockfile were restored to their pre-task contents, with deployment-mode
  CocoaPods installation used to retain the original native dependency set.
