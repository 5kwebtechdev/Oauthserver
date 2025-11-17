import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../services/loading.service';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
    constructor(private loading: LoadingService) { }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const skip = req.headers.has('x-skip-loading') || req.headers.has('X-Skip-Loading');
        if (skip) {
            return next.handle(req);
        }

        const message = req.headers.get('x-loading-message') ?? undefined;

        const token = this.loading.show(message, { delayMs: 120, minVisibleMs: 200 });
        return next.handle(req).pipe(
            finalize(() => {
                this.loading.hide(token);
            })
        );
    }
}
