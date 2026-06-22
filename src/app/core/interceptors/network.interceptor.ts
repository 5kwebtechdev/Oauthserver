import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NetworkIssueService } from '../components/network-issue/network-issue.service';

@Injectable()
export class NetworkInterceptor implements HttpInterceptor {
  constructor(private network: NetworkIssueService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error) => {
        // Only show the offline screen when the device is truly offline.
        // HTTP 0 can also occur for CORS or cancelled requests so we combine
        // it with navigator.onLine to avoid false positives.
        const isReallyOffline =
          !navigator.onLine ||
          (error instanceof HttpErrorResponse && error.status === 0 && !navigator.onLine);

        if (isReallyOffline) {
          this.network.show();
        }

        return throwError(() => error);
      })
    );
  }
}
