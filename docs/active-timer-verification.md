# Active timer native presentation verification

## Android

The existing MainActivity owns one native PiP presentation. The Angular modal supplies its existing scheduled end timestamp; the native view calculates the remaining time from that timestamp. It does not invoke task, habit, reward or completion APIs. Expanding PiP retains the same activity/WebView and modal. Normal in-app modal dismissal clears the presentation.

Entry requires API 26+, device PiP support, a non-null active session and an end timestamp in the future. Android 23–25 retain the regular timer. User/device PiP settings may prevent entry. No pause, Done or Abort action is added to the native window.

Unverified release checks: Home gesture/button, expansion to the same modal, lock/unlock, PiP close button, deep links while minimized, completion/abort dismissal, and API-call counts on real-device suspension/resume. In particular, clearSession calls moveTaskToBack(true); this is not proof that every Android OS/OEM dismisses the pinned window. Verify before release. Native session data is in memory; process-death restoration of the PiP presentation is not implemented.

## iOS Live Activity requirements (not implemented)

- Existing app: com.supermeapp.app, Team 9QZU552289, minimum iOS 16.0, Xcode 26.2. The BirthdayNotification target is a notification content extension, not a WidgetKit extension.
- Add and embed a SwiftUI WidgetKit extension, proposed identifier com.supermeapp.app.ActiveTimerWidget, signed by the same team. Register that explicit identifier and provision the extension for development and App Store distribution; include it in export signing mappings if signing is manual. Existing app certificates need not be replaced.
- Add NSSupportsLiveActivities=true to the app Info.plist. Use ActivityKit availability checks (iOS 16.1+), check ActivityAuthorizationInfo.areActivitiesEnabled, and retain fallback for unsupported/disabled devices. Dynamic Island presentations apply only on devices supporting Dynamic Island.
- Add ActivityAttributes shared at compile time by the app and widget, and a Capacitor bridge for start/update/end. Carry existing activity ID/type/title/start/end, never run a separate business timer. Render the countdown with SwiftUI's date-based timer text/progress, without per-second JavaScript updates.
- Provide Lock Screen and compact/minimal/expanded Dynamic Island layouts. A widgetURL must reopen the exact activity via the existing navigation flow, including reconciliation after process death. Reconcile Activity.activities to avoid duplicate Live Activities and end the matching activity after successful Done/Abort.
- App Groups are not necessary merely to send ActivityKit attributes/state. Add a group to both targets only if shared storage is actually needed. No background-audio entitlement or invented ActivityKit entitlement is required for this local implementation.
- A local Live Activity does not grant background execution to call completion APIs. At the scheduled deadline, display the elapsed/finished state from dates; reconcile business completion when the existing app flow runs. Reliable server-driven end/update while the app is suspended would require ActivityKit APNs updates and separate backend work. Do not promise an app callback exactly at zero.
- Live Activities have a maximum active lifetime of eight hours. Account for long tasks and user-disabled/dismissed Live Activities.

Keep the current local-notification fallback for unsupported or disabled Live Activities. Once Live Activities are implemented, suppress the running reminder for sessions successfully presented as Live Activities to avoid redundant surfaces. The current fallback is a notification, not an ongoing countdown or Dynamic Island implementation.

References: https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities and https://developer.android.com/develop/ui/views/picture-in-picture
