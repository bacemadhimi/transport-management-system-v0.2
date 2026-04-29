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
      compileSdkVersion: 35,
      targetSdkVersion: 35,
      minSdkVersion: 24
    }
  }
};

export default config;