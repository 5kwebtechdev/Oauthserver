
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { MindfulCardHeaderComponent } from '../../mindful-navigator/mindful-card-header/mindful-card-header.component';
import { FooterComponent } from '../../footer/footer.component';

@Component({
  selector: 'app-academy-home',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, MindfulCardHeaderComponent, FooterComponent],
  templateUrl: './academy-home.component.html',
  styleUrls: ['./academy-home.component.scss']
})
export class AcademyHomeComponent {
  @Input() title: string | undefined;
  @Input() description: string | undefined;

  constructor(private router: Router) { }

  onBackClick(): void {
    this.router.navigate(['/authed/user-dashboard']);
  }

  openManagingMoney(): void {
    this.router.navigate(['/authed/academy/managing-money']);
  }
}
