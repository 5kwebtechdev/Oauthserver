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
      (keydown)="onKeydown($event)"
    >
      <span class="track" aria-hidden="true">
        <span class="thumb" aria-hidden="true"></span>
      </span>
    </button>
  `,
  styles: [`
    :host {
      display: inline-block;
    }

    .superme-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      position: relative;
      background: transparent;
      border: none;
      cursor: pointer;
      width: 40px;
      /* overall control width (matches SVG) */
      height: 25px;
      /* overall control height (matches SVG) */
      padding: 0;
    }

    .superme-toggle[disabled] {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .superme-toggle .track {
      position: relative;
      width: 40px;
      /* match SVG */
      height: 16px;
      /* match SVG rect height */
      border-radius: 8px;
      /* rx=8 in SVG */
      background: #DCDBDC;
      /* inactive track (SVG inactive rect fill) */
      transition: background 0.18s ease-in-out;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      padding: 0 0 0 0;
    }

    .superme-toggle .thumb {
      position: relative;
      width: 24px;
      /* diameter 24 (r=12) */
      height: 24px;
      border-radius: 50%;
      background: #90214D;
      /* thumb color */
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.18);
      transition: transform 0.18s ease-in-out, background 0.18s ease-in-out;
      transform: translateX(0);
    }

    /* checked state: move thumb to right and change track */
    .superme-toggle[aria-checked="true"] .track,
    :host(.toggle-checked) .track {
      background: #6B656A;
      /* active track (SVG active rect fill) */
    }

    .superme-toggle[aria-checked="true"] .thumb,
    :host(.toggle-checked) .thumb {
      transform: translateX(16px);
      background: #90214D;
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
    this.checked = !this.checked;
    this.checkedChange.emit(this.checked);
  }

  onKeydown(event: KeyboardEvent) {
    if (this.disabled) return;
    const key = event.key;
    if (key === ' ' || key === 'Enter') {
      event.preventDefault();
      this.toggle();
    }
  }
}
