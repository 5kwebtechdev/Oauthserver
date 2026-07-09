import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthApi } from './auth.api';

export interface Address {
    id: number;
    fullName: string;
    phone: string;
    flat: string;
    area: string;
    landmark?: string | null;
    pincode: string;
    cityState?: string | null;
    isDefault: boolean;
}

export interface AddressPayload {
    fullName: string;
    phone: string;
    flat: string;
    area: string;
    landmark?: string | null;
    pincode: string;
    cityState?: string | null;
    isDefault: boolean;
}

@Injectable({ providedIn: 'root' })
export class AddressApi {
    private base = environment.apiUrl;

    constructor(private http: HttpClient, private authApi: AuthApi) {}

    private headers(): HttpHeaders {
        const token = this.authApi.getToken();
        let h = new HttpHeaders({ 'Content-Type': 'application/json', 'x-skip-loading': '1' });
        if (token) {
            h = h.set('Authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`);
        } else if (environment.apiAuthToken) {
            const env = environment.apiAuthToken;
            h = h.set('Authorization', env.startsWith('Bearer ') ? env : `Bearer ${env}`);
        }
        return h;
    }

    getAddresses(): Observable<Address[]> {
        return this.http.get<Address[]>(`${this.base}/user/addresses`, { headers: this.headers() });
    }

    addAddress(payload: AddressPayload): Observable<Address> {
        return this.http.post<Address>(`${this.base}/user/addresses`, payload, { headers: this.headers() });
    }

    updateAddress(addressId: number, payload: AddressPayload): Observable<Address> {
        return this.http.put<Address>(`${this.base}/user/addresses/${addressId}`, payload, { headers: this.headers() });
    }

    setDefaultAddress(addressId: number): Observable<any> {
        return this.http.put(`${this.base}/user/addresses/${addressId}/default`, {}, { headers: this.headers() });
    }

    deleteAddress(addressId: number): Observable<any> {
        return this.http.delete(`${this.base}/user/addresses/${addressId}`, { headers: this.headers() });
    }
}
