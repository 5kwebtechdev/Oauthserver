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
    // Prefer loading from the external REST Countries API. If that fails,
    // try the local JSON file, then finally use the hardcoded fallback list.
    this.loadFromAPI().subscribe({
      next: (countries) => this.countriesSubject.next(countries),
      error: (apiError) => {
        console.warn('Failed to load countries from API, falling back to local JSON', apiError);
        this.loadFromJson().subscribe({
          next: (countries) => this.countriesSubject.next(countries),
          error: (jsonError) => {
            console.warn('Failed to load countries from JSON, using fallback:', jsonError);
            this.countriesSubject.next(this.fallbackCountries);
          }
        });
      }
    });
  }

  /**
   * Load countries from local JSON file
   */
  private loadFromJson(): Observable<Country[]> {
    return this.http.get<Country[]>('/assets/data/countries.json').pipe(
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
        return (apiCountries || [])
          .map(country => {
            const iso = country.cca2 || '';
            // Build phone code: idd.root (like "+") + first suffix (if any)
            let code = '';
            if (country.idd && country.idd.root) {
              const suffix = Array.isArray(country.idd.suffixes) && country.idd.suffixes.length > 0 ? country.idd.suffixes[0] : '';
              code = (country.idd.root || '') + (suffix || '');
            }

            // Prefer the emoji flag returned by the API, otherwise generate from iso
            const flagEmoji = country.flag || (iso ? this.getEmojiFlag(iso) : '');

            return {
              name: country.name?.common || country.name || iso,
              code: code || '',
              flag: flagEmoji,
              phoneLength: this.getPhoneLength(iso),
              iso: iso || ''
            } as Country;
          })
          // Filter out entries without a phone code or iso
          .filter((c: Country) => !!c.iso && !!c.code)
          .sort((a: Country, b: Country) => a.name.localeCompare(b.name));
      }),
      catchError(error => {
        console.error('Error loading countries from API:', error);
        return of(this.fallbackCountries);
      })
    );
  }
  */

  private loadFromAPI(): Observable<Country[]> {
    // Implemented outside the commented block for clarity
    return this.http.get<any[]>('https://restcountries.com/v3.1/all?fields=name,flag,idd,cca2').pipe(
      map(apiCountries => {
        return (apiCountries || [])
          .map(country => {
            const iso = country.cca2 || '';
            let code = '';
            if (country.idd && country.idd.root) {
              const suffix = Array.isArray(country.idd.suffixes) && country.idd.suffixes.length > 0 ? country.idd.suffixes[0] : '';
              code = (country.idd.root || '') + (suffix || '');
            }
            const flagEmoji = country.flag || (iso ? this.getEmojiFlag(iso) : '');
            return {
              name: country.name?.common || country.name || iso,
              code: code || '',
              flag: flagEmoji,
              phoneLength: this.getPhoneLength(iso),
              iso: iso || ''
            } as Country;
          })
          .filter((c: Country) => !!c.iso && !!c.code)
          .sort((a: Country, b: Country) => a.name.localeCompare(b.name));
      }),
      catchError(error => {
        console.error('Error loading countries from API:', error);
        return of(this.fallbackCountries);
      })
    );
  }


  getCountries(): Observable<Country[]> {
    return this.countries$;
  }

  
  getCountryByISO(iso: string): Observable<Country | undefined> {
    return this.countries$.pipe(
      map(countries => countries.find(country => country.iso === iso))
    );
  }

  
  getCountryByCode(code: string): Observable<Country | undefined> {
    return this.countries$.pipe(
      map(countries => countries.find(country => country.code === code))
    );
  }

  
  searchCountries(query: string): Observable<Country[]> {
    return this.countries$.pipe(
      map(countries => 
        countries.filter(country => 
          country.name.toLowerCase().includes(query.toLowerCase())
        )
      )
    );
  }

  
  getDefaultCountry(): Country {
    return { name: 'India', code: '+91', flag: '🇮🇳', phoneLength: 10, iso: 'IN' };
  }

  
  private getEmojiFlag(countryCode: string): string {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }

  
  private getPhoneLength(countryCode: string): number {
    const phoneLengths: { [key: string]: number } = {
      'US': 10, 'CA': 10, 'GB': 10, 'IN': 10, 'AU': 9,
      'DE': 11, 'FR': 10, 'JP': 10, 'CN': 11, 'BR': 11,
      // Add more as needed
    };
    return phoneLengths[countryCode] || 10; // Default to 10
  }
}