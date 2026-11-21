import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PgHostel, PgHostelsService } from '../../../services/pg-hostels.service';
import { ProfileImageComponent } from '../../profile-image/profile-image.component';

@Component({
  selector: 'app-pg-hostel-card', standalone: true,
  imports: [CommonModule, ProfileImageComponent],
  template: `<article class="education-listing" [class.education-listing--home]="homePreview">
<button type="button" class="education-listing__profile" (click)="viewDetails.emit(item)" [attr.aria-label]="'View '+title">
<span class="education-listing__photo education-listing__photo--tall"><img *ngIf="image; else initials" [src]="image" [alt]="title" loading="lazy" (error)="onImageError()"><ng-template #initials><span *ngIf="!homePreview" class="hostel-initials"><img src="assets/hostel-header/card/badge.webp" alt=""><span>{{listingInitials}}</span></span><app-profile-image *ngIf="homePreview" fallbackCategory="hostel" [name]="title"></app-profile-image></ng-template></span>
<span class="education-listing__body"><span class="education-listing__name"><strong>{{title}}</strong><span *ngIf="item.verified || item.isVerified" class="education-listing__verified"><img src="assets/figma/eduhub-cards/verified.png" alt="Verified"></span></span><span class="education-listing__fields"><span class="education-listing__field"><span class="education-listing__icon"><span><img src="assets/figma/eduhub-cards/home.svg" alt=""></span></span><span class="education-listing__field-text"><span class="education-listing__label">Suitable for &amp; Type</span><span class="education-listing__value">{{item.suitableFor || 'Not specified'}} · {{item.accommodationType || 'PG / Hostel'}}</span></span></span><span class="education-listing__field education-listing__field--secondary"><span class="education-listing__icon"><span><img src="assets/figma/eduhub-cards/location-amber.svg" alt=""></span></span><span class="education-listing__field-text"><span class="education-listing__label">Address</span><span class="education-listing__value">{{item.address || [item.city, item.state].join(' ') || 'Address unavailable'}}</span></span></span></span></span></button>
<div class="education-listing__footer"><button type="button" class="education-listing__fee" (click)="viewDetails.emit(item)">{{price == null ? 'Price on request' : ('₹ '+(price | number)+'/onwards')}}</button><span *ngIf="item.foodAvailable != null" class="education-listing__mode"><img src="assets/figma/eduhub-cards/food.svg" alt="">{{item.foodAvailable ? 'Food included' : 'No food'}}</span><span class="education-listing__like"><img src="assets/figma/eduhub-cards/heart.svg" alt="Likes">{{item.likesCount || 0}}</span><button *ngIf="!homePreview" type="button" class="education-listing__share" aria-label="Share PG/Hostel" (click)="shareListing()"><img src="assets/figma/parent-eduhub-inner/share.svg" alt=""></button></div></article>`,
  styleUrls: ['./pg-hostel-card.component.scss']
})
export class PgHostelCardComponent {
  @Input({ required: true }) item!: PgHostel;
  @Input() homePreview = false;
  @Input() showAction = true;
  @Output() viewDetails = new EventEmitter<PgHostel>();
  private readonly failedImages = new WeakMap<PgHostel, Set<string>>();
  constructor(private readonly pgHostels: PgHostelsService) {}
  get listingInitials(): string { return this.title.split(/\s+/).slice(0,2).map(word => word[0]).join('').toUpperCase(); }
  get title(): string { return String(this.item?.name || this.item?.title || 'PG / Hostel').trim(); }
  get image(): string {
    return this.pgHostels.imageCandidates(this.item).find(url => !this.failedImages.get(this.item)?.has(url)) ?? '';
  }
  onImageError(): void {
    const failed = this.failedImages.get(this.item) ?? new Set<string>();
    failed.add(this.image);
    this.failedImages.set(this.item, failed);
  }
  get price(): number | null {
    const value = this.item?.monthlyRent ?? this.item?.rent ?? this.item?.price;
    return value == null || !Number.isFinite(Number(value)) ? null : Number(value);
  }
  async shareListing(): Promise<void> {
    const url = new URL(`/authed/education/pg-hostels/${this.item.id}`, window.location.origin).href;
    try {
      if (navigator.share) await navigator.share({ title: this.title, url });
      else await navigator.clipboard.writeText(url);
    } catch { /* A dismissed share dialog does not change the card. */ }
  }
}
