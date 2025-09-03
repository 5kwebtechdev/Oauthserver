import { Component, OnInit } from '@angular/core';
import {NgClass, CommonModule} from "@angular/common";
import {HabitCardComponent} from "../../core/components/habit-card/habit-card.component";
import {IonicModule} from "@ionic/angular";
import {FooterComponent} from "../../core/components/footer/footer.component";
import {MindfulDropdownComponent} from "../../core/components/mindful-dropdown/mindful-dropdown.component";
import {MindfulSelectorsComponent} from "../../core/components/mindful-selectors/mindful-selectors.component";
import {MindfulInputsModule} from "../../core/components/mindful-inputs/mindful-inputs.module";
import {MoodSelectorComponent} from "../../core/components/mood-selector/mood-selector.component";

@Component({
  selector: 'app-user-dashboard',
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.scss'],
  imports: [
  CommonModule,
    NgClass,
    HabitCardComponent,
    IonicModule,
    FooterComponent,
    MindfulDropdownComponent,
    MindfulSelectorsComponent,
  MoodSelectorComponent,
    MindfulInputsModule
  ]
})
export class UserDashboardComponent implements OnInit {
  public currentActive: any = 'habits';
  // Minimal properties used by the template
  public userName: string = 'User';
  public userCoins: number = 0;
  public userStreaks: number = 0;
  public userDays: number = 0;
  public userBadges: number = 0;
  // currently selected mood
  public selectedMood: string | null = 'happy';

  constructor() { }

  ngOnInit() {}

  onMoodChange(mood: string) {
    this.selectedMood = mood;
    console.log('mood changed to', mood);
  }

  protected readonly console = console;
}
