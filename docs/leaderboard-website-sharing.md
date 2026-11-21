# Leaderboard website sharing — 17 November 2026

## Root cause

The authenticated website at `/app/leaderboard` uses the Angular 19/Ionic project
in `SuperMeAppFE`. The separate `SuperMeWebsiteFE` marketing application does
not contain this leaderboard.

The button's `(click)="shareRank()"` binding was present. Inspection of the
active production release, `20261116-latest-ui-quiz-slugs`, found its old
text-only implementation in `4063.460469233fe9df3d.js`:

1. It tried Capacitor Share in a normal browser, then tried text-only Web Share.
2. If the browser could not open a sheet, it silently fell back to copying the
   short rank text with a small status message.
3. It did not request a referral code or attach an achievement image.
4. None of the ten achievement PNGs existed in that deployed release.

The newer local image-sharing service also needed a website fallback: it
previously threw when browser file sharing was unavailable. Browser sharing
requires transient user activation, which may expire while API requests or a
large PNG download finish. The prepared-card action now supports a fresh user
click without repeating those requests. See the
[Web Share specification](https://www.w3.org/TR/web-share/#share-method).

## Implementation

- `src/app/core/services/leaderboard-rank-share.service.ts` gets a fresh global
  rank from `GET /v1/leaderboard/coins?scope=GLOBAL&page=0&size=10` and the actual
  referral code from `POST /v1/auth/users/generate-referral`.
- It verifies the current user and eligible rank, then loads the corresponding
  original `assets/figma/leaderboard/share/rank-{1..10}.png`. All ten files are
  available and included byte-for-byte in the production build.
- Native apps keep Capacitor Filesystem/Share. Browsers use `navigator.canShare`
  and `navigator.share` with an actual PNG `File` plus the complete requested
  message, both app download links and the API referral code.
- Unsupported browsers start an image download and attempt to copy the message.
  Visible Download image / Copy message controls remain available. If clipboard
  permission is denied, the complete message is selectable in a readonly field.
- If the original gesture expires or sharing fails, a prepared Share image
  button can invoke Web Share directly from a new click. Cancellation exits
  normally without starting an unwanted download.
- The component prevents duplicate attempts, shows loading/error feedback, and
  releases the preview's object URL when leaving or starting another attempt.
- The original PNG artwork is unchanged. The API referral code is composited into the blank bottom plaque using canvas,
  then the personalized PNG is used for both native sharing and web downloads.
  The original bundled files are kept untouched; dimensions/transparency remain
  intact, and the same code is also included in the sharing message.

No backend endpoints, auth logic, navigation, dependencies or environment
configuration were changed for this fix.

## Verification

Passed:

- Application and focused-spec TypeScript checks.
- 48 focused Karma tests in ChromeHeadless, including existing leaderboard
  behavior and Android/iOS sharing-transport regression tests.
- Production Angular build with `/app/` base href. Existing unrelated size-budget
  warnings remain; the build succeeds.
- All ten built PNGs match the source SHA-256 checksums.
- Production-bundle browser click checks at 1440px and 390px: real image download
  and repeat download, personalized downloaded PNG payload, actual clipboard copying,
  full message/link/referral contents, and no horizontal overflow.
- All ten rank artwork selections, Web Share payload, expired activation,
  denied sharing, denied clipboard and cancellation behavior.

The browser regression test uses synthetic authenticated state and mocked
leaderboard/referral APIs, Google SDK startup and OS share-sheet calls. It
does not mint or use real user credentials. It exercises the actual compiled
Angular button, real browser downloads and clipboard APIs.

Commands:

```sh
./node_modules/.bin/tsc --noEmit -p tsconfig.app.json
./node_modules/.bin/tsc --noEmit -p tsconfig.leaderboard-spec.json
CHROME_BIN='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' CI=true ./node_modules/.bin/ng test --ts-config tsconfig.leaderboard-spec.json --include='src/app/core/components/leaderboard/*.spec.ts' --include='src/app/core/services/coin-leaderboard.service.spec.ts' --include='src/app/core/services/leaderboard-rank-share.service.spec.ts' --watch=false --browsers=ChromeHeadless --progress=false
CI=true ./node_modules/.bin/ng build --configuration production --base-href /app/ --output-path /tmp/superme-rank-share-web --progress=false
PLAYWRIGHT_MODULE=/tmp/eduhub-live-check/node_modules/playwright node scripts/test-leaderboard-browser-sharing.cjs /tmp/superme-rank-share-web
```

The browser script requires Playwright and Google Chrome. Set `PLAYWRIGHT_MODULE`
to an installed Playwright package path if it is not installed in the project.

## Release status and remaining checks

This fix is local. No commit, push or production deployment was performed.
Deploying the website build and all ten PNGs is required to update the live page.
Real-account production API verification and a real Android/iOS browser OS share
sheet still need device testing. Receiving applications control how image and
message attachments are presented; both are provided together by this code.

## Follow-up: share button remains busy

The shared mobile/web service had unbounded waits while reading the fresh rank,
fetching/reading the PNG, and writing the native cache file. Browser fallback
also awaited clipboard permission before releasing the busy button. A stalled
request or unresolved permission prompt could therefore leave sharing inactive.
This is a reproduced failure mechanism; without the affected device's network
trace, the exact stalled stage in that user's session is not confirmed.

Preparation now reports its stage, bounds rank/referral requests to 15 seconds,
aborts stalled PNG headers/body after 25 seconds, bounds native preparation,
and gives up on clipboard copying after 3 seconds with manual copying available.
The fallback releases the busy button before copying. Native/browser OS share
sheets retain their normal completion/cancellation lifecycle; no timer dismisses
an open sheet or silently starts a second one.

Regression coverage includes requests that never complete, stalled PNG bodies,
stalled native file writes, and unresolved clipboard permissions. The browser
script also exercises the real compiled button under those network/permission
conditions. Real device sign-in/share targets remain a device-test requirement.

Follow-up verification: 55 focused ChromeHeadless tests passed, including the
regression where an old clipboard operation completes during a new share attempt.
Production-bundle browser checks passed for mobile/desktop downloads, all ten
original card attachments, stalled referral/image requests, pending clipboard
permission, denied sharing and cancellation. API responses and OS sheets are
mocked; actual downloads and clipboard operations are exercised in Chrome.


## Dynamic referral code in the image

`rank-card-image.ts` decodes the original PNG at native resolution and adds the
API referral code in the bottom plaque. The text scales to the available width,
is centered, and uses white with a subtle shadow for contrast on all ten cards.
Both native Filesystem/Share and browser File/download receive this generated
PNG. Originals are never edited. Session identity is rechecked after rendering.

Real Chromium canvas checks across ranks 1–10 verified nonempty text pixels,
unchanged image dimensions, and zero pixel changes outside the plaque region.
Preview fixtures use a clearly synthetic code; the app always uses the API code.
No new endpoint, dependency, commit or deployment is required for the rendering
logic. Shipping it still requires a website deployment / new mobile build.
