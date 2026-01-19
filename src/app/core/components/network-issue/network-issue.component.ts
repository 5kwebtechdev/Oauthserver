import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { MindfulButtonComponent } from '../mindful-button/mindful-button.component';
import { NetworkIssueService } from './network-issue.service';

@Component({
  standalone: true,
  selector: 'app-network-issue',
  templateUrl: './network-issue.component.html',
  styleUrls: ['./network-issue.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MindfulButtonComponent]
})
export class NetworkIssueComponent {
  /** Use async pipe in template for proper change detection */
  visible$: Observable<boolean>;

  constructor(private network: NetworkIssueService) {
    this.visible$ = this.network.offline$;
  }

  retry(): void {
    // user pressed retry -> emit and attempt to reload if online
    this.network.triggerRetry();
    if (navigator.onLine) {
      this.network.hide();
      // reload current page to re-run pending API calls where applicable
      try { window.location.reload(); } catch (e) { /* no-op */ }
    }
  }
}
