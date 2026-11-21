# Android size follow-up: analysis before changes

## Baselines

| Artifact | Bytes | Decimal MB |
|---|---:|---:|
| SuperMe171126.apk | 211,991,038 | 211.99 |
| SuperMe-0.1.30-build62-optimized.aab | 170,226,096 | 170.23 |
| SuperMe-0.1.30-build62-optimized.apk | 179,742,095 | 179.74 |

The latest APK has no matching latest AAB in the saved artifacts. The previous
AAB is reported as a historical baseline, not a same-source comparison.

## Largest contributors in the latest APK

- Bundled media: 178,271,792 bytes (84.1%).
- Native libraries: 20,381,492 bytes across ARM32/ARM64/x86/x86_64.
- DEX: 3,258,654 bytes.
- Achievement PNGs alone: 31,266,440 packaged bytes.
- Existing optimized-media objects: 81,960,902 bytes.
- Other WebP images: 43,270,976 bytes.
- Audio: 15,991,180 bytes.
- SVG: 4,566,549 bytes.

The previous optimizer reports 44.97 MB already saved, 354 preserved image URL
aliases, and 153 unique objects. A fresh SHA-256 audit found zero physical
byte-identical web-media duplicates over 16 KB in the latest APK.

## Already enabled — do not repeat without benefit

Release R8/minification and Android resource shrinking are enabled. Angular
production optimization is enabled. Large PNGs are losslessly recompressed and
converted where pixel/ICC/orientation checks pass. Native WebView aliases preserve
dynamic asset URLs. Startup artwork, fonts, animations, code and audio are kept.
Firebase App Check debug dependency is debug-only. No source maps were found in
the audited production APK.

## Measured candidate

All ten original rank PNGs total 35.07 MB in source. Exact lossless WebP candidates
total 23.97 MB and have identical decoded RGBA pixels. Relative to the existing
PNG-recompressed package, the expected further saving is about 7.30 MB.
The shared-card loader currently requires PNG input; enabling this optimization
requires accepting the verified WebP input while still generating a PNG for
sharing/download. Originals stay untouched. This compatibility change must be
covered by sharing and canvas tests before delivery.

A higher-effort lossless benchmark is being measured separately before changing
the encoder policy. No dependency removal is justified by the audit.

## Changes deliberately avoided

Do not remove barcode scanning/ML Kit, Firebase, authentication or notification
plugins. Removing x86 libraries would reduce a universal APK but remove supported
architectures. AAB delivery already selects the appropriate ABI on Google Play.
Compressing native libraries inside APKs would reduce download bytes but require
extraction and increase installed footprint; keep current mmap/page-aligned
packaging. Audio recompression would be lossy and is excluded. R8 mapping metadata
is retained; it is not ordinary on-device app content.

## Implemented and validated

Enabled the existing pixel-verified Android lossless packaging for all ten rank cards. The loader accepts PNG/WebP input; the renderer still exports PNG. Source originals, dimensions, transparency, ICC profiles and URLs remain preserved. No dependencies, ABI support, fonts, audio, auth or navigation were changed. Higher-effort encoding saved only 0.14 MB across eight samples and timed out on rank 1, so it was not applied.

Production Angular compilation and application TypeScript checks passed. Sharing tests: 41 passed. Canvas tests passed for all ten original inputs and all ten packaged WebP aliases; only referral-plaque pixels changed, output remained PNG. Physical-device checks are pending (no device connected).

Cleanup recovered 3,399,389,184 bytes (3.40 GB), leaving 5,304,471,552 bytes immediately afterward. Exact deleted generated/cache paths are recorded in artifacts/android-size-20261117/cleanup.json. Build regeneration consumes some of that space again. Signing/source/environment/release files were preserved.

Build notes: first signed packaging attempt ran out of local disk space after tests passed; incomplete output was discarded. Retried with two workers, 2 GB heap and build caching disabled. Release lint reports Google identity library Kotlin metadata 2.4 vs lint expectation 2.2; dependencies were not upgraded or altered for size optimization.

## Final artifacts

Signed production build 63 (0.1.31) succeeded. APK: 204,645,912 bytes versus latest prior APK 211,991,038: reduction 7,345,126 bytes (3.46%). New AAB: 195,121,596 bytes. Historical Nov16 AAB was 170,226,096 bytes and predates the new rank artwork; it is not a like-for-like baseline. No matching pre-optimization AAB was available, so an AAB reduction percentage is not claimed. Google Play device download and installed size were not measured. APK signature and AAB JAR signature verified; production origin/API/SSO hosts and ten packaged artwork aliases checked.

Files modified for this follow-up: scripts/optimize-android-media.mjs, leaderboard-rank-share.service.ts and its spec, scripts/test-rank-card-image.cjs, android/app/build.gradle (version only), this report and audit script/report artifacts. Existing unrelated working-tree changes preserved. No commit or push.
