import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'tutor-all-filter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tutor-all-filter.component.html',
  styleUrls: ['./tutor-all-filter.component.scss']
})
export class TutorAllFilterComponent {
  /** List of available filter labels */
  @Input() filters: string[] = [];

  /** Currently selected filters */
  selected: string[] = [];

  /** Emitted whenever selection changes. Payload: selected filter labels */
  @Output() filterChange = new EventEmitter<string[]>();

  constructor(private modalCtrl: ModalController) {}

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
}
