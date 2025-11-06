import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HttpHeaders } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class FamilyService {
    private baseUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    createFamily(familyName: string): Observable<any> {
        const headers = environment.apiAuthToken ? new HttpHeaders({
            Authorization: environment.apiAuthToken,
        }) : undefined;
        return this.http.post(`${this.baseUrl}/family/create?familyName=${familyName}`, {}, { headers });
    }

    joinFamily(token: string): Observable<any> {
        const headers = environment.apiAuthToken ? new HttpHeaders({
            Authorization: environment.apiAuthToken,
        }) : undefined;
        return this.http.post(`${this.baseUrl}/family/join`, {
            token,
        }, { headers });
    }
}