import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AddressApi } from '../api/address.api';
import { Address, AddressPayload } from '../models/address.model';
import { CoreService } from './core.service';

@Injectable({ providedIn: 'root' })
export class AddressService {
    private addressesSubject = new BehaviorSubject<Address[]>([]);
    private loadingSubject = new BehaviorSubject<boolean>(false);

    public addresses$ = this.addressesSubject.asObservable();
    public loading$ = this.loadingSubject.asObservable();

    constructor(private api: AddressApi, private coreService: CoreService) {}

    get defaultAddress(): Address | null {
        const all = this.addressesSubject.value;
        return all.find(a => a.isDefault) ?? all[0] ?? null;
    }

    formatAddress(a: Address): string {
        const parts = [a.line1, a.line2, a.city, a.state].filter(Boolean);
        const body = parts.join(', ');
        const pincode = a.postalCode ? ` - ${a.postalCode}` : '';
        return body + pincode;
    }

    loadAddresses(): Observable<Address[]> {
        this.loadingSubject.next(true);
        return this.api.getAddresses().pipe(
            tap(addresses => {
                this.addressesSubject.next(addresses || []);
                this.loadingSubject.next(false);
            }),
            catchError(error => {
                this.loadingSubject.next(false);
                this.coreService.triggerToast('Failed to load addresses. Please try again.');
                console.error('Error loading addresses:', error);
                return throwError(() => error);
            })
        );
    }

    setDefaultAddress(id: number): Observable<Address> {
        return this.api.setDefaultAddress(id).pipe(
            tap(() => {
                const updated = this.addressesSubject.value.map(a => ({ ...a, isDefault: a.id === id }));
                this.addressesSubject.next(updated);
            }),
            catchError(error => {
                this.coreService.triggerToast('Failed to update default address. Please try again.');
                console.error('Error setting default address:', error);
                this.loadAddresses().subscribe();
                return throwError(() => error);
            })
        );
    }

    deleteAddress(id: number): Observable<void> {
        return this.api.deleteAddress(id).pipe(
            tap(() => {
                const remaining = this.addressesSubject.value.filter(a => a.id !== id);
                if (remaining.length > 0 && !remaining.some(a => a.isDefault)) {
                    remaining[0] = { ...remaining[0], isDefault: true };
                }
                this.addressesSubject.next(remaining);
            }),
            catchError(error => {
                this.coreService.triggerToast(error?.error?.message || 'Failed to delete address. Please try again.');
                console.error('Error deleting address:', error);
                return throwError(() => error);
            })
        );
    }

    addAddress(payload: AddressPayload): Observable<Address> {
        return this.api.addAddress(payload).pipe(
            tap(() => { this.loadAddresses().subscribe(); }),
            catchError(error => {
                console.error('Error adding address:', error);
                return throwError(() => error);
            })
        );
    }

    updateAddress(id: number, payload: AddressPayload): Observable<Address> {
        return this.api.updateAddress(id, payload).pipe(
            tap(() => { this.loadAddresses().subscribe(); }),
            catchError(error => {
                console.error('Error updating address:', error);
                return throwError(() => error);
            })
        );
    }
}
