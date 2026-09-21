import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../../package/api/auth.service';
import {
    Tutor,
    TutorListItem,
    TutorFilters,
    TutorSortOption,
    toTutorListItem,
    getExperienceYears,
    SelectedFilters,
    TutorSearchRequest
} from '../models/tutor.model';

@Injectable({
    providedIn: 'root'
})
export class TutorService {
    private apiUrl = environment.apiUrl;

    // Cache for all tutors - fetched once and reused
    private tutorsCache$ = new BehaviorSubject<Tutor[]>([]);
    /** Last complete directory response, retained while filtered results are displayed. */
    private unfilteredTutors: Tutor[] = [];
    private tutorsLoaded = false;
    private tutorsLoading$ = new BehaviorSubject<boolean>(false);
    private readonly directoryCache = new Map<string, Tutor[]>();

    // Selected tutor for profile view
    private selectedTutor$ = new BehaviorSubject<Tutor | null>(null);

    // Current filters
    private currentFilters$ = new BehaviorSubject<TutorFilters>({});
    private currentSort$ = new BehaviorSubject<TutorSortOption>('recent');

    // Filtered and sorted tutors list
    private filteredTutors$ = new BehaviorSubject<TutorListItem[]>([]);

    constructor(
        private http: HttpClient,
        private authService: AuthService
    ) { }

    /**
     * Get HTTP headers with authorization token
     */
    private getHeaders(): HttpHeaders {
        const token = this.authService.getToken();
        let headers = new HttpHeaders({ 'Content-Type': 'application/json' });

        if (token) {
            const value = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            headers = headers.set('Authorization', value);
        } else if (environment.apiAuthToken) {
            const envValue = environment.apiAuthToken.startsWith('Bearer ')
                ? environment.apiAuthToken
                : `Bearer ${environment.apiAuthToken}`;
            headers = headers.set('Authorization', envValue);
        }

        return headers;
    }

    /**
     * Get loading state observable
     */
    get isLoading$(): Observable<boolean> {
        return this.tutorsLoading$.asObservable();
    }

    /**
     * Get filtered tutors observable
     */
    get tutors$(): Observable<TutorListItem[]> {
        return this.filteredTutors$.asObservable();
    }

    /**
     * Get all cached tutors (raw data)
     */
    get allTutors$(): Observable<Tutor[]> {
        return this.tutorsCache$.asObservable();
    }

    /**
     * Get selected tutor observable
     */
    get selectedTutor(): Observable<Tutor | null> {
        return this.selectedTutor$.asObservable();
    }

    /**
     * Check if tutors have been loaded
     */
    get isLoaded(): boolean {
        return this.tutorsLoaded;
    }

    setDirectoryCache(entityType: string, tutors: Tutor[] | null | undefined): void {
        const key = String(entityType || '').trim().toUpperCase();
        if (!key) return;
        this.directoryCache.set(key, Array.isArray(tutors) ? [...tutors] : []);
    }

    getDirectoryCache(entityType: string): Tutor[] {
        const key = String(entityType || '').trim().toUpperCase();
        return [...(this.directoryCache.get(key) || [])];
    }

    /**
     * Fetch all tutors from API - called once and cached
     * Subsequent calls return cached data
     */
    fetchTutors(forceRefresh = false): Observable<Tutor[]> {
        this.tutorsLoading$.next(true);
        return this.http.get<Tutor[]>(`${this.apiUrl}/tutors`, { headers: this.getHeaders() })
            .pipe(
                tap(tutors => {
                    this.unfilteredTutors = [...tutors];
                    this.tutorsCache$.next(tutors);
                    this.tutorsLoaded = true;
                    this.tutorsLoading$.next(false);
                    this.applyFiltersAndSort();
                }),
                catchError(error => {
                    console.error('[TutorService] Error fetching tutors:', error);
                    this.tutorsLoading$.next(false);
                    return of([]);
                })
            );
    }

