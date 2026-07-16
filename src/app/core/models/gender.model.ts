export type ApiGender = 'MALE' | 'FEMALE' | 'PREFER_NOT_TO_SAY';
export type StoredGender = 'male' | 'female' | 'prefer_not_to_say';

export function toApiGender(value: unknown): ApiGender | null {
  const normalized = String(value ?? '').trim().replace(/[\s-]+/g, '_').toUpperCase();
  const compact = normalized.replace(/_/g, '');

  if (compact === 'MALE') return 'MALE';
  if (compact === 'FEMALE') return 'FEMALE';
  if (compact === 'PREFERNOTTOSAY') return 'PREFER_NOT_TO_SAY';
  return null;
}

export function toStoredGender(value: unknown): StoredGender | undefined {
  const normalized = toApiGender(value);
  if (normalized === 'MALE') return 'male';
  if (normalized === 'FEMALE') return 'female';
  if (normalized === 'PREFER_NOT_TO_SAY') return 'prefer_not_to_say';
  return undefined;
}
