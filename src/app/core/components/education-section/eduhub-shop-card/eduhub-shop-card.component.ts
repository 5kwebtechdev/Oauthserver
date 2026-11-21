import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ProfileImageComponent } from '../../profile-image/profile-image.component';

export interface EduHubShopCard {
  entityType?: string;
  name: string;
  image: string;
  verified: boolean;
  fullAddress: string;
  unlocked: boolean;
  unlockCost: number;
  likedBySelf: boolean;
}

@Component({
  selector: 'app-eduhub-shop-card',
  standalone: true,
  imports: [CommonModule, ProfileImageComponent],
  templateUrl: './eduhub-shop-card.component.html',
  styleUrls: ['./eduhub-shop-card.component.scss']
})
export class EduHubShopCardComponent {
  @Input() homePreview = false;
  @Input({ required: true }) item!: EduHubShopCard;
  @Input() category = '';
  get sportsShopFallback(): boolean { return !this.homePreview && !this.item.image && /sport/i.test(this.category); }
  get bookstoreFallback(): boolean { return !this.homePreview && !this.item.image && /book/i.test(this.category) && !/second|used|pre.?loved/i.test(this.category); }
  get storeBadgeAsset(): string { return this.sportsShopFallback ? 'assets/sports-shop-header/card/badge.webp' : this.bookstoreFallback ? 'assets/bookstore-header/card/badge.webp' : 'assets/stationery-shop-header/card/badge.webp'; }
  get stationeryInitials(): string {
    return this.item.name.trim().split(/\s+/).filter(word => /[a-z0-9]/i.test(word)).slice(0, 2).map(word => word[0]).join('').toUpperCase();
  }
  get stationeryFallback(): boolean { return !this.homePreview && !this.item.image && /station[ae]ry/i.test(this.category); }

  @Output() viewDetails = new EventEmitter<void>();
  @Output() favourite = new EventEmitter<void>();
  @Output() share = new EventEmitter<void>();
  @Output() directions = new EventEmitter<void>();
  @Output() contact = new EventEmitter<void>();

  openFromKeyboard(event: Event): void {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    this.viewDetails.emit();
  }
}
