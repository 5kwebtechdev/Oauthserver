import { Component, AfterViewInit, ViewChildren, QueryList, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
// ReelsExpandComponent removed from imports — not used directly in template
import { BookmarkReelsComponent } from './bookmark-reels.component';
import { ReelGuidelinesComponent } from './reel-guidelines.component';
import { NewReelsComponent } from './new-reels.component';
import { ShareReelComponent } from './share-reel.component';

@Component({
  selector: 'reel-section',
  templateUrl: './reel-section.component.html',
  styleUrls: ['./reel-section.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, BookmarkReelsComponent, ReelGuidelinesComponent, NewReelsComponent, ShareReelComponent]
})
export class ReelSectionComponent implements AfterViewInit {
  // sample slides - synced with reels-card component
  public slides = [
    // Science Wonders
    {
      id: 1,
      category: 'Science Wonders',
      author: 'SparkleKid',
      title: 'Epic Volcano Eruption Experiment!',
      duration: '20 sec',
      likes: '10K',
      tags: '#FunScience #DIYExperiment',
      image: '/assets/app-assets/reel-1-placeholder.jpg',
      video: '',
      isPlaying: false,
      saved: false
    },
    {
      id: 2,
      category: 'Science Wonders',
      author: 'LabLearner',
      title: 'Grow a Crystal at Home',
      duration: '30 sec',
      likes: '8.2K',
      tags: '#ScienceAtHome #Crystals',
      image: '/assets/app-assets/reel-3-placeholder.jpg',
      video: '',
      isPlaying: false,
      saved: false
    },
    {
      id: 3,
      category: 'Science Wonders',
      author: 'CurioKid',
      title: 'Magnet Tricks You Can Try',
      duration: '25 sec',
      likes: '6K',
      tags: '#Magnets #FunFacts',
      image: '/assets/app-assets/reel-4-placeholder.jpg',
      video: '',
      isPlaying: false,
      saved: false
    },

    // Creative Arts
    {
      id: 4,
      category: 'Creative Arts',
      author: 'ArtWhiz',
      title: 'Painting a Sunset with My Fingers!',
      duration: '60 sec',
      likes: '1K',
      tags: '#LittleArtist #MessyFun',
      image: '/assets/app-assets/reel-2-placeholder.jpg',
      video: '',
      isPlaying: false,
      saved: false
    },
    {
      id: 5,
      category: 'Creative Arts',
      author: 'DoodleStar',
      title: 'Turn Scribbles into Characters',
      duration: '40 sec',
      likes: '4.5K',
      tags: '#Drawing #KidsArt',
      image: '/assets/app-assets/reel-5-placeholder.jpg',
      video: '',
      isPlaying: false,
      saved: false
    },
    {
      id: 6,
      category: 'Creative Arts',
      author: 'CraftyBee',
      title: 'Easy Paper Crafts for Rainy Days',
      duration: '35 sec',
      likes: '3.2K',
      tags: '#Crafts #DIY',
      image: '/assets/app-assets/reel-6-placeholder.jpg',
      video: '',
      isPlaying: false,
      saved: false
    },

    // Comedy & Fun
    {
      id: 7,
      category: 'Comedy & Fun',
      author: 'FunnyBones',
      title: 'Silly Dance Moves to Try',
      duration: '15 sec',
      likes: '12K',
      tags: '#Dance #Silly',
      image: '/assets/app-assets/reel-7-placeholder.jpg',
      video: '',
      isPlaying: false,
      saved: false
    },
    {
      id: 8,
      category: 'Comedy & Fun',
      author: 'GiggleGang',
      title: 'Tiny Pranks (Nice Ones!)',
      duration: '22 sec',
      likes: '5K',
      tags: '#Pranks #GoodVibes',
      image: '/assets/app-assets/reel-8-placeholder.jpg',
      video: '',
      isPlaying: false,
      saved: false
    },
    {
      id: 9,
      category: 'Comedy & Fun',
      author: 'SmileSquad',
      title: 'Funny Face Challenge',
      duration: '18 sec',
      likes: '9K',
      tags: '#Faces #Challenge',
      image: '/assets/app-assets/reel-9-placeholder.jpg',
      video: '',
      isPlaying: false,
      saved: false
    }
  ];

  public categories: string[] = [];
  public slidesByCategory: { [k: string]: any[] } = {};

  @ViewChildren('categorySwiper', { read: ElementRef }) swipers!: QueryList<ElementRef>;
  @ViewChild('categorySwiper', { read: ElementRef, static: true }) categorySwiperRef!: ElementRef;

  constructor(private router: Router) {
    // derive categories from slides
    this.categories = Array.from(new Set(this.slides.map(s => s.category)));
    // build quick lookup to avoid arrow functions in template
    this.categories.forEach(cat => {
      this.slidesByCategory[cat] = this.slides.filter(s => s.category === cat);
    });
  }

  // computed list for template bindings (avoid inline arrow functions inside template)
  get savedSlides(): any[] {
    return Array.isArray(this.slides) ? this.slides.filter(s => !!s && !!s.saved) : [];
  }

  ngAfterViewInit(): void {
    const win = window as any;
    if (win && typeof win.Swiper === 'function') {
      // initialize a Swiper instance for every category container
      this.swipers.forEach((ref: ElementRef) => {
        try {
          new win.Swiper(ref.nativeElement, {
            slidesPerView: 2.2,
            spaceBetween: 12,
            centeredSlides: false
          });
        } catch (e) { /* ignore */ }
      });
    } else {
      console.warn('Swiper bundle not found on window.');
    }
  }

  goBack() {
    // navigate back to previous view; if there's no history, go to home
    if (history.length > 1) {
      history.back();
    } else {
      this.router.navigate(['/home']);
    }
  }

  playAll(category: string) {
    // mark all slides in this category as playing (simple demo action)
    this.slides.forEach(s => s.isPlaying = (s.category === category));
  }

  // Start playback for a single reel (used by the card play button)
  playReel(slide: any, event?: Event) {
    if (event) { event.stopPropagation(); }
    // stop others
    this.slides.forEach(s => s.isPlaying = false);
    slide.isPlaying = true;
    // dispatch expand event for fullscreen handlers
    try {
      const ev = new CustomEvent('openReelExpanded', { detail: slide });
      window.dispatchEvent(ev);
    } catch (e) { /* ignore */ }
    // attempt to scroll the slide into view inside its swiper container
    try {
      const el = this.categorySwiperRef && this.categorySwiperRef.nativeElement as HTMLElement;
      if (el) {
        const slideEls = el.querySelectorAll('.swiper-slide');
        slideEls.forEach((elSlide: any, idx: number) => {
          if (this.slides[idx] && this.slides[idx].id === slide.id) {
            (elSlide as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center' });
          }
        });
      }
    } catch (e) { /* ignore */ }
  }

  stopReel(slide: any, event?: Event) {
    if (event) { event.stopPropagation(); }
    slide.isPlaying = false;
  }

  toggleSave(slide: any, event?: Event) {
    if (event) { event.stopPropagation(); }
    slide.saved = !slide.saved;
  }

  openReel(slide: any, event?: Event) {
    if (event) { event.stopPropagation(); }
    // for now, just toggle the playing state (would open player in full app)
    this.slides.forEach(s => s.isPlaying = false);
    slide.isPlaying = true;
    // dispatch a global event so the expand component can show the fullscreen player
    try {
      const ev = new CustomEvent('openReelExpanded', { detail: slide });
      window.dispatchEvent(ev);
    } catch (e) { /* ignore if CustomEvent is not available */ }
  }
}

