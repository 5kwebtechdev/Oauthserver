# Quiz score artwork

Source: Figma file `6QIdjw5pIXDVux5lFPPmKC`, section `330:43` (Quiz Score), inspected 2026-10-26.

These are transparent 4× PNG exports of the actual artwork layers, preserving Figma's crop and proportions. They are not generated substitutes or existing generic pet mood images.

| Pet | Good frame | Needs Attention frame |
| --- | --- | --- |
| Panda | 330:44 | 330:324 |
| Owl | 330:114 | 330:394 |
| Dragon | 330:184 | 330:464 |
| Llama | 330:254 | 330:534 |

Render each export at its Figma layer dimensions with `object-fit: contain`; the non-square crops retain their intrinsic proportions. Exports are 896 pixels high (224 CSS pixels at 4×), except the 908-pixel-high owl Needs Attention layer (227 CSS pixels). Layer widths are retained in the score component's artwork size mapping.

The display uses the submission API's existing percentage score: below 60 selects Needs Attention, 60 and above selects Good. The visible answer count remains the API's correct count out of its total questions. Pet selection comes from the existing PetAgeService.

Figma card: width 236, radius 24, inset stroke 1, padding 8 vertical/12 horizontal, caption gap 6. Nunito: label 17 SemiBold, numbers 24 Bold, “out of” 17 Bold, caption 15 SemiBold. Good: background #E8F5E9, stroke #4CAF50, caption #2E7D32. Needs Attention: background #F3F0EB, stroke/caption #7D5011. Main text #282527.
