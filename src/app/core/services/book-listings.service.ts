import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export type BookListingType = 'SCHOOL_TEXTBOOK' | 'FICTION_NOVEL' | 'REFERENCE' | 'COMPETITIVE_EXAM' | 'CHILDRENS_BOOKS';
export type BookListingCondition = 'NEW' | 'LIKE_NEW' | 'GOOD' | 'ACCEPTABLE';

export interface BookListing {
  id: number; title: string; bookType: BookListingType; condition: BookListingCondition;
  sellingPrice: number; originalPrice?: number | null; discountPercent?: number | null;
  imageUrls?: string[]; status: 'PENDING' | 'APPROVED' | 'REJECTED'; rejectionReason?: string | null;
  city?: string | null; state?: string | null; distanceKm?: number | null;
  sellerName?: string | null; sellerVerified?: boolean; contactUnlocked?: boolean;
  unlockCost?: number; sellerPhone?: string | null; sellerAddress?: string | null;
  [key: string]: unknown;
}

export interface BookListingPage { content: BookListing[]; page: number; size: number; totalElements: number; totalPages: number; }

@Injectable({ providedIn: 'root' })
export class BookListingsService {
  private readonly baseUrl = `${environment.apiUrl}/book-listings`;
  constructor(private readonly http: HttpClient, private readonly auth: AuthService) {}

  list(filters: { bookType?: BookListingType; condition?: BookListingCondition; minPrice?: number; maxPrice?: number; userLat?: number; userLng?: number; page?: number; size?: number } = {}): Observable<BookListingPage> {
    let params = new HttpParams().set('page', String(filters.page ?? 0)).set('size', String(filters.size ?? 20));
    Object.entries(filters).forEach(([key, value]) => { if (value != null && !['page', 'size'].includes(key)) params = params.set(key, String(value)); });
    return this.http.get<BookListingPage>(this.baseUrl, { headers: this.headers(), params });
  }
  get(id: number, userLat?: number, userLng?: number): Observable<BookListing> {
    let params = new HttpParams(); if (userLat != null && userLng != null) params = params.set('userLat', String(userLat)).set('userLng', String(userLng));
    return this.http.get<BookListing>(`${this.baseUrl}/${id}`, { headers: this.headers(), params });
  }
  unlockContact(id: number): Observable<BookListing> { return this.http.post<BookListing>(`${this.baseUrl}/${id}/unlock-contact`, {}, { headers: this.headers() }); }
  mine(): Observable<BookListing[]> { return this.http.get<BookListing[]>(`${this.baseUrl}/mine`, { headers: this.headers() }); }
  create(data: FormData): Observable<BookListing> { return this.http.post<BookListing>(this.baseUrl, data, { headers: this.headers() }); }
  update(id: number, data: FormData): Observable<BookListing> { return this.http.put<BookListing>(`${this.baseUrl}/${id}`, data, { headers: this.headers() }); }
  remove(id: number): Observable<void> { return this.http.delete<void>(`${this.baseUrl}/${id}`, { headers: this.headers() }); }
  private headers(): HttpHeaders { const token = this.auth.getToken(); return new HttpHeaders(token ? { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`, Accept: 'application/json' } : { Accept: 'application/json' }); }
}
