import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Subscription } from 'rxjs';

import { PgHostel, PgHostelsService } from '../../../services/pg-hostels.service';

@Component({
  selector: 'app-pg-hostel-details', standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './pg-hostel-details.component.html',
  styleUrls: ['./pg-hostel-details.component.scss']
})
export class PgHostelDetailsComponent implements OnInit, OnDestroy {
  // Keep detail content bound to the PG/Hostel response; the Figma listing is illustrative only.
  readonly asset = 'assets/figma/pg-hostels/';
  readonly faqs = [
    { question: "What if I don't like my PG/hostel?", answer: 'Please contact the property directly to ask about visits, cancellation, and refund terms before booking.' },
    { question: 'Is food included in the rent?', answer: 'Check the food availability above and confirm meal charges directly with the property.' },
    { question: 'How do I know if a PG/hostel is good?', answer: 'Review the listing details and amenities, and contact the property to arrange a visit before committing.' },
    { question: 'How do I contact the PG/hostel?', answer: 'Use the contact details on this page when they are available.' }
  ];
  item: PgHostel | null = null;
  loading = false;
  error = '';
  showContact = false;
  openFaq = -1;
  private request?: Subscription;

  constructor(private api: PgHostelsService, private route: ActivatedRoute, private router: Router) {}
  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.request?.unsubscribe(); }
  back(): void { void this.router.navigateByUrl('/authed/education/pg-hostels'); }
  get title(): string { return String(this.item?.name || this.item?.title || 'PG / Hostel'); }
  get image(): string { return this.item?.imageUrls?.[0] || this.item?.imageUrl || this.item?.thumbnailUrl || ''; }
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
    this.request?.unsubscribe();
    this.request = this.api.get(id).subscribe({
      next: item => { this.item = (item as any)?.data ?? item; this.loading = false; },
      error: () => { this.item = null; this.loading = false; this.error = 'Couldn’t load this place. Please try again.'; }
    });
  }
}
