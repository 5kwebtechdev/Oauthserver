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
  image: '/assets/app-assets/reel-1-placeholder.jpg',
  video: '',
  isPlaying: false,
  saved: false
    },
    {
      id: 2,
      category: 'Creative Arts',
      author: 'ArtWhiz',
      title: 'Painting a Sunset with My Fingers!',
      duration: '60 sec',
      likes: '1K',
      tags: '#LittleArtist #MessyFun....',
  image: '/assets/app-assets/reel-2-placeholder.jpg',
  video: '',
  isPlaying: false,
  saved: false
    },
    {
      id: 3,
      category: 'Creative Arts',
      author: 'ArtWhiz',
      title: 'Painting a Sunset with My Fingers!',
      duration: '60 sec',
      likes: '1K',
      tags: '#LittleArtist #MessyFun....',
  image: '/assets/app-assets/reel-2-placeholder.jpg',
  video: '',
  isPlaying: false,
  saved: false
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

  // Play the selected reel (toggle a flag on the slide). In a real app you'd open a player modal or navigate.
  playReel(slide: any) {
    // stop any other playing reels
    this.slides.forEach(s => s.isPlaying = false);
    slide.isPlaying = true;

    // attempt to scroll the card into view
    try {
      const el = this.reelsSwiperRef.nativeElement as HTMLElement;
      const slideEls = el.querySelectorAll('.swiper-slide');
      slideEls.forEach((elSlide: any, idx: number) => {
        if (this.slides[idx] && this.slides[idx].id === slide.id) {
          (elSlide as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center' });
        }
      });
    } catch (e) { /* ignore */ }
  }

  stopReel(slide: any) {
    slide.isPlaying = false;
  }

  toggleSave(slide: any) {
    slide.saved = !slide.saved;
  }
}
