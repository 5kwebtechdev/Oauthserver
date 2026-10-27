import { Component, Input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { NavigationService } from '../../../services/navigation.service';
import { AcademyCategory, AcademyService } from '../../../services/academy.service';
import { AuthService } from '../../../services/auth.service';
import { ProfileStoreService } from '../../../services/profile-store.service';
import { selectedChildAge } from '../../../models/selected-child-age';
import { ChildInfo } from '../../../models/child-info.model';
import { Subject, takeUntil } from 'rxjs';
import { SupermePetComponent } from '../../superme-pet/superme-pet.component';
import { SkeletonImageComponent } from '../../skeleton-image/skeleton-image.component';

interface CategoryCard {
  id: number;
  category: string;
  title: string;
  description: string;
  color: string;
  image: string;
  thumbnail: string;
  courseCount: number;
}

@Component({
  selector: 'app-academy-home',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, SupermePetComponent, SkeletonImageComponent],
  templateUrl: './academy-home.component.html',
  styleUrls: ['./academy-home.component.scss']
})
export class AcademyHomeComponent implements OnDestroy {
  @Input() title: string | undefined;
  @Input() description: string | undefined;

  categoryCards: CategoryCard[] = [];
  isLoadingCategories = false;
  categoryError = '';
  private readonly destroy$ = new Subject<void>();
  private readonly childRequestCancel$ = new Subject<void>();
  private selectedChild: ChildInfo | null = null;

  private readonly cardColors = ['yellow', 'purple', 'pink', 'green'];
  private readonly fallbackImages = [
    'assets/Images-Transparent/Image-Academy-Cat1.webp',
    'assets/Images-Transparent/Image-Academy-Cat2.webp',
    'assets/Images-Transparent/Image-Academy-Cat3.webp',
    'assets/Images-Transparent/Image-Academy-Cat4.webp',
  ];

  constructor(
    private router: Router,
    private academyService: AcademyService,
    private navigation: NavigationService,
    private authService: AuthService,
    private profileStore: ProfileStoreService
  ) { }

  ngOnInit(): void {
    if (this.authService.isParentUser()) {
      this.profileStore.selectionChanged$.pipe(takeUntil(this.destroy$)).subscribe(child => {
        this.childRequestCancel$.next();
        this.selectedChild = child;
        this.categoryCards = [];
        if (child?.id != null) this.loadCategories();
      });
    } else {
      this.loadCategories();
    }
  }

  ngOnDestroy(): void {
    this.childRequestCancel$.next();
    this.childRequestCancel$.complete();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCategories(): void {
    this.isLoadingCategories = true;
    this.categoryError = '';

    const child = this.authService.isParentUser() ? this.selectedChild : null;
    this.academyService.getCategories(
      child ? selectedChildAge(child) : undefined,
      child?.id ?? null
    ).pipe(takeUntil(this.destroy$), takeUntil(this.childRequestCancel$)).subscribe({
      next: (categories) => {
        const activeCategories = (categories || [])
          .filter(category => (category.status || '').toUpperCase() === 'ACTIVE');
        const displayTitleCounts = this.countDisplayTitles(activeCategories);

        this.categoryCards = activeCategories
          .map((category, index) => this.mapCategoryToCard(category, index, displayTitleCounts));
        this.isLoadingCategories = false;
      },
      error: (err) => {
        console.error('Failed to load academy categories', err);
        this.categoryCards = [];
        this.categoryError = 'No active categories available right now.';
        this.isLoadingCategories = false;
      }
    });
  }

  onBackClick(): void {
    this.navigation.back();
  }

  openSubject(card: CategoryCard): void {
    const age = this.authService.isParentUser()
      ? selectedChildAge(this.selectedChild)
      : this.authService.getCurrentUserAge();
    const queryParams: Record<string, string | number> = {
      category: card.category,
      categoryId: card.id,
      title: card.title,
      subtitle: card.description
    };

    if (age) {
      queryParams['age'] = age;
    }

    this.router.navigate(['/authed/academy/subject'], {
      queryParams
    });
  }

  onCategoryImageError(event: Event, card: CategoryCard): void {
    card.thumbnail = card.image;

    const image = event.target as HTMLImageElement | null;
    if (image && image.getAttribute('src') !== card.image) {
      image.src = card.image;
    }
  }

  private mapCategoryToCard(
    category: AcademyCategory,
    index: number,
    displayTitleCounts: Record<string, number>
  ): CategoryCard {
    const fallbackImage = this.fallbackImages[index % this.fallbackImages.length];
    const rawTitle = (category.categoryName || '').trim();
    const formattedTitle = this.formatCategoryTitle(category.categoryName);
    const title = displayTitleCounts[formattedTitle] > 1 && rawTitle !== formattedTitle
      ? rawTitle
      : formattedTitle;

    return {
      id: category.id,
      category: category.categoryName,
      title,
      description: category.description || '',
      color: this.cardColors[index % this.cardColors.length],
      image: fallbackImage,
      thumbnail: this.normalizeImageUrl(category.thumbnailUrl || '', fallbackImage),
      courseCount: category.courseCount || 0,
    };
  }

  private countDisplayTitles(categories: AcademyCategory[]): Record<string, number> {
    return categories.reduce((counts, category) => {
      const title = this.formatCategoryTitle(category.categoryName);
      counts[title] = (counts[title] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  }

  private formatCategoryTitle(categoryName: string): string {
    const title = (categoryName || '').trim().replace(/_/g, ' ');
    const isAllCaps = title === title.toUpperCase();

    if (!isAllCaps) {
      return title;
    }

    return title
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private normalizeImageUrl(url: string, fallback: string): string {
    const trimmedUrl = (url || '').trim();
    if (!trimmedUrl) return fallback;

    if (/^data:image\//i.test(trimmedUrl) || /^https?:\/\//i.test(trimmedUrl)) {
      return trimmedUrl;
    }

    if (trimmedUrl.startsWith('//')) {
      return `https:${trimmedUrl}`;
    }

    if (/^\/?assets\//i.test(trimmedUrl)) {
      return trimmedUrl.startsWith('/') ? trimmedUrl : `/${trimmedUrl}`;
    }

    return `/${trimmedUrl.replace(/^\/+/, '')}`;
  }
}
