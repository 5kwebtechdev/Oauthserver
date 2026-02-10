import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../mindful-navigator/mindful-navigator.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { Location } from '@angular/common';

@Component({
	selector: 'reel-coming-soon',
	standalone: true,
	imports: [CommonModule, IonicModule, MindfulNavigatorComponent, EmptyStateComponent],
	template: `
		<ion-content class="reel-content">
			<mindful-navigator heading="Reels Created" backIcon="arrowSvg" (back)="onBack()"></mindful-navigator>

			<div class="reel-center">
				<empty-state
					[imageSrc]="'/assets/Images-Transparent/Reels Coming Soon.png'"
					imageAlt="Reels are coming soon"
					leadText="Reels are coming soon"
					subText="This space will show the reels your child creates once the feature is available on their account."
					[buttonText]="''">
				</empty-state>
			</div>
		</ion-content>
	`,
	styles: [
		`:host { display: block; height: 100vh; }
		ion-content.reel-content { position: relative; display:flex; flex-direction:column; height:100vh; }
		.reel-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display:flex; align-items:center; justify-content:center; width:100%; padding:24px; box-sizing:border-box; }
		empty-state .empty-state__illustration { max-width: 260px; width: 70vw; height: auto; }
		`
	]
})
export class ReelComingSoonComponent {
	constructor(private location: Location) {}

	onBack(): void {
		try {
			this.location.back();
		} catch (e) {
			// Fallback to history
			try { history.back(); } catch (err) { /* noop */ }
		}
	}
}

