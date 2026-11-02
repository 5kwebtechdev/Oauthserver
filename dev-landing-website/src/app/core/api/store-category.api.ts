import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { StoreCategory } from '../models/store-category.model';

@Injectable({ providedIn: 'root' })
export class StoreCategoryApi {
    private base = environment.apiUrl || '';

    constructor(private http: HttpClient, private authService: AuthService) { }

    private headers(): HttpHeaders {
        const token = this.authService.getToken();
        let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        if (token) {
            const value = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            headers = headers.set('Authorization', value);
        }
        return headers;
    }

    getAllCategories(): Observable<StoreCategory[]> {
        const url = `${this.base}/public/store/categories/all`;
        return this.http.get<StoreCategory[]>(url, { headers: this.headers() });
    }
}
