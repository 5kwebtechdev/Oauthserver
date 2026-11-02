import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PublicNavbarComponent } from '../../../../core/components/public-navbar/public-navbar.component';
import { CommonFooterComponent } from '../../../components/common-footer/common-footer.component';
import { environment } from '../../../../../environments/environment';
import { StoreDownloadDialogService } from '../../../../core/services/store-download-dialog.service';

interface PlannerBenefit {
  title: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-planner-landing-page',
  standalone: true,
  imports: [CommonModule, RouterModule, PublicNavbarComponent, CommonFooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page.component.html',
  styleUrls: ['./page.component.scss'],
})
export class PlannerLandingPageComponent {
  private readonly storeDialog = inject(StoreDownloadDialogService);
  readonly assetRoot = 'assets/Landing/planner';
  readonly loginUrl = `${environment.mobileAppUrl.replace(/\/$/, '')}/login`;
  openStoreDialog(): void { this.storeDialog.open(); }

  readonly benefits: PlannerBenefit[] = [
    {
      title: 'Plan better',
      description: 'Organize your day with smart timetables and recurring schedules.',
      icon: `${this.assetRoot}/plan-better.svg`,
    },
    {
      title: 'Stay ahead',
      description: 'Get reminders for important events and upcoming milestones.',
      icon: `${this.assetRoot}/stay-ahead.svg`,
    },
    {
      title: 'Build consistency',
      description: 'Stick to routines and achieve more, every single day.',
      icon: `${this.assetRoot}/build-consistency.svg`,
    },
    {
      title: 'See your progress',
      description: 'Track what’s done and make each day more productive.',
      icon: `${this.assetRoot}/track-progress.svg`,
    },
  ];
}
