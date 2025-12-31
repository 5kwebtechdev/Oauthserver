import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'Superme',
  webDir: 'www',
  server: {
    cleartext: true,
    androidScheme: 'http',
    allowNavigation: [
      'ec2-13-235-27-101.ap-south-1.compute.amazonaws.com',
      'ec2-13-126-1-142.ap-south-1.compute.amazonaws.com',
      'localhost'
    ]
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
