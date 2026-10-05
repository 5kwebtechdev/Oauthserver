Habit Card — Visibility & Button Logic
=====================================

Overview
--------
- This document explains when a habit card is shown or removed and how its buttons behave.
- Language is simple and points are short so you can edit the flowchart easily.

Quick links
-----------
- Service with button & time logic: [src/app/core/components/habit-section/habit-button-logic.service.ts](src/app/core/components/habit-section/habit-button-logic.service.ts)
- Habit card component: [src/app/core/components/habit-section/habit-card/habit-card.component.ts](src/app/core/components/habit-section/habit-card/habit-card.component.ts)

1) When the card is shown or removed (corrected logic)
-----------------------------------------------------
- Visibility Rule (Home screen): Only today's scheduled activities appear on the Home screen. An activity is considered "today's" when its scheduled start date/time falls on the current day.
- Top-4 Rule: Only the Top 4 activities are shown on Home. Activities are ordered by proximity to the current time (closest start time first). The UI displays the first four items after filtering and sorting.
- Removal Rule (Completed): When an activity is marked `completed` it disappears from Home immediately and is moved to the Completed lists/history.
- Removal Rule (Time-based): An unfinished activity disappears from Home at its scheduled end time. It can still be marked Done from the inner Activity/Details screen until midnight of that day.
- Abort Rule: If the user clicks `Abort` on an active (`ongoing`) card, the activity is set back to `pending` but the card remains visible on Home until its scheduled end time (it does NOT disappear immediately).
- Note: Completed or skipped activities are excluded from the Home feed; they appear in history/completed lists instead.

2) Time & timestamp basics (simple)
-----------------------------------
- `combineDateAndTime(dateStr, timeStr)`: builds a timestamp from a YYYY-MM-DD date + HH:MM(:SS) time.
- `calculateTimestamps(item)`: returns `startTimeStamp` and `endTimeStamp` from a habit's date/time fields or existing timestamp fields.
- Fallbacks: if start date/time missing, uses today or default times (`00:00:00` to `23:59:59`).

3) Button behaviors (each in points)
----------------------------------
- "Let's Go"
- "Let's Go"
  - Visibility: Button shows by default for pending items (Enabled or Disabled state applies).
  - Hidden completely after the activity's end time (not shown anywhere after end).
  - Enabled: ONLY during the tight 5‑minute start window: [startTime - 5min, startTime + 5min].
  - Disabled: All other times (before the window starts, and after the window until end time). Also disabled when another activity is currently `ongoing`.
  - Action: on click, show the "Ready to Start?" popup. On confirm: mark activity `ongoing`, call `saveOngoingState(habit)`, show Abort button and enable Done.

- "Abort"
- "Abort"
  - Visibility: Show ONLY when activity status is `ongoing`. When shown it replaces the "Let's Go" CTA.
  - Action: on click, show the "You're Halfway There!" popup that displays coins/streaks the user will lose.
    - On confirm (Abort Anyways): set activity to `pending`, call `clearOngoingState(habit)`, reset progress/timer. The card remains on Home until its scheduled end time (does NOT disappear immediately).
    - After abort: if still inside the Let's Go window, re-enable "Let's Go"; if after the Let's Go window, enable "Done" instead.

- "Done"
- "Done"
  - Visibility:
    - Show when activity is `ongoing`.
    - Also show for today's `pending` activities, but only after the Let's Go window has closed (startTime + 5min).
    - Hide for pending activities of previous days (Pending in history should NOT show Done on older days).
  - Enabled / Disabled rules:
    - Enabled (green): when activity is `ongoing`.
    - Enabled: for today's `pending` activities once the Let's Go window has closed (start + 5min), even if "Let's Go" was never clicked.
    - Disabled: during and before the Let's Go window (start -5min to start +5min) and when another activity is `ongoing`.
  - Action: on click, show the "Great Work!" popup. On confirm: mark activity `completed`, clear ongoing state, award coins/streak, and remove the card from Home (it moves to Completed lists).

3.1) CTA Popups & Click Flow (confirmations, toasts, navigation)
---------------------------------------------------------------
- Many CTAs show a popup (modal or confirmation) before taking final action. Popups prevent accidental state changes and give the user a chance to cancel.
- General popup behavior (simple):
  - Popup shows a short message and two actions: `Confirm` and `Cancel` (or `Yes` / `No`).
  - While popup is open, the card buttons are typically disabled to avoid duplicate clicks.
  - On `Confirm`: the action proceeds, UI updates (status change, localStorage save/clear), and a short success toast may show.
  - On `Cancel`: popup closes and no changes are made.

