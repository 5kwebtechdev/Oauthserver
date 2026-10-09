/** Limits for creating or changing a username; existing names remain displayable. */
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 10;

export type UsernameLengthError = 'usernameMinLength' | 'usernameMaxLength';

export const USERNAME_LENGTH_MESSAGES: Record<UsernameLengthError, string> = {
  usernameMinLength: 'Username must be at least 3 characters.',
  usernameMaxLength: 'Username cannot exceed 10 characters.'
};

export function usernameLengthError(value: string): UsernameLengthError | null {
  if (value.length < USERNAME_MIN_LENGTH) return 'usernameMinLength';
  if (value.length > USERNAME_MAX_LENGTH) return 'usernameMaxLength';
  return null;
}
