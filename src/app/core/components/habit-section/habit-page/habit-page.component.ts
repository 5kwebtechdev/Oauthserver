import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HabitCardComponent } from '../habit-card/habit-card.component';
import { HabitListComponent } from '../habit-list/habit-list.component';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulBadgeComponent } from '../../mindful-badge/mindful-badge.component';
import { AdBannerComponent } from '../../ad-banner/ad-banner.component';
import { MindfulInputsModule } from '../../mindful-inputs/mindful-inputs.module';
import { HabitService } from '../habit.service';
import { Habit } from '../habit.types';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'habit-page',
  templateUrl: './habit-page.component.html',
  styleUrls: ['./habit-page.component.scss'],
  imports: [CommonModule, IonicModule, HabitCardComponent, MindfulNavigatorComponent, MindfulInputsModule, HabitListComponent, MindfulBadgeComponent, AdBannerComponent]
})
export class HabitPageComponent implements OnInit, OnDestroy {
  // Simple page scaffold for listing and managing habits
  public title = 'Habits';
  // Main category tabs (types)
  public currentMainTab: 'habits' | 'tasks' = 'habits';
  public showContent: boolean = true;

  // Sub-category filters
  public subFilter: 'journey' | 'priorities' | 'routine' | 'all' = 'all';
  public journeySubFilter: 'pending' | 'ongoing' | 'completed' | 'all' = 'all';
  public prioritySubFilter: 'high' | 'medium' | 'low' | 'all' = 'all';
  public routineSubFilter: 'morning' | 'evening' | 'night' | 'all' = 'all';

  public allHabits: Habit[] = [];
  public filteredHabits: Habit[] = [];
  private subscription: Subscription = new Subscription();

  // Single mode display
  public showSingleMode: boolean = false;
  public singleModeHabit: Habit | null = null;

  constructor(private habitService: HabitService, private router: Router) {}

  ngOnInit() {
    // Check for navigation state (new habit from habit-input)
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      const state = navigation.extras.state as any;
      if (state.newHabit && state.showSingleMode) {
        this.singleModeHabit = state.newHabit;
        this.showSingleMode = true;
        this.showContent = false; // Hide the filter UI in single mode
      }
    }

    this.subscription = this.habitService.getHabits().subscribe(habits => {
      this.allHabits = habits;
      this.applyFilters();
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  selectMainTab(tab: 'habits' | 'tasks') {
    this.currentMainTab = tab;
    this.applyFilters();
  }

  selectSubFilter(filter: 'journey' | 'priorities' | 'routine' | 'all') {
    this.subFilter = filter;
    this.applyFilters();
  }

  selectJourneySubFilter(filter: 'pending' | 'ongoing' | 'completed' | 'all') {
    this.journeySubFilter = filter;
    this.applyFilters();
  }

  selectPrioritySubFilter(filter: 'high' | 'medium' | 'low' | 'all') {
    this.prioritySubFilter = filter;
    this.applyFilters();
  }

  selectRoutineSubFilter(filter: 'morning' | 'evening' | 'night' | 'all') {
    this.routineSubFilter = filter;
    this.applyFilters();
  }

  private applyFilters() {
    let filtered = [...this.allHabits];

    // First filter by main tab (type)
    filtered = filtered.filter(habit => habit.type === this.currentMainTab);

    // Then apply sub-filter
    switch (this.subFilter) {
      case 'journey':
        if (this.journeySubFilter !== 'all') {
          filtered = this.filterByJourney(filtered, this.journeySubFilter);
        }
        break;
      case 'priorities':
        if (this.prioritySubFilter !== 'all') {
          filtered = filtered.filter(habit => habit.priority === this.prioritySubFilter);
        }
        break;
      case 'routine':
        if (this.routineSubFilter !== 'all') {
          filtered = filtered.filter(habit => habit.selectedRoutine.toLowerCase() === this.routineSubFilter);
        }
        break;
      case 'all':
        // No additional filtering
        break;
    }

    this.filteredHabits = filtered;
  }

  private filterByJourney(habits: Habit[], status: 'pending' | 'ongoing' | 'completed'): Habit[] {
    const now = new Date().getTime();

    switch (status) {
      case 'pending':
        return habits.filter(habit => habit.startTimeStamp > now);
      case 'ongoing':
        return habits.filter(habit => habit.startTimeStamp <= now && habit.endTimeStamp >= now);
      case 'completed':
        return habits.filter(habit => habit.endTimeStamp < now);
      default:
        return habits;
    }
  }

  onOpenCalendar() {
    // Placeholder: open calendar modal or navigate to calendar view
    // Implement real behaviour later as needed
    // eslint-disable-next-line no-console
    console.log('Calendar button clicked');
  }
}
