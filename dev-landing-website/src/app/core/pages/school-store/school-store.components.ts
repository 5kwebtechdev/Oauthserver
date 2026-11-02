import { Component, AfterViewInit, OnDestroy, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { PublicNavbarComponent } from '../../components/public-navbar/public-navbar.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { SchoolStoreSelection } from './institute-detail-fill/institute-detail-fill.components';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { shopCategoryPath } from '../../services/shop-url';
import { environment } from '../../../../environments/environment';
import { AdSliderComponent } from '../../components/ad-slider/ad-slider.component';

interface StoreCategory {
	id: number;
	name: string;
	iconUrl: string | null;
}

interface StoreCategoryCard extends StoreCategory {
	action: string;
	imageUrl: string;
}

@Component({
	standalone: true,
	selector: 'school-store',
	templateUrl: './school-store.components.html',
	styleUrls: ['./school-store.components.scss'],
	imports: [CommonModule, IonicModule, RouterModule, PublicNavbarComponent, FooterComponent, AdSliderComponent],
	schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SchoolStoreComponent implements OnInit, AfterViewInit, OnDestroy {
	currentSlide = 0;
	storeCategories: StoreCategoryCard[] = [];
	isLoadingCategories = false;
	private readonly storeApi = `${environment.mobileAppUrl}/public/store`;
	private readonly categoriesApi = `${this.storeApi}/categories/all`;
	private readonly apiSub = new Subscription();

	banners = [
		{
			bg: 'linear-gradient(135deg, #4A0D25 0%, #7B1A3A 50%, #90214D 100%)',
			title: 'Get School Ready!',
			subtitle: 'Uniforms & Books starting @ ₹499',
			cta: 'Shop Now',
			images: [
				'https://cdn-icons-png.flaticon.com/512/2203/2203688.png',
				'https://cdn-icons-png.flaticon.com/512/3330/3330314.png'
			],
			action: 'boys-uniform'
		},
		{
			bg: 'linear-gradient(135deg, #1a3a5c 0%, #2a5a8c 50%, #3a7abc 100%)',
			title: 'All Books, One Place',
			subtitle: 'Textbooks for every class & board',
			cta: 'Browse Books',
			images: [
				'https://cdn-icons-png.flaticon.com/512/2702/2702154.png',
				'https://cdn-icons-png.flaticon.com/512/3749/3749762.png'
			],
			action: 'textbooks'
		},
		{
			bg: 'linear-gradient(135deg, #2d4a3e 0%, #3d6a5e 50%, #4d8a6e 100%)',
			title: 'Step Into Style',
			subtitle: 'Shoes & Accessories from ₹299',
			cta: 'Explore Now',
			images: [
				'https://cdn-icons-png.flaticon.com/512/2742/2742637.png',
				'https://cdn-icons-png.flaticon.com/512/3050/3050453.png'
			],
			action: 'footwear'
		}
	];

	private carouselTimer: any = null;

	// local navigator action counts
	cartCount: number = 0;
	packageCount: number = 0;

	constructor(private router: Router, private http: HttpClient) { }

	ngOnInit(): void {
		this.loadStoreCategories();
	}

	// handle right action clicks from header
	onNavigatorAction(ev: { index?: number; action?: any }): void {
		try {
			const action = ev && (ev as any).action;
			if (!action) return;
				if (action.type === 'cart') {
					this.router.navigate(['/shop/cart']);
					return;
				}
			if (action.type === 'package') {
				this.router.navigate(['/shop/orders']);
				return;
			}
		} catch (e) { }
	}


	ngAfterViewInit(): void {
		this.startAutoplay();
	}

	ngOnDestroy(): void {
		this.stopAutoplay();
		this.apiSub.unsubscribe();
	}

	private loadStoreCategories(): void {
		this.isLoadingCategories = true;
		const sub = this.http.get<StoreCategory[]>(this.categoriesApi).subscribe({
			next: (categories) => {
				this.storeCategories = (categories || []).map(category => ({
					...category,
					action: this.toCategoryAction(category),
					imageUrl: this.resolveCategoryImage(category)
				}));
				this.isLoadingCategories = false;
			},
			error: () => {
				this.storeCategories = this.getFallbackCategories();
				this.isLoadingCategories = false;
			}
		});
		this.apiSub.add(sub);
	}

	private toCategoryAction(category: StoreCategory): string {
		return category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || category.id.toString();
	}

	private resolveCategoryImage(category: StoreCategory): string {
		if (category.iconUrl) return category.iconUrl;
		const fallbackImages: Record<string, string> = {
			'stationery': '/assets/Icons-Neutral/Stationery-Store.png',
			'stationery-books': '/assets/Icons-Neutral/Stationery-Store.png',
			'boys-uniform': '/assets/School-assets/Boys Uniform.png',
			'girls-uniform': '/assets/School-assets/Girls Uniform.png',
			'textbooks': '/assets/School-assets/text-books.png',
			'footwears': '/assets/School-assets/Footwear.png',
			'footwear': '/assets/School-assets/Footwear.png',
			'accessories': '/assets/School-assets/Accessories.png',
			'entrance-exam-books': '/assets/School-assets/Entrance Exam.png',
			'general-books': '/assets/School-assets/gernal-books.png'
		};
		return fallbackImages[this.toCategoryAction(category)] || '/assets/School-assets/Accessories.png';
	}

	private getFallbackCategories(): StoreCategoryCard[] {
		return [
			{ id: 1, name: 'Stationery', iconUrl: null, action: 'stationery', imageUrl: '/assets/Icons-Neutral/Stationery-Store.png' },
			{ id: 2, name: 'Boys Uniform', iconUrl: null, action: 'boys-uniform', imageUrl: '/assets/School-assets/Boys Uniform.png' },
			{ id: 3, name: 'Girls Uniform', iconUrl: null, action: 'girls-uniform', imageUrl: '/assets/School-assets/Girls Uniform.png' },
			{ id: 4, name: 'Textbooks', iconUrl: null, action: 'textbooks', imageUrl: '/assets/School-assets/text-books.png' },
			{ id: 5, name: 'Footwears', iconUrl: null, action: 'footwears', imageUrl: '/assets/School-assets/Footwear.png' },
			{ id: 6, name: 'Accessories', iconUrl: null, action: 'accessories', imageUrl: '/assets/School-assets/Accessories.png' },
			{ id: 7, name: 'Entrance Exam Books', iconUrl: null, action: 'entrance-exam-books', imageUrl: '/assets/School-assets/Entrance Exam.png' },
			{ id: 8, name: 'General Books', iconUrl: null, action: 'general-books', imageUrl: '/assets/School-assets/gernal-books.png' }
		];
	}

	private startAutoplay(): void {
		this.stopAutoplay();
		if (this.banners.length <= 1) return;
		this.carouselTimer = setInterval(() => this.nextSlide(), 5000);
	}

	private stopAutoplay(): void {
		if (this.carouselTimer) {
			clearInterval(this.carouselTimer);
			this.carouselTimer = null;
		}
	}

	nextSlide(): void {
		this.currentSlide = (this.currentSlide + 1) % this.banners.length;
		this.startAutoplay();
	}

	prevSlide(): void {
		this.currentSlide = (this.currentSlide - 1 + this.banners.length) % this.banners.length;
		this.startAutoplay();
	}

	goToSlide(index: number): void {
		this.currentSlide = index;
		this.startAutoplay();
	}

	onBannerCta(action: string): void {
		this.openInstituteDetailFill(action);
	}

	goBack(): void {
		this.router.navigateByUrl('/home').catch(() => { this.router.navigate(['/authed/user-dashboard']); });
	}

	openInstituteDetailFill(category?: string): void {
		const matched = this.storeCategories.find(item => item.action === category);
		const categoryId = matched?.id ?? null;
		const categoryName = matched?.name ?? category ?? null;

		if (category && !this.requiresSchoolForm(category)) {
			this.openProductStore({ category, categoryId, categoryName });
			return;
		}

		this.router.navigate(['/shop/school-details'], {
			state: { category: category ?? null, categoryId, categoryName }
		});
	}

	openInstituteDetailFillForCategory(category: StoreCategoryCard): void {
		if (!this.requiresSchoolForm(category.action)) {
			this.openProductStore({
				category: category.action,
				categoryId: category.id,
				categoryName: category.name
			});
			return;
		}

		this.router.navigate(['/shop/school-details'], {
			state: { category: category.action, categoryId: category.id, categoryName: category.name }
		});
	}

	private requiresSchoolForm(categoryAction: string | null | undefined): boolean {
		const action = (categoryAction || '').toLowerCase();
		return action.includes('uniform');
	}

	openProductStore(selection?: SchoolStoreSelection | string | null): void {
		const normalizedSelection: SchoolStoreSelection = typeof selection === 'string'
			? { category: selection }
			: {
				category: selection?.category ?? null,
				categoryId: selection?.categoryId ?? null,
				categoryName: selection?.categoryName ?? null,
				schoolId: selection?.schoolId ?? null,
				schoolName: selection?.schoolName ?? null,
				className: selection?.className ?? null
			};
		this.router.navigate([shopCategoryPath(normalizedSelection.categoryName || normalizedSelection.category || 'stationery')], {
      state: normalizedSelection,
      queryParams: { schoolId: normalizedSelection.schoolId || undefined, className: normalizedSelection.className || undefined }
    });
	}
}
