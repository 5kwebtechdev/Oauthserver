import { Component, Input, OnInit, ViewChild, ElementRef, booleanAttribute, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HabitCardComponent } from '../habit-card/habit-card.component';
import { Habit } from '../habit.types';
import { ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { HabitCardService } from '../habit-card/habit-card.service';
import { CoerceBoolean } from '../../../coerceBoolean.decorator';

@Component({
  standalone: true,
  selector: 'habit-list',
  templateUrl: './habit-list.component.html',
  styleUrls: ['./habit-list.component.scss'],
  imports: [CommonModule, HabitCardComponent]
})
export class HabitListComponent implements OnInit, AfterViewInit, OnDestroy {
  /** mode can be 'list' or 'single' — list is default for the wrapper */
  @Input()
  mode: 'list' | 'single' = 'list';

  @Input()
  showContent: boolean = true;

  @Input()
  habits: Habit[] = [];

  @Input()
  habit: Habit | null = null;

  @Input()
  expanded: boolean = false;

  @Input({transform: booleanAttribute})
  @CoerceBoolean()
  inProgress: boolean = false;

  @Input({transform: booleanAttribute})
  @CoerceBoolean()
  isEmpty: boolean = true;

  @Input()
  percentageCompleted : number = 0;

  @Input()
  startTime !: number;

  @Input()
  endTime !: number;

  public currentActive: string = 'habits';

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
      if(!data) return;

      if(data.action && data.time !== this.lastUpdateTime){
        this.expanded = false;
      }
    })
  }

  ngOnInit() {
    // If habit is provided, set properties from it
    if (this.habit) {
      this.startTime = this.habit.startTimeStamp;
      this.endTime = this.habit.endTimeStamp;
      this.inProgress = this.habit.type === 'habits'; // Example, adjust as needed
      this.isEmpty = false;
    }
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

  calculatePercentageCompleted(){
    if(this.startTime < new Date().getTime()) {
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

      if(!this.inProgress) {
        if(this.endTime < new Date().getTime()) {
          this.missedTime = true;
        }else{
          this.isRunningLate = true;
        }
      }
    }
  }

  toggle(){
    this.expanded = !this.expanded;
    if(this.expanded){
      this.lastUpdateTime = new Date().getTime();
      this.habitCardService.updatelast({
        time: this.lastUpdateTime,
        action: true
      })
    }
  }

  getFormattedTime(time: number) {
    const date = new Date(time);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  protected readonly console = console;
}
