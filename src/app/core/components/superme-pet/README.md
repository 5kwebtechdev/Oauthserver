Mindful Pet Component

Usage:
- Selector: `mindful-pet`
- Standalone component. Import is not required when used in templates (Angular recognizes the selector).

Inputs:
- `pet` ("panda" | "dragon" | "llama" | "owl") - default: `panda`
- `age` (number) - default: `1`
- `name` (string) - optional display name; if omitted the capitalized `pet` key is used
- `mood` ("happy" | "sleepy" | "playful" | "sad") - optional visual mood text
- `size` (number) - image pixel size (defaults to 48)
- `imageOverride` (string) - optional direct image path to override computed asset path
 - `sizePreset` ('68' | '96') - optional preset pixel sizes (68px or 96px). Overrides `size` when set.

Assets:
- Place pet images in `src/assets/Pets/` with the following filenames:
  - `panda.webp`
  - `dragon.webp`
  - `llama.webp`
  - `owl.webp`

Advanced (optional) asset organization for age/mood-specific images:
- You can add more specific images and the component will automatically try them in this order (most specific -> fallback):
  1. `assets/Pets/<pet>/age_<age>/mood_<mood>.webp`  (e.g. `assets/Pets/panda/age_1/mood_playful.webp`)
  2. `assets/Pets/<pet>/age_<age>.webp`            (e.g. `assets/Pets/panda/age_1.webp`)
  3. `assets/Pets/<pet>.webp`                      (e.g. `assets/Pets/panda.webp`)

Available moods:
- `default` (no mood-specific image)
- `happy`
- `anger`
- `tired`
- `playful`
- `curious`

Examples for this project (existing folders):
- `assets/Pets/Panda Variants/` contains files like `Age-1-Happy.svg`, `Age-2-Playful.svg`, etc.
- `assets/Pets/Dragon Variants/`, `assets/Pets/Llama Variants/`, `assets/Pets/Owl Variants/` follow the same naming.

The component will try the variants folder names first (e.g. `assets/Pets/Panda Variants/Age-1-Happy.svg`) and then fall back to other patterns.

Notes:
- For now age and mood are displayed as text. Future versions can include age/mood-specific animations or images.
