import { booleanAttribute, ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { buttonStyles } from './button.types';
import { CoerceBoolean } from '../../coerceBoolean.decorator';

@Component({
  standalone: true,
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'mindful-button',
  templateUrl: './mindful-button.component.html',
  styleUrls: ['./mindful-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, NgIf]
})
export class MindfulButtonComponent {
  private _text = 'Undefined';
  private _iconPosition: 'start' | 'end' = 'start';
  private _count: number | null = null;

  @Input()
  type?: buttonStyles;

  @Input()
  set text(value: string | undefined) {
    this._text = value ?? 'Undefined';
  }
  get text(): string {
    return this._text;
  }

  @Input()
  icon?: string;

  @Input()
  set iconPosition(value: 'start' | 'end' | undefined) {
    this._iconPosition = value ?? 'start';
  }
  get iconPosition(): 'start' | 'end' {
    return this._iconPosition;
  }

  @Input()
  set count(value: number | null | undefined) {
    this._count = value ?? null;
  }
  get count(): number | null {
    return this._count;
  }

  @Input()
  size: 'full' | 'large' | 'medium' | 'small' = 'small';

  // Legacy boolean inputs for backward compatibility
  @Input({ transform: booleanAttribute })
  set full(value: boolean) { if (value) this.size = 'full'; }

  @Input({ transform: booleanAttribute })
  set large(value: boolean) { if (value) this.size = 'large'; }

  @Input({ transform: booleanAttribute })
  set medium(value: boolean) { if (value) this.size = 'medium'; }

  @Input({ transform: booleanAttribute })
  set small(value: boolean) { if (value) this.size = 'small'; }

  @Input({ transform: booleanAttribute })
  @CoerceBoolean()
  disabled = false;

  @Input({ transform: booleanAttribute })
  @CoerceBoolean()
  correct = false;

  @Input({ transform: booleanAttribute })
  @CoerceBoolean()
  incorrect = false;

  readonly buttonRole = 'button';

  get classMap(): Record<string, boolean> {
    return {
      ...(this.type ? { [this.type]: true } : {}),
      [this.size]: true,
      disabled: this.disabled,
      correct: this.correct,
      incorrect: this.incorrect
    };
  }

  get showLeadingIcon(): boolean {
    return Boolean(this.icon && this.iconPosition === 'start');
  }

  get showTrailingIcon(): boolean {
    return Boolean(this.icon && this.iconPosition === 'end');
  }

  handleClick(event: Event): void {
    if (this.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();
    }
  }

  handleKeydown(event: KeyboardEvent): void {
    const key = event.key;
    if (this.disabled && (key === 'Enter' || key === ' ' || key === 'Spacebar')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();
    }
  }
}
