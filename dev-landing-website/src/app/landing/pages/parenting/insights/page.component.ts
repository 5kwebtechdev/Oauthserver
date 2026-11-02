import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PublicNavbarComponent } from '../../../../core/components/public-navbar/public-navbar.component';
import { CommonFooterComponent } from '../../../components/common-footer/common-footer.component';
import { environment } from '../../../../../environments/environment';
import { StoreDownloadDialogService } from '../../../../core/services/store-download-dialog.service';

interface InsightCard {
  title: string;
  description: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
  imageAlt: string;
  items: string[];
  badge: string;
  variant: 'child' | 'parent';
}

@Component({
  selector: 'app-insights-landing-page',
  standalone: true,
  imports: [CommonModule, RouterModule, PublicNavbarComponent, CommonFooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page.component.html',
  styleUrls: ['./page.component.scss'],
})
export class InsightsLandingPageComponent {
  private readonly storeDialog = inject(StoreDownloadDialogService);
  readonly assetRoot = 'assets/Landing/insights';
  readonly loginUrl = `${environment.mobileAppUrl.replace(/\/$/, '')}/login`;
  openStoreDialog(): void { this.storeDialog.open(); }

  readonly insightCards: InsightCard[] = [
    {
      title: 'Child / Self Insights',
      description: 'Empowers the user to understand their own journey.',
      image: `${this.assetRoot}/child-self.png`,
      imageWidth: 1314,
      imageHeight: 1197,
      imageAlt: 'Child using SuperMeApp insights',
      items: [
        'Track your habits, tasks, moods, and learnings.',
        'See streaks, progress, and achievements.',
        'Build self-awareness and stay motivated.',
      ],
      badge: 'Built for reflection and growth',
      variant: 'child',
    },
    {
      title: 'Parent Insights',
      description: 'A deeper view to supports better guidance.',
      image: `${this.assetRoot}/parent.png`,
      imageWidth: 1376,
      imageHeight: 768,
      imageAlt: 'Parent and children using SuperMeApp insights',
      items: [
        'Complete overview of all key metrics.',
        'AI Insights & Trends over time.',
        'Make informed decisions with confidence.',
      ],
      badge: 'Built for support and smart parenting',
      variant: 'parent',
    },
  ];
}
