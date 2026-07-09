import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { Router, ActivatedRoute } from '@angular/router';
import { AddressService } from '../../../services/address.service';
import { Address, AddressPayload } from '../../../api/address.api';
import { CustomToastService } from '../../../services/custom-toast.service';

@Component({
    selector: 'address-input',
    standalone: true,
    imports: [CommonModule, IonicModule, ReactiveFormsModule, SupermeNavigatorComponent, SupermeButtonComponent],
    templateUrl: './address-input.components.html',
    styleUrls: ['./address-input.components.scss']
})
export class AddressInputComponent implements OnInit {
    addressForm: FormGroup;
    editMode = false;
    addressId: number | null = null;
    saving = false;

    constructor(
        private cdr: ChangeDetectorRef,
        private fb: FormBuilder,
        private router: Router,
        private route: ActivatedRoute,
        private addressService: AddressService,
        private toastService: CustomToastService
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
        const idParam = this.route.snapshot.queryParamMap.get('addressId');
        if (idParam) {
            this.editMode = true;
            this.addressId = Number(idParam);
            const state = (history.state || {}) as { address?: Address };
            if (state.address) {
                this.addressForm.patchValue({
                    pincode: state.address.pincode ?? '',
                    cityState: state.address.cityState ?? '',
                    flat: state.address.flat ?? '',
                    area: state.address.area ?? '',
                    landmark: state.address.landmark ?? '',
                    fullName: state.address.fullName ?? '',
                    phone: state.address.phone ?? '',
                    isDefault: state.address.isDefault ?? false
                });
            }
        }
    }

    get pincodeControl() { return this.addressForm.get('pincode')!; }
    get flatControl() { return this.addressForm.get('flat')!; }
    get areaControl() { return this.addressForm.get('area')!; }
    get fullNameControl() { return this.addressForm.get('fullName')!; }
    get phoneControl() { return this.addressForm.get('phone')!; }

    get pincodeError(): string | null {
        const ctrl = this.pincodeControl;
        if (!ctrl) return null;
        if ((ctrl.touched || ctrl.dirty) && ctrl.hasError('required')) return 'Pincode is required.';
        if ((ctrl.touched || ctrl.dirty) && ctrl.hasError('pattern')) return 'Pincode must be 6 digits.';
        return null;
    }

    get flatError(): string | null {
        const ctrl = this.flatControl;
        if (!ctrl) return null;
        if ((ctrl.touched || ctrl.dirty) && ctrl.hasError('required')) return 'Details are required for delivery.';
        if ((ctrl.touched || ctrl.dirty) && ctrl.hasError('minlength')) return 'Please enter a valid address.';
        return null;
    }

    get areaError(): string | null {
        const ctrl = this.areaControl;
        if (!ctrl) return null;
        if ((ctrl.touched || ctrl.dirty) && ctrl.hasError('required')) return 'Details are required for delivery.';
        if ((ctrl.touched || ctrl.dirty) && ctrl.hasError('minlength')) return 'Please enter a valid address.';
        return null;
    }

    get fullNameError(): string | null {
        const ctrl = this.fullNameControl;
        if (!ctrl) return null;
        if ((ctrl.touched || ctrl.dirty) && ctrl.hasError('required')) return 'Name is required.';
        if ((ctrl.touched || ctrl.dirty) && ctrl.hasError('pattern')) return 'Name should only contain letters.';
        const val = (ctrl.value || '').toString().trim();
        if ((ctrl.touched || ctrl.dirty) && val.length > 0) {
            if (!val.includes(' ') || val.split(' ').filter(Boolean).length < 2) return 'Please enter your full name';
        }
        return null;
    }

    get phoneError(): string | null {
        const ctrl = this.phoneControl;
        if (!ctrl) return null;
        if ((ctrl.touched || ctrl.dirty) && ctrl.hasError('required')) return 'Phone number is required.';
        if ((ctrl.touched || ctrl.dirty) && ctrl.hasError('pattern')) return 'Please enter a valid 10-digit mobile number.';
        return null;
    }

    onPincodeInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input) return;
        const cleaned = (input.value || '').replace(/\D/g, '').slice(0, 6);
        this.pincodeControl.setValue(cleaned, { emitEvent: false });
    }

    onPhoneInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input) return;
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
        if (this.saving) return;
        this.saving = true;
        this.cdr.detectChanges();

        const v = this.addressForm.value;
        const payload: AddressPayload = {
            fullName: v.fullName,
            phone: v.phone,
            flat: v.flat,
            area: v.area,
            landmark: v.landmark || null,
            pincode: v.pincode,
            cityState: v.cityState || null,
            isDefault: v.isDefault ?? false
        };

        const action$ = this.editMode && this.addressId != null
            ? this.addressService.updateAddress(this.addressId, payload)
            : this.addressService.addAddress(payload);

        action$.subscribe({
            next: () => {
                this.saving = false;
                const msg = this.editMode ? 'Address updated successfully.' : 'Address added successfully.';
                this.toastService.success(msg);
                try { window.history.back(); } catch (e) { }
            },
            error: () => {
                this.saving = false;
                this.toastService.error('Failed to save address. Please try again.');
                this.cdr.detectChanges();
            }
        });
    }
}
