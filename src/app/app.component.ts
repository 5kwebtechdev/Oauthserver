import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError, Event } from '@angular/router';
import { PetAgeService } from './core/services/pet-age.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  loading = false;
  constructor(
    private platform: Platform,
    private router: Router,
    private petAgeService: PetAgeService,
  ) { }

  ngOnInit() {
    // Track app open for pet age progression
    this.recordDailyAppOpen();

    // Perform any initialization logic here
    this.platform.backButton.subscribeWithPriority(10, () => {
      window.history.back();
    })

    // show loading on navigation
    this.router.events.subscribe((event: Event) => {
      if (event instanceof NavigationStart) {
        this.loading = true;
      }
      if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        // small delay to avoid flicker on super-fast navigations
        setTimeout(() => this.loading = false, 80);
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
