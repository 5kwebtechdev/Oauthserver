import FirebaseCore
import FirebaseMessaging
import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        FirebaseApp.configure()
        return true
    }

    // ─────────────────────────────────────────────────────────────────────────
    // APNs token forwarding
    //
    // Firebase swizzling is disabled (FirebaseAppDelegateProxyEnabled = NO in
    // Info.plist) to avoid conflicts with Capacitor's ApplicationDelegateProxy.
    // We manually forward the APNs device token to both Firebase Messaging and
    // the Capacitor proxy so all plugins receive the callback.
    // ─────────────────────────────────────────────────────────────────────────

    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        // Give Firebase the raw APNs token so it can exchange it for an FCM token.
        Messaging.messaging().apnsToken = deviceToken
        // Forward to Capacitor so @capacitor-firebase/messaging (and other plugins)
        // receive the callback via ApplicationDelegateProxy.
        ApplicationDelegateProxy.shared.application(application,
            didRegisterForRemoteNotificationsWithDeviceToken: deviceToken)
    }

    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        ApplicationDelegateProxy.shared.application(application,
            didFailToRegisterForRemoteNotificationsWithError: error)
    }

    // Required for background push delivery on iOS.
    func application(_ application: UIApplication,
                     didReceiveRemoteNotification userInfo: [AnyHashable: Any],
                     fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        ApplicationDelegateProxy.shared.application(application,
            didReceiveRemoteNotification: userInfo,
            fetchCompletionHandler: completionHandler)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // URL / Universal Link handling (Capacitor deep-link support)
    // ─────────────────────────────────────────────────────────────────────────

    func application(_ app: UIApplication,
                     open url: URL,
                     options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication,
                     continue userActivity: NSUserActivity,
                     restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application,
            continue: userActivity,
            restorationHandler: restorationHandler)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Standard lifecycle stubs (required by UIApplicationDelegate)
    // ─────────────────────────────────────────────────────────────────────────

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}
}
