import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AddressApi, Address, AddressPayload } from '../api/address.api';

@Injectable({ providedIn: 'root' })
export class AddressService {
    private _addresses = new BehaviorSubject<Address[]>([]);
    readonly addresses$: Observable<Address[]> = this._addresses.asObservable();

    constructor(private addressApi: AddressApi) {}

    get snapshot(): Address[] {
        return this._addresses.getValue();
    }

    load(): Observable<Address[]> {
        return this.addressApi.getAddresses().pipe(
            tap(list => this._addresses.next(Array.isArray(list) ? list : []))
        );
    }

    addAddress(payload: AddressPayload): Observable<Address> {
        return this.addressApi.addAddress(payload).pipe(
            tap(() => this.load().subscribe())
        );
    }

    updateAddress(id: number, payload: AddressPayload): Observable<Address> {
        return this.addressApi.updateAddress(id, payload).pipe(
            tap(() => this.load().subscribe())
        );
    }

    setDefault(id: number): Observable<any> {
        return this.addressApi.setDefaultAddress(id).pipe(
            tap(() => this.load().subscribe())
        );
    }

    deleteAddress(id: number): Observable<any> {
        return this.addressApi.deleteAddress(id).pipe(
            tap(() => this.load().subscribe())
        );
    }

    reset(): void {
        this._addresses.next([]);
    }
}
