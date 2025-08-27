import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-add-calendar',
  templateUrl: './add-calendar.component.html',
  styleUrls: ['./add-calendar.component.scss'],
  standalone: false
})
export class AddCalendarComponent {
  public currentActive = 'habits';

  constructor() { }

  getCurrentTitle() {
    if(this.currentActive === 'habits'){
      return 'Habit';
    }else if(this.currentActive === 'tasks'){
      return 'Task';
    }else{
      return 'Time Table';
    }
  }
}
