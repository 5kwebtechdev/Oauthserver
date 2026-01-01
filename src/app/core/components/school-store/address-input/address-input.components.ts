import { Component, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { Router } from '@angular/router';
import { LocationService, AddressDetails } from '../../../services/location.service';
import { GoogleMap, MapMarker } from '@angular/google-maps';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { fromEvent } from 'rxjs';

@Component({
    selector: 'address-input',
    standalone: true,
    imports: [CommonModule, IonicModule, ReactiveFormsModule, FormsModule, MindfulNavigatorComponent, MindfulButtonComponent, GoogleMap, MapMarker],
    templateUrl: './address-input.components.html',
    styleUrls: ['./address-input.components.scss']
})
export class AddressInputComponent {
    addressForm: FormGroup;
    locationService = inject(LocationService);
    
    // Map properties
    mapOptions: google.maps.MapOptions = {
        center: { lat: 13.0827, lng: 80.2707 }, // Default to Chennai, India
        zoom: 15,
        mapTypeId: 'roadmap',
        disableDefaultUI: true,
        zoomControl: false,
    };
    markerPositions: google.maps.LatLngLiteral[] = [];
    
    // Search properties
    searchQuery = '';
    searchResults: any[] = [];
    showSearchResults = false;
    
    // Current position
    currentLocation: { lat: number; lng: number } | null = null;
    isMapLoaded = false;

    constructor(private cdr: ChangeDetectorRef, private fb: FormBuilder) {
        this.addressForm = this.fb.group({
            pincode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
            cityState: [''],
            flat: ['', [Validators.required, Validators.minLength(5)]],
            area: ['', [Validators.required, Validators.minLength(5)]],
            landmark: [''],
            fullName: ['', [Validators.required, Validators.pattern(/^[A-Za-z\s]+$/), Validators.minLength(3)]],
            phone: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
            isDefault: [false]
        });
    }
    
    async ngOnInit() {
        await this.loadCurrentLocation();
    }
    
    async loadCurrentLocation() {
        try {
            const position = await this.locationService.getCurrentPosition();
            const coords = position.coords;
            
            // Update map center and marker
            this.mapOptions = {
                ...this.mapOptions,
                center: { lat: coords.latitude, lng: coords.longitude }
            };
            
            // Set marker position
            this.markerPositions = [{ lat: coords.latitude, lng: coords.longitude }];
            this.currentLocation = { lat: coords.latitude, lng: coords.longitude };
            
            // Reverse geocode to get address details
            const addressDetails = await this.locationService.reverseGeocode(coords.latitude, coords.longitude);
            
            // Update form fields with address details
            this.addressForm.patchValue({
                pincode: addressDetails.pincode,
                cityState: `${addressDetails.city}, ${addressDetails.state}`,
                area: addressDetails.area,
            });
            
            this.isMapLoaded = true;
            this.cdr.detectChanges();
        } catch (error) {
            console.error('Error getting current location:', error);
            // Default to India center if location access fails
            this.mapOptions = {
                ...this.mapOptions,
                center: { lat: 20.5937, lng: 78.9629 } // Center of India
            };
            this.isMapLoaded = true;
            this.cdr.detectChanges();
        }
    }
    
    async onMapClick(event: google.maps.MapMouseEvent) {
        if (event.latLng) {
            const lat = event.latLng.lat();
            const lng = event.latLng.lng();
            
            // Update marker position
            this.markerPositions = [{ lat, lng }];
            
            try {
                // Reverse geocode the clicked location
                const addressDetails = await this.locationService.reverseGeocode(lat, lng);
                
                // Update form fields with new address details
                this.addressForm.patchValue({
                    pincode: addressDetails.pincode,
                    cityState: `${addressDetails.city}, ${addressDetails.state}`,
                    area: addressDetails.area,
                });
                
                this.cdr.detectChanges();
            } catch (error) {
                console.error('Error getting address from coordinates:', error);
            }
        }
    }
    
    async onMarkerDragEnd(event: google.maps.MapMouseEvent) {
        if (event.latLng) {
            const lat = event.latLng.lat();
            const lng = event.latLng.lng();
            
            try {
                // Reverse geocode the dragged location
                const addressDetails = await this.locationService.reverseGeocode(lat, lng);
                
                // Update form fields with new address details
                this.addressForm.patchValue({
                    pincode: addressDetails.pincode,
                    cityState: `${addressDetails.city}, ${addressDetails.state}`,
                    area: addressDetails.area,
                });
                
                this.cdr.detectChanges();
            } catch (error) {
                console.error('Error getting address from coordinates:', error);
            }
        }
    }
    
    async useCurrentLocation() {
        try {
            const position = await this.locationService.getCurrentPosition();
            const coords = position.coords;
            
            // Update map center and marker
            this.mapOptions = {
                ...this.mapOptions,
                center: { lat: coords.latitude, lng: coords.longitude }
            };
            
            // Set marker position
            this.markerPositions = [{ lat: coords.latitude, lng: coords.longitude }];
            this.currentLocation = { lat: coords.latitude, lng: coords.longitude };
            
            // Reverse geocode to get address details
            const addressDetails = await this.locationService.reverseGeocode(coords.latitude, coords.longitude);
            
            // Update form fields with address details
            this.addressForm.patchValue({
                pincode: addressDetails.pincode,
                cityState: `${addressDetails.city}, ${addressDetails.state}`,
                area: addressDetails.area,
            });
            
            this.cdr.detectChanges();
        } catch (error) {
            console.error('Error getting current location:', error);
        }
    }
    
    onSearchInput() {
        if (this.searchQuery.trim().length > 2) {
            // Debounce the search to avoid too many API calls
            this.debounceSearch(this.searchQuery);
        } else {
            this.searchResults = [];
            this.showSearchResults = false;
        }
    }
    
    private debounceSearch(query: string) {
        // Clear previous timeout if exists
        if ((this as any).searchTimeout) {
            clearTimeout((this as any).searchTimeout);
        }
        
        (this as any).searchTimeout = setTimeout(() => {
            this.performSearch(query);
        }, 500); // 500ms debounce
    }
    
    private async performSearch(query: string) {
        try {
            const results = await this.locationService.searchPlaces(query).toPromise();
            this.searchResults = results ? results.slice(0, 5) : []; // Limit to 5 results
            this.showSearchResults = true;
            this.cdr.detectChanges();
        } catch (error) {
            console.error('Error searching places:', error);
            this.searchResults = [];
            this.showSearchResults = false;
        }
    }
    
    async selectPlace(place: any) {
        this.searchQuery = place.name;
        this.searchResults = [];
        this.showSearchResults = false;
        
        try {
            // Get place details using place_id
            const addressDetails = await this.locationService.getPlaceDetails(place.place_id);
            
            // Update map center and marker
            this.mapOptions = {
                ...this.mapOptions,
                center: addressDetails.coordinates
            };
            
            // Set marker position
            this.markerPositions = [addressDetails.coordinates];
            
            // Update form fields with address details
            this.addressForm.patchValue({
                pincode: addressDetails.pincode,
                cityState: `${addressDetails.city}, ${addressDetails.state}`,
                area: addressDetails.area,
            });
            
            this.cdr.detectChanges();
        } catch (error) {
            console.error('Error getting place details:', error);
        }
    }

    get pincodeControl() {
        return this.addressForm.get('pincode')!;
    }

    get pincodeError(): string | null {
        const ctrl = this.pincodeControl;
        if (!ctrl) return null;
        if ((ctrl.touched || ctrl.dirty) && ctrl.hasError('required')) return 'Pincode is required.';
        if ((ctrl.touched || ctrl.dirty) && ctrl.hasError('pattern')) return 'Pincode must be 6 digits.';
        if ((ctrl.touched || ctrl.dirty) && ctrl.valid) {
            const val = (ctrl.value || '').toString();
            if (!this.isServiceable(val)) return 'Sorry, we are still expanding!';
        }
        return null;
    }

    get flatControl() {
        return this.addressForm.get('flat')!;
    }

    get flatError(): string | null {
        const ctrl = this.flatControl;
        if (!ctrl) return null;
        if ((ctrl.touched || ctrl.dirty) && ctrl.hasError('required')) return 'Details are required for delivery.';
        if ((ctrl.touched || ctrl.dirty) && ctrl.hasError('minlength')) return 'Please enter a valid address.';
        return null;
    }

    get areaControl() {
        return this.addressForm.get('area')!;
    }

    get areaError(): string | null {
        const ctrl = this.areaControl;
        if (!ctrl) return null;
        if ((ctrl.touched || ctrl.dirty) && ctrl.hasError('required')) return 'Details are required for delivery.';
        if ((ctrl.touched || ctrl.dirty) && ctrl.hasError('minlength')) return 'Please enter a valid address.';
        return null;
    }

    get fullNameControl() {
        return this.addressForm.get('fullName')!;
    }

    get fullNameError(): string | null {
        const ctrl = this.fullNameControl;
        if (!ctrl) return null;
        if ((ctrl.touched || ctrl.dirty) && ctrl.hasError('required')) return 'Name is required.';
        if ((ctrl.touched || ctrl.dirty) && ctrl.hasError('pattern')) return 'Name should only contain letters.';
        const val = (ctrl.value || '').toString().trim();
        if ((ctrl.touched || ctrl.dirty) && val.length > 0) {
            // require at least two words for a full name
            if (!val.includes(' ') || val.split(' ').filter(Boolean).length < 2) return 'Please enter your full name';
        }
        return null;
    }

    get phoneControl() {
        return this.addressForm.get('phone')!;
    }

    get phoneError(): string | null {
        const ctrl = this.phoneControl;
        if (!ctrl) return null;
        if ((ctrl.touched || ctrl.dirty) && ctrl.hasError('required')) return 'Phone number is required.';
        if ((ctrl.touched || ctrl.dirty) && ctrl.hasError('pattern')) return 'Please enter a valid 10-digit mobile number.';
        return null;
    }

    private isServiceable(pincode: string): boolean {
        if (!pincode) return false;
        // Example rule: serviceable pincodes begin with '60' or '11' (adjust later)
        return pincode.startsWith('60') || pincode.startsWith('11');
    }

    onPincodeInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input) return;
        // remove non-digit characters and limit to 6
        const cleaned = (input.value || '').replace(/\D/g, '').slice(0, 6);
        // update the form control (this will update the input value)
        this.pincodeControl.setValue(cleaned, { emitEvent: false });
    }

    onPhoneInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input) return;
        // remove non-digit characters and limit to 10
        const cleaned = (input.value || '').replace(/\D/g, '').slice(0, 10);
        this.phoneControl.setValue(cleaned, { emitEvent: false });
    }

    goBack(): void {
        try { window.history.back(); } catch (e) { }
    }

    saveAddress(): void {
        if (this.addressForm.invalid) {
            this.addressForm.markAllAsTouched();
            this.cdr.markForCheck();
            return;
        }

        const address = this.addressForm.value;
        console.log('Address saved (placeholder):', address);
        try { window.history.back(); } catch (e) { }
    }
}
