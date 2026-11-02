import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Slug lookup is an anonymous publication endpoint. A stale user token must
  // not turn a public article view into an authentication failure.
  if (req.url.includes('/public/articles')) return next(req);
  const authService = inject(AuthService);
  const authToken = authService.getToken();
  
  if (authToken) {
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${authToken}`)
    });
    return next(authReq);
  }
  
  return next(req);
};
