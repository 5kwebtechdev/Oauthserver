import { Component, AfterViewInit, ViewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../mindful-navigator/mindful-navigator.component';
import { Router } from '@angular/router';

@Component({
	standalone: true,
	selector: 'school-store',
	templateUrl: './school-store.components.html',
	styleUrls: ['./school-store.components.scss'],
	imports: [CommonModule, IonicModule, MindfulNavigatorComponent],
	schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SchoolStoreComponent implements AfterViewInit {
	@ViewChild('swiperEl', { static: false }) swiperRef?: ElementRef;
	currentSlide = 0;

	constructor(private router: Router) { }

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
