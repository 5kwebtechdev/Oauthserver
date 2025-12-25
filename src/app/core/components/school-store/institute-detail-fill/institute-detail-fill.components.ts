import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
	standalone: true,
	selector: 'institute-detail-fill',
	templateUrl: './institute-detail-fill.components.html',
	styleUrls: ['./institute-detail-fill.components.scss'],
	imports: [CommonModule, IonicModule, FormsModule, MindfulNavigatorComponent, MindfulButtonComponent]
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

	// popup state for field selectors
	showFieldPopup = false;
	activeField: string | null = null;

	// example options - replace/extend with real data as needed
	options: Record<string, string[]> = {
		state: ['Andhra Pradesh', 'Maharashtra', 'Gujarat', 'Tamil Nadu'],
		city: ['Hyderabad', 'Mumbai', 'Ahmedabad', 'Chennai'],
		school: ['St. Marys High School', 'Greenfield Public School', 'Sunrise Academy'],
		class: ['I', 'II', 'III', 'IV', 'V']
	};

	// store selected values per field
	selectedValues: Record<string, string> = {};

	openFieldPopup(key: string): void {
		this.activeField = key;
		this.showFieldPopup = true;
	}

	closeFieldPopup(): void {
		this.showFieldPopup = false;
		this.activeField = null;
	}

	selectOption(opt: string): void {
		if (!this.activeField) return;
		this.selectedValues[this.activeField] = opt;
		// update the placeholder for the corresponding field object so template can show selected value
		const f = this.fields.find(x => x.key === this.activeField);
		if (f) f.placeholder = opt;
		this.closeFieldPopup();
	}

	getActiveLabel(): string {
		const f = this.fields.find(x => x.key === this.activeField);
		return f ? f.label : '';
	}

	getActiveOptions(): string[] {
		if (!this.activeField) return [];
		return this.options[this.activeField] || [];
	}

	// Request-to-add modal state and form
	showRequestPopup = false;
	requestForm: Record<string, string> = {
		schoolName: '',
		city: '',
		branch: ''
	};

	// compact request modal field definitions
	requestFields = [
		{ key: 'schoolName', placeholder: 'Enter School Name' },
		{ key: 'city', placeholder: 'Enter City' },
		{ key: 'branch', placeholder: 'Enter Branch eg. Gandhi Road' }
	];

	openRequestPopup(): void {
		this.showRequestPopup = true;
	}

	closeRequestPopup(): void {
		this.showRequestPopup = false;
	}

	sendRequest(): void {
		// close modal and navigate to product store
		this.closeRequestPopup();
		this.router.navigate(['/authed', 'school-store', 'product']).catch(() => console.log('navigate failed'));
	}

	enterStore(): void {
		this.router.navigate(['/authed', 'school-store', 'product']).catch(() => console.log('navigate failed'));
	}

	
}

