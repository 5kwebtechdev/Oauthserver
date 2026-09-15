import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthenticatedComponent } from "./authenticated.component";
import { UserDashboardComponent } from "./user-dashboard/user-dashboard.component";
import { DashboardRedirectGuard } from '../core/guards/dashboard-redirect.guard';
import { UserProfileComponent } from '../core/components/user-profile/user-profile.component';
import { ActivityTimelineComponent } from "../core/components/activity-section/activity-timeline/activity-timeline.component";
import { ActivityDetailComponent } from "../core/components/activity-section/activity-detail/activity-detail.component";
import { CoinPurchaseComponent } from "../core/components/coin-section/coin-purchase/coin-purchase.component";


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
        path: 'parent-learning',
        loadComponent: () => import('../core/components/learning-section/parent-learning-listing/parent-learning-listing.component').then(m => m.ParentLearningListingComponent),
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
        path: 'bot-helpline',
        loadComponent: () => import('../core/components/user-profile/bot-helpline/bot-helpline.component').then(m => m.BotHelplineComponent)
      }, {
        path: 'our-policies',
        loadComponent: () => import('../core/components/user-profile/our-policies/our-policies.component').then(m => m.OurPoliciesComponent)
      }, {
        path: 'delete-account',
        loadComponent: () => import('../core/components/user-profile/delete-account/delete-account.component').then(m => m.DeleteAccountComponent)
      }, {
        path: 'activity-timeline',
        component: ActivityTimelineComponent
      }, {
        path: 'activity-detail/:id',
        component: ActivityDetailComponent
      }, {
        path: 'activity-input',
        loadComponent: () => import('../core/components/activity-section/activity-input/activity-input.component').then(m => m.ActivityInputComponent)
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
        path: 'activity-page',
        loadComponent: () => import('../core/components/activity-section/activity-page/activity-page.component').then(m => m.ActivityPageComponent)
      }, {
        path: 'activity-calendar',
        loadComponent: () => import('../core/components/activity-section/activity-calendar/activity-calendar.component').then(m => m.ActivityCalendarComponent)
      }, {
        path: 'coin',
        loadComponent: () => import('../core/components/coin-section/coin-section.component').then(m => m.CoinSectionComponent)
      }, {
        path: 'coin-purchase',
        component: CoinPurchaseComponent
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
        loadComponent: () => import('../core/components/reel-section/reel-category/reel-category.component').then(m => m.ReelCategoryComponent)
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
        path: 'education/events/:id',
        loadComponent: () => import('../core/components/education-section/eduhub-event-details/eduhub-event-details.component').then(m => m.EduHubEventDetailsComponent),
        data: { entityType: 'Events', title: 'Events' }
      }, {
        path: 'education/workshops/:id',
        loadComponent: () => import('../core/components/education-section/eduhub-event-details/eduhub-event-details.component').then(m => m.EduHubEventDetailsComponent),
        data: { entityType: 'Workshop', title: 'Workshops' }
      }, {
        path: 'education/events',
        loadComponent: () => import('../core/components/education-section/eduhub-events/eduhub-events.component').then(m => m.EduHubEventsComponent),
        data: { entityType: 'Events', title: 'Events' }
      }, {
        path: 'education/workshops',
        loadComponent: () => import('../core/components/education-section/eduhub-events/eduhub-events.component').then(m => m.EduHubEventsComponent),
        data: { entityType: 'Workshop', title: 'Workshops' }
      }, {
        path: 'education',
        loadComponent: () => import('../core/components/education-section/education-main-page/education-main-page.component').then(m => m.EducationMainPageComponent)
      }, {
        path: 'second-hand-books',
        loadComponent: () => import('../core/components/second-hand-books/second-hand-books.component').then(m => m.SecondHandBooksComponent)
      }, {
        path: 'counselors/:id',
        loadComponent: () => import('../core/components/tutor-section/tutor-profile/tutor-profile.component').then(m => m.TutorProfileComponent),
        data: { entityType: 'COUNSELOR' }
      }, {
        path: 'counselors',
        loadComponent: () => import('../core/components/education-section/counselor-directory/counselor-directory.component').then(m => m.CounselorDirectoryComponent)
      }, {
        path: 'tutors/:id',
        loadComponent: () => import('../core/components/tutor-section/tutor-profile/tutor-profile.component').then(m => m.TutorProfileComponent)
      }, {
        path: 'tutors',
        loadComponent: () => import('../core/components/education-section/counselor-directory/counselor-directory.component').then(m => m.CounselorDirectoryComponent),
        data: { entityType: 'INDIVIDUAL', title: 'Tutors', singularTitle: 'Tutor' }
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
        path: 'academies',
        loadComponent: () => import('../core/components/education-section/counselor-directory/counselor-directory.component').then(m => m.CounselorDirectoryComponent),
        data: { entityType: 'ACADEMY', title: 'Academies', singularTitle: 'Academy' }
      }, {
        path: 'analytics',
        loadComponent: () => import('../core/components/analytics-section/analytics.component').then(m => m.AnalyticsComponent)
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
        path: 'education/shops/:id',
        loadComponent: () => import('../core/components/education-section/parent-eduhub-shop-details/parent-eduhub-shop-details.component').then(m => m.ParentEduHubShopDetailsComponent),
        data: { title: 'Shop' }
      }, {
        path: 'education/shops',
        loadComponent: () => import('../core/components/education-section/parent-eduhub-shop-listing/parent-eduhub-shop-listing.component').then(m => m.ParentEduHubShopListingComponent)
      }, {
        path: 'school-store/address-input',
        loadComponent: () => import('../core/components/school-store/address-input/address-input.components').then(m => m.AddressInputComponent)
      }, {
        path: 'school-store/my-orders',
        loadComponent: () => import('../core/components/school-store/my-orders/my-orders.components').then(m => m.MyOrdersComponent)
      }, {
        path: 'school-store/return-exchange',
        loadComponent: () => import('../core/components/school-store/return&exchange/return-exchange.components').then(m => m.ReturnExchangeComponent)
      }, {
        path: 'school-store/pickup-refund',
        loadComponent: () => import('../core/components/school-store/pickup&refund/pickup-refund.components').then(m => m.PickupRefundComponent)
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
      }, {
        path: 'school-store/checkout',
        loadComponent: () => import('../core/components/school-store/checkout/checkout.component').then(m => m.CheckoutComponent)
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
