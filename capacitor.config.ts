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
      // TODO: Replace with your Web client ID from Google Cloud Console > APIs & Services > Credentials
      // It must be the "Web application" type client ID, not the Android one.
      serverClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
      scopes: ['profile', 'email'],
      forceCodeForRefreshToken: true
    }
  }
};

export default config;
