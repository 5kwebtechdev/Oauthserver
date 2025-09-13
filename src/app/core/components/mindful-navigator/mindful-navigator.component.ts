import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { NavigationService } from '../../services/navigation.service';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'mindful-navigator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mindful-navigator.component.html',
  styleUrls: ['./mindful-navigator.component.scss']
})
export class MindfulNavigatorComponent {
  @Input() heading: string = '';
  /**
   * Select which back icon to display. Use 'arrow' to show the standard back arrow
   * or 'cancel' to show the Cancel.svg asset.
   * Default: 'arrow'
   */
  @Input() backIcon: 'arrow' | 'cancel' = 'arrow';

  /** Optional right-side icon src. When provided a right-side button will render. */
  @Input() rightIcon?: string;

  /** Optional alt text for the right-side icon (accessibility). */
  @Input() rightIconAlt: string = '';

  /** Emits when the right-side icon/button is clicked. */
  @Output() rightIconClick = new EventEmitter<void>();

  /** Optional second right-side icon src (max 2 options). */
  @Input() rightIcon2?: string;

  /** Alt text for the second right-side icon. */
  @Input() rightIcon2Alt: string = '';

  /** Emits when the second right-side icon/button is clicked. */
  @Output() rightIcon2Click = new EventEmitter<void>();

  constructor(private navigation: NavigationService, private location: Location, private modalCtrl: ModalController) {}

  async goBack() {
    // If this component sits inside a modal, dismiss it first (common in Ionic flows)
    try {
      await this.modalCtrl.dismiss();
      return;
    } catch (e) {
      // No modal to dismiss or dismiss failed — fall through to navigation
    }

    try {
      this.navigation.back();
    } catch (e) {
      this.location.back();
    }
  }

  onRightClick() {
    this.rightIconClick.emit();
  }

  onRight2Click() {
    this.rightIcon2Click.emit();
  }

  /** Bound src for the back image based on `backIcon` */
  get backIconSrc(): string {
    return this.backIcon === 'cancel' ? '/assets/app-assets/Cancel.svg' : '/assets/app-assets/Back-common-icon.svg';
  }

  /** Bound alt text for accessibility */
  get backIconAlt(): string {
    return this.backIcon === 'cancel' ? 'Cancel' : 'Back';
  }
}
