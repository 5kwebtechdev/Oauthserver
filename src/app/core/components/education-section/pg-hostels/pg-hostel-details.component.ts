import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Subscription } from 'rxjs';

import { PgHostel, PgHostelsService } from '../../../services/pg-hostels.service';
import { PgHostelCardComponent } from './pg-hostel-card.component';

@Component({
  selector: 'app-pg-hostel-details', standalone: true,
  imports: [CommonModule, IonicModule, PgHostelCardComponent],
  template: `
    <ion-content class="page"><main>
      <button type="button" class="back" (click)="back()">← PG / Hostels</button>
      <p class="state" *ngIf="loading">Loading place details…</p>
      <div class="state" *ngIf="!loading && error"><p>{{ error }}</p><button type="button" (click)="load()">Try again</button></div>
      <ng-container *ngIf="!loading && item as hostel">
        <app-pg-hostel-card [item]="hostel" [showAction]="false"></app-pg-hostel-card>
        <section class="details">
          <h1>{{ hostel.name || hostel.title || 'PG / Hostel' }}</h1>
          <p *ngIf="hostel.description || hostel.bio">{{ hostel.description || hostel.bio }}</p>
          <dl>
            <ng-container *ngIf="hostel.accommodationType"><dt>Accommodation</dt><dd>{{ hostel.accommodationType }}</dd></ng-container>
            <ng-container *ngIf="hostel.suitableFor"><dt>Suitable for</dt><dd>{{ hostel.suitableFor }}</dd></ng-container>
            <ng-container *ngIf="hostel.foodAvailable != null"><dt>Food</dt><dd>{{ hostel.foodAvailable ? 'Available' : 'Not available' }}</dd></ng-container>
            <ng-container *ngIf="hostel.city || hostel.state"><dt>Location</dt><dd>{{ hostel.city }}<span *ngIf="hostel.city && hostel.state">, </span>{{ hostel.state }}</dd></ng-container>
          </dl>
        </section>
      </ng-container>
    </main></ion-content>`,
  styles: [`
    :host { display:block; } .page { --background:#f7f9fe; --padding-bottom:calc(90px + env(safe-area-inset-bottom)); }
    main { max-width:760px; margin:auto; padding:20px 16px; color:#282527; }
    .back { padding:8px 0 20px; background:none; border:0; color:#173aa5; font:inherit; font-weight:700; cursor:pointer; }
    .details { background:#fff; margin-top:16px; padding:22px; border-radius:22px; }
    h1 { margin:0 0 12px; font-size:26px; } p { color:#606471; line-height:1.5; }
    dl { display:grid; grid-template-columns:minmax(110px,1fr) 2fr; gap:12px; margin:20px 0 0; }
    dt { color:#626979; } dd { margin:0; overflow-wrap:anywhere; } a { color:#173aa5; }
    .state { text-align:center; padding:32px; } .state button { border:0; border-radius:12px; padding:10px 18px; background:#2446a8; color:#fff; cursor:pointer; }
  `]
})
export class PgHostelDetailsComponent implements OnInit, OnDestroy {
  item: PgHostel | null = null;
  loading = false;
  error = '';
  private request?: Subscription;
  constructor(private api: PgHostelsService, private route: ActivatedRoute, private router: Router) {}
  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.request?.unsubscribe(); }
  back(): void { void this.router.navigateByUrl('/authed/education/pg-hostels'); }
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
