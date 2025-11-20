import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError, Event } from '@angular/router';
import { PetAgeService } from './core/services/pet-age.service';
import { LoadingService } from './core/services/loading.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  loading = false;
  private _navToken?: string;
  constructor(
    private platform: Platform,
    private router: Router,
    private petAgeService: PetAgeService,
    private loadingService: LoadingService,
  ) { }

  ngOnInit() {
    // Track app open for pet age progression
    this.recordDailyAppOpen();

    // Perform any initialization logic here
    this.platform.backButton.subscribeWithPriority(10, () => {
      window.history.back();
    })

    // show loading on navigation using LoadingService to centralize behaviour
    this.router.events.subscribe((event: Event) => {
      if (event instanceof NavigationStart) {
        // start nav loader (returns token)
        this._navToken = this.loadingService.show(undefined, { delayMs: 80, minVisibleMs: 120 });
        this.loading = true;
      }
      if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        // hide nav loader
        if (this._navToken) {
          this.loadingService.hide(this._navToken);
          this._navToken = undefined;
        }
        // small delay to avoid flicker in UI (spinner overlay may remain for minVisible)
        setTimeout(() => this.loading = false, 80);

        // Extra safety: if navigation failed, ensure loader is reset
        if (event instanceof NavigationError) {
          console.warn('[AppComponent] Navigation error detected, ensuring loader is reset');
          setTimeout(() => this.loadingService.reset(), 200);
        }
      }
    });
  }

  /**
   * Record daily app open to track pet age progression and streaks
   */
  private recordDailyAppOpen(): void {
    const result = this.petAgeService.recordAppOpen();
    const petData = this.petAgeService.getCurrentPetData();

    // Check if pet aged up today
    if (result.ageIncreased && result.newAge) {
      console.log(`🎉 Your pet grew to Age ${result.newAge}! You earned ${result.coinsEarned} coins!`);
      // TODO: Show age-up notification/animation to user
      // You can emit an event or show a toast/modal here
    } else if (result.coinsEarned > 0) {
      console.log(`🔥 Day ${petData.currentStreak} streak! Earned ${result.coinsEarned} coins!`);
    }
  }
}
