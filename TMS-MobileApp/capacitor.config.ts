import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'TMS',
  webDir: 'www',
  server: {
    androidScheme: 'http',
    cleartext: true
  },
  android: {
    buildOptions: {
      compileSdkVersion: 34,
      targetSdkVersion: 34,
      minSdkVersion: 24
    }
  }
};

export default config;