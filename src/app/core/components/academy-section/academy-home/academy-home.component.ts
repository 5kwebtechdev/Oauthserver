
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-academy-home',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './academy-home.component.html',
  styleUrls: ['./academy-home.component.scss']
})
export class AcademyHomeComponent {
  @Input() title: string | undefined;
  @Input() description: string | undefined;

  constructor(private router: Router) {}

  openManagingMoney(): void {
    this.router.navigate(['/academy/managing-money']);
  }
}
