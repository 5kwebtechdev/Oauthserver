# Parent Account — Child Selection & Data Mapping

This document explains how selecting a child in the Parent Account context determines which child's data is shown in the Calendar and across the app. It describes the data model conventions, how selection is stored and propagated, common filtering rules, and implementation recommendations.

## Overview

- **Selected child**: the single child the parent has actively chosen to view/manage (identified by `child.id`).
- **Effect**: Calendar views, habit lists, reminders, metrics and any child-scoped components must show only data belonging to the selected child.

## Data model (conventions)

- Child record fields (typical):
  - `id` (string, UUID) — unique child identifier.
  - `name` (string)
  - `birthDate` (string | ISO date)
  - `avatarUrl` (string)
  - `habits` (array of habit IDs or objects)
  - `preferences` (object)

- Event / data objects should include a `childId` field that ties them to a specific child:

```ts
interface HabitEvent {
  id: string;
  childId: string; // ties event to child
  habitId: string;
  date: string; // ISO
  status: 'completed' | 'missed' | 'planned';
}
```

### Clarification: `forUserId` and `assignedTo`

- In this codebase `forUserId` and `assignedTo` are used interchangeably to indicate the child user id. Treat them as equivalent aliases for the child's `id` when filtering or sending payloads.

- Client-side filtering example (cover both fields):

```ts
const displayed = allEvents.filter(e => e.childId === selectedChildId
  || e.forUserId === selectedChildId
  || e.assignedTo === selectedChildId);
```

- Server-side requests: prefer passing the same identifier in whichever query param the API expects, or both if the API accepts either. Example:

```
GET /api/events?forUserId=<selectedChildId>
```

If the API supports `assignedTo` instead, use that consistently. The key point is the selected child id should be the authoritative filter value across the app.

## How selection is stored & propagated

1. User selects a child from the Parent Account UI (e.g., `ParentAccountComponent`).
2. The selection is saved in a shared place so all child-scoped components can react:
   - Preferred: a small shared service (e.g., `ChildSelectionService`) that exposes an observable `selectedChild$` and methods `setSelectedChild(child)` / `getSelectedChild()`.
   - Optional persistence: store the selected child id in `localStorage` (key example: `selectedChildId`) so selection persists across reloads.

Example service API:

```ts
class ChildSelectionService {
  private selectedChildSubject = new BehaviorSubject<string | null>(null);
  selectedChild$ = this.selectedChildSubject.asObservable();

  setSelectedChild(childId: string) {
    this.selectedChildSubject.next(childId);
    localStorage.setItem('selectedChildId', childId);
  }

  loadFromStorage() {
    const id = localStorage.getItem('selectedChildId');
    if (id) this.selectedChildSubject.next(id);
  }
}
```

3. Components (Calendar, Habit list, Dashboards) subscribe to `selectedChild$`. When a new `childId` emits they should re-query or re-filter their data.

## Filtering rules (calendar and lists)

- Always filter child-scoped collections by `childId`.
- Example filter for events shown in calendar:

```ts
const displayed = allEvents.filter(e => e.childId === selectedChildId);
```

- If your API supports server-side filtering, include `?childId=<id>` in the request to avoid fetching unrelated data.

## Routing / params

- Prefer shared service for selection rather than encoding `childId` in every route. Use route params only if deep-linking/bookmarking a specific child's view is required (e.g., `/parent/child/<id>/calendar`). If using route params, keep them synced with the shared service.

## Update/Sync patterns

- When selection changes:
  - Components should show a loading state while fetching or filtering new child data.
  - Cancel or ignore inflight requests for prior `childId` to prevent race conditions.
  - Use RxJS switchMap on `selectedChild$` to automatically cancel previous requests.

Example (RxJS):

```ts
this.childSelection.selectedChild$
  .pipe(
    filter(id => !!id),
    switchMap(id => this.api.getChildEvents(id))
  )
  .subscribe(events => this.events = events);
```

