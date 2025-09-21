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
          <span class="list-count">{{ i + 1 }}</span>
          <p [innerHTML]="item"></p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
    .instruction-list{ display:flex; flex-direction:column; gap:12px; }
    .instruction-list h1{ font-family: Nunito, sans-serif; font-weight:600; font-size:18px; margin:0; color:#282527 }
    .explanation{ display:flex; flex-direction:column; gap:8px }
    .explanation-list{ display:flex; align-items:flex-start; gap:8px }
    .list-count{ display:inline-flex; min-width:28px; height:28px; align-items:center; justify-content:center; background:#F0F0F0; border-radius:14px; font-family: Nunito, sans-serif; font-weight:600; color:#282527 }
    .explanation-list p{ margin:0; color: rgba(40,37,39,0.7); font-family: Nunito, sans-serif; font-size:14px; line-height:20px }
    `
  ]
})
export class InstructioListComponent {
  @Input() items: string[] = [];
  @Input() heading: string = '';
}
