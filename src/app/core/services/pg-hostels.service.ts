import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface PgHostel {
  id: number;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  bio?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  accommodationType?: string | null;
  suitableFor?: string | null;
  foodAvailable?: boolean | null;
  imageUrls?: string[] | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  monthlyRent?: number | null;
  rent?: number | null;
  price?: number | null;
  phone?: string | null;
  email?: string | null;
  verified?: boolean | null;
  isVerified?: boolean | null;
  roomOccupancy?: string | string[] | null;
  amenities?: string | string[] | null;
  likesCount?: number | null;
}

export interface PgHostelFilters {
  city?: string;
  state?: string;
  accommodationType?: string;
  suitableFor?: string;
  foodAvailable?: boolean;
}

export interface PgHostelPage {
  content: PgHostel[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class PgHostelsService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  imageUrl(value: string | null | undefined): string {
    const image = value?.trim();
    if (!image) return '';
    if (/^(?:https?:|blob:|data:)/i.test(image)) return image;
    return `${environment.apiUrl}/admin/pg-hostels/download/${encodeURIComponent(image)}`;
  }

  imageCandidates(item: PgHostel | null | undefined): string[] {
    return [...(item?.imageUrls ?? []), item?.imageUrl, item?.thumbnailUrl]
      .map(value => this.imageUrl(value))
      .filter((url, index, urls) => !!url && urls.indexOf(url) === index);
  }

  list(page = 0, size = 10, filters: PgHostelFilters = {}): Observable<PgHostelPage> {
    let params = new HttpParams().set('page', String(page)).set('size', String(size));
    for (const key of ['city', 'state', 'accommodationType', 'suitableFor'] as const) {
      const value = filters[key]?.trim();
      if (value) params = params.set(key, value);
    }
    if (filters.foodAvailable != null) params = params.set('foodAvailable', String(filters.foodAvailable));

    return this.http.get<unknown>(`${environment.apiUrl}/pg-hostels`, {
      headers: this.headers(), params
    }).pipe(map(response => {
      // The endpoint may return a Spring page directly or within `data`.
      const payload: any = (response as any)?.data ?? response;
      const items = Array.isArray(payload) ? payload : payload?.content;
      const content = Array.isArray(items) ? items as PgHostel[] : [];
      return {
        content,
        page: Number(payload?.number ?? payload?.page ?? page),
        size: Number(payload?.size ?? size),
        totalElements: Number(payload?.totalElements ?? content.length),
        totalPages: Number(payload?.totalPages ?? (content.length ? 1 : 0))
      };
    }));
  }

  get(id: number): Observable<PgHostel> {
    return this.http.get<PgHostel>(`${environment.apiUrl}/pg-hostels/${encodeURIComponent(id)}`, {
      headers: this.headers()
    });
  }

  private headers(): HttpHeaders {
    const token = this.auth.getToken();
    let headers = new HttpHeaders({ Accept: 'application/json', 'x-skip-loading': '1' });
    if (token) headers = headers.set('Authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`);
    return headers;
  }
}
