import { Injectable, Injector } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';

/** Publish committed wallet balances from earning actions to all Home consumers. */
@Injectable()
export class WalletBalanceInterceptor implements HttpInterceptor {
  constructor(private readonly injector: Injector) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const base = environment.apiUrl.replace(/\/$/, '');
    const path = request.url.startsWith(base + '/') ? request.url.slice(base.length).split('?')[0] : '';
    const earningAction = request.method === 'POST' && (
      /^\/(?:habits|tasks)\/complete\/[^/]+$/.test(path)
      || path === '/journal/add'
      || /^\/challenges\/[^/]+\/submit-all$/.test(path)
      || /^\/articles\/[^/]+\/(?:complete|submit-answers)$/.test(path)
      || /^\/courses\/lessons\/[^/]+\/complete$/.test(path));
    if (!earningAction) return next.handle(request);

    const auth = this.injector.get(AuthService);
    const accountId = auth.getUserId();
    const token = auth.getToken();
    return next.handle(request).pipe(tap(event => {
      if (!(event instanceof HttpResponse) || !accountId || !token
        || accountId !== auth.getUserId() || token !== auth.getToken()) return;
      const body = event.body as any;
      const result = body?.data ?? body;
      if (body?.success === false || result?.success === false || result?.requiresConfirmation === true
        || result?.walletUserId == null || String(result.walletUserId) !== String(accountId)) return;
      this.injector.get(UserService).updateCoinBalance(result.totalCoins);
    }));
  }
}
