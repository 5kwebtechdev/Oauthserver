import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { SupermeButtonComponent } from '../superme-button/superme-button.component';

export interface EmptyStateConfig {
  title: string;
  description: string;
  image?: string;
  actionButtonText?: string;
  secondaryButtonText?: string;
}

@Component({
  standalone: true,
  selector: 'superme-empty-state',
  templateUrl: './superme-empty-state.component.html',
  styleUrls: ['./superme-empty-state.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, NgIf, SupermeButtonComponent]
})
export class SupermeEmptyStateComponent {
  /**
   * Main title/heading text for the empty state
   */
  @Input()
  title: string = 'We are waiting to hear about your day!';

  /**
   * Description or subtitle text
   */
  @Input()
  description: string = 'Post your journal to keep your story alive';

  /**
   * Image URL to display in the empty state
   */
  @Input()
  image?: string;

  /**
   * Text for the primary action button
   */
  @Input()
  actionButtonText?: string;

  /**
   * Text for secondary action button (optional)
   */
  @Input()
  secondaryButtonText?: string;

  /**
   * Variant styling (can be extended for different empty state types)
   */
  @Input()
  variant: 'default' | 'minimal' | 'error' = 'default';

  /**
   * Primary button action event
   */
  @Output()
  primaryActionClick = new EventEmitter<void>();

  /**
   * Secondary button action event
   */
  @Output()
  secondaryActionClick = new EventEmitter<void>();

  // Reference the imported SupermeButtonComponent so the editor/compiler
  // recognizes the import as used (prevents "not used within template" diagnostics).
  // This has no runtime effect.
  readonly _SupermeButtonRef = SupermeButtonComponent;

  /**
   * Emit primary action event
   */
  onPrimaryAction(): void {
    this.primaryActionClick.emit();
  }

  /**
   * Emit secondary action event
   */
  onSecondaryAction(): void {
    this.secondaryActionClick.emit();
  }

  /**
   * Determine if primary button should be visible
   */
  get showPrimaryButton(): boolean {
    return !!this.actionButtonText;
  }

  /**
   * Determine if secondary button should be visible
   */
  get showSecondaryButton(): boolean {
    return !!this.secondaryButtonText;
  }
}
