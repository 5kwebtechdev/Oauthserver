import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export type BookListingType = 'SCHOOL' | 'COLLEGE' | 'EXAM_PREP' | 'GENERAL' | 'SCHOOL_TEXTBOOK' | 'FICTION_NOVEL' | 'REFERENCE' | 'COMPETITIVE_EXAM' | 'CHILDRENS_BOOKS';
export type BookListingCondition = 'NEW' | 'LIKE_NEW' | 'GOOD' | 'ACCEPTABLE';
export type BookListingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW' | 'SOLD' | 'ACTIVE' | string;

/** Matches the documented /v1/book-listings create contract. */
export interface BookListingCreateRequest {
  bookType: Extract<BookListingType, 'SCHOOL' | 'COLLEGE' | 'EXAM_PREP' | 'GENERAL'>;
  title: string;
  authorPublisher: string;
  bookClass?: string;
  board?: string;
  subject?: string;
  degreeStream?: string;
  year?: string;
  targetExam?: string;
  genre?: string;
  condition: BookListingCondition;
  language?: string;
  sellerNote?: string;
  originalPrice?: number;
  sellingPrice: number;
  negotiable: boolean;
  listingType: 'SELL' | 'DONATE';
  state: string;
  city: string;
  address: string;
  landmark?: string;
  additionalNote?: string;
}

export interface BookListing {
  id: number; title: string; bookType: BookListingType; condition: BookListingCondition;
  sellingPrice: number; originalPrice?: number | null; discountPercent?: number | null;
  imageUrls?: string[]; status: BookListingStatus; rejectionReason?: string | null;
  city?: string | null; state?: string | null; distanceKm?: number | null;
  sellerName?: string | null; sellerVerified?: boolean; contactUnlocked?: boolean;
  unlockCost?: number; sellerPhone?: string | null; sellerAddress?: string | null;
  classLevel?: string | null; board?: string | null; subject?: string | null;
  author?: string | null; publisher?: string | null; exam?: string | null;
  genre?: string | null; degree?: string | null; stream?: string | null;
  authorPublisher?: string | null; bookClass?: string | null; degreeStream?: string | null;
  year?: string | null; targetExam?: string | null; language?: string | null;
  address?: string | null; landmark?: string | null; additionalNote?: string | null;
  negotiable?: boolean | null; listingType?: string | null;
  location?: string | null; contactNumber?: string | null; phone?: string | null;
  sellerNote?: string | null; note?: string | null; description?: string | null;
  priceNegotiable?: boolean | null; isPriceNegotiable?: boolean | null;
  [key: string]: unknown;
}

export interface BookListingPage { content: BookListing[]; page: number; size: number; totalElements: number; totalPages: number; }

@Injectable({ providedIn: 'root' })
export class BookListingsService {
  private readonly baseUrl = `${environment.apiUrl}/book-listings`;
  constructor(private readonly http: HttpClient, private readonly auth: AuthService) {}

  list(filters: { bookType?: BookListingType; condition?: BookListingCondition; bookClass?: string; board?: string; subject?: string; degreeStream?: string; year?: string; targetExam?: string; genre?: string; language?: string; minPrice?: number; maxPrice?: number; userLat?: number; userLng?: number; page?: number; size?: number } = {}): Observable<BookListingPage> {
    let params = new HttpParams().set('page', String(filters.page ?? 0)).set('size', String(filters.size ?? 20));
    Object.entries(filters).forEach(([key, value]) => { if (value != null && !['page', 'size'].includes(key)) params = params.set(key, String(value)); });
    return this.http.get<BookListingPage>(this.baseUrl, { headers: this.headers(), params });
  }
  get(id: number, userLat?: number, userLng?: number): Observable<BookListing> {
    let params = new HttpParams(); if (userLat != null && userLng != null) params = params.set('userLat', String(userLat)).set('userLng', String(userLng));
    return this.http.get<BookListing>(`${this.baseUrl}/${id}`, { headers: this.headers(), params });
  }
  unlockContact(id: number): Observable<BookListing> { return this.http.post<BookListing>(`${this.baseUrl}/${id}/unlock-contact`, {}, { headers: this.headers() }); }
  mine(): Observable<BookListing[] | BookListingPage> { return this.http.get<BookListing[] | BookListingPage>(`${this.baseUrl}/mine`, { headers: this.headers() }); }
  create(request: BookListingCreateRequest, images: File[]): Observable<BookListing> {
    const data = new FormData();
    Object.entries(request).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') data.append(key, String(value));
    });
    images.forEach(image => data.append('images', image, image.name));
    return this.http.post<BookListing>(this.baseUrl, data, { headers: this.headers() });
  }
  update(id: number, data: FormData): Observable<BookListing> { return this.http.put<BookListing>(`${this.baseUrl}/${id}`, data, { headers: this.headers() }); }
  markAsSold(id: number): Observable<BookListing> { return this.http.put<BookListing>(`${this.baseUrl}/${id}/mark-sold`, {}, { headers: this.headers() }); }
  remove(id: number): Observable<void> { return this.http.delete<void>(`${this.baseUrl}/${id}`, { headers: this.headers() }); }
  private headers(): HttpHeaders { const token = this.auth.getToken(); return new HttpHeaders(token ? { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`, Accept: 'application/json' } : { Accept: 'application/json' }); }
}
