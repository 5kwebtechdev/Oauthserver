import type { CapacitorConfig } from '@capacitor/cli';
import { GOOGLE_AUTH_CAPACITOR_CONFIG } from './src/app/core/config/google-auth.config';

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
    GoogleAuth: GOOGLE_AUTH_CAPACITOR_CONFIG
  }
};

export default config;
