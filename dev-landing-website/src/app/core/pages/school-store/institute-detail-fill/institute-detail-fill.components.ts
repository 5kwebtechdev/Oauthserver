import { Component, Input, Output, EventEmitter, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, NgForOf, NgIf } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { SupermeNavigatorComponent } from '../../../components/superme-navigator/superme-navigator.component';
import { SupermeButtonComponent } from '../../../components/superme-button/superme-button.component';
import { PublicNavbarComponent } from '../../../components/public-navbar/public-navbar.component';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from '../../../../../environments/environment';

interface CountriesNowStatesResponse {
	error: boolean;
	msg: string;
	data: Array<{
		name: string;
		states: Array<{
			name: string;
			state_code?: string;
		}>;
	}>;
}

interface CountriesNowCitiesResponse {
	error: boolean;
	msg: string;
	data: string[];
}

type SchoolApiRecord = Record<string, unknown>;

export interface SchoolStoreSelection {
	category: string | null;
	categoryId?: number | null;
	categoryName?: string | null;
	schoolId?: string | null;
	schoolName?: string | null;
	className?: string | null;
}

@Component({
	standalone: true,
	selector: 'app-institute-detail-fill',
	templateUrl: './institute-detail-fill.components.html',
	styleUrls: ['./institute-detail-fill.components.scss'],
	imports: [CommonModule, NgForOf, NgIf, IonicModule, FormsModule, SupermeNavigatorComponent, SupermeButtonComponent, PublicNavbarComponent]
})
export class InstituteDetailFillComponent implements OnInit, OnDestroy {
	@Input() category?: string | null = null;
	@Input() categoryId?: number | null = null;
	@Input() categoryName?: string | null = null;
	@Output() closeFill: EventEmitter<void> = new EventEmitter<void>();
	@Output() openProduct: EventEmitter<SchoolStoreSelection> = new EventEmitter<SchoolStoreSelection>();
	constructor(private router: Router, private http: HttpClient) { }

	private readonly countryName = 'India';
	private readonly statesApi = 'https://countriesnow.space/api/v0.1/countries/states';
	private readonly citiesApi = 'https://countriesnow.space/api/v0.1/countries/state/cities';
	private readonly schoolsApi = `${environment.apiUrl}/user/schools`;
	private readonly apiSub = new Subscription();
	private schoolRecordsByName: Record<string, SchoolApiRecord> = {};

	isLoadingStates = false;
	isLoadingCities = false;
	isLoadingSchools = false;
	isLoadingClasses = false;
	locationLoadError = '';

	ngOnInit(): void {
		const state = this.router.getCurrentNavigation()?.extras?.state ?? history.state;
		if (state) {
			if (!this.category && state.category) this.category = state.category;
			if (!this.categoryId && state.categoryId) this.categoryId = state.categoryId;
			if (!this.categoryName && state.categoryName) this.categoryName = state.categoryName;
		}
		this.loadStates();
	}

	ngOnDestroy(): void {
		this.apiSub.unsubscribe();
	}

