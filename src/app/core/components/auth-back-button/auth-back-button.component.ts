import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'superme-auth-back-button',
  standalone: true,
  template: `
    <button type="button" class="auth-back-button" (click)="back.emit()" [attr.aria-label]="ariaLabel">
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path
          d="M11.2929 23.2929C10.9024 23.6834 10.9024 24.3166 11.2929 24.7071L17.6569 31.0711C18.0474 31.4616 18.6805 31.4616 19.0711 31.0711C19.4616 30.6805 19.4616 30.0474 19.0711 29.6569L13.4142 24L19.0711 18.3431C19.4616 17.9526 19.4616 17.3195 19.0711 16.9289C18.6805 16.5384 18.0474 16.5384 17.6569 16.9289L11.2929 23.2929ZM36 25C36.5523 25 37 24.5523 37 24C37 23.4477 36.5523 23 36 23V24V25ZM12 24V25H36V24V23H12V24Z"
          fill="currentColor"
        />
      </svg>
    </button>
  `,
  styles: [`
    :host {
      position: absolute;
      z-index: 10;
      top: calc(env(safe-area-inset-top, 0px) + 12px);
      left: max(16px, env(safe-area-inset-left, 0px));
      display: block;
      width: 48px;
      height: 48px;
      color: #280f19;
    }

    :host(.auth-back-button--inline) {
      position: relative;
      inset: auto;
      display: inline-flex;
      flex: 0 0 48px;
    }

    .auth-back-button {
      display: grid;
      width: 48px;
      height: 48px;
      margin: 0;
      padding: 0;
      place-items: center;
      border: 0;
      border-radius: 50%;
      background: transparent;
      color: inherit;
      cursor: pointer;
      appearance: none;
      -webkit-appearance: none;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
      transition: background-color 160ms ease, transform 160ms ease;
    }

    .auth-back-button svg {
      display: block;
      width: 48px;
      height: 48px;
      overflow: visible;
      pointer-events: none;
    }

    .auth-back-button:hover,
    .auth-back-button:active {
      background: #f7f0f3;
    }

    .auth-back-button:active {
      transform: scale(0.96);
    }

    .auth-back-button:focus-visible {
      outline: 3px solid rgba(139, 141, 203, 0.42);
      outline-offset: 2px;
    }

    @media (prefers-reduced-motion: reduce) {
      .auth-back-button {
        transition: none;
      }
    }
  `],
  host: {
    '[class.auth-back-button--inline]': "mode === 'inline'"
  }
})
export class AuthBackButtonComponent {
  @Input() mode: 'absolute' | 'inline' = 'absolute';
  @Input() ariaLabel = 'Go back';
  @Output() back = new EventEmitter<void>();
}
