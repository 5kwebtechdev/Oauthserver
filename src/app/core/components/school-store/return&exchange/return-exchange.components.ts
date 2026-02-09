import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { ViewAllComponent } from '../../mindful-navigator/view-all/view-all.component';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'return-exchange',
  templateUrl: './return-exchange.components.html',
  styleUrls: ['./return-exchange.components.scss'],
  imports: [CommonModule, IonicModule, MindfulNavigatorComponent, MindfulButtonComponent, ViewAllComponent],
})
export class ReturnExchangeComponent {

  constructor(private router: Router) {}

  goBack(): void {
    if (history.length > 1) {
      history.back();
    } else {
      this.router.navigateByUrl('/authed/school-store/my-orders');
    }
  }

  onHelpClick(): void {
    // TODO: Implement help functionality
    console.log('Help clicked');
  }

  submitRequest(): void {
    // TODO: Implement form submission logic
    console.log('Submit return/exchange request');
    // Navigate back to my-orders after submission
    this.router.navigateByUrl('/authed/school-store/my-orders');
  }

  onNext(): void {
    // For now, proceed to the next step — delegate to submitRequest()
    console.log('Next clicked');
    this.submitRequest();
  }
}