import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { TutorApi } from '../api/tutor.api';
import { ITutor } from '../models/tutor.model';

// ===== Interfaces =====

export interface SelectedFilters {
    categoryKey: string;
    filters: { [fieldKey: string]: string[] };
}

export interface TutorFilters {
    search?: string;
    sort?: string;
    [key: string]: any;
}

// ===== Constants =====

const SESSION_STORAGE_KEY = 'superme_tutors_cache';
const SESSION_TIMESTAMP_KEY = 'superme_tutors_cache_ts';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * TutorService - Client-side search and filtering
 * 
 * Architecture:
 * 1. Fetch tutors once from API and cache in sessionStorage
 * 2. All search/filter operations are client-side (no API calls)
 * 3. Debounced search is handled by component; service applies filters synchronously
 * 4. Filtered results emitted via tutors$ observable
 */
@Injectable({ providedIn: 'root' })
export class TutorService {
    // ===== State =====
    private tutorsCache$ = new BehaviorSubject<ITutor[]>([]);
    private filteredTutors$ = new BehaviorSubject<ITutor[]>([]);
    private tutorsLoading$ = new BehaviorSubject<boolean>(false);
    private selectedTutor$ = new BehaviorSubject<ITutor | null>(null);
    private currentFilters$ = new BehaviorSubject<TutorFilters>({});

    constructor(private tutorApi: TutorApi) {
        // Initialize from session storage on service creation
        this.loadFromSessionStorage();
    }

    // ===== Public Observables =====

    /** Filtered tutors stream - subscribe to get search results */
    get tutors$(): Observable<ITutor[]> {
        return this.filteredTutors$.asObservable();
    }

    /** Loading state stream */
    get isLoading$(): Observable<boolean> {
        return this.tutorsLoading$.asObservable();
    }

    /** Selected tutor stream */
    get selectedTutor(): Observable<ITutor | null> {
        return this.selectedTutor$.asObservable();
    }

    /** Get all cached tutors (unfiltered) */
    get cachedTutors(): ITutor[] {
        return this.tutorsCache$.value;
    }

    /** Get current search query */
    get currentSearchQuery(): string {
        return this.currentFilters$.value.search || '';
    }

    // ===== Session Storage Management =====

    /**
     * Load tutors from sessionStorage if available and not expired
     */
    private loadFromSessionStorage(): void {
        try {
            const timestampStr = sessionStorage.getItem(SESSION_TIMESTAMP_KEY);
            const dataStr = sessionStorage.getItem(SESSION_STORAGE_KEY);

            if (timestampStr && dataStr) {
                const timestamp = parseInt(timestampStr, 10);
                const now = Date.now();

                // Check if cache is still valid
                if (now - timestamp < CACHE_TTL_MS) {
                    const tutors = JSON.parse(dataStr);
                    if (Array.isArray(tutors) && tutors.length > 0) {
                        console.log('[TutorService] Loaded from sessionStorage:', tutors.length, 'tutors');
                        this.tutorsCache$.next(tutors);
                        this.applyFiltersAndUpdate();
                        return;
                    }
                }
            }
        } catch (e) {
            console.warn('[TutorService] sessionStorage read error:', e);
        }
    }

