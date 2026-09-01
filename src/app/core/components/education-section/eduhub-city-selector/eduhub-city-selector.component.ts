import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { INDIA_STATES } from '../../../constants/india-location-options';
import { EduHubCityService } from '../../../services/eduhub-city.service';
import { LocationService } from '../../../services/location.service';

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
export class EduHubCitySelectorComponent implements OnInit {
  readonly currentLocationOption = CURRENT_LOCATION_OPTION;
  isDetectingLocation = false;
  locationMessage = '';
  readonly cities = [
    'Mumbai',
    ...Array.from(new Set<string>(Object.values(INDIA_STATES).reduce<string[]>(
      (allCities, stateCities) => allCities.concat(stateCities),
      []
    )))
      .filter(city => city !== 'Mumbai')
      .sort((a, b) => a.localeCompare(b))
  ];

  constructor(
    readonly cityService: EduHubCityService,
    private readonly locationService: LocationService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!this.cityService.hasSavedCity() && !this.wasLocationPromptedThisSession()) {
      this.markLocationPromptedThisSession();
      void this.useCurrentLocation();
    }
  }

  selectCity(city: string): void {
    if (city === CURRENT_LOCATION_OPTION) {
      void this.useCurrentLocation();
      return;
    }

    this.locationMessage = '';
    this.cityService.selectCity(city);
  }

  async useCurrentLocation(): Promise<void> {
    if (this.isDetectingLocation) return;

    this.isDetectingLocation = true;
    this.locationMessage = 'Detecting current location…';
    this.cdr.markForCheck();

    try {
      const position = await this.locationService.getCurrentPosition();
      const address = await this.locationService.reverseGeocode(
        position.coords.latitude,
        position.coords.longitude
      );
      this.cityService.selectCity(address.city);
      this.locationMessage = `Current location: ${address.city}`;
    } catch (error) {
      console.warn('[EduHubCitySelector] Current location unavailable:', error);
      this.locationMessage = 'Location unavailable. Please select your city.';
    } finally {
      this.isDetectingLocation = false;
      this.cdr.markForCheck();
    }
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
