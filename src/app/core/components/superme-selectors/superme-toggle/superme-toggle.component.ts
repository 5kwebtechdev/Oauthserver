import { Component, EventEmitter, HostBinding, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'superme-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      class="superme-toggle"
      role="switch"
      [attr.aria-checked]="checked"
      [attr.aria-disabled]="disabled"
      [disabled]="disabled"
      (click)="toggle()"
    >
      <span class="track" aria-hidden="true">
        <span class="thumb" aria-hidden="true"></span>
      </span>
    </button>
  `,
  styles: [`
    :host {
      display: inline-flex;
      vertical-align: middle;
    }

    .superme-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      position: relative;
      background: transparent;
      border: none;
      cursor: pointer;
      width: 50px;
      height: 25px;
      padding: 0;
      border-radius: 999px;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }

    .superme-toggle:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: 3px;
    }

    .superme-toggle[disabled] {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .superme-toggle .track {
      position: relative;
      width: 50px;
      height: 31px;
      border-radius: 20px;
      background: #C9C6DA;
      /* inactive track */
      transition: background 0.18s ease-in-out;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      padding: 0 0 0 0;
    }

    .superme-toggle .thumb {
      position: relative;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #3F3D56;
      /* thumb color */
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.18);
      transition: transform 0.18s ease-in-out, background 0.18s ease-in-out;
      transform: translateX(4px);
    }

    /* checked state: move thumb to right and change track */
    .superme-toggle[aria-checked="true"] .track,
    :host(.toggle-checked) .track {
      background: #7C6FCF;
      /* active track */
    }

    .superme-toggle[aria-checked="true"] .thumb,
    :host(.toggle-checked) .thumb {
      transform: translateX(22px);
      background: #3F3D56;
    }
  `]
})
export class SupermeToggleComponent {
  @Input() checked = false;
  @Input() disabled = false;
  @Output() checkedChange = new EventEmitter<boolean>();

  @HostBinding('class.toggle-checked')
  get hostChecked() {
    return !!this.checked;
  }

  toggle() {
    if (this.disabled) return;
    // Let the owning form update the input through checkedChange. Mutating an
    // @Input locally can temporarily disagree with one-way bindings.
    this.checkedChange.emit(!this.checked);
  }
}
