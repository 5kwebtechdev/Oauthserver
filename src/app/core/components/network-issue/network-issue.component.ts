import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { NetworkIssueService } from './network-issue.service';

@Component({
  standalone: true,
  selector: 'app-network-issue',
  templateUrl: './network-issue.component.html',
  styleUrls: ['./network-issue.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule]
})
export class NetworkIssueComponent implements OnInit, OnDestroy {
  isOffline = false;
  showReconnectedBanner = false;
  isRetrying = false;

  private subs: Subscription[] = [];
  private reconnectedTimer?: any;

  constructor(
    private network: NetworkIssueService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.network.offline$.subscribe(offline => {
        this.isOffline = offline;
        if (!offline) this.isRetrying = false;
        this.cd.markForCheck();
      }),
      this.network.backOnline$.subscribe(() => {
        this.showReconnectedBanner = true;
        this.cd.markForCheck();
        clearTimeout(this.reconnectedTimer);
        this.reconnectedTimer = setTimeout(() => {
          this.showReconnectedBanner = false;
          this.cd.markForCheck();
        }, 3000);
        this.network.triggerDataRefresh();
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    clearTimeout(this.reconnectedTimer);
  }

  retry(): void {
    if (this.isRetrying) return;
    this.isRetrying = true;
    this.cd.markForCheck();
    this.network.triggerRetry();

    if (navigator.onLine) {
      this.network.hide();
      this.network.triggerDataRefresh();
    } else {
      setTimeout(() => {
        this.isRetrying = false;
        this.cd.markForCheck();
      }, 1500);
    }
  }
}
