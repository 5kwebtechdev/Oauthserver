import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';

@Component({
    selector: 'app-education-main-page',
    standalone: true,
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    imports: [CommonModule, IonicModule, MindfulNavigatorComponent, RouterModule],
    templateUrl: './education-main-page.component.html',
    styleUrls: ['./education-main-page.component.scss']
})
export class EducationMainPageComponent implements OnInit {

    @ViewChild('swiperEl', { static: false }) swiperRef?: ElementRef;
    currentSlide = 0;

    constructor(private router: Router) { }

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