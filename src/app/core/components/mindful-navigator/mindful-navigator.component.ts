import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { NavigationService } from '../../services/navigation.service';
import { ModalController } from '@ionic/angular';
import { Router } from '@angular/router';

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

  // When true (or when `subtext` is provided) the subtext row will render.
  @Input() showSubtext: boolean = false;

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
  @Input() rightActions?: Array<{ type: 'edit' | 'icon' | 'iconWithCount' | 'heart', src?: string, alt?: string, count?: number }>;
  @Output() rightActionClick = new EventEmitter<{ index: number, action: any }>();
  // Emit when the back button is clicked so parents can intercept navigation.
  @Output() back = new EventEmitter<void>();

  // Programmatic helper: call from a page to configure which right actions to show.
  configureRightActions(actions: Array<{ type: 'edit' | 'icon', src?: string, alt?: string }>) {
    this.rightActions = actions;
  }

  private entryUrl?: string;

  constructor(private navigation: NavigationService, private location: Location, private modalCtrl: ModalController, private router: Router) { }

  ngOnInit(): void {
    try {
      const hist = this.navigation.getHistory();
      if (hist && hist.length >= 2) {
        this.entryUrl = hist[hist.length - 2];
      }
    } catch (e) {
      // ignore
    }
  }

  async goBack() {
    // If a parent is listening to (back), let it handle navigation and do not perform
    // the default modal/route navigation. EventEmitter exposes `observers` so we can
    // check whether anyone subscribed.
    try {
      if (this.back && Array.isArray((this.back as any).observers) && (this.back as any).observers.length > 0) {
        this.back.emit();
        return;
      }
    } catch (e) {
      // ignore emit errors and continue with default navigation
    }

    // 1) If inside a modal/overlay, dismiss it.
    try {
      const top = await this.modalCtrl.getTop();
      if (top) {
        await this.modalCtrl.dismiss();
        return;
      }
    } catch (e) {
      // ignore and continue to router/history fallback
    }

    // 2) If we captured an entry URL (the page that led here), navigate to it.
    try {
      if (this.entryUrl && this.router && this.entryUrl !== this.router.url) {
        await this.router.navigateByUrl(this.entryUrl, { replaceUrl: true });
        return;
      }
    } catch (e) {
      // ignore and continue to history fallback
    }

    // 3) Use navigation service history fallback.
    try {
      this.navigation.back();
      return;
    } catch (e) {
      // final fallback below
    }

    // 4) Last resort: location.back()
    try {
      this.location.back();
    } catch (e) {
      // nothing else we can do
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
