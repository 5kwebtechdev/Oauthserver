import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const EDUHUB_CITY_STORAGE_KEY = 'superme_eduhub_city';
const EDUHUB_STATE_STORAGE_KEY = 'superme_eduhub_state';
const EDUHUB_AUTO_LOCATION_KEY = 'superme_eduhub_auto_location';
const CURRENT_LOCATION_OPTION = '__current_location__';

@Injectable({ providedIn: 'root' })
export class EduHubCityService {
  private automaticCity = this.readAutomaticLocation()?.city || '';
  private automaticSource: 'device' | 'ip' | 'default' | null = this.readAutomaticLocation()?.source || null;
  private readonly citySubject = new BehaviorSubject<string>(this.readCity());
  readonly city$ = this.citySubject.asObservable();
  private readonly stateSubject = new BehaviorSubject<string>(this.readState() || (this.hasSavedCity() ? '' : 'Maharashtra'));
  readonly state$ = this.stateSubject.asObservable();
  private readonly locationSubject = new BehaviorSubject<void>(undefined);
  readonly location$ = this.locationSubject.asObservable();

  get city(): string {
    return this.stateSubject.value ? '' : this.citySubject.value;
  }

  get state(): string { return this.stateSubject.value; }

  get resolvedCity(): string { return this.automaticCity; }
  get isAutomaticLocation(): boolean { return this.automaticSource !== null; }

  get filter(): { city?: string; state?: string } {
    return this.state
      ? { state: this.state, ...(this.isAutomaticLocation && this.automaticCity ? { city: this.automaticCity } : {}) }
      : { city: this.city };
  }

  selectState(state: string): void {
    const nextState = String(state || '').trim();
    if (!nextState) return;
    const wasAutomatic = this.automaticSource !== null;
    this.automaticSource = null;
    this.automaticCity = '';
    try { sessionStorage.removeItem(EDUHUB_AUTO_LOCATION_KEY); } catch {}
    if (nextState === this.state) {
      if (wasAutomatic) this.locationSubject.next();
      return;
    }
    this.stateSubject.next(nextState);
    try { localStorage.setItem(EDUHUB_STATE_STORAGE_KEY, nextState); } catch {}
    this.locationSubject.next();
  }

  applyResolvedLocation(location: { city: string; state: string; source: 'device' | 'ip' | 'default' }): void {
    this.automaticCity = String(location.city || '').trim();
    this.automaticSource = location.source;
    const state = String(location.state || '').trim();
    if (state) {
      try { sessionStorage.setItem(EDUHUB_AUTO_LOCATION_KEY, JSON.stringify({ city: this.automaticCity, state, source: location.source })); } catch {}
      this.stateSubject.next(state);
      try { localStorage.setItem(EDUHUB_STATE_STORAGE_KEY, state); } catch {}
      this.locationSubject.next();
    }
  }

  selectCity(city: string): void {
    const nextCity = String(city || '').trim();
    // The selector action is not a city and must never become persisted
    // filter state. It can otherwise make every real tutor fail matching.
    if (!nextCity || this.isCurrentLocationAction(nextCity) || (!this.state && nextCity === this.citySubject.value)) return;

    this.citySubject.next(nextCity);
    this.automaticSource = null;
    this.automaticCity = '';
    try { sessionStorage.removeItem(EDUHUB_AUTO_LOCATION_KEY); } catch {}
    this.stateSubject.next('');
    try {
      localStorage.setItem(EDUHUB_CITY_STORAGE_KEY, nextCity);
      localStorage.removeItem(EDUHUB_STATE_STORAGE_KEY);
    } catch {
      // Storage can be unavailable in privacy-restricted browser sessions.
    }
    this.locationSubject.next();
  }

  hasSavedState(): boolean {
    try { return !!localStorage.getItem(EDUHUB_STATE_STORAGE_KEY)?.trim(); }
    catch { return false; }
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

  private readState(): string {
    try { return localStorage.getItem(EDUHUB_STATE_STORAGE_KEY)?.trim() || ''; }
    catch { return ''; }
  }

  private readAutomaticLocation(): { city: string; source: 'device' | 'ip' | 'default' } | null {
    try {
      const location = JSON.parse(sessionStorage.getItem(EDUHUB_AUTO_LOCATION_KEY) || 'null');
      return location?.state && location.state === this.readState() && location?.city
        && ['device', 'ip', 'default'].includes(location.source) ? location : null;
    } catch { return null; }
  }

  private isCurrentLocationAction(value: string): boolean {
    const normalized = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    return normalized === CURRENT_LOCATION_OPTION || normalized === 'use_current_location';
  }
}
