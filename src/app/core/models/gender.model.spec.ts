import { toApiGender, toStoredGender } from './gender.model';

describe('gender model', () => {
  it('maps every supported selection to the backend contract', () => {
    expect(toApiGender('male')).toBe('male');
    expect(toApiGender('Female')).toBe('female');
    expect(toApiGender('prefer_not_to_say')).toBe('prefer_not_to_say');
    expect(toApiGender('Prefer not to say')).toBe('prefer_not_to_say');
  });

  it('uses the privacy-preserving value for blank or unsupported API input', () => {
    expect(toApiGender('')).toBe('prefer_not_to_say');
    expect(toApiGender(null)).toBe('prefer_not_to_say');
    expect(toApiGender('other')).toBe('prefer_not_to_say');
  });

  it('keeps the privacy selection when storing API responses locally', () => {
    expect(toStoredGender('PREFER_NOT_TO_SAY')).toBe('prefer_not_to_say');
    expect(toStoredGender('unknown')).toBeUndefined();
  });
});
