/**
 * Returns the first two visible letters of a profile or listing name.
 *
 * Shared by profile cards and detail views so missing photos have a consistent
 * readable fallback.
 */
export function getProfileImageInitials(name: unknown): string {
  const letters = String(name ?? '')
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .slice(0, 2);

  return (letters || 'SM').toLocaleUpperCase();
}
