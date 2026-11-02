import { CountryCode, getCountries, getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js/max';

export type PhoneCountry = CountryCode;
export const DEFAULT_PHONE_COUNTRY: PhoneCountry = 'IN';

// Use the numbering-plan metadata as the single source for countries and codes.
// DisplayNames supplies English labels without maintaining a duplicate country list.
const DisplayNames = (Intl as unknown as {
  DisplayNames?: new (locales: string[], options: { type: string }) => { of(code: string): string | undefined };
}).DisplayNames;
const names = DisplayNames ? new DisplayNames(['en'], { type: 'region' }) : undefined;

export const COUNTRIES = getCountries().map(code => ({
  code,
  name: names?.of(code) ?? code,
  callingCode: getCountryCallingCode(code),
})).sort((a, b) => a.name.localeCompare(b.name, 'en'));

function validPhone(value: string, country: PhoneCountry = DEFAULT_PHONE_COUNTRY) {
  if (!COUNTRIES.some(option => option.code === country) || !/^\d{1,17}$/.test(value)) return undefined;
  const phone = parsePhoneNumberFromString(value, country);
  // Shared calling codes must still match the selected country.
  return phone?.isValid() && phone.country === country ? phone : undefined;
}

export function isValidListingPhone(value: string, country?: PhoneCountry): boolean {
  return !!validPhone(value, country);
}

export function toListingSubmissionPhone(value: string, country: PhoneCountry = DEFAULT_PHONE_COUNTRY): string | undefined {
  const phone = validPhone(value, country);
  if (!phone) return undefined;
  // Keep the existing Indian API representation; retain the code for other countries.
  return country === 'IN' ? phone.nationalNumber : phone.number;
}
