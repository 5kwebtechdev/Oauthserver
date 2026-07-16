export type StoredGender = 'male' | 'female' | 'prefer_not_to_say';
export type ApiGender = StoredGender;

function parseGender(value: unknown): StoredGender | undefined {
  const normalized = String(value ?? '').trim().replace(/[\s-]+/g, '_').toLowerCase();
  const compact = normalized.replace(/_/g, '');

  if (compact === 'male') return 'male';
  if (compact === 'female') return 'female';
  if (compact === 'prefernottosay') return 'prefer_not_to_say';
  return undefined;
}

export function toApiGender(value: unknown): ApiGender {
  return parseGender(value) ?? 'prefer_not_to_say';
}

export function toStoredGender(value: unknown): StoredGender | undefined {
  return parseGender(value);
}
