# Journal mood — Phase 1.5

Journal now reads the same daily records as Home. It has no mood selector or
call to the mood-save endpoint. The required first-open overlay remains owned
by DailyEntryComponent, including when a Journal notification opens the app.
The notification destination stays mounted behind that mandatory overlay.

## Existing endpoints reused

- `GET /v1/mood/vibes/display?forUserId=...`: `userId`, `mood`,
  `moodSetCountToday`. A zero count is not a saved selection, including the
  default `NEUTRAL` value. `NEUTRAL` after a selection means Calm.
- `GET /v1/mood/vibes/transition/monthly?year=...&month=...&forUserId=...`:
  `userId`, `date` (local calendar date), `toMood` / `fromMood`.
  The final daily mood drives historical cards and the calendar, even on days
  without a journal. Last 30 Days fetches both months when necessary.
- `POST /v1/mood/vibes/set`: unchanged, owned by the existing Home/shared
  first-open selector. Its confirmed-save event updates Journal immediately.
- `POST /v1/journal/add` and `PUT /v1/journal/{id}`: unchanged multipart
  contract. `emotions` is copied from the shared record for compatibility,
  never chosen in Journal. This field is no longer the displayed mood source.

`DailyMoodRecordsService` is a read-only projection of those APIs, scoped to
the current account/selected profile. It creates no independent persisted
Journal mood or counter. It refreshes on foreground focus and local day
change, and ignores saves for a different account/day. A confirmed save wins
over an older in-flight response.

## Backend verification still needed with an authenticated session

Journal self-mode now uses the authenticated account ID and accepts a sole
self-scoped vibes record when its `userId` differs from cached profile data.
An explicitly selected child still requires a matching ID. To investigate a
Home/Journal mismatch, compare the redacted authenticated
`GET /v1/mood/vibes/display` response (including `forUserId`, `userId`,
`mood`, and `moodSetCountToday`) while Home shows the mood. A missing or zero
daily count after a confirmed save would need backend investigation; a valid
record that Journal failed to use was a frontend mapping issue.
Journal shows a loading label while the request is pending. Home's last mood
display cache is now keyed by the local calendar day, so an older Calm label
cannot appear as evidence of today's check-in.

No backend defect has been confirmed by this change. The browser session
returned to Login before authenticated end-to-end checks could complete.
Verify these behaviors before marking the complete feature production-verified:

1. Monthly history includes every selected day, including days with only one
   mood selection and no Journal. `toMood` must be the final daily mood. If it
   only returns transitions between two selections, the endpoint needs to
   include first-selection daily records too.
2. Journal add/update accepts the compatibility `emotions` field without
   creating/updating a daily mood or consuming a mood change. Prefer deriving
   it from the daily record server-side and eventually making it unnecessary.
3. `moodSetCountToday` and mood reset follow the approved local calendar-day
   boundary. The server enforces at most two successful selections.
4. `GET /v1/pet-message/home/overlay` returns `MOOD_PROMPT` when today's mood
   is missing and stops returning it after a successful mood save.

Missing history is shown as “No mood recorded”; the frontend never fills it
with a Journal snapshot or invented mood. Historical editing also reads the
entry's own date, not today's mood.

## Design scope

The supplied Figma page exposes two Journal compose frames, including the
selected-vibe tooltip. The existing Journal assets are reused. No separate
updated saved-card frame was visible in that reference, so its existing layout
is preserved while its mood, artwork, and calendar mapping are corrected.

## Focused validation

2026-10-20 local results:

- 44 focused ChromeHeadless tests passed, including the four content-width checks.
- Production build passed (existing size-budget/CommonJS warnings remain).
- `git diff --check` passed.
- No deployment performed. Authenticated notification/device flows and full
  pixel-by-pixel visual acceptance remain unverified.

Files changed:

- `src/app/core/services/daily-mood-records.service.ts` and its spec
- `src/app/core/components/journals/journal-input/journal-input.component.ts`,
  `.html`, `.scss`, and `.spec.ts`
- `src/app/core/components/journals/journal-output/journal-output.component.ts`
  and `.spec.ts`
- `src/app/core/components/journals/journal-post-card/journal-post-card.component.ts`
  and `.html`
- `src/app/core/components/journals/journals.component.ts`
- `src/app/authenticated/user-dashboard/user-dashboard.component.ts`
- `src/app/core/models/mood.model.ts`
- `src/app/core/components/mood-selector/mood-selector.component.ts`
- `tsconfig.journal-mood-spec.json`

The responsive automated checks measure the real compose card and tooltip
at 360, 375, 390, and 414px content widths. They do not replace a full
authenticated Android/iOS viewport and notification-launch check.

Run:

```sh
CI=true npx ng test --ts-config tsconfig.journal-mood-spec.json --include='src/app/core/services/daily-mood-records.service.spec.ts' --include='src/app/core/components/journals/**/*.spec.ts' --include='src/app/core/components/daily-entry/daily-entry.component.spec.ts' --watch=false --browsers=ChromeHeadless
CI=true npm run build -- --configuration production
```

The CI environment here only disables the default local Angular disk cache.
It does not deploy or change the API environment.
