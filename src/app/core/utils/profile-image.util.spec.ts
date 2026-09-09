import { getProfileImageInitials } from './profile-image.util';

describe('getProfileImageInitials', () => {
  it('returns the first two letters of a name', () => {
    expect(getProfileImageInitials('Seagull Books')).toBe('SE');
  });

  it('ignores spaces and punctuation', () => {
    expect(getProfileImageInitials('  A-B Store')).toBe('AB');
  });

  it('uses the SuperMe fallback when a name is unavailable', () => {
    expect(getProfileImageInitials(null)).toBe('SM');
  });
});
