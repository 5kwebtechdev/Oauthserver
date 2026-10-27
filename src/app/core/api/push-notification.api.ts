import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthApi } from './auth.api';

@Injectable({ providedIn: 'root' })
export class PushNotificationApi {
  private base = environment.apiUrl;

  constructor(private http: HttpClient, private authApi: AuthApi) {}

  private authHeaders(): HttpHeaders {
    const token = this.authApi.getToken();
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`);
    }
    return headers;
  }

  /**
   * POST /v1/device/register?token=FCM_TOKEN&deviceType=ANDROID
   * Registers an FCM token for the authenticated user.
   * deviceType: ANDROID | IOS | WEB
   */
  registerToken(fcmToken: string, deviceType: string, appBuildNumber?: string): Observable<any> {
    let params = new HttpParams()
      .set('token', fcmToken)
      .set('deviceType', deviceType);
    // Optional for compatibility; never guess a build when native metadata is unavailable.
    if (appBuildNumber && /^\d+$/.test(appBuildNumber)) {
      params = params.set('appBuildNumber', appBuildNumber);
    }

    return this.http.post(
      `${this.base}/device/register`,
      null,
      { headers: this.authHeaders(), params }
    );
  }

  /**
   * DELETE /v1/device/remove?token=FCM_TOKEN
   * Removes the FCM token so notifications stop after logout.
   * No auth header required by the backend.
   */
  removeToken(fcmToken: string): Observable<any> {
    const params = new HttpParams().set('token', fcmToken);
    return this.http.delete(`${this.base}/device/remove`, { params });
  }
}
