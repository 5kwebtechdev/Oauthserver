/**
 * Returns the first two visible letters of a profile or listing name.
 * This is shared by every image fallback so initials stay consistent.
 */
export function getProfileImageInitials(name: unknown): string {
  const letters = String(name ?? '')
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .slice(0, 2);

  return (letters || 'SM').toLocaleUpperCase();
}
