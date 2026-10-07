import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';

import { INDIA_STATE_OPTIONS } from '../../../constants/india-location-options';
import { EduHubCityService } from '../../../services/eduhub-city.service';
import { LocationService } from '../../../services/location.service';
import { EduHubLocationApi, EduHubResolvedLocation } from '../../../services/eduhub-location.api';

const CURRENT_LOCATION_OPTION = '__current_location__';
const EDUHUB_LOCATION_PROMPTED_KEY = 'superme_eduhub_location_prompted';

@Component({
  selector: 'eduhub-city-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './eduhub-city-selector.component.html',
  styleUrls: ['./eduhub-city-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EduHubCitySelectorComponent implements OnInit, OnDestroy {
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

    // An explicit city in an inner-page URL always wins. Automatically asking
    // for the device location here could overwrite a city the user just chose
    // when the Ionic page is recreated or refreshed.
    const routeCity = String(this.route.snapshot.queryParamMap.get('city') ?? '').trim();
    const routeState = String(this.route.snapshot.queryParamMap.get('state') ?? '').trim();
    const canonicalRouteState = this.canonicalState(routeState);
    if (canonicalRouteState && canonicalRouteState !== this.cityService.state) this.cityService.selectState(canonicalRouteState);
    if (!routeCity && !routeState && !this.cityService.hasSavedCity() && !this.cityService.hasSavedState() && !this.wasLocationPromptedThisSession()) {
      this.markLocationPromptedThisSession();
      void this.useCurrentLocation();
    }
  }

  ngOnDestroy(): void {
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
        this.cityService.applyResolvedLocation({ city: 'Mumbai', state: 'Maharashtra', source: 'default' });
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
    this.cityService.applyResolvedLocation({
      city: location.city,
      state: state || 'Maharashtra',
      source: location.source
    });
    this.syncRouteLocation();
    this.locationMessage = `${location.city}, ${location.state}, ${location.country} (${location.source} location)`;
  }

  private syncRouteLocation(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.cityService.state
        ? { state: this.cityService.state, city: null }
        : { city: this.cityService.city, state: null },
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
