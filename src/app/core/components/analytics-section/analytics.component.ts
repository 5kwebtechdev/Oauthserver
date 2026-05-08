import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { MindfulNavigatorComponent } from '../mindful-navigator/mindful-navigator.component';
import { NavigationService } from '../../services/navigation.service';
import { StreaksSectionComponent } from '../streaks-section/streaks-section.component';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [IonicModule, MindfulNavigatorComponent, StreaksSectionComponent],
  template: `
    <ion-content class="bg-mindful-primary">
      <div class="mindful-page-container">
        <mindful-navigator heading="Analytics" backIcon="arrowSvg" (back)="goBack()"></mindful-navigator>
        <app-streaks-section></app-streaks-section>
      </div>
    </ion-content>
  `,
})
export class AnalyticsComponent {
  constructor(private navigation: NavigationService, private router: Router) {}

  goBack(): void {
    this.navigation.back();
  }
}
