import { usernameRuleError } from './username-rules';

describe('username rules shared by onboarding and Edit Profile', () => {
  it('accepts a short lowercase public identifier', () => {
    expect(usernameRuleError('super')).toBeNull();
    expect(usernameRuleError('user_123')).toBeNull();
  });

  it('rejects invalid format and structure with specific errors', () => {
    expect(usernameRuleError('Abc')).toBe('usernameUppercase');
    expect(usernameRuleError('a bc')).toBe('usernameSpaces');
    expect(usernameRuleError('ab!')).toBe('usernameInvalidCharacters');
    expect(usernameRuleError('ab')).toBe('usernameMinLength');
    expect(usernameRuleError('abcdefghijk')).toBe('usernameMaxLength');
    expect(usernameRuleError('_abc')).toBe('usernameStartsWithUnderscore');
    expect(usernameRuleError('123_456')).toBe('usernameMissingLetter');
  });

  it('blocks reserved, obfuscated inappropriate, and real-name identifiers', () => {
    expect(usernameRuleError('superme')).toBe('usernameReserved');
    expect(usernameRuleError('super_me')).toBe('usernameReserved');
    expect(usernameRuleError('f_u_c_k')).toBe('usernameProfanity');
    expect(usernameRuleError('john_23', 'John Smith')).toBe('usernameLooksLikeRealName');
  });
});
