import { HttpErrorResponse, HttpHandler, HttpRequest } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { AppCheckInterceptor } from './app-check.interceptor';
import { FirebaseRuntimeService } from '../services/firebase-runtime.service';
import { environment } from '../../../environments/environment';

describe('AppCheckInterceptor', () => {
  const request = new HttpRequest('POST', `${environment.apiUrl}/pet-message/home/overlay/dismiss`, null);

  it('does not resend a failed dismiss request', done => {
    const runtime = {
      shouldAttachAppCheck: () => true,
      getAppCheckToken: () => Promise.resolve('app-check-token'),
    } as unknown as FirebaseRuntimeService;
    const handler = jasmine.createSpyObj<HttpHandler>('HttpHandler', ['handle']);
    const failure = new HttpErrorResponse({ status: 500, statusText: 'Server Error' });
    handler.handle.and.returnValue(throwError(() => failure));

    new AppCheckInterceptor(runtime).intercept(request, handler).subscribe({
      next: () => done.fail('Expected the request to fail'),
      error: error => {
        expect(error).toBe(failure);
        expect(handler.handle).toHaveBeenCalledTimes(1);
        done();
      },
    });
  });

  it('falls back once without App Check if token acquisition fails', done => {
    const runtime = {
      shouldAttachAppCheck: () => true,
      getAppCheckToken: () => Promise.reject(new Error('token unavailable')),
    } as unknown as FirebaseRuntimeService;
    const handler = jasmine.createSpyObj<HttpHandler>('HttpHandler', ['handle']);
    handler.handle.and.returnValue(of());

    new AppCheckInterceptor(runtime).intercept(request, handler).subscribe({
      complete: () => {
        expect(handler.handle).toHaveBeenCalledTimes(1);
        expect(handler.handle.calls.mostRecent().args[0].headers.has('X-Firebase-AppCheck')).toBeFalse();
        done();
      },
    });
  });
});
