/** Display the complete profile name; never use an avatar label as a person’s name. */
export function displayName(user: any): string {
  return [user?.fullName, user?.name, user?.username, user?.userName]
    .map(value => String(value ?? '').trim())
    .find(Boolean) || '';
}
