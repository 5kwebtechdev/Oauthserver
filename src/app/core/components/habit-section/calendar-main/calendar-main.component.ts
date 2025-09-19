import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulInputsModule } from '../../mindful-inputs/mindful-inputs.module';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { ModalController } from '@ionic/angular';

@Component({
  standalone: true,
  selector: 'calendar-main',
  templateUrl: './calendar-main.component.html',
  styleUrls: ['./calendar-main.component.scss'],
  imports: [CommonModule, IonicModule, MindfulNavigatorComponent, MindfulInputsModule, MindfulButtonComponent]
})
export class CalendarMainComponent {
  // Simple wrapper component that displays the mindful navigator with the requested heading
  constructor(private modalCtrl: ModalController) {}

  async openHabitInput() {
    const { HabitInputComponent } = await import('../habit-input/habit-input.component');
    const modal = await this.modalCtrl.create({
      component: HabitInputComponent,
      componentProps: {}
    });
    await modal.present();
  }
}
