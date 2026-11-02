import { Component, ChangeDetectorRef, AfterViewInit, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SupermeNavigatorComponent } from '../../../components/superme-navigator/superme-navigator.component';
import { SupermeButtonComponent } from '../../../components/superme-button/superme-button.component';
import { Router } from '@angular/router';
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { FooterComponent } from '../../../components/footer/footer.component';
import { Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AddressService } from '../../../services/address.service';
import { Address, AddressPayload } from '../../../models/address.model';

const DEFAULT_CENTER: [number, number] = [13.0827, 80.2707]; // Chennai fallback
const LEAFLET_CSS_ID = 'leaflet-runtime-css';
const LEAFLET_SCRIPT_ID = 'leaflet-runtime-script';
const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_SCRIPT_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

@Component({
    selector: 'address-input',
    standalone: true,
    imports: [CommonModule, IonicModule, ReactiveFormsModule, SupermeNavigatorComponent, SupermeButtonComponent, PublicNavbarComponent, FooterComponent],
    templateUrl: './address-input.components.html',
    styleUrls: ['./address-input.components.scss']
})
export class AddressInputComponent implements AfterViewInit, OnDestroy, OnInit {
    addressForm: FormGroup;

    @ViewChild('mapContainer') mapContainerRef?: ElementRef<HTMLDivElement>;
    private map?: any;
    private leaflet?: any;
    private moveEndTimer: any;
    private resizeObserver?: ResizeObserver;

    latitude: number | null = null;
    longitude: number | null = null;
    locating = false;
    mapLoading = false;
    saving = false;
    saveError: string | null = null;

    editAddressId: number | null = null;
    pageTitle = 'Add Delivery Address';
    private editInitCenter: [number, number] | null = null;

    constructor(
        private cdr: ChangeDetectorRef,
        private fb: FormBuilder,
        private location: Location,
        private router: Router,
        private http: HttpClient,
        private addressService: AddressService,
    ) {
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

    ngOnInit(): void {
        try {
            const editAddress: Address | undefined = (history.state as any)?.editAddress;
            if (editAddress?.id) {
                this.editAddressId = editAddress.id;
                this.pageTitle = 'Edit Address';
                if (editAddress.latitude && editAddress.longitude) {
                    this.editInitCenter = [editAddress.latitude, editAddress.longitude];
                    this.latitude = editAddress.latitude;
                    this.longitude = editAddress.longitude;
                }
                const city = editAddress.city || '';
                const state = editAddress.state || '';
                this.addressForm.patchValue({
                    pincode: editAddress.postalCode || '',
                    cityState: [city, state].filter(Boolean).join(', '),
                    flat: editAddress.line1 || '',
                    area: editAddress.line2 || '',
                    landmark: '',
                    fullName: editAddress.receiverName || '',
                    phone: editAddress.mobile || '',
                    isDefault: editAddress.isDefault || false
                });
            }
        } catch (e) {}
    }

    ngAfterViewInit(): void {
        // Leaflet needs the container to be in the DOM with a real size before init.
        setTimeout(() => this.initMap());
    }

    ngOnDestroy(): void {
        clearTimeout(this.moveEndTimer);
        this.resizeObserver?.disconnect();
        this.map?.remove();
    }

    private async initMap(): Promise<void> {
        const el = this.mapContainerRef?.nativeElement;
        if (!el || this.map) return;

        const leaflet = await this.loadLeaflet();
        if (!leaflet) return;
        this.leaflet = leaflet;

        const initialCenter = this.editInitCenter ?? DEFAULT_CENTER;
        this.map = leaflet.map(el, { zoomControl: false, attributionControl: false }).setView(initialCenter, 15);
        leaflet.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 20,
            subdomains: 'abcd',
        }).addTo(this.map);

        this.map.on('moveend', () => this.onMapMoved());
        this.onMapMoved();

