import { CommonModule, Location } from '@angular/common';
import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { FooterComponent } from '../footer/footer.component';
import { SectionComingSoonComponent } from '../section-coming-soon/section-coming-soon.component';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, IonicModule, FooterComponent, SectionComingSoonComponent],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.scss'],
})
export class AnalyticsComponent {
  constructor(private location: Location) {}

  goBack(): void {
    this.location.back();
  }
}
