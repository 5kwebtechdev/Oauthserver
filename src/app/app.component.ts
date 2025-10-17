import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError, Event } from '@angular/router';

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
  ) { }

  ngOnInit() {
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
}
