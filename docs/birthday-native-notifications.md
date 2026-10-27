# Birthday notification transport handoff

## Copy-ready backend developer prompt

Change transport only for `BIRTHDAY_SELF` and `CHILD_BIRTHDAY_PARENT`.
Do not change scheduling, birthday eligibility, rewards, or navigation destinations.

For supported Android app installations, send data-only FCM messages. Omit BOTH
`message.notification` and `message.android.notification`. Set Android priority
to HIGH. All `message.data` values must be strings:

```json
{
  "message": {
    "token": "<target Android token>",
    "android": { "priority": "HIGH" },
    "data": {
      "type": "BIRTHDAY_SELF",
      "notificationId": "<stable notification record ID>",
      "title": "<existing rendered dynamic title>",
      "body": "<existing rendered dynamic message>",
      "actionScreen": "<existing unchanged destination>",
      "referenceId": "<existing unchanged reference>"
    }
  }
}
```

Parent type is exactly `CHILD_BIRTHDAY_PARENT`. Do not infer type from HOME or
PARENT_DASHBOARD. Keep `actionScreen` and `referenceId` unchanged. `body` is the
transport copy of the existing message text; do not change the notification-list API.
New required data keys are `type`, `notificationId`, `title`, `body`.
No image URL, separate username/age, or new client birthday calculation is needed.

For iOS retain an alert notification, not a silent/data-only push. Send the same
custom data plus `message.apns.payload.aps.category` equal to the explicit birthday
type, and `aps.alert.title` / `aps.alert.body` containing the existing title/message.
Use APNs headers `apns-push-type: alert`, `apns-priority: 10`. Preserve existing
sound and badge behavior. Existing top-level notification title/body may remain
for iOS; ensure they agree with aps.alert. No `mutable-content` is required:
the content extension renders bundled UI and does not download attachments.

Use platform-targeted sends; never attach a top-level notification to the Android
data-only send. All other notification types must retain their existing transport.

Deduplicate server dispatch by recipient + notification record ID. Retry the same
record with the same notificationId. For iOS also use a stable, <=64-byte
`apns-collapse-id` derived from that ID; collapse is not a substitute for server
idempotency once a notification has already been delivered. The iOS UI extension
cannot intercept or suppress duplicate collapsed notifications.

ROLL OUT ONLY AFTER the new native build is installed and verified. Confirm how
you identify platform and supported installed build per token. Older Android
builds cannot display these data-only pushes in the background: keep legacy
notification+data for them. Do not guess a minimum build number; agree it after
the release build exists. Preserve existing expiry policy and keep Android retry
TTL within 28 days (native duplicate receipts are retained 35 days).

Test both birthday types on Android foreground/background/swiped-away and iOS
foreground/background/expanded view. Test repeated sends with the same ID, two
different IDs, missing fields, permission denied, long names and large text.
Verify HOME/PARENT_DASHBOARD + referenceId navigation on cold and warm starts,
and regression-test a non-birthday notification. Force-stopped Android apps and
OS delivery restrictions cannot be bypassed or promised guaranteed delivery.
Please provide sanitized final Android and iOS envelopes for integration tests.

## Client implementation and release gates

- Android replaces only the Firebase bridge service with a subclass; normal
  messages and token callbacks still go through the existing plugin.
- Valid birthday data-only messages render natively. Stable notification tags
  replace rather than stack; persisted 35-day IDs suppress retries after dismissal.
- Angular skips a second local notification/toast for that same valid contract.
- The explicit launch intent carries the original routing fields and Firebase
  message ID into the existing notificationActionPerformed navigation handler.
- iOS adds an embedded Notification Content Extension for the two category IDs.
  Its CTA performs the original default notification action; it does not create
  another notification or introduce a new route.
- Collapsed iOS notifications retain Apple's icon/title/body/system chrome.
  Only the expanded content view can use custom birthday artwork.
- Android also retains system decoration and platform height limits; very long
  text can truncate in the tray. The app remains the full-content destination.
- The current layouts are an INTERIM cream/orange text card, not the final Figma
  celebration artwork. Exact background/cake exports and device visual QA remain
  required before rollout. No unrelated substitute artwork has been bundled.
- The extension needs a provisioning profile for
  `com.supermeapp.app.BirthdayNotification` under the existing team. No production
  certificate/profile was modified. Future version/build bumps must also update
  the extension to match the app.
- A content extension does not require a service extension, app group, new network
  permission, or additional Firebase dependency.
