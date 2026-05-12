import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../mindful-navigator/mindful-navigator.component';
import { NavigationService } from '../../services/navigation.service';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, IonicModule, MindfulNavigatorComponent],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.scss'],
})
export class AnalyticsComponent {
  constructor(private navigation: NavigationService) {}

  goBack(): void {
    this.navigation.back();
  }
}
