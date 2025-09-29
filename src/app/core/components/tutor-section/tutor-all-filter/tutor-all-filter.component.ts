import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'tutor-all-filter',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, MindfulNavigatorComponent, MindfulButtonComponent],
  templateUrl: './tutor-all-filter.component.html',
  styleUrls: ['./tutor-all-filter.component.scss']
})
export class TutorAllFilterComponent {
  /** List of available filter labels */
  @Input() filters: string[] = [];

  /** Currently selected filters */
  selected: string[] = [];

  /** Currently selected sidebar category (single select) */
  selectedCategory: string | null = 'Subjects';

  // ion-select models
  mode: string | null = 'in-person';
  grade: string | null = 'first';
  location: string | null = 'nearby';

  // custom dropdown state
  openDropdown: 'mode' | 'grade' | 'location' | null = null;
  popoverStyle: { [k: string]: string } = {};
  // 'anchor' = popover anchored under button, 'bottom' = sticky bottom sheet
  popoverPosition: 'anchor' | 'bottom' = 'bottom';

  /** Emitted whenever selection changes. Payload: selected filter labels */
  @Output() filterChange = new EventEmitter<string[]>();

  constructor(private modalCtrl: ModalController) { }

  close() {
    this.modalCtrl.dismiss();
  }

  apply() {
    // emit locally and dismiss with data so parent can handle it
    this.filterChange.emit(this.selected.slice());
    this.modalCtrl.dismiss({ selected: this.selected.slice() });
  }

  toggleFilter(filter: string) {
    const i = this.selected.indexOf(filter);
    if (i === -1) {
      this.selected.push(filter);
    } else {
      this.selected.splice(i, 1);
    }
    this.filterChange.emit(this.selected.slice());
  }

  /** Select a sidebar category; this is single-select and will update visual state */
  selectCategory(category: string) {
    this.selectedCategory = category;
    // Optionally reset selected filters when category changes
    // this.selected = [];
  }

  // Toggle a custom dropdown; position popover using the button's bounding rect
  toggleDropdown(name: 'mode' | 'grade' | 'location', ev: MouseEvent) {
    ev.stopPropagation();
    if (this.openDropdown === name) {
      this.openDropdown = null;
      return;
    }

    // Show bottom sticky popover (bottom-sheet)
    this.popoverPosition = 'bottom';
    this.popoverStyle = {
      position: 'fixed',
      left: '0px',
      right: '0px',
      bottom: '0px',
      transform: 'none'
    };

    this.openDropdown = name;
  }

  selectDropdown(name: 'mode' | 'grade' | 'location', value: string) {
    if (name === 'mode') this.mode = value;
    if (name === 'grade') this.grade = value;
    if (name === 'location') this.location = value;
    this.openDropdown = null;
  }

  // Close dropdowns when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(ev: MouseEvent) {
    const target = ev.target as HTMLElement | null;
    if (!target) return;
    if (target.closest('.dropdown-btn') || target.closest('.custom-popover')) {
      return;
    }
    this.openDropdown = null;
  }
}
