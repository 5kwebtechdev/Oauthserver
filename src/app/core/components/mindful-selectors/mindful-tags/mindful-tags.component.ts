import { Component, Input, Output, EventEmitter, ElementRef, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormGroup, FormControl, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MindfulBadgeComponent } from '../../mindful-badge/mindful-badge.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { MindfulPopupComponent } from '../../mindful-popup/mindful-popup.component';
import { LongPressDirective } from '../../../directives/gestureControlDirective';

@Component({
  standalone: true,
  selector: 'mindful-tags',
  templateUrl: './mindful-tags.component.html',
  styleUrls: ['./mindful-tags.component.scss'],
  imports: [CommonModule, FormsModule, MindfulBadgeComponent, MindfulButtonComponent, MindfulPopupComponent, LongPressDirective]
})
export class MindfulTagsComponent implements OnInit, OnDestroy {
  @ViewChild('tagInput') tagInputRef?: ElementRef<HTMLInputElement>;

  @Input() options: { key: any; value: string; type?: string }[] = [];
  @Input() formGroup?: FormGroup;
  @Input() formControlName?: string;
  @Input() size: 'small' | 'medium' | 'large' = 'small';
  @Input() singleSelection: boolean = false;
  @Input() variant: 'blue' | 'orange' | 'green' | 'gray' = 'blue';
  @Input() storageKey: string = 'mindful-tags'; // Key for localStorage

  @Output() selectedKeysChange = new EventEmitter<any[]>();
  @Output() edit = new EventEmitter<any>();
  @Output() delete = new EventEmitter<any>();
  @Output() add = new EventEmitter<any>();

  selectedKeys: any[] = [];

  activeTagKey: any = null;
  popoverPosition: { left: number; top: number } | null = null;

  // Unified input popup state
  showInputPopup: boolean = false;
  isEditMode: boolean = false;
  inputValue: string = '';
  inputPopupPosition: { left: number; top: number } | null = null;
  editingTagKey: any = null;

  private onDocClick?: any;
  // Delete confirmation popup state
  showDeleteConfirm: boolean = false;
  pendingDeleteKey: any = null;
  deleteConfirmConfig: any = {
    heading: 'Are you sure?',
    subtitle: 'This action cannot be undone',
    primaryCTA: { text: 'Delete', type: 'primary' },
    secondaryCTA: { text: 'Cancel', type: 'secondary' },
    showCloseButton: false,
    backdrop: true
  };

  constructor(private el: ElementRef) {
    this.onDocClick = (ev: any) => {
      if ((this.activeTagKey !== null || this.showInputPopup) && !this.el.nativeElement.contains(ev.target)) {
        this.closeAll();
      }
    };
    document.addEventListener('click', this.onDocClick);
  }

  /**
   * Clamp a popup center X coordinate so the popup (approx width 220px)
   * stays at least 16px from viewport edges.
   */
  private clampPopupCenter(left: number, popupWidth = 220, margin = 16): number {
    try {
      const half = popupWidth / 2;
      const min = margin + half;
      const max = (window.innerWidth || document.documentElement.clientWidth) - margin - half;
      return Math.max(min, Math.min(left, max));
    } catch (e) {
      return left;
    }
  }

  ngOnInit(): void {
    // Load custom tags from localStorage
    this.loadTagsFromStorage();
    
    const control = this.formGroup?.get(this.formControlName || '') as FormControl;
    if (control) {
      this.selectedKeys = control.value || [];
    }
  }

  ngOnDestroy(): void {
    if (this.onDocClick) document.removeEventListener('click', this.onDocClick);
  }

  toggleSelection(key: any) {
    const control = this.formGroup?.get(this.formControlName || '') as FormControl;
    if (this.singleSelection) {
      this.selectedKeys = [key];
    } else {
      if (this.selectedKeys.includes(key)) {
        this.selectedKeys = this.selectedKeys.filter(k => k !== key);
      } else {
        this.selectedKeys.push(key);
      }
    }
    if (control) control.setValue(this.selectedKeys);
    this.selectedKeysChange.emit(this.selectedKeys);
  }

