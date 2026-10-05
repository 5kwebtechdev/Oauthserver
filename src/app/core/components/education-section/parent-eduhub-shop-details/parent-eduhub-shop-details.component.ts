import { CommonModule, Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { FooterComponent } from '../../footer/footer.component';
import { ProfileImageComponent } from '../../profile-image/profile-image.component';
import { EduHubEventsService } from '../../../services/eduhub-events.service';
import { CustomToastService } from '../../../services/custom-toast.service';
import { ProfileFactsComponent } from '../../user-profile/profile-facts/profile-facts.component';
import { EDUHUB_FAQS } from '../eduhub-faqs';

interface ShopListing {
  id: number;
  name: string;
  publicLocation: string;
  fullAddress: string;
  phone: string;
  email: string;
  image: string;
  verified: boolean;
  unlockCost: number;
  unlocked: boolean;
}

@Component({
  selector: 'app-parent-eduhub-shop-details',
  standalone: true,
  imports: [CommonModule, IonicModule, FooterComponent, ProfileImageComponent, ProfileFactsComponent],
  templateUrl: './parent-eduhub-shop-details.component.html',
  styleUrls: ['./parent-eduhub-shop-details.component.scss']
})
export class ParentEduHubShopDetailsComponent implements OnInit {
  listing: ShopListing | null = null;
  categoryLabel = 'Shop';
  unlockInProgress = false;
  imageFullscreen = false;

  get shopFaqs() {
    const category = this.categoryLabel.toLowerCase();
    return /station(?:e|ar)y/.test(category) ? EDUHUB_FAQS['stationeryShop']
      : /book/.test(category) ? EDUHUB_FAQS['bookStore'] : [];
  }

  constructor(private readonly route: ActivatedRoute, private readonly location: Location, private readonly eventsService: EduHubEventsService, private readonly toastService: CustomToastService) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const candidate = history.state?.listing as ShopListing | undefined;
    const stored = this.readStoredListing(id);
    const resolved = candidate && Number(candidate.id) === id ? candidate : stored;
    if (resolved) {
      this.listing = resolved;
      this.categoryLabel = String(history.state?.categoryLabel || 'Shop');
    }
  }

  goBack(): void { this.location.back(); }

  openProfileImage(): void {
    const image = String(this.listing?.image || '');
    const isCategoryArtwork = /(?:category-book|book-store|Image-Book|category-station|station(?:e|ar)y|category-sports|sports-shop|Image-Sports)/i.test(image);
    if (image && !isCategoryArtwork) {
      this.imageFullscreen = true;
      return;
    }
    this.toastService.show('No profile picture available for this shop.', 'info');
  }

  closeProfileImage(): void { this.imageFullscreen = false; }

  unlockListing(): void {
    if (!this.listing || this.unlockInProgress || this.listing.unlocked) return;
    this.unlockInProgress = true;
    this.eventsService.unlockContact(this.listing.id).subscribe({
      next: response => {
        const data = (response as any)?.data?.listing ?? (response as any)?.listing ?? response;
        this.listing = { ...this.listing!, ...data, unlocked: true };
        this.unlockInProgress = false;
        const unlockedListing = this.listing!;
        try { sessionStorage.setItem(`superme_eduhub_shop_${unlockedListing.id}`, JSON.stringify(unlockedListing)); } catch { /* ignore storage errors */ }
      },
      error: () => { this.unlockInProgress = false; }
    });
  }

  private readStoredListing(id: number): ShopListing | null {
    if (!Number.isFinite(id)) return null;
    try {
      const value = sessionStorage.getItem(`superme_eduhub_shop_${id}`);
      return value ? JSON.parse(value) as ShopListing : null;
    } catch {
      return null;
    }
  }
}
