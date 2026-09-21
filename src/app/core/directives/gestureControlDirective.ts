import {
  Directive,
  ElementRef,
  Input,
  AfterViewInit,
  OnDestroy,
  NgZone,
  EventEmitter,
  Output
} from "@angular/core";
import { GestureController } from "@ionic/angular";

@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: "[long-press]"
})

export class LongPressDirective implements AfterViewInit, OnDestroy {

  @Output() tap = new EventEmitter();
  @Output() press = new EventEmitter();
  @Input() delay = 300;
  action: any; //not stacking actions

  private positions = {
    start: {
      x: undefined as unknown as number,
      y: undefined as unknown as number
    },
    current: {
      x: undefined as unknown as number,
      y: undefined as unknown as number,
    }
  }

  private longPressActive = false;
  private gesture?: ReturnType<GestureController['create']>;
  private suppressClickUntil = 0;
  private suppressClick = (event: Event) => {
    if (Date.now() < this.suppressClickUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  constructor(
    private el: ElementRef,
    private gestureCtrl: GestureController,
    private zone: NgZone
  ) { }

  ngAfterViewInit() {
    this.el.nativeElement.addEventListener('click', this.suppressClick, true);
    this.loadLongPressOnElement();
  }

  ngOnDestroy(): void {
    clearTimeout(this.action);
    this.gesture?.destroy();
    this.el.nativeElement.removeEventListener('click', this.suppressClick, true);
  }

  loadLongPressOnElement() {
    const gesture = this.gestureCtrl.create({
      el: this.el.nativeElement,
      threshold: 0,
      gestureName: 'long-press',
      onStart: ev => {
        this.longPressActive = true;
        this.longPressAction();

        this.positions = {
          start: { x: ev.startX, y: ev.startY },
          current: { x: ev.currentX, y: ev.currentY }
        };

      },
      onMove: ev => {
        this.positions.current = { x: ev.currentX, y: ev.currentY };
        if (Math.abs(ev.currentX - ev.startX) > 15 || Math.abs(ev.currentY - ev.startY) > 15) {
          this.longPressActive = false;
          clearTimeout(this.action);
        }
      },
      onEnd: ev => {
        this.longPressActive = false;
      }
    });
    gesture.enable(true);
    this.gesture = gesture;
  }

  private longPressAction() {
    if (this.action) {
      clearInterval(this.action);
    }
    this.action = setTimeout(() => {
      this.zone.run(() => {
        // Check distance
        const xDistance = Math.abs(this.positions.start.x - this.positions.current.x);
        const yDistance = Math.abs(this.positions.start.y - this.positions.current.y);
        if(xDistance > 15 || yDistance > 15)
          // User dragged finger
          return;

        if (this.longPressActive === true) {
          this.longPressActive = false;
          this.suppressClickUntil = Date.now() + 1000;
          this.press.emit();
        } else {
          this.tap.emit();
        }
      });
    }, this.delay);
  }
}