  openTagMenu(key: any, elRef?: any) {
    this.activeTagKey = key;
    if (elRef && elRef.getBoundingClientRect) {
      const rect = elRef.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      // clamp popover so it remains at least 16px from viewport edges
      // use a smaller estimated width for the small edit/delete popover
      this.popoverPosition = { left: this.clampPopupCenter(center, 140), top: rect.bottom + 8 };
    } else {
      this.popoverPosition = null;
    }
    document.body.classList.add('no-scroll');
  }

  /**
   * Open the edit popup directly from a click on the tag element.
   * Computes viewport coordinates from the element rect and focuses the input.
   */
  openEditFromClick(key: any, elRef?: any) {
    const tag = this.options.find(o => o.key === key);
    this.editingTagKey = key;
    this.isEditMode = true;
    this.inputValue = tag ? tag.value : '';
    if (elRef && elRef.getBoundingClientRect) {
      const rect = elRef.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      this.inputPopupPosition = { left: this.clampPopupCenter(center), top: rect.bottom + 8 };
    } else {
      this.inputPopupPosition = null;
    }
    this.showInputPopup = true;
    document.body.classList.add('no-scroll');

    // Auto-focus the input after the view updates
    setTimeout(() => {
      if (this.tagInputRef) {
        this.tagInputRef.nativeElement.focus();
        this.tagInputRef.nativeElement.select();
      }
    }, 0);
  }

  closeTagMenu() {
    this.activeTagKey = null;
    this.popoverPosition = null;
    document.body.classList.remove('no-scroll');
  }

  onEdit(key: any, ev?: Event) {
    if (ev) ev.stopPropagation();
    const tag = this.options.find(o => o.key === key);
    this.editingTagKey = key;
    this.isEditMode = true;
    this.inputValue = tag ? tag.value : '';

    // Use the current popover position as the starting point for the edit popup
    if (this.popoverPosition) {
      this.inputPopupPosition = { left: this.clampPopupCenter(this.popoverPosition.left), top: this.popoverPosition.top };
    } else {
      this.inputPopupPosition = null;
    }
    this.showInputPopup = true;

    // Hide the popover but do NOT call closeTagMenu() because that removes the
    // body no-scroll class and clears state we rely on for the edit popup.
    this.activeTagKey = null;
    this.popoverPosition = null;

    // Ensure body no-scroll is present while editing
    document.body.classList.add('no-scroll');

    // Auto-focus the input after the view updates
    setTimeout(() => {
      if (this.tagInputRef) {
        this.tagInputRef.nativeElement.focus();
        this.tagInputRef.nativeElement.select();
      }
    }, 0);
  }

  // Unified save method for both edit and add
  saveInputPopup() {
    const val = (this.inputValue || '').trim();
    if (!val) {
      this.cancelInputPopup();
      return;
    }

    if (this.isEditMode && this.editingTagKey != null) {
      // Edit existing tag
      const idx = this.options.findIndex(o => o.key === this.editingTagKey);
      if (idx > -1) {
        this.options[idx].value = val;
        this.saveTagsToStorage();
        this.edit.emit({ key: this.editingTagKey, value: val });
      }
    } else {
      // Add new tag at first position
      const key = Date.now();
      const newTag = { key, value: val, type: 'custom' };
      this.options.unshift(newTag); // Add to first position
      this.saveTagsToStorage();
      this.add.emit({ key, value: val });
    }
    this.cancelInputPopup();
  }

  cancelInputPopup() {
    this.showInputPopup = false;
    this.isEditMode = false;
    this.inputValue = '';
    this.inputPopupPosition = null;
    this.editingTagKey = null;
    document.body.classList.remove('no-scroll');
  }

  // Legacy method aliases for compatibility
  saveEdit() {
    this.saveInputPopup();
  }

  cancelEdit() {
    this.cancelInputPopup();
  }

