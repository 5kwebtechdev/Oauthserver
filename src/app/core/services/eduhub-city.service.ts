import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const EDUHUB_CITY_STORAGE_KEY = 'superme_eduhub_city';
const CURRENT_LOCATION_OPTION = '__current_location__';

@Injectable({ providedIn: 'root' })
export class EduHubCityService {
  private readonly citySubject = new BehaviorSubject<string>(this.readCity());
  readonly city$ = this.citySubject.asObservable();

  get city(): string {
    return this.citySubject.value;
  }

  selectCity(city: string): void {
    const nextCity = String(city || '').trim();
    // The selector action is not a city and must never become persisted
    // filter state. It can otherwise make every real tutor fail matching.
    if (!nextCity || this.isCurrentLocationAction(nextCity) || nextCity === this.citySubject.value) return;

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
      const savedCity = localStorage.getItem(EDUHUB_CITY_STORAGE_KEY)?.trim();
      if (savedCity && !this.isCurrentLocationAction(savedCity)) return savedCity;
      if (savedCity) localStorage.removeItem(EDUHUB_CITY_STORAGE_KEY);
      return 'Mumbai';
    } catch {
      return 'Mumbai';
    }
  }

  private isCurrentLocationAction(value: string): boolean {
    const normalized = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    return normalized === CURRENT_LOCATION_OPTION || normalized === 'use_current_location';
  }
}
