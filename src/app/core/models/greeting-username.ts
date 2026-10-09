/** Public-facing identity for self/child greetings; never fall back to a real name. */
export function greetingUsername(user: any): string {
  return String(user?.username ?? user?.userName ?? '').trim() || 'there';
}

/** Home header can show the saved account name while a username is unavailable. */
export function homeGreetingName(user: any): string {
  const username = [user?.username, user?.userName]
    .map(value => String(value ?? '').trim())
    .find(Boolean);
  if (username) return username;
  return [user?.name, user?.fullName, user?.displayName]
    .map(value => String(value ?? '').trim())
    .find(Boolean) || 'there';
}

/** Replace real-name personalization returned by the pet-message API. */
export function messageWithUsername(message: string, user: any): string {
  const username = greetingUsername(user);
  let result = String(message ?? '');
  const names = [user?.fullName, user?.name]
    .map(value => String(value ?? '').trim())
    .filter(value => value && value.toLowerCase() !== username.toLowerCase())
    .sort((a, b) => b.length - a.length);
  if (names.length) {
    const alternatives = [...new Set(names)]
      .map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');
    result = result.replace(new RegExp(`(^|[^\\p{L}\\p{N}_])(?:${alternatives})(?=$|[^\\p{L}\\p{N}_])`, 'giu'),
      (_match, before: string) => before + username);
  }
  return result.replace(/<Name>|<DisplayName>/gi, username);
}
