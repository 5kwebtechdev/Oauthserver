import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit {
  public dashboardLink: string = '/authed/user-dashboard';
  public isParent: boolean = false;

  constructor(private authService: AuthService) { }

  ngOnInit() {
    // Cache the dashboard link once during initialization to avoid repeated calls
    this.dashboardLink = this.authService.getDashboardRoute();
    // Check if the current user is a parent
    this.isParent = this.authService.isParentUser();
  }

  // Get the appropriate dashboard route based on user relationship
  getDashboardLink(): string {
    return this.dashboardLink;
  }

  // Check if the current user is a parent
  isParentUser(): boolean {
    return this.isParent;
  }
}
