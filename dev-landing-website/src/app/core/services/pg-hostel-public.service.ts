import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PgHostelFilters,
  PgHostelListing,
  PgHostelPageResponse,
} from '../models/pg-hostel.model';

@Injectable({ providedIn: 'root' })
export class PgHostelPublicService {
  private readonly root = environment.apiUrl.replace(/\/v1$/, '');
  private readonly publicBase = `${this.root}/v1/public/pg-hostels`;
  private readonly registerUrl = `${this.root}/v1/public/request-pg-hostel-register`;

  constructor(private http: HttpClient) {}

  list(
    page = 0,
    size = 10,
    filters: PgHostelFilters = {},
  ): Observable<PgHostelPageResponse> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(Math.min(Math.max(size, 1), 100)));

    if (filters.search?.trim()) params = params.set('search', filters.search.trim());
    if (filters.state?.trim()) params = params.set('state', filters.state.trim());
    if (filters.city?.trim()) params = params.set('city', filters.city.trim());
    if (filters.accommodationType) params = params.set('accommodationType', filters.accommodationType);
    if (filters.suitableFor) params = params.set('suitableFor', filters.suitableFor);
    if (filters.foodAvailable !== null && filters.foodAvailable !== undefined) {
      params = params.set('foodAvailable', String(filters.foodAvailable));
    }

    return this.http.get<PgHostelPageResponse>(this.publicBase, { params });
  }

  getById(id: number): Observable<PgHostelListing> {
    return this.http.get<PgHostelListing>(`${this.publicBase}/${id}`);
  }

  register(formData: FormData): Observable<any> {
    // Do not set Content-Type manually. The browser must add the multipart boundary.
    return this.http.post(this.registerUrl, formData);
  }

  imageUrl(value?: string | null): string {
    if (!value) return '';
    const image = value.trim();
    if (!image) return '';
    if (/^(https?:)?\/\//i.test(image) || image.startsWith('blob:') || image.startsWith('data:')) {
      return image;
    }
    // Uploaded PG/Hostel filenames use this anonymous download endpoint.
    // The similarly named /public/pg-hostels/download route returns 404.
    return `${this.root}/v1/admin/pg-hostels/download/${encodeURIComponent(image)}`;
  }
}
