import { ChangeDetectorRef, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';
import { CoreService } from '../../../services/core.service';
import { AdBannerComponent, AdScreen } from '../../ad-banner/ad-banner.component';
import { FooterComponent } from '../../footer/footer.component';
import { SkeletonImageComponent } from '../../skeleton-image/skeleton-image.component';
import { EduHubCitySelectorComponent } from '../eduhub-city-selector/eduhub-city-selector.component';

type ParentEduHubCategoryKind = 'route' | 'store' | 'coming-soon';

interface ParentEduHubCategory {
    id: string;
    label: string;
    image: string;
    fallbackImage?: string;
    kind: ParentEduHubCategoryKind;
    route?: string;
    storeCategoryId?: number;
    requiresSchoolClass?: boolean;
    description?: string;
    displayTitle?: string;
}

interface ParentEduHubSection {
    key: 'learning-support' | 'pre-loved' | 'shops' | 'guidance' | 'activities' | 'living';
    label: string;
    icon: string;
    categories: ParentEduHubCategory[];
    loading?: boolean;
    error?: boolean;
}

interface StoreCategoryResponse {
    id: number;
    name?: string | null;
    displayName?: string | null;
    iconUrl?: string | null;
    imageUrl?: string | null;
    requiresSchoolClass?: boolean;
}

interface ParentShopCategoryDefinition {
    id: string;
    label: string;
    image: string;
    aliases: string[];
}

@Component({
    selector: 'app-education-main-page',
    standalone: true,
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    imports: [
        CommonModule,
        IonicModule,
        RouterModule,
        FooterComponent,
        SkeletonImageComponent,
        AdBannerComponent,
        EduHubCitySelectorComponent
    ],
    templateUrl: './education-main-page.component.html',
    styleUrls: ['./education-main-page.component.scss']
})
export class EducationMainPageComponent implements OnInit {
    @ViewChild('parentEduHubSearchInput') parentEduHubSearchInput?: ElementRef<HTMLInputElement>;

    readonly isParentRole: boolean;
    readonly usesNewEduHubLayout: boolean;
    readonly parentLoadingCards = [0, 1, 2, 3];

    parentShopCategories: ParentEduHubCategory[] = [];
    parentShopCategoriesLoading = false;
    parentShopCategoriesError = false;
    selectedParentCategoryId: string | null = null;
    parentSearchOpen = false;
    parentSearchQuery = '';

    private readonly parentLearningCategories: ParentEduHubCategory[] = [
        {
            id: 'tutors',
            label: 'Tutor',
            image: 'assets/figma/parent-eduhub/tutor.webp',
            kind: 'route',
            route: '/authed/tutors'
        },
        {
            id: 'academies',
            label: 'Academies',
            image: 'assets/figma/parent-eduhub/academies.webp',
            kind: 'route',
            route: '/academies'
        }
    ];

    private readonly parentGuidanceCategories: ParentEduHubCategory[] = [
        {
            id: 'counselors',
            label: 'Counselors',
            image: 'assets/figma/parent-eduhub/counselors.webp',
            kind: 'route',
            route: '/authed/counselors'
        }
    ];

    private readonly parentActivityCategories: ParentEduHubCategory[] = [
        {
            id: 'events',
            label: 'Events & Workshops',
            image: 'assets/figma/parent-eduhub/events.webp',
            kind: 'route',
            route: '/authed/education/events?combined=true'
        }
    ];

    private readonly parentShopCategoryDefinitions: ParentShopCategoryDefinition[] = [
        {
            id: 'book-stores',
            label: 'Book Stores',
            image: 'assets/figma/parent-eduhub/books.webp',
            aliases: ['book store', 'books', 'textbook']
        },
        {
            id: 'sports-shop',
            label: 'Sports Shop',
            image: 'assets/figma/parent-eduhub/sports.webp',
            aliases: ['sports', 'sport shop']
        },
        {
            id: 'stationery-shops',
            label: 'Stationery Shops',
            image: 'assets/figma/parent-eduhub/stationery.webp',
            aliases: ['stationery']
        },
        {
            id: 'second-hand-books',
            label: 'Second-hand Books',
            image: 'assets/figma/parent-eduhub/second-hand-books.webp',
            aliases: ['second hand book', 'secondhand book', 'used book']
        }
    ];

    constructor(
        private router: Router,
        private authService: AuthService,
        private http: HttpClient,
        private core: CoreService,
        private cdr: ChangeDetectorRef
    ) {
        this.isParentRole = this.authService.isParentUser();
        // Use one consistent, category-based EduHub experience for every
        // authenticated role, including the dashboard back navigation.
        this.usesNewEduHubLayout = true;
        this.parentShopCategories = this.createParentShopCategories();
    }

    get eduAdScreen(): AdScreen {
        return this.isParentRole ? 'EDUHUB_PARENTS' : 'EDUHUB';
    }

    get parentEduHubSections(): ParentEduHubSection[] {
        const sections: ParentEduHubSection[] = [
            {
                key: 'learning-support',
                label: 'Learning Support',
                icon: 'assets/figma/eduhub-categories/learning.svg',
                categories: this.parentLearningCategories
            },
            {
                key: 'pre-loved',
                label: 'Pre-Loved Finds',
                icon: 'assets/figma/eduhub-categories/pre-loved.svg',
                categories: this.parentShopCategories.filter(category => category.id === 'store-second-hand-books'),
                loading: this.parentShopCategoriesLoading,
                error: this.parentShopCategoriesError
            },
            {
                key: 'shops',
                label: 'Shops',
                icon: 'assets/figma/eduhub-categories/shops.svg',
                categories: ['store-stationery-shops', 'store-book-stores', 'store-sports-shop']
                    .map(id => this.parentShopCategories.find(category => category.id === id))
                    .filter((category): category is ParentEduHubCategory => !!category),
                loading: this.parentShopCategoriesLoading,
                error: this.parentShopCategoriesError
            },
            {
                key: 'guidance',
                label: 'Guidance & Well-Being',
                icon: 'assets/figma/eduhub-categories/guidance.svg',
                categories: this.parentGuidanceCategories
            },
            {
                key: 'activities',
                label: 'Activities & Events',
                icon: 'assets/figma/eduhub-categories/activities.svg',
                categories: this.parentActivityCategories
            },
            {
                key: 'living',
                label: 'Stay & Living',
                icon: 'assets/figma/eduhub-categories/living.svg',
                categories: [{ id: 'hostels', label: 'PG / Hostels', image: 'assets/figma/eduhub-categories/hostels.png', kind: 'route', route: '/authed/education/pg-hostels' }]
            }
        ];
        // Presentation-only metadata from Figma 25657:18007. Preserve the
        // category IDs, API metadata and navigation labels used by click handlers.
        const presentation: Record<string, { image: string; description: string; displayTitle?: string }> = {
            tutors: { image: 'tutor', description: 'Get 1 : 1 with trusted tutors' },
            academies: { image: 'academy', description: 'Explore courses and programs' },
            'store-second-hand-books': { image: 'second-hand', displayTitle: 'Second-hand books', description: 'Pre-loved books in great condition, at prices that make room for the next one.' },
            'store-stationery-shops': { image: 'stationery', displayTitle: 'Stationery\nShops', description: 'Notebooks, pens & more' },
            'store-book-stores': { image: 'books', displayTitle: 'Book\nStores', description: 'Story, Frictions books & more' },
            'store-sports-shop': { image: 'sports', description: 'Gear up for a healthier you.' },
            counselors: { image: 'counselors', description: 'Talk, share, and get guidance from trusted professionals.' },
            events: { image: 'events', description: 'Find events and workshops near you. Discover new skills every time.' },
            hostels: { image: 'hostels', description: 'Verified PGs and hostels near you. Safe, affordable stays for students.' }
        };
        return sections.map(section => ({ ...section, categories: section.categories.map(category => {
            const visual = presentation[category.id];
            const image = `assets/figma/eduhub-categories/${visual.image}.png`;
            return { ...category, ...visual, image, fallbackImage: image };
        }) }));
    }

    get filteredParentEduHubSections(): ParentEduHubSection[] {
        const query = this.parentSearchQuery.trim().toLowerCase();
        if (!query) return this.parentEduHubSections;

        return this.parentEduHubSections
            .map(section => ({
                ...section,
                categories: section.categories.filter(category =>
                    category.label.toLowerCase().includes(query)
                )
            }))
            .filter(section => section.loading || section.error || section.categories.length > 0);
    }

    toggleParentSearch(): void {
        this.parentSearchOpen = !this.parentSearchOpen;
        if (!this.parentSearchOpen) {
            this.parentSearchQuery = '';
            return;
        }

        setTimeout(() => this.parentEduHubSearchInput?.nativeElement.focus());
    }

    onParentSearchInput(event: Event): void {
        this.parentSearchQuery = (event.target as HTMLInputElement | null)?.value ?? '';
    }

    ngOnInit(): void {
        if (this.usesNewEduHubLayout) {
            // A category is a navigation action, not a persistent selection.
            // Restoring it after returning made the card retain a dark stroke.
            this.selectedParentCategoryId = null;
            this.loadParentShopCategories();
        }
    }

    goBack(): void {
        void this.router.navigateByUrl(this.authService.getDashboardRoute());
    }

    loadParentShopCategories(): void {
        if (this.parentShopCategoriesLoading) return;

        this.parentShopCategoriesLoading = true;
        this.parentShopCategoriesError = false;

        this.http.get<StoreCategoryResponse[]>(
            `${environment.apiUrl}/store/categories/all`,
            { headers: this.getApiHeaders() }
        ).subscribe({
            next: (response) => {
                const categories = Array.isArray(response) ? response : [];
                this.parentShopCategories = this.createParentShopCategories(categories);
                this.parentShopCategoriesLoading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                // Keep the four design categories available even if category metadata
                // cannot be refreshed. Their listings screen safely filters by label.
                this.parentShopCategories = this.createParentShopCategories();
                this.parentShopCategoriesLoading = false;
                this.parentShopCategoriesError = false;
                this.cdr.detectChanges();
            }
        });
    }

    openParentCategory(category: ParentEduHubCategory): void {
        this.parentSearchOpen = false;
        this.parentSearchQuery = '';
        // Keep the category cards visually neutral after the next navigation.
        // The :active state still provides immediate tap feedback.
        this.selectedParentCategoryId = null;

        if (category.kind === 'route' && category.route) {
            void this.router.navigateByUrl(category.route);
            return;
        }

        if (category.kind === 'store') {
            // Shop cards receive the `store-` ID prefix when constructed. Use
            // that runtime ID (and the label as a safe fallback) so this card
            // always opens the buyer/seller/listings entry screen, rather than
            // the generic shop listing page.
            if (category.id === 'store-second-hand-books' || category.label.toLowerCase() === 'second-hand books') {
                void this.router.navigate(['/second-hand-books']);
                return;
            }

            void this.router.navigate(['/authed/education/shops'], {
                queryParams: category.storeCategoryId != null
                    ? { category: category.storeCategoryId, label: category.label }
                    : { label: category.label },
                state: {
                    categoryLabel: category.label,
                    categoryId: category.storeCategoryId
                }
            });
            return;
        }

        this.selectedParentCategoryId = null;
        this.core.triggerToasrt(`${category.label} is coming soon.`, 'info');
    }

    onCategoryImageError(event: Event, category: ParentEduHubCategory): void {
        const image = event.target as HTMLImageElement | null;
        if (!image) return;

        if (category.fallbackImage && image.src.indexOf(category.fallbackImage) === -1) {
            image.src = category.fallbackImage;
            return;
        }

        image.style.visibility = 'hidden';
    }

    trackSection(_: number, section: ParentEduHubSection): string {
        return section.key;
    }

    trackCategory(_: number, category: ParentEduHubCategory): string {
        return category.id;
    }

    private getApiHeaders(): HttpHeaders {
        const token = this.authService.getToken();
        let headers = new HttpHeaders({
            'Accept': 'application/json',
            'x-skip-loading': '1'
        });

        if (token) {
            headers = headers.set(
                'Authorization',
                token.startsWith('Bearer ') ? token : `Bearer ${token}`
            );
        }

        return headers;
    }

    private createParentShopCategories(categories: StoreCategoryResponse[] = []): ParentEduHubCategory[] {
        return this.parentShopCategoryDefinitions.map(definition => {
            const match = categories.find(category => {
                const categoryLabel = String(category?.displayName ?? category?.name ?? '')
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, ' ')
                    .trim();
                return definition.aliases.some(alias => categoryLabel.includes(alias));
            });
            const categoryId = Number(match?.id);

            return {
                id: `store-${definition.id}`,
                label: definition.label,
                image: definition.image,
                fallbackImage: definition.image,
                kind: 'store',
                storeCategoryId: Number.isFinite(categoryId) ? categoryId : undefined,
                requiresSchoolClass: !!match?.requiresSchoolClass
            };
        });
    }
}