- "Let's Go" popup
  - When user clicks "Let's Go", app may show a popup: "Start this habit now?" with `Start` and `Cancel`.
  - If user taps `Start`: set status -> `ongoing`, call `saveOngoingState(habit)`, navigate to activity screen (optional), and show a toast "Started".
  - If user taps `Cancel`: close popup, no state change.

- "Abort" popup
  - When user clicks "Abort", show confirmation: "Abort this session?" with `Abort` and `Cancel`.
  - If `Abort`: call `clearOngoingState(habit)`, set status -> `pending` (or previous), show toast "Aborted" and return to list view.
  - If `Cancel`: close popup, session continues.

- "Done" popup
  - When user clicks "Done", app may show: "Mark as completed?" with `Confirm` and `Cancel`.
  - If `Confirm`: set status -> `completed`, call `clearOngoingState(habit)`, show toast "Completed"; remove or archive card depending on list filters.
  - If `Cancel`: close popup; no change.

3.2) Pending / Done special rules (clarified)
- "Done" appears in Pending only for the current day's activities (so a pending item from previous days won't show Done). The service's `isDoneVisible` enforces this.
- Example: activity scheduled Monday 08:00 not completed -> moves to Pending; Monday shows Done; Tuesday onwards Done is removed from that card.

- Skipped -> Done special case
  - If habit is `skipped` and user clicks `Done`, popup can explain that this will mark it completed despite being skipped. Confirm proceeds as above.

- Failure & edge cases
  - If saving state fails (storage or network error), popup should show an error toast and revert UI changes.
  - If habit timestamps changed between popup open and confirm (race), re-validate timestamps before committing.


4) Progress bar and state (corrected logic)
-----------------------------------------
Progress calculation rules implemented:

- Source of truth: Progress is ALWAYS calculated from the scheduled `startTimeStamp` and `endTimeStamp` (the scheduled times), not from the user's click time. The progress bar shows how far the scheduled time window has progressed.
- When progress runs: the progress bar is visible and updated ONLY when the activity status is `ongoing` (user clicked "Let's Go"). It runs until the scheduled `endTimeStamp`.

Scenario 1 — User clicks "Let's Go" early (before scheduled start)
- Allowed click window: startTime - 5min -> startTime
- Behaviour: After user starts early the progress remains 0% until the scheduled start time is reached. At scheduled start the progress begins increasing from 0% and will reach 100% at scheduled end time.
- Example: 9:00–10:00, user clicks at 8:55 ⇒ 8:55 = 0%, at 9:00 = 0%, 9:30 = 50%, 10:00 = 100%.

Scenario 2 — User clicks "Let's Go" late (after scheduled start)
- Allowed click window: startTime -> startTime + 5min
- Behaviour: When user starts late, progress immediately reflects the scheduled elapsed percentage (based on scheduled start and end). For example, clicking at 9:05 for a 9:00–10:00 activity shows ~8% immediately, continues to update, and reaches 100% at 10:00.

When the progress updater runs
- Implementation: when the user confirms "Let's Go" we call `startProgress()` which initializes the percentage from `calculateProgressPercentage()` and starts an interval that updates every second.
- If now < scheduled start: initial percentage = 0 and the interval will keep checking; when scheduled start arrives the percentage will increase.
- If now >= scheduled start: initial percentage is computed from elapsed scheduled time.
- The updater stops automatically once percentage reaches 100% (scheduled end reached). If the activity is not completed by end + grace, other logic moves the card to pending and hides the progress bar.

Edge cases
- If the user aborts, the progress is reset to 0 and the updater is cleared.
- If the activity is completed manually, percentage is set to 100 and the updater is cleared.

Mapping to code
- `startProgress()` / `startProgressUpdater()` in `habit-card.component.ts` — starts periodic updates and stops at 100%.
- `calculateProgressPercentage()` uses scheduled `startTimeStamp` and `endTimeStamp` to compute percentage.

5) LocalStorage ongoing state
-----------------------------
- Key format: `ongoing_${habit.type || 'habits'}_${habit.id}`.
- Stored object { startedAt, habitStartTime, habitEndTime } used to restore or validate ongoing state.
- `isOngoingStateValid(habit)` compares stored times with current habit timestamps to decide if stored state still matches the habit.

6) Status normalization
------------------------
- `normalizeStatus(status)` maps many possible strings to one of: `pending`, `ongoing`, `completed`, `skipped`.

7) Editable flowchart (Mermaid)
------------------------------
Copy this mermaid block into any mermaid editor or Markdown that supports mermaid to edit the flowchart.

