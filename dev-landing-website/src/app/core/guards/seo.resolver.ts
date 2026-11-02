import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, RouterStateSnapshot } from '@angular/router';
import { SeoService } from '../services/seo.service';

export const seoResolver: ResolveFn<void> = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  return inject(SeoService).resolveForUrl(state.url, route);
};
