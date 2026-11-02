import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { Address, AddressPayload } from '../models/address.model';

@Injectable({ providedIn: 'root' })
export class AddressApi {
    private base = environment.apiUrl || '';

    constructor(private http: HttpClient, private authService: AuthService) {}

    private headers(): HttpHeaders {
        const token = this.authService.getToken();
        let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        if (token) {
            const value = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            headers = headers.set('Authorization', value);
        }
        return headers;
    }

    getAddresses(): Observable<Address[]> {
        return this.http.get<Address[]>(`${this.base}/user/addresses`, { headers: this.headers() });
    }

    addAddress(payload: AddressPayload): Observable<Address> {
        return this.http.post<Address>(`${this.base}/user/addresses`, payload, { headers: this.headers() });
    }

    updateAddress(id: number, payload: AddressPayload): Observable<Address> {
        return this.http.put<Address>(`${this.base}/user/addresses/${id}`, payload, { headers: this.headers() });
    }

    setDefaultAddress(id: number): Observable<Address> {
        return this.http.put<Address>(`${this.base}/user/addresses/${id}/default`, {}, { headers: this.headers() });
    }

    deleteAddress(id: number): Observable<void> {
        return this.http.delete<void>(`${this.base}/user/addresses/${id}`, { headers: this.headers() });
    }
}
