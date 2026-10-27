# Referral Contest integration

## Scope

Integrated into the existing standalone `ReferFriendComponent` at `/authed/refer-friend`; the new authenticated lazy route is `/authed/refer-friend/contest`. Public referral deep links remain unchanged.

Reused the supplied Angular banner, contest template/styles, static content and artwork after inspecting Figma section `316:39`. Adapted routing, Ionic sizing/safe areas, error handling and sharing to the existing app. Did not copy the prototype Referral page, mock status bar, separate app bootstrap, or replacement routing.

## Files

- `src/app/referral/components/contest-banner/*`: entry banner.
- `src/app/referral/contest/*`: page, content model and focused tests.
- `src/app/core/components/user-profile/refer-friend/*`: banner placement, navigation, existing share-method delegation and regression tests.
- `src/app/core/services/referral-share.service.ts`: existing WhatsApp message/link behavior shared by both screens.
- `src/app/authenticated/authenticated.routing.module.ts`: lazy authenticated route.
- `src/assets/referral/contest/*`: supplied artwork and lossless sprite crops.
- `tsconfig.referral-contest-spec.json`: focused test configuration.

## Data and behavior

The account referral code uses existing `AuthService.getUserData()` and `generateReferralCode()`; no demo code is shipped. Existing code-copy/API/reward/auth/parent-child behavior is retained. Invite is disabled until the user reaches the bottom and has a referral code, stays unlocked when scrolling upward, and uses the original WhatsApp sharing message.

Contest duration, prize descriptions and participation text remain supplied static content in `contest.data.ts`. No contest configuration/eligibility/ranking API was identified or invented. This UI does not implement contest enrolment, winner selection, or new reward logic. Legal links retain the supplied existing site destinations `/terms-of-use` and `/faq`.

Existing discrepancy retained deliberately: the Referral screen says 500 coins while its original WhatsApp message says 100 coins. This integration does not change reward terms; product/backend should confirm the intended amount separately.

## Assets

Reused supplied Samsung WebPs, iPhone PNG, spotlight, banner glow, sparkles, back/arrow/share/steps/legal SVGs. Existing app fonts are reused. Three full sheets totalled 3,895,772 bytes. Five native-resolution PNG crops total 728,282 bytes, saving 3,167,490 bytes (81.3%) against importing the full sheets. Decoded crop pixels were compared byte-for-byte with the corresponding source regions. Fractional CSS sampling offsets were preserved. Total new contest assets: 1,122,002 bytes. Original ZIPs/shared assets are untouched.

## Verification

- TypeScript app check passed.
- Final production Angular build passed (`CI=true npx ng build --configuration production --output-path /private/tmp/superme-referral-FuFOZM/production`). Existing unrelated CSS budget/CommonJS warnings remain; no build errors. Output stayed outside `www` and native generated assets.
- Eight focused ChromeHeadless tests passed: existing Referral, banner navigation, cached/API code, error/retry, bottom threshold, permanent unlock, share guard, back/legal actions and asset/layout checks.
- Isolated UI preview used the actual components with mocked account/API/share providers; no localhost authentication or real messages were sent. This temporary harness is outside the repository and production build.
- Browser layout checks at 360, 375, 390, 393 and 414px: no overflow in content/prize/CTA elements, all images decoded, CTA within viewport.
- Browser verified banner → Contest, back → Referral, bottom unlock and share hook receiving the mock account code. No captured console errors.
- Compared visible artwork/layout to Figma and supplied prototype. Not a pixel-diff certification across native devices.
- Safe-area spacing is implemented; real iPhone notch/gesture-bar and native system-browser/WhatsApp handoff testing remain device QA, not claimed as completed.

Unrelated pre-existing native birthday-notification/environment changes were preserved. Nothing pushed, deployed or uploaded.
