import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthenticatedComponent } from "./authenticated.component";
import { UserDashboardComponent } from "./user-dashboard/user-dashboard.component";
import { DashboardRedirectGuard } from '../core/guards/dashboard-redirect.guard';
import { UserProfileComponent } from '../core/components/user-profile/user-profile.component';
import { TimelineComponent } from "../core/components/habit-section/timeline/timeline.component";
import { HabitDetailComponent } from "../core/components/habit-section/habit-detail/habit-detail.component";


const routes: Routes = [
  {
    path: '',
    component: AuthenticatedComponent,
    children: [

      {
        path: 'user-dashboard',
        component: UserDashboardComponent,
        canActivate: [DashboardRedirectGuard],
        data: { allowedRoles: ['CHILD', 'SELF'] }
      }, {
        path: 'parent-account',
        loadComponent: () => import('./parent-account/parent-account.component').then(m => m.ParentAccountComponent),
        canActivate: [DashboardRedirectGuard],
        data: { allowedRoles: ['PARENT'] }
      }, {
        path: 'user-profile',
        component: UserProfileComponent
      }, {
        path: 'edit-profile',
        loadComponent: () => import('../core/components/user-profile/edit-profile/edit-profile.component').then(m => m.EditProfileComponent)
      }, {
        path: 'reset-pasword',
        loadComponent: () => import('../core/components/user-profile/reset-pasword/reset-pasword.component').then(m => m.ResetPaswordComponent)
      }, {
        path: 'notifications',
        loadComponent: () => import('../core/components/user-profile/notification/notification.component').then(m => m.NotificationComponent)
      }, {
        path: 'refer-friend',
        loadComponent: () => import('../core/components/user-profile/refer-friend/refer-friend.component').then(m => m.ReferFriendComponent)
      }, {
        path: 'family-connection',
        loadComponent: () => import('../core/components/user-profile/family-connection/family-connection.component').then(m => m.FamilyConnectionComponent)
      }, {
        path: 'parental-control',
        loadComponent: () => import('../core/components/user-profile/parental-control/parental-control-child/parental-control-child.component').then(m => m.ParentalControlChildComponent)
      }, {
        path: 'select-role',
        loadComponent: () => import('../core/components/user-profile/select-role/select-role.component').then(m => m.RoleSelectComponent)
      }, {
        path: 'membership',
        loadComponent: () => import('../core/components/user-profile/membership-section/membership-section.component').then(m => m.MembershipSectionComponent)
      }, {
        path: 'feedback-suggestion',
        loadComponent: () => import('../core/components/user-profile/feedback-suggestion/feedback-suggestion.component').then(m => m.FeedbackSuggestionComponent)
      }, {
        path: 'help-support',
        loadComponent: () => import('../core/components/user-profile/help-support/help-support.component').then(m => m.HelpSupportComponent)
      }, {
        path: 'our-policies',
        loadComponent: () => import('../core/components/user-profile/our-policies/our-policies.component').then(m => m.OurPoliciesComponent)
      }, {
        path: 'delete-account',
        loadComponent: () => import('../core/components/user-profile/delete-account/delete-account.component').then(m => m.DeleteAccountComponent)
      }, {
        path: 'timeline',
        component: TimelineComponent
      }, {
        path: 'habit-detail/:id',
        component: HabitDetailComponent
      }, {
        path: 'habit-input',
        loadComponent: () => import('../core/components/habit-section/habit-input/habit-input.component').then(m => m.HabitInputComponent)
      },
      {
        path: 'content',
        loadComponent: () => import('../core/components/learning-section/learning-main/learning-main.component').then(m => m.LearningMainComponent)
      }, {
        path: 'content/description/:id',
        loadComponent: () => import('../core/components/learning-section/learning-description/learning-description.component').then(m => m.LearningDescriptionComponent)
      }, {
        path: 'content/questions/:id',
        loadComponent: () => import('../core/components/learning-section/questions/questions.component').then(m => m.QuestionsComponent)
      }, {
        path: 'content/result',
        loadComponent: () => import('../core/components/learning-section/result-page/result-page.component').then(m => m.ResultPageComponent)
      }, {
        path: 'content/article/:id',
        loadComponent: () => import('../core/components/learning-section/article-page/article-page.component').then(m => m.ArticlePageComponent)
      }, {
        path: 'notes',
        loadComponent: () => import('../core/components/notes/notes.component').then(m => m.NotesComponent)
      }, {
        path: 'notes/new',
        loadComponent: () => import('../core/components/notes/notes-new/notes-new.component').then(m => m.NotesNewComponent)
      }, {
        path: 'habit-page',
        loadComponent: () => import('../core/components/habit-section/habit-page/habit-page.component').then(m => m.HabitPageComponent)
      }, {
        path: 'calendar-main',
        loadComponent: () => import('../core/components/habit-section/calendar-main/calendar-main.component').then(m => m.CalendarMainComponent)
      }, {
        path: 'coin',
        loadComponent: () => import('../core/components/coin-section/coin-section.component').then(m => m.CoinSectionComponent)
      }, {
        path: 'journal-input',
        loadComponent: () => import('../core/components/journals/journal-input/journal-input.component').then(m => m.JournalInputComponent)
      }, {
        path: 'journal-output',
        loadComponent: () => import('../core/components/journals/journal-output/journal-output.component').then(m => m.JournalOutputComponent)
      }, {
        path: 'reel-section',
        loadComponent: () => import('../core/components/reel-section/reel-category/reel-category.component').then(c => c.ReelCategoryComponent)
      }, {
        path: 'reels',
        loadComponent: () => import('../core/components/reel-section/all-reels/all-reels.component').then(m => m.AllReelsComponent)
      }, {
        path: 'upload-reel',
        loadComponent: () => import('../core/components/reel-section/upload-reel/upload-reel.component').then(m => m.UploadReelComponent)
      }, {
        path: 'bookmark-reels',
        loadComponent: () => import('../core/components/reel-section/bookmark-reels/bookmark-reels.component').then(m => m.BookmarkReelsComponent)
      }, {
        path: 'streaks',
        loadComponent: () => import('../core/components/streaks-section/streaks-section.component').then(m => m.StreaksSectionComponent)
      }, {
        path: 'reel-expand',
        loadComponent: () => import('../core/components/reel-section/reel-expand/reels-expand.component').then(m => m.ReelsExpandComponent)
      }, {
        path: 'education',
        loadComponent: () => import('../core/components/education-section/education-main-page/education-main-page.component').then(m => m.EducationMainPageComponent)
      }, {
        path: 'tutors',
        loadComponent: () => import('../core/components/tutor-section/tutor-homepage/tutor-homepage.component').then(m => m.TutorHomepageComponent)
      }, {
        path: 'academy',
        loadComponent: () => import('../core/components/academy-section/academy-home/academy-home.component').then(m => m.AcademyHomeComponent)
      }, {
        path: 'academy/subject',
        loadComponent: () => import('../core/components/academy-section/academy-subject/academy-subject.component').then(m => m.AcademySubjectComponent)
      }, {
        path: 'academy/course/:id',
        loadComponent: () => import('../core/components/academy-section/academy-course/academy-course.component').then(m => m.AcademyCourseComponent)
      }, {
        path: 'trophies',
        loadComponent: () => import('../core/components/trophy-section/trophy-page.component').then(m => m.TrophyPageComponent)
      }, {
        path: 'badges',
        loadComponent: () => import('../core/components/badge-section/badge-section.component').then(m => m.BadgeSectionComponent)
      }, {
        path: 'school-store',
        loadComponent: () => import('../core/components/school-store/school-store.components').then(m => m.SchoolStoreComponent)
      }, {
        path: 'school-store/address-input',
        loadComponent: () => import('../core/components/school-store/address-input/address-input.components').then(m => m.AddressInputComponent)
      }, {
        path: 'school-store/my-orders',
        loadComponent: () => import('../core/components/school-store/my-orders/my-orders.components').then(m => m.MyOrdersComponent)
      }, {
        path: 'cart',
        loadComponent: () => import('../core/components/school-store/product-store/my-cart/my-cart.components').then(m => m.MyCartComponent)
      }, {
        path: 'school-store/institute-detail',
        loadComponent: () => import('../core/components/school-store/institute-detail-fill/institute-detail-fill.components').then(m => m.InstituteDetailFillComponent)
      }, {
        path: 'school-store/product',
        loadComponent: () => import('../core/components/school-store/product-store/product-store.components').then(m => m.ProductStoreComponent)
      }, {
        path: 'school-store/product/:id',
        loadComponent: () => import('../core/components/school-store/product-store/product-detail/product-detail.components').then(m => m.ProductDetailComponent)
      }
    ]
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class AuthenticatedRoutingModule { }