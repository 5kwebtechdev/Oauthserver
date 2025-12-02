import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'mindful-view-all',
  standalone: true,
  imports: [CommonModule],
  template: `
  <button type="button" class="view-all-btn see-all" (click)="onClick()" [attr.aria-label]="ariaLabel">
    <span class="btn-content">
      <span class="btn-text">{{ text }}</span>
      <svg *ngIf="!hideIcon" class="btn-icon" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M8.94097 6.39773L4.38604 10.9526C4.16636 11.1723 3.8102 11.1723 3.59054 10.9526L3.05929 10.4214C2.83998 10.2021 2.83956 9.84666 3.05835 9.62684L6.66822 5.99998L3.05835 2.37314C2.83956 2.15332 2.83998 1.79789 3.05929 1.57859L3.59054 1.04733C3.81022 0.827648 4.16638 0.827648 4.38604 1.04733L8.94095 5.60224C9.16063 5.8219 9.16063 6.17805 8.94097 6.39773Z" fill="#90214D" />
      </svg>
    </span>
    <span class="btn-underline" aria-hidden="true"></span>
  </button>
  `,
  styles: [
    `
    .view-all-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      position: relative;
      background: transparent;
      border: none;
      padding: 0;
      cursor: pointer;
    }

    .btn-content {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .btn-text {
      color: #90214D;
      font-family: 'Nunito', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
      font-size: 16px;
      font-style: normal;
      font-weight: 600;
      line-height: 140%;
    }

    .btn-icon {
      width: 12px;
      height: 12px;
      aspect-ratio: 1/1;
      flex-shrink: 0;
      object-fit: contain;
    }

    .btn-icon path {
      fill: #90214D;
    }

    .btn-underline {
      width: 77px;
      height: 0;
      position: absolute;
      bottom: 4px;
      left: 0;
      stroke-width: 0.5px;
      border-bottom: 0.5px solid #90214D;
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
