import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'superme-completion',
  templateUrl: './superme-completion.component.html',
  styleUrls: ['./superme-completion.component.scss'],
  standalone: false,
})
export class SupermeCompletionComponent implements OnChanges {
  @Input() completionPercentage: number = 0;
  @Input() borderColor: string = '#4CAF50';
  @Input() innerText: string = 'Progress';
  @Input() belowText: string = 'Keep going!';

  animatedPercentage: number = 0;
  private animationFrameId: number | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if ('completionPercentage' in changes) {
      this.animateTo(this.completionPercentage);
    }
  }

  private animateTo(target: number) {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    const start = this.animatedPercentage;
    const change = target - start;
    const duration = 1000;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      this.animatedPercentage = start + change * progress;

      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.animatedPercentage = target;
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }
}
