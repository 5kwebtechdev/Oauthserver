import { Injectable } from '@angular/core';
import { Geolocation, Position } from '@capacitor/geolocation';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AddressDetails {
  pincode: string;
  city: string;
  state: string;
  flat: string;
  area: string;
  landmark?: string;
  coordinates: { lat: number; lng: number };
  formattedAddress: string;
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private readonly googleMapsApiKey = environment.googleMapsApiKey;
  
  constructor(private http: HttpClient) {}

  /**
   * Get current position using Capacitor Geolocation
   */
  async getCurrentPosition(): Promise<Position> {
    try {
      const position = await Geolocation.getCurrentPosition();
      return position;
    } catch (error) {
      console.error('Error getting location:', error);
      throw error;
    }
  }

  /**
   * Watch position for continuous location updates
   */
  watchPosition(callback: (position: Position | null) => void): Promise<any> {
    return Geolocation.watchPosition({}, callback);
  }

  /**
   * Reverse geocode coordinates to get address details
   */
  async reverseGeocode(lat: number, lng: number): Promise<AddressDetails> {
    try {
      const response: any = await this.http
        .get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.googleMapsApiKey}`)
        .pipe(
          map((res: any) => res.results),
          catchError(() => of([]))
        )
        .toPromise();

      if (response && response.length > 0) {
        return this.parseGeocodeResponse(response[0], lat, lng);
      }

      throw new Error('Unable to get address from coordinates');
    } catch (error) {
      console.error('Error in reverse geocoding:', error);
      throw error;
    }
  }

  /**
   * Parse Google Geocoding API response to extract address components
   */
  private parseGeocodeResponse(result: any, lat: number, lng: number): AddressDetails {
    let pincode = '';
    let city = '';
    let state = '';
    let area = '';
    let formattedAddress = result.formatted_address || '';

    // Extract address components
    if (result.address_components) {
      for (const component of result.address_components) {
        const types = component.types;

        if (types.includes('postal_code')) {
          pincode = component.long_name;
        } else if (types.includes('locality') || types.includes('administrative_area_level_2')) {
          city = component.long_name;
        } else if (types.includes('administrative_area_level_1')) {
          state = component.long_name;
        } else if (types.includes('sublocality') || types.includes('sublocality_level_1') || 
                  types.includes('neighborhood') || types.includes('route')) {
          area = component.long_name;
        }
      }
    }

    // For India-specific logic, ensure we have the correct state
    if (!state && formattedAddress.includes(',')) {
      const parts = formattedAddress.split(',').map((p: string) => p.trim()).reverse();
      for (const part of parts) {
        // Common Indian states
        const indianStates = [
          'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 
          'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 
          'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 
          'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 
          'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
          'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli', 
          'Daman and Diu', 'Lakshadweep', 'National Capital Territory of Delhi', 
          'Puducherry', 'Jammu and Kashmir', 'Ladakh'
        ];
        
        for (const stateName of indianStates) {
          if (part.toLowerCase().includes(stateName.toLowerCase())) {
            state = stateName;
            break;
          }
        }
        
        if (state) break;
      }
    }

    return {
      pincode,
      city,
      state,
      flat: '',
      area: area || city,
      coordinates: { lat, lng },
      formattedAddress
    };
  }

  /**
   * Get place details from Google Places API using place ID
   */
  async getPlaceDetails(placeId: string): Promise<AddressDetails> {
    try {
      const response: any = await this.http
        .get(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${this.googleMapsApiKey}`)
        .pipe(
          map((res: any) => res.result),
          catchError(() => of(null))
        )
        .toPromise();

      if (response) {
        const geometry = response.geometry;
        if (geometry && geometry.location) {
          return this.parseGeocodeResponse(response, geometry.location.lat, geometry.location.lng);
        }
      }

      throw new Error('Unable to get place details');
    } catch (error) {
      console.error('Error in getting place details:', error);
      throw error;
    }
  }

  /**
   * Search for places using Google Places API
   */
  searchPlaces(query: string): Observable<any[]> {
    if (!query.trim()) {
      return of([]);
    }

    return this.http
      .get(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${this.googleMapsApiKey}`)
      .pipe(
        map((response: any) => response.results || []),
        catchError(() => of([]))
      );
  }

  /**
   * Validate if pincode is serviceable
   */
  isServiceablePincode(pincode: string): boolean {
    if (!pincode) return false;
    // Example rule: serviceable pincodes begin with '60' or '11' (adjust later)
    return pincode.startsWith('60') || pincode.startsWith('11');
  }
}