

import { Capacitor } from '@capacitor/core';

// Platform-aware API URL detection at runtime
function getApiUrl(): string {
  return Capacitor.isNativePlatform()
    ? 'http://192.168.68.186:5191'
    : 'http://localhost:5191';
}

export const environment = {
  production: false,
  apiUrl: getApiUrl(),
  weatherApiKey: ''
};