    /**
     * Loads a specific user-facing directory without relying on client-side
     * category guesses. For example, EduHub Counselors uses
     * GET /v1/tutors?entityType=COUNSELOR.
     */
    fetchTutorsByEntityType(entityType: string, city?: string): Observable<Tutor[]> {
        const normalizedType = String(entityType || '').trim().toUpperCase();
        if (!normalizedType) return this.fetchTutors();

        this.tutorsLoading$.next(true);
        return this.getTutorsByEntityType(normalizedType, city).pipe(
            tap(tutors => {
                this.unfilteredTutors = [...tutors];
                this.tutorsCache$.next(tutors);
                this.tutorsLoaded = true;
                this.tutorsLoading$.next(false);
                this.applyFiltersAndSort();
            }),
            catchError(error => {
                console.error(`[TutorService] Error fetching ${normalizedType} directory:`, error);
                this.tutorsLoading$.next(false);
                return of([]);
            })
        );
    }

    /**
     * Strict directory request used by screens that need to distinguish a
     * recoverable API error from a genuine empty counselor directory.
     * `fetchTutorsByEntityType` deliberately retains its legacy empty-array
     * fallback for callers that predate inline error states.
     */
    searchDirectory(entityType: string, filters: SelectedFilters | null = null): Observable<Tutor[]> {
        const request: TutorSearchRequest = {
            // The search endpoint treats an empty category and empty filter map
            // as an unfiltered directory request. This is also used by Clear All
            // so a previously selected category is not accidentally retained.
            categoryKey: filters?.categoryKey ?? '',
            filters: filters?.filters ?? {},
            page: 0,
            size: 100,
            sort: 'RECENT'
        };

        return this.http.post<any>(`${this.apiUrl}/tutors/search`, request, {
            headers: this.getHeaders()
        }).pipe(map(response => {
            const candidates = [
                response,
                response?.content,
                response?.tutors,
                response?.data,
                response?.data?.content,
                response?.data?.tutors,
                response?.result,
                response?.result?.content,
                response?.result?.tutors
            ];
            const tutors = candidates.find(Array.isArray) || [];
            const expectedType = String(entityType || '').trim().toUpperCase();
            return expectedType
                ? tutors.filter((tutor: Tutor) => !tutor?.entityType
                    || String(tutor.entityType).trim().toUpperCase() === expectedType)
                : tutors;
        }));
    }

    getTutorsByEntityType(entityType: string, city?: string): Observable<Tutor[]> {
        const normalizedType = String(entityType || '').trim().toUpperCase();
        let params = new HttpParams().set('entityType', normalizedType);
        const selectedCity = String(city ?? '').trim();
        if (selectedCity) params = params.set('city', selectedCity);
        return this.http.get<any>(`${this.apiUrl}/tutors`, {
            headers: this.getHeaders(),
            params
        }).pipe(
            map(response => Array.isArray(response)
                ? response
                : (response?.content
                    || response?.tutors
                    || response?.data?.content
                    || response?.data?.tutors
                    || (Array.isArray(response?.data) ? response.data : []))),
            tap(tutors => this.setDirectoryCache(normalizedType, tutors))
        );
    }

    /**
     * Get a specific tutor by ID
     * First checks cache, then fetches from API if needed
     */
    getTutorById(id: number): Observable<Tutor | null> {
        return this.http.get<Tutor>(`${this.apiUrl}/tutors/${id}`, { headers: this.getHeaders() })
            .pipe(
                tap(tutor => {
                    this.selectedTutor$.next(tutor);
                    // Update cache with this tutor
                    const current = this.tutorsCache$.value;
                    const index = current.findIndex(t => t.id === id);
                    if (index === -1) {
                        this.tutorsCache$.next([...current, tutor]);
                    } else {
                        current[index] = tutor;
                        this.tutorsCache$.next([...current]);
                    }
                }),
                catchError(error => {
                    console.error('[TutorService] Error fetching tutor:', error);
                    return of(null);
                })
            );
    }

    /**
     * Set the selected tutor (from cached data)
     */
    selectTutor(tutor: Tutor | TutorListItem): void {
        if ('phone' in tutor) {
            // It's a full Tutor object
            this.selectedTutor$.next(tutor as Tutor);
        } else {
            // It's a TutorListItem, find full tutor from cache
            const fullTutor = this.tutorsCache$.value.find(t => t.id === tutor.id);
            this.selectedTutor$.next(fullTutor || null);
        }
    }

    /**
     * Get tutor by ID from cache (synchronous)
     */
    getTutorFromCache(id: number): Tutor | undefined {
        return this.tutorsCache$.value.find(t => t.id === id);
    }

