import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Subscription } from 'rxjs';

import { PgHostel, PgHostelsService } from '../../../services/pg-hostels.service';
import { ProfileImageComponent } from '../../profile-image/profile-image.component';
import { EDUHUB_FAQS } from '../eduhub-faqs';

@Component({
  selector: 'app-pg-hostel-details', standalone: true,
  imports: [CommonModule, IonicModule, ProfileImageComponent],
  templateUrl: './pg-hostel-details.component.html',
  styleUrls: ['./pg-hostel-details.component.scss']
})
export class PgHostelDetailsComponent implements OnInit, OnDestroy {
  // Keep detail content bound to the PG/Hostel response; the Figma listing is illustrative only.
  readonly asset = 'assets/figma/pg-hostels/';
  readonly faqs = EDUHUB_FAQS['pgHostels'];
  item: PgHostel | null = null;
  loading = false;
  error = '';
  showContact = false;
  openFaq = -1;
  private request?: Subscription;
  private readonly failedImages = new Set<string>();

  constructor(private api: PgHostelsService, private route: ActivatedRoute, private router: Router) {}
  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.request?.unsubscribe(); }
  back(): void { void this.router.navigateByUrl('/authed/education/pg-hostels'); }
  get title(): string { return String(this.item?.name || this.item?.title || 'PG / Hostel'); }
  get image(): string { return this.api.imageCandidates(this.item).find(url => !this.failedImages.has(url)) ?? ''; }
  onImageError(): void { this.failedImages.add(this.image); }
  get location(): string { return [this.item?.city, this.item?.state].filter(Boolean).join(', '); }
  get occupancy(): string { const value = this.item?.roomOccupancy; return Array.isArray(value) ? value.join(', ') : String(value || ''); }
  get amenities(): string { const value = this.item?.amenities; return Array.isArray(value) ? value.join(', ') : String(value || ''); }
  get price(): number | null {
    const value = this.item?.monthlyRent ?? this.item?.rent ?? this.item?.price;
    return value == null || !Number.isFinite(Number(value)) ? null : Number(value);
  }
  get hasContact(): boolean { return !!(this.item?.address || this.item?.phone || this.item?.email); }
  async share(): Promise<void> {
    if (!this.item) return;
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: this.title, url });
      else await navigator.clipboard.writeText(url);
    } catch { /* Dismissing the native share dialog leaves the detail view unchanged. */ }
  }
  load(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id <= 0) { this.error = 'This listing could not be found.'; return; }
    this.loading = true;
    this.error = '';
    this.failedImages.clear();
    this.request?.unsubscribe();
    this.request = this.api.get(id).subscribe({
      next: item => { this.item = (item as any)?.data ?? item; this.loading = false; },
      error: () => { this.item = null; this.loading = false; this.error = 'Couldn’t load this place. Please try again.'; }
    });
  }
}
