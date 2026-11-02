import { Component, OnDestroy, OnInit } from '@angular/core';
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FooterComponent } from '../../../components/footer/footer.component';
import { AdSliderComponent } from '../../../components/ad-slider/ad-slider.component';

interface CategoryCard {
  title: string;
  image: string;
  isComingSoon?: boolean;
  route?: string;
}

interface BannerSlide {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  ctaLabel: string;
  ctaRoute?: string;
  accent: string;
  stats: { value: string; label: string }[];
}

@Component({
  selector: 'app-tutor-category',
  standalone: true,
  imports: [CommonModule, PublicNavbarComponent, FooterComponent, AdSliderComponent],
  templateUrl: './tutor-category.component.html',
  styleUrls: ['./tutor-category.component.scss']
})
export class TutorCategoryComponent implements OnInit, OnDestroy {
  // Banner carousel data
  currentBannerIndex = 0;
  private bannerTimer?: ReturnType<typeof setInterval>;
  banners: BannerSlide[] = [
    {
      image: 'https://cdnai.iconscout.com/ai-image/premium/thumb/ai-online-tutor-3d-illustration-png-download-jpg-13174358.png',
      alt: '3D online tutor illustration',
      eyebrow: 'Personal learning support',
      title: 'Find the right tutor for every curiosity',
      description: 'Explore trusted tutors, flexible timings, and subjects that match how your child learns best.',
      ctaLabel: 'Find Tutors',
      ctaRoute: '/home/tutors',
      accent: 'rose',
      stats: [
        { value: '1:1', label: 'learning' },
        { value: 'Online', label: 'or nearby' }
      ]
    },
    {
      image: 'https://cdnai.iconscout.com/ai-image/premium/thumb/ai-online-learning-3d-icon-png-download-jpg-13915358.png',
      alt: '3D online learning illustration',
      eyebrow: 'Coming soon',
      title: 'Discover academies built around real skills',
      description: 'Compare programs for academics, hobbies, languages, exams, and more from one simple hub.',
      ctaLabel: 'Coming Soon',
      accent: 'blue',
      stats: [
        { value: 'Skills', label: 'and classes' },
        { value: 'Curated', label: 'choices' }
      ]
    },
    {
      image: 'assets/Icons-Neutral/Book-Store.png',
      alt: 'Book store illustration',
      eyebrow: 'Essentials hub',
      title: 'Books and supplies, ready when school needs them',
      description: 'A calmer way to keep track of school essentials, learning materials, and everyday stationery.',
      ctaLabel: 'Explore Essentials',
      accent: 'green',
      stats: [
        { value: 'Books', label: 'made easy' },
        { value: 'Supplies', label: 'in one place' }
      ]
    }
  ];

  ngOnInit(): void {
    this.startBannerAutoplay();
  }

  ngOnDestroy(): void {
    this.stopBannerAutoplay();
  }

  // Category cards
  categories: CategoryCard[] = [
    {
      title: 'Find Tutors',
      image: 'assets/Icons-Neutral/Find-tutor.png',
      route: '/home/tutors'
    },
    {
      title: 'Academies',
      image: 'assets/Icons-Neutral/Category-Academies.png',
      route: '/home/academies',
      isComingSoon: true
    },
    {
      title: 'Book Stores',
      image: 'assets/Icons-Neutral/Book-Store.png',
      isComingSoon: true
    },
    {
      title: 'Stationery Store',
      image: 'assets/Icons-Neutral/Stationery-Store.png',
      isComingSoon: true
    }
  ];

  constructor(private router: Router) {}

  goBack(): void {
    // Prefer a regular history back when the user has navigation history.
    // Fall back to navigating to the home route if there is no previous entry.
    try {
      if (window.history && window.history.length > 1) {
        window.history.back();
        return;
      }
    } catch (e) {
      // ignore and fall through to router navigation
    }

    this.router.navigate(['/home']);
  }

  onCategoryClick(category: CategoryCard): void {
    if (!category.isComingSoon && category.route) {
      this.router.navigate([category.route]);
    }
  }

  // Banner carousel methods
  nextBanner(): void {
    this.currentBannerIndex = (this.currentBannerIndex + 1) % this.banners.length;
  }

  prevBanner(): void {
    this.currentBannerIndex = this.currentBannerIndex === 0 
      ? this.banners.length - 1 
      : this.currentBannerIndex - 1;
  }

  goToBanner(index: number): void {
    this.currentBannerIndex = index;
    this.startBannerAutoplay();
  }

  onBannerCta(slide: BannerSlide): void {
    if (slide.ctaRoute) {
      this.router.navigate([slide.ctaRoute]);
    }
  }

  private startBannerAutoplay(): void {
    this.stopBannerAutoplay();

    if (this.banners.length <= 1) {
      return;
    }

    this.bannerTimer = setInterval(() => this.nextBanner(), 4500);
  }

  private stopBannerAutoplay(): void {
    if (this.bannerTimer) {
      clearInterval(this.bannerTimer);
      this.bannerTimer = undefined;
    }
  }
}
