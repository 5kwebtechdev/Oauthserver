import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NavbarComponent } from '../navbar/navbar.component';
import { ParentNavbarComponent } from '../parent-navbar/parent-navbar.component';
import { LandingNavbarComponent } from '../../../landing/components/navbar/navbar.component';

@Component({
  selector: 'app-public-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, ParentNavbarComponent, LandingNavbarComponent],
  template: `
    @if (isLoggedIn) {
      @if (isParent) {
        <app-parent-navbar></app-parent-navbar>
      } @else {
        <app-navbar></app-navbar>
      }
    } @else {
      <app-landing-navbar></app-landing-navbar>
    }
  `
})
export class PublicNavbarComponent {
  get isLoggedIn(): boolean { return this.authService.isLoggedIn(); }
  get isParent(): boolean { return this.authService.isParentUser(); }

  constructor(private authService: AuthService) {}
}
