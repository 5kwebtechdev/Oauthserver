import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/authe-guard/authe-guard';
import { legacyAuthedRedirectGuard } from './core/authe-guard/authe-guard';
import { OurPoliciesComponent } from './core/components/user-profile/our-policies/our-policies.component';

const routes: Routes = [
  // The app entry point owns the first-launch walkthrough. Keep this route
  // ahead of the public auth routes so a fresh browser/native install gets
  // the same four-slide introduction as the mobile app before login/signup.
  {
    path: '',
    loadChildren: () => import('./home/home.module').then(m => m.HomePageModule),
    pathMatch: 'full'
  },
  // Stable, readable logged-in URLs from the approved URL-structure sheet.
  // Root aliases remain valid for old bookmarks, but canonical logged-in
  // URLs now live under /app/.
  { path: 'quiz', redirectTo: 'app/quiz', pathMatch: 'full' },
  { path: 'puzzle', redirectTo: 'app/puzzle', pathMatch: 'full' },
  { path: 'article', redirectTo: 'app/article', pathMatch: 'full' },
  { path: 'master-class', redirectTo: 'app/master-class', pathMatch: 'full' },
  { path: 'reels', redirectTo: 'app/reels', pathMatch: 'full' },
  { path: 'journal', redirectTo: 'app/journal', pathMatch: 'full' },
  { path: 'notes', redirectTo: 'app/notes', pathMatch: 'full' },
  { path: 'productivity-calendar', redirectTo: 'app/productivity-calendar', pathMatch: 'full' },
  // Public discovery pages keep their logged-out preview experience. The
  // signed-in equivalents remain available under /app/ with the auth guard.
  {
    path: 'find-a-tutor',
    loadComponent: () => import('./core/components/education-section/counselor-directory/counselor-directory.component').then(m => m.CounselorDirectoryComponent),
    data: { entityType: 'INDIVIDUAL', title: 'Tutors', singularTitle: 'Tutor' }
  },
  { path: 'academy', redirectTo: 'app/academy', pathMatch: 'full' },
  { path: 'sationery-shop', redirectTo: 'app/stationery-shop', pathMatch: 'full' },
  { path: 'stationery-shop', redirectTo: 'app/stationery-shop', pathMatch: 'full' },
  { path: 'book-store', redirectTo: 'app/book-store', pathMatch: 'full' },
  { path: 'second-hand-books', redirectTo: 'app/second-hand-books', pathMatch: 'full' },
  { path: 'sports-shop', redirectTo: 'app/sports-shop', pathMatch: 'full' },
  {
    path: 'counselor',
    loadComponent: () => import('./core/components/education-section/counselor-directory/counselor-directory.component').then(m => m.CounselorDirectoryComponent),
    data: { entityType: 'COUNSELOR', title: 'Counselors', singularTitle: 'Counselor' }
  },
  { path: 'event', redirectTo: 'app/event', pathMatch: 'full' },
  {
    path: 'workshops',
    loadComponent: () => import('./core/components/education-section/eduhub-events/eduhub-events.component').then(m => m.EduHubEventsComponent),
    data: { entityType: 'Workshop', title: 'Workshops' }
  },
  { path: 'school-unifrom', redirectTo: 'app/school-uniform', pathMatch: 'full' },
  { path: 'school-uniform', redirectTo: 'app/school-uniform', pathMatch: 'full' },
  { path: 'textbook', redirectTo: 'app/textbook', pathMatch: 'full' },
  { path: 'stationery', redirectTo: 'app/stationery', pathMatch: 'full' },
  { path: 'entrance-exam-books', redirectTo: 'app/entrance-exam-books', pathMatch: 'full' },
  { path: 'general-books', redirectTo: 'app/general-books', pathMatch: 'full' },
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
  // Canonical authenticated landing page. `pathMatch: full` leaves the
  // existing /home/* onboarding compatibility routes available below.
  {
    path: 'home',
    redirectTo: 'app/home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then(m => m.HomePageModule)
  },
  {
    path: 'app',
    loadChildren: () => import('./authenticated/authenticated.module').then(m => m.AuthenticatedModule),
    canActivate: [authGuard]
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
    path: 'articles/:slug',
    loadComponent: () => import('./core/components/learning-section/article-page/article-page.component').then(m => m.ArticlePageComponent)
  },
  {
    path: 'learning-description',
    redirectTo: 'app/content',
    pathMatch: 'full'
  },
  {
    path: 'result-page',
    loadComponent: () => import('./core/components/learning-section/result-page/result-page.component').then(m => m.ResultPageComponent)
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
