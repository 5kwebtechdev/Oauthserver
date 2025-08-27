import {Component, OnInit} from '@angular/core';
import { Platform } from '@ionic/angular';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit{
  constructor(
    private platform: Platform,
  ) {}

  ngOnInit() {
    // Perform any initialization logic here
    this.platform.backButton.subscribeWithPriority(10, () => {
      window.history.back();
    })
  }
}
