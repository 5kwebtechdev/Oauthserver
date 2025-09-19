import { Component, ViewEncapsulation, Input, HostBinding } from '@angular/core';

@Component({
	selector: 'app-mindful-input',
	templateUrl: './mindful-input.component.html',
	styleUrls: ['./mindful-input.component.scss'],
	// Use None so the moved styles behave like globals and other templates
	// that use `.mindful-input-group` continue to work when this component
	// is rendered. We scope the visual style under a modifier class so
	// different variants are possible.
	encapsulation: ViewEncapsulation.None,
	standalone: true,
})
export class MindfulInputComponent {
	// variant name used to pick a style. Default is 'orange'.
	@Input() variant: string = 'orange';

	// Apply a host-level class like `mindful-input--orange` so styles can be
	// scoped under that modifier. Also always include `mindful-input`.
	@HostBinding('class') get hostClasses(): string {
		const v = (this.variant || 'orange').toString().trim();
		return `mindful-input mindful-input--${v}`;
	}

	// Example usage:
	// <app-mindful-input>...projected input...</app-mindful-input>
	// or with explicit variant:
	// <app-mindful-input [variant]="'outlined'">...</app-mindful-input>
}
