# Android size optimization — 16 November 2026

Implemented locally on `mobile_auth_code`, based on HEAD `5c7f7990` plus the existing local UI/auth fixes. No server deployment, Git push, dependency upgrade, or Play submission was performed.

## Results

Sizes below are decimal MB (1 MB = 1,000,000 bytes), measured from the actual signed files.

| Artifact | Size |
|---|---:|
| Previous AAB, build 61 | 212.75 MB |
| Fresh baseline from the current frontend, build 62 | 214.94 MB |
| Optimized production AAB, build 62 / 0.1.30 | **170.23 MB** |
| Optimized production release APK | **179.74 MB** |
| Phone-test APK, same release code with the existing local APK certificate | **180.07 MB** |

The same-code AAB comparison saves **44.71 MB / 20.80%**. Compared with the older build 61 AAB, the new build saves 42.52 MB / 19.99% while also including the newer UI changes. The fresh baseline avoids attributing differences between feature versions to compression.

Downloads:

- [Production AAB](/Users/vivek5kwt/Documents/SuperMeAppFE/artifacts/production-android-20261116-build62/SuperMe-0.1.30-build62-optimized.aab)
- [Phone-test APK](/Users/vivek5kwt/Documents/SuperMeAppFE/artifacts/production-android-20261116-build62/SuperMe-0.1.30-build62-phone-test.apk)
- [Production release APK signed with the upload key](/Users/vivek5kwt/Documents/SuperMeAppFE/artifacts/production-android-20261116-build62/SuperMe-0.1.30-build62-optimized.apk)
- [File sizes and SHA-256 checksums](/Users/vivek5kwt/Documents/SuperMeAppFE/artifacts/production-android-20261116-build62/checksums.json)

