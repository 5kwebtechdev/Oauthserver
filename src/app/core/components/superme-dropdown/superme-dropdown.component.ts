import { Component, ElementRef, HostListener, Input, forwardRef, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NgClass, NgIf, NgFor } from '@angular/common';
import { Platform } from '@ionic/angular';
import { Subscription } from 'rxjs';

export interface SupermeDropdownOption {
  key: string;
  value: string;
  icon?: string;
}

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'superme-dropdown',
  templateUrl: './superme-dropdown.component.html',
  styleUrls: ['./superme-dropdown.component.scss'],
  imports: [
    NgIf,
    NgClass,
    NgFor,
    FormsModule
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SupermeDropdownComponent),
      multi: true
    }
  ]
})
export class SupermeDropdownComponent implements ControlValueAccessor, OnChanges, OnDestroy {
  private static activeDropdown: SupermeDropdownComponent | null = null;

  @Input() label: string = '';
  @Input() options: SupermeDropdownOption[] = [];
  @Input() width: 'fit' | 'medium' | 'full-width' = 'medium';
  @Input() searchable = false;
  @Input() searchPlaceholder = 'Search';
  @Input() disabled = false;
  @Input() ariaLabel = '';
  @Input() chevronAsset = '';
  @Input() searchIconAsset = '';
  @Input() variant: 'default' | 'second-hand-books' = 'default';
  @Input() valueMode: 'option' | 'value' = 'option';
  isOpen: boolean = false;
  selectedOption: SupermeDropdownOption | null = null;
  searchTerm = '';
  menuMaxHeight = '320px';
  private currentValue: SupermeDropdownOption | string | null = null;
  isDisabled = false;
  private backButtonSubscription?: Subscription;
  private onChange: (value: SupermeDropdownOption | string | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(
    private readonly host: ElementRef<HTMLElement>,
    private readonly platform: Platform
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options'] || changes['valueMode']) this.syncSelectedOption();
  }

  ngOnDestroy(): void {
    this.closeDropdown();
  }

  get filteredOptions(): SupermeDropdownOption[] {
    const normalizedSearch = this.normalizeSearch(this.searchTerm);
    if (!normalizedSearch) return this.options;
    return this.options.filter(option => this.normalizeSearch(option.value).includes(normalizedSearch));
  }

  writeValue(value: SupermeDropdownOption | string | null | undefined): void {
    this.currentValue = value ?? null;
    this.syncSelectedOption();
  }

  registerOnChange(fn: (value: SupermeDropdownOption | string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
    if (isDisabled) this.closeDropdown();
  }

  toggleDropdown(): void {
    this.onTouched();
    if (this.disabled || this.isDisabled) return;
    if (this.isOpen) {
      this.closeDropdown();
      return;
    }

    SupermeDropdownComponent.activeDropdown?.closeDropdown();
    SupermeDropdownComponent.activeDropdown = this;
    this.searchTerm = '';
    this.setMenuMaxHeight();
    this.isOpen = true;
    this.bindHardwareBackButton();
  }

  selectOption(option: SupermeDropdownOption): void {
    this.selectedOption = option;
    this.currentValue = this.valueMode === 'value' ? option.value : option;
    this.onChange(this.currentValue);
    this.closeDropdown();
  }

  closeDropdown(): void {
    this.isOpen = false;
    this.searchTerm = '';
    this.backButtonSubscription?.unsubscribe();
    this.backButtonSubscription = undefined;
    if (SupermeDropdownComponent.activeDropdown === this) {
      SupermeDropdownComponent.activeDropdown = null;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isOpen && !this.host.nativeElement.contains(event.target as Node)) {
      this.closeDropdown();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) this.closeDropdown();
  }

  private syncSelectedOption(): void {
    if (!this.currentValue) {
      this.selectedOption = null;
      return;
    }

    if (typeof this.currentValue === 'string') {
      this.selectedOption = this.options.find(option => option.key === this.currentValue || option.value === this.currentValue)
        ?? { key: this.currentValue, value: this.currentValue };
      return;
    }

    const currentOption = this.currentValue as SupermeDropdownOption;
    this.selectedOption = this.options.find(option => option.key === currentOption.key)
      ?? currentOption;
  }

  private setMenuMaxHeight(): void {
    if (typeof window === 'undefined') return;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const triggerBottom = this.host.nativeElement.getBoundingClientRect().bottom;
    const availableBelow = Math.max(160, viewportHeight - triggerBottom - 16);
    this.menuMaxHeight = `${Math.min(320, Math.floor(availableBelow))}px`;
  }

  private normalizeSearch(value: string): string {
    return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  }

  private bindHardwareBackButton(): void {
    if (this.variant !== 'second-hand-books' || this.backButtonSubscription) return;
    this.backButtonSubscription = this.platform.backButton.subscribeWithPriority(99, () => this.closeDropdown());
  }
}
