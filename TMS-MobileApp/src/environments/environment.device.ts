/**
 * Environment configuration for testing on real Android device
 * 
 * BEFORE BUILDING:
 * 1. Find your computer's IP address:
 *    - Windows: Run `ipconfig` in CMD, look for "IPv4 Address" (usually 192.168.x.x)
 *    - Make sure your phone and computer are on the SAME WiFi network
 * 2. Replace '192.168.1.100' below with your actual IP address
 * 3. Ensure your backend is accessible from other devices on the network
 */
export const environment = {
  production: false,
  // IP du PC: utilise l'adresse IP reelle (192.168.68.186)
  apiUrl: 'http://192.168.68.186:5191',
  weatherApiKey: '' // OpenWeatherMap API key (optional)
};
