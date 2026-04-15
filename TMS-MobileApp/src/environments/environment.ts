

import { Capacitor } from '@capacitor/core';

// Platform-aware API URL detection at runtime
function getApiUrl(): string {
  return Capacitor.isNativePlatform()
    ? 'http://51.178.65.32:45880'
    : 'http://51.178.65.32:45880';
}

export const environment = {
  production: false,
  apiUrl: getApiUrl(),
  weatherApiKey: ''
};


