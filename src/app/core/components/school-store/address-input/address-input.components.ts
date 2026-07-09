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
            postalCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
            city:       ['', Validators.required],
            state:      ['', Validators.required],
            line1:      ['', [Validators.required, Validators.minLength(5)]],
            line2:      [''],
            landmark:   [''],
            receiverName: ['', [Validators.required, Validators.pattern(/^[A-Za-z\s]+$/), Validators.minLength(3)]],
            mobile:     ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
            isDefault:  [false]
        });
    }

    ngOnInit(): void {
        const idParam = this.route.snapshot.queryParamMap.get('addressId');
        if (idParam) {
            this.editMode = true;
            this.addressId = Number(idParam);
            const state = (history.state || {}) as { address?: Address };
            if (state.address) {
                const a = state.address;
                // Support both new field names and old field names for backward compat
                this.addressForm.patchValue({
                    postalCode:   (a as any).postalCode ?? (a as any).pincode ?? '',
                    city:         a.city ?? '',
                    state:        a.state ?? '',
                    line1:        a.line1 ?? (a as any).flat ?? '',
                    line2:        a.line2 ?? (a as any).area ?? '',
                    landmark:     (a as any).landmark ?? '',
                    receiverName: a.receiverName ?? (a as any).fullName ?? '',
                    mobile:       a.mobile ?? (a as any).phone ?? '',
                    isDefault:    a.isDefault ?? false
                });
            }
        }
    }

    get postalCodeCtrl()    { return this.addressForm.get('postalCode')!; }
    get cityCtrl()          { return this.addressForm.get('city')!; }
    get stateCtrl()         { return this.addressForm.get('state')!; }
    get line1Ctrl()         { return this.addressForm.get('line1')!; }
    get line2Ctrl()         { return this.addressForm.get('line2')!; }
    get receiverNameCtrl()  { return this.addressForm.get('receiverName')!; }
    get mobileCtrl()        { return this.addressForm.get('mobile')!; }

    // Aliases used in HTML (keep old names pointing to new controls)
    get pincodeControl()    { return this.postalCodeCtrl; }
    get flatControl()       { return this.line1Ctrl; }
    get areaControl()       { return this.line2Ctrl; }
    get fullNameControl()   { return this.receiverNameCtrl; }
    get phoneControl()      { return this.mobileCtrl; }

    get pincodeError(): string | null {
        const c = this.postalCodeCtrl;
        if (!c.touched && !c.dirty) return null;
        if (c.hasError('required')) return 'Pincode is required.';
        if (c.hasError('pattern'))  return 'Pincode must be 6 digits.';
        return null;
    }

    get flatError(): string | null {
        const c = this.line1Ctrl;
        if (!c.touched && !c.dirty) return null;
        if (c.hasError('required'))   return 'Flat / House No is required.';
        if (c.hasError('minlength'))  return 'Please enter a valid address.';
        return null;
    }

    get areaError(): string | null {
        const c = this.line2Ctrl;
        if (!c.touched && !c.dirty) return null;
        if (c.hasError('required'))   return 'Area / Street is required.';
        if (c.hasError('minlength'))  return 'Please enter a valid address.';
        return null;
    }

    get fullNameError(): string | null {
        const c = this.receiverNameCtrl;
        if (!c.touched && !c.dirty) return null;
        if (c.hasError('required')) return 'Name is required.';
        if (c.hasError('pattern'))  return 'Name should only contain letters.';
        const val = (c.value || '').toString().trim();
        if (val && (!val.includes(' ') || val.split(' ').filter(Boolean).length < 2)) {
            return 'Please enter your full name.';
        }
        return null;
    }

    get phoneError(): string | null {
        const c = this.mobileCtrl;
        if (!c.touched && !c.dirty) return null;
        if (c.hasError('required')) return 'Phone number is required.';
        if (c.hasError('pattern'))  return 'Please enter a valid 10-digit mobile number.';
        return null;
    }

    get cityError(): string | null {
        const c = this.cityCtrl;
        if (!c.touched && !c.dirty) return null;
        if (c.hasError('required')) return 'City is required.';
        return null;
    }

    get stateError(): string | null {
        const c = this.stateCtrl;
        if (!c.touched && !c.dirty) return null;
        if (c.hasError('required')) return 'State is required.';
        return null;
    }

    onPincodeInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input) return;
        const cleaned = (input.value || '').replace(/\D/g, '').slice(0, 6);
        this.postalCodeCtrl.setValue(cleaned, { emitEvent: false });
    }

    onPhoneInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input) return;
        const cleaned = (input.value || '').replace(/\D/g, '').slice(0, 10);
        this.mobileCtrl.setValue(cleaned, { emitEvent: false });
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
            receiverName: v.receiverName,
            mobile:       v.mobile,
            line1:        v.line1,
            line2:        v.line2 || null,
            city:         v.city,
            state:        v.state,
            postalCode:   v.postalCode,
            latitude:     null,
            longitude:    null
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
