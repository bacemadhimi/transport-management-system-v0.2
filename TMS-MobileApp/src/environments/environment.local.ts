import { Capacitor } from '@capacitor/core';

// Adresse locale pour test chez soi (mise à jour selon ipconfig)
const LOCAL_IP = '192.168.76.186';
const LOCAL_PORT = '5191';

function getApiUrl(): string {
  if (Capacitor.isNativePlatform()) {
    return `http://${LOCAL_IP}:${LOCAL_PORT}`;
  }
  return 'http://localhost:5191';
}

export const environment = {
  production: false,
  apiUrl: getApiUrl(),
  weatherApiKey: ''
};
