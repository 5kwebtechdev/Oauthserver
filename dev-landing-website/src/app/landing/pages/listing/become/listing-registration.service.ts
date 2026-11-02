import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { toListingSubmissionPhone } from './phone-country';
import { environment } from '../../../../../environments/environment';
import { ListingConfig } from './listing-config';
import {
  ListingBasicData,
  ListingDetailsData,
  ListingMediaData,
} from './listing-shared';

@Injectable({
  providedIn: 'root',
})
export class ListingRegistrationService {
  constructor(private http: HttpClient) {}

  submit(
    config: ListingConfig,
    basic: ListingBasicData,
    details: ListingDetailsData,
    media: ListingMediaData,
  ): Observable<any> {
    const phone = basic.phone ? toListingSubmissionPhone(basic.phone, basic.phoneCountry) : '';
    if (phone === undefined || (!phone && config.type !== 'pg_hostel')) {
      return throwError(() => new Error('Enter a valid phone number for the selected country'));
    }
    const phone2 = !basic.phone2 ? '' : toListingSubmissionPhone(basic.phone2, basic.phone2Country);
    const phone3 = !basic.phone3 ? '' : toListingSubmissionPhone(basic.phone3, basic.phone3Country);
    if (phone2 === undefined || phone3 === undefined) return throwError(() => new Error('Enter valid additional phone numbers'));
    if ((!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(basic.email.trim()) || basic.email.trim().length > 254)) {
      return throwError(() => new Error('Enter a valid email address for your submission acknowledgement'));
    }
    basic = { ...basic, phone, phone2, phone3 };

    if (config.type === 'pg_hostel') {
      return this.submitPgHostel(basic, details, media);
    }

    return this.submitEduHub(config, basic, details, media);
  }

  private submitPgHostel(
    basic: ListingBasicData,
    details: ListingDetailsData,
    media: ListingMediaData,
  ): Observable<any> {
    const fd = new FormData();

    const params: Record<string, string> = {
      name: basic.name || '',
      suitable_for: details.suitableFor || '',
      phone: basic.phone || '',
      phone2: basic.phone2 || '',
      phone3: basic.phone3 || '',
      email: basic.email || '',
      accommodation_type: details.accommodationType || '',
      address: details.address || '',
      country: details.country || 'India',
      state: details.state || '',
      city: details.city || '',
      description: details.bio || '',
      room_occupancy: (details.roomOccupancy || []).join(', '),
      amenities: (details.amenities || []).join(', '),
      food_available:
        details.foodAvailable === null || details.foodAvailable === undefined
          ? ''
          : details.foodAvailable
            ? 'Yes'
            : 'No',
    };

    for (const [key, value] of Object.entries(params)) {
      fd.append(`template_params[${key}]`, value ?? '');
    }

    for (const image of media.images || []) {
      fd.append('images[]', image, image.name);
    }

    const baseUrl = environment.apiUrl.replace(/\/v1$/, '');
    const endpoint = `${baseUrl}/v1/public/request-pg-hostel-register`;

    // IMPORTANT: do not set Content-Type manually for FormData.
    // The browser must add the multipart boundary.
    return this.http.post(endpoint, fd);
  }

  private submitEduHub(
    config: ListingConfig,
    basic: ListingBasicData,
    details: ListingDetailsData,
    media: ListingMediaData,
  ): Observable<any> {
    const fd = new FormData();
    const firstVenue = details.venues?.[0];

    const params: Record<string, string> = {
      entity_type: config.entityType,
      phone2: basic.phone2 || '',
      phone3: basic.phone3 || '',
      name: basic.name || '',
      title: basic.title || '',
      phone: basic.phone || '',
      email: basic.email || '',
      contact_person: basic.contactPerson || '',
      organizer: basic.organizer || '',
      instructor: basic.instructor || '',
      description: basic.description || '',
      address: details.address || firstVenue?.address || '',
      city: details.city || firstVenue?.city || '',
      state: details.state || firstVenue?.state || '',
      country: details.country || firstVenue?.country || 'India',
      exact_location: details.exactLocation || '',
      qualifications: details.qualifications || '',
      experience: details.experience || '',
      fee: details.fee || '',
      sale_amount: details.saleAmount || '',
      languages: details.languages || '',
      specialization: details.specialization || '',
      mode: details.mode.join(', '),
      bio: details.bio || '',
      start_dt: details.startDt || '',
      end_dt: details.endDt || '',
      is_free: String(details.isFree),
      reg_link: details.regLink || '',
      venue: firstVenue?.venueName || '',
      venues: JSON.stringify(
        (details.venues || []).map((v) => ({
          venueName: v.venueName || '',
          address: v.address || '',
          city: v.city || '',
          state: v.state || '',
          country: v.country || 'India',
        })),
      ),
    };

    for (const [key, value] of Object.entries(params)) {
      fd.append(`template_params[${key}]`, value ?? '');
    }

    for (const image of media.images || []) {
      fd.append('images[]', image, image.name);
    }

    const baseUrl = environment.apiUrl.replace(/\/v1$/, '');
    const endpoint = `${baseUrl}/v1/public/request-eduhub-register`;

    return this.http.post(endpoint, fd);
  }
}
