import { Component, AfterViewInit, ViewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { MindfulNavigatorComponent } from '../mindful-navigator/mindful-navigator.component';
import { Router } from '@angular/router';

@Component({
	standalone: true,
	selector: 'school-store',
	templateUrl: './school-store.components.html',
	styleUrls: ['./school-store.components.scss'],
	imports: [CommonModule, IonicModule, RouterModule, MindfulNavigatorComponent],
	schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SchoolStoreComponent implements AfterViewInit {
	@ViewChild('swiperEl', { static: false }) swiperRef?: ElementRef;
	@ViewChild('navigator', { static: false, read: ElementRef }) navigatorEl?: ElementRef;
	currentSlide = 0;

	// popup state for address/subtext
	showAddressPopup = false;

	// address list and selection
	addresses = [
		{
			id: 'rahul',
			short: '502, Galaxy Apartment, Association Road',
			html: 'Rahul- 502, Galaxy Apartment, Association Road<br/>Chennai- 600071'
		},
		{
			id: 'megha',
			short: '502, Royal Apartment, Altmount Road',
			html: 'Megha- 502, Royal Apartment, Altmount Road<br/>Chennai- 600071'
		}
	];

	selectedId: string | null = this.addresses[0].id;
	selectedAddress: string = this.addresses[0].short;

	// navigator subtext truncated to 20 chars + ellipsis
	get navigatorSubtext(): string {
		const s = this.selectedAddress || '';
		return s.length > 20 ? s.slice(0, 20) + '...' : s;
	}

	constructor(private router: Router, private cdr: ChangeDetectorRef) { }

	openAddressPopup(): void {
		this.showAddressPopup = true;
		this.cdr.detectChanges();
	}

	closeAddressPopup(): void {
		this.showAddressPopup = false;
		this.cdr.detectChanges();
	}

	selectAddress(a: { id: string; short: string; html: string }): void {
		this.selectedId = a.id;
		this.selectedAddress = a.short;
		this.showAddressPopup = false;
		this.cdr.detectChanges();
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

		// Attach delegated click listener on the mindful-navigator so clicks on
		// the subtext or its svg can open the address popup.
		try {
			const navNative = this.navigatorEl?.nativeElement;
			if (navNative && typeof navNative.addEventListener === 'function') {
				navNative.addEventListener('click', (ev: Event) => {
					const target = ev.target as HTMLElement | null;
					if (!target) return;
					// open when user clicks an inline svg inside navigator or text containing the sample address
					if (target.closest && target.closest('svg')) {
						this.openAddressPopup();
						return;
					}
					const text = (target.textContent || '').trim();
					if (text && text.indexOf('502') !== -1) {
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
		this.router.navigate(['/authed/user-dashboard']).catch(() => { this.router.navigateByUrl('/authed'); });
	}
}
