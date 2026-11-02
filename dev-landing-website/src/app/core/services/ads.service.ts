import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Ad {
    id: number;
    title: string;
    order: number;
    image: string;
    clickActionType: 'NO_ACTION' | 'EXTERNAL_URL' | 'IN_APP_SCREEN' | string;
    externalUrl: string | null;
    inAppScreen: string | null;
}

@Injectable({
    providedIn: 'root'
})
export class AdsService {
    private readonly adsApi = `${environment.apiUrl}/ads/age`;

    constructor(private http: HttpClient) { }

    getAdsByAge(age: number, screen: string): Observable<Ad[]> {
        return this.http.get<Ad[]>(this.adsApi, { params: { age, screen } });
    }
}
