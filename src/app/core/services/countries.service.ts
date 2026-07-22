import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Country {
  name: string;
  code: string;
  flag: string;
  phoneLength: number;
  iso: string;
}

@Injectable({
  providedIn: 'root'
})
export class CountriesService {
  private countriesSubject = new BehaviorSubject<Country[]>([]);
  public countries$ = this.countriesSubject.asObservable();

  // The app only officially supports these 5 markets — shown in this exact
  // order everywhere a country-code picker appears (signup, login, edit
  // profile, address input, etc.), matching the approved design reference.
  private supportedCountries: Country[] = [
    { name: 'United States', code: '+1', flag: '🇺🇸', phoneLength: 10, iso: 'US' },
    { name: 'United Kingdom', code: '+44', flag: '🇬🇧', phoneLength: 10, iso: 'GB' },
    { name: 'Australia', code: '+61', flag: '🇦🇺', phoneLength: 9, iso: 'AU' },
    { name: 'Canada', code: '+1', flag: '🇨🇦', phoneLength: 10, iso: 'CA' },
    { name: 'India', code: '+91', flag: '🇮🇳', phoneLength: 10, iso: 'IN' }
  ];

  constructor() {
    this.loadCountries();
  }

  /**
   * Load the supported country list. This used to fetch the full
   * assets/data/countries.json (every world country) — replaced with the
   * curated 5-country list the app actually supports.
   */
  private loadCountries(): void {
    this.countriesSubject.next(this.supportedCountries);
  }

  /**
   * Get all countries
   */
  getCountries(): Observable<Country[]> {
    return this.countries$;
  }

  /**
   * Get country by ISO code
   */
  getCountryByISO(iso: string): Observable<Country | undefined> {
    return this.countries$.pipe(
      map(countries => countries.find(country => country.iso === iso))
    );
  }

  /**
   * Get country by phone code
   */
  getCountryByCode(code: string): Observable<Country | undefined> {
    return this.countries$.pipe(
      map(countries => countries.find(country => country.code === code))
    );
  }

  /**
   * Search countries by name
   */
  searchCountries(query: string): Observable<Country[]> {
    return this.countries$.pipe(
      map(countries => 
        countries.filter(country => 
          country.name.toLowerCase().includes(query.toLowerCase())
        )
      )
    );
  }

  /**
   * Get default country (India)
   */
  getDefaultCountry(): Country {
    return { name: 'India', code: '+91', flag: '🇮🇳', phoneLength: 10, iso: 'IN' };
  }

  /**
   * Convert ISO country code to emoji flag
   */
  private getEmojiFlag(countryCode: string): string {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }

  /**
   * Get phone length for country
   */
  private getPhoneLength(countryCode: string): number {
    const phoneLengths: { [key: string]: number } = {
      // North America
      'US': 10, 'CA': 10, 'MX': 10,
      // Europe
      'GB': 10, 'DE': 11, 'FR': 10, 'IT': 10, 'ES': 9, 'NL': 9, 'BE': 9,
      'CH': 9, 'AT': 10, 'SE': 9, 'NO': 8, 'DK': 8, 'FI': 9, 'PL': 9,
      'PT': 9, 'GR': 10, 'IE': 9, 'CZ': 9, 'HU': 9, 'RO': 10, 'BG': 9,
      // Asia
      'IN': 10, 'CN': 11, 'JP': 10, 'KR': 10, 'SG': 8, 'MY': 9, 'TH': 9,
      'PH': 10, 'ID': 9, 'VN': 10, 'BD': 10, 'PK': 10, 'TR': 10, 'SA': 9,
      'AE': 9, 'IL': 9, 'HK': 8, 'TW': 9,
      // Oceania
      'AU': 9, 'NZ': 9,
      // South America
      'BR': 11, 'AR': 10, 'CL': 9, 'CO': 10, 'PE': 9, 'VE': 10,
      // Africa
      'ZA': 9, 'EG': 10, 'NG': 10, 'KE': 9, 'GH': 9,
      // Middle East
      'IR': 10, 'IQ': 10, 'KW': 8, 'QA': 8, 'OM': 8, 'BH': 8, 'JO': 9,
      // Other
      'RU': 10, 'UA': 9, 'KZ': 10
    };
    return phoneLengths[countryCode] || 10; // Default to 10
  }
}