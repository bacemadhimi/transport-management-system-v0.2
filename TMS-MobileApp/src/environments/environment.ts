

import { Capacitor } from '@capacitor/core';

// Platform-aware API URL detection at runtime
function getApiUrl(): string {
  return Capacitor.isNativePlatform()
    ? 'http://192.168.68.186:5191'
    : 'http://localhost:5191';
}

export const environment = {
  production: false,
<<<<<<< test-apk
  apiUrl: getApiUrl(),
  weatherApiKey: ''
=======
  apiUrl: 'https://localhost:7287',
  weatherApiKey: '' // OpenWeatherMap API key (optional - leave empty for simulated weather)
>>>>>>> dev
};


