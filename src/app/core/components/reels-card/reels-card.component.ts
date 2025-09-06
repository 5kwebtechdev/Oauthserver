import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'reels-card',
  templateUrl: './reels-card.component.html',
  styleUrls: ['./reels-card.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class ReelsCardComponent {
  // lightweight presentational component for short reels/highlights
  // sample static slides (replace/extend with real data as needed)
  public slides = [
    {
      id: 1,
      category: 'Science Wonders',
      author: 'SparkleKid',
      title: 'Epic Volcano Eruption Experiment!',
      duration: '20 sec',
      likes: '10K',
      tags: '#FunScience #DIYExperiment....',
      image: '/assets/app-assets/reel-1-placeholder.jpg'
    },
    {
      id: 2,
      category: 'Creative Arts',
      author: 'ArtWhiz',
      title: 'Painting a Sunset with My Fingers!',
      duration: '60 sec',
      likes: '1K',
      tags: '#LittleArtist #MessyFun....',
      image: '/assets/app-assets/reel-2-placeholder.jpg'
    }
  ];

  @ViewChild('reelsSwiper', { read: ElementRef, static: true }) reelsSwiperRef!: ElementRef;

  // initialize the global Swiper (included via angular.json scripts -> swiper-bundle)
  ngAfterViewInit(): void {
    const win = window as any;
    if (win && typeof win.Swiper === 'function') {
      // initialize Swiper with pagination
      new win.Swiper(this.reelsSwiperRef.nativeElement, {
        slidesPerView: 1.6,
        spaceBetween: 12,
        centeredSlides: false,
        pagination: { el: '.swiper-pagination', clickable: true }
      });
    } else {
      // Swiper not yet available globally; dev server may load it from scripts. No-op.
      console.warn('Swiper bundle not found on window. Make sure swiper-bundle.min.js is added to angular.json scripts.');
    }
  }
}
