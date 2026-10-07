import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { EMPTY, expand, map, skip, Subscription, toArray } from 'rxjs';

import { EduHubCityService } from '../../../services/eduhub-city.service';
import { PgHostel, PgHostelFilters, PgHostelsService } from '../../../services/pg-hostels.service';
import { EduHubCitySelectorComponent } from '../eduhub-city-selector/eduhub-city-selector.component';
import { PgHostelCardComponent } from './pg-hostel-card.component';

type FilterCategory = 'suitable' | 'type' | 'occupancy' | 'amenities' | 'cost';

@Component({
  selector: 'app-pg-hostels', standalone: true,
  imports: [CommonModule, IonicModule, EduHubCitySelectorComponent, PgHostelCardComponent],
  templateUrl: './pg-hostels.component.html',
  styleUrls: ['./pg-hostels.component.scss']
})
export class PgHostelsComponent implements OnInit, OnDestroy {
  readonly asset = 'assets/figma/pg-hostels/';
  readonly categories: { key: FilterCategory; label: string; icon: string }[] = [
    { key: 'suitable', label: 'Suitable for', icon: 'filter-user.svg' },
    { key: 'type', label: 'Type', icon: 'filter-grid2-x2.svg' },
    { key: 'occupancy', label: 'Room occupancy', icon: 'filter-bed.svg' },
    { key: 'amenities', label: 'Amenities', icon: 'filter-settings.svg' },
    { key: 'cost', label: 'Cost', icon: 'filter-indian-rupee.svg' }
  ];
  readonly options: Record<FilterCategory, string[]> = {
    suitable: ['Boys', 'Girls', 'Co ed'],
    type: ['PG', 'Hostel'],
    occupancy: ['Single', 'Double', 'Triple'],
    amenities: ['Wi-Fi', 'AC', 'Power backup', 'Washing machine', 'Laundry', 'CCTV', 'Parking', 'Housekeeping', 'Attached bathroom', 'Geyser', 'Study table', 'Wardrobe'],
    cost: ['₹0–₹1,000', '₹1,000–₹5,000', '₹5,000+']
  };
  filters: PgHostelFilters = {};
  selected: Record<FilterCategory, string[]> = { suitable: [], type: [], occupancy: [], amenities: [], cost: [] };
  draft: Record<FilterCategory, string[]> = { suitable: [], type: [], occupancy: [], amenities: [], cost: [] };
  activeCategory: FilterCategory = 'suitable';
  sheetOpen = false;
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
    this.filters = this.cities.filter;
    this.citySubscription = this.cities.location$.pipe(skip(1)).subscribe(() => {
      this.filters = { ...this.filters, city: this.cities.city || undefined, state: this.cities.state || undefined };
      this.page = 0;
      this.load();
    });
    this.load();
  }

  ngOnDestroy(): void { this.request?.unsubscribe(); this.citySubscription?.unsubscribe(); }
  @HostListener('document:keydown.escape') onEscape(): void { this.closeFilters(); }
  back(): void { void this.router.navigateByUrl('/authed/education'); }
  trackItem(_: number, item: PgHostel): number { return item.id; }
  openDetails(item: PgHostel): void { void this.router.navigate(['/authed/education/pg-hostels', item.id]); }

  openFilters(): void {
    this.draft = this.copySelection(this.selected);
    this.activeCategory = 'suitable';
    this.sheetOpen = true;
  }
  closeFilters(): void { this.sheetOpen = false; }
  isSelected(option: string): boolean { return this.draft[this.activeCategory].includes(option); }
  toggleOption(option: string): void {
    const values = this.draft[this.activeCategory];
    this.draft[this.activeCategory] = values.includes(option) ? values.filter(value => value !== option) : [...values, option];
  }
  applyFilters(): void {
    this.selected = this.copySelection(this.draft);
    this.filters = this.cities.filter;
    this.page = 0;
    this.closeFilters();
    this.load();
  }
  clearFilters(): void {
    this.draft = this.emptySelection();
    this.selected = this.emptySelection();
    this.filters = this.cities.filter;
    this.page = 0;
    this.load();
  }
  get hasActiveFilters(): boolean { return Object.values(this.selected).some(values => values.length > 0); }
  changePage(page: number): void {
    if (page < 0 || page >= this.totalPages) return;
    this.page = page;
    this.load();
  }

  load(): void {
    this.request?.unsubscribe();
    this.loading = true;
    this.error = '';
    if (this.hasActiveFilters) {
      // The existing endpoint only accepts city/type/suitable/food. Fetch its pages
      // without new API parameters so the Figma's multi-select filters are complete.
      const base = this.cities.filter;
      this.request = this.api.list(0, 50, base).pipe(
        expand((result, index) => index + 1 < result.totalPages ? this.api.list(index + 1, 50, base) : EMPTY),
        toArray(),
        map(pages => pages.reduce((items: PgHostel[], result) => items.concat(result.content), []).filter(item => this.matches(item)))
      ).subscribe({
        next: matches => {
          this.total = matches.length;
          this.totalPages = Math.ceil(matches.length / 10);
          this.items = matches.slice(this.page * 10, (this.page + 1) * 10);
          this.loading = false;
        },
        error: () => this.loadFailed()
      });
      return;
    }
    this.request = this.api.list(this.page, 10, this.filters).subscribe({
      next: result => {
        this.items = result.content;
        this.total = result.totalElements;
        this.totalPages = result.totalPages;
        this.loading = false;
      },
      error: () => this.loadFailed()
    });
  }

  private matches(item: PgHostel): boolean {
    const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
    const contains = (selected: string[], value: string) => !selected.length || selected.some(option => normalize(value).includes(normalize(option)));
    if (!contains(this.selected.suitable, String(item.suitableFor || ''))) return false;
    if (!contains(this.selected.type, String(item.accommodationType || ''))) return false;
    const occupancy = Array.isArray(item.roomOccupancy) ? item.roomOccupancy.join(', ') : String(item.roomOccupancy || '');
    if (!contains(this.selected.occupancy, occupancy)) return false;
    const amenities = Array.isArray(item.amenities) ? item.amenities.join(', ') : String(item.amenities || '');
    if (this.selected.amenities.length && !this.selected.amenities.every(option => normalize(amenities).includes(normalize(option)))) return false;
    if (this.selected.cost.length) {
      const rawPrice = item.monthlyRent ?? item.rent ?? item.price;
      if (rawPrice == null) return false;
      const price = Number(rawPrice);
      if (!Number.isFinite(price)) return false;
      if (!this.selected.cost.some(option => option === '₹0–₹1,000' ? price <= 1000 : option === '₹1,000–₹5,000' ? price > 1000 && price <= 5000 : price > 5000)) return false;
    }
    return true;
  }
  private loadFailed(): void { this.items = []; this.loading = false; this.error = 'Couldn’t load PG / Hostels. Please try again.'; }
  private emptySelection(): Record<FilterCategory, string[]> { return { suitable: [], type: [], occupancy: [], amenities: [], cost: [] }; }
  private copySelection(value: Record<FilterCategory, string[]>): Record<FilterCategory, string[]> {
    return { suitable: [...value.suitable], type: [...value.type], occupancy: [...value.occupancy], amenities: [...value.amenities], cost: [...value.cost] };
  }
}
