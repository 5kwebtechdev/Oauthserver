import type { SupermePopupConfig } from '../superme-popup/superme-popup.component';

const confirmationCopy = {
  start: {
    heading: 'Ready to Start?',
    subtitle: "You're about to begin this Habit/Task!",
    primary: 'Start Now',
    secondary: 'Discard',
  },
  complete: {
    heading: 'Great Work!',
    subtitle: "You're about to mark this activity as completed. Confirm below to earn your coins and streak:",
    primary: 'Confirm',
    secondary: 'Discard',
  },
  abort: {
    heading: 'You’re halfway there! Want to stop now?',
    subtitle: 'You are about to lose:',
    primary: 'Keep Going',
    secondary: 'Abort Anyways',
  },
};

export function activityConfirmationConfig(
  action: keyof typeof confirmationCopy,
  rewards?: SupermePopupConfig['activityRewards'],
): SupermePopupConfig {
  const copy = confirmationCopy[action];
  return {
    activityConfirmation: true,
    activityRewards: rewards,
    image: `assets/figma/activity-confirmation/${action}.webp`,
    imageAlt: "",
    heading: copy.heading,
    subtitle: copy.subtitle,
    primaryCTA: { text: copy.primary },
    secondaryCTA: { text: copy.secondary },
    showCloseButton: false,
  };
}
