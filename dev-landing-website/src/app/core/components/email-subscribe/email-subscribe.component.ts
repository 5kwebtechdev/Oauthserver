import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-email-subscribe',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <form (submit)="onSubmit($event)" class="subscribe-form" [attr.aria-label]="ariaLabel">
      <input 
        [id]="inputId"
        [(ngModel)]="emailValue"
        name="email"
        type="email" 
        [placeholder]="placeholder" 
        class="email-input"
        [required]="required"
        [attr.aria-label]="inputAriaLabel"
      />
      <button 
        type="submit" 
        class="subscribe-btn" 
        [attr.aria-label]="buttonAriaLabel"
        [disabled]="disabled"
      >
        <span class="arrow">↗</span>
      </button>
    </form>
  `,
  styles: [`
    .subscribe-form {
      display: flex;
      align-items: center;
      gap: 0;
      width: 100%;
      position: relative;
    }

    .email-input {
      flex: 1 1 auto;
      padding: 18px;
      border-radius: 56px;
      border: none;
      outline: none;
      font-family: 'Nunito', sans-serif;
      font-size: 20px;
      font-weight: 600;
      line-height: 28px;
      background: #ffffff;
      color: #282527;
      opacity: 0.7;
      height: 64px;
      width: 100%;
      box-sizing: border-box;
    }

    .email-input::placeholder {
      color: #282527;
      opacity: 0.7;
    }

    .subscribe-btn {
      position: absolute;
      right: 0;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #9b2140;
      border: none;
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 24px;
      line-height: 1;
      transition: all 0.2s ease;
    }

    .subscribe-btn:hover:not(:disabled) {
      background: #7d1a34;
    }

    .subscribe-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .arrow {
      display: block;
      transform: rotate(0deg);
    }
  `]
})
export class EmailSubscribeComponent {
  @Input() placeholder: string = 'Your email';
  @Input() inputId: string = 'email-input';
  @Input() ariaLabel: string = 'Subscribe to newsletter';
  @Input() inputAriaLabel?: string;
  @Input() buttonAriaLabel: string = 'Subscribe';
  @Input() required: boolean = true;
  @Input() disabled: boolean = false;
  
  @Output() subscribe = new EventEmitter<string>();

  emailValue: string = '';

  onSubmit(event: Event): void {
    event.preventDefault();
    const email = this.emailValue?.trim();
    if (!email) {
      console.warn('Email required');
      return;
    }
    this.subscribe.emit(email);
    this.emailValue = '';
  }
}
