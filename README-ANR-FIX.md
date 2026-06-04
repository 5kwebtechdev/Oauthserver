# System UI ANR — Diagnosis & Fixes

Summary
-------
This document describes the Android "System UI isn't responding" (ANR) issue observed while running the app, the root causes found, and the fixes applied in the codebase.

Symptoms
--------
- The device showed the Android dialog: "System UI isn't responding" while the app was open (see screenshots).
- The app and navigation became unresponsive briefly before the dialog.

Root Causes Identified
----------------------
1. Aggressive polling and forced change detection across several components: frequent use of `setInterval` (1s) with `ChangeDetectorRef.detectChanges()` caused heavy main-thread work.
2. WebSocket initialization could hang without timeouts; if the STOMP/SockJS connection blocked the main thread (or stalled), the app appeared frozen.

Files changed & what was fixed
------------------------------
- `src/app/core/components/habit-section/habit-card/habit-card.component.ts`
  - Removed aggressive 1s polling that called `cdr.detectChanges()`.
  - Increased progress update intervals from 1s → 10s.

- `src/app/core/components/habit-section/habit-detail/habit-detail.component.ts`
  - Increased progress update interval from 1s → 10s.
  - Removed the 1s button-state poller that called `cdr.detectChanges()` every second.

- `src/app/core/components/habit-section/habit-page-content/habit-page-content.component.ts`
  - Reduced timestamp/filter polling from 60s → 5 minutes and used `cdr.markForCheck()`.

- `src/app/core/services/badge-socket.service.ts`
  - Added a 10s connection timeout and cleanup for the STOMP/SockJS client to avoid a hung connection.
  - Improved error handling and ensured timeouts are cleared on connect/disconnect.

- `src/app/app.component.ts`
  - Added an 8s safety timeout and error boundary when initializing the badge WebSocket so socket issues won't block app initialization.

Why these fixes help
--------------------
- Reducing frequency of `detectChanges()` and polling dramatically lowers the number of change-detection cycles and DOM updates, reducing main-thread load and preventing UI stalls.
- Adding connection timeouts and defensive error handling ensures that network/socket failures do not leave the app in a hung state.

How to verify locally
---------------------
1. Build the app:

```powershell
npm run build
```

2. Sync to Android and run on device/emulator (requires Capacitor + Android SDK):

```powershell
npx cap sync android
npx cap run android
```

3. Reproduce the flows that previously caused the ANR: open the Home / Learning screens, trigger habits progress and badge sockets. The System UI ANR dialog should no longer appear.

Notes & next steps
------------------
- Many intervals were intentionally increased or removed; if a progress indicator needs to be smoother, consider using `requestAnimationFrame` for visual updates or RxJS timers with throttling and OnPush change detection.
- Monitor `badge-socket.service.ts` logs for repeated reconnects (it uses STOMP + SockJS which depends on `sockjs-client` — build warns about CommonJS usage; consider a native ES module alternative if optimization is required).

If you want, I can:
- Re-enable finer-grained progress updates using `requestAnimationFrame` or `Observable`-based throttling.
- Run `adb logcat` while reproducing to confirm no SystemUI ANR traces are emitted.

---
File created by automated code changes during ANR investigation.
