import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FooterComponent } from '../../footer/footer.component';
import { SkeletonImageComponent } from '../../skeleton-image/skeleton-image.component';
import { AdBannerComponent, AdScreen } from '../../ad-banner/ad-banner.component';
import { AuthService } from '../../../services/auth.service';
import { CoreService } from '../../../services/core.service';

export interface EduCategory {
    label: string;
    icon: string;
    route: string | null;
}

@Component({
    selector: 'app-education-main-page',
    standalone: true,
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    imports: [CommonModule, IonicModule, RouterModule, FooterComponent, SkeletonImageComponent, AdBannerComponent],
    templateUrl: './education-main-page.component.html',
    styleUrls: ['./education-main-page.component.scss']
})
export class EducationMainPageComponent implements OnInit {

    @ViewChild('swiperEl', { static: false }) swiperRef?: ElementRef;
    currentSlide = 0;

    // Shown for every role (parent/child/self) — this page has no role gating.
    // Categories without a built destination yet route to null and show a
    // "coming soon" toast instead of a broken link.
    readonly eduCategories: EduCategory[] = [
        { label: 'Tutors', icon: 'fa-solid fa-chalkboard-user', route: '/authed/tutors' },
        { label: 'Academies', icon: 'fa-solid fa-school', route: '/authed/academies' },
        { label: 'Workshops', icon: 'fa-solid fa-lightbulb', route: null },
        { label: 'Events', icon: 'fa-solid fa-calendar-days', route: null },
        { label: 'Stationery Shops', icon: 'fa-solid fa-pen-ruler', route: null },
        { label: 'Book Stores', icon: 'fa-solid fa-book', route: null },
        { label: 'Counselors', icon: 'fa-solid fa-comments', route: null },
        { label: 'Second-Hand Books', icon: 'fa-solid fa-book-open', route: null },
        { label: 'Sports Shops', icon: 'fa-solid fa-basketball', route: null },
    ];

    constructor(private router: Router, private authService: AuthService, private core: CoreService) { }

    get eduAdScreen(): AdScreen {
        return this.authService.isParentUser() ? 'EDUHUB_PARENTS' : 'EDUHUB';
    }

    openCategory(category: EduCategory): void {
        if (category.route) {
            this.router.navigate([category.route]);
            return;
        }
        this.core.triggerToasrt(`${category.label} is coming soon.`);
    }

    ngOnInit(): void {
    }

    ngAfterViewInit(): void {
        if (!this.swiperRef?.nativeElement) return;
        const swiperEl: any = this.swiperRef.nativeElement;

        // Update currentSlide on init and ensure autoplay is started
        swiperEl.addEventListener('swiperinit', () => {
            try {
                const api = swiperEl.swiper;
                const idx = api?.realIndex ?? api?.activeIndex ?? 0;
                this.currentSlide = idx;

                // Ensure autoplay params are present and start autoplay programmatically
                if (api) {
                    api.params = api.params || {};
                    api.params.autoplay = api.params.autoplay || {};
                    // prefer configured delay (template binding), but fall back to 3000ms
                    api.params.autoplay.delay = api.params.autoplay.delay ?? 3000;
                    api.params.autoplay.disableOnInteraction = api.params.autoplay.disableOnInteraction ?? false;
                    if (api.autoplay && typeof api.autoplay.start === 'function') {
                        try { api.autoplay.start(); } catch (e) { }
                    }
                }
            } catch (e) { }
        });

        // Slide change events: keep currentSlide in sync and resume autoplay if needed
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

    goBack(): void {
        this.router.navigate(['/authed/user-dashboard']);
    }

    goToSlide(index: number): void {
        if (!this.swiperRef?.nativeElement) return;
        const swiperEl: any = this.swiperRef.nativeElement;
        const api = swiperEl.swiper;
        if (!api) return;
        // prefer slideToLoop when loop enabled
        if (typeof api.slideToLoop === 'function') {
            api.slideToLoop(index, 300);
        } else if (typeof api.slideTo === 'function') {
            api.slideTo(index, 300);
        }
        this.currentSlide = index;
    }

}
