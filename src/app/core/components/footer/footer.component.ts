import { Component, OnInit, Renderer2, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { IonicModule, NavController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule, IonicModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit, OnDestroy {
  private resizeListener: any;
  private routerSub: Subscription | undefined;
  currentUrl: string = '';
  isEducationActive: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private navController: NavController,
    private renderer: Renderer2,
    private elRef: ElementRef
  ) { }

  ngOnInit() {
    // On init, detect whether a system navigation bar (on-screen nav) exists.
    // Heuristic: if screen height minus innerHeight is significant, assume nav bar present.
    const checkNav = () => {
      try {
        const screenH = (window && window.screen && window.screen.height) || 0;
        const innerH = window && window.innerHeight || 0;
        const navHeight = screenH - innerH;
        const hasSystemNav = navHeight > 48; // threshold (px)
        const host = this.elRef.nativeElement.querySelector('.footer-main') || this.elRef.nativeElement;
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
    this.isEducationActive = this.isAnyRouteActive(['/authed/education', '/authed/tutors']);
    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.currentUrl = event.urlAfterRedirects || event.url;
        this.isEducationActive = this.isAnyRouteActive(['/authed/education', '/authed/tutors']);
      }
    });
  }

  ngOnDestroy() {
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
    if (this.resizeListener) this.resizeListener();
  }

  // Get the appropriate dashboard route based on user relationship
  getDashboardLink(): string {
    return this.authService.getDashboardRoute();
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
      replaceUrl: true
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
      replaceUrl: true
    });
  }

  isRouteActive(route: string): boolean {
    return this.currentUrl === route || this.currentUrl.startsWith(`${route}/`) || this.currentUrl.startsWith(`${route}?`);
  }

  private isAnyRouteActive(routes: string[]): boolean {
    return routes.some(route => this.isRouteActive(route));
  }
}
