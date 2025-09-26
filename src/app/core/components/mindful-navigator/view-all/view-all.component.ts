import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'mindful-view-all',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-all.component.html',
  styleUrls: ['./view-all.component.scss']
})
export class ViewAllComponent {
  /** Optional href to navigate to when clicked. If provided, navigation will use Router.navigateByUrl */
  @Input() href?: string;

  /** Optional routerLink (array or string) to navigate when clicked. Takes precedence over href. */
  @Input() routerLink?: any;

  /** Emits when the button is clicked (after optional navigation) */
  @Output() clicked = new EventEmitter<void>();
  /** Optional aria-label for accessibility; applied to the button as an attribute */
  @Input() ariaLabel?: string = 'View all';

  constructor(private router: Router) { }

  async onClick() {
    try {
      if (this.routerLink) {
        await this.router.navigate(Array.isArray(this.routerLink) ? this.routerLink : [this.routerLink]);
      } else if (this.href) {
        await this.router.navigateByUrl(this.href);
      }
    } finally {
      this.clicked.emit();
    }
  }
}
