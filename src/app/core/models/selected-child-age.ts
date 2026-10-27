import { ChildInfo } from './child-info.model';

/** Numeric age for a selected child; never substitute the parent's age. */
export function selectedChildAge(child: ChildInfo | null): number | null {
  const dateOfBirth = String(child?.dateOfBirth || '').trim();
  if (dateOfBirth) {
    const birthDate = new Date(dateOfBirth);
    if (!Number.isNaN(birthDate.getTime())) {
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDifference = today.getMonth() - birthDate.getMonth();
      if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) age--;
      if (age >= 0) return age;
    }
  }
  const rawAge = child?.age;
  const age = rawAge == null || String(rawAge).trim() === '' ? NaN : Number(rawAge);
  return Number.isFinite(age) && age >= 0 ? Math.floor(age) : null;
}
