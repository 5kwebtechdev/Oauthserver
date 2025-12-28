import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
    getExperienceYears
} from '../models/tutor.model';

@Injectable({
    providedIn: 'root'
})
export class TutorService {
    private apiUrl = environment.apiUrl;

    // Cache for all tutors - fetched once and reused
    private tutorsCache$ = new BehaviorSubject<Tutor[]>([]);
    private tutorsLoaded = false;
    private tutorsLoading$ = new BehaviorSubject<boolean>(false);

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

    /**
     * Fetch all tutors from API - called once and cached
     * Subsequent calls return cached data
     */
    fetchTutors(forceRefresh = false): Observable<Tutor[]> {
        // Return cached data if available and not forcing refresh
        if (this.tutorsLoaded && !forceRefresh) {
            console.log('[TutorService] Returning cached tutors:', this.tutorsCache$.value.length);
            this.applyFiltersAndSort();
            return of(this.tutorsCache$.value);
        }

        // Prevent multiple simultaneous API calls
        if (this.tutorsLoading$.value) {
            console.log('[TutorService] Already loading, returning cache observable');
            return this.tutorsCache$.asObservable();
        }

        this.tutorsLoading$.next(true);
        console.log('[TutorService] Fetching tutors from API...');

        return this.http.get<Tutor[]>(`${this.apiUrl}/tutors`, { headers: this.getHeaders() })
            .pipe(
                tap(tutors => {
                    console.log('[TutorService] Tutors received:', tutors.length);
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
     * Get a specific tutor by ID
     * First checks cache, then fetches from API if needed
     */
    getTutorById(id: number): Observable<Tutor | null> {
        // Check cache first
        const cached = this.tutorsCache$.value.find(t => t.id === id);
        if (cached) {
            console.log('[TutorService] Returning cached tutor:', id);
            this.selectedTutor$.next(cached);
            return of(cached);
        }

        // Fetch from API
        console.log('[TutorService] Fetching tutor from API:', id);
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
        this.tutorsLoaded = false;
        this.selectedTutor$.next(null);
        this.filteredTutors$.next([]);
        this.currentFilters$.next({});
        this.currentSort$.next('recent');
    }
}
