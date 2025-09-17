import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HabitCardComponent } from '../habit-card/habit-card.component';
import { HabitListComponent } from './habit-list.component';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulBadgeComponent } from '../../mindful-badge/mindful-badge.component';
import { MindfulInputsModule } from '../../mindful-inputs/mindful-inputs.module';
import { HabitService } from '../habit.service';
import { Habit } from '../habit.types';
import { Subscription } from 'rxjs';
import { Router, RouterModule } from '@angular/router';

@Component({
  standalone: true,
  selector: 'habit-page',
  templateUrl: './habit-page.component.html',
  styleUrls: ['./habit-page.component.scss'],
  imports: [CommonModule, IonicModule, HabitCardComponent, HabitListComponent, MindfulNavigatorComponent, MindfulInputsModule, MindfulBadgeComponent, RouterModule]
})
export class HabitPageComponent implements OnInit, OnDestroy {
  // Simple page scaffold for listing and managing habits
  public title = 'Habits';
  // Main category tabs (types)
  public currentMainTab: 'habits' | 'tasks' = 'habits';
  public showContent: boolean = true;

  // Sub-category filters
  public subFilter: 'journey' | 'priorities' | 'routine' | 'all' = 'all';
  public journeySubFilter: 'pending' | 'ongoing' | 'completed' | 'all' = 'pending';
  public prioritySubFilter: 'high' | 'medium' | 'low' | 'all' = 'high';
  public routineSubFilter: 'morning' | 'evening' | 'night' | 'all' = 'morning';

  // Habits data
  public allHabits: Habit[] = [];
  public filteredHabits: Habit[] = [];
  public selectedDate: Date = new Date(); // Current selected date
  public currentTimestamp: number = Date.now(); // Current timestamp for habit status
  private subscriptions: Subscription = new Subscription();
  public loading: boolean = false; // Track API loading state

  // Timer to update current timestamp
  private timestampInterval: any;

  // Single mode display
  public showSingleMode: boolean = false;
  public singleModeHabit: Habit | null = null;

  constructor(private habitService: HabitService, private router: Router) { }

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

    // Subscribe to habit changes
    this.subscriptions.add(
      this.habitService.getHabits().subscribe(habits => {
        this.allHabits = habits;
        this.applyFilters();
      })
    );

    // Load habits for today initially
    this.loadHabitsForSelectedDate(new Date());

    // Set up timer to update current timestamp every minute
    this.timestampInterval = setInterval(() => {
      this.currentTimestamp = Date.now();
      this.applyFilters(); // Re-apply filters to update habit status
    }, 60000); // Update every minute
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();

    // Clear the timestamp update interval
    if (this.timestampInterval) {
      clearInterval(this.timestampInterval);
    }
  }

  /**
   * Handle date selection from the mindful-week component
   */
  onDateSelected(date: Date) {
    this.selectedDate = date;
    this.loadHabitsForSelectedDate(date);
  }

  /**
   * Load habits for the selected date
   */
  loadHabitsForSelectedDate(date: Date) {
    this.loading = true;
    const formattedDate = this.habitService.formatDateToYYYYMMDD(date);

    this.subscriptions.add(
      this.habitService.loadHabitsForDate(formattedDate).subscribe({
        next: () => {
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading habits:', error);
          this.loading = false;
        }
      })
    );
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
    // Navigate to the new habit detail page (calendar/overview can be shown there)
    this.router.navigateByUrl('/authed/habit-detail');
  }

  // Handler invoked when a habit row is opened from the habit-list component
  onOpenHabit(habit: Habit) {
    if (!habit) return;
    this.singleModeHabit = habit;
    this.showSingleMode = true;
    this.showContent = false;
  }

  // Handler invoked when the Done button is clicked in the habit-list component
  onDoneHabit(habit: Habit) {
    // Placeholder: currently just logs. Replace with update/delete logic as needed.
    console.log('Mark done called for habit:', habit?.id || habit?.title);
  }
}
