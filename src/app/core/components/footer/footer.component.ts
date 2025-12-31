import { Component, OnInit } from '@angular/core';
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
export class FooterComponent implements OnInit {

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit() {
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
