import { toApiGender, toStoredGender } from './gender.model';

describe('gender model', () => {
  it('maps every supported selection to the backend contract', () => {
    expect(toApiGender('male')).toBe('MALE');
    expect(toApiGender('Female')).toBe('FEMALE');
    expect(toApiGender('prefer_not_to_say')).toBe('PREFER_NOT_TO_SAY');
    expect(toApiGender('Prefer not to say')).toBe('PREFER_NOT_TO_SAY');
  });

  it('keeps the privacy selection when storing API responses locally', () => {
    expect(toStoredGender('PREFER_NOT_TO_SAY')).toBe('prefer_not_to_say');
    expect(toStoredGender('unknown')).toBeUndefined();
  });
});
