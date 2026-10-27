/** Canonical, canvas-normalized artwork. Keep API aliases here, not in screens. */
export const MOOD_ASSETS = {
  excited: 'assets/figma/child-home/moods/normalized-v1/excited.svg',
  happy: 'assets/figma/child-home/moods/normalized-v1/happy.svg',
  calm: 'assets/figma/child-home/moods/normalized-v1/calm.svg',
  anxious: 'assets/figma/child-home/moods/normalized-v1/anxious.svg',
  sad: 'assets/figma/child-home/moods/normalized-v1/sad.svg',
  frustrated: 'assets/figma/child-home/moods/normalized-v1/frustrated.svg',
} as const;

export const MOOD_ASSET_ALIASES: Readonly<Record<string, string>> = {
  HAPPY: MOOD_ASSETS.happy, 'VERY HAPPY': MOOD_ASSETS.happy,
  EXCITED: MOOD_ASSETS.excited,
  NEUTRAL: MOOD_ASSETS.calm, CALM: MOOD_ASSETS.calm,
  NERVOUS: MOOD_ASSETS.anxious, ANXIOUS: MOOD_ASSETS.anxious,
  SAD: MOOD_ASSETS.sad,
  UPSET: MOOD_ASSETS.frustrated, FRUSTRATED: MOOD_ASSETS.frustrated,
  'VERY SAD': MOOD_ASSETS.frustrated,
};

export function moodAsset(value: string): string | undefined {
  return MOOD_ASSET_ALIASES[String(value).trim().replace(/[_\-\s]+/g, ' ').toUpperCase()];
}
