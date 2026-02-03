import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
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
  }
};

export default config;