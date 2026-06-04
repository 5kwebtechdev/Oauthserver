import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.superme.app',
  appName: 'Superme',
  webDir: 'www',
  // server: {
  //   cleartext: true,
  //   androidScheme: 'http',
  //   allowNavigation: [
  //     'api.supermeapp.com:3000',
  //     'localhost'
  //   ]
  // },
  android: {
    allowMixedContent: true
  },
  plugins: {
    GoogleAuth: {
      // Get this from Firebase Console → Project Settings → Your web app → OAuth 2.0 Client IDs
      serverClientId: '124581866222-gblqv0k2a75uo4183ahl0u8336nbcsku.apps.googleusercontent.com',
      scopes: ['profile', 'email'],
      forceCodeForRefreshToken: true
    }
  }
};

export default config;
