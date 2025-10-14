import { Component, Input, OnInit, ViewChild, ElementRef, booleanAttribute, AfterViewInit, OnDestroy } from '@angular/core';
import { NgClass, NgIf, CommonModule, NgForOf } from "@angular/common";
import { RouterModule } from '@angular/router';
import { LongPressDirective } from "../../../directives/gestureControlDirective";
import { MindfulButtonComponent } from "../../mindful-button/mindful-button.component";
import { MindfulCardHeaderComponent } from '../../mindful-navigator/mindful-card-header/mindful-card-header.component';
import { ViewAllComponent } from '../../mindful-navigator/view-all/view-all.component';
import { ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { HabitCardService } from 'src/app/core/components/habit-section/habit-card/habit-card.service';
import { HabitApi } from 'src/app/core/api/habit.api';
import { TaskApi } from 'src/app/core/api/task.api';
import { CoerceBoolean } from "../../../coerceBoolean.decorator";
import { Habit } from '../habit.types';
import { MindfulBadgeComponent } from '../../mindful-badge/mindful-badge.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'habit-card',
  templateUrl: './habit-card.component.html',
  styleUrls: ['./habit-card.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    NgClass,
    NgForOf,
    LongPressDirective,
    MindfulButtonComponent,
    MindfulCardHeaderComponent,
    ViewAllComponent,
    RouterModule,
    MindfulBadgeComponent
  ]
})
export class HabitCardComponent implements OnInit, AfterViewInit, OnDestroy {

  @Input()
  habit: Habit | null = null;

  @Input()
  mode: 'single' | 'list' = 'single';

  @Input()
  expanded: boolean = false;

  @Input({ transform: booleanAttribute })
  @CoerceBoolean()
  inProgress: boolean = false;

  @Input({ transform: booleanAttribute })
  @CoerceBoolean()
  isEmpty: boolean = true;

  @Input()
  percentageCompleted: number = 0;

  @Input()
  startTime !: number;

  @Input()
  endTime !: number;

  // Properties for list mode
  public currentActive: string = 'habits';
  public showContent: boolean = false;

  public isRunningLate: boolean = false;
  public missedTime: boolean = false;

  public habits: Habit[] = [];
  public tasks: any[] = [];
  public hasHabits: boolean = false;
  public hasTasks: boolean = false;
  private habitSubscription?: Subscription;
  private taskSubscription?: Subscription;

  private lastUpdateTime: number = 0;

  public maxItemsToShow: number = 3;  // percentageWrapper is inside the single-card template which is rendered conditionally,
  // so query it with static: false and guard access in code.
  @ViewChild('percentageWrapper', { static: false }) percentageWrapper?: ElementRef;

  private _intervalId: any;

  constructor(
    private habitCardService: HabitCardService,
    private habitApi: HabitApi,
    private taskApi: TaskApi,
    private modalCtrl: ModalController,
    private router: Router
  ) {
    this.habitCardService.lastToggled$.subscribe((data: any) => {
      if (!data) return;

      if (data.action && data.time !== this.lastUpdateTime) {
        this.expanded = false;
      }
    });
  }

  /**
   * Handle long-press (1.5s) by navigating to the habit detail page.
   * If a habit is available, pass it through navigation state so the
   * HabitDetailComponent can receive it via @Input or navigation extras.
   */
  async onLongPress() {
    try {
      if (this.habit) {
        await this.router.navigateByUrl('/authed/habit-detail', { state: { habit: this.habit } } as any);
      } else {
        await this.router.navigateByUrl('/authed/habit-detail');
      }
    } catch (err) {
      console.error('Navigation to habit-detail failed', err);
    }
  }

  async openHabitPage() {
    // Navigate to the habit page route so the user lands on the full Habit Page
    await this.router.navigateByUrl('/habit-page');
  }

  async openTimeline() {
    // Navigate to the app timeline page. The AuthenticatedModule is mounted at '/authed'
    // so the timeline route is available at '/authed/timeline'.
    await this.router.navigateByUrl('/authed/timeline');
  }

  async openHabitInput() {
    // Open the habit input as a modal
    const { HabitInputComponent } = await import('../habit-input/habit-input.component');
    const modal = await this.modalCtrl.create({
      component: HabitInputComponent,
      componentProps: {}
    });
    await modal.present();
  }

  ngOnInit() {
    // If habit is provided, set properties from it
    if (this.habit) {
      this.startTime = this.habit.startTimeStamp;
      this.endTime = this.habit.endTimeStamp;
      this.inProgress = this.habit.type === 'habits'; // Example, adjust as needed
      this.isEmpty = false;
    }

    // If in list mode, load data based on current active tab
    if (this.mode === 'list') {
      this.isEmpty = true; // Default to empty until we know otherwise

      // Load data for current active tab
      this.switchTab(this.currentActive);
    }

    console.log(this.startTime);
  }  /**
   * Load habits from the API
   */
  loadHabits() {
    // Get current date in YYYY-MM-DD format
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];

