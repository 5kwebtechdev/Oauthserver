/** Identical visible reward icons for activity confirmation popups. */
export function activityRewardIconHtml(kind: 'coin' | 'streak'): string {
  const size = 20;
  if (kind === 'coin') {
    return `<img src="assets/icons/superme-coin.webp" alt="coins" style="width:${size}px;height:${size}px;object-fit:contain;flex:none;display:block;"/>`;
  }
  const isStreak = kind === 'streak';
  const viewBox = isStreak ? '33 8 31 44' : '12 8 72 73';
  const imageHeight = isStreak ? 64 : 96;
  const ratio = isStreak ? ' preserveAspectRatio="none"' : '';
  const label = isStreak ? 'streak' : 'coins';
  return `<svg viewBox="${viewBox}"${ratio} style="width:${size}px;height:${size}px;flex:none;display:block;" role="img" aria-label="${label}"><image href="assets/figma/parent-home/${kind}.webp" width="96" height="${imageHeight}"/></svg>`;
}