An AAB is an upload artifact, not a device's installed/download size. Google Play generates configuration-specific APKs. Default ABI/density/language delivery remains enabled; all four supported ABIs remain available. See [Android's app size guidance](https://developer.android.com/topic/performance/reduce-apk-size) and [App Bundle delivery](https://developer.android.com/guide/app-bundle).

## Audit before changes

The build 61 AAB contained these compressed contributors:

| Contributor | Size |
|---|---:|
| Bundled web media/assets | 188.28 MB, approximately 89% of the AAB |
| Web code, icon resources and supporting files | 6.97 MB |
| Java/Kotlin DEX | 3.26 MB |
| Native libraries across four ABIs | 8.91 MB |
| Barcode model | 0.62 MB |
| Other resources and build metadata | 3.97 MB |

The source asset tree is 232.84 MB, including 137.07 MB of PNGs, 68.80 MB of WebP files, 15.99 MB of audio and 8.58 MB of SVGs. The source inventory contained 21.83 MB of exact duplicate bytes, including some source originals that the existing build already excluded. This was not used as an excuse to remove files that merely looked unused.

R8 and Android resource shrinking were already enabled. Production Angular optimization was already active. The release graph already excluded Firebase App Check's debug provider. No bundled font files were found: the existing Fredoka/Nunito web-font setup and stylesheet declarations are unchanged.

Large native libraries primarily belong to ML Kit barcode scanning. Npm's on-disk installation size is not the shipped JS size; compressed web JavaScript is about 2 MB. Gradle resolves the Google/Firebase/CameraX dependency graph to shared versions. No dependency was removed because these plugins have existing consumers. Global and component Swiper usage was retained because both have callers.

## Changes

1. Added Android-only lossless image packaging after Capacitor copies the production web build. It accepted **113 PNG-to-WebP conversions** only after checking identical decoded RGBA pixels, dimensions, orientation and applicable ICC metadata. It does not resize images or use lossy quality settings.
2. Consolidated duplicate generated image copies into content-addressed objects. **352 original URLs resolve to 152 stored media objects**. Static paths, dynamically constructed pet/avatar paths, filenames with spaces and query parameters continue to work.
3. Added a small Capacitor WebView client subclass that serves only exact, indexed image URLs on the configured local app origin, with the correct MIME type. All other requests and all navigation/error/lifecycle behavior delegate to Capacitor. The hosted authentication WebView is unchanged. API, OAuth, external and non-GET requests are outside the image lookup.
4. Added a release preflight that validates the image index and every target's SHA-256 before packaging. An incomplete or corrupt optimized package cannot pass that preflight.
5. Added automated routing tests and an opt-in physical-device instrumentation test. Updated the audit tool to classify the content-addressed files as media rather than JavaScript.
6. Incremented the Android release to **versionCode 62 / versionName 0.1.30**.

All **1,769 shared source assets** were retained with unchanged checksums. Originals remain in `src/assets`; the website and iOS do not use the Android media optimization. No screens, fonts, audio, animations, models, controllers, API integrations or Angular navigation were removed or rewritten.

Animated formats are preserved. The optimizer also checks the PNG animation control chunk so a decoder exposing only the first APNG frame cannot cause flattening. SVGs, including the hash-verified mood artwork, stay byte-for-byte unchanged. First-paint artwork referenced by `index.html` stays physically present before the custom image client is installed.

The output is transactional: generated originals remain until the complete index is written. Unsupported or non-identical conversions retain the original encoding. Cached encodings are rechecked against the original pixels before reuse.

### Files changed for this task

- [package.json](/Users/vivek5kwt/Documents/SuperMeAppFE/package.json): added the Android media step to the existing Capacitor copy hook.
- [scripts/optimize-android-media.mjs](/Users/vivek5kwt/Documents/SuperMeAppFE/scripts/optimize-android-media.mjs): lossless conversion, deduplication, original-URL index, pixel checks and inventory checks.
- [scripts/audit-android-size.py](/Users/vivek5kwt/Documents/SuperMeAppFE/scripts/audit-android-size.py): accounts for optimized media in size reports.
- [android/app/build.gradle](/Users/vivek5kwt/Documents/SuperMeAppFE/android/app/build.gradle): version 62 and media-integrity preflight. Existing signing, R8, resource shrinking, SDK levels and ABI support remain intact.
- [android/app/src/main/java/io/ionic/starter/MainActivity.java](/Users/vivek5kwt/Documents/SuperMeAppFE/android/app/src/main/java/io/ionic/starter/MainActivity.java): installs the media client after bridge creation; existing activity/plugin behavior is retained.
- [android/app/src/main/java/io/ionic/starter/media/BundledMediaIndex.java](/Users/vivek5kwt/Documents/SuperMeAppFE/android/app/src/main/java/io/ionic/starter/media/BundledMediaIndex.java)
- [android/app/src/main/java/io/ionic/starter/media/OptimizedMediaWebViewClient.java](/Users/vivek5kwt/Documents/SuperMeAppFE/android/app/src/main/java/io/ionic/starter/media/OptimizedMediaWebViewClient.java)
- [android/app/src/test/java/io/ionic/starter/media/BundledMediaIndexTest.java](/Users/vivek5kwt/Documents/SuperMeAppFE/android/app/src/test/java/io/ionic/starter/media/BundledMediaIndexTest.java)
- [android/app/src/androidTest/java/io/ionic/starter/media/OptimizedMediaTest.java](/Users/vivek5kwt/Documents/SuperMeAppFE/android/app/src/androidTest/java/io/ionic/starter/media/OptimizedMediaTest.java)
- [scripts/android-size-instrumentation.init.gradle](/Users/vivek5kwt/Documents/SuperMeAppFE/scripts/android-size-instrumentation.init.gradle): optional release-device test configuration; does not disable signing or shrinkers.
- This report.

No new npm or Android runtime dependencies were introduced. The optional build-time `cwebp` tool is not included in the app. This build used cwebp 1.6.0 with `-lossless -exact -metadata all`. If that tool is absent, the script uses Sharp and accepts only candidates that still pass the same pixel checks; such builds can be larger.

## Validation results

| Check | Result |
|---|---|
| Fresh production Angular build | Passed; existing bundle/style size warnings remain |
| Signed release AAB and APK build | Passed with R8 and resource shrinking enabled |
| Native routing tests | 6 passed; rejects remote/auth/API origins, wrong schemes/ports, POSTs, unknown paths and invalid target paths |
| Generated index and stored image checksums | All 352 aliases and 152 target objects verified |
| Shared source inventory | All 1,769 files retained unchanged |
| Package preservation | 2,074 native-library/config/plugin/code/audio/SVG/support files checked unchanged against the same-code baseline |
| Native ABI delivery | arm64-v8a, armeabi-v7a, x86 and x86_64 retained; native library bytes unchanged |
| Production origin | `https://app.supermeapp.com`, HTTPS, bundled web assets; no remote server URL |
| Authentication/Google/secure-storage plugins | Their retained R8 class names match the baseline |
| Web source maps | None packaged |
| Mood SVG hashes | Passed existing verification |
| Browser image verification | All 113 conversions load through their original URLs with correct MIME and dimensions; opaque pixels and alpha identical |
| Mobile role/navigation smoke checks | Self/Child with both journal states, Parent with/without a linked child; 320, 393 and 430 px layouts, 16 scenarios, existing Books navigation and overflow checks passed using mocked API data |
| AAB validation | Passed Google bundletool validation |
| AAB signature | Verified with the existing upload key |
| APK signature and alignment | Verified; production APK passes 16 KB native-library ZIP alignment check |
| Real account login, API operations, notifications and hardware | **Pending your physical-device checks** |

PNG and WebP Chromium decoders round some translucent-edge compositing differently, by at most **2/255 of an 8-bit channel** in the checks over white, black and EduHub blue backgrounds. The encoded source RGBA values, opaque pixels and alpha are identical. No layout, crop, image dimensions, typography or font definitions were changed. The full measurements are retained in the browser verification report.

The build retains pre-existing tooling warnings, including the Google ID dependency's Kotlin-metadata warning during lint. The release build and six Java tests passed; SDK/compiler upgrades were intentionally kept outside this optimization task.

## Physical-device testing and signing

The phone-test APK contains the **same compiled release code/resources** as the production release APK and uses production URLs. Only its signing certificate differs: it uses the existing local APK certificate (SHA-1 beginning `54:6A:1C:3B`), which is registered for the existing local Android Google OAuth client. It remains a release build: no debug-only Firebase provider or debug resources were added.

The production AAB and production release APK use the existing upload certificate (SHA-256 beginning `AF:8F:38:24`). Google Play subsequently signs distributed APKs with the Play app-signing certificate. Test Google sign-in through a **Play internal testing track** as well; a locally installed APK cannot establish that Play-specific signing/Google behavior has passed.

A local APK may not update an existing Play installation because the certificates differ. Use a separate test device or Play internal testing rather than clearing real account data to force an APK installation.

On the physical test build, verify email/Google login, signup/onboarding, logout/login again, session restoration after backgrounding, Self/Child/Parent home/navigation, images and pet changes, quizzes/articles/masterclass, calendar/events, profile, focus audio, push notifications, camera and barcode scanning. No real credentials or tokens were used in the automated browser checks. The native instrumentation test was prepared but not run because testing is being done on your physical device.

## Reproducing the build

Use the existing private upload-signing configuration; do not add keystores or passwords to Git. Node 22 and JDK 21 were used. `cwebp` on PATH enables the exact encoder and the largest lossless reduction.

```sh
CI=true NODE_OPTIONS=--max-old-space-size=4096 npm run android:prepare:production
cd android
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
./gradlew -Dorg.gradle.java.home="$JAVA_HOME" --max-workers=2 \
  :app:bundleRelease :app:assembleRelease :app:testReleaseUnitTest
```

The explicit Java-home override accommodates the existing local Gradle property's Windows path without editing or exposing the private signing-properties file. Output files are normally under `android/app/build/outputs/`; the reviewed deliverables were moved into the artifacts directory linked above.

Do not run the image optimizer twice on an already optimized directory. A fresh `cap copy android` restores the originals and runs the registered hooks. Its cache is generated, ignored build data under `artifacts/android-size/media-cache`.

## Remaining opportunities

- Many remaining large images could be reduced further by auditing their maximum rendered resolution/DPR and generating appropriately sized variants. This would change source pixel dimensions and needs a separate visual review; it was not done blindly.
- Some PNGs remain because an alternate encoding did not satisfy the preservation checks. SVGs with embedded raster artwork also remain intact, including those with pinned hashes.
- Approximately 16 MB of focus audio remains unchanged. Lossy audio re-encoding would need an explicit sound-quality decision.
- On-demand asset delivery could reduce the initial install substantially but changes offline behavior and architecture; it was not introduced here.
- Removing native plugins or supported ABIs would reduce capability/compatibility. Existing App Bundle splitting already avoids downloading every ABI to each Play device.

Supporting inventories, comparison checks and build/signature/dependency logs are in `artifacts/android-size-20261116/`.

The latest optimizer inventory for subsequent builds is written to `artifacts/android-size/lossless-media.json`; this audit keeps a dated copy.