  onDelete(key: any) {
    // Remove the option locally
    const idx = this.options.findIndex(o => o.key === key);
    if (idx > -1) {
      const removed = this.options.splice(idx, 1)[0];
      // Save changes to localStorage
      this.saveTagsToStorage();
      
      // If the deleted tag was selected, remove it from selectedKeys
      if (this.selectedKeys && this.selectedKeys.includes(key)) {
        this.selectedKeys = this.selectedKeys.filter(k => k !== key);
        const control = this.formGroup?.get(this.formControlName || '') as FormControl;
        if (control) control.setValue(this.selectedKeys);
        this.selectedKeysChange.emit(this.selectedKeys);
      }

      // Emit delete event with removed item payload for parent components
      this.delete.emit({ key, value: removed?.value });
    } else {
      // If not found, still emit a simple delete event
      this.delete.emit(key);
    }

    this.closeTagMenu();
  }

  openDeleteConfirm(key: any) {
    this.pendingDeleteKey = key;
    const tag = this.options.find(o => o.key === key);
    const title = tag && tag.value
      ? `Are you sure you want to\ndelete “${tag.value}” Tag?`
      : 'Are you sure you want to\ndelete this Tag?';

    this.deleteConfirmConfig = {
      heading: title,
      subtitle: '',
      primaryCTA: {
        text: 'Delete',
        type: 'primary',
        buttonStyle: 'bronze',
        buttonLarge: false,
        buttonMedium: false
      },
      secondaryCTA: {
        text: 'Cancel',
        type: 'secondary',
        buttonStyle: 'bronze-transparent',
        buttonLarge: false,
        buttonMedium: false
      },
      backdrop: true,
      showCloseButton: false
    };

    this.showDeleteConfirm = true;
    document.body.classList.add('no-scroll');
    this.closeTagMenu();
  }

  cancelConfirmDelete() {
    this.pendingDeleteKey = null;
    this.showDeleteConfirm = false;
    document.body.classList.remove('no-scroll');
  }

  confirmDelete() {
    if (this.pendingDeleteKey != null) {
      this.onDelete(this.pendingDeleteKey);
    }
    this.cancelConfirmDelete();
  }

  openAdd(elRef?: any) {
    this.isEditMode = false;
    this.inputValue = '';
    this.editingTagKey = null;
    if (elRef && elRef.getBoundingClientRect) {
      const rect = elRef.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      this.inputPopupPosition = { left: this.clampPopupCenter(center), top: rect.bottom + 8 };
    } else {
      this.inputPopupPosition = null;
    }
    this.showInputPopup = true;
    document.body.classList.add('no-scroll');

    // Auto-focus the input after the view updates
    setTimeout(() => {
      if (this.tagInputRef) {
        this.tagInputRef.nativeElement.focus();
      }
    }, 0);
  }

  saveAdd() {
    this.saveInputPopup();
  }

  cancelAdd() {
    this.cancelInputPopup();
  }

  closeAll() {
    this.closeTagMenu();
    this.cancelInputPopup();
  }

  // LocalStorage methods for persistence
  private getStorageKey(): string {
    return `${this.storageKey}-custom`;
  }

  private loadTagsFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.getStorageKey());
      if (stored) {
        const customTags = JSON.parse(stored) as { key: any; value: string; type?: string }[];
        // Merge custom tags at the beginning of options (avoiding duplicates)
        const existingKeys = new Set(this.options.map(o => o.key));
        const newCustomTags = customTags.filter(tag => !existingKeys.has(tag.key));
        this.options = [...newCustomTags, ...this.options];
      }
    } catch (e) {
      console.warn('Failed to load tags from localStorage:', e);
    }
  }

  private saveTagsToStorage(): void {
    try {
      // Save only custom tags (those with type='custom')
      const customTags = this.options.filter(o => o.type === 'custom');
      localStorage.setItem(this.getStorageKey(), JSON.stringify(customTags));
    } catch (e) {
      console.warn('Failed to save tags to localStorage:', e);
    }
  }

  getBadgeType(option: any): string {
    const isSelected = this.selectedKeys.includes(option.key);
    return this.variant + (isSelected ? '-selected' : '-unselected');
  }
}
