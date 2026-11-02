# Streak (Activity) Section — Implementation & API docs

This document explains how the Streak / activity section works in simple language. It covers the component logic, API integration, expected data shapes, error handling messages shown to users, and validation performed in code.

**Files to inspect**:
- [streak-homepage.component.ts](src/app/core/pages/streak-section/streak-homepage/streak-homepage.component.ts)
- [streak-stat-card.component.ts](src/app/core/pages/streak-section/streak-stat-card/streak-stat-card.component.ts)
- [streaks.service.ts](src/app/core/services/streaks.service.ts)
- [streaks.api.ts](src/app/core/api/streaks.api.ts)
- [child-self-image.service.ts](src/app/core/services/child-self-image.service.ts)

**Quick summary (simple):**
- The UI loads a leaderboard and the current user's streak summary from the backend.
- While loading, it shows a spinner. If no data, it shows a friendly empty message. If the request fails, it shows a failure message.
- The code normalizes backend data, picks avatar images using the `ChildSelfImageService`, and renders small stat cards for current, best, and total active days.

**1) User-visible states and flow**
- Loading: `isLoading = true` while the API call runs.
- Success: populate `currentUser`, `currentStreakDays`, `bestStreakDays`, `totalActiveDays`, `petMessage`, and `topStreakers`.
- Empty: if leaderboard array is empty, `topStreakers.length === 0` shows an empty state message.
- Error: on network/error responses the UI shows either `No leaderboard data yet` (when API returns 404) or `Unable to load leaderboard` for other failures.

**2) API integration**
- Endpoint used: GET `${environment.apiUrl}/auth/leaderboard/streaks` (see [streaks.api.ts](src/app/core/api/streaks.api.ts)).
- Auth: requests include `Authorization` header built from `AuthService.getToken()` (Bearer token if present).

Request headers (example):

```
Content-Type: application/json
Authorization: Bearer <token>
```

**3) Expected response shape**
The service normalizes the backend response into this TypeScript shape (see `StreakLeaderboardResponse` in [streaks.service.ts](src/app/core/services/streaks.service.ts)):

- currentUser: {
  - petMessage: string
  - currentStreak: number
  - highestStreak: number
  - totalActiveDays: number
  - rank: number
  - name: string
  - hasStreak: boolean
  - avatarImageName?: string
}
- topUsers: Array<{ name: string; currentStreak: number; avatar?: string; avatarImageName?: string }>

Example JSON (ideal):

```
{
  "currentUser": { "name":"Alex","currentStreak":5,"highestStreak":10,"totalActiveDays":42,"petMessage":"Nice work!","rank":12 },
  "topUsers": [ { "name":"Sam","currentStreak":20, "avatarImageName":"avatar3" } ]
}
```

**4) Service-side validation & normalization (what the code does automatically)**
- `streaks.service.getLeaderboard()` maps the raw response and coerces types:
  - Strings forced via `String(...)`.
  - Numbers forced via `Number(...)` and missing numbers default to `0`.
  - Booleans forced via `Boolean(...)`.
  - `topUsers` must be an array; otherwise the service returns an empty array.
- This prevents the component from having to do defensive type checks and keeps UI logic simpler.

**5) Component mapping & UI logic**
- `streak-homepage.component.ts` (main points):
  - Calls `streaksService.getLeaderboard()` on `ngOnInit()`.
  - Maps `response.topUsers` to `topStreakers` and resolves avatars with `ChildSelfImageService.resolveAvatarForMember()`.
  - Sets `currentStreakDays`, `bestStreakDays`, and `totalActiveDays` from `currentUser` (with `??` fallbacks).
  - Computes `trend` with `getTrend(streak)` which returns `'up'` when streak > 1 and `'down'` otherwise. This is only a simple visual indicator.
  - Formats days via `formatDays()` helper.
  - Unsubscribes on `ngOnDestroy()` using `takeUntil(this.destroy$)` pattern.

**6) Avatar resolution logic**
- Avatars are resolved by `ChildSelfImageService.resolveAvatarForMember()`:
  - If server supplies a direct URL, it's used.
  - If `avatarImageName` contains a number (e.g. `Avatar 3`), the service picks a local asset from a catalog of 12 avatars.
  - Fallbacks: generic asset or `null` alt text if nothing available.

**7) Error messages and how they are set**
- Console: the code logs errors to console with `console.error(...)` for developer debugging.
- User-facing messages:
  - 404 response -> `No leaderboard data yet` (friendly empty state).
  - Any other failure -> `Unable to load leaderboard`.
  - When API returns valid but empty `topUsers` -> the HTML shows a no-data message (template fallback: `No streakers yet! Be the first to build your streak.`)

If you want new messages, change the strings in `streak-homepage.component.ts` in the `error` callback or the template.

**8) Common error causes & troubleshooting tips (simple)**
- No auth token (401): check `AuthService.getToken()` and ensure the client has a valid token.
- Endpoint not found (404): ensure backend route `/auth/leaderboard/streaks` exists and returns expected JSON.
- Malformed JSON: the service will coerce values, but missing `currentUser` will lead to zeros in stats. Check backend fields.
- Avatar missing: check whether backend sends `avatar` (object with `url`) or `avatarImageName` with a number.

**9) How to extend validations (guidance)**
- Add explicit schema checks in `streaks.service.getLeaderboard()` before `map()` completes. Example: verify `res.currentUser && typeof res.currentUser.currentStreak === 'number'`.
- For stricter validation, add a small JSON schema validator or use `io-ts`/`zod` to decode the response and return typed errors to the UI.

**10) Example curl to test the endpoint**

```
curl -H "Authorization: Bearer <token>" \ 
  "${API_BASE_URL}/auth/leaderboard/streaks"
```

**11) Quick file map (where to change things)**
- Stats & leaderboard mapping: [streak-homepage.component.ts](src/app/core/pages/streak-section/streak-homepage/streak-homepage.component.ts)
- Data normalization: [streaks.service.ts](src/app/core/services/streaks.service.ts)
- API URL & auth headers: [streaks.api.ts](src/app/core/api/streaks.api.ts)
- Avatar resolution: [child-self-image.service.ts](src/app/core/services/child-self-image.service.ts)
- Small stat UI: [streak-stat-card.component.ts](src/app/core/pages/streak-section/streak-stat-card/streak-stat-card.component.ts)

---
If you want, I can also:
- add example unit tests for `streaks.service` and `streak-homepage` logic,
- or create stricter validation using `zod`/`io-ts` and show how the UI would display validation errors.

Requested README created for the activity/streak section. If you meant a different "activity" folder (for example the `academy-section` in the other app), tell me and I will create a matching README there.
