import { Component, Input, OnInit, ViewChild, ElementRef, booleanAttribute, AfterViewInit, OnDestroy } from '@angular/core';
import { NgClass, NgIf, CommonModule } from "@angular/common";
import { LongPressDirective } from "../../../directives/gestureControlDirective";
import { MindfulButtonComponent } from "../../mindful-button/mindful-button.component";
import { MindfulCardHeaderComponent } from '../../mindful-navigator/mindful-card-header/mindful-card-header.component';
import { ViewAllComponent } from '../../mindful-navigator/view-all/view-all.component';
import { ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { HabitCardService } from 'src/app/core/components/habit-section/habit-card/habit-card.service';
import { CoerceBoolean } from "../../../coerceBoolean.decorator";
import { Habit } from '../habit.types';
import { MindfulBadgeComponent } from '../../mindful-badge/mindful-badge.component';

@Component({
  selector: 'habit-card',
  templateUrl: './habit-card.component.html',
  styleUrls: ['./habit-card.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    NgClass,
    LongPressDirective,
    MindfulButtonComponent,
  MindfulCardHeaderComponent,
  ViewAllComponent,
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

  private lastUpdateTime: number = 0;

  // percentageWrapper is inside the single-card template which is rendered conditionally,
  // so query it with static: false and guard access in code.
  @ViewChild('percentageWrapper', { static: false }) percentageWrapper?: ElementRef;

  private _intervalId: any;

  constructor(
    private habitCardService: HabitCardService,
    private modalCtrl: ModalController,
    private router: Router
  ) {
    this.habitCardService.lastToggled$.subscribe((data: any) => {
      if (!data) return;

      if (data.action && data.time !== this.lastUpdateTime) {
        this.expanded = false;
      }
    })
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
    console.log(this.startTime);
  }

  ngAfterViewInit(): void {
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
  }

  calculatePercentageCompleted() {
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

  /**
   * Safely get the coin reward
   */
  getCoinReward(): number {
    return this.habit && this.habit.coinReward ? this.habit.coinReward : 0;
  }
}
