import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { MindfulCardHeaderComponent } from '../../mindful-navigator/mindful-card-header/mindful-card-header.component';
import { ViewAllComponent } from '../../mindful-navigator/view-all/view-all.component';
import { ReelFrameComponent } from '../reel-frame/reel-frame.component';

@Component({
  selector: 'reels-card',
  templateUrl: './reels-card.component.html',
  styleUrls: ['./reels-card.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, MindfulCardHeaderComponent, ViewAllComponent, ReelFrameComponent]
})
export class ReelsCardComponent {
  public slides = [
    {
      id: 1,
      category: 'Science Wonders',
      author: 'SparkleKid',
      title: 'Epic Volcano Eruption Experiment!',
      duration: '20 sec',
      likes: '10K',
      views: '25K',
      tags: '#FunScience #DIYExperiment....',
      image: '/assets/app-assets/reel-1-placeholder.jpg',
      video: 'https://sample-videos.com/zip/10/mp4/480/mp4/SampleVideo_480x270_1mb.mp4',
      saved: false,
      liked: false
    },
    {
      id: 2,
      category: 'Creative Arts',
      author: 'ArtWhiz',
      title: 'Painting a Sunset with My Fingers!',
      duration: '60 sec',
      likes: '1K',
      views: '5.2K',
      tags: '#LittleArtist #MessyFun....',
      image: '/assets/app-assets/reel-2-placeholder.jpg',
      video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      saved: true,
      liked: false
    },
    {
      id: 3,
      category: 'Comedy & Fun',
      author: 'FunnyKid',
      title: 'Dancing with My Pet!',
      duration: '45 sec',
      likes: '2.5K',
      views: '8.1K',
      tags: '#PetLove #DanceFun....',
      image: '/assets/app-assets/reel-2-placeholder.jpg',
      video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      saved: false,
      liked: true
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

  // Play the selected reel by opening full-screen expand view
  playReel(slide: any) {
    console.log('playReel called with slide:', slide);
    // Don't set any playing state - just open the expanded view
    try {
      const ev = new CustomEvent('openReelExpanded', { detail: slide });
      console.log('Dispatching openReelExpanded event:', ev);
      window.dispatchEvent(ev);
      console.log('Event dispatched successfully');
    } catch (e) { 
      console.error('Error dispatching openReelExpanded event:', e);
    }
  }

  toggleSave(slide: any) {
    slide.saved = !slide.saved;
  }
}
