import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { Router } from '@angular/router';

@Component({
	standalone: true,
	selector: 'institute-detail-fill',
	templateUrl: './institute-detail-fill.components.html',
	styleUrls: ['./institute-detail-fill.components.scss'],
	imports: [CommonModule, IonicModule, MindfulNavigatorComponent, MindfulButtonComponent]
})
export class InstituteDetailFillComponent {
	constructor(private router: Router) { }

	goBack(): void {
		this.router.navigate(['/authed/user-dashboard']).catch(() => { this.router.navigateByUrl('/authed'); });
	}

	// form field definitions used to render inputs concisely in template
	fields = [
		{ key: 'state', label: 'State', placeholder: 'Select your state', aria: 'Select your state' },
		{ key: 'city', label: 'City / District', placeholder: 'Select your city / district', aria: 'Select your city or district' },
		{ key: 'school', label: 'School Name', placeholder: 'Select school', aria: 'Select school' },
		{ key: 'class', label: 'Class', placeholder: 'Select class', aria: 'Select class' }
	];
}

