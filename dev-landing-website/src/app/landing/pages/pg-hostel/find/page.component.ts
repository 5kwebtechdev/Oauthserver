import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { LandingNavbarComponent } from '../../../components/navbar/navbar.component';
import { EduhubInitialsComponent } from '../../../components/eduhub-initials/eduhub-initials.component';

import { PgHostelPublicService } from '../../../../core/services/pg-hostel-public.service';

import {
  PgHostelListing,
  PgHostelSuitableFor,
  PgHostelAccommodationType,
} from '../../../../core/models/pg-hostel.model';

@Component({
  selector: 'app-pg-hostel-find-page',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LandingNavbarComponent,
    EduhubInitialsComponent,
  ],

  templateUrl: './page.component.html',
  styleUrls: ['./page.component.scss'],
})
export class PgHostelFindPageComponent implements OnInit {

  readonly suitableForOptions: PgHostelSuitableFor[] = [
    'Boys',
    'Girls',
    'Co-ed',
  ];

  readonly typeOptions: PgHostelAccommodationType[] = [
    'PG',
    'Hostel',
  ];

  listings: PgHostelListing[] = [];

  page = 0;
  pageSize = 10;

  totalPages = 1;
  totalElements = 0;

  loading = false;
  error = '';

  search = '';

  // Manual inputs — no static state/city file required.
  state = '';
  city = '';

  accommodationType: PgHostelAccommodationType | '' = '';

  suitableFor: PgHostelSuitableFor | '' = '';

  food = '';

  selected: PgHostelListing | null = null;
  private readonly failedImages = new WeakMap<PgHostelListing, Set<string>>();

  constructor(
    public pgHostelService: PgHostelPublicService,
  ) {}

  ngOnInit(): void {
    this.load(0);
  }

  load(page: number): void {

    this.loading = true;
    this.error = '';

    const foodAvailable =
      this.food === 'Yes'
        ? true
        : this.food === 'No'
          ? false
          : null;

    this.pgHostelService
      .list(
        page,
        this.pageSize,
        {
          search: this.search.trim(),
          state: this.state.trim(),
          city: this.city.trim(),
          accommodationType:
            this.accommodationType,
          suitableFor:
            this.suitableFor,
          foodAvailable,
        },
      )
      .subscribe({

        next: response => {

          this.listings =
            response.content || [];

          this.page =
            response.page ?? page;

          this.pageSize =
            response.size ?? this.pageSize;

          this.totalPages =
            Math.max(
              response.totalPages || 1,
              1,
            );

          this.totalElements =
            response.totalElements || 0;

          this.loading = false;
        },

        error: err => {

          console.error(
            'PG/Hostel directory error',
            err,
          );

          this.error =
            'Unable to load PG/Hostel listings right now.';

          this.loading = false;
        },
      });
  }

  applyFilters(): void {
    this.load(0);
  }

  reset(): void {

    this.search = '';

    this.state = '';
    this.city = '';

    this.accommodationType = '';
    this.suitableFor = '';

    this.food = '';

    this.load(0);
  }

  openDetails(
    item: PgHostelListing,
  ): void {

    this.selected = item;

    document.body.style.overflow =
      'hidden';
  }

  closeDetails(): void {

    this.selected = null;

    document.body.style.overflow = '';
  }

  image(
    item: PgHostelListing,
  ): string {
    const failed = this.failedImages.get(item);
    const first = item.imageUrls?.find(value =>
      typeof value === 'string' && value.trim() && !failed?.has(value.trim())
    );
    return first ? this.pgHostelService.imageUrl(first.trim()) : '';
  }

  onImageError(item: PgHostelListing): void {
    const failedUrl = item.imageUrls?.find(value =>
      typeof value === 'string' && value.trim() && !this.failedImages.get(item)?.has(value.trim())
    )?.trim();
    if (!failedUrl) return;
    const failed = this.failedImages.get(item) ?? new Set<string>();
    failed.add(failedUrl);
    this.failedImages.set(item, failed);
  }

  previous(): void {

    if (this.page > 0) {
      this.load(
        this.page - 1,
      );
    }
  }

  next(): void {

    if (
      this.page + 1
      < this.totalPages
    ) {

      this.load(
        this.page + 1,
      );
    }
  }
}
