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

  // Backwards compatibility: some templates pass "arrow". Keep existing literal types
  // but accept the legacy value 'arrow' and map it to the arrowSvg asset.
  @Input() backIcon: 'cancel' | 'arrowSvg' | 'arrow' = 'arrowSvg';

  @Input() rightIcon?: string;

  @Input() rightIconAlt: string = '';

  @Output() rightIconClick = new EventEmitter<void>();

  @Input() rightIcon2?: string;

  @Input() rightIcon2Alt: string = '';

  @Output() rightIcon2Click = new EventEmitter<void>();
  @Input() rightType?: 'edit';
  @Input() rightActions?: Array<{ type: 'edit' | 'icon', src?: string, alt?: string }>;
  @Output() rightActionClick = new EventEmitter<{ index: number, action: any }>();

  // Programmatic helper: call from a page to configure which right actions to show.
  configureRightActions(actions: Array<{ type: 'edit' | 'icon', src?: string, alt?: string }>) {
    this.rightActions = actions;
  }

  constructor(private navigation: NavigationService, private location: Location, private modalCtrl: ModalController) {}

  async goBack() {
    try {
      await this.modalCtrl.dismiss();
      return;
    } catch (e) {
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

  onActionClick(index: number, action: any) {
    if (index === 0) this.onRightClick();
    if (index === 1) this.onRight2Click();
    this.rightActionClick.emit({ index, action });
  }

  get backIconSrc(): string {
    // Map legacy 'arrow' to the same asset as 'arrowSvg'
    const icon = this.backIcon === 'cancel' ? 'cancel' : (this.backIcon === 'arrow' ? 'arrowSvg' : this.backIcon);
    return icon === 'cancel' ? '/assets/app-assets/Cancel.svg' : '/assets/app-assets/Back-common-icon.svg';
  }

  get backIconAlt(): string {
    return this.backIcon === 'cancel' ? 'Cancel' : 'Back';
  }
}
