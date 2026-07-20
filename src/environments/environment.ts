export const environment = {
  production: true,
  apiUrl: 'https://api.supermeapp.com/v1',
  // apiUrl: 'http://localhost:8080/v1',
  apiAuthToken: 'Bearer',
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
      hosts: ['supermeapp.com', 'www.supermeapp.com'],
      defaultPath: '/authed/user-dashboard'
    }
  },
  // googleMapsApiKey: 'YOUR_GOOGLE_MAPS_API_KEY'
};
