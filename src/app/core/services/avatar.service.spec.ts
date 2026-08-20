import { AvatarAgeGroup, AvatarService } from './avatar.service';

describe('AvatarService', () => {
  let service: AvatarService;

  beforeEach(() => {
    service = new AvatarService();
  });

  it('calculates age using the full birthday, including the day the birthday occurs', () => {
    const dayBeforeBirthday = new Date(2026, 7, 14);
    const birthday = new Date(2026, 7, 15);
    const dayAfterBirthday = new Date(2026, 7, 16);

    expect(service.calculateAge('2015-08-15', dayBeforeBirthday)).toBe(10);
    expect(service.calculateAge('2015-08-15', birthday)).toBe(11);
    expect(service.calculateAge('2015-08-15', dayAfterBirthday)).toBe(11);
    expect(service.calculateAge('2026-02-31', birthday)).toBeNull();
  });

  it('returns exactly six Figma avatars for each age and gender combination', () => {
    const cases: Array<{ age: number; gender: string; group: AvatarAgeGroup }> = [
      { age: 8, gender: 'MALE', group: 'BELOW_11' },
      { age: 10, gender: 'female', group: 'BELOW_11' },
      { age: 11, gender: 'Male', group: 'AGE_11_13' },
      { age: 13, gender: 'FEMALE', group: 'AGE_11_13' },
      { age: 14, gender: 'male', group: 'AGE_14_15' },
      { age: 15, gender: 'female', group: 'AGE_14_15' },
      { age: 16, gender: 'male', group: 'AGE_16_17' },
      { age: 17, gender: 'female', group: 'AGE_16_17' },
      { age: 18, gender: 'male', group: 'AGE_18_PLUS' },
      { age: 25, gender: 'female', group: 'AGE_18_PLUS' }
    ];

    const calculateAgeSpy = spyOn(service, 'calculateAge');
    for (const testCase of cases) {
      calculateAgeSpy.and.returnValue(testCase.age);
      const avatars = service.getAvatarsForUser('ignored-by-spy', testCase.gender);

      expect(avatars.length).toBe(6);
      expect(avatars.every(avatar => avatar.ageGroup === testCase.group)).toBeTrue();
      expect(avatars.every(avatar => avatar.gender === testCase.gender.toLowerCase())).toBeTrue();
    }
  });

  it('uses stable local assets and retains a safe mapping for old avatar names', () => {
    expect(service.getAllAvatars().length).toBe(60);
    expect(service.getAvatarAsset('14-15-male-3.png')?.value)
      .toBe('assets/figma/avatars/14-15-male-3.webp');

    spyOn(service, 'calculateAge').and.returnValue(16);
    const legacy = service.getAvatarForUser({ avatarImageName: 'Avatar 8', gender: 'male' });
    expect(legacy.key).toBe('16-17-male-2');
  });
});
