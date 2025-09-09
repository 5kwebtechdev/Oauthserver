import { Component, OnInit } from '@angular/core';
import { CommonModule } from "@angular/common";
import { ModalController } from '@ionic/angular';
import { NotesComponent } from '../../core/components/notes/notes.component';
import {HabitCardComponent} from "../../core/components/habit-card/habit-card.component";
import {ChallengeCardComponent} from "../../core/components/challenge-card/challenge-card.component";
import {ContentCardComponent} from "../../core/components/content-card/content-card.component";
import {TutorCardComponent} from "../../core/components/tutor-card/tutor-card.component";
import {ReelsCardComponent} from "../../core/components/reels-card/reels-card.component";
import {JournalsComponent} from "../../core/components/journals/journals.component";
import {AcademySectionComponent} from "../../core/components/academy-section/academy-section.component";
import {IonicModule} from "@ionic/angular";
import {MindfulInputsModule} from "../../core/components/mindful-inputs/mindful-inputs.module";
import {MoodSelectorComponent} from "../../core/components/mood-selector/mood-selector.component";
import {AdBannerComponent} from "../../core/components/ad-banner/ad-banner.component";

@Component({
  selector: 'app-user-dashboard',
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.scss'],
  imports: [
  CommonModule,
    HabitCardComponent,
    ChallengeCardComponent,
    ContentCardComponent,
  ReelsCardComponent,
    TutorCardComponent,
    JournalsComponent,
  AcademySectionComponent,
    IonicModule,
  MoodSelectorComponent,
  MindfulInputsModule,
  NotesComponent,
  AdBannerComponent
  ]
})
export class UserDashboardComponent implements OnInit {
  // Minimal properties used by the template
  public userName: string = 'User';
  public userCoins: number = 0;
  public userStreaks: number = 0;
  public userDays: number = 0;
  public userBadges: number = 0;
  // currently selected mood
  public selectedMood: string | null = 'happy';

  constructor(private modalCtrl: ModalController) { }

  async openNotes() {
    const modal = await this.modalCtrl.create({
      component: NotesComponent,
      componentProps: {}
    });
    await modal.present();
  }

  ngOnInit() {}

  onMoodChange(mood: string) {
    this.selectedMood = mood;
    console.log('mood changed to', mood);
  }

  protected readonly console = console;
}
