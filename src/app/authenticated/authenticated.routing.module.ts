import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import {AuthenticatedComponent} from "./authenticated.component";
import {UserDashboardComponent} from "./user-dashboard/user-dashboard.component";
import {ProfileComponent} from "./profile/profile.component";
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
