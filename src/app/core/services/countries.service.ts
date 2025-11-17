import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

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

  // Fallback countries in case of loading failure
  private fallbackCountries: Country[] = [
    { name: 'India', code: '+91', flag: '🇮🇳', phoneLength: 10, iso: 'IN' },
    { name: 'United States', code: '+1', flag: '🇺🇸', phoneLength: 10, iso: 'US' },
    { name: 'United Kingdom', code: '+44', flag: '🇬🇧', phoneLength: 10, iso: 'GB' },
    { name: 'Australia', code: '+61', flag: '🇦🇺', phoneLength: 9, iso: 'AU' },
    { name: 'Canada', code: '+1', flag: '🇨🇦', phoneLength: 10, iso: 'CA' }
  ];

  constructor(private http: HttpClient) {
    this.loadCountries();
  }

  /**
   * Load countries from JSON file or external API
   */
  private loadCountries(): void {
    // Try to load from local JSON file first
    this.loadFromJson().subscribe({
      next: (countries) => {
        this.countriesSubject.next(countries);
      },
      error: (error) => {
        console.warn('Failed to load countries from JSON, using fallback:', error);
        this.countriesSubject.next(this.fallbackCountries);
      }
    });
  }

  /**
   * Load countries from local JSON file
   */
  private loadFromJson(): Observable<Country[]> {
    interface JsonCountry {
      name: string;
      flag: string;
      code: string; // ISO code
      dial_code: string; // Phone code
    }

    return this.http.get<JsonCountry[]>('/assets/data/countries.json').pipe(
      map((jsonCountries: JsonCountry[]) => {
        // Transform JSON data to Country interface and add phoneLength
        return jsonCountries.map(jsonCountry => ({
          name: jsonCountry.name,
          code: jsonCountry.dial_code, // dial_code becomes code
          flag: jsonCountry.flag,
          phoneLength: this.getPhoneLength(jsonCountry.code), // Use ISO code to get phone length
          iso: jsonCountry.code // code becomes iso
        })).sort((a, b) => a.name.localeCompare(b.name));
      }),
      catchError(error => {
        console.error('Error loading countries from JSON:', error);
        return of(this.fallbackCountries);
      })
    );
  }

  /**
   * Alternative: Load from external API (RestCountries or similar)
   * Uncomment and modify as needed
   */
  /*
  private loadFromAPI(): Observable<Country[]> {
    return this.http.get<any[]>('https://restcountries.com/v3.1/all?fields=name,flag,idd,cca2').pipe(
      map(apiCountries => {
        return apiCountries
          .filter(country => country.idd?.root && country.idd?.suffixes?.length > 0)
          .map(country => ({
            name: country.name.common,
            code: country.idd.root + (country.idd.suffixes[0] || ''),
            flag: this.getEmojiFlag(country.cca2),
            phoneLength: this.getPhoneLength(country.cca2),
            iso: country.cca2
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
      }),
      catchError(error => {
        console.error('Error loading countries from API:', error);
        return of(this.fallbackCountries);
      })
    );
  }
  */

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