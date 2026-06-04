import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'tutor-filter-footer',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="tutor-filter-footer"><ng-content></ng-content></div>`,
  styles: [`.tutor-filter-footer{padding:12px;border-top:1px solid rgba(0,0,0,0.06);display:flex;justify-content:flex-end}`]
})
export class TutorFilterFooterComponent {}
