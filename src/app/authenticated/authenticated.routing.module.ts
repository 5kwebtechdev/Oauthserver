import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import {AuthenticatedComponent} from "./authenticated.component";
import {UserDashboardComponent} from "./user-dashboard/user-dashboard.component";
import {ProfileComponent} from "./profile/profile.component";
import {UserProfileComponent} from '../core/components/user-profile/user-profile.component';
import {TimelineComponent} from "../core/components/habit-section/timeline/timeline.component";
import {AddCalendarComponent} from "./add-calendar/add-calendar.component";
import {HabitDetailComponent} from "../core/components/habit-section/habit-detail/habit-detail.component";


const routes: Routes = [
  {
    path: 'home',
    component: UserDashboardComponent
  },{
    path: 'profile/:section',
    component: ProfileComponent
  },{
    path: 'user-profile',
    component: UserProfileComponent
  },{
    path: 'edit-profile',
    loadComponent: () => import('../core/components/user-profile/edit-profile/edit-profile.component').then(m => m.EditProfileComponent)
  },{
    path: 'reset-pasword',
    loadComponent: () => import('../core/components/user-profile/reset-pasword/reset-pasword.component').then(m => m.ResetPaswordComponent)
  },{
    path: 'notifications',
    loadComponent: () => import('../core/components/user-profile/notification/notification.component').then(m => m.NotificationComponent)
  },{
    path: 'refer-friend',
    loadComponent: () => import('../core/components/user-profile/refer-friend/refer-friend.component').then(m => m.ReferFriendComponent)
  },{
    path: 'test',
    loadComponent: () => import('./test/test.component').then(m => m.TestComponent)
  },{
    path: 'timeline',
    component: TimelineComponent
  },{
    path: 'add-calendar',
    component: AddCalendarComponent
  },{
    path: 'habit-detail',
    component: HabitDetailComponent
  },{
    path: 'habit-input',
    loadComponent: () => import('../core/components/habit-section/habit-input/habit-input.component').then(m => m.HabitInputComponent)
  },{
    path: '',
    component: AuthenticatedComponent
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class AuthenticatedRoutingModule { }
