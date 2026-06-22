import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'superme-view-all',
  standalone: true,
  imports: [CommonModule],
  template: `
  <button type="button" class="view-all-btn" (click)="onClick()" [attr.aria-label]="ariaLabel">
    {{ text }}
    <svg *ngIf="!hideIcon" xmlns="http://www.w3.org/2000/svg" width="7" height="11" viewBox="0 0 7 11" fill="none" aria-hidden="true">
      <path d="M1.5 1.5L5.5 5.5L1.5 9.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>
  `,
  styles: [
    `
    .view-all-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: transparent;
      border: 1.5px solid #E1527C;
      border-radius: 20px;
      padding: 7px 12px 7px 16px;
      color: #E1527C;
      font-family: 'Nunito', sans-serif;
      font-size: 14px;
      font-weight: 700;
      line-height: 1;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
      transition: background 0.15s ease;
      white-space: nowrap;
    }

    .view-all-btn:active {
      background: rgba(225, 82, 124, 0.1);
    }
    `
  ]
})
export class ViewAllComponent {
  @Input() href?: string;
  @Input() routerLink?: any;
  @Input() hideIcon?: boolean = false;
  @Output() clicked = new EventEmitter<void>();
  @Input() ariaLabel?: string = 'View all';
  @Input() text?: string = 'View all';

  constructor(private router: Router) { }

  async onClick() {
    try {
      if (this.routerLink) {
        await this.router.navigate(Array.isArray(this.routerLink) ? this.routerLink : [this.routerLink]);
      } else if (this.href) {
        await this.router.navigateByUrl(this.href);
      }
    } finally {
      this.clicked.emit();
    }
  }
}