    // Get all habits using the API
    this.habitApi.getAllHabits().subscribe({
      next: (habits) => {
        this.habits = habits || [];
        this.hasHabits = this.habits.length > 0;
        this.updateEmptyState();
      },
      error: (error) => {
        console.error('Error fetching habits:', error);
        this.habits = [];
        this.hasHabits = false;
        this.updateEmptyState();
      }
    });
  }

  /**
   * Load tasks from the API
   */
  loadTasks() {
    this.taskApi.getAllTasks().subscribe({
      next: (tasks) => {
        // Ensure tasks have the required properties for display
        this.tasks = (tasks || []).map((task: any) => {
          // Make sure task has the needed properties to be displayed as a Habit
          return {
            ...task,
            type: 'tasks', // Set type to 'tasks'
            startTimeStamp: task.startTimeStamp || (task.startDate ? new Date(task.startDate).getTime() : 0),
            endTimeStamp: task.endTimeStamp || (task.endDate ? new Date(task.endDate).getTime() : 0),
            // Add any other required properties
          };
        });

        this.hasTasks = this.tasks.length > 0;
        this.updateEmptyState();
      },
      error: (error) => {
        console.error('Error fetching tasks:', error);
        this.tasks = [];
        this.hasTasks = false;
        this.updateEmptyState();
      }
    });
  }

  /**
   * Update the empty state based on current tab
   */
  updateEmptyState() {
    if (this.currentActive === 'habits') {
      this.isEmpty = !this.hasHabits;
    } else if (this.currentActive === 'tasks') {
      this.isEmpty = !this.hasTasks;
    } else {
      // 'all' tab
      this.isEmpty = !this.hasHabits && !this.hasTasks;
    }

    this.showContent = !this.isEmpty;
  }

  /**
   * Determines if a habit is currently in progress based on time
   * @param habit The habit to check
   * @returns boolean true if the habit is currently in progress
   */
  isHabitInProgress(habit: Habit): boolean {
    if (!habit) return false;

    const now = new Date().getTime();
    return habit.startTimeStamp <= now && now <= habit.endTimeStamp;
  }

  /**
   * Switch between tabs
   * @param tab The tab to switch to: 'all', 'habits', or 'tasks'
   */
  switchTab(tab: string) {
    this.currentActive = tab;

    // Load data if needed
    if (tab === 'habits' && this.habits.length === 0) {
      this.loadHabits();
    } else if (tab === 'tasks' && this.tasks.length === 0) {
      this.loadTasks();
    } else if (tab === 'all') {
      if (this.habits.length === 0) this.loadHabits();
      if (this.tasks.length === 0) this.loadTasks();
    }

    this.updateEmptyState();
  } ngAfterViewInit(): void {
    // run calculation after view (and the percentageWrapper element) is available
    this.calculatePercentageCompleted();
    this._intervalId = setInterval(() => {
      this.calculatePercentageCompleted();
    }, 6000);
  }

  ngOnDestroy(): void {
    if (this._intervalId) {
      clearInterval(this._intervalId);
    }

    // Unsubscribe from subscriptions
    if (this.habitSubscription) {
      this.habitSubscription.unsubscribe();
    }

    if (this.taskSubscription) {
      this.taskSubscription.unsubscribe();
    }
  } calculatePercentageCompleted() {
    if (this.startTime < new Date().getTime()) {
      let duration = this.endTime - this.startTime;
      this.percentageCompleted = Math.floor((new Date().getTime() - this.startTime) / duration * 100);

      if (this.percentageCompleted > 100) {
        this.percentageCompleted = 100;
      }
      if (this.percentageCompleted < 0) {
        this.percentageCompleted = 0;
      }

      this.percentageCompleted = Math.floor(this.percentageCompleted);
      // Guard the element reference in case the template didn't render the single-card view
      if (this.percentageWrapper && this.percentageWrapper.nativeElement) {
        this.percentageWrapper.nativeElement.style.width = `calc(${this.percentageCompleted}% - var(--card_offset) - 4px)`;
      }

      if (!this.inProgress) {
        if (this.endTime < new Date().getTime()) {
          this.missedTime = true;
        } else {
          this.isRunningLate = true;
        }
      }
    }
  }

  toggle() {
    this.expanded = !this.expanded;
    if (this.expanded) {
      this.lastUpdateTime = new Date().getTime();
      this.habitCardService.updatelast({
        time: this.lastUpdateTime,
        action: true
      })
    }
  }

  showContentNow() {
    this.showContent = true;
  }

  protected readonly console = console;

  getFormattedTime(time: number) {
    if (!time) {
      return '00:00';
    }

    try {
      const date = new Date(time);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch (error) {
      console.error('Error formatting time:', error);
      return '00:00';
    }
  }

  /**
   * Safely get the first tag or routine name
   */
  getTagOrRoutine(): string {
    if (this.habit && this.habit.tags && Array.isArray(this.habit.tags) && this.habit.tags.length > 0) {
      return this.habit.tags[0];
    } else if (this.habit && this.habit.selectedRoutine) {
      return this.habit.selectedRoutine;
    } else {
      return 'Routine';
    }
  }

  getRoutine(): string {
    // this.console.log('Current routine:', this.habit?.selectedRoutine);
    if (this.habit && this.habit.selectedRoutine) {
      // this.console.log('Current routine:', this.habit.selectedRoutine);
      return this.habit.selectedRoutine;
    }
    return '';
  }

  /**
   * Safely get the coin reward
   */
  getCoinReward(): number {
    return this.habit && this.habit.coinReward ? this.habit.coinReward : 0;
  }

  /**
   * Return the asset path for the routine icon based on habit.selectedRoutine.
   * Accepts values like 'morning', 'evening', 'night'. Falls back to Morning.
   */
  getRoutineIcon(): string {
    try {
      const routine = (this.habit && this.habit.selectedRoutine) ? String(this.habit.selectedRoutine).toLowerCase() : 'morning';
      // Normalize to expected filename casing: Icon-Routine-Morning.png etc.
      const name = 'Icon-Routine-' + routine.charAt(0).toUpperCase() + routine.slice(1) + '.png';
      return `/assets/Icons-Neutral/${name}`;
    } catch (e) {
      return '/assets/Icons-Neutral/Icon-Routine-Morning.png';
    }
  }
}
