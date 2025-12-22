import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { HabitPageContentComponent } from '../habit-page-content/habit-page-content.component';
import { Router } from '@angular/router';

/**
 * Habit page wrapper component that provides navigation context
 * for the habit page content component.
 */
@Component({
  standalone: true,
  selector: 'habit-page',
  template: `<ion-content>
    <mindful-navigator heading="Your Universe" [rightIcon]="'/assets/Icons-Neutral/Icon-Calendar.png'"
        rightIconAlt="Calendar" (rightIconClick)="onOpenCalendar()" (back)="onBack()"></mindful-navigator>

    <habit-page-content style="padding:0px 16px;"></habit-page-content>
</ion-content>`,
  styles: [],
  imports: [
    CommonModule,
    IonicModule,
    MindfulNavigatorComponent,
    HabitPageContentComponent
  ]
})
export class HabitPageComponent {
  constructor(private router: Router) { }

  /**
   * Navigate to calendar main page
   */
  onOpenCalendar(): void {
    this.router.navigateByUrl('/authed/calendar-main');
  }

  /**
   * Navigate back to user dashboard
   */
  onBack(): void {
    this.router.navigate(['/authed/user-dashboard']).catch(() => {
      this.router.navigateByUrl('/authed');
    });
  }
}

// Test code from habit-page.component.spec.ts
/*
import { ComponentFixture, TestBed } from '@angular/core/testing';

describe('HabitPageComponent', () => {
  let component: HabitPageComponent;
  let fixture: ComponentFixture<HabitPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HabitPageComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HabitPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
*/