    /**
     * Set current filters
     */
    setFilters(filters: TutorFilters): void {
        this.currentFilters$.next(filters);
        this.applyFiltersAndSort();
    }

    /**
     * Set current sort option
     */
    setSort(sort: TutorSortOption): void {
        this.currentSort$.next(sort);
        this.applyFiltersAndSort();
    }

    /**
     * Get current sort option
     */
    getCurrentSort(): TutorSortOption {
        return this.currentSort$.value;
    }

    /**
     * Clear all filters
     */
    clearFilters(): void {
        this.currentFilters$.next({});
        this.applyFiltersAndSort();
    }

    /**
     * Apply filters and sorting to cached tutors
     */
    private applyFiltersAndSort(): void {
        let tutors = [...this.tutorsCache$.value];
        const filters = this.currentFilters$.value;
        const sort = this.currentSort$.value;

        // Apply search filter
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            tutors = tutors.filter(t =>
                t.name.toLowerCase().includes(searchLower) ||
                t.qualification.toLowerCase().includes(searchLower) ||
                t.subjects?.some(s => s.toLowerCase().includes(searchLower)) ||
                t.location?.toLowerCase().includes(searchLower) ||
                t.entityName?.toLowerCase().includes(searchLower)
            );
        }

        // Apply subject filter
        if (filters.subjects && filters.subjects.length > 0) {
            tutors = tutors.filter(t =>
                t.subjects?.some(s =>
                    filters.subjects!.some(fs => s.toLowerCase().includes(fs.toLowerCase()))
                )
            );
        }

        // Apply levels filter
        if (filters.levels && filters.levels.length > 0) {
            tutors = tutors.filter(t =>
                t.levels?.some(l =>
                    filters.levels!.some(fl => l.toLowerCase().includes(fl.toLowerCase()))
                )
            );
        }

        // Apply rate range filter
        if (filters.minRate !== undefined) {
            tutors = tutors.filter(t => (t.hourlyRate || t.fees || 0) >= filters.minRate!);
        }
        if (filters.maxRate !== undefined) {
            tutors = tutors.filter(t => (t.hourlyRate || t.fees || 0) <= filters.maxRate!);
        }

        // Apply location filter
        if (filters.location) {
            const locLower = filters.location.toLowerCase();
            tutors = tutors.filter(t => t.location?.toLowerCase().includes(locLower));
        }

        // Apply availability filter
        if (filters.availability && filters.availability.length > 0) {
            tutors = tutors.filter(t =>
                t.availability?.some(a => filters.availability!.includes(a))
            );
        }

        // Apply contact modes filter
        if (filters.contactModes && filters.contactModes.length > 0) {
            tutors = tutors.filter(t =>
                t.contactModes?.some(c => filters.contactModes!.includes(c))
            );
        }

        // Apply sorting
        tutors = this.sortTutors(tutors, sort);

