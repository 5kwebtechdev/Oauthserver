import {
  Component,
  Input,
  OnInit,
  Renderer2,
  ElementRef,
  OnDestroy,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { IonicModule, NavController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
// Capacitor Keyboard (optional in web builds)
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule, IonicModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
})
export class FooterComponent implements OnInit, OnDestroy {
  readonly isNativePlatform = Capacitor.isNativePlatform();
  @Input() mode: 'default' | 'parenting' = 'default';
  @Input() showOnMobileWeb = false;
  private resizeListener: any;
  private routerSub: Subscription | undefined;
  currentUrl: string = '';
  isEducationActive: boolean = false;
  // Hide the fixed bottom bar while the on-screen keyboard is up — with
  // Keyboard.resize set to 'body', a position:fixed bar otherwise ends up
  // floating above the keyboard, appearing to cover a large chunk of the
  // (now shrunk) visible screen on some devices.
  isKeyboardOpen = false;
  private keyboardShowListener: any = null;
  private keyboardHideListener: any = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private navController: NavController,
    private renderer: Renderer2,
    private elRef: ElementRef,
    private ngZone: NgZone,
  ) {}

  ngOnInit() {
    // On init, detect whether a system navigation bar (on-screen nav) exists.
    // Heuristic: if screen height minus innerHeight is significant, assume nav bar present.
    const checkNav = () => {
      try {
        const screenH = (window && window.screen && window.screen.height) || 0;
        const innerH = (window && window.innerHeight) || 0;
        const navHeight = screenH - innerH;
        const hasSystemNav = navHeight > 48; // threshold (px)
        const host =
          this.elRef.nativeElement.querySelector('.footer-main') ||
          this.elRef.nativeElement;
        if (host) {
          if (hasSystemNav) this.renderer.addClass(host, 'has-system-nav');
          else this.renderer.removeClass(host, 'has-system-nav');
        }
      } catch (e) {
        // ignore
      }
    };

    // Initial check
    checkNav();

    // Re-check on resize/orientation changes
    this.resizeListener = this.renderer.listen('window', 'resize', () => {
      checkNav();
    });

    // Check education active
    this.currentUrl = this.router.url;
    this.isEducationActive = this.isAnyRouteActive([
      '/app/education',
      '/app/tutors',
      '/app/academies',
    ]);
    this.routerSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.currentUrl = event.urlAfterRedirects || event.url;
        this.isEducationActive = this.isAnyRouteActive([
          '/app/education',
          '/app/tutors',
          '/app/academies',
        ]);
      }
    });

    // Wire Capacitor Keyboard listeners if available
    try {
      if (!Capacitor.isNativePlatform()) return;
      this.keyboardShowListener = Keyboard.addListener(
        'keyboardDidShow',
        () => {
          this.ngZone.run(() => {
            this.isKeyboardOpen = true;
          });
        },
      );
      this.keyboardHideListener = Keyboard.addListener(
        'keyboardDidHide',
        () => {
          this.ngZone.run(() => {
            this.isKeyboardOpen = false;
          });
        },
      );
    } catch (e) {
      // Capacitor Keyboard may not be available in desktop browser; ignore
    }
  }

  ngOnDestroy() {
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
    if (this.resizeListener) this.resizeListener();
    if (this.keyboardShowListener && this.keyboardShowListener.remove)
      this.keyboardShowListener.remove();
    if (this.keyboardHideListener && this.keyboardHideListener.remove)
      this.keyboardHideListener.remove();
  }

  // Get the appropriate dashboard route based on user relationship
  getDashboardLink(): string {
    return this.authService.getDashboardRoute();
  }

  get primaryLink(): string {
    return this.isParentNavigation
      ? '/app/parent-learning'
      : '/app/content';
  }

  get primaryLabel(): string {
    return this.isParentNavigation ? 'Parenting' : 'Learning';
  }

  /**
   * Parent navigation is role-aware rather than relying on each page to pass
   * an input. Child and Self accounts therefore continue to see Learning.
   */
  get isParentNavigation(): boolean {
    return this.mode === 'parenting' || this.authService.isParentUser();
  }

  // Check if the current user is a parent
  isParentUser(): boolean {
    return this.authService.isParentUser();
  }

  navigateTab(event: Event, targetRoute: string): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.currentUrl === targetRoute) {
      return;
    }

    this.navController.navigateRoot(targetRoute, {
      animated: false,
      replaceUrl: true,
    });
  }

  // Navigate to the appropriate dashboard
  navigateToDashboard(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const targetRoute = this.authService.getDashboardRoute();
    if (this.currentUrl === targetRoute) {
      return;
    }

    this.navController.navigateRoot(targetRoute, {
      animated: false,
      replaceUrl: true,
    });
  }

  isRouteActive(route: string): boolean {
    return (
      this.currentUrl === route ||
      this.currentUrl.startsWith(`${route}/`) ||
      this.currentUrl.startsWith(`${route}?`)
    );
  }

  private isAnyRouteActive(routes: string[]): boolean {
    return routes.some((route) => this.isRouteActive(route));
  }
}
