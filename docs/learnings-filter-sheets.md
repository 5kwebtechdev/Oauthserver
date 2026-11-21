# Learning filter sheets — 17 November 2026

Replaced the native Progress/Category selects in the shared Quiz, Article and
MasterClass landing component with Ionic bottom sheets matching the supplied
close-up references. The live Figma API was quota-limited; the attached category
and progress screenshots and existing original category artwork were used.

- Category: four-column grid, original category icons, All tile, selected border
  and tint, close control, backdrop and drag handle.
- Progress: All/Pending/Completed radio rows and matching selected styling.
- Existing API category names and content filtering are retained. Known reference
  categories use the matching bundled Figma icons; other categories keep their API
  image. No fake categories/counts are added.
- Both sheets close after selection. Closing without a selection keeps filters.
  Existing Ionic modal focus, backdrop, escape and native dismissal behavior is
  retained. Tab changes reset filters and close the sheet.

Verification: 16 focused tests passed. Actual browser clicks at 320/390/768px
verified the category grid, progress selection, closing/reopening, selected state,
and filtered results across Quiz, Article and MasterClass using mocked API data.
TypeScript checks and Angular template compilation were run. No commit, push or new APK was created. Website deployment is recorded below.

Browser check (requires running frontend on port 4200):

```
PLAYWRIGHT_MODULE=/path/to/playwright node scripts/test-learning-filter-sheets.cjs
```


## Desktop responsiveness and production deployment

At >=768px the filter uses a centered Ionic dialog with a 480px maximum width,
rounded corners on all sides and no drag handle. Phones retain the Figma bottom
sheet. Changing between these layouts dismisses an open sheet safely so Ionic
reinitializes the correct presentation on the next opening.

Production release: `20261117-learning-responsive`, built in isolation on the
server using the locked dependencies and production `/app/` base href. Install
used `--legacy-peer-deps` for the existing Google Auth plugin peer mismatch; no
package versions were changed. The build passed with existing size warnings.
The `/var/www/supermeapp-app/app` symlink was switched atomically. Prior hashed
JS/CSS bundles remain available for already-open tabs. Nginx, auth-server settings
and the separate public marketing website were not modified.

Rollback target: `/var/www/supermeapp-app-releases/20261116-latest-ui-quiz-slugs/app`.
Production browser verification uses the deployed HTML/JS/assets with synthetic
user state and mocked account APIs; it does not claim real-account authentication
or native-device verification.

Live verification passed at 320, 390, 768 and 1440 CSS pixels for all three tabs:
actual filter-button clicks, category icons, four-column layout, selected progress,
filtered content and close controls. Geometry assertions confirmed desktop dialogs
are centered both horizontally/vertically and phone sheets meet the viewport's
bottom edge. `/` and `/app/content` both returned HTTP 200 after deployment.
