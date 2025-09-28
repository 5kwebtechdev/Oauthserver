import { Component, OnInit } from '@angular/core';
import { CommonModule } from "@angular/common";
import { ModalController } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { NotesComponent } from '../../core/components/notes/notes.component';
import { HabitCardComponent } from "../../core/components/habit-section/habit-card/habit-card.component";
import { ContentCardComponent } from "../../core/components/content-card/content-card.component";
import { AdBannerComponent } from '../../core/components/ad-banner/ad-banner.component';
import { TutorCardComponent } from "../../core/components/tutor-section/tutor-card/tutor-card.component";
import { ReelsCardComponent } from "../../core/components/reel-section/reels-card/reels-card.component";
import { JournalsComponent } from "../../core/components/journals/journals.component";
import { AcademySectionComponent } from "../../core/components/academy-section/academy-section.component";
import { IonicModule } from "@ionic/angular";
import { MindfulInputsModule } from "../../core/components/mindful-inputs/mindful-inputs.module";
import { MoodSelectorComponent } from "../../core/components/mood-selector/mood-selector.component";
import { MindfulSpeechBubbleComponent } from '../../core/components/mindful-speech-bubble/mindful-speech-bubble.component';
import { MindfulPetComponent } from '../../core/components/mindful-pet/mindful-pet.component';
import { MindfulCoinsStatsComponent } from '../../core/components/mindful-coins-stats/mindful-coins-stats.component';
import { MindfulCardHeaderComponent } from '../../core/components/mindful-navigator/mindful-card-header/mindful-card-header.component';
import { ViewAllComponent } from '../../core/components/mindful-navigator/view-all/view-all.component';
import { FooterComponent } from '../../core/components/footer/footer.component';


@Component({
    selector: 'app-parent-account',
    templateUrl: './parent-account.component.html',
    styleUrls: ['./parent-account.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        HabitCardComponent,
        AdBannerComponent,
        ContentCardComponent,
        ReelsCardComponent,
        TutorCardComponent,
        JournalsComponent,
        AcademySectionComponent,
        IonicModule,
        MoodSelectorComponent,
        MindfulInputsModule,
        MindfulPetComponent,
        MindfulSpeechBubbleComponent,
        MindfulCoinsStatsComponent,
        MindfulCardHeaderComponent,
        ViewAllComponent,
        FooterComponent,
    ]
})
export class ParentAccountComponent implements OnInit {
    public userName: string = 'User';
    public userCoins: number = 0;
    public userStreaks: number = 0;
    public userDays: number = 0;
    public userBadges: number = 0;
    public selectedMood: string | null = 'happy';

    constructor(private modalCtrl: ModalController, private router: Router) { }

    async openNotes() {
        this.router.navigate(['/authed/notes']);
    }

    ngOnInit() { }

    get greetingMessage(): string {
        const name = this.userName || 'there';
        return `Hey ${name}, Still Panda! \n\n🌟 You've got 5 tasks, 2 habits, and a challenge waiting for you today. Let’s go!`;
    }

    onMoodChange(mood: string) {
        this.selectedMood = mood;
        console.log('mood changed to', mood);
    }

    openCalendar() {
        this.router.navigateByUrl('/calendar-main');
    }

    protected readonly console = console;
}
