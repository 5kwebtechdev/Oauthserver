import { usernameLengthError, USERNAME_LENGTH_MESSAGES } from './username-length';

describe('username length rule', () => {
  it('accepts only 3 through 10 characters', () => {
    expect(usernameLengthError('ab')).toBe('usernameMinLength');
    expect(usernameLengthError('abc')).toBeNull();
    expect(usernameLengthError('abcdefghij')).toBeNull();
    expect(usernameLengthError('abcdefghijk')).toBe('usernameMaxLength');
  });

  it('uses the approved validation messages', () => {
    expect(USERNAME_LENGTH_MESSAGES.usernameMinLength).toBe('Username must be at least 3 characters.');
    expect(USERNAME_LENGTH_MESSAGES.usernameMaxLength).toBe('Username cannot exceed 10 characters.');
  });
});