        // The container's real width/height can settle after Leaflet's first
        // measurement (flex layout, fonts, etc.), leaving the map cropped —
        // keep it in sync with the actual element size.
        this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize());
        this.resizeObserver.observe(el);

        requestAnimationFrame(() => this.map?.invalidateSize());
        setTimeout(() => this.map?.invalidateSize(), 300);
    }

    private loadLeaflet(): Promise<any> {
        const existing = (window as any).L;
        if (existing) return Promise.resolve(existing);

        if (!document.getElementById(LEAFLET_CSS_ID)) {
            const link = document.createElement('link');
            link.id = LEAFLET_CSS_ID;
            link.rel = 'stylesheet';
            link.href = LEAFLET_CSS_URL;
            document.head.appendChild(link);
        }

        const existingScript = document.getElementById(LEAFLET_SCRIPT_ID) as HTMLScriptElement | null;
        if (existingScript) {
            return new Promise((resolve) => {
                existingScript.addEventListener('load', () => resolve((window as any).L), { once: true });
                existingScript.addEventListener('error', () => resolve(null), { once: true });
            });
        }

        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.id = LEAFLET_SCRIPT_ID;
            script.src = LEAFLET_SCRIPT_URL;
            script.async = true;
            script.onload = () => resolve((window as any).L);
            script.onerror = () => resolve(null);
            document.body.appendChild(script);
        });
    }

    private onMapMoved(): void {
        if (!this.map) return;
        const center = this.map.getCenter();
        this.latitude = center.lat;
        this.longitude = center.lng;

        clearTimeout(this.moveEndTimer);
        this.moveEndTimer = setTimeout(() => this.reverseGeocode(center.lat, center.lng), 250);
    }

    private reverseGeocode(lat: number, lng: number): void {
        this.mapLoading = true;
        this.cdr.markForCheck();

        this.http.get<any>('https://nominatim.openstreetmap.org/reverse', {
            params: { format: 'jsonv2', lat: String(lat), lon: String(lng) },
        }).subscribe({
            next: (res) => {
                const address = res?.address || {};
                const city = address.city || address.town || address.village || address.suburb || '';
                const state = address.state || '';
                const area = [address.suburb, address.road, address.neighbourhood].filter(Boolean).join(', ');

                this.addressForm.patchValue({
                    pincode: address.postcode || this.addressForm.value.pincode,
                    cityState: city || state ? `${city}${city && state ? ', ' : ''}${state}` : this.addressForm.value.cityState,
                    area: area || this.addressForm.value.area,
                }, { emitEvent: false });

                this.mapLoading = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.mapLoading = false;
                this.cdr.markForCheck();
            },
        });
    }

    private geocodeByPincode(pincode: string): void {
        if (!this.map) return;
        this.http.get<any[]>('https://nominatim.openstreetmap.org/search', {
            params: { format: 'jsonv2', postalcode: pincode, country: 'India' },
        }).subscribe({
            next: (results) => {
                const first = results?.[0];
                if (first && this.map) {
                    this.map.setView([Number(first.lat), Number(first.lon)], 16);
                }
            },
        });
    }

    useCurrentLocation(): void {
        if (!navigator.geolocation) return;
        this.locating = true;
        this.cdr.markForCheck();

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                this.locating = false;
                this.map?.setView([pos.coords.latitude, pos.coords.longitude], 16);
                this.cdr.markForCheck();
            },
            () => {
                this.locating = false;
                this.cdr.markForCheck();
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
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
        if ((ctrl.touched || ctrl.dirty) && ctrl.hasError('minlength')) return 'Please enter a valid name.';
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

        if (cleaned.length === 6) {
            this.geocodeByPincode(cleaned);
        }
    }

    onPhoneInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input) return;
        // remove non-digit characters and limit to 10
        const cleaned = (input.value || '').replace(/\D/g, '').slice(0, 10);
        this.phoneControl.setValue(cleaned, { emitEvent: false });
    }

    goBack(): void {
        this.location.back();
    }

    saveAddress(): void {
        if (this.addressForm.invalid) {
            this.addressForm.markAllAsTouched();
            this.cdr.markForCheck();
            return;
        }

        const value = this.addressForm.value;
        const [cityPart, statePart] = (value.cityState || '').split(',').map((s: string) => s.trim());
        const line2 = [value.area, value.landmark].filter(Boolean).join(', ');

        const payload: AddressPayload = {
            receiverName: value.fullName,
            mobile: value.phone,
            line1: value.flat,
            line2,
            city: cityPart || '',
            state: statePart || cityPart || '',
            postalCode: value.pincode,
            latitude: this.latitude,
            longitude: this.longitude,
        };

        this.saving = true;
        this.saveError = null;
        this.cdr.markForCheck();

        const save$ = this.editAddressId
            ? this.addressService.updateAddress(this.editAddressId, payload)
            : this.addressService.addAddress(payload);

        save$.subscribe({
            next: () => {
                this.saving = false;
                this.cdr.markForCheck();
                this.location.back();
            },
            error: (err: any) => {
                this.saving = false;
                this.saveError = err?.error?.message || 'Could not save this address right now. Please try again.';
                this.cdr.markForCheck();
            },
        });
    }
}
