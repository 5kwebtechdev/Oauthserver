import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { normalizeTutor, ITutor } from '../models/tutor.model';

export interface TutorCategoryOption {
    id: number;
    optionValue: string;
    optionLabel: string;
    displayOrder: number;
    isActive: boolean;
    createdAt: string;
}

export interface TutorCategoryField {
    id: number;
    fieldType: 'MULTI_SELECT' | 'SINGLE_SELECT' | 'TEXT' | 'NUMBER';
    fieldKey: string;
    fieldLabel: string;
    isRequired: boolean;
    isFilterable: boolean;
    displayOrder: number;
    validationRules: any | null;
    createdAt: string;
    options: TutorCategoryOption[];
}

export interface TutorCategory {
    id: number;
    categoryName: string;
    categoryKey: string;
    description: string;
    iconUrl: string | null;
    displayOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string | null;
    fields: TutorCategoryField[];
}

export type TutorCategoriesResponse = TutorCategory[];

export interface TutorOverviewStats {
    activeTutors: number;
    verifiedTutors: number;
    totalTutors: number;
    unverifiedTutors: number;
}

export interface TutorOverviewFilterOptions {
    qualifications: string[];
    subjects: string[];
    entityTypes: { value: string; label: string }[];
    locations: string[];
    experiences: string[];
}

export interface TutorOverviewResponse {
    tutors: ITutor[];
    stats: TutorOverviewStats | null;
    filterOptions: TutorOverviewFilterOptions | null;
    totalElements: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
    hasNext: boolean;
    hasPrevious: boolean;
}

@Injectable({ providedIn: 'root' })
export class TutorApi {
    private base = environment.apiUrl || '';

    constructor(private http: HttpClient) { }

    /**
     * Generate HTTP headers with authorization token
     */
    private headers(): HttpHeaders {
        let headers = new HttpHeaders({ 'Content-Type': 'application/json' });

        if (environment.apiAuthToken) {
            const value = environment.apiAuthToken.startsWith('Bearer ')
                ? environment.apiAuthToken
                : `Bearer ${environment.apiAuthToken}`;
            headers = headers.set('Authorization', value);
        }

        return headers;
    }

    /**
     * Fetch all tutor categories with their filterable fields and options
     * GET /tutors/categories
     */
    getTutorCategories(): Observable<TutorCategoriesResponse> {
        const url = `${this.base}/tutors/categories`;
        return this.http.get<TutorCategoriesResponse>(url, { headers: this.headers() }).pipe(
            map((categories) => {
                return Array.isArray(categories)
                    ? categories
                        .filter(cat => cat.isActive)
                        .sort((a, b) => a.displayOrder - b.displayOrder)
                    : [];
            }),
            tap(categories => console.log('[TutorApi] Fetched categories:', categories.length)),
            catchError(error => {
                console.error('[TutorApi] Error fetching tutor categories:', error);
                return of([]);
            })
        );
    }

    /**
     * Get tutor details by ID
     * GET /tutors/:id
     */
    getTutorById(tutorId: number | string): Observable<any> {
        const url = `${this.base}/tutors/${tutorId}`;
        return this.http.get<any>(url, { headers: this.headers() }).pipe(
            map(res => {
                if (!res) return null;
                // backend may return object directly or { tutor: {} }
                const payload = res.tutor || res;
                return normalizeTutor(payload) as ITutor;
            }),
            catchError(error => {
                console.error('[TutorApi] Error fetching tutor:', error);
                return of(null);
            })
        );
    }

