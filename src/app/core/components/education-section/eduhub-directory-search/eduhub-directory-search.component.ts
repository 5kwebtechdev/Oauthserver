import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, TemplateRef, OnChanges, OnDestroy, AfterViewInit } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { Platform } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { sessionStorageAdapter as localStorage } from '../../../storage/session-storage';
import { showSheetInFrame } from '../counselor-design/shared/sheet-dialog';

@Component({ selector: 'app-eduhub-directory-search', standalone: true, imports: [CommonModule], templateUrl: './eduhub-directory-search.component.html', styleUrl: './eduhub-directory-search.component.scss' })
export class EduHubDirectorySearchComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() open = false;
  @Input() label = 'listings';
  @Input() terms: string[] = [];
  @Input() busy = false;
  @Input() filters: TemplateRef<unknown> | null = null;
  @Input() locationLabel = '';
  @Input() filtersOpen = false;
  @Output() dismissFilters = new EventEmitter<void>();
  @Input() resultCount = 0;
  @Input() results!: TemplateRef<unknown>;
  @Output() dismissed = new EventEmitter<void>();
  @Output() searched = new EventEmitter<string>();
  @ViewChild('sheet', { static: true }) sheet!: ElementRef<HTMLDialogElement>;
  @ViewChild('field') field?: ElementRef<HTMLInputElement>;
  query = '';
  submitted: string | null = null;
  recents: string[] = [];
  private ready = false;
  private back?: Subscription;
  private navigation: Subscription;
  constructor(private host: ElementRef<HTMLElement>, private platform: Platform, router: Router) {
    this.navigation = router.events.subscribe(event => { if (event instanceof NavigationStart && this.open) this.dismiss(); });
  }
  get suggestions(): string[] { return [...new Set(this.terms)].filter(term => term.toLowerCase().includes(this.query.trim().toLowerCase())).slice(0, 6); }
  get popular(): string[] { return [...new Set(this.terms)].slice(0, 6); }
  private get storageKey(): string { return `superme_eduhub_search_${this.label}`; }
  ngAfterViewInit(): void { this.ready = true; this.sync(); }
  ngOnChanges(): void { if (this.ready) this.sync(); }
  private sync(): void {
    if (this.open && !this.sheet.nativeElement.open) {
      this.query = ''; this.submitted = null;
      try { const values = JSON.parse(localStorage.getItem(this.storageKey) || '[]'); this.recents = Array.isArray(values) ? values.filter(value => typeof value === 'string').slice(0,6) : []; } catch { this.recents = []; }
      const frame = this.host.nativeElement.closest<HTMLElement>('ion-content') || document.documentElement;
      showSheetInFrame(this.sheet.nativeElement, frame);
      this.back = this.platform.backButton.subscribeWithPriority(200, () => this.handleBack());
      setTimeout(() => {
        if (this.sheet.nativeElement.open) this.field?.nativeElement.focus();
      }, 0);
    } else if (!this.open) {
      this.closeSheet();
    }
  }
  type(value: string): void { this.query = value; this.submitted = null; }
  submit(term: string, event?: Event): void {
    event?.preventDefault(); const value = term.trim();
    this.query = value; this.submitted = value;
    if (value) { this.recents = [value, ...this.recents.filter(item => item !== value)].slice(0,6); try { localStorage.setItem(this.storageKey, JSON.stringify(this.recents)); } catch {} }
    this.field?.nativeElement.blur();
    if (Capacitor.isNativePlatform()) void Keyboard.hide().catch(() => {});
    this.searched.emit(value);
  }
  clearRecents(): void { this.recents = []; try { localStorage.removeItem(this.storageKey); } catch {} }
  dismiss(): void {
    this.closeSheet();
    this.dismissed.emit();
  }

  private closeSheet(): void {
    // Release the document's modal state before Ionic can cache this page.
    const sheet = this.sheet?.nativeElement;
    sheet?.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach(dialog => dialog.close());
    sheet?.close();
    this.back?.unsubscribe();
  }

  private handleBack(): void {
    const nested = this.sheet.nativeElement.querySelector<HTMLDialogElement>('dialog:modal');
    if (nested) {
      if (nested.dispatchEvent(new Event('cancel', { cancelable: true }))) nested.close();
    } else if (this.filtersOpen) {
      this.dismissFilters.emit();
    } else {
      this.dismiss();
    }
  }

  cancel(event: Event): void { event.preventDefault(); this.dismiss(); }
  ngOnDestroy(): void { this.closeSheet(); this.navigation.unsubscribe(); }
}
