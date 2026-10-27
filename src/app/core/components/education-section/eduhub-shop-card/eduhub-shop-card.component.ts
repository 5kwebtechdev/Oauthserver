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
  @Input({ required: true }) item!: EduHubShopCard;
  @Input() category = '';
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
