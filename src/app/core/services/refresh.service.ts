import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

/**
 * Global pull-to-refresh service.
 *
 * The authenticated shell hosts a single `<ion-refresher>`. When the user
 * pulls down, this service broadcasts a refresh event to every active page /
 * component that has registered a callback.
 *
 * Pages register via `registerRefreshHandler` in their `ngOnInit` and
 * unregister via `unregisterRefreshHandler` in their `ngOnDestroy`.
 */
@Injectable({ providedIn: 'root' })
export class RefreshService {
  /** Internal subject – emits every time the user pulls to refresh. */
  private refreshSubject = new Subject<void>();

  /** Observable that active components subscribe to. */
  refresh$: Observable<void> = this.refreshSubject.asObservable();

  /**
   * Map of registered async refresh callbacks keyed by a unique id
   * (usually the component class name).
   * Each callback should return a Promise that resolves when the
   * component-specific refresh work is done.
   */
  private handlers = new Map<string, () => Promise<void>>();

  /**
   * Register a refresh handler for a component.
   * @param id   Unique key – use the component class name, e.g. `'UserDashboard'`
   * @param fn   Async function that reloads the component's data.
   */
  registerRefreshHandler(id: string, fn: () => Promise<void>): void {
    this.handlers.set(id, fn);
  }

  /**
   * Unregister a previously registered handler (call in ngOnDestroy).
   */
  unregisterRefreshHandler(id: string): void {
    this.handlers.delete(id);
  }

  /**
   * Called by the authenticated shell after it validates the session.
   * Runs **all** currently-registered handlers in parallel and waits
   * for them to complete so the refresher spinner stays visible.
   */
  async triggerRefresh(): Promise<void> {
    // Notify subscribers (if any component uses the observable directly)
    this.refreshSubject.next();

    // Run all registered handler callbacks in parallel
    const tasks = Array.from(this.handlers.values()).map(fn =>
      fn().catch(err => console.error('[RefreshService] handler error:', err))
    );
    await Promise.all(tasks);
  }
}
