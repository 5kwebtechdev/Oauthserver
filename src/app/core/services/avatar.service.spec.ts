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
      { age: 24, gender: 'female', group: 'AGE_18_PLUS' },
      { age: 25, gender: 'female', group: 'AGE_25_PLUS' }
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
    expect(service.getAllAvatars().length).toBe(72);
    expect(service.getAvatarAsset('14-15-male-3.webp')?.value)
      .toBe('assets/figma/avatars/14-15-final/14-15-3.webp');

    spyOn(service, 'calculateAge').and.returnValue(16);
    const legacy = service.getAvatarForUser({ avatarImageName: 'Avatar 8', gender: 'male' });
    expect(legacy.key).toBe('16-17-male-2');
  });

  it('uses the 25+ artwork for every role, in its existing order', () => {
    const maleAvatars = service.getAvatarsForUser('1985-01-01', 'male', 'parent');
    const femaleAvatars = service.getAvatarsForUser('1985-01-01', 'female', 'SELF');

    expect(maleAvatars.length).toBe(6);
    expect(maleAvatars.every(avatar => avatar.audience === 'parent' && avatar.gender === 'male')).toBeTrue();
    expect(maleAvatars[0].imageName).toBe('Parent1.webp');
    expect(femaleAvatars.length).toBe(6);
    expect(femaleAvatars.every(avatar => avatar.audience === 'parent' && avatar.gender === 'female')).toBeTrue();
    expect(femaleAvatars[0].imageName).toBe('Parent1F.webp');
  });

  it('remaps an existing adult avatar to the matching 25+ artwork by age', () => {
    const avatar = service.getAvatarForUser({
      dateOfBirth: '1985-01-01',
      relationship: 'SELF',
      gender: 'male',
      avatarName: '18-plus-male-3'
    });

    expect(avatar.key).toBe('parent-male-3');
    expect(avatar.value).toBe('assets/figma/avatars/parents/Parent3.webp');
  });

  it('keeps 18-24 artwork for a parent under 25, including an old parent selection', () => {
    const dob = new Date().getFullYear() - 24 + '-01-01';
    expect(service.getAvatarsForUser(dob, 'male', 'PARENT')[0].key).toBe('18-plus-male-1');
    expect(service.getAvatarForUser({ dateOfBirth: dob, relationship: 'PARENT', avatarName: 'parent-male-3' }).key)
      .toBe('18-plus-male-3');
  });

  it('uses the final Below 11 images for child and self signup', () => {
    spyOn(service, 'calculateAge').and.returnValue(8);

    const childMale = service.getAvatarsForUser('ignored-by-spy', 'male', 'child');
    const selfFemale = service.getAvatarsForUser('ignored-by-spy', 'female', 'self');

    expect(childMale.length).toBe(6);
    expect(childMale[0].value).toBe('assets/figma/avatars/below-11-final/Below11-1.webp');
    expect(selfFemale.length).toBe(6);
    expect(selfFemale[0].value).toBe('assets/figma/avatars/below-11-final/Below11-1F.webp');
  });

  it('uses the final 18+ images for child and self roles', () => {
    spyOn(service, 'calculateAge').and.returnValue(24);

    const selfMale = service.getAvatarsForUser('ignored-by-spy', 'male', 'self');
    const childFemale = service.getAvatarsForUser('ignored-by-spy', 'female', 'child');

    expect(selfMale.length).toBe(6);
    expect(selfMale[0].value).toBe('assets/figma/avatars/18-plus-final/18plus-1.webp');
    expect(childFemale.length).toBe(6);
    expect(childFemale[0].value).toBe('assets/figma/avatars/18-plus-final/18plus-1F.webp');
  });

  it('uses the final age 16-17 images for both genders', () => {
    spyOn(service, 'calculateAge').and.returnValue(16);

    const maleAvatars = service.getAvatarsForUser('ignored-by-spy', 'male', 'self');
    const femaleAvatars = service.getAvatarsForUser('ignored-by-spy', 'female', 'child');

    expect(maleAvatars.length).toBe(6);
    expect(maleAvatars[0].value).toBe('assets/figma/avatars/16-17-final/16-17-1.webp');
    expect(femaleAvatars.length).toBe(6);
    expect(femaleAvatars[0].value).toBe('assets/figma/avatars/16-17-final/16-17-1F.webp');
  });

  it('uses the final age 14-15 images for both genders', () => {
    spyOn(service, 'calculateAge').and.returnValue(14);

    const maleAvatars = service.getAvatarsForUser('ignored-by-spy', 'male', 'child');
    const femaleAvatars = service.getAvatarsForUser('ignored-by-spy', 'female', 'self');

    expect(maleAvatars.length).toBe(6);
    expect(maleAvatars[0].value).toBe('assets/figma/avatars/14-15-final/14-15-1.webp');
    expect(femaleAvatars.length).toBe(6);
    expect(femaleAvatars[0].value).toBe('assets/figma/avatars/14-15-final/14-15-1F.webp');
  });

  it('uses the final age 11-13 images for both genders', () => {
    spyOn(service, 'calculateAge').and.returnValue(12);

    const maleAvatars = service.getAvatarsForUser('ignored-by-spy', 'male', 'self');
    const femaleAvatars = service.getAvatarsForUser('ignored-by-spy', 'female', 'child');

    expect(maleAvatars.length).toBe(6);
    expect(maleAvatars[0].value).toBe('assets/figma/avatars/11-13-final/11-13-1.webp');
    expect(femaleAvatars.length).toBe(6);
    expect(femaleAvatars[0].value).toBe('assets/figma/avatars/11-13-final/11-13-1F.webp');
  });
});
