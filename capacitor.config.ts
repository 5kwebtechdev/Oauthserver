import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'Superme',
  webDir: 'www',
  server: {
    url: 'http://10.0.2.2:4200',
    cleartext: true
  },
  android: {
    allowMixedContent: true
  }
};

export default config;