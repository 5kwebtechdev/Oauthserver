import { Capacitor } from '@capacitor/core';
import { environment } from '../environments/environment';
import { PkceEntryComponent } from './core/components/pkce-entry.component';
import { NgModule } from '@angular/core';
import { ActivatedRouteSnapshot, PreloadAllModules, RouterModule, RouterStateSnapshot, Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/authe-guard/authe-guard';
import { legacyAuthedRedirectGuard } from './core/authe-guard/authe-guard';
import { OurPoliciesComponent } from './core/components/user-profile/our-policies/our-policies.component';

const routes: Routes = [
  ...(environment.oauth.enabled && !Capacitor.isNativePlatform() ? [
    { path: 'login', component: PkceEntryComponent },
    { path: 'callback', component: PkceEntryComponent },
    { path: 'home/login', redirectTo: 'login', pathMatch: 'full' as const }
  ] : []),
  // The app entry point owns the first-launch walkthrough. Keep this route
  // ahead of the public auth routes so a fresh browser/native install gets
  // the same four-slide introduction as the mobile app before login/signup.
  {
    path: '',
    loadChildren: () => import('./home/home.module').then(m => m.HomePageModule),
    pathMatch: 'full'
  },
  // Public discovery pages keep their logged-out preview experience. The
  // signed-in equivalents remain available under /app/ with the auth guard.
  {
    path: 'find-a-tutor',
    loadComponent: () => import('./core/components/education-section/counselor-directory/counselor-directory.component').then(m => m.CounselorDirectoryComponent),
    data: { entityType: 'INDIVIDUAL', title: 'Tutors', singularTitle: 'Tutor' }
  },
  // Native-safe listing share links. The component hands installed-app users
  // to the authenticated detail route and sends browser users to the store.
  {
    path: 'share/:type/:id',
    loadComponent: () => import('./core/components/shared-listing-redirect/shared-listing-redirect.component')
      .then(m => m.SharedListingRedirectComponent)
  },
  { path: 'sationery-shop', redirectTo: 'stationery-shop', pathMatch: 'full' },
  {
    path: 'counselor',
    loadComponent: () => import('./core/components/education-section/counselor-directory/counselor-directory.component').then(m => m.CounselorDirectoryComponent),
    data: { entityType: 'COUNSELOR', title: 'Counselors', singularTitle: 'Counselor' }
  },
  {
    path: 'workshops',
    loadComponent: () => import('./core/components/education-section/eduhub-events/eduhub-events.component').then(m => m.EduHubEventsComponent),
    data: { entityType: 'Workshop', title: 'Workshops' }
  },
  { path: 'school-unifrom', redirectTo: 'school-uniform', pathMatch: 'full' },
  // Stable public entry points used by the separate SuperMe marketing site.
  // Keep these redirects at the root so the website does not need to know the
  // Ionic app's internal `/home/*` route structure.
  {
    path: 'login',
    loadComponent: () =>
      import('./home/login/login.component').then((m) => m.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./home/signup/signup.component').then((m) => m.SignupComponent),
    canActivate: [guestGuard]
  },
  {
    path: 'sign-up',
    redirectTo: 'signup',
    pathMatch: 'full'
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./home/reset-password/reset-password.component').then((m) => m.ResetPasswordComponent)
  },
  // When the web bundle is hosted at /app/, the browser base path is already
  // supplied by Angular. These routes therefore intentionally omit the
  // leading `app` segment so `/app/home` does not become `/app/app/home`.
  {
    path: 'home/join-family',
    loadComponent: () => import('./home/family-onboard/family-onboard.component').then(m => m.FamilyOnboardComponent),
  },
  {
    path: 'home/join-family2',
    loadComponent: () => import('./home/family-onboard/family-onboard.component').then(m => m.FamilyOnboardComponent),
  },
  {
    path: 'home/instructions-for-child',
    loadComponent: () => import('./home/family-onboard/family-onboard.component').then(m => m.FamilyOnboardComponent),
  },
  {
    path: 'home/instructions-for-parent',
    loadComponent: () => import('./home/family-onboard/family-onboard.component').then(m => m.FamilyOnboardComponent),
  },
  {
    path: 'home/scan-qr',
    loadComponent: () => import('./home/scan-qr/scan-qr.component').then(m => m.ScanQrComponent),
  },
  {
    path: 'home',
    loadChildren: () => import('./authenticated/authenticated.module').then(m => m.AuthenticatedModule),
    canActivate: [authGuard],
  },
  {
    path: 'parent-account',
    loadComponent: () => import('./authenticated/parent-account/parent-account.component').then(m => m.ParentAccountComponent),
    canActivate: [authGuard],
  },
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then(m => m.HomePageModule)
  },
  // The production document base is already /app/. Strip the legacy extra
  // segment from cached links such as /app/app/stationery-shop.
  {
    path: 'app',
    redirectTo: '',
    pathMatch: 'prefix'
  },
  {
    path: 'authed',
    loadChildren: () => import('./authenticated/authenticated.module').then(m => m.AuthenticatedModule),
    canActivate: [authGuard],
    canActivateChild: [legacyAuthedRedirectGuard]
  },
  { 
    path: 'our-policies',
    component: OurPoliciesComponent
  },
  {
    path: 'privacy-policy',
    component: OurPoliciesComponent
  },
  {
    path: 'article/:slug',
    loadComponent: () => import('./core/components/learning-section/article-page/article-page.component').then(m => m.ArticlePageComponent)
  },
  {
    path: 'articles/:slug',
    canActivate: [(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => /^\d+$/.test(route.paramMap.get('slug') || '') ? authGuard(route, state) : true],
    loadComponent: () => import('./core/components/learning-section/article-page/article-page.component').then(m => m.ArticlePageComponent)
  },
  {
    path: 'learning-description',
    redirectTo: 'content',
    pathMatch: 'full'
  },
  {
    path: 'result-page',
    loadComponent: () => import('./core/components/learning-section/result-page/result-page.component').then(m => m.ResultPageComponent)
  },
  // Mount the authenticated route tree at the document-base root. A child
  // route such as `stationery-shop` is therefore published as
  // /app/stationery-shop, never /app/app/stationery-shop.
  {
    path: '',
    loadChildren: () => import('./authenticated/authenticated.module').then(m => m.AuthenticatedModule),
    canActivate: [authGuard]
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
