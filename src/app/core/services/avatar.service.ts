import { Injectable } from '@angular/core';

export type AvatarAgeGroup = 'BELOW_11' | 'AGE_11_13' | 'AGE_14_15' | 'AGE_16_17' | 'AGE_18_PLUS';
export type AvatarGender = 'male' | 'female';

export interface AvatarDefinition {
  /** Stable value kept in the existing avatarName API field. */
  key: string;
  /** Figma component variant name, used as accessible text. */
  label: string;
  /** Stable local Figma asset filename kept in avatarImageName. */
  imageName: string;
  value: string;
  ageGroup: AvatarAgeGroup;
  gender: AvatarGender;
  index: number;
}

interface AvatarGroupDefinition {
  ageGroup: AvatarAgeGroup;
  minimumAge: number;
  maximumAge: number | null;
  filePrefix: string;
  figmaLabel: (gender: AvatarGender, index: number) => string;
}

const AVATAR_GROUPS: AvatarGroupDefinition[] = [
  {
    ageGroup: 'BELOW_11', minimumAge: 0, maximumAge: 10, filePrefix: 'below-11',
    figmaLabel: (gender, index) => `Below 11-${gender === 'male' ? 'Male' : 'Female'}${index}`
  },
  {
    ageGroup: 'AGE_11_13', minimumAge: 11, maximumAge: 13, filePrefix: '11-13',
    figmaLabel: (gender, index) => `11-13-${gender === 'male' ? 'Male' : 'Female'}${index}`
  },
  {
    ageGroup: 'AGE_14_15', minimumAge: 14, maximumAge: 15, filePrefix: '14-15',
    figmaLabel: (gender, index) => `14 & 15-${gender === 'male' ? 'Male' : 'Female'}${index}`
  },
  {
    ageGroup: 'AGE_16_17', minimumAge: 16, maximumAge: 17, filePrefix: '16-17',
    figmaLabel: (gender, index) => `16 & 17- ${gender === 'male' ? 'Male' : 'Female'}${index}`
  },
  {
    ageGroup: 'AGE_18_PLUS', minimumAge: 18, maximumAge: null, filePrefix: '18-plus',
    figmaLabel: (gender, index) => `18+-${gender === 'male' ? 'Male' : 'Female'}${index}`
  }
];

const AVATARS: AvatarDefinition[] = AVATAR_GROUPS.reduce((avatars, group) => {
  (['male', 'female'] as AvatarGender[]).forEach(gender => {
    for (let index = 1; index <= 6; index++) {
      const key = `${group.filePrefix}-${gender}-${index}`;
      avatars.push({
        key,
        label: group.figmaLabel(gender, index),
        imageName: `${key}.png`,
        value: `assets/figma/avatars/${key}.png`,
        ageGroup: group.ageGroup,
        gender,
        index
      });
    }
  });
  return avatars;
}, [] as AvatarDefinition[]);

@Injectable({ providedIn: 'root' })
export class AvatarService {
  /** The exact current age, calculated using day, month, and year. */
  calculateAge(dateOfBirth: unknown, today = new Date()): number | null {
    const birthday = this.parseDate(dateOfBirth);
    if (!birthday) return null;

    let age = today.getFullYear() - birthday.getFullYear();
    const birthdayHasNotOccurred = today.getMonth() < birthday.getMonth()
      || (today.getMonth() === birthday.getMonth() && today.getDate() < birthday.getDate());
    if (birthdayHasNotOccurred) age--;

    return age >= 0 ? age : null;
  }

  getAgeGroup(dateOfBirth: unknown): AvatarAgeGroup | null {
    const age = this.calculateAge(dateOfBirth);
    if (age === null) return null;
    return AVATAR_GROUPS.find(group => age >= group.minimumAge
      && (group.maximumAge === null || age <= group.maximumAge))?.ageGroup || 'AGE_18_PLUS';
  }

  normalizeGender(gender: unknown): AvatarGender | null {
    const normalized = String(gender || '').trim().toLowerCase().replace(/[\s_-]/g, '');
    if (normalized === 'male') return 'male';
    if (normalized === 'female') return 'female';
    return null;
  }

