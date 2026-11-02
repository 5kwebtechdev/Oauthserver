import { AfterViewInit, ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { LandingNavbarComponent } from '../../../../landing/components/navbar/navbar.component';
import { CommonFooterComponent } from '../../../../landing/components/common-footer/common-footer.component';

interface FeatureCard {
  title: string;
  description: string;
}

interface ComparisonRow {
  others: string;
  superme: string;
}

interface TeamMember {
  photo: string;
  designation: string;
  name: string;
}

@Component({
  selector: 'app-superme-about-page',
  standalone: true,
  imports: [CommonModule, LandingNavbarComponent, CommonFooterComponent],
  templateUrl: './superme-about-page.component.html',
  styleUrls: ['./superme-about-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupermeAboutPageComponent implements AfterViewInit, OnDestroy {
  readonly assetRoot = 'assets/Landing/company';

  readonly features: FeatureCard[] = [
    {
      title: 'Learn Daily',
      description: 'Bite-sized content designed to fit into your day, not disrupt it.',
    },
    {
      title: 'Reflect & Grow',
      description: 'Journaling and note taking daily that turn scattered thoughts into self-awareness.',
    },
    {
      title: 'Find a Tutor',
      description: 'Connect with verified tutors for real, personalized support — when you need!',
    },
    {
      title: 'Shop Smart',
      description: 'Curated marketplace of products that are delivered right at your doorstep.',
    },
    {
      title: 'Post & Scale Up',
      description: 'Advertise and and expand your reach within a trusted, thriving community.',
    },
  ];

  readonly comparisons: ComparisonRow[] = [
    { others: 'Multiple apps, zero sync', superme: 'One platform, full flow' },
    { others: 'Passive content consumption', superme: 'Active habits + reflection' },
    { others: 'No accountability', superme: 'Streaks, rewards & community' },
    { others: 'Generic recommendations', superme: 'Personalized to your journey' },
  ];

  // Publish this section only after staff names, roles and portraits are approved.
  readonly teamMembers: TeamMember[] = [];

  private routeDataSubscription?: Subscription;

  constructor(private readonly route: ActivatedRoute) {}

  ngAfterViewInit(): void {
    this.routeDataSubscription = this.route.data.subscribe((data) => {
      if (data['scrollToTeam'] && this.teamMembers.length) this.scrollToTeamAfterAssetsLoad();
    });
  }

  ngOnDestroy(): void {
    this.routeDataSubscription?.unsubscribe();
  }

  private scrollToTeamAfterAssetsLoad(): void {
    const pendingImages = Array.from(document.images).filter((image) => !image.complete);
    const assetsReady = pendingImages.map(
      (image) =>
        new Promise<void>((resolve) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        }),
    );

    const scrollToTeam = () =>
      requestAnimationFrame(() => {
        document.getElementById('meet-the-team')?.scrollIntoView({ block: 'start' });
      });

    Promise.all(assetsReady).then(scrollToTeam);
    window.setTimeout(scrollToTeam, 1200);
  }
}
