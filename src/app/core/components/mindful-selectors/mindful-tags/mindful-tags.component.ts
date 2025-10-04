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
  @ViewChild('editInput') editInputRef?: ElementRef<HTMLInputElement>;

  @Input() options: { key: any; value: string; type?: string }[] = [];
  @Input() formGroup?: FormGroup;
  @Input() formControlName?: string;
  @Input() size: 'small' | 'medium' | 'large' = 'small';
  @Input() singleSelection: boolean = false;
  @Input() variant: 'blue' | 'orange' | 'green' | 'gray' = 'blue';

  @Output() selectedKeysChange = new EventEmitter<any[]>();
  @Output() edit = new EventEmitter<any>();
  @Output() delete = new EventEmitter<any>();
  @Output() add = new EventEmitter<any>();

  selectedKeys: any[] = [];

  activeTagKey: any = null;
  popoverPosition: { left: number; top: number } | null = null;

  editingTagKey: any = null;
  editingValue: string = '';
  editPosition: { left: number; top: number } | null = null;

  addingTag: boolean = false;
  addingValue: string = '';
  addPosition: { left: number; top: number } | null = null;

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
      if ((this.activeTagKey !== null || this.editingTagKey !== null || this.addingTag) && !this.el.nativeElement.contains(ev.target)) {
        this.closeAll();
      }
    };
    document.addEventListener('click', this.onDocClick);
  }

  ngOnInit(): void {
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
      this.popoverPosition = { left: rect.left + rect.width / 2, top: rect.bottom + 8 };
    } else {
      this.popoverPosition = null;
    }
    document.body.classList.add('no-scroll');
  }

  closeTagMenu() {
    this.activeTagKey = null;
    this.popoverPosition = null;
    document.body.classList.remove('no-scroll');
  }

  onEdit(key: any) {
    const tag = this.options.find(o => o.key === key);
    this.editingTagKey = key;
    this.editingValue = tag ? tag.value : '';
    this.editPosition = this.popoverPosition ? { ...this.popoverPosition } : null;
    this.closeTagMenu();

    // Auto-focus the input after the view updates
    setTimeout(() => {
      if (this.editInputRef) {
        this.editInputRef.nativeElement.focus();
        this.editInputRef.nativeElement.select(); // Select all text for easy replacement
      }
    }, 0);
  }

  saveEdit() {
    if (this.editingTagKey != null) {
      const idx = this.options.findIndex(o => o.key === this.editingTagKey);
      if (idx > -1) {
        this.options[idx].value = this.editingValue;
        this.edit.emit({ key: this.editingTagKey, value: this.editingValue });
      }
    }
    this.cancelEdit();
  }

  cancelEdit() {
    this.editingTagKey = null;
    this.editingValue = '';
    this.editPosition = null;
    document.body.classList.remove('no-scroll');
  }

  onDelete(key: any) {
    this.delete.emit(key);
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
    this.addingTag = true;
    if (elRef && elRef.getBoundingClientRect) {
      const rect = elRef.getBoundingClientRect();
      this.addPosition = { left: rect.left + rect.width / 2, top: rect.bottom + 8 };
    } else {
      this.addPosition = null;
    }
    document.body.classList.add('no-scroll');
  }

  saveAdd() {
    const val = (this.addingValue || '').trim();
    if (val) {
      const key = Date.now();
      this.options.push({ key, value: val, type: 'habit-input' });
      this.add.emit({ key, value: val });
    }
    this.cancelAdd();
  }

  cancelAdd() {
    this.addingTag = false;
    this.addingValue = '';
    this.addPosition = null;
    document.body.classList.remove('no-scroll');
  }

  closeAll() {
    this.closeTagMenu();
    this.cancelEdit();
    this.cancelAdd();
  }

  getBadgeType(option: any): string {
    const isSelected = this.selectedKeys.includes(option.key);
    return this.variant + (isSelected ? '-selected' : '-unselected');
  }
}
