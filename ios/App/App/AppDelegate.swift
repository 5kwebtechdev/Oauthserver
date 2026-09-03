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
    // Firebase swizzling is disabled (FirebaseAppDelegateProxyEnabled = NO).
    // We manually set the APNs token on Messaging so Firebase can exchange it
    // for an FCM token. ApplicationDelegateProxy does NOT expose these APNs
    // methods — only URL/Universal Link methods are forwarded through it.
    // ─────────────────────────────────────────────────────────────────────────

    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
        // Forward the token to Capacitor Firebase Messaging. Firebase's
        // delegate proxy is disabled in Info.plist, so the plugin cannot
        // observe this callback automatically.
        NotificationCenter.default.post(
            name: .capacitorDidRegisterForRemoteNotifications,
            object: deviceToken
        )
    }

    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("[APNs] Registration failed: \(error.localizedDescription)")
        NotificationCenter.default.post(
            name: .capacitorDidFailToRegisterForRemoteNotifications,
            object: error
        )
    }

    // Delivers background remote notifications to the app.
    func application(_ application: UIApplication,
                     didReceiveRemoteNotification userInfo: [AnyHashable: Any],
                     fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        NotificationCenter.default.post(
            name: Notification.Name("didReceiveRemoteNotification"),
            object: completionHandler,
            userInfo: userInfo
        )
        completionHandler(.newData)
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
    // Standard lifecycle stubs
    // ─────────────────────────────────────────────────────────────────────────

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}
}
