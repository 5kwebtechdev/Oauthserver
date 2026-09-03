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
}

interface ParentEduHubSection {
    key: 'learning-support' | 'shops' | 'guidance' | 'activities';
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
            route: '/authed/academies'
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
            label: 'Events',
            image: 'assets/figma/parent-eduhub/events.webp',
            kind: 'route',
            route: '/authed/education/events'
        },
        {
            id: 'workshops',
            label: 'Workshops',
            image: 'assets/figma/parent-eduhub/workshops.webp',
            kind: 'route',
            route: '/authed/education/workshops'
        }
    ];

    private readonly parentShopCategoryDefinitions: ParentShopCategoryDefinition[] = [
        {
            id: 'stationery-shops',
            label: 'Stationery Shops',
            image: 'assets/figma/parent-eduhub/stationery.webp',
            aliases: ['stationery']
        },
        {
            id: 'book-stores',
            label: 'Book Stores',
            image: 'assets/figma/parent-eduhub/books.webp',
            aliases: ['book store', 'books', 'textbook']
        },
        {
            id: 'second-hand-books',
            label: 'Second-hand Books',
            image: 'assets/figma/parent-eduhub/second-hand-books.webp',
            aliases: ['second hand book', 'secondhand book', 'used book']
        },
        {
            id: 'sports-shop',
            label: 'Sports Shop',
            image: 'assets/figma/parent-eduhub/sports.webp',
            aliases: ['sports', 'sport shop']
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
        return [
            {
                key: 'learning-support',
                label: 'Learning Support',
                icon: 'assets/figma/parent-eduhub/learning-support.svg',
                categories: this.parentLearningCategories
            },
            {
                key: 'shops',
                label: 'Shops',
                icon: 'assets/figma/parent-eduhub/shops.svg',
                categories: this.parentShopCategories,
                loading: this.parentShopCategoriesLoading,
                error: this.parentShopCategoriesError
            },
            {
                key: 'guidance',
                label: 'Guidance & Well-Being',
                icon: 'assets/figma/parent-eduhub/guidance.svg',
                categories: this.parentGuidanceCategories
            },
            {
                key: 'activities',
                label: 'Activities & Events',
                icon: 'assets/figma/parent-eduhub/activities.svg',
                categories: this.parentActivityCategories
            }
        ];
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
                void this.router.navigate(['/authed/second-hand-books']);
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
