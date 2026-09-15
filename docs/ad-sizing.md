# Ad sizing

Edit `src/theme/_ad-config.scss` to change the shared slot width, height and background.
All `ad-banner` placements (including article, home, learning, EduHub and lessons)
use these values. The width is a maximum; smaller containers scale the slot
proportionally. Each carousel shows one complete creative per slide.

Default maximum display size: **1216 × 495 CSS pixels**.
Recommended source resolution: **2432 × 990 pixels** for a sharp 2x display,
or **1216 × 495 pixels** at 1x. If you change the slot dimensions, export future
artwork at twice the new width and height. Upload that artwork through the
existing ads system; the frontend uses the original image URL from the API.

The image is fitted with `contain`, so all artwork remains visible. Images
with a different aspect ratio have blank space around them. Display settings
cannot add detail to a low-resolution source; no source images are resized
or recompressed by this change.

Preview locally with `npm start`. Verify a production build with
`npm run build -- --configuration production --base-href /app/`.
Changing this Sass configuration requires a rebuild for deployed applications.
