import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';

@Component({
    selector: 'app-education-main-page',
    standalone: true,
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    imports: [CommonModule, IonicModule, MindfulNavigatorComponent],
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

        // Update currentSlide on init
        swiperEl.addEventListener('swiperinit', () => {
            try {
                const idx = swiperEl.swiper?.realIndex ?? swiperEl.swiper?.activeIndex ?? 0;
                this.currentSlide = idx;
            } catch (e) { }
        });

        // Slide change events
        swiperEl.addEventListener('slidechange', () => {
            try {
                const idx = swiperEl.swiper?.realIndex ?? swiperEl.swiper?.activeIndex ?? 0;
                this.currentSlide = idx;
            } catch (e) { }
        });
        swiperEl.addEventListener('swiperslidechange', () => {
            try {
                const idx = swiperEl.swiper?.realIndex ?? swiperEl.swiper?.activeIndex ?? 0;
                this.currentSlide = idx;
            } catch (e) { }
        });
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