import { Capacitor } from '@capacitor/core';

// Adresse locale pour test chez soi (mise à jour selon ipconfig)
const LOCAL_IP = '192.168.76.186';
const LOCAL_PORT = '5191';

function getApiUrl(): string {

  return 'http://51.178.65.32:45880';
}

export const environment = {
  production: false,
  apiUrl: getApiUrl(),
  weatherApiKey: ''
};
