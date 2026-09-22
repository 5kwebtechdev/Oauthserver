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
    /*
     * Colors/sizing are exposed as CSS custom properties (defaults below match
     * the original hardcoded look) so consumers can theme a specific toggle by
     * setting --sm-toggle-* on the <superme-toggle> host element instead of
     * reaching in with ::ng-deep. A ::ng-deep override of .track/.thumb ties
     * in specificity with the rules below (both end up equally specific once
     * Angular's emulated-encapsulation attribute is added), so which one wins
     * depends on stylesheet injection order and isn't reliable; custom
     * properties inherit into this template regardless of that.
     */
    :host {
      display: inline-flex;
      vertical-align: middle;
      --sm-toggle-w: 50px;
      --sm-toggle-h: 25px;
      --sm-toggle-thumb: 24px;
      --sm-toggle-inset: 4px;
      --sm-toggle-track-off: #C9C6DA;
      --sm-toggle-track-on: #7C6FCF;
      --sm-toggle-thumb-off: #3F3D56;
      --sm-toggle-thumb-on: #3F3D56;
      --sm-toggle-track-shadow: none;
      --sm-toggle-thumb-shadow: 0 2px 4px rgba(0, 0, 0, 0.18);
    }

    .superme-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      position: relative;
      background: transparent;
      border: none;
      cursor: pointer;
      width: var(--sm-toggle-w);
      height: var(--sm-toggle-h);
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
      width: var(--sm-toggle-w);
      height: var(--sm-toggle-h);
      border-radius: 999px;
      background: var(--sm-toggle-track-off);
      box-shadow: var(--sm-toggle-track-shadow);
      transition: background 0.18s ease-in-out;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      padding: 0 0 0 0;
    }

    .superme-toggle .thumb {
      position: relative;
      width: var(--sm-toggle-thumb);
      height: var(--sm-toggle-thumb);
      border-radius: 50%;
      background: var(--sm-toggle-thumb-off);
      box-shadow: var(--sm-toggle-thumb-shadow);
      transition: transform 0.18s ease-in-out, background 0.18s ease-in-out;
      transform: translateX(var(--sm-toggle-inset));
    }

    /* checked state: move thumb to right and change track */
    .superme-toggle[aria-checked="true"] .track,
    :host(.toggle-checked) .track {
      background: var(--sm-toggle-track-on);
    }

    .superme-toggle[aria-checked="true"] .thumb,
    :host(.toggle-checked) .thumb {
      transform: translateX(calc(var(--sm-toggle-w) - var(--sm-toggle-thumb) - var(--sm-toggle-inset)));
      background: var(--sm-toggle-thumb-on);
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
