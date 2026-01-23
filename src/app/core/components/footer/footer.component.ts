import { Component, OnInit, Renderer2, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit, OnDestroy {
  private resizeListener: any;

  constructor(private authService: AuthService, private router: Router, private renderer: Renderer2, private elRef: ElementRef) { }

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
  }

  ngOnDestroy() {
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

  // Navigate to the appropriate dashboard
  navigateToDashboard(event: Event): void {
    event.preventDefault();
    const targetRoute = this.authService.getDashboardRoute();
    this.router.navigate([targetRoute]);
  }
}
