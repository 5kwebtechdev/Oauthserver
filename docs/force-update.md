# Force Update Configuration

The mobile app checks Firebase Remote Config on launch and whenever it returns to the foreground. Web builds are never force-blocked. If a fetch takes longer than eight seconds, the app evaluates Firebase's cached or bundled defaults so startup cannot hang indefinitely.

## Remote Config keys

| Key | Type | Purpose |
| --- | --- | --- |
| `force_update_required` | Boolean | Shared fallback switch for Android and iOS. |
| `minimum_supported_version` | String | Shared fallback minimum version. |
| `android_force_update_required` | String (`true`, `false`, or blank) | Optional Android override. |
| `ios_force_update_required` | String (`true`, `false`, or blank) | Optional iOS override. |
| `android_minimum_supported_version` | String | Optional Android minimum version override. |
| `ios_minimum_supported_version` | String | Optional iOS minimum version override. |
| `android_store_url` | String | Google Play listing URL. |
| `ios_store_url` | String | Public Apple App Store listing URL. Required before enabling an iOS force update. |

Use dotted release versions such as `0.2.0` or `1.1.0`. The comparison uses the native Android `versionName` and iOS `CFBundleShortVersionString`.

To force an Android update only, set `android_force_update_required` to `true` and raise `android_minimum_supported_version` above the oldest version that may continue. Leave the iOS override blank or set it to `false`. Apply the equivalent iOS keys for an iOS-only rollout.

Publish the new store build before raising the minimum version. To roll back an accidental lockout, set the platform force-update key to `false` or lower its minimum supported version.

The app validates the store destination before blocking access. If a platform store URL is missing or malformed, the force update fails open and logs a configuration error instead of trapping users behind an Update button that cannot reach the store.
