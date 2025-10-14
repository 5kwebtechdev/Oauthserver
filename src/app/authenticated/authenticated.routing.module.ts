import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthenticatedComponent } from "./authenticated.component";
import { UserDashboardComponent } from "./user-dashboard/user-dashboard.component";
import { ProfileComponent } from "./profile/profile.component";
import { UserProfileComponent } from '../core/components/user-profile/user-profile.component';
import { TimelineComponent } from "../core/components/habit-section/timeline/timeline.component";
import { AddCalendarComponent } from "./add-calendar/add-calendar.component";
import { HabitDetailComponent } from "../core/components/habit-section/habit-detail/habit-detail.component";


const routes: Routes = [
  {
    path: '',
    component: AuthenticatedComponent,
    children: [

      {
        path: 'user-dashboard',
        component: UserDashboardComponent
      }, {
        path: 'parent-account',
        loadComponent: () => import('./parent-account/parent-account.component').then(m => m.ParentAccountComponent)
      }, {
        path: 'profile/:section',
        component: ProfileComponent
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
        path: 'test',
        loadComponent: () => import('./test/test.component').then(m => m.TestComponent)
      }, {
        path: 'timeline',
        component: TimelineComponent
      }, {
        path: 'add-calendar',
        component: AddCalendarComponent
      }, {
        path: 'habit-detail',
        component: HabitDetailComponent
      }, {
        path: 'habit-input',
        loadComponent: () => import('../core/components/habit-section/habit-input/habit-input.component').then(m => m.HabitInputComponent)
      },
      {
        path: 'content',
        loadComponent: () => import('../core/components/content-card/content-main/content-main.component').then(m => m.ContentMainComponent)
      }, {
        path: 'content/description',
        loadComponent: () => import('../core/components/content-card/content-description/content-description.component').then(m => m.ContentDescriptionComponent)
      }, {
        path: 'quizzes',
        loadComponent: () => import('../core/components/content-card/content-quiz/content-quiz.component').then(m => m.ContentQuizComponent)
      }, {
        path: 'articles',
        loadComponent: () => import('../core/components/content-card/Content-Articles/content-articles.component').then(m => m.ContentArticlesComponent)
      }, {
        path: 'puzzles',
        loadComponent: () => import('../core/components/content-card/content-puzzle/content-puzzle.component').then(m => m.ContentPuzzleComponent)
      }, {
        path: 'content/viewall',
        loadComponent: () => import('../core/components/content-card/content-viewall/content-viewall.component').then(m => m.ContentViewallComponent)
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
        loadComponent: () => import('../core/components/coin-section/coin-page/coin-page.component').then(m => m.CoinPageComponent)
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
        loadComponent: () => import('../core/components/streaks-section/streaks-leaderboard/streaks-leaderboard.component').then(m => m.StreaksLeaderboardComponent)
      }, {
        path: 'reel-expand',
        loadComponent: () => import('../core/components/reel-section/reel-expand/reels-expand.component').then(m => m.ReelsExpandComponent)
      }, {
        path: 'tutors',
        loadComponent: () => import('../core/components/tutor-section/tutor-homepage/tutor-homepage.component').then(m => m.TutorHomepageComponent)
      }, {
        path: 'academy',
        loadComponent: () => import('../core/components/academy-section/academy-home/academy-home.component').then(m => m.AcademyHomeComponent)
      }, {
        path: 'academy/managing-money',
        loadComponent: () => import('../core/components/academy-section/academy-managing-money/academy-managing-money.component').then(m => m.AcademyManagingMoneyComponent)
      }, {
        path: 'academy/course/:id',
        loadComponent: () => import('../core/components/academy-section/academy-course/academy-course.component').then(m => m.AcademyCourseComponent)
      }, {
        path: 'trophies',
        loadComponent: () => import('../core/components/trophy-section/trophy-page/trophy-page.component').then(m => m.TrophyPageComponent)
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
