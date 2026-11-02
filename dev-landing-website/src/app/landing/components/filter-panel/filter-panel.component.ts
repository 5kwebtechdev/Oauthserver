import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface ApiOption   { optionValue: string; optionLabel: string; displayOrder: number; isActive: boolean; }
interface ApiField    { fieldKey: string; fieldLabel: string; displayOrder: number; isFilterable: boolean; options: ApiOption[]; }
interface ApiCategory { categoryKey: string; categoryName: string; iconUrl: string | null; displayOrder: number; isActive: boolean; fields: ApiField[]; }

const CATEGORY_ICON_URLS: Record<string, string> = {
  SCHOOL:   'assets/filter/Categories-Icons (4).png',
  COLLEGE:  'assets/filter/Categories-Icons (5).png',
  LANGUAGE: 'assets/filter/Categories-Icons (6).png',
  HOBBIES:  'assets/filter/Categories-Icons.png',
  EXAMS:    'assets/filter/Categories-Icons (7).png',
  SPORTS:   'assets/filter/Categories-Icons (8).png',
  OTHERS:   'assets/filter/Categories-Icons (2).png',
};

const VISIBLE_COUNT = 4;

@Component({
  selector: 'app-filter-panel',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './filter-panel.component.html',
})
export class FilterPanelComponent implements OnInit {
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();

  categories: ApiCategory[] = [];
  activeTabKey = '';
  activeFieldKey = '';
  tabStartIndex = 0;
  checkedItems = new Set<string>();

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (environment.apiAuthToken) {
      const token = environment.apiAuthToken.startsWith('Bearer ')
        ? environment.apiAuthToken
        : `Bearer ${environment.apiAuthToken}`;
      headers = headers.set('Authorization', token);
    }

    this.http.get<ApiCategory[]>(`${environment.apiUrl}/tutors/categories`, { headers }).subscribe({
      next: (res) => {
        this.categories = (Array.isArray(res) ? res : [])
          .filter(c => c.isActive)
          .sort((a, b) => a.displayOrder - b.displayOrder);
        if (this.categories.length) {
          this.activeTabKey = this.categories[0].categoryKey;
          this.setDefaultField();
        }
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  get tabs() {
    return this.categories.map(c => ({
      key: c.categoryKey,
      label: c.categoryName,
      iconUrl: c.iconUrl ?? CATEGORY_ICON_URLS[c.categoryKey] ?? null,
    }));
  }

  get visibleTabs() { return this.tabs.slice(this.tabStartIndex, this.tabStartIndex + VISIBLE_COUNT); }
  get canScrollLeft(): boolean { return this.tabStartIndex > 0; }
  get canScrollRight(): boolean { return this.tabStartIndex + VISIBLE_COUNT < this.tabs.length; }

  get activeCategory(): ApiCategory | undefined {
    return this.categories.find(c => c.categoryKey === this.activeTabKey);
  }

  get filterFields(): ApiField[] {
    return (this.activeCategory?.fields ?? [])
      .filter(f => f.isFilterable)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  get currentOptions(): string[] {
    const field = this.filterFields.find(f => f.fieldKey === this.activeFieldKey);
    return (field?.options ?? [])
      .filter(o => o.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(o => o.optionLabel);
  }

  get resultCount(): number {
    return Math.max(5, 150 - this.checkedItems.size * 3);
  }

  scrollTabsLeft(): void {
    if (this.canScrollLeft) { this.tabStartIndex--; this.cdr.markForCheck(); }
  }

  scrollTabsRight(): void {
    if (this.canScrollRight) { this.tabStartIndex++; this.cdr.markForCheck(); }
  }

  selectTab(key: string): void {
    this.activeTabKey = key;
    this.setDefaultField();
    this.cdr.markForCheck();
  }

  selectFilter(key: string): void {
    this.activeFieldKey = key;
    this.cdr.markForCheck();
  }

  private setDefaultField(): void {
    const fields = (this.activeCategory?.fields ?? [])
      .filter(f => f.isFilterable)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    this.activeFieldKey = fields[0]?.fieldKey ?? '';
  }

  private itemKey(option: string): string {
    return `${this.activeTabKey}|${this.activeFieldKey}|${option}`;
  }

  isChecked(option: string): boolean {
    return this.checkedItems.has(this.itemKey(option));
  }

  toggleOption(option: string): void {
    const key = this.itemKey(option);
    if (this.checkedItems.has(key)) { this.checkedItems.delete(key); }
    else { this.checkedItems.add(key); }
    this.cdr.markForCheck();
  }

  clearFilters(): void {
    this.checkedItems.clear();
    this.cdr.markForCheck();
  }

  close(): void { this.closed.emit(); }
}
