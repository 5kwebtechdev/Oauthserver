import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { LoggedOutFooterComponent } from '../logged-out-footer/logged-out-footer.component';

@Component({
  selector: 'app-common-footer',
  standalone: true,
  imports: [CommonModule, LoggedOutFooterComponent],
  templateUrl: './common-footer.component.html',
})
export class CommonFooterComponent {
  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  get loggedInVariant(): 'logged-in' | 'logged-in-parent' {
    return this.authService.isParentUser() ? 'logged-in-parent' : 'logged-in';
  }

  constructor(private authService: AuthService) {}
}
