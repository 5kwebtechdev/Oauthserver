/**
 * Returns the first two visible letters of a profile or listing name.
 *
 * Kept as a standalone helper for legacy callers. The shared profile-image
 * component deliberately does not use initials as a missing-image fallback.
 */
export function getProfileImageInitials(name: unknown): string {
  const letters = String(name ?? '')
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .slice(0, 2);

  return (letters || 'SM').toLocaleUpperCase();
}
