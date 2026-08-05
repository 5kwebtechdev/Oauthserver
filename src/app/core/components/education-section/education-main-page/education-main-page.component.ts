import { ChangeDetectorRef, Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
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
        AdBannerComponent
    ],
    templateUrl: './education-main-page.component.html',
    styleUrls: ['./education-main-page.component.scss']
})
export class EducationMainPageComponent implements OnInit {
    readonly isParentRole: boolean;
    readonly parentLoadingCards = [0, 1, 2, 3];

    parentShopCategories: ParentEduHubCategory[] = [];
    parentShopCategoriesLoading = false;
    parentShopCategoriesError = false;
    selectedParentCategoryId: string | null = null;

    private readonly parentLearningCategories: ParentEduHubCategory[] = [
        {
            id: 'tutors',
            label: 'Tutor',
            image: 'assets/figma/child-home/eduhub-tutors.png',
            kind: 'route',
            route: '/authed/tutors'
        },
        {
            id: 'academies',
            label: 'Academies',
            image: 'assets/figma/child-home/eduhub-academies.png',
            kind: 'route',
            route: '/authed/academies'
        }
    ];

    private readonly parentGuidanceCategories: ParentEduHubCategory[] = [
        {
            id: 'counselors',
            label: 'Counselors',
            image: 'assets/figma/parent-eduhub/counselors.png',
            kind: 'coming-soon'
        }
    ];

    private readonly parentActivityCategories: ParentEduHubCategory[] = [
        {
            id: 'events',
            label: 'Events',
            image: 'assets/figma/child-home/eduhub-events.png',
            kind: 'coming-soon'
        },
        {
            id: 'workshops',
            label: 'Workshops',
            image: 'assets/figma/child-home/eduhub-workshops.png',
            kind: 'coming-soon'
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

    ngOnInit(): void {
        if (this.isParentRole) {
            this.selectedParentCategoryId = sessionStorage.getItem('superme_parent_eduhub_category');
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
                this.parentShopCategories = categories
                    .map(category => this.mapStoreCategory(category))
                    .filter((category): category is ParentEduHubCategory => category !== null);
                this.parentShopCategoriesLoading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.parentShopCategories = [];
                this.parentShopCategoriesLoading = false;
                this.parentShopCategoriesError = true;
                this.cdr.detectChanges();
            }
        });
    }

    openParentCategory(category: ParentEduHubCategory): void {
        this.selectedParentCategoryId = category.id;
        sessionStorage.setItem('superme_parent_eduhub_category', category.id);

        if (category.kind === 'route' && category.route) {
            void this.router.navigateByUrl(category.route);
            return;
        }

        if (category.kind === 'store' && category.storeCategoryId != null) {
            void this.router.navigate(['/authed/education/shops'], {
                queryParams: {
                    category: category.storeCategoryId,
                    label: category.label
                },
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

    private mapStoreCategory(category: StoreCategoryResponse): ParentEduHubCategory | null {
        const label = String(category?.displayName ?? category?.name ?? '').trim();
        const id = Number(category?.id);
        if (!label || !Number.isFinite(id)) return null;

        const apiImage = String(category?.iconUrl ?? category?.imageUrl ?? '').trim();
        const figmaImage = this.getFigmaShopImage(label);
        const fallbackImage = figmaImage || 'assets/figma/parent-eduhub/shops.svg';

        return {
            id: `store-${id}`,
            label,
            image: figmaImage || apiImage || fallbackImage,
            fallbackImage,
            kind: 'store',
            storeCategoryId: id,
            requiresSchoolClass: !!category.requiresSchoolClass
        };
    }

    private getFigmaShopImage(label: string): string {
        const normalized = label.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

        if (normalized.includes('station')) {
            return 'assets/figma/child-home/eduhub-stationery.png';
        }
        if (normalized.includes('second') && normalized.includes('book')) {
            return 'assets/figma/parent-eduhub/second-hand-books.png';
        }
        if (normalized.includes('sport')) {
            return 'assets/figma/parent-eduhub/sports.png';
        }
        if (normalized.includes('book')) {
            return 'assets/figma/parent-eduhub/books.png';
        }

        return '';
    }
}
