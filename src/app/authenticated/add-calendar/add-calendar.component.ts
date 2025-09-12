import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { MindfulSelectorsComponent } from '../../core/components/mindful-selectors/mindful-selectors.component';

@Component({
  selector: 'app-add-calendar',
  templateUrl: './add-calendar.component.html',
  styleUrls: ['./add-calendar.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, MindfulSelectorsComponent]
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
