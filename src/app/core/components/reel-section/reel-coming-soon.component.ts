import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { SupermeNavigatorComponent } from '../superme-navigator/superme-navigator.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { AuthService } from '../../services/auth.service';

@Component({
	selector: 'reel-coming-soon',
	standalone: true,
	imports: [CommonModule, IonicModule, SupermeNavigatorComponent, EmptyStateComponent],
	template: `
		<ion-content class="reel-content">
			<superme-navigator heading="Reels Created" backIcon="arrowSvg" (back)="onBack()"></superme-navigator>

			<div class="reel-center">
				<empty-state
					[imageSrc]="'assets/Images-Transparent/Reels Coming Soon.webp'"
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
	constructor(private router: Router, private authService: AuthService) {}

	onBack(): void {
		const dashboard = this.authService.getDashboardRoute();
		this.router.navigate([dashboard], { replaceUrl: true });
	}
}
