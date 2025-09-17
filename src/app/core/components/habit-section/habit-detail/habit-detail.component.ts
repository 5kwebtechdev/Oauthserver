import { Component, Input } from '@angular/core';
import { Habit } from '../habit.types';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulSpeechBubbleComponent } from '../../mindful-speech-bubble/mindful-speech-bubble.component';
import { MindfulPetComponent } from '../../mindful-pet/mindful-pet.component';
import { MindfulCoinsStatsComponent } from '../../mindful-coins-stats/mindful-coins-stats.component';
import { MindfulCalendarComponent } from '../../mindful-inputs/mindful-calendar/mindful-calendar.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { MindfulInputsModule } from '../../mindful-inputs/mindful-inputs.module';

@Component({
  standalone: true,
  selector: 'habit-detail',
  templateUrl: './habit-detail.component.html',
  styleUrls: ['./habit-detail.component.scss'],
  imports: [CommonModule, IonicModule, MindfulNavigatorComponent, MindfulSpeechBubbleComponent, MindfulPetComponent, MindfulCoinsStatsComponent, MindfulCalendarComponent, MindfulButtonComponent, MindfulInputsModule]
})
export class HabitDetailComponent {
  public title: string = 'Habit Details';

  @Input()
  public habit: Habit | null = null;

  onEdit() {
    // TODO: wire editing flow (open habit-input modal or navigate to edit page)
    console.log('Edit action triggered for habit detail');
  }
}
