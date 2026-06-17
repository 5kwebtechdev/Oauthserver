import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { Router } from '@angular/router';

@Component({
    selector: 'address-input',
    standalone: true,
    imports: [CommonModule, IonicModule, ReactiveFormsModule, SupermeNavigatorComponent, SupermeButtonComponent],
    templateUrl: './address-input.components.html',
    styleUrls: ['./address-input.components.scss']
})
export class AddressInputComponent {
    addressForm: FormGroup;

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