```mermaid
flowchart TD
  subgraph Feed
    Habit Card — Implementation Notes & Deep Reference
    ================================================

    Purpose
    -------
    - This document is a detailed, implementation-accurate reference for the `habit-card` UI component used by the Home feed and recent lists. It maps the runtime behaviour, inputs, timers, storage, and known edge-cases to the actual code in `habit-card.component.ts` and the template.

    Files
    -----
    - Component: src/app/core/components/habit-section/habit-card/habit-card.component.ts
    - Template: src/app/core/components/habit-section/habit-card/habit-card.component.html
    - Styles: src/app/core/components/habit-section/habit-card/habit-card.component.scss
    - Button/time logic: src/app/core/components/habit-section/habit-button-logic.service.ts

    High-level behaviour (implementation summary)
    --------------------------------------------
    - Modes supported: `single` (individual card), `list` (Home feed), and `recent` (recent activity list). Mode is controlled by the `mode` input.
    - The card shows only "today" activities in Home (`list` mode). The component calls `HabitService` / `CalendarService` to load today's activities and applies filtering:
      - Exclude `completed` and `skipped` from Home lists.
      - Sort by proximity to now and slice to the top `maxItemsToShow` (default 4).
    - Progress bar is shown only when the status is `ongoing` and is computed from scheduled timestamps (`startTimeStamp`/`endTimeStamp`).

    Inputs & important props
    ------------------------
    - `@Input() habit: Habit | null` — the activity object (may be habit or task).
    - `@Input() mode: 'single' | 'list' | 'recent'` — rendering mode.
    - `@Input() startTime` / `endTime` — numeric timestamps passed by caller when available.
    - `@Input() inProgress` — coerced boolean; used by parent rendering.
    - `@Input() isParentOverride?: boolean` — optional explicit override to force parent-mode UI (takes precedence over profile detection).
    - `@Input() isCurrentDateView: boolean` — hide CTAs when viewing non-current dates.

    Parent detection & overrides
    ---------------------------
    - The component determines `isParent` using several fallbacks (in order):
      1. If `isParentOverride` input is provided, it is respected immediately.
      2. Subscribe to `UserService.userProfile$` and inspect `profile.relationship` (checks for `'PARENT'`).
      3. Fallbacks: `sessionStorage`/`localStorage` keys like `signup_role` or `user_profile` are parsed for `relationship`/`role`.
      4. `AuthService.isParentUser()` is consulted as final authoritative source.
    - Template uses `!isParent` to hide elements (bubble, timer icon, CTAs) when the current user is a parent.

    CTA (Let's Go / Abort / Done) rules — exact runtime mapping
    ---------------------------------------------------------
    - Visibility and enable rules are implemented in methods and wired to template conditionals:
      - `isLetsGoVisible()` — controls presence of "Let's Go" button.
      - `isLetsGoEnabled()` — controls enabled state of "Let's Go" (true only inside the [start - 5m, start + 5m] window and other conditions).
      - `isAbortVisible()` — visible only when status is `ongoing`.
      - `isDoneVisible()` / `isDoneEnabled()` — visible for `ongoing` and for today's `pending` after LetsGo window has closed.
    - Template examples (actual checks):
      - `<mindful-button *ngIf="isLetsGoVisible() && !isParent && isCurrentDateView" ...>`
      - Abort/Done buttons also include `!isParent` and `isCurrentDateView` guards.
    - Behavior on click:
      - `Let's Go` → `openStartPopup()` → on confirm runs `onStartHabit()` which calls API (`habitApi.letsGoHabit` / `taskApi.letsGoTask`) then:
        * updates local habit state to `ongoing`,
        * `saveOngoingState()` stores ongoing state to localStorage,
        * sets `showLocalTimer = true`, and starts progress (`startProgress()` / `startProgressUpdater()`).
      - `Abort` → `openAbortPopup()` → on confirm runs `onAbortHabit()` which calls API (`abortHabit`/`abortTask`) then:
        * sets status back to `pending`,
        * clears ongoing localStorage key via `clearOngoingState()`,
        * resets progress and local UI timers.
      - `Done` → `openCompletePopup()` → on confirm runs `onCompleteHabit()` which calls API (`completeHabit` / `completeTask`) then:
        * sets status `completed`, clears ongoing state, sets progress to 100%, hides local timer, and triggers list reload.

    Progress & timers (detailed)
    ---------------------------
    - Progress calculation: `calculateProgressPercentage()` uses `startTimeStamp` and `endTimeStamp` from the `habit` or calculates timestamps via `buttonLogic.calculateTimestamps(habit)` if missing.
    - `startProgress()` initializes `percentageCompleted` from `calculateProgressPercentage()` and calls `startProgressUpdater()` which:
      - sets an interval updating the percentage every second,
      - stops and clears the interval once percentage >= 100.
    - Ongoing persistence: `saveOngoingState()` writes a JSON object under key `ongoing_${habit.type}_${habit.id}` with `{ startedAt, habitStartTime, habitEndTime }`.
    - Restore: `restoreOngoingState()` reads the key and validates stored timestamps against current `habit` timestamps; if valid and `habit.status === 'ongoing'`, it restarts progress and `showLocalTimer = true`.
    - Grace handling: when a habit is `ongoing` but reaches scheduled `endTime` without completion, a 5-minute grace window is applied. A timer is scheduled at `endTime + 5min` to call `handleGraceRemoval()` which resets or removes the card according to rules.
    - Auto-reload timers: in `list`/`recent` modes the component scans activities to schedule the next upcoming event (letsGo window open or activity end) and sets a single timeout to `reloadData()` at that time. This prevents busy polling while ensuring the UI refreshes when relevant windows open/close.

    Lifecycle, subscriptions & cleanup
    ---------------------------------
    - Subscriptions created:
      - `userProfileSubscription` to `UserService.userProfile$` for parent detection.
      - Observables from `HabitService`/`CalendarService` during `loadHabits()` / `loadTodayTasks()`.
      - Internal intervals/timers: `progressInterval`, `buttonStateCheckerInterval`, `letsGoWindowTimer`, `endTimeTimer`.
    - Cleanup: `ngOnDestroy()` clears intervals, timeouts, and unsubscribes from all subscriptions.

    State variables (short list of key fields)
    -----------------------------------------
    - `isParent: boolean` — computed via override/profile/auth.
    - `showLocalTimer: boolean` — shows clock icon for locally-started cards.
    - `percentageCompleted: number` — progress bar width (0..100).
    - `habit`, `habits`, `tasks` — core data.
    - `isEmpty`, `hasHabits`, `hasTasks` — UI empty-state flags.

    Edge cases and failure handling (what the code does)
    --------------------------------------------------
    - If API calls fail for letsGo/abort/complete, errors are logged and the UI is not updated (no silent state drift).
    - If localStorage contains outdated `ongoing_*` state (timestamps mismatch), the entry is cleared to avoid resuming invalid sessions.
    - If timestamp fields are missing, `buttonLogic.calculateTimestamps()` builds them from date+time strings and sensible fallbacks (`00:00:00` / `23:59:59`).

    Where to change behaviour
    -------------------------
    - Pre-start window (5 minutes): controlled by `FIVE_MINUTES` constant inside `habit-button-logic.service.ts` (or by the service logic used by `isLetsGoEnabled()`).
    - Top-N items on Home: change `maxItemsToShow` in the component or how `loadHabits()` slices results.
    - Grace window behaviour: modify the logic scheduling `handleGraceRemoval()` in `loadHabits()` and related scheduled timers.

    Testing hints
    -------------
    - Unit tests should mock `HabitService`/`TaskApi`/`CalendarService` and verify:
      - `isLetsGoVisible()`/`isLetsGoEnabled()` behaviour around the boundaries (start -5m, start, start +5m, end).
      - `saveOngoingState()` / `restoreOngoingState()` persist & restore correctly and clear invalid entries.
      - Parent-mode UI: set `isParentOverride` and assert CTAs and bubble are hidden.
    - Manual test checklist:
      - Start a habit inside the lets-go window, confirm progress starts and localStorage key is created.
      - Reload the page: progress should restore for ongoing habit.
      - Let activity reach `endTime` without completing: ensure it remains for an additional 5 minutes and then is removed or set to `pending` as designed.

    Mapping of public functions → behaviour (quick reference)
    -----------------------------------------------------
    - `onStartHabit()` — called after confirming start popup; sets status to `ongoing`, persists state and starts progress.
    - `onAbortHabit()` — called after confirming abort popup; clears ongoing state and resets progress.
    - `onCompleteHabit()` — called after confirming completion; sets status `completed`, clears state and updates UI.
    - `calculateProgressPercentage()` — single source of truth for progress percent calculation.
    - `saveOngoingState()` / `clearOngoingState()` / `restoreOngoingState()` — localStorage persistence helpers.

    Appendix: quick file references
    ------------------------------
    - Template conditionals and CTAs: src/app/core/components/habit-section/habit-card/habit-card.component.html
    - Timer/interval logic & persistence: src/app/core/components/habit-section/habit-card/habit-card.component.ts
    - Button enable/visibility decisions: src/app/core/components/habit-section/habit-button-logic.service.ts

    If you want, I can also:
    - Add inline code comments in `habit-card.component.ts` to explain each timer and state mutation.
    - Add unit tests that cover boundary timing windows and localStorage persistence.

    File updated: src/app/core/components/habit-section/habit-card/README.md
