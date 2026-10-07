import { isBirthdayToday } from './birthday-date';

describe('birthday Home date', () => {
  const today = new Date(2026, 9, 7, 12);
  it('compares month and day without requiring the birth year', () => {
    expect(isBirthdayToday('2001-10-07', today)).toBeTrue();
    expect(isBirthdayToday('1999-10-07T00:00:00.000Z', today)).toBeTrue();
    expect(isBirthdayToday('2001-10-08', today)).toBeFalse();
  });
  it('does not show a birthday state for missing or invalid dates', () => {
    expect(isBirthdayToday(null, today)).toBeFalse();
    expect(isBirthdayToday('not-a-date', today)).toBeFalse();
  });
});
