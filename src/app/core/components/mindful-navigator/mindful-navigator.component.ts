import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationService } from '../../services/navigation.service';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'mindful-navigator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mindful-navigator.component.html',
  styleUrls: ['./mindful-navigator.component.scss']
})
export class MindfulNavigatorComponent implements OnInit {
  @Input() heading: string = '';

  // Optional subtext shown below the main heading (e.g. address / location label)
  @Input() subtext?: string;

  // Optional visual variant. Use 'warm' to apply warm color styles.
  @Input() variant?: string;

  // When true (or when `subtext` is provided) the subtext row will render.
  @Input() showSubtext: boolean = false;

  // When true the small chevron on the subtext row is displayed. Pages
  // can set this to false to hide the chevron (e.g., My Cart page).
  @Input() showSubtextChevron: boolean = true;

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
  // Accept flexible action types to keep navigator generic and avoid hard-coding specific actions
  @Input() rightActions?: Array<{ type?: string, src?: string, alt?: string, count?: number }>;
  @Output() rightActionClick = new EventEmitter<{ index: number, action: any }>();
  // Emit when the back button is clicked so parents can intercept navigation.
  @Output() back = new EventEmitter<void>();

  // Programmatic helper: call from a page to configure which right actions to show.
  configureRightActions(actions: Array<{ type?: string, src?: string, alt?: string }>) {
    this.rightActions = actions;
  }

  constructor(
    private navigation: NavigationService,
    private modalCtrl: ModalController
  ) { }

  ngOnInit(): void { }

  async goBack() {
    // If a parent component is listening to (back), let it handle navigation
    try {
      if (this.back && Array.isArray((this.back as any).observers) && (this.back as any).observers.length > 0) {
        this.back.emit();
        return;
      }
    } catch (e) {
      // ignore and continue with default navigation
    }

    // Check if inside a modal and dismiss it
    try {
      const top = await this.modalCtrl.getTop();
      if (top) {
        await this.modalCtrl.dismiss();
        return;
      }
    } catch (e) {
      // ignore and continue
    }

    // Use the navigation service to go back
    this.navigation.back();
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
    const icon = this.backIcon === 'cancel' ? 'cancel' : (this.backIcon === 'arrow' ? 'arrowSvg' : this.backIcon);
    return icon === 'cancel' ? '/assets/app-assets/Cancel.svg' : '/assets/app-assets/Back-common-icon.svg';
  }

  get backIconAlt(): string {
    return this.backIcon === 'cancel' ? 'Cancel' : 'Back';
  }
}
