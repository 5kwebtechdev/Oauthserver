import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MindfulButtonComponent } from '../mindful-button/mindful-button.component';
import { buttonStyles } from '../mindful-button/button.types';

@Component({
  selector: 'empty-state',
  standalone: true,
  imports: [CommonModule, MindfulButtonComponent],
  template: `
    <div class="empty-state__body">
      <img *ngIf="imageSrc" class="empty-state__illustration" [src]="imageSrc" [alt]="imageAlt">

      <div class="empty-state__texts">
        <p class="empty-state__lead">{{ leadText }}</p>
        <p class="empty-state__sub">{{ subText }}</p>
      </div>

      <mindful-button *ngIf="buttonText && buttonText.trim().length > 0"
        class="empty-state__button"
        [type]="buttonType"
        [large]="isLargeButton"
        [text]="buttonText"
        (click)="onButtonClick()"
        [attr.aria-label]="buttonText">
      </mindful-button>
    </div>
  `,
  styles: [`
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
  @Input() imageSrc: string = '';
  @Input() imageAlt: string = '';
  @Input() leadText: string = '';
  @Input() subText: string = '';
  @Input() buttonType: buttonStyles = 'magenta';
  @Input() buttonText: string = 'Action';
  @Input() isLargeButton: boolean = true;

  @Output() buttonClicked = new EventEmitter<void>();

  onButtonClick(): void {
    this.buttonClicked.emit();
  }
}
