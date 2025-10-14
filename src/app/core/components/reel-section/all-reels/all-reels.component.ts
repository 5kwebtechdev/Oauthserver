import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { ReelFrameComponent } from '../reel-frame/reel-frame.component';
import { Subscription } from 'rxjs';

@Component({
    selector: 'all-reels',
    templateUrl: './all-reels.component.html',
    styleUrls: ['./all-reels.component.scss'],
    standalone: true,
    imports: [CommonModule, IonicModule, MindfulNavigatorComponent, ReelFrameComponent]
})
export class AllReelsComponent implements OnInit, OnDestroy {
    // Optional input when used as a child component
    @Input() categoryName?: string;
    @Input() reels: any[] = [];

    heading = 'All Reels';
    routeSub?: Subscription;

    constructor(private route: ActivatedRoute) { }

    ngOnInit(): void {
        // If a category is provided via input, prefer it. Otherwise try route param 'category'.
        if (this.categoryName) {
            this.heading = this.categoryName;
        } else {
            // subscribe to route params (handles navigation into this page)
            this.routeSub = this.route.paramMap.subscribe(pm => {
                const c = pm.get('category');
                if (c) this.heading = decodeURIComponent(c);
            });
        }

        // If reels are empty, initialise with mock data so UI shows something during dev.
        if (!this.reels || this.reels.length === 0) {
            this.reels = Array.from({ length: 8 }).map((_, i) => ({
                id: i + 1,
                category: this.heading,
                author: 'SparkleKid',
                title: 'Epic Volcano Eruption Experiment!',
                duration: '20 sec',
                likes: '10K',
                views: '25K',
                tags: '#FunScience',
                image: '/assets/images/reel-1-placeholder.png'
            }));
        }
    }

    ngOnDestroy(): void {
        this.routeSub?.unsubscribe();
    }

    onBack(): void {
        window.history.back();
    }

    onPlay(reel: any): void {
        // bubble up or open detail - for now just log
        console.log('Play reel', reel);
    }

    onToggleSave(reel: any): void {
        reel.saved = !reel.saved;
    }
}
