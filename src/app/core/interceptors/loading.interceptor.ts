import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { finalize, catchError, timeout } from 'rxjs/operators';
import { LoadingService } from '../services/loading.service';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
    // 30 second timeout for Android network issues
    private readonly REQUEST_TIMEOUT = 30000;

    constructor(private loading: LoadingService) { }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const explicitSkip = req.headers.has('x-skip-loading');
        const explicitShow = req.headers.has('x-show-loading');
        const passiveRequest = req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS';
        const skip = explicitSkip || (passiveRequest && !explicitShow);

        // Loader-control headers are internal UI hints. Always remove them
        // before forwarding the request so they cannot cause a CORS preflight.
        const cleanRequest = req.clone({
            headers: req.headers
                .delete('x-skip-loading')
                .delete('x-show-loading')
        });

        if (skip) {
            // GET/HEAD calls are passive screen data and background refreshes.
            // Navigation already has its own loader, so showing another global
            // blocking overlay here made cached Home views restart the spinner
            // on scroll, focus and back navigation.
            return next.handle(cleanRequest);
        }

        const message = req.headers.get('x-loading-message') ?? undefined;

        const token = this.loading.show(message, { delayMs: 120, minVisibleMs: 200 });

        return next.handle(cleanRequest).pipe(
            // Add timeout to prevent stuck loaders on Android
            timeout(this.REQUEST_TIMEOUT),
            catchError((error) => {
                // Handle timeout errors
                if (error instanceof TimeoutError) {
                    console.error('[LoadingInterceptor] Request timed out:', req.url);
                    return throwError(() => ({
                        status: 0,
                        statusText: 'Timeout',
                        message: 'Request timed out. Please check your internet connection.',
                        error: { message: 'Request timed out. Please check your internet connection.' }
                    }));
                }

                // Handle ProgressEvent (network failures on Android)
                if (error instanceof ProgressEvent || (error && error.type === 'error' && !error.status)) {
                    console.error('[LoadingInterceptor] Network error (ProgressEvent):', req.url);
                    return throwError(() => ({
                        status: 0,
                        statusText: 'Network Error',
                        message: 'Network error. Please check your internet connection.',
                        error: { message: 'Network error. Please check your internet connection.' }
                    }));
                }

                return throwError(() => error);
            }),
            finalize(() => {
                this.loading.hide(token);
            })
        );
    }
}
