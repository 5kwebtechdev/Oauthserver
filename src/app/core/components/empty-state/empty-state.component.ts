import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { SupermeButtonComponent } from '../superme-button/superme-button.component';
import { buttonStyles } from '../superme-button/button.types';

@Component({
  selector: 'empty-state',
  standalone: true,
  imports: [CommonModule, SupermeButtonComponent],
  template: `
    <div class="empty-state__body">
      <img *ngIf="imageSrc" class="empty-state__illustration" [src]="resolveImageSrc(imageSrc)" [alt]="imageAlt">

      <div class="empty-state__texts">
        <p class="empty-state__lead">{{ leadText }}</p>
        <p class="empty-state__sub">{{ subText }}</p>
      </div>

      <superme-button *ngIf="buttonText && buttonText.trim().length > 0"
        class="empty-state__button"
        [type]="buttonType"
        [large]="isLargeButton"
        [text]="buttonText"
        (click)="onButtonClick()"
        [attr.aria-label]="buttonText">
      </superme-button>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .empty-state__body {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .empty-state__illustration {
      width: 216px;
      height: auto;
      object-fit: contain;
    }

    .empty-state__texts {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .empty-state__lead {
      font-family: 'Fredoka', Arial;
      font-weight: 500;
      font-size: 16px;
      color: #282527;
      text-align: center;
      margin: 0;
    }

    .empty-state__sub {
      font-family: 'Nunito', Arial;
      font-weight: 500;
      font-size: 13px;
      color: #282527;
      opacity: 0.7;
      text-align: center;
      margin: 0;
    }

    .empty-state__button {
      width: 100%;
      align-items: center;
      justify-content: center;
      padding: 0px 12px;
    }
  `]
})
export class EmptyStateComponent {
  private readonly document = inject(DOCUMENT);

  @Input() imageSrc: string = '';
  @Input() imageAlt: string = '';
  @Input() leadText: string = '';
  @Input() subText: string = '';
  @Input() buttonType: buttonStyles = 'magenta';
  @Input() buttonText: string = 'Action';
  @Input() isLargeButton: boolean = true;

  @Output() buttonClicked = new EventEmitter<void>();

  /**
   * Resolve root-relative asset references against the app's configured base
   * href. The web app is hosted at /app/, so `/assets/...` would incorrectly
   * request files from the legacy root site and return an HTML fallback.
   * Relative references continue to work for both web and native builds.
   */
  resolveImageSrc(src: string): string {
    const value = String(src || '').trim();
    if (!value.startsWith('/assets/')) {
      return value;
    }

    const baseHref = this.document.querySelector('base')?.getAttribute('href') || '/';
    const base = baseHref.endsWith('/') ? baseHref.slice(0, -1) : baseHref;
    return `${base}${value}`;
  }

  onButtonClick(): void {
    this.buttonClicked.emit();
  }
}
