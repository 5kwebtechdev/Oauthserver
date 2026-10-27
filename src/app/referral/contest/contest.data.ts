/**
 * Static content for the Refer & Win contest.
 * Swap for an API response later — the templates only read these shapes.
 * Figma: "Referral Contest" (26911:35163)
 */

export type PodiumTier = 'gold' | 'silver' | 'bronze';

export interface PodiumPrize {
  rank: 1 | 2 | 3;
  tier: PodiumTier;
  /** Text printed on the stand (as written in Figma). */
  label: string;
  /** Transparent phone render. */
  image: string;
  /** Podium artwork sheet; each tier shows a cropped window of it (see .stand--* in SCSS). */
  standImage: string;
}

export interface ParticipationStep {
  index: number;
  label: string;
  icon: 'share' | 'friends' | 'prize';
  tone: 'purple' | 'pink' | 'green';
}

const ASSETS = 'assets/referral/contest';

export const CONTEST_DURATION_MONTHS = 3;

/** External pages, opened in the system browser. */
export const CONTEST_LINKS = {
  terms: 'https://supermeapp.com/terms-of-use',
  faqs: 'https://supermeapp.com/faq',
};

/** Display order on the podium: 2nd, 1st, 3rd. */
export const PODIUM_PRIZES: PodiumPrize[] = [
  { rank: 2, tier: 'silver', label: 'Samsung S26', image: `${ASSETS}/samsung-s26.webp`, standImage: `${ASSETS}/stand-silver.png` },
  { rank: 1, tier: 'gold', label: 'Iphone 18 Pro', image: `${ASSETS}/iphone-18-pro.png`, standImage: `${ASSETS}/stand-gold.png` },
  { rank: 3, tier: 'bronze', label: 'Samsung S26 FE', image: `${ASSETS}/samsung-s26-fe.webp`, standImage: `${ASSETS}/stand-bronze.png` },
];

export const VOUCHER_PRIZE = {
  ranks: '4th – 10th Prizes',
  title: 'Amazon Vouchers',
  amountPrefix: 'upto',
  amount: '₹15,000',
};

export const OTHER_PRIZES_TEXT = 'And Tons of other exciting prizes!';

/** Artwork sheet holding the voucher stack and gift boxes (cropped per card in SCSS). */
export const VOUCHER_ART = `${ASSETS}/vouchers.png`;
export const GIFTS_ART = `${ASSETS}/gifts.png`;

export const PARTICIPATION_STEPS: ParticipationStep[] = [
  { index: 1, label: 'Share your referral link', icon: 'share', tone: 'purple' },
  { index: 2, label: 'Your friends join SuperMeApp', icon: 'friends', tone: 'pink' },
  { index: 3, label: 'Get closer to amazing prizes!', icon: 'prize', tone: 'green' },
];
