# Badge WebSocket Integration — Implementation & Revert Guide

Purpose
- Document all changes made to add real-time badge popups (STOMP over SockJS) so a future engineer (or Copilot) can remove or revert everything cleanly.

Summary (what was added)
- Real-time badge popup flow using STOMP over SockJS. Backend pushes badge events, frontend shows a full-screen congratulations popup and acknowledges the popup.

Files added
- `src/app/core/services/badge-socket.service.ts`
  - New singleton service that manages STOMP over SockJS connection, queueing, dedupe, and exposes `onBadgeReceived()` and `connect(userId?)`/`disconnect()`/`enqueueBadge()`/`popupClosed()`.

Files modified
- `src/app/core/api/badge.api.ts`
  - Added methods:
    - `getPendingPopups()` → GET `/badges/pending-popup`
    - `acknowledgeBadgePopup(badgeId)` → POST `/badges/popup/{badgeId}/ack`

- `src/app/core/components/badge-section/badge-section.component.ts`
  - Subscribed to `BadgeSocketService.onBadgeReceived()`
  - Added logic to map incoming badge payload to existing `Badge` model and show the existing `congrats` UI.
  - On popup close, calls `BadgeApi.acknowledgeBadgePopup()` and `badgeSocketService.popupClosed()`.

- `src/app/core/components/badge-section/badge-section.component.html` (no visual changes except integration used existing UI)
  - The existing congrats popup UI is used by the component.

- `src/app/app.component.ts`
  - Calls `badgeSocketService.connect()` on init (if authenticated)
  - Subscribes to `onBadgeReceived()` for a global popup as well
  - Calls `badgeApi.getPendingPopups()` on init and enqueues returned badges
  - Handlers added for global popup close and navigation to `/authenticated/badges`

- `src/app/app.component.html`
  - Added a global badge popup block (same UI structure) to show notifications application-wide.

- `src/app/app.component.scss`
  - Added styles for `.global-badge-popup`/congrats UI used by the global popup.

- `src/app/app.module.ts`
  - Imported `CommonModule` and `MindfulButtonComponent` to make the global popup buttons available for the `AppComponent` template.

- `src/polyfills.ts`
  - Added a tiny polyfill: `(window as any).global = window;` to prevent `global is not defined` at runtime for some client libs.

- `package.json` (dependencies installed)
  - Added runtime dependencies:
    - `@stomp/stompjs`
    - `sockjs-client`
  - Added dev dependency:
    - `@types/sockjs-client` (for TypeScript)

Build/test commands used
- `npm install @stomp/stompjs sockjs-client --save`
- `npm install --save-dev @types/sockjs-client`
- `npm run build` (used to verify compilation)
- Serve locally: `npm run start` or `ng serve`

Runtime behavior
- WebSocket connection URL used via SockJS: derived from `environment.apiUrl`, e.g. `ws://<host>/v1/ws`.
- Token passed to server via STOMP CONNECT headers (`Authorization: Bearer <token>`).
- Subscribed topic: `/topic/badges/{userId}` (service subscribes automatically after connect).
- Badge payloads are enqueued and shown one popup at a time; additional arrivals queue.
- On popup close, frontend calls POST `/badges/popup/{badgeId}/ack` to mark `popupShown`.

How to completely remove this feature (quick & safe)

NOTE: Prefer using git for clean revert. If you committed these changes in one or a few commits you can use `git revert <commit>` (safer). If you want to manually remove everything, follow these steps.

A) If you committed changes and want to undo them (recommended)
1. Identify commits that implemented this feature:
   - `git log --oneline` and find the commits (or use your branch/PR).
2. Revert the commits in reverse order:
   - `git revert <commit-hash>` (repeat for each commit for this feature).
3. Run `npm install` and `npm run build` to verify everything is back.

B) Manual removal steps (if uncommitted or you prefer file-level removal)
1. Uninstall npm packages:

```bash
npm uninstall @stomp/stompjs sockjs-client
npm uninstall --save-dev @types/sockjs-client
```

2. Remove the service file:

```bash
del src/app/core/services/badge-socket.service.ts
# or on *nix: rm src/app/core/services/badge-socket.service.ts
```

3. Revert API changes in `src/app/core/api/badge.api.ts` — remove the two added methods:
   - `getPendingPopups()` and `acknowledgeBadgePopup()`
   - Or restore the original file from git: `git checkout -- src/app/core/api/badge.api.ts`

4. Revert `src/app/core/components/badge-section/badge-section.component.ts` to its previous version:
   - Remove imports of `BadgeSocketService`, `BadgePopupData` and the subscription logic.
   - Remove `acknowledgeBadgeAndClose()` (or revert whole file): `git checkout -- src/app/core/components/badge-section/badge-section.component.ts`

5. Revert `src/app/app.component.ts` changes:
   - Remove imports `BadgeSocketService`, `BadgeApi`, `AuthApi` if added.
   - Remove `initializeBadgeWebSocket()`, `checkPendingBadgePopups()` and the global popup state/handlers.
   - Revert template changes in `src/app/app.component.html` (remove the `<div *ngIf="showBadgePopup...">` block).
   - Restore `src/app/app.component.scss` if you modified it for the global popup.
   - Easiest: `git checkout -- src/app/app.component.ts src/app/app.component.html src/app/app.component.scss`

6. Revert `src/app/app.module.ts` changes if you added `CommonModule` or `MindfulButtonComponent` imports — restore original imports or use git to checkout the file.

7. Revert `src/polyfills.ts` change (remove `(window as any).global = window;`) if present.

8. Rebuild and test:

```bash
npm install
npm run build
npm run start
```

C) If you used a single branch/PR and want to drop the branch entirely
- `git checkout main` (or your base branch)
- `git branch -D <feature-branch>` (if you haven't merged)

Notes & caveats
- The service uses `environment.apiUrl` to derive the SockJS endpoint; if your backend expects a different path adjust the service.
- If you used STOMP topics different from `/topic/badges/{userId}` update any server routing accordingly.
- If you used `git revert` be careful with unrelated changes in the same commits. Prefer atomic commits.
- Some browser polyfills were added because `sockjs-client` (or its transitive deps) relied on `global` or Node-like shims. If you remove packages, remove that polyfill too.

Testing the integration (manual)
- Start backend and frontend.
- Ensure the user token is set in localStorage (key `auth_token`) or AuthApi returns a token.
- Observe console logs for `[BadgeSocket] STOMP connected` and incoming messages.
- Trigger a backend push to `/topic/badges/{userId}` and verify the popup appears.

If you want me to also create a small script to automatically rollback these changes (a revert script), say so and I will add `scripts/revert-badge-websocket.sh` and a Windows `.ps1` alternative.

---
Generated on: 2026-01-29
Repository: MindfulBuddy-App
Author: Changes applied by GitHub Copilot agent