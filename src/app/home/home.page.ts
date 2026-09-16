import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NavController } from '@ionic/angular';
import { AuthService } from '../core/services/auth.service';
import { OnboardingStateService } from '../core/services/onboarding-state.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, OnDestroy {
  readonly slides = [
    'Super App for Super You',
    'Four Foundational Blocks',
    'Three Ways to Join SuperMeApp',
    'Stay Consistent and Earn Rewards',
  ];

  currentSlide = 0;
  isAuthenticated = false;

  private touchStartX = 0;
  private touchStartY = 0;
  private isStartingJourney = false;

  constructor(
    private readonly router: Router,
    private readonly navCtrl: NavController,
    private readonly authService: AuthService,
    private readonly onboardingState: OnboardingStateService,
  ) {}

  ngOnInit(): void {
    this.isAuthenticated = this.authService.isLoggedIn();

    if (this.isAuthenticated) {
      this.onboardingState.markExistingUser();
      const dashboardRoute = this.authService.getDashboardRoute();
      this.router.navigate([dashboardRoute], { replaceUrl: true });
      return;
    }

    document.body.classList.add('onboarding-active');
    this.setOnboardingStatusBar();
  }

  ngOnDestroy(): void {
    this.clearOnboardingPresentation();

    if (!Capacitor.isNativePlatform()) {
      return;
    }

    StatusBar.setStyle({ style: Style.Light }).catch(() => undefined);
    if (Capacitor.getPlatform() === 'android') {
      StatusBar.setBackgroundColor({ color: '#FFE9D6' }).catch(() => undefined);
    }
  }

  /**
   * Ionic can retain a routed page instance on iOS during navigation. Clear
   * the global splash presentation before the next route is drawn so it can
   * never leave the signup page inside a transparent/blank router outlet.
   */
  ionViewWillLeave(): void {
    this.clearOnboardingPresentation();
  }

  onTouchStart(event: TouchEvent): void {
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
  }

  onTouchEnd(event: TouchEvent): void {
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;

    if (Math.abs(deltaX) < 44 || Math.abs(deltaX) <= Math.abs(deltaY)) {
      return;
    }

    if (deltaX < 0) {
      this.showNextSlide();
    } else {
      this.showPreviousSlide();
    }
  }

  @HostListener('document:keydown.arrowright')
  showNextSlide(): void {
    if (this.currentSlide < this.slides.length - 1) {
      this.currentSlide += 1;
    }
  }

  @HostListener('document:keydown.arrowleft')
  showPreviousSlide(): void {
    if (this.currentSlide > 0) {
      this.currentSlide -= 1;
    }
  }

  setSlide(index: number): void {
    if (index >= 0 && index < this.slides.length) {
      this.currentSlide = index;
    }
  }

  async startJourney(): Promise<void> {
    if (this.isStartingJourney) {
      return;
    }

    this.isStartingJourney = true;
    this.onboardingState.markSplashCompleted();
    this.clearOnboardingPresentation();

    try {
      // Angular Router is more reliable here than an Ionic root transition on
      // iOS after the full-screen walkthrough has been displayed.
      const navigated = await this.router.navigate(['/signup'], {
        queryParams: { step: 1 },
        replaceUrl: true
      });

      if (!navigated) {
        throw new Error('Signup navigation was cancelled.');
      }
    } catch (error) {
      console.error('[Onboarding] Unable to open signup from walkthrough:', error);
      // Keep a native fallback for an interrupted iOS router transition.
      await this.navCtrl.navigateRoot('/signup?step=1', { animated: false });
    } finally {
      this.isStartingJourney = false;
    }
  }

  private clearOnboardingPresentation(): void {
    document.body.classList.remove('onboarding-active');
  }

  private setOnboardingStatusBar(): void {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined);
    if (Capacitor.getPlatform() === 'android') {
      StatusBar.setBackgroundColor({ color: '#D8CFFF' }).catch(() => undefined);
    }
  }
}
