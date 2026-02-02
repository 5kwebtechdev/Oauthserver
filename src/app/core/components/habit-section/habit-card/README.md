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
- Removal Rule (Time-based / Grace period): If an activity was started (`ongoing`) but not completed by its scheduled end time, it remains visible on Home for an extra 5‑minute grace period (endTime + 5 minutes). After the grace window expires the card is removed from Home and the activity's status is set to `pending` for that day (so it can still be marked completed via history or other screens until midnight).
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
    R[Card Render] --> T{Is activity for Today?}
    T -- No --> X[Hide from Home]
    T -- Yes --> S[Include in Today's List]
    S --> Sort[Sort by proximity to now]
    Sort --> Top4[Take Top 4]
  end

  subgraph CardFlow
    Top4 --> Status{Status}
    Status -- completed --> Completed[Move to Completed / Hide]
    Status -- skipped --> Skipped[Show Done (enabled)]
    Status -- ongoing --> Ongoing[Show Abort + Done + Progress]
    Status -- pending --> Pending[Show Let's Go (visible) / Done depending on window]

    Pending --> W{Within Let's Go window?}
    W -- Yes --> LG_enabled[Let's Go: ENABLED]
    W -- No --> LG_disabled[Let's Go: DISABLED]

    LG_enabled --> ClickLG[User taps Let's Go]
    ClickLG --> StartPopup[Show "Ready to Start?" popup]
    StartPopup -- Confirm --> Start[Set status -> ongoing; saveOngoingState]
    Start --> Ongoing

    Ongoing --> AbortClick[User taps Abort]
    AbortClick --> AbortPopup[Show "You're Halfway There!" popup]
    AbortPopup -- AbortAnyways --> AbortConfirm[Set status -> pending; clearOngoingState]
    AbortConfirm --> Pending

    Ongoing --> DoneClick[User taps Done]
    DoneClick --> DonePopup[Show "Great Work!" popup]
    DonePopup -- Confirm --> Complete[Set status -> completed; clearOngoingState]
    Complete --> Completed

    %% Grace removal: if ongoing not completed by endTime -> keep on Home until end+5m -> then set pending and remove from Home
    Ongoing --> EndReached{endTime reached?}
    EndReached -- Yes --> Grace[Wait endTime + 5min]
    Grace --> GraceExpire[Set status -> pending; remove from Home]
  end

  click StartPopup href "src/app/core/components/habit-section/habit-card/habit-card.component.ts" "Open start popup"
  click AbortPopup href "src/app/core/components/habit-section/habit-card/habit-card.component.ts" "Open abort popup"
  click DonePopup href "src/app/core/components/habit-section/habit-card/habit-card.component.ts" "Open complete popup"
```

8) Mapping of flow nodes to functions (quick)
------------------------------------------
- `Let's Go` enabled check => `isLetsGoEnabled(habit, hasOtherOngoing)` in the service.
- `Let's Go` visible => `isLetsGoVisible(habit)`.
- `Abort` visible => `isAbortVisible(habit)`.
- `Done` enabled => `isDoneEnabled(habit)`.
- Progress percent => `calculateProgressPercentage(habit)`.
- Save/clear ongoing => `saveOngoingState(habit)` / `clearOngoingState(habit)`.
- Timestamp building => `combineDateAndTime(...)` and `calculateTimestamps(...)`.

9) Quick edits you can make
--------------------------
- Change the 5-minute pre-start window in the service by editing `FIVE_MINUTES`.
- To allow multiple concurrent ongoing items, remove the `hasOtherOngoing` check before enabling "Let's Go".
- To hide completed items immediately, update the component's list filter to exclude `status === 'completed'`.

10) Next steps I can do for you
------------------------------
- Update the mermaid to match any changes you want.
- Modify the code to change a rule (example: make "Done" allowed before start).
- Add UI notes or component line references if you want precise edit locations.

---
File created here: src/app/core/components/habit-section/habit-card/README.md
