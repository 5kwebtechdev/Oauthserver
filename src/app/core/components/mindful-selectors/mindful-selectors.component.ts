import {Component, Input, OnInit, Output, EventEmitter, NgModule, CUSTOM_ELEMENTS_SCHEMA, HostListener, OnDestroy, ElementRef} from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import {BadgeType} from "../mindful-badge/mindful-badge.interface";
import {CommonModule, NgForOf} from "@angular/common";
import { FormsModule } from '@angular/forms';
import { LongPressDirective } from '../../directives/gestureControlDirective';
import {MindfulBadgeComponent} from "../mindful-badge/mindful-badge.component";
import {MindfulButtonComponent} from "../mindful-button/mindful-button.component";
import {CoerceBoolean} from "../../coerceBoolean.decorator";

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'mindful-selectors',
  templateUrl: './mindful-selectors.component.html',
  styleUrls: ['./mindful-selectors.component.scss'],
  imports: [NgForOf, CommonModule, FormsModule, MindfulBadgeComponent, MindfulButtonComponent, LongPressDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class MindfulSelectorsComponent implements OnInit {
  private onDocClick?: any;
  @Input() options: { key: any; value: string; type: any }[] = [];
  @Input() label?: string;
  @Input() formGroup!: FormGroup;
  @Input() formControlName!: string;
  @Input() componentType: 'button' | 'badge' | 'tags' = 'badge';
  @Input() size: 'small' | 'medium' | 'large' = 'small';
  @Output() selectedKeysChange = new EventEmitter<number[]>();

  @Input()
  @CoerceBoolean()
  singleSelection: boolean = false;

  @Input()
  @CoerceBoolean()
  circle: boolean = false;

  selectedKeys: any[] = [];

  // track which tag has an active popover (shown after long-press)
  activeTagKey: any = null;
  popoverPosition: { left: number; top: number; } | null = null;
  // editing state
  editingTagKey: any = null;
  editingValue: string = '';
  editPosition: { left: number; top: number } | null = null;
  // adding new tag state
  addingTag: boolean = false;
  addingValue: string = '';
  addPosition: { left: number; top: number } | null = null;

  @Output() edit = new EventEmitter<any>();
  @Output() delete = new EventEmitter<any>();
  @Output() add = new EventEmitter<void>();

  ngOnInit(): void {
    const control = this.formGroup?.get(this.formControlName) as FormControl;
    if (control) {
      this.selectedKeys = control.value || [];
    }
  }

  constructor(private el: ElementRef){
    // bind doc click to handle closing popover when clicking outside
    this.onDocClick = (ev: any) => {
      // if a popover is open and the click target is outside this component, close it
      if (this.activeTagKey !== null && !this.el.nativeElement.contains(ev.target)) {
        this.closeTagMenu();
      }
    };
    document.addEventListener('click', this.onDocClick);
  }

  ngOnDestroy(): void {
    if(this.onDocClick) document.removeEventListener('click', this.onDocClick);
  }

  toggleSelection(key: number): void {
    const control = this.formGroup?.get(this.formControlName) as FormControl;
    if(this.singleSelection){
      this.selectedKeys = [key];
    }else{
      if (this.selectedKeys.includes(key)) {
        this.selectedKeys = this.selectedKeys.filter(k => k !== key);
      } else {
        this.selectedKeys.push(key);
      }
    }

    if (control) {
      control.setValue(this.selectedKeys);
    } else {
      this.selectedKeysChange.emit(this.selectedKeys);
    }
  }

  openTagMenu(key: any, elRef?: any) {
    this.activeTagKey = key;
    // compute position to render popover as a fixed element near the tag
    if (elRef && elRef.getBoundingClientRect) {
      const rect = elRef.getBoundingClientRect();
      // use viewport coordinates for fixed positioning
      this.popoverPosition = { left: rect.left + rect.width / 2, top: rect.bottom + 8 };
    } else {
      this.popoverPosition = null;
    }
    // disable body scroll while popover active
    document.body.classList.add('no-scroll');
  }

  closeTagMenu() {
    this.activeTagKey = null;
    this.popoverPosition = null;
    document.body.classList.remove('no-scroll');
  }

  onEdit(key: any) {
    // open inline edit UI near the tag
    const tag = this.options.find(o => o.key === key);
    this.editingTagKey = key;
    this.editingValue = tag ? tag.value : '';
    // place edit UI near where the popover was
    this.editPosition = this.popoverPosition ? { ...this.popoverPosition } : null;
    this.closeTagMenu();
  }

  saveEdit(){
    if(this.editingTagKey != null){
      const idx = this.options.findIndex(o => o.key === this.editingTagKey);
      if(idx > -1){
        this.options[idx].value = this.editingValue;
        this.edit.emit({ key: this.editingTagKey, value: this.editingValue });
      }
    }
    this.cancelEdit();
  }

  cancelEdit(){
    this.editingTagKey = null;
    this.editingValue = '';
    this.editPosition = null;
    document.body.classList.remove('no-scroll');
  }

  onDelete(key: any) {
    this.delete.emit(key);
    this.closeTagMenu();
  }

  emitAdd(){
    this.add.emit();
  }

  openAdd(elRef?: any){
    // show add input popup under the add badge
    this.addingTag = true;
    if (elRef && elRef.getBoundingClientRect) {
      const rect = elRef.getBoundingClientRect();
      this.addPosition = { left: rect.left + rect.width / 2, top: rect.bottom + 8 };
    } else {
      this.addPosition = null;
    }
    document.body.classList.add('no-scroll');
  }

  saveAdd(){
    const val = (this.addingValue || '').trim();
    if(val){
      // generate a simple key; parent can reconcile proper ids
      const key = Date.now();
  this.options.push({ key, value: val, type: ('default' as unknown) as BadgeType });
      this.add.emit();
    }
    this.cancelAdd();
  }

  cancelAdd(){
    this.addingTag = false;
    this.addingValue = '';
    this.addPosition = null;
    document.body.classList.remove('no-scroll');
  }
}
