import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CategoryService } from '../../../services/category.service';
import { Category } from '../../../models/category.model';

// Inline SVG fallback so a broken thumbnailUrl never leaves an empty box.
const PLACEHOLDER_THUMBNAIL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="140" height="110" viewBox="0 0 140 110">' +
    '<rect width="140" height="110" rx="12" fill="#EFEFEF"/>' +
    '<path d="M50 68l14-16 12 13 10-12 14 15z" fill="#D9D9D9"/>' +
    '<circle cx="55" cy="42" r="8" fill="#D9D9D9"/>' +
    '</svg>'
  );

@Component({
  selector: 'app-masterclass-categories',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './category.component.html',
  styleUrls: ['./category.component.scss']
})
export class CategoryComponent implements OnInit {
  categories: Category[] = [];
  isLoading = false;
  errorMessage: string | null = null;

  readonly placeholderThumbnail = PLACEHOLDER_THUMBNAIL;

  constructor(private categoryService: CategoryService, private router: Router) { }

  ngOnInit(): void {
    this.loadCategories();
  }

  /** Fetches all masterclass categories and tracks loading/error state for the template. */
  loadCategories(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories ?? [];
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err?.message || 'Failed to load categories. Please try again.';
        this.isLoading = false;
      }
    });
  }

  masterclassLabel(category: Category): string {
    return category.courseCount === 1 ? '1 masterclass' : `${category.courseCount} masterclasses`;
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).src = this.placeholderThumbnail;
  }

  onCategoryClick(category: Category): void {
    this.router.navigate(['/masterclass/category', category.id], {
      state: { category }
    });
  }
}
