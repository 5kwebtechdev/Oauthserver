import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

/** Full discovery profiles require an account, including bookmarked URLs. */
export const discoveryDetailsGuard: CanActivateFn = () => {
  if (inject(AuthService).isLoggedIn()) return true;
  window.location.assign(`${environment.mobileAppUrl}/login`);
  return false;
};
