import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PgHostel } from '../../../services/pg-hostels.service';
import { ProfileImageComponent } from '../../profile-image/profile-image.component';

@Component({
  selector: 'app-pg-hostel-card', standalone: true,
  imports: [CommonModule, ProfileImageComponent],
  template: `
    <article class="hostel-card">
      <app-profile-image class="photo" [src]="image" [name]="title" [alt]="title"></app-profile-image>
      <div class="body">
        <h3>{{ title }}</h3>
        <p class="meta" *ngIf="item.accommodationType || item.suitableFor">{{ item.accommodationType }}<span *ngIf="item.accommodationType && item.suitableFor"> · </span>{{ item.suitableFor }}</p>
        <p class="location" *ngIf="location">{{ location }}</p>
        <p class="food" *ngIf="item.foodAvailable != null">{{ item.foodAvailable ? 'Food available' : 'Food not available' }}</p>
        <div class="footer"><strong>{{ price == null ? 'Pricing on request' : ('₹ ' + (price | number) + ' / Month') }}</strong>
          <button *ngIf="showAction" type="button" (click)="viewDetails.emit(item)">View Details</button></div>
      </div>
    </article>`,
  styles: [`
    :host { display:block; min-width:0; }
    .hostel-card { display:flex; min-width:0; height:100%; gap:14px; padding:14px; border-radius:24px; background:#fff; box-shadow:0 2px 8px #243d771a; color:#282527; box-sizing:border-box; }
    .photo { display:block; width:116px; height:116px; flex:0 0 116px; border-radius:18px; overflow:hidden; background:#edf6fc; }
    .body { display:flex; flex:1; min-width:0; flex-direction:column; }
    h3 { margin:0 0 5px; font-size:17px; font-weight:700; line-height:1.3; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    p { margin:2px 0; color:#62616a; font-size:14px; line-height:1.35; }
    .footer { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:auto; padding-top:10px; }
    .footer strong { color:#173aa5; font-size:14px; }
    button { border:0; border-radius:12px; background:#2446a8; color:white; padding:10px 12px; white-space:nowrap; cursor:pointer; }
    @media(max-width:380px) { .photo { width:86px; height:86px; flex-basis:86px; } .hostel-card { gap:10px; padding:10px; } .footer { align-items:flex-start; flex-direction:column; } }
  `]
})
export class PgHostelCardComponent {
  @Input({ required: true }) item!: PgHostel;
  @Input() showAction = true;
  @Output() viewDetails = new EventEmitter<PgHostel>();
  get title(): string { return String(this.item?.name || this.item?.title || 'PG / Hostel').trim(); }
  get image(): string { return this.item?.imageUrls?.[0] || this.item?.imageUrl || this.item?.thumbnailUrl || ''; }
  get location(): string { return [this.item?.city, this.item?.state].filter(Boolean).join(', ') || String(this.item?.address || '').trim(); }
  get price(): number | null {
    const value = this.item?.monthlyRent ?? this.item?.rent ?? this.item?.price;
    return value == null || !Number.isFinite(Number(value)) ? null : Number(value);
  }
}
