import { Component, AfterViewInit, ViewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { SupermeNavigatorComponent } from '../superme-navigator/superme-navigator.component';
import { AdBannerComponent } from '../ad-banner/ad-banner.component';
import { FooterComponent } from '../footer/footer.component';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { AddressService } from '../../services/address.service';
import { CustomToastService } from '../../services/custom-toast.service';
import { Address } from '../../api/address.api';
import { environment } from '../../../../environments/environment';
import { SectionComingSoonComponent } from '../section-coming-soon/section-coming-soon.component';

interface StoreCategory {
	id: number;
	name: string;
	displayName: string;
	iconUrl: string | null;
	imageUrl: string;
	requiresSchoolClass: boolean;
}

@Component({
	standalone: true,
	selector: 'school-store',
	templateUrl: './school-store.components.html',
	styleUrls: ['./school-store.components.scss'],
	imports: [CommonModule, IonicModule, RouterModule, SupermeNavigatorComponent, AdBannerComponent, FooterComponent, SectionComingSoonComponent],
	schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SchoolStoreComponent implements AfterViewInit, OnInit, OnDestroy {
	@ViewChild('swiperEl', { static: false }) swiperRef?: ElementRef;
	@ViewChild('navigator', { static: false, read: ElementRef }) navigatorEl?: ElementRef;
	currentSlide = 0;

	// popup state for address/subtext
	showAddressPopup = false;

	// Address state is loaded from the signed-in user's address API.
	addresses: Address[] = [];
	selectedAddress: Address | null = null;
	addressesLoading = false;
	addressesError = false;
	updatingDefaultAddressId: number | null = null;
	private _addressSub?: Subscription;

	// navigator subtext truncated to 20 chars + ellipsis
	get navigatorSubtext(): string {
		if (this.addressesLoading) return 'Loading address...';
		const s = this.selectedAddress ? this.formatAddressShort(this.selectedAddress) : 'Add address';
		return s.length > 20 ? s.slice(0, 20) + '...' : s;
	}

	formatAddressShort(address: Address): string {
		return [address.line1, address.line2, address.city, address.postalCode]
			.filter(Boolean)
			.join(', ');
	}

	formatAddressHtml(address: Address): string {
		const cityState = [address.city, address.state].filter(Boolean).join(', ');
		const cityPostalCode = [cityState, address.postalCode].filter(Boolean).join(' - ');
		return [address.receiverName, address.line1, address.line2, cityPostalCode]
			.filter(Boolean)
			.join('<br/>');
	}

	// cart count driven by shared CartService
	cartCount: number = 0;
	private _cartSub?: Subscription;
	packageCount: number = 0;

	// API-loaded categories state
	storeCategories: StoreCategory[] = [];
	categoriesLoading = false;
	categoriesError = false;

	constructor(
		private router: Router,
		private cdr: ChangeDetectorRef,
		private http: HttpClient,
		private authService: AuthService,
		private cartService: CartService,
		private addressService: AddressService,
		private toastService: CustomToastService
	) { }

	ngOnInit(): void {
		this._cartSub = this.cartService.count$.subscribe(n => {
			this.cartCount = n;
			this.cdr.detectChanges();
		});
		this.cartService.refresh();
		this.subscribeToAddresses();
		this.loadAddresses();
		this.loadCategories();
	}

	ngOnDestroy(): void {
		try { this._cartSub?.unsubscribe(); } catch (e) { }
		try { this._addressSub?.unsubscribe(); } catch (e) { }
	}

	private subscribeToAddresses(): void {
		this._addressSub = this.addressService.addresses$.subscribe(list => {
			this.addresses = Array.isArray(list) ? list : [];
			this.selectedAddress = this.addresses.find(address => address.isDefault)
				?? this.addresses[0]
				?? null;
			this.cdr.detectChanges();
		});
	}

	loadAddresses(): void {
		this.addressesLoading = true;
		this.addressesError = false;
		this.addressService.load().subscribe({
			next: () => {
				this.addressesLoading = false;
				this.cdr.detectChanges();
			},
			error: () => {
				this.addressesLoading = false;
				this.addressesError = true;
				this.selectedAddress = null;
				this.cdr.detectChanges();
			}
		});
	}

	loadCategories(): void {
		this.categoriesLoading = true;
		this.categoriesError = false;
		const token = this.authService.getToken();
		const headers = new HttpHeaders({
			'Authorization': token?.startsWith('Bearer ') ? token : `Bearer ${token ?? ''}`,
			'Accept': 'application/json',
			'x-skip-loading': '1'
		});
		this.http.get<StoreCategory[]>(`${environment.apiUrl}/store/categories/all`, { headers }).subscribe({
			next: (res) => {
				this.storeCategories = Array.isArray(res) ? res : [];
				this.categoriesLoading = false;
				this.cdr.detectChanges();
			},
			error: () => {
				this.categoriesLoading = false;
				this.categoriesError = true;
				this.cdr.detectChanges();
			}
		});
	}

	openCategory(cat: StoreCategory): void {
		if (cat.requiresSchoolClass) {
			this.router.navigateByUrl(`/authed/school-store/institute-detail?categoryId=${cat.id}`).catch(() => {});
		} else {
			this.router.navigateByUrl(`/authed/school-store/product?category=${cat.id}`).catch(() => {});
		}
	}

	openAddressPopup(): void {
		this.showAddressPopup = true;
		this.cdr.detectChanges();
	}

	// handle right action clicks from superme-navigator
	onNavigatorAction(ev: { index: number; action: any }): void {
		try {
			const action = ev && (ev as any).action;
			if (!action) return;
			if (action.type === 'cart') {
				try { this.router.navigateByUrl('/authed/cart'); } catch (e) { console.log('Open cart', action); }
				return;
			}
			if (action.type === 'package') {
				try { this.router.navigateByUrl('/authed/school-store/my-orders'); } catch (e) { console.log('Open packages', action); }
				return;
			}
		} catch (e) { }
	}

	closeAddressPopup(): void {
		this.showAddressPopup = false;
		this.cdr.detectChanges();
	}

	selectAddress(address: Address): void {
		if (this.updatingDefaultAddressId !== null) return;
		if (address.isDefault) {
			this.closeAddressPopup();
			return;
		}

		const previousAddress = this.selectedAddress;
		this.selectedAddress = address;
		this.showAddressPopup = false;
		this.updatingDefaultAddressId = address.id;
		this.cdr.detectChanges();

		this.addressService.setDefault(address.id).subscribe({
			next: () => {
				this.updatingDefaultAddressId = null;
				this.cdr.detectChanges();
			},
			error: () => {
				this.updatingDefaultAddressId = null;
				this.selectedAddress = previousAddress;
				this.toastService.error('Failed to update default address.');
				this.cdr.detectChanges();
			}
		});
	}

	openAddressInput(): void {
		this.closeAddressPopup();
		this.router.navigateByUrl('/authed/school-store/address-input').catch(() => {});
	}


	ngAfterViewInit(): void {
		if (!this.swiperRef?.nativeElement) return;
		const swiperEl: any = this.swiperRef.nativeElement;

		swiperEl.addEventListener('swiperinit', () => {
			try {
				const api = swiperEl.swiper;
				const idx = api?.realIndex ?? api?.activeIndex ?? 0;
				this.currentSlide = idx;
				if (api) {
					api.params = api.params || {};
					api.params.autoplay = api.params.autoplay || {};
					api.params.autoplay.delay = api.params.autoplay.delay ?? 3000;
					api.params.autoplay.disableOnInteraction = api.params.autoplay.disableOnInteraction ?? false;
					if (api.autoplay && typeof api.autoplay.start === 'function') {
						try { api.autoplay.start(); } catch (e) { }
					}
				}
			} catch (e) { }
		});

		const updateIdx = () => {
			try {
				const api = swiperEl.swiper;
				const idx = api?.realIndex ?? api?.activeIndex ?? 0;
				this.currentSlide = idx;
				if (api?.autoplay && typeof api.autoplay.start === 'function') {
					try { api.autoplay.start(); } catch (e) { }
				}
			} catch (e) { }
		};

		swiperEl.addEventListener('slidechange', updateIdx);
		swiperEl.addEventListener('swiperslidechange', updateIdx);

		// Attach delegated click listener on the superme-navigator so clicks on
		// the navigator heading or subtext open the address popup.
		try {
			const navNative = this.navigatorEl?.nativeElement;
			if (navNative && typeof navNative.addEventListener === 'function') {
				navNative.addEventListener('click', (ev: Event) => {
					const target = ev.target as HTMLElement | null;
					if (!target) return;
					// Only open when click is within the navigator heading or subtext row
					if (target.closest && (target.closest('.navigator-heading') || target.closest('.navigator-subtext-row') || target.closest('.navigator-subtext') || target.closest('.navigator-subtext-text'))) {
						this.openAddressPopup();
					}
				});
			}
		} catch (e) { }
	}

	goToSlide(index: number): void {
		if (!this.swiperRef?.nativeElement) return;
		const swiperEl: any = this.swiperRef.nativeElement;
		const api = swiperEl.swiper;
		if (!api) return;
		if (typeof api.slideToLoop === 'function') {
			api.slideToLoop(index, 300);
		} else if (typeof api.slideTo === 'function') {
			api.slideTo(index, 300);
		}
		this.currentSlide = index;
	}

	goBack(): void {
		this.router.navigateByUrl('/home').catch(() => { this.router.navigate(['/authed/user-dashboard']); });
	}
}
