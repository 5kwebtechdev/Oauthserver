import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MindfulButtonComponent } from '../mindful-button/mindful-button.component';

@Component({
    selector: 'app-superme-timer',
    templateUrl: './superme-timer.component.html',
    styleUrls: ['./superme-timer.component.scss'],
    standalone: true,
    imports: [CommonModule, MindfulButtonComponent]
})
export class SupermeTimerComponent implements OnInit, OnDestroy {
    // total duration in seconds (default 1 hour)
    @Input() totalSeconds = 3600;

    remainingSeconds = 0;
    private intervalId: any = null;

    // SVG progress properties
    radius = 130; // matches SVG viewBox sizing in template
    stroke = 14;
    circumference = 2 * Math.PI * this.radius;

    // show as HH:MM:SS to match figma
    get formattedTime(): string {
        const hrs = Math.floor(this.remainingSeconds / 3600);
        const mins = Math.floor((this.remainingSeconds % 3600) / 60);
        const secs = Math.floor(this.remainingSeconds % 60);
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }

    // ticks for dial (12 marks)
    ticks = new Array(12);

    get progressPercent(): number {
        if (this.totalSeconds <= 0) { return 0; }
        return Math.min(100, Math.max(0, (this.totalSeconds - this.remainingSeconds) / this.totalSeconds * 100));
    }

    get dashOffset(): number {
        return this.circumference * (1 - this.progressPercent / 100);
    }

    ngOnInit(): void {
        // start timer
        this.remainingSeconds = this.totalSeconds;
        this.start();
    }

    ngOnDestroy(): void {
        this.clearInterval();
    }

    start() {
        this.clearInterval();
        this.intervalId = setInterval(() => {
            if (this.remainingSeconds > 0) {
                this.remainingSeconds -= 1;
            } else {
                this.clearInterval();
            }
        }, 1000);
    }

    private clearInterval() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    // CTA handler
    onBack() {
        // navigate back or emit event — keep simple for this demo
        window.history.back();
    }
}
