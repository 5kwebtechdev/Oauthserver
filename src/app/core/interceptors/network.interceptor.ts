import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NetworkIssueService } from '../components/network-issue/network-issue.service';

@Injectable()
export class NetworkInterceptor implements HttpInterceptor {
  constructor(private network: NetworkIssueService) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error) => {
        // Detect network errors: status 0, ProgressEvent, or browser offline
        const isNetworkError =
          !navigator.onLine ||
          error?.status === 0 ||
          (error instanceof HttpErrorResponse && error.status === 0) ||
          error instanceof ProgressEvent ||
          (error?.error instanceof ProgressEvent);

        console.warn('[NetworkInterceptor] caught error', { url: req.url, status: error?.status, isNetworkError, error });

        if (isNetworkError) {
          console.warn('[NetworkInterceptor] showing network issue screen');
          this.network.show();
        }
        return throwError(() => error);
      })
    );
  }
}
