import { Component, Input, HostBinding } from '@angular/core';

@Component({
	selector: 'app-superme-input',
	templateUrl: './superme-input.component.html',
	styleUrls: ['./superme-input.component.scss'],
})
export class SupermeInputComponent {
	// Accept variant as a string to remain backwards-compatible with usages
	// like 'white-full'. We'll normalize known legacy variants to the
	// canonical variants used by the stylesheet.
	@Input() variant: string = 'orange';

	// Normalize variant for host class generation so templates that pass
	// 'white-full' still receive the 'superme-input--white' styles.
	@HostBinding('class') get hostClasses(): string {
		const v = (this.variant || 'orange').toString().trim();
		const normalized = v; // no special normalization; component only supports variants via CSS
		return `superme-input superme-input--${normalized}`;
	}

	// Expose common input attributes if needed in future
	@Input() placeholder?: string;
	@Input() type: string = 'text';
	@Input() value?: string | null;
}
