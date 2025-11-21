import { Component, OnInit } from '@angular/core';
import { CommonModule } from "@angular/common";
import { ModalController } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { NotesComponent } from '../../core/components/notes/notes.component';
import { IonicModule } from "@ionic/angular";
import { MindfulInputsModule } from "../../core/components/mindful-inputs/mindful-inputs.module";
import { MindfulCoinsStatsComponent } from '../../core/components/mindful-coins-stats/mindful-coins-stats.component';


@Component({
    selector: 'app-parent-account',
    templateUrl: './parent-account.component.html',
    styleUrls: ['./parent-account.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        IonicModule,
        MindfulInputsModule,
        MindfulCoinsStatsComponent,
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