## Backend / API considerations

- API endpoints that return child-scoped data should accept `childId` as a query or path param and enforce access control so parents can only request data for children they manage.
- On writes (creating events / marking habit complete) include `childId` in the payload.

## Edge cases & UX notes

- If parent manages multiple children and none is selected, show a chooser modal or default to first child.
- When switching child quickly, debounce the selection UI if it triggers heavy network traffic.
- If a child's data is missing (deleted or revoked), clear selection and prompt user.

## Developer checklist

- [ ] Add `ChildSelectionService` if not present.
- [ ] Ensure all child-scoped data objects include `childId`.
- [ ] Update CalendarComponent to subscribe to `selectedChild$` and filter via `childId`.
- [ ] Persist `selectedChildId` to `localStorage` (optional but recommended).
- [ ] Update API calls to accept `childId` for server-side filtering.

## Where to look in this repo

Parent account UI lives in `src/app/authenticated/parent-account` — update `parent-account.component.ts` to call the selection service when the user chooses a child. The Calendar lives at `src/app/core/components/habit-section/...` (see calendar-related components) and should subscribe to `selectedChild$` and filter by `childId` as shown above.

---

If you'd like, I can add a `ChildSelectionService` skeleton and wire the calendar component to it in this repo.
Parent Account Component
========================

Simple explanation
------------------
- This screen is the Parent Account dashboard. It shows the parent's profile and lets a parent view and switch to a child's profile. The parent can see child stats (completion, consistency, improvement, app score), view mood, open calendar/notes, and see habit content for the selected child.

