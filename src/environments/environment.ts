export const environment = {
  production: true,
  apiUrl: 'https://api.supermeapp.com/v1',
  // apiUrl: 'http://localhost:8080/v1',
  apiAuthToken: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIzIiwiaWQiOjMsIm5hbWUiOiJKb2huIHdpY2siLCJnZW5kZXIiOiJNQUxFIiwiZGF0ZU9mQmlydGgiOjk0NjY4NDcwMDAwMCwicmVsYXRpb25zaGlwIjoiU0VMRiIsImlhdCI6MTc1ODA5ODQ0MywiZXhwIjoxNzg5NjM0NDQzfQ.Cw5X42RBabW1ZgMm_QHSeYcOElREtmke476YoKNjni8',
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
        minimum_supported_version: '0.0.0'
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