    /**
     * Save tutors to sessionStorage
     */
    private saveToSessionStorage(tutors: ITutor[]): void {
        try {
            sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(tutors));
            sessionStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
        } catch (e) {
            console.warn('[TutorService] sessionStorage write error:', e);
        }
    }

    // ===== Data Fetching =====

    /**
     * Fetch tutors from API (called once on page load)
     * Results are cached in sessionStorage for subsequent searches
     */
    fetchTutors(forceRefresh = false): Observable<ITutor[]> {
        // Return cached if available and not forcing refresh
        if (!forceRefresh && this.tutorsCache$.value.length > 0) {
            return of(this.tutorsCache$.value);
        }

        // Prevent duplicate requests
        if (this.tutorsLoading$.value) {
            return this.tutorsCache$.asObservable();
        }

        this.tutorsLoading$.next(true);
        console.log('[TutorService] Fetching tutors from API...');

        return this.tutorApi.getTutorsOverview('INDIVIDUAL').pipe(
            map(response => response.tutors),
            tap(tutors => {
                console.log('[TutorService] Tutors fetched:', tutors.length);
                this.tutorsCache$.next(tutors);
                this.saveToSessionStorage(tutors);
                this.tutorsLoading$.next(false);
                this.applyFiltersAndUpdate();
            }),
            catchError(error => {
                console.error('[TutorService] Fetch error:', error);
                this.tutorsLoading$.next(false);
                return of([]);
            })
        );
    }

    // ===== Search & Filter (Client-Side) =====

    /**
     * Search tutors by query string (client-side filtering)
     * Called by component's debounced search stream
     * NO API CALL - filters cached data only
     */
    searchTutors(query: string): void {
        const trimmedQuery = (query || '').trim();
        console.log('[TutorService] Client-side search:', trimmedQuery || '(empty)');

        this.currentFilters$.next({
            ...this.currentFilters$.value,
            search: trimmedQuery
        });

        this.applyFiltersAndUpdate();
    }

    /**
     * Apply filters (from filter panel)
     */
    setFilters(filters: TutorFilters): void {
        this.currentFilters$.next({
            ...this.currentFilters$.value,
            ...filters
        });
        this.applyFiltersAndUpdate();
    }

    /**
     * Clear search query only
     */
    clearSearch(): void {
        this.currentFilters$.next({
            ...this.currentFilters$.value,
            search: ''
        });
        this.applyFiltersAndUpdate();
    }

    /**
     * Clear all filters including search
     */
    clearFilters(): void {
        this.currentFilters$.next({});
        this.applyFiltersAndUpdate();
    }

    /**
     * Core filtering logic - applies all active filters to cached tutors
     * Emits results to filteredTutors$
     */
    private applyFiltersAndUpdate(): void {
        const allTutors = this.tutorsCache$.value || [];
        const filters = this.currentFilters$.value || {};

        let result = [...allTutors];

        // Apply search filter (name, subjects, availability, experience, bio)
        const searchQuery = String(filters.search || '').toLowerCase().trim();
        if (searchQuery.length > 0) {
            result = result.filter(tutor => {
                // Search across multiple fields
                const searchableFields = [
                    tutor.name || '',
                    (tutor.subjects || []).join(' '),
                    tutor.availability || '',
                    tutor.experience || '',
                    (tutor.classes || []).join(' ')
                ].map(f => String(f || '').toLowerCase());

                return searchableFields.some(field => field.includes(searchQuery));
            });
        }

        // Apply additional filters (subjects, classes, availability, etc.)
        const subjectsFilter = filters['subjects'] as string[] | undefined;
        if (subjectsFilter && subjectsFilter.length > 0) {
            result = result.filter(t =>
                t.subjects?.some(s =>
                    subjectsFilter.some((v: string) => s.toLowerCase().includes(v.toLowerCase()))
                )
            );
        }

        const classesFilter = filters['classes'] as string[] | undefined;
        if (classesFilter && classesFilter.length > 0) {
            result = result.filter(t =>
                t.classes?.some(c =>
                    classesFilter.some((v: string) => c.toLowerCase().includes(v.toLowerCase()))
                )
            );
        }

        const availabilityFilter = filters['availability'] as string | undefined;
        if (availabilityFilter) {
            result = result.filter(t =>
                String(t.availability || '').toLowerCase().includes(String(availabilityFilter || '').toLowerCase())
            );
        }

        console.log('[TutorService] Filter applied:', {
            query: searchQuery,
            total: allTutors.length,
            filtered: result.length
        });

        // Emit filtered results
        this.filteredTutors$.next(result);
    }

    // ===== Filter Count Estimation =====

    /**
     * Count tutors matching selected filters (for "Show X results" button)
     */
    countForSelectedFilters(selected: SelectedFilters | null): number {
        const tutors = this.tutorsCache$.value || [];

        if (!selected?.filters || Object.keys(selected.filters).length === 0) {
            return tutors.length;
        }

        let result = [...tutors];

        Object.entries(selected.filters).forEach(([fieldKey, values]) => {
            if (!values || values.length === 0) return;

            const key = fieldKey.toLowerCase();

            if (key.includes('subject')) {
                result = result.filter(t =>
                    t.subjects?.some(s => values.some(v => s.toLowerCase().includes(v.toLowerCase())))
                );
            } else if (key.includes('class') || key.includes('level')) {
                result = result.filter(t =>
                    t.classes?.some(c => values.some(v => c.toLowerCase().includes(v.toLowerCase())))
                );
            } else if (key.includes('location') || key.includes('availability')) {
                result = result.filter(t =>
                    values.some(v => t.availability?.toLowerCase().includes(v.toLowerCase()))
                );
            } else if (key.includes('mode') || key.includes('type')) {
                result = result.filter(t =>
                    values.some(v => t.availability?.toLowerCase().includes(v.toLowerCase()))
                );
            } else {
                // Generic matching
                result = result.filter(t =>
                    values.some(v => {
                        const lower = v.toLowerCase();
                        return (
                            t.experience?.toLowerCase().includes(lower) ||
                            t.availability?.toLowerCase().includes(lower) ||
                            t.subjects?.some(s => s.toLowerCase().includes(lower))
                        );
                    })
                );
            }
        });

        return result.length;
    }

    // ===== Tutor Selection =====

    /**
     * Get tutor by ID from cache
     */
    getTutorFromCache(id: string | number): ITutor | undefined {
        return this.tutorsCache$.value.find(t =>
            t.id === id.toString() || t.id === id
        );
    }

    /**
     * Select a tutor (for detail view)
     */
    selectTutor(tutor: ITutor): void {
        this.selectedTutor$.next(tutor);
    }

    // ===== Cache Management =====

    /**
     * Clear all cached data
     */
    clearCache(): void {
        this.tutorsCache$.next([]);
        this.filteredTutors$.next([]);
        this.selectedTutor$.next(null);
        this.currentFilters$.next({});

        try {
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
            sessionStorage.removeItem(SESSION_TIMESTAMP_KEY);
        } catch (e) {
            // Ignore
        }
    }

    /**
     * Force refresh from API
     */
    refreshTutors(): Observable<ITutor[]> {
        return this.fetchTutors(true);
    }
}