What is happening (high level)
------------------------------
- On load, the component checks the logged-in user is a parent. If not, it redirects to the normal user dashboard.
- It tries to fetch a "vibes display" list from the Mood API. The API result is used as the children list (each item contains a child's stats + mood + avatar info).
- The component caches children in localStorage (key `mb_children`) and restores a previously selected child using `ProfileSelectorService`.
- If there are no children, the component switches to a parent-only view (shows parent's avatar and stats).
- Selecting a child calls `selectChild()` which tells `ProfileSelectorService` about the child, applies the child's stats into the UI, and asks `MoodService` to show that child's mood first. Other components (like habits) are expected to reload from a shared child ID stream.

UI elements and what the parent can access
-----------------------------------------
- Header area:
  - Parent/avatar (clickable → opens parent profile route).
  - Parent name.
  - Switch user trigger (chevron) — opens a popup with children to pick.
  - Tools: Notes and Calendar shortcuts on the right.
- Stats/ring area:
  - Completion Rate, Consistency Rate, Improvement Rate, App Score — shown using `mindful-completion` components.
- Body area:
  - School shopping banner (link to `school-store`).
  - Mood display (read-only `mood-selector`).
  - `ad-banner` area.
  - `habit-page-content` which loads habits/tasks for the currently selected child (or parent view if no child).
- Child switch popup:
  - List of child rows with avatar, name, relationship, and a selected check mark.

How parent <-> child interaction works (step-by-step)
----------------------------------------------------
1. Data fetch: `moodService.getVibesDisplay()` returns an array of child vibe objects.
2. Mapping: Each item is mapped into `children` with resolved avatar URL via `ChildSelfImageService`.
3. Selection restore: `restoreOrSelectFirstChild()` tries `ProfileSelectorService.getChildId()` to reselect the same child between visits.
4. Selecting a child: `selectChild(child)`:
   - Updates `selectedChild` locally.
   - Calls `profileSelector.setChild(childId)` so the rest of the app (interceptors, other components) know which child is active.
   - Calls `applyChildStats(raw)` to set user-facing values (name, mood asset, coins, streaks, progress numbers, etc.).
   - Calls `moodService.setVibesDisplayOverride([d])` and tells child `MoodSelector` to refresh so the child's mood shows immediately.
5. Other components: `habitPageContent` and other parts of the app subscribe to the shared child id/state and reload automatically — parent component only triggers the selection change.

Detailed working notes (implementation details)
----------------------------------------------
- Subscriptions:
  - `userService.getUserProfile$()` keeps the parent profile updated in the header.
  - `habitService.dataChanged$` triggers reloads of stats.
  - Multiple calls to `moodService.getVibesDisplay()` are used (init, loadStats, refresh). Each call maps the API array into `children`.
- Caching:
  - Children are saved to `localStorage` under `mb_children` as JSON. On failure or empty API results the component falls back to a parent-only display.
- Avatar resolution:
  - `ChildSelfImageService.resolveAvatarForMember()` is used to determine avatar URLs for children.
- Refresh flow:
  - `handleRefresh()` validates session via `authService.refreshUserData()`, refreshes stats and children list, and triggers `habitPageContent.refresh()` if available.

What I understood about your idea
---------------------------------
- You want a parent dashboard that acts as a single place for a parent to:
  - See family-wide / child-specific progress numbers (coins, streaks, completion, consistency, improvement).
  - Quickly switch the app context to any child so the rest of the app shows that child's habits, mood, and tasks.
  - Provide parent-only features (notes, calendar, school store) while keeping child data isolated and easy to switch.

What could be improved / issues I noticed and how to fix them
-----------------------------------------------------------
- Subscriptions not cleaned up: many `.subscribe()` calls in `ngOnInit` are not unsubscribed. This can cause memory leaks. Fix: use `takeUntil()` with `OnDestroy` + a `destroy$` subject or convert to `async` pipe where possible.
- Use of `toPromise`: the refresh code uses `toPromise()` on an observable. `toPromise()` is deprecated in modern rxjs. Fix: use `firstValueFrom()` or work with the observable directly (pipe + first()).
- Strict object equality in template: the check `*ngIf="selectedChild === c"` relies on object identity and may fail if children are re-created from API responses. Fix: use id equality (e.g., `selectedChild?.id === c.id`).
- Storing raw API objects in localStorage: saving the whole `raw` object may bloat localStorage and cause stale data. Fix: persist only minimal fields (id, name, avatarUrl) and re-fetch fresh data where needed.
- Multiple identical API calls: `moodService.getVibesDisplay()` is called several times (ngOnInit, loadUserStats, handleRefresh). If the API is heavy, consider centralizing results and reusing them, or debounce/throttle refresh.
- Error handling and loading states: the UI lacks explicit loading indicators when fetching children or when refresh is in progress. Fix: add `isLoading` / `isRefreshing` flags and show skeletons or spinners.
- Accessibility: the popup backdrop is clickable to close but could be improved with `role="dialog"`, focus trap, and keyboard navigation. Also ensure aria-labels are complete for the popup and child list.
- Type safety: many `any` types are used. Adding interfaces for the vibe/child object will make the code more reliable and easier to maintain.
- Race conditions: when selecting a child and immediately calling other services, ensure sequence is deterministic (e.g., set `profileSelector` first, wait for confirmation or emit, then update other components) — or broadcast a single change event and let subscribers react.

Small UX suggestions
--------------------
- Confirm child selection persistently: after selecting a child, persist selected child id in ProfileSelectorService or localStorage so a full app reload keeps the selected child.
- Show a small loader on `habit-page-content` when child changes.
- Use a clear fallback avatar and consider an image-load fallback strategy.

Next steps I can help with
-------------------------
- Add `OnDestroy` + `destroy$` to parent account and convert subscriptions to `takeUntil(this.destroy$)`.
- Replace `toPromise()` usage with `firstValueFrom()`.
- Update `*ngIf="selectedChild?.id === c.id"` to avoid identity problems.
- Implement minimal loading states and safe localStorage parsing.

If you want, I can apply these improvements directly in the component.

---

File references
- Component: [src/app/authenticated/parent-account/parent-account.component.ts](src/app/authenticated/parent-account/parent-account.component.ts)
- Template: [src/app/authenticated/parent-account/parent-account.component.html](src/app/authenticated/parent-account/parent-account.component.html)
- Styles: [src/app/authenticated/parent-account/parent-account.component.scss](src/app/authenticated/parent-account/parent-account.component.scss)

ProfileSelectorService — analysis & recommendations
-------------------------------------------------
What the service does:
- `ProfileSelectorService` uses a `BehaviorSubject<number | null>` to store the selected child id, restoring the last value from `localStorage` at construction.
- It exposes `child$` (the observable of the current id) and `childChanged$` which uses `distinctUntilChanged()` and `skip(1)` so it only emits after initialization when the id actually changes.
- Provides helper methods: `setChild()`, `getChildId()`, `hasSelectedChild()`, `clearChild()` and handles persistence to localStorage under `mb_selected_child_id`.

Can we use the observable across the app?
- Yes. Any page, component, service, or interceptor can inject `ProfileSelectorService` and either:
  - subscribe to `child$` (to receive the current selected child id and updates), or
  - subscribe to `childChanged$` (to react only on actual changes after init).
- `getChildId()` is available for synchronous reads (e.g., inside HTTP interceptors that need the id immediately). Prefer `child$` if you can work reactively.

Best practices and recommended improvements
- Keep the `BehaviorSubject` approach: it's correct for app-wide state because it stores current value and replays it to new subscribers.
- Consider exposing the full selected child object as an observable (e.g., `selectedChild$`) instead of only the id. That avoids repetitive lookups in every subscriber. Example pattern:

  - Add a `BehaviorSubject<Child|null>` (or `Observable<Child|null>`) that holds the full child data and update it when the app fetches child details.

- Choice between `child$` and `childChanged$`:
  - `child$` emits the current id immediately (including the restored id). Good for components that must initialize to that id.
  - `childChanged$` with `skip(1)` intentionally suppresses the initial emission. This is OK if consumers only care about *changes* after app start. Be aware `skip(1)` will always drop the first emission even if it is a non-null stored id; if you want to skip the initial null but still receive a stored non-null initial id, change the operator to filter for `null` values instead.

- Use types instead of `any`. Define an interface for the child/vibe payload:

  interface ChildInfo {
    id: number;
    name: string;
    avatarUrl?: string;
    relationship?: string;
    raw?: any; // prefer typed model for API response
  }

- Use `child$.pipe(distinctUntilChanged())` with `shareReplay(1)` when multiple subscribers will use it to avoid redundant processing.
- Prefer reactive usage (`child$`) in components and services; only use `getChildId()` in synchronous contexts (like interceptors).
- Ensure subscribers unsubscribe or use `async` pipe / `takeUntil(this.destroy$)` to avoid leaks.
- If you need app-wide complex state (many derived values), consider a small store (NgRx, Akita, or a simple service-based store) to centralize child profile data.

Example short improvement for `childChanged$` (avoid skipping stored non-null):

  // instead of skip(1)
  this.childChanged$ = this.child$.pipe(
    distinctUntilChanged(),
    // ignore initial null only, but allow initial non-null
    filter((v, i) => !(i === 0 && v === null))
  );

Summary
- `ProfileSelectorService` is implemented correctly for most app-wide use cases: it's usable across pages via observables and works with localStorage persistence.
- Small changes (exposing full selected child object, revising `childChanged$` behavior, types, shareReplay, and unsubscribing patterns) will make it more robust and easier to consume across the app.

One best thing to implement (single best recommendation)
----------------------------------------------------
If you want one, single, highest-impact change that gives the best chance of correctness, consistency, and performance across the whole app, implement a small, typed, reactive single-source-of-truth store for profile/child state (call it `ProfileStoreService`).

Why this is the best single change:
- Centralizes selection logic so all parts of the app read the same source of truth (no duplicated API calls or identity bugs).
- Makes updates atomic and deterministic: one method updates value + persists it + emits a single, shared observable.
- Simplifies interceptors and components: they can subscribe to `selectedChild$` or read `getSelectedChildSync()` in synchronous cases.
- Enables easy testing and bug-free switching between parent/child contexts.

Minimal implementation sketch (practical steps):
1. Create `ProfileStoreService` (providedIn root) with a private `BehaviorSubject<ChildInfo | null>` and a public `selectedChild$ = subject.asObservable().pipe(shareReplay(1))`.
2. Add typed methods: `selectChild(child: ChildInfo)`, `selectChildById(id: number)`, `clearSelection()`, and `getSelectedChildSync()`.
3. Persist only the `id` in localStorage but keep the full `ChildInfo` in the store; on app start, if an id exists, fetch the latest child details and populate the subject.
4. Derive other observables from the store (e.g., `selectedChildId$`, `selectedChildAvatar$`, `selectedChildStats$`) using `map()` so downstream code only subscribes to what it needs.
5. Replace ad-hoc `ProfileSelectorService` usage across the app with `ProfileStoreService` where appropriate — or make `ProfileSelectorService` a thin facade over the store for backward compatibility.
6. Ensure all subscribers use `async` pipe or `takeUntil(this.destroy$)` and that the store APIs are fully typed.

Notes on guarantees and 100% correctness:
- No single change can magically guarantee 100% correctness against all external failures (network, bad API data, race conditions). But a typed, single-source-of-truth reactive store eliminates most class of bugs (stale state, identity mismatches, duplicated calls), making the app deterministic and much closer to "always correct" in practice.
- Complement the store with contract-level tests (API contract mocks), e2e tests for switching flows, and CI checks to approach near 100% reliability.

Want me to implement `ProfileStoreService` directly, update components to use it, and add unit tests? I can start by creating the service and converting `parent-account` to consume it.

Full changelog, root cause, fixes and testing (what I changed and why)
---------------------------------------------------------------------

Overview
- I implemented a small, typed reactive store and updated the parent-account flow so child selection is deterministic and safe across the app. While fixing this I found and fixed the root cause that produced `forUserId=NaN` and the problem that prevented the "tick" from showing next to the selected child.

Files added or modified
- Added: `src/app/core/models/child-info.model.ts` — `ChildInfo` interface and `mapVibeToChildInfo()` helper.
- Added: `src/app/core/services/profile-store.service.ts` — typed reactive single-source-of-truth store (`BehaviorSubject`, `selectedChild$`, `children$`, `select()` etc.).
- Modified: `src/app/core/services/profile-selector-service.ts` — made a thin facade that remains backward compatible but delegates to the new store.
- Modified: `src/app/core/interceptors/profile-selector.interceptor.ts` — fixed guard logic; now avoids adding invalid ids like `NaN` to requests and accepts string ids.
- Modified: `src/app/authenticated/parent-account/parent-account.component.ts` — switched to store usage, added `takeUntil(destroy$)`, safer id handling, and debug logs.
- Modified: `src/app/authenticated/parent-account/parent-account.component.html` — reliable id comparison (stringified) and aria updates so tick only shows for the selected child.

Root cause(s)
- The app mixed id types: sometimes the API returned string ids (e.g., "child000"), sometimes numeric ids. The code compared ids using strict equality (===) and sometimes converted them to Number which produced NaN.
- When the id became NaN or mismatched the stored id, the selection restore failed and the template comparison didn't match — so the tick never appeared.
- The interceptor earlier only checked for null/undefined, then used Number() or String() inconsistently which could send `forUserId=NaN` to APIs leading to 500 errors.

Fixes applied (technical summary)
- Preserve id format: `ChildInfo.id` now supports `string | number | null` and `mapVibeToChildInfo()` extracts id from common API fields (`userId`, `id`, `assignedTo`, `memberId`). It normalizes but preserves string ids (no forced Number conversion).
- Single source of truth: `ProfileStoreService` centralises the children list and current selection. It exposes `children$`, `selectedChild$`, `selectedChildId$` (string|number|null) and safe helpers: `select(child)`, `selectById()`, `setChildren()`.
- Robust matching: all id comparisons (restore, update, selectById) compare stringified ids (`String(a.id) === String(b.id)`) to handle mixed types.
- Interceptor safety: `ProfileSelectorInterceptor` now guards against empty strings and 'NaN' and uses the string id when adding `forUserId` to params or body — never sends `NaN`.
- Component safety: `parent-account` now subscribes reactively to `children$` and `selectedChild$`, uses `takeUntil(destroy$)` to clean up, and uses stringified id equality in the template (`(''+selectedChild.id) === (''+c.id)`).

Why these changes fix the symptoms you saw
- Tick missing: because stored id and child id had different types or the selected child was never set due to strict equality, the template never found a match. Using stringified comparisons and ensuring the store sets `selectedChild` when children are loaded fixes that.
- Calendar NaN error: since the interceptor no longer blindly stringifies an invalid numeric conversion, `forUserId` is only set when the id is valid (non-empty, non-NaN). This prevents `http://...forUserId=NaN` requests.

How the selection flow now works (step-by-step)
1. On component init, `parent-account` calls `moodService.getVibesDisplay()` and maps each response item to `ChildInfo` with `mapVibeToChildInfo()` (safe id extraction).
2. `profileStore.setChildren(children)` stores the list and tries to restore selection by string-matching the persisted id from localStorage.
3. When a parent selects a child, `profileStore.select(child)` updates `selectedChild$` and persists the id as string to localStorage.
4. `ProfileSelectorInterceptor` subscribes to `profileSelector.child$` (the facade) and, when present and valid, appends `forUserId` to outgoing HTTP params/body as a string.
5. Any component that subscribes to `selectedChild$` (or `selectedChildId$`) receives deterministic updates and reloads its data (habits/calendar) accordingly.

Testing checklist (manual)
1. Clear storage (optional): Application → Local Storage → remove keys `mb_selected_child_id`, `mb_children`.
2. Start app and navigate to Parent Account.
3. Open the child switch popup and click a child. Watch console for lines:
   - `[ParentAccount] selectChild called { childId: ..., childName: '...' }`
   - `[ParentAccount] toggleSwitchPopup { selectedChild: {...}, selectedChildId: ..., children: [...] }`
4. Reopen the popup — you should see a single tick next to the selected child.
5. Open the Calendar (or any endpoint) and examine the network request — `forUserId` should be present and be a valid id (string/number) or absent (if no child selected). It should never be `NaN`.

Debugging notes (what to look for in console)
- If `selectChild` logs `childId: null` then mapping failed: check the `mapVibeToChildInfo()` mapping and the raw item structure from the API (maybe id is under a different field).
- If `toggleSwitchPopup` shows `selectedChildId: null` after selecting, it means the store didn't set the selection correctly. The store `setChildren()` uses string comparison to restore selection — verify `mb_selected_child_id` in localStorage.
- If network requests still show `forUserId=NaN`, check the interceptor logs. The interceptor now logs `No valid child id selected` when it won't modify requests.

Quick fixes you can run locally if things still look wrong
- In the browser console run:
  - `localStorage.removeItem('mb_selected_child_id')`
  - `localStorage.removeItem('mb_children')`
  - Reload the page and try selecting again.

Next improvements I can implement (optional)
- Add startup validation: on app bootstrap, detect invalid `mb_selected_child_id` and clear it automatically.
- Add an E2E test (Cypress) that selects a child and asserts the network `forUserId` parameter and the tick in the popup.
- Add unit tests for `ProfileStoreService` and the interceptor to prevent regressions.

If you want me to implement any of the next improvements I listed, tell me which one and I will proceed.

