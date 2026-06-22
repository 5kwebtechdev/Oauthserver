import type { CapacitorConfig } from '@capacitor/cli';
import { GOOGLE_AUTH_CAPACITOR_CONFIG } from './src/app/core/config/google-auth.config';

const config: CapacitorConfig = {
  appId: 'com.superme.app',
  appName: 'Superme',
  webDir: 'www',
  server: {
    allowNavigation: [
      'api.supermeapp.com',
      '*.supermeapp.com'
    ]
  },
  android: {
    allowMixedContent: true
  },
  plugins: {
    GoogleAuth: GOOGLE_AUTH_CAPACITOR_CONFIG,
    FirebaseMessaging: {
      // Show badge, play sound, and display a banner when a notification
      // arrives while the app is in the foreground on iOS.
      presentationOptions: ['badge', 'sound', 'alert']
    },
    Keyboard: {
      // Resize the body element when the keyboard opens so Ionic's
      // scroll-into-view logic can push focused inputs above the keyboard.
      resize: 'body' as any,
      // Keep keyboard dark on iOS to match the system keyboard appearance.
      style: 'default' as any,
      resizeOnFullScreen: true
    }
  }
};

export default config;