  /**
   * Returns only the Figma avatar variants valid for a user's DOB and gender.
   * If one of these optional details is unavailable, the current safe adult
   * group is used and both genders remain selectable instead of breaking UI.
   */
  getAvatarsForUser(dateOfBirth: unknown, gender: unknown): AvatarDefinition[] {
    const ageGroup = this.getAgeGroup(dateOfBirth) || 'AGE_18_PLUS';
    const normalizedGender = this.normalizeGender(gender);
    return AVATARS.filter(avatar => avatar.ageGroup === ageGroup
      && (!normalizedGender || avatar.gender === normalizedGender));
  }

  getAvatarAsset(avatarImageName: unknown): AvatarDefinition | null {
    const normalized = this.normalizeAvatarIdentifier(avatarImageName);
    if (!normalized) return null;
    return AVATARS.find(avatar =>
      normalized === this.normalizeAvatarIdentifier(avatar.key)
      || normalized === this.normalizeAvatarIdentifier(avatar.imageName)
      || normalized === this.normalizeAvatarIdentifier(avatar.label)
    ) || null;
  }

  /** Resolve a current Figma avatar, preserving old saved avatar values safely. */
  getAvatarForUser(user: any): AvatarDefinition {
    const direct = this.getAvatarAsset(this.extractAvatarIdentifier(user));
    if (direct) return direct;

    const legacy = this.getLegacyAvatar(user);
    if (legacy) return legacy;

    return this.getFallbackAvatar(user?.dateOfBirth || user?.dob, user?.gender);
  }

  getFallbackAvatar(dateOfBirth: unknown, gender: unknown): AvatarDefinition {
    const options = this.getAvatarsForUser(dateOfBirth, gender);
    return options[0] || AVATARS.find(avatar => avatar.key === '18-plus-male-1')!;
  }

  getAllAvatars(): readonly AvatarDefinition[] {
    return AVATARS;
  }

  private getLegacyAvatar(user: any): AvatarDefinition | null {
    const identifier = String(this.extractAvatarIdentifier(user) || '').trim();
    const normalized = identifier.toLowerCase();
    let gender = this.normalizeGender(user?.gender);
    let index: number | null = null;

    const oldAvatarNumber = normalized.match(/^avatar\s*(\d+)$/i)?.[1];
    if (oldAvatarNumber) {
      const key = Number(oldAvatarNumber);
      if (key >= 1 && key <= 6) {
        gender = 'female';
        index = key;
      } else if (key >= 7 && key <= 12) {
        gender = 'male';
        index = key - 6;
      }
    }

    const oldImage = normalized.match(/(?:image)?(?:onboarding|details)avatar(female|male)?(\d+)/i);
    if (oldImage) {
      gender = this.normalizeGender(oldImage[1]) || gender;
      index = Number(oldImage[2]);
    }

    if (!gender || !index || index < 1 || index > 6) return null;
    const group = this.getAgeGroup(user?.dateOfBirth || user?.dob) || 'AGE_18_PLUS';
    return AVATARS.find(avatar => avatar.ageGroup === group && avatar.gender === gender && avatar.index === index) || null;
  }

  private extractAvatarIdentifier(user: any): string {
    if (!user) return '';
    const candidates = [
      user.avatar?.avatarImageName,
      user.avatarImageName,
      user.avatar?.imageName,
      user.avatar?.avatarName,
      user.avatarName,
      user.imageName,
      user.avatar?.image?.name
    ];
    return candidates.find(value => String(value || '').trim())?.toString().trim() || '';
  }

  private normalizeAvatarIdentifier(value: unknown): string {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\.png$/i, '')
      .replace(/[^a-z0-9]/g, '');
  }

  private parseDate(value: unknown): Date | null {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    const text = String(value || '').trim();
    if (!text) return null;
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      const year = Number(iso[1]);
      const month = Number(iso[2]) - 1;
      const day = Number(iso[3]);
      const date = new Date(year, month, day);
      // Prevent JavaScript's date rollover (for example, 2026-02-31).
      return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day
        ? date
        : null;
    }

    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
