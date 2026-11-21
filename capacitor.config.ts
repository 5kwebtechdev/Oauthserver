import type { CapacitorConfig } from '@capacitor/cli';
import { GOOGLE_AUTH_CAPACITOR_CONFIG } from './src/app/core/config/google-auth.config';

// Set only when syncing the production Android build; DEV/iOS retain their origin.
const productionAndroid = process.env['SUPERME_ANDROID_PRODUCTION'] === 'true';

const config: CapacitorConfig = {
  appId: 'com.superme.app',
  appName: 'SuperMeApp',
  webDir: 'www',
  server: {
    ...(productionAndroid ? { androidScheme: 'https', hostname: 'app.supermeapp.com' } : {}),
    allowNavigation: [
      'api.supermeapp.com',
      '*.supermeapp.com'
    ]
  },
  android: {
    // Native plugin arguments can contain OAuth callback URLs; never log them.
    loggingBehavior: 'none',
    allowMixedContent: true,
    // Android 15+ enforces edge-to-edge rendering, so the legacy StatusBar
    // overlay flag alone cannot keep the WebView below the system bars.
    // Capacitor applies the device's real WindowInsets to its WebView in auto
    // mode. This setting is Android-only and leaves iOS/Web safe areas intact.
    adjustMarginsForEdgeToEdge: 'auto'
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
