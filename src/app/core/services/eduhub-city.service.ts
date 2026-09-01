import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const EDUHUB_CITY_STORAGE_KEY = 'superme_eduhub_city';

@Injectable({ providedIn: 'root' })
export class EduHubCityService {
  private readonly citySubject = new BehaviorSubject<string>(this.readCity());
  readonly city$ = this.citySubject.asObservable();

  get city(): string {
    return this.citySubject.value;
  }

  selectCity(city: string): void {
    const nextCity = String(city || '').trim();
    if (!nextCity || nextCity === this.citySubject.value) return;

    this.citySubject.next(nextCity);
    try {
      localStorage.setItem(EDUHUB_CITY_STORAGE_KEY, nextCity);
    } catch {
      // Storage can be unavailable in privacy-restricted browser sessions.
    }
  }

  hasSavedCity(): boolean {
    try {
      return !!localStorage.getItem(EDUHUB_CITY_STORAGE_KEY)?.trim();
    } catch {
      return false;
    }
  }

  private readCity(): string {
    try {
      return localStorage.getItem(EDUHUB_CITY_STORAGE_KEY)?.trim() || 'Mumbai';
    } catch {
      return 'Mumbai';
    }
  }
}
