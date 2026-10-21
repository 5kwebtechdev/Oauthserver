export const environment = {
  production: false,
  //apiUrl: 'http://187.127.142.16:8082/v1',
  apiUrl: 'https://api.supermeapp.com/v1',
  // Public website used by native share sheets. Never use the local Angular dev URL.
  publicWebUrl: 'https://supermeapp.com',
  // Razorpay Key ID is a public checkout identifier. Never add the Key Secret here.
  razorpayKeyId: 'rzp_test_TG7krxwa0XFHO6',
  apiAuthToken: 'Bearer',
  appleSignIn: {
    // Native iOS audience. This must match PRODUCT_BUNDLE_IDENTIFIER and the
    // primary App ID configured in Apple Developer.
    nativeClientId: 'com.supermeapp.app',
    // Native AuthenticationServices does not use a redirect URL. Keep this
    // empty unless a separate web Sign in with Apple flow is introduced.
    redirectUri: '',
    // Requires the explicit localStorage opt-in documented in
    // docs/apple-sign-in-release-checklist.md.
    developmentMockEnabled: true
  },
  firebase: {
    apiKey: 'AIzaSyBo8GqPQ0Ac2g8tzBS0YCewwLJ-vgouTi4',
    authDomain: 'supermeapp-74589.firebaseapp.com',
    projectId: 'supermeapp-74589',
    storageBucket: 'supermeapp-74589.firebasestorage.app',
    messagingSenderId: '124581866222',
    appId: '1:124581866222:android:3e58ea3c8d0932c42fe1ff',
    remoteConfig: {
      minimumFetchIntervalMillis: 60000,
      defaults: {
        academy_enabled: true,
        tutors_enabled: true,
        school_store_enabled: true,
        force_update_required: true,
        minimum_supported_version: '0.0.0',
        android_minimum_supported_version: '',
        ios_minimum_supported_version: '',
        android_force_update_required: '',
        ios_force_update_required: '',
        android_store_url: 'https://play.google.com/store/apps/details?id=com.superme.app',
        // Set this to the public App Store listing before enabling iOS force update.
        ios_store_url: ''
      }
    },
    appCheck: {
      enabled: true,
      recaptchaSiteKey: '',
      debugToken: ''
    },
    deepLinks: {
      scheme: 'superme',
      hosts: ['supermeapp.com'],
      defaultPath: '/authed/user-dashboard'
    }
  },
  // googleMapsApiKey: 'YOUR_GOOGLE_MAPS_API_KEY'
};
