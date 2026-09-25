import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { skip, Subscription } from 'rxjs';

import { EduHubCityService } from '../../../services/eduhub-city.service';
import { PgHostel, PgHostelFilters, PgHostelsService } from '../../../services/pg-hostels.service';
import { EduHubCitySelectorComponent } from '../eduhub-city-selector/eduhub-city-selector.component';
import { PgHostelCardComponent } from './pg-hostel-card.component';

@Component({
  selector: 'app-pg-hostels', standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, EduHubCitySelectorComponent, PgHostelCardComponent],
  template: `
    <ion-content class="page">
      <main>
        <header class="hero">
          <button class="back" type="button" aria-label="Back to EduHub" (click)="back()">←</button>
          <div><h1>PG / Hostels</h1><p>Find a place that feels right for you.</p><eduhub-city-selector></eduhub-city-selector></div>
        </header>

        <section class="filters" aria-label="Filter PG and hostel listings">
          <div class="filter-grid">
            <label>State <input type="text" [(ngModel)]="filters.state" placeholder="e.g. Maharashtra" autocomplete="address-level1"></label>
            <label>Accommodation type <input type="text" [(ngModel)]="filters.accommodationType" placeholder="e.g. PG"></label>
            <label>Suitable for <input type="text" [(ngModel)]="filters.suitableFor" placeholder="e.g. Boys"></label>
            <label>Food <select [(ngModel)]="foodChoice"><option value="">Any</option><option value="true">Available</option><option value="false">Not available</option></select></label>
          </div>
          <div class="filter-actions"><button type="button" (click)="applyFilters()">Apply filters</button><button type="button" class="clear" (click)="clearFilters()">Clear all</button></div>
        </section>

        <section class="results" aria-live="polite">
          <div class="results-heading"><h2>Places to stay</h2><span *ngIf="!loading && !error">{{ total }} results</span></div>
          <p class="state" *ngIf="loading">Loading PG / Hostels…</p>
          <div class="state" *ngIf="!loading && error"><p>{{ error }}</p><button type="button" (click)="load()">Try again</button></div>
          <p class="state" *ngIf="!loading && !error && !items.length">No PG / Hostels match these filters. Try changing the city or clearing a filter.</p>
          <div class="cards" *ngIf="!loading && !error && items.length">
            <app-pg-hostel-card *ngFor="let item of items; trackBy: trackItem" [item]="item" (viewDetails)="openDetails($event)"></app-pg-hostel-card>
          </div>
          <div class="pages" *ngIf="!loading && !error && totalPages > 1">
            <button type="button" [disabled]="page === 0" (click)="changePage(page - 1)">Previous</button>
            <span>Page {{ page + 1 }} of {{ totalPages }}</span>
            <button type="button" [disabled]="page + 1 >= totalPages" (click)="changePage(page + 1)">Next</button>
          </div>
        </section>
      </main>
    </ion-content>`,
  styles: [`
    :host { display:block; } .page { --background:#fff; --padding-bottom:calc(90px + env(safe-area-inset-bottom)); }
    main { max-width:900px; min-height:100%; margin:auto; color:#282527; }
    .hero { display:flex; align-items:flex-start; gap:12px; padding:calc(20px + env(safe-area-inset-top)) 20px 26px; background:linear-gradient(135deg,#dfe8ff,#c0d5f9); }
    .back { flex:none; width:42px; height:42px; border:0; background:#fff; border-radius:50%; color:#173aa5; font-size:26px; cursor:pointer; }
    h1 { margin:0; font-size:27px; line-height:1.2; } .hero p { margin:7px 0 14px; color:#535b71; }
    .filters,.results { margin:18px 16px; } .filters { padding:18px; background:#f5f8ff; border-radius:22px; }
    .filter-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
    label { display:flex; flex-direction:column; gap:5px; color:#34436b; font-size:13px; font-weight:600; }
    input,select { width:100%; min-width:0; box-sizing:border-box; border:1px solid #bcc9eb; border-radius:11px; padding:11px; background:#fff; color:#282527; font:inherit; font-size:15px; }
    .filter-actions { display:flex; gap:10px; margin-top:14px; } button { cursor:pointer; }
    .filter-actions button,.state button,.pages button { border:0; border-radius:12px; padding:11px 16px; background:#2446a8; color:white; font:inherit; font-weight:600; }
    .filter-actions .clear { background:#fff; border:1px solid #2446a8; color:#2446a8; }
    .results-heading { display:flex; justify-content:space-between; align-items:center; gap:8px; } h2 { font-size:21px; margin:10px 0 18px; } .results-heading span { color:#5c6475; }
    .cards { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
    .state { padding:28px; text-align:center; color:#616b7a; } .pages { display:flex; justify-content:center; align-items:center; gap:12px; margin:24px 0; }
    .pages button:disabled { opacity:.45; cursor:default; }
    @media(max-width:700px) { .cards { grid-template-columns:1fr; } }
    @media(max-width:420px) { .filter-grid { grid-template-columns:1fr; } .filters { margin:14px 12px; padding:14px; } .results { margin:14px 12px; } }
  `]
})
export class PgHostelsComponent implements OnInit, OnDestroy {
  filters: PgHostelFilters = {};
  foodChoice = '';
  items: PgHostel[] = [];
  page = 0;
  total = 0;
  totalPages = 0;
  loading = false;
  error = '';
  private request?: Subscription;
  private citySubscription?: Subscription;

  constructor(private api: PgHostelsService, private cities: EduHubCityService,
    private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    const routeCity = String(this.route.snapshot.queryParamMap.get('city') || '').trim();
    if (routeCity) this.cities.selectCity(routeCity);
    this.filters.city = this.cities.city;
    this.citySubscription = this.cities.city$.pipe(skip(1)).subscribe(city => {
      if (this.filters.city === city) return;
      this.filters.city = city;
      this.page = 0;
      this.load();
    });
    this.load();
  }

  ngOnDestroy(): void { this.request?.unsubscribe(); this.citySubscription?.unsubscribe(); }
  back(): void { void this.router.navigateByUrl('/authed/education'); }
  trackItem(_: number, item: PgHostel): number { return item.id; }
  openDetails(item: PgHostel): void { void this.router.navigate(['/authed/education/pg-hostels', item.id]); }
  applyFilters(): void {
    this.filters.foodAvailable = this.foodChoice === '' ? undefined : this.foodChoice === 'true';
    this.page = 0;
    this.load();
  }
  clearFilters(): void {
    this.filters = { city: this.cities.city };
    this.foodChoice = '';
    this.page = 0;
    this.load();
  }
  changePage(page: number): void {
    if (page < 0 || page >= this.totalPages) return;
    this.page = page;
    this.load();
  }
  load(): void {
    this.request?.unsubscribe();
    this.loading = true;
    this.error = '';
    this.request = this.api.list(this.page, 10, this.filters).subscribe({
      next: result => {
        this.items = result.content;
        this.total = result.totalElements;
        this.totalPages = result.totalPages;
        this.loading = false;
      },
      error: () => {
        this.items = [];
        this.loading = false;
        this.error = 'Couldn’t load PG / Hostels. Please try again.';
      }
    });
  }
}