	goBack(): void {
		// when used inline, emit close instead of navigating away
		if (this.closeFill.observers && this.closeFill.observers.length) {
			this.closeFill.emit();
			return;
		}
		this.router.navigate(['/shop']).catch(() => { this.router.navigateByUrl('/authed'); });
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

	// states and cities are loaded from a free live API; schools are loaded from the SuperMe API
	options: Record<string, string[]> = {
		state: [],
		city: [],
		school: [],
		class: []
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
		if (this.isStatusOption(opt)) return;

		this.selectedValues[this.activeField] = opt;
		// update the placeholder for the corresponding field object so template can show selected value
		const f = this.fields.find(x => x.key === this.activeField);
		if (f) f.placeholder = opt;

		if (this.activeField === 'state') {
			this.resetField('city');
			this.resetField('school');
			this.resetField('class');
			this.loadCities(opt);
		}

		if (this.activeField === 'city') {
			this.resetField('school');
			this.resetField('class');
			this.loadSchools();
		}

		if (this.activeField === 'school') {
			this.resetField('class');
			this.loadClasses(opt);
		}

		this.closeFieldPopup();
	}

	getActiveLabel(): string {
		const f = this.fields.find(x => x.key === this.activeField);
		return f ? f.label : '';
	}

	getActiveOptions(): string[] {
		if (!this.activeField) return [];
		if (this.activeField === 'state' && this.isLoadingStates) return ['Loading states...'];
		if (this.activeField === 'city') {
			if (!this.selectedValues['state']) return ['Select a state first'];
			if (this.isLoadingCities) return ['Loading cities...'];
		}
		if (this.activeField === 'school') {
			if (!this.selectedValues['city']) return ['Select a city first'];
			if (this.isLoadingSchools) return ['Loading schools...'];
			if (!this.options['school']?.length) return ['No schools found'];
		}
		if (this.activeField === 'class') {
			if (!this.selectedValues['school']) return ['Select a school first'];
			if (this.isLoadingClasses) return ['Loading classes...'];
			if (!this.options['class']?.length) return ['No classes found'];
		}
		return this.options[this.activeField] || [];
	}

	private loadStates(): void {
		this.isLoadingStates = true;
		this.locationLoadError = '';

		const sub = this.http.get<CountriesNowStatesResponse>(this.statesApi).subscribe({
			next: (response) => {
				const india = response.data?.find(country => country.name === this.countryName);
				this.options['state'] = (india?.states || [])
					.map(state => state.name)
					.filter(Boolean)
					.sort((a, b) => a.localeCompare(b));
				this.isLoadingStates = false;
			},
			error: () => {
				this.options['state'] = ['Andhra Pradesh', 'Maharashtra', 'Gujarat', 'Tamil Nadu'];
				this.locationLoadError = 'Unable to load live states right now.';
				this.isLoadingStates = false;
			}
		});

		this.apiSub.add(sub);
	}

	private loadCities(state: string): void {
		this.isLoadingCities = true;
		this.locationLoadError = '';
		this.options['city'] = [];

		const sub = this.http.post<CountriesNowCitiesResponse>(this.citiesApi, {
			country: this.countryName,
			state
		}).subscribe({
			next: (response) => {
				this.options['city'] = (response.data || [])
					.filter(Boolean)
					.sort((a, b) => a.localeCompare(b));
				this.isLoadingCities = false;
			},
			error: () => {
				this.options['city'] = [];
				this.locationLoadError = 'Unable to load live cities right now.';
				this.isLoadingCities = false;
			}
		});

		this.apiSub.add(sub);
	}

	private loadSchools(): void {
		const state = this.selectedValues['state'];
		const city = this.selectedValues['city'];

		if (!state || !city) {
			this.options['school'] = [];
			this.schoolRecordsByName = {};
			return;
		}

		this.isLoadingSchools = true;
		this.options['school'] = [];
		this.schoolRecordsByName = {};

		const sub = this.http.get<unknown>(this.schoolsApi).subscribe({
			next: (response) => {
				this.options['school'] = this.extractSchoolNames(response);
				this.isLoadingSchools = false;
			},
			error: () => {
				this.options['school'] = [];
				this.isLoadingSchools = false;
			}
		});

		this.apiSub.add(sub);
	}

	private extractSchoolNames(response: unknown): string[] {
		const records = this.extractSchoolRecords(response);
		this.schoolRecordsByName = {};

		for (const record of records) {
			const name = this.getSchoolDisplayName(record);
			if (name && !this.schoolRecordsByName[name]) {
				this.schoolRecordsByName[name] = record;
			}
		}

		return Object.keys(this.schoolRecordsByName).sort((a, b) => a.localeCompare(b));
	}

	private extractSchoolRecords(response: unknown): SchoolApiRecord[] {
		if (Array.isArray(response)) return response as SchoolApiRecord[];
		if (!response || typeof response !== 'object') return [];

		const body = response as Record<string, unknown>;
		const data = body['data'];
		if (Array.isArray(data)) return data as SchoolApiRecord[];
		if (data && typeof data === 'object') {
			const dataObj = data as Record<string, unknown>;
			if (Array.isArray(dataObj['schools'])) return dataObj['schools'] as SchoolApiRecord[];
			if (Array.isArray(dataObj['items'])) return dataObj['items'] as SchoolApiRecord[];
			if (Array.isArray(dataObj['content'])) return dataObj['content'] as SchoolApiRecord[];
		}

		if (Array.isArray(body['schools'])) return body['schools'] as SchoolApiRecord[];
		if (Array.isArray(body['items'])) return body['items'] as SchoolApiRecord[];
		if (Array.isArray(body['content'])) return body['content'] as SchoolApiRecord[];
		return [];
	}

	private getSchoolDisplayName(record: SchoolApiRecord): string | null {
		const possibleKeys = ['name', 'schoolName', 'school_name', 'instituteName', 'title'];
		for (const key of possibleKeys) {
			const value = record[key];
			if (typeof value === 'string' && value.trim()) return value.trim();
		}
		return null;
	}

	private loadClasses(schoolName: string): void {
		const schoolId = this.getSchoolId(this.schoolRecordsByName[schoolName]);
		if (!schoolId) {
			this.options['class'] = [];
			return;
		}

		this.isLoadingClasses = true;
		this.options['class'] = [];

		const sub = this.http.get<unknown>(`${this.schoolsApi}/${encodeURIComponent(schoolId)}/classes`).subscribe({
			next: (response) => {
				this.options['class'] = this.extractClassNames(response);
				this.isLoadingClasses = false;
			},
			error: () => {
				this.options['class'] = [];
				this.isLoadingClasses = false;
			}
		});

		this.apiSub.add(sub);
	}

	private getSchoolId(record: SchoolApiRecord | undefined): string | null {
		if (!record) return null;
		const possibleKeys = ['id', 'schoolId', 'school_id', '_id'];
		for (const key of possibleKeys) {
			const value = record[key];
			if (typeof value === 'string' && value.trim()) return value.trim();
			if (typeof value === 'number') return value.toString();
		}
		return null;
	}

	private extractClassNames(response: unknown): string[] {
		const records = this.extractClassRecords(response);
		return records
			.map(record => this.getClassDisplayName(record))
			.filter((name): name is string => !!name)
			.filter((name, index, list) => list.indexOf(name) === index)
			.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
	}

	private extractClassRecords(response: unknown): unknown[] {
		if (Array.isArray(response)) return response;
		if (!response || typeof response !== 'object') return [];

		const body = response as Record<string, unknown>;
		const data = body['data'];
		if (Array.isArray(data)) return data;
		if (data && typeof data === 'object') {
			const dataObj = data as Record<string, unknown>;
			if (Array.isArray(dataObj['classes'])) return dataObj['classes'];
			if (Array.isArray(dataObj['items'])) return dataObj['items'];
			if (Array.isArray(dataObj['content'])) return dataObj['content'];
		}

		if (Array.isArray(body['classes'])) return body['classes'];
		if (Array.isArray(body['items'])) return body['items'];
		return [];
	}

	private getClassDisplayName(record: unknown): string | null {
		if (typeof record === 'string') return record.trim() || null;
		if (typeof record === 'number') return record.toString();
		if (!record || typeof record !== 'object') return null;

		const classRecord = record as Record<string, unknown>;
		const possibleKeys = ['name', 'className', 'class_name', 'grade', 'standard', 'title'];
		for (const key of possibleKeys) {
			const value = classRecord[key];
			if (typeof value === 'string' && value.trim()) return value.trim();
			if (typeof value === 'number') return value.toString();
			if (Array.isArray(value)) {
				const label = value
					.map(item => typeof item === 'string' || typeof item === 'number' ? item.toString().trim() : '')
					.filter(Boolean)
					.join(', ');
				if (label) return label;
			}
		}
		return null;
	}

	private resetField(key: string): void {
		delete this.selectedValues[key];
		const f = this.fields.find(x => x.key === key);
		if (f && key === 'city') f.placeholder = 'Select your city / district';
		if (f && key === 'school') f.placeholder = 'Select school';
		if (f && key === 'class') f.placeholder = 'Select class';
	}

	isStatusOption(opt: string): boolean {
		return opt === 'Loading states...'
			|| opt === 'Loading cities...'
			|| opt === 'Loading schools...'
			|| opt === 'Loading classes...'
			|| opt === 'Select a state first'
			|| opt === 'Select a city first'
			|| opt === 'Select a school first'
			|| opt === 'No schools found'
			|| opt === 'No classes found';
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
		this.router.navigate(['/shop/products']).catch(() => console.log('navigate failed'));
	}

	enterStore(): void {
		console.debug('InstituteDetailFill: enterStore called, category=', this.category, 'openProduct observers=', this.openProduct.observers?.length || 0);
		const selectedSchool = this.selectedValues['school'] || null;
		const selection: SchoolStoreSelection = {
			category: this.category ?? null,
			categoryId: this.categoryId ?? null,
			categoryName: this.categoryName ?? this.category ?? null,
			schoolId: selectedSchool ? this.getSchoolId(this.schoolRecordsByName[selectedSchool]) : null,
			schoolName: selectedSchool,
			className: this.selectedValues['class'] || null
		};
		// If parent is listening, request inline product store open, else navigate normally
		if (this.openProduct.observers && this.openProduct.observers.length) {
			console.debug('InstituteDetailFill: emitting openProduct');
			this.openProduct.emit(selection);
			return;
		}
		console.debug('InstituteDetailFill: navigating to /shop/products');
		this.router.navigate(['/shop/products'], { state: selection }).catch(() => console.log('navigate failed'));
	}

	
}