/** Identical visible reward icons for activity confirmation popups. */
export function activityRewardIconHtml(kind: 'coin' | 'streak'): string {
  const size = 20;
  if (kind === 'coin') {
    return `<img src="assets/icons/superme-coin.webp" alt="coins" style="width:${size}px;height:${size}px;object-fit:contain;flex:none;display:block;"/>`;
  }
  return `<svg viewBox="96 20 96 140" preserveAspectRatio="xMidYMid meet" style="width:${size}px;height:${size}px;flex:none;display:block;" role="img" aria-label="streak"><image href="assets/icons/child-home-streak-figma.webp" width="288" height="192"/></svg>`;
}