        // Convert to list items and update
        const listItems = tutors.map(t => toTutorListItem(t));
        this.filteredTutors$.next(listItems);
    }

    /**
     * Sort tutors based on selected option
     */
    private sortTutors(tutors: Tutor[], sort: TutorSortOption): Tutor[] {
        switch (sort) {
            case 'alphabets':
                return tutors.sort((a, b) => a.name.localeCompare(b.name));

            case 'mostLiked':
                return tutors.sort((a, b) => {
                    const likesA = a.champsLiked || a.likes?.length || 0;
                    const likesB = b.champsLiked || b.likes?.length || 0;
                    return likesB - likesA;
                });

            case 'experience':
                return tutors.sort((a, b) => {
                    const expA = getExperienceYears(a.experience);
                    const expB = getExperienceYears(b.experience);
                    return expB - expA;
                });

            case 'recent':
            default:
                return tutors.sort((a, b) => {
                    const dateA = new Date(a.createdAt).getTime();
                    const dateB = new Date(b.createdAt).getTime();
                    return dateB - dateA; // Newest first
                });
        }
    }

    /**
     * Get recent tutors (limit count)
     */
    getRecentTutors(limit: number = 3): Observable<TutorListItem[]> {
        return this.tutorsCache$.pipe(
            map(tutors => {
                const sorted = [...tutors].sort((a, b) => {
                    const dateA = new Date(a.createdAt).getTime();
                    const dateB = new Date(b.createdAt).getTime();
                    return dateB - dateA;
                });
                return sorted.slice(0, limit).map(t => toTutorListItem(t));
            })
        );
    }

    /**
     * Search tutors by query
     */
    searchTutors(query: string): void {
        this.setFilters({ ...this.currentFilters$.value, search: query });
    }

    /**
     * Clear cache and reload (called on page refresh)
     */
    clearCache(): void {
        this.tutorsCache$.next([]);
        this.unfilteredTutors = [];
        this.tutorsLoaded = false;
        this.selectedTutor$.next(null);
        this.filteredTutors$.next([]);
        this.currentFilters$.next({});
        this.currentSort$.next('recent');
    }

    /**
     * Replace the tutors cache (for example when server returns filtered results)
     * and re-apply current filters/sort to update the public list.
     */
    setCacheAndApply(tutors: Tutor[] | null): void {
        this.tutorsCache$.next(tutors || []);
        this.tutorsLoaded = true;
        this.applyFiltersAndSort();
    }

    /**
     * Apply the dynamic category filters to the already loaded tutor records.
     * This is used only when the server-side search endpoint is unavailable.
     * Category fields live inside `categoryMappings.selectedFieldOptions`, not
     * in the legacy top-level subjects/levels arrays.
     */
    applySelectedFilters(selected: SelectedFilters): void {
        const tutors = this.unfilteredTutors.length > 0
            ? this.unfilteredTutors
            : (this.tutorsCache$.value || []);
        const filtered = tutors.filter(tutor => this.matchesSelectedFilters(tutor, selected));
        this.setCacheAndApply(filtered);
    }

    private matchesSelectedFilters(tutor: Tutor, selected: SelectedFilters): boolean {
        const normalize = (value: unknown): string => String(value ?? '')
            .trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const flatten = (value: unknown): string[] => {
            if (Array.isArray(value)) {
                return value.reduce<string[]>((all, item) => all.concat(flatten(item)), []);
            }
            if (value && typeof value === 'object') {
                const record = value as Record<string, unknown>;
                const preferred = record['optionValue'] ?? record['value'] ?? record['optionLabel'] ?? record['label'];
                return preferred == null
                    ? Object.values(record).reduce<string[]>((all, item) => all.concat(flatten(item)), [])
                    : flatten(preferred);
            }
            return String(value ?? '').split(',').map(normalize).filter(Boolean);
        };
        const requested = Object.entries(selected?.filters || {}).filter(([, values]) => values?.length);
        const categoryIds: Record<string, number> = {
            SCHOOL: 1, COLLEGE: 2, LANGUAGES: 3, HOBBIES: 4,
            EXAMS: 5, SPORTS: 6, OTHERS: 7
        };
        const expectedCategoryId = categoryIds[String(selected?.categoryKey || '').toUpperCase()];

        return (tutor.categoryMappings || []).some(mapping => {
            if (expectedCategoryId && Number(mapping.categoryId) !== expectedCategoryId) return false;

            let fields: Record<string, unknown> = {};
            try {
                fields = typeof mapping.selectedFieldOptions === 'string'
                    ? JSON.parse(mapping.selectedFieldOptions) : (mapping.selectedFieldOptions || {});
            } catch {
                return false;
            }

            return requested.every(([requestedKey, selectedValues]) => {
                const actualKey = Object.keys(fields).find(key => normalize(key) === normalize(requestedKey));
                if (!actualKey) return false;
                const actualValues = flatten(fields[actualKey]);
                // Multiple choices in one group are alternatives; separate
                // filter groups are combined, matching the filter UI.
                return selectedValues.some(value => actualValues.includes(normalize(value)));
            });
        });
    }

    /**
     * Estimate count of tutors matching a `SelectedFilters` payload.
     * This uses the same filtering heuristics as `applyFiltersAndSort` but
     * does not mutate service state.
     */
    countForSelectedFilters(selected: SelectedFilters | null): number {
        const tutors = this.unfilteredTutors.length > 0
            ? this.unfilteredTutors
            : (this.tutorsCache$.value || []);

        if (!selected) {
            return tutors.length;
        }
        return tutors.filter(tutor => this.matchesSelectedFilters(tutor, selected)).length;
    }
}
