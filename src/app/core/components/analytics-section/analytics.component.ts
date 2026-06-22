import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FooterComponent } from '../footer/footer.component';
import { SkeletonImageComponent } from '../skeleton-image/skeleton-image.component';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, IonicModule, FooterComponent, SkeletonImageComponent],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.scss'],
})
export class AnalyticsComponent {}
