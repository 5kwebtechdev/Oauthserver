import { LocationSheetComponent, LocationOption } from '../eduhub-location-picker/location-sheet.component';
import { LOCATION_COUNTRIES } from '../eduhub-location-picker/location.data';
import { INDIA_STATES } from '../../../constants/india-location-options';
import { secureTemporaryStorage as sessionStorage } from '../../../storage/session-storage';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Input, ViewChild, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';

import { INDIA_STATE_OPTIONS } from '../../../constants/india-location-options';
import { ALL_EDUHUB_LOCATIONS, EduHubCityService } from '../../../services/eduhub-city.service';
import { LocationService } from '../../../services/location.service';
import { EduHubLocationApi, EduHubResolvedLocation } from '../../../services/eduhub-location.api';

const CURRENT_LOCATION_OPTION = '__current_location__';
const EDUHUB_LOCATION_PROMPTED_KEY = 'superme_eduhub_location_prompted';

@Component({
  selector: 'eduhub-city-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, LocationSheetComponent],
  templateUrl: './eduhub-city-selector.component.html',
  styleUrls: ['./eduhub-city-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EduHubCitySelectorComponent implements OnInit, OnDestroy {
  @Input() automaticOnly = false;
  @ViewChild(LocationSheetComponent) picker?: LocationSheetComponent;
  pickerKind: 'country' | 'city' = 'city';
  get country() { return LOCATION_COUNTRIES.find(item => item.code === this.cityService.country) || LOCATION_COUNTRIES[0]; }
  get allCountries(): boolean { return this.cityService.country === ALL_EDUHUB_LOCATIONS; }
  get displayedCity(): string { return this.cityService.allCities ? 'All' : this.cityService.resolvedCity || this.cityService.city || ''; }
  get pickerTitle(): string { return this.pickerKind === 'country' ? 'Select country' : 'Select city'; }
  get pickerSelected(): string {
    return this.pickerKind === 'country' ? this.cityService.country :
      this.cityService.allCities ? ALL_EDUHUB_LOCATIONS : this.displayedCity;
  }
  get pickerOptions(): LocationOption[] {
    const all = { value: ALL_EDUHUB_LOCATIONS, label: 'All' };
    if (this.pickerKind === 'country') return [all, ...LOCATION_COUNTRIES.map(item => ({ value: item.code, label: `${item.flag} ${item.name}` }))];
    const countries = this.allCountries ? LOCATION_COUNTRIES : [this.country];
    const cities = ([] as string[]).concat(...countries.map(country => country.cities));
    if (countries.some(country => country.code === 'IN')) {
      for (const group of Object.values(INDIA_STATES)) cities.push(...group);
    }
    if (this.displayedCity && !this.cityService.allCities) cities.push(this.displayedCity);
    return [all, ...[...new Set(cities)].sort((a, b) => a.localeCompare(b)).map(value => ({ value, label: value }))];
  }
  openPicker(kind: 'country' | 'city'): void {
    this.pickerKind = kind;
    this.cdr.detectChanges();
    const frame = this.host.nativeElement.closest<HTMLElement>('ion-content') || document.documentElement;
    this.picker?.open(frame);
  }
  pickLocation(value: string): void {
    this.manualSelectionVersion++;
    if (this.pickerKind === 'country') {
      const country = LOCATION_COUNTRIES.find(item => item.code === value);
      if (country || value === ALL_EDUHUB_LOCATIONS) this.cityService.selectCountry(value, ALL_EDUHUB_LOCATIONS);
    } else this.cityService.selectCity(value);
    this.syncRouteLocation();
    void this.picker?.close();
  }
  readonly currentLocationOption = CURRENT_LOCATION_OPTION;
  selectedLocation = '';
  isDetectingLocation = false;
  locationMessage = '';
  private manualSelectionVersion = 0;
  private readonly subscriptions = new Subscription();
  readonly states = INDIA_STATE_OPTIONS;
  readonly stateLabels: Record<string, string> = {
    'Andaman & Nicobar Islands': 'Andaman Nicobar',
    'Dadra & Nagar Haveli and Daman & Diu': 'Daman Diu',
    'Jammu & Kashmir': 'Jammu Kashmir'
  };

  constructor(
    readonly cityService: EduHubCityService,
    private readonly host: ElementRef<HTMLElement>,
    private readonly locationService: LocationService,
    private readonly locationApi: EduHubLocationApi,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.selectedLocation = this.cityService.state || this.cityService.city;
    this.subscriptions.add(this.cityService.location$.subscribe(() => {
      this.selectedLocation = this.cityService.state || this.cityService.city;
      this.cdr.markForCheck();
    }));

    // Home has no manual selector: resolve its location even if an old state
    // selection was saved, without changing the Home URL or inner-page controls.
    if (this.automaticOnly) {
      if (!this.cityService.isAutomaticLocation) {
        this.markLocationPromptedThisSession();
        void this.useCurrentLocation();
      }
      return;
    }

    // An explicit city in an inner-page URL always wins. Automatically asking
    // for the device location here could overwrite a city the user just chose
    // when the Ionic page is recreated or refreshed.
    const routeCity = String(this.route.snapshot.queryParamMap.get('city') ?? '').trim();
    const routeState = String(this.route.snapshot.queryParamMap.get('state') ?? '').trim();
    const routeCountry = this.route.snapshot.queryParamMap.get('country');
    const country = LOCATION_COUNTRIES.find(item => item.code === routeCountry);
    if (routeCountry === ALL_EDUHUB_LOCATIONS) this.cityService.selectCountry(routeCountry, routeCity || ALL_EDUHUB_LOCATIONS);
    if (country && country.code !== this.cityService.country) this.cityService.selectCountry(country.code, routeCity || country.cities[0]);
    if (routeCity && routeCity !== this.cityService.city) this.cityService.selectCity(routeCity);
    const canonicalRouteState = this.canonicalState(routeState);
    if (canonicalRouteState && canonicalRouteState !== this.cityService.state) this.cityService.selectState(canonicalRouteState);
    if (!routeCity && !routeState && !this.cityService.hasSavedCity() && !this.cityService.hasSavedState() && !this.wasLocationPromptedThisSession()) {
      this.markLocationPromptedThisSession();
      void this.useCurrentLocation();
    }
  }

  ngOnDestroy(): void {
    this.manualSelectionVersion++;
    this.subscriptions.unsubscribe();
  }

  selectLocation(location: string): void {
    if (location === CURRENT_LOCATION_OPTION) {
      void this.useCurrentLocation();
      return;
    }

    this.manualSelectionVersion++;
    this.locationMessage = '';
    const state = this.canonicalState(location);
    if (state) this.cityService.selectState(state);
    else this.cityService.selectCity(location); // Preserve an existing city deep link.
    this.syncRouteLocation();
  }

  async useCurrentLocation(): Promise<void> {
    if (this.isDetectingLocation) return;

    const selectionVersion = this.manualSelectionVersion;
    this.isDetectingLocation = true;
    this.locationMessage = 'Detecting current location…';
    this.cdr.markForCheck();

    try {
      let coordinates: { lat: number; lng: number } | undefined;
      try {
        const position = await this.locationService.getCurrentPosition();
        coordinates = { lat: position.coords.latitude, lng: position.coords.longitude };
      } catch {
        // The backend resolves the request IP when device coordinates are unavailable.
      }
      const location = await firstValueFrom(this.locationApi.resolve(coordinates));
      if (selectionVersion !== this.manualSelectionVersion) return;
      this.applyResolvedLocation(location);
    } catch (error) {
      console.warn('[EduHubCitySelector] Location resolution unavailable:', error);
      if (selectionVersion === this.manualSelectionVersion) {
        this.cityService.applyResolvedLocation({ city: 'Mumbai', state: 'Maharashtra', source: 'default', country: 'IN' });
        this.syncRouteLocation();
        this.locationMessage = 'Showing Maharashtra, India (default location).';
      }
    } finally {
      this.isDetectingLocation = false;
      this.cdr.markForCheck();
    }
  }

  private applyResolvedLocation(location: EduHubResolvedLocation): void {
    const state = this.canonicalState(location.state);
    const country = LOCATION_COUNTRIES.find(item => [item.name, item.code, item.shortName].some(value => value.toLowerCase() === location.country.toLowerCase()));
    this.cityService.applyResolvedLocation({
      city: location.city,
      country: country?.code || this.cityService.country,
      state: state || location.state || 'Maharashtra',
      source: location.source
    });
    this.syncRouteLocation();
    this.locationMessage = `${location.city}, ${location.state}, ${location.country} (${location.source} location)`;
  }

  private syncRouteLocation(): void {
    if (this.automaticOnly) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { country: this.cityService.country, city: this.cityService.allCities ? ALL_EDUHUB_LOCATIONS : this.cityService.city || this.displayedCity || null, state: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  private canonicalState(value: string): string {
    const normalized = String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const aliases: Record<string, string> = {
      jammukashmir: 'Jammu & Kashmir',
      damandiu: 'Dadra & Nagar Haveli and Daman & Diu',
      dadranagarhaveli: 'Dadra & Nagar Haveli and Daman & Diu',
      andamannicobar: 'Andaman & Nicobar Islands',
      nctofdelhi: 'Delhi',
      pondicherry: 'Puducherry',
      orissa: 'Odisha',
      uttaranchal: 'Uttarakhand'
    };
    return aliases[normalized] || this.states.find(state => state.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized) || '';
  }

  private wasLocationPromptedThisSession(): boolean {
    try {
      return sessionStorage.getItem(EDUHUB_LOCATION_PROMPTED_KEY) === 'true';
    } catch {
      return false;
    }
  }

  private markLocationPromptedThisSession(): void {
    try {
      sessionStorage.setItem(EDUHUB_LOCATION_PROMPTED_KEY, 'true');
    } catch {
      // Session storage can be unavailable in privacy-restricted browsers.
    }
  }
}
