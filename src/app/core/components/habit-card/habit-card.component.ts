import {Component, Input, OnInit, ViewChild, ElementRef, booleanAttribute} from '@angular/core';
import {NgClass, NgIf} from "@angular/common";
import {LongPressDirective} from "../../directives/gestureControlDirective";
import {HabitCardService} from "./habit-card.service";
import {CoerceBoolean} from "../../coerceBoolean.decorator";

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'habit-card',
  templateUrl: './habit-card.component.html',
  styleUrls: ['./habit-card.component.scss'],
  imports: [
    NgClass,
    NgIf,
    LongPressDirective
  ]
})
export class HabitCardComponent  implements OnInit {

  @Input()
  mode: 'single' | 'list' = 'single';

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

  // Properties for list mode
  public currentActive: string = 'habits';
  public showContent: boolean = false;

  public isRunningLate: boolean = false;
  public missedTime: boolean = false;

  private lastUpdateTime: number = 0;

  @ViewChild('percentageWrapper', { static: true }) percentageWrapper!: ElementRef;

  constructor(
    private habitCardService: HabitCardService
  ) {
    this.habitCardService.lastToggled$.subscribe((data: any) => {
      if(!data) return;

      if(data.action && data.time !== this.lastUpdateTime){
        this.expanded = false;
      }
    })
  }

  ngOnInit() {
    this.calculatePercentageCompleted();
    setInterval(()=>{
      this.calculatePercentageCompleted();
    }, 6000)
    console.log(this.startTime);
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
      this.percentageWrapper.nativeElement.style.width = `calc(${this.percentageCompleted}% - var(--card_offset) - 4px)`;

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

  showContentNow(){
    this.showContent = true;
  }

  protected readonly console = console;

  getFormattedTime(time: number) {
    const date = new Date(time);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}
