import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupermeButtonComponent } from '../superme-button/superme-button.component';
import { SupermeNavigatorComponent } from '../superme-navigator/superme-navigator.component';
import { ModalController, IonicModule } from '@ionic/angular';

@Component({
    selector: 'app-superme-timer',
    templateUrl: './superme-timer.component.html',
    styleUrls: ['./superme-timer.component.scss'],
    standalone: true,
    imports: [IonicModule, CommonModule, SupermeButtonComponent, SupermeNavigatorComponent]
})
export class SupermeTimerComponent implements OnInit, OnDestroy {
    // Optional display title (habit / task title)
    @Input() title?: string;

    // Timestamps for habit/task time range
    @Input() startTime?: number;
    @Input() endTime?: number;

    // total duration in seconds (default 1 hour)
    @Input() totalSeconds = 3600;

    remainingSeconds = 0;
    private intervalId: any = null;
    private calculatedDuration = 0;

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
        const duration = this.calculatedDuration || this.totalSeconds;
        if (duration <= 0) { return 0; }
        return Math.min(100, Math.max(0, (duration - this.remainingSeconds) / duration * 100));
    }

    get dashOffset(): number {
        return this.circumference * (1 - this.progressPercent / 100);
    }

    ngOnInit(): void {
        // Calculate duration based on startTime and endTime if provided
        this.calculatedDuration = this.calculateTimerDuration();
        this.remainingSeconds = this.calculatedDuration;
        this.start();
    }

    private calculateTimerDuration(): number {
        // If startTime and endTime are provided, calculate based on them
        if (this.startTime && this.endTime) {
            const now = Date.now();

            // If we're within the time range, countdown from now until end
            if (now >= this.startTime && now <= this.endTime) {
                const remaining = Math.floor((this.endTime - now) / 1000);
                return remaining > 0 ? remaining : 60; // minimum 1 minute
            }

            // If we haven't started yet, use the full duration
            if (now < this.startTime) {
                const fullDuration = Math.floor((this.endTime - this.startTime) / 1000);
                return fullDuration > 0 ? fullDuration : 3600;
            }

            // If time has passed, use the original duration
            const fullDuration = Math.floor((this.endTime - this.startTime) / 1000);
            return fullDuration > 0 ? fullDuration : 3600;
        }

        // Fall back to totalSeconds input
        return this.totalSeconds || 3600;
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

    constructor(private modalCtrl: ModalController) { }

    // CTA handler — dismiss the modal when back pressed
    async onBack() {
        try {
            await this.modalCtrl.dismiss();
        } catch (e) {
            // fallback to history back
            try { window.history.back(); } catch (err) { /* ignore */ }
        }
    }
}
