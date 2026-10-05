# Responsive typography audit — 2 October 2026

## Implemented

- Reused `--text-*` tokens with rem bounds and a small viewport contribution. Body/control text starts at 1rem; tablet growth is capped. Font families, colors and artwork are retained.
- Removed viewport zoom restrictions. No WebView text-zoom override or Android font-scale override was added. MainActivity, Capacitor configuration and Android manifest were inspected; `adjustResize` remains enabled.
- Shared input host styles now correctly use Angular `:host(...)`. Shared buttons and profile inputs grow with text; errors and long labels wrap.
- Ionic input/select/textarea, button and segment defaults use supported hosts, CSS variables and public parts, not private shadow-DOM selectors.
- Login fields, signup detail fields and profile phone fields no longer depend on a fixed text height. Existing signup desktop overrides are explicitly covered.
- Planner title textarea height cap removed; content can grow/scroll. Home activity tabs and header actions wrap.
- Learning card metadata/actions wrap; quiz copy uses shared tokens; learning tabs grow with labels. Academy lesson cards have shrinkable text columns. Tutor/shop detail text and teaching grids adapt to available width.
- Parent Home identity text wraps. Home acknowledgment and shared popups scroll in a short viewport. Popup CTAs wrap even when the viewport is wide but the dialog is narrow.
- Streak milestone labels retain readable sizes in an intentionally scrollable track. Reward actions no longer have a fixed-height footer.
- Text in activity confirmation dialogs, family notices, feedback, shopping/cart/order labels now uses the existing tokens instead of inline pixel sizes.
- Date/time picker field displays, titles and actions use tokens; wheel-selection mechanics were not changed.

## Coverage and limits

`node scripts/audit-responsive-text.cjs` inventories all source SCSS/CSS/templates/TypeScript and Android Java/XML: 613 files. It flags pixel fonts/line-heights, fixed heights, nowrap and scaling restrictions. This is a candidate inventory, not proof that every selector is a defect or that every screen was visually inspected. Comments and overridden declarations can also be flagged.

| Flow | Source review / implementation | Rendered verification |
| --- | --- | --- |
| Login | Fields, controls, title, errors, viewport | Actual unauthenticated route, 24 browser cases |
| Signup | Shared inputs/buttons and Figma Details field overrides | Shared controls tested; complete signup flow pending |
| Home / habits / tasks / planner | Activity tabs, title textarea, confirmation copy, acknowledgment popup | Shared components tested; populated authenticated routes pending |
| Academy / EduHub | Lesson card and shared tutor/shop detail layout | Authenticated data-driven screens pending |
| Learning | Cards, tabs, quiz copy/actions | Full quiz/article flows pending |
| Profile / family / parent-child | Shared profile control, phone field, parent identity, family notices | Profile control tested; complete account flows pending |
| Popups / bottom sheets | Shared popup and streak reward; date/time field/chrome | Shared popup/reward tested; wheel pickers pending |
| Shopping | Inline delivery/address/size/feedback text | Checkout/order workflows pending |

## Verification

- Shared Angular component matrix: 24 passing cases in ChromeHeadless. Real templates and encapsulated styles for buttons, input, profile validation, streak reward and shared popup. Widths: 320, 360, 390, 412, 600, 768 CSS pixels. Heights: 800 and 320. Root font: 16 and 32px (100% / 200% simulation). Checks control/text overflow, long copy, populated inputs, and scrolling/reachable popup actions.
- Actual Login route: 24 passing browser cases using the same width/height/text matrix, invalid long email, populated password, and focused input. Production network requests are blocked by the test. A shortened browser viewport is not a real Android keyboard test.
- Angular development compilation passed; existing Sass slash-division warning in ad-banner is unrelated to these changes.
- `git diff --check` passed after formatting cleanup.
- `adb devices`: no attached device/emulator. Actual Android font size, display size, keyboard, rotation and WebView behavior are **not verified**.

Commands:

```text
npx ng build --configuration development
npx ng test --ts-config tsconfig.responsive-spec.json --include=src/app/core/components/responsive-controls.spec.ts --watch=false --browsers=ChromeHeadless
node scripts/check-responsive-login.cjs
node scripts/audit-responsive-text.cjs
```

The Login browser check requires Playwright plus Chrome. Playwright was supplied by the workspace runtime, not added to app dependencies.

## Fixed geometry and remaining work

- Icons, avatars, artwork/sprite crops, dividers and progress-track thickness retain fixed geometry; these are not text boxes. Single-line native inputs intentionally scroll entered text horizontally rather than wrap.
- Date/time wheel rows remain coupled to existing TypeScript snapping arithmetic. Changing only their CSS heights would select incorrect dates/times. They still require enlarged-text/device validation and potentially a coordinated wheel refactor; they are **not certified accessible at 200%** by this pass.
- The fixed mobile navigation footer and legacy screen-specific typography still need rendered enlarged-text checks with authenticated fixtures. The static candidate inventory is not empty and has not been treated as an automatic replacement list.
- Full app-wide acceptance is therefore **not yet certified**. Before release, test each authenticated flow with real/stubbed data, long names and validation strings, Android default/largest font and display settings, portrait/landscape and keyboard open. Compare layouts against the approved Figma screens. No claim of pixel-perfect Figma verification is made here.

Existing unrelated workspace changes were preserved. No APK/AAB, commit, push or production data change was performed.
