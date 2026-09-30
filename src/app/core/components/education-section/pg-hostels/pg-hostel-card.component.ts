import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PgHostel } from '../../../services/pg-hostels.service';

@Component({
  selector: 'app-pg-hostel-card', standalone: true,
  imports: [CommonModule],
  template: `
    <article class="hostel-card">
      <div class="card-top">
        <div class="photo"><img *ngIf="image" [src]="image" [alt]="title" loading="lazy"></div>
        <div class="summary">
          <div class="title-line"><h3>{{ title }}</h3><img *ngIf="item.verified || item.isVerified" class="verified" src="assets/figma/pg-hostels/detail-verified2.png" alt="Verified"></div>
          <p *ngIf="item.accommodationType">Type: {{ item.accommodationType }}</p>
          <p *ngIf="item.suitableFor">Suitable for: {{ item.suitableFor }}</p>
        </div>
        <div class="card-actions">
          <span class="favourite" aria-hidden="true"><img src="assets/figma/pg-hostels/detail-favorite.svg" alt=""></span>
          <button type="button" class="share" aria-label="Share PG/Hostel" (click)="shareListing()"><img src="assets/figma/pg-hostels/detail-share.svg" alt=""></button>
        </div>
      </div>
      <div class="card-bottom"><strong>{{ price == null ? 'Price on request' : ('₹ ' + (price | number) + ' onwards') }}</strong>
        <button *ngIf="showAction" type="button" class="details-button" (click)="viewDetails.emit(item)">View Details</button></div>
    </article>`,
  styles: [`
    :host { display:block; min-width:0; }
    .hostel-card { box-sizing:border-box; width:100%; min-width:0; padding:8px; border-radius:24px; background:#fff; box-shadow:0 0 2px 2px rgba(107,101,106,.1); color:#282527; font-family:Nunito,sans-serif; }
    .card-top { display:flex; align-items:flex-start; min-width:0; gap:8px; }
    .photo { width:94px; height:91px; flex:0 0 94px; overflow:hidden; border-radius:16px; background:#979494; }
    .photo img { width:100%; height:100%; object-fit:cover; }
    .summary { flex:1; min-width:0; padding-top:2px; }
    .title-line { display:flex; align-items:center; gap:4px; min-width:0; }
    h3 { min-width:0; margin:0 0 4px; font-size:15px; line-height:1.35; font-weight:700; overflow-wrap:anywhere; }
    .verified { width:16px; height:16px; flex:none; object-fit:contain; }
    p { margin:0 0 2px; color:#6b656a; font-size:13px; font-weight:600; line-height:1.4; overflow-wrap:anywhere; }
    .card-actions { display:flex; flex:none; gap:5px; }
    .favourite,.share { box-sizing:border-box; display:grid; place-items:center; width:32px; height:32px; border:0; border-radius:50%; }
    .favourite { background:#fff; box-shadow:0 0 2px 1px rgba(178,191,242,.5); }
    .share { background:#1432a8; cursor:pointer; }
    .favourite img,.share img { width:18px; height:18px; }
    .card-bottom { display:flex; align-items:center; justify-content:space-between; gap:10px; min-height:54px; margin-top:8px; padding:8px 0 0; border-top:1px solid #d9d6d8; }
    strong { color:#1432a8; font-size:15px; font-weight:700; overflow-wrap:anywhere; }
    .details-button { flex:0 0 auto; min-width:130px; height:37px; padding:0 14px; border:0; border-radius:10px; background:radial-gradient(ellipse at center,#3158a8,#1432a8); box-shadow:inset -1px -1px 1px #b2caf2; color:#fff; font:700 15px Nunito,sans-serif; cursor:pointer; }
    button:focus-visible { outline:3px solid #1432a8; outline-offset:2px; }
    @media(max-width:350px) { .photo { width:78px; flex-basis:78px; } .details-button { min-width:105px; } }
  `]
})
export class PgHostelCardComponent {
  @Input({ required: true }) item!: PgHostel;
  @Input() showAction = true;
  @Output() viewDetails = new EventEmitter<PgHostel>();
  get title(): string { return String(this.item?.name || this.item?.title || 'PG / Hostel').trim(); }
  get image(): string { return this.item?.imageUrls?.[0] || this.item?.imageUrl || this.item?.thumbnailUrl || ''; }
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