    /**
     * Search/filter tutors using the main tutors endpoint with query params.
     * GET /tutors?q=...&page=1&limit=20
     * The backend for this project exposes tutors at /v1/tutors (environment.base should include /v1).
     */
    searchTutors(filters: any): Observable<any> {
        let url = `${this.base}/tutors`;
        const params: string[] = [];
        if (filters) {
            if (filters.q) params.push(`q=${encodeURIComponent(filters.q)}`);
            if (filters.page !== undefined) params.push(`page=${encodeURIComponent(String(filters.page))}`);
            if (filters.limit !== undefined) params.push(`limit=${encodeURIComponent(String(filters.limit))}`);
            if (filters.sort) params.push(`sort=${encodeURIComponent(String(filters.sort))}`);
            // Allow simple filter keys as repeated query params
            if (filters.filters && typeof filters.filters === 'object') {
                Object.keys(filters.filters).forEach(k => {
                    const val = filters.filters[k];
                    if (Array.isArray(val)) {
                        val.forEach(v => params.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`));
                    } else if (val !== undefined && val !== null) {
                        params.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(val))}`);
                    }
                });
            }
        }

        if (params.length) url += `?${params.join('&')}`;

        return this.http.get<any>(url, { headers: this.headers() }).pipe(
            map(res => {
                // Normalize tutors to ITutor[] for consistent UI consumption
                const raw = Array.isArray(res) ? res : (res?.tutors || res?.items || []);
                const tutors: ITutor[] = Array.isArray(raw) ? raw.map(r => normalizeTutor(r)) : [];
                return { tutors, total: tutors.length };
            }),
            tap(r => console.log('[TutorApi] searchTutors via GET:', url, '->', r?.tutors?.length || 0)),
            catchError(error => {
                console.error('[TutorApi] Error searching tutors:', error);
                return of({ tutors: [], total: 0 });
            })
        );
    }

    /**
     * Fetch the tutor overview list (used by the public tutor listing pages).
     * GET /admin/tutors/overview?entityType=INDIVIDUAL&page=&pageSize=
     */
    getTutorsOverview(entityType?: string, page?: number, pageSize?: number): Observable<TutorOverviewResponse> {
        const url = `${this.base}/admin/tutors/overview`;
        const params: Record<string, string> = {};
        if (entityType) params['entityType'] = entityType;
        if (page !== undefined) params['page'] = String(page);
        if (pageSize !== undefined) params['pageSize'] = String(pageSize);

        return this.http.get<any>(url, { params }).pipe(
            map(res => {
                const data = res?.data || {};
                const tutors: ITutor[] = Array.isArray(data.tutors) ? data.tutors.map((r: any) => normalizeTutor(r)) : [];
                return {
                    tutors,
                    stats: data.stats ?? null,
                    filterOptions: data.filterOptions ?? null,
                    totalElements: data.totalElements ?? tutors.length,
                    totalPages: data.totalPages ?? 1,
                    currentPage: data.currentPage ?? 0,
                    pageSize: data.pageSize ?? tutors.length,
                    hasNext: data.hasNext ?? false,
                    hasPrevious: data.hasPrevious ?? false,
                };
            }),
            catchError(error => {
                console.error('[TutorApi] Error fetching tutor overview:', error);
                return of({
                    tutors: [],
                    stats: null,
                    filterOptions: null,
                    totalElements: 0,
                    totalPages: 1,
                    currentPage: 0,
                    pageSize: 0,
                    hasNext: false,
                    hasPrevious: false,
                });
            })
        );
    }

    /**
     * Get all tutors with optional pagination
     * GET /tutors
     */
    getTutors(page?: number, limit?: number): Observable<any> {
        let url = `${this.base}/tutors`;
        const params = [];
        if (page !== undefined) params.push(`page=${page}`);
        if (limit !== undefined) params.push(`limit=${limit}`);
        if (params.length) url += '?' + params.join('&');

        return this.http.get<any>(url, { headers: this.headers() }).pipe(
            map(res => {
                const raw = Array.isArray(res) ? res : (res?.tutors || res?.items || []);
                const tutors: ITutor[] = Array.isArray(raw) ? raw.map(r => normalizeTutor(r)) : [];
                return tutors;
            }),
            tap(tutors => console.log('[TutorApi] Fetched tutors:', tutors?.length || 0)),
            catchError(error => {
                console.error('[TutorApi] Error fetching tutors:', error);
                return of([]);
            })
        );
    }
}
