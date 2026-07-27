# Android app size investigation

Date: 2026-07-27

## Result

| Artifact or source set | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| `src/assets` | 59.05 MB | 25.11 MB | 33.94 MB (57.5%) |
| Production signup/onboarding lazy chunk | 3.69 MB raw | 396 KB raw | about 3.30 MB |
| Release AAB | 76.09 MB | 42.62 MB | 33.47 MB (44.0%) |
| Release APK | not previously available | 51.74 MB | Android download estimate: 39.23 MB |

The fresh universal debug APK is 101.41 MB, but it is not representative of
the Play Store download. It contains unminified debug code and the barcode
scanner native library for all four ABIs. Android's analyzer estimates its
download size at 47.06 MB. Production builds use minification/resource
shrinking, and Google Play splits an AAB by device ABI.

## Exact cause of the increase

The previous tracked debug APK was 48.41 MB. The pre-cleanup debug APK was
104.86 MB. Comparing their ZIP contents showed:

- 129 newly packaged web assets added 45.47 MB.
- Five changed assets added another 0.19 MB.
- The packaged `assets/public` section grew from 13.31 MB to 61.88 MB.
- Four 1024 x 1024 PNG icons were pasted as base64 into
  `signup.component.html`, making that template 3.35 MB even though each icon
  renders at 32 x 32.
- Fourteen analytics files named `.svg` were actually full base64 PNG images
  wrapped in SVG markup, totaling about 7 MB.
- Multiple 1024-2048 px design exports were used in 32-320 px UI slots.
- Three family header PNGs were byte-for-byte identical.

The ML Kit barcode native libraries account for about 19.43 MB in a universal
APK, but they were already present in the older APK and were not the sudden
growth. They remain because QR family linking uses them.

## Cleanup performed

- Downscaled oversized avatar, pet, role, family onboarding, gender, and
  analytics artwork while retaining high-density display resolution.
- Extracted the four signup icons from inline base64 and stored them as
  reusable 96 x 96 PNG assets.
- Replaced the embedded-raster analytics SVG wrappers with 192 x 192 PNGs.
- Consolidated the three identical family headers into one shared asset.
- Removed 23 replaced or unreferenced image files totaling 12.76 MB.
- Removed the unused `@capacitor/barcode-scanner` package and its
  `html5-qrcode` dependency. The actively used
  `@capacitor-mlkit/barcode-scanning` package remains.
- Added `scripts/optimize-app-assets.ps1` so the deterministic resizing and
  embedded-image extraction can be repeated.

No bundled video files or local font-family files were found. Repository build
caches, old iOS archives, and backup ZIPs are not copied into the Android
package and therefore do not affect APK/AAB size.

## Verification

- `npm run build -- --configuration production`: passed.
- `npx cap sync android`: passed and confirmed 15 active Capacitor plugins.
- `gradlew bundleRelease -x uploadCrashlyticsMappingFileRelease`: passed.
- `gradlew assembleRelease -x uploadCrashlyticsMappingFileRelease`: passed.
- `git diff --check`: passed.

The Crashlytics mapping upload was excluded only for local artifact generation
because the local Java trust store reports `PKIX path building failed`. App
compilation, R8 minification, lint-vital checks, signing, APK packaging, and AAB
packaging all completed successfully.
