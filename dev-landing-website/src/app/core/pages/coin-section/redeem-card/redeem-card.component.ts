import { Component, Input, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'sm-redeem-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './redeem-card.component.html',
  styleUrls: ['./redeem-card.component.scss']
})
export class RedeemCardComponent {
  @Input() title = '';
  @Input() imageSrc = '';
  @Input() cost: number | string = '';
  constructor(private host: ElementRef<HTMLElement>) {}

  @HostListener('keydown.enter', ['$event'])
  @HostListener('keydown.space', ['$event'])
  onKeyActivate(event: Event) {
    event.preventDefault();
    // trigger a click on the host element so parent (click) handlers run
    this.host.nativeElement.click();
  }
}
