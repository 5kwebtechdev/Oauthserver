import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'instructio-list',
  imports: [CommonModule],
  template: `
    <div class="instruction-list">
      <h1>{{ heading }}</h1>
      <div class="explanation">
        <div class="explanation-list" *ngFor="let item of items; let i = index">
          <span class="list-count" *ngIf="displayIndexes[i]">{{ displayIndexes[i] }}</span>
          <p [innerHTML]="item"></p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
    .instruction-list{ display:flex; flex-direction:column; gap:12px; }
    .instruction-list h1{ font-family: Nunito, sans-serif;  
    margin: 0;
    color: #282527;
    font-family: Nunito;
    font-size: 16px;
    font-weight: 600;}   
    .explanation{ display:flex; flex-direction:column; gap:10px }
    .explanation-list{ display:flex; align-items:flex-start; gap:10px }
    .list-count{ display: inline-flex;
    min-width: 28px;
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    background: #F0F0F0;
    border-radius: 14px;
    color: #282527;
    font-family: Nunito;
    font-size: 16px;
    font-weight: 600;
    margin-top: 1px;
  }
    .explanation-list p{ margin: 0;
    opacity: 0.7;
    color: #282527;
    font-family: Nunito;
    font-size: 16px;
    font-weight: 500;
   }
    `
  ]
})
export class InstructioListComponent {
  private _items: string[] = [];
  displayIndexes: number[] = [];

  @Input()
  set items(v: string[]) {
    this._items = v || [];
    this.computeDisplayIndexes();
  }
  get items(): string[] {
    return this._items;
  }

  @Input() heading: string = '';
  @Input() type: string = '';

  private computeDisplayIndexes() {
    this.displayIndexes = [];
    let count = 0;
    for (const it of this._items) {
      if (this.isNoteItem(it)) {
        this.displayIndexes.push(0); // 0 => don't show number
      } else {
        count++;
        this.displayIndexes.push(count);
      }
    }
  }

  private isNoteItem(item: string): boolean {
    if (!item) return false;
    // Consider item a note if it contains the literal 'Note:' or a span with Note
    return /Note:/.test(item) || /<span[^>]*>\s*Note:/.test(item);
  }
}
