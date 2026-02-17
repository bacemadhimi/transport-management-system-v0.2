export interface ITruck {
  id: number;
  immatriculation: string;
  brand: string;
  capacity: number; // Capacité totale en kg
  capacityUnit?: string; // "kg" ou "tonnes"
  currentLoad?: number; // Charge actuelle
  loadType?: 'palettes' | 'cartons' | 'poid'; // Type de chargement
  technicalVisitDate: string | null;
  status: string;
  color: string;
  imageBase64: string | null;
  isEnable?: boolean;
  disabled?: boolean;
  tooltip?: string;
  availabilityMessage?: string;
  zoneId?: number;
}

export interface IZone {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius?: number; // Rayon en km
  truckCount?: number;
}

export const STATUS_CONFIG: { [key: string]: { color: string; label: string; icon: string } } = {
  'available': { color: '#1cc88a', label: 'Disponible', icon: 'fa-check-circle' },
  'on_mission': { color: '#4e73df', label: 'En mission', icon: 'fa-truck' },
  'maintenance': { color: '#f6c23e', label: 'En maintenance', icon: 'fa-tools' },
  'out_of_service': { color: '#e74a3b', label: 'Hors service', icon: 'fa-exclamation-circle' }
};

// ========== 24 ZONES DE TUNISIE ==========
export const TUNISIA_ZONES: IZone[] = [
  { id: 1, name: 'Tunis', latitude: 36.8065, longitude: 10.1815 },
  { id: 2, name: 'Ariana', latitude: 36.8665, longitude: 10.1647 },
  { id: 3, name: 'Ben Arous', latitude: 36.7531, longitude: 10.2289 },
  { id: 4, name: 'Manouba', latitude: 36.8078, longitude: 10.1011 },
  { id: 5, name: 'Bizerte', latitude: 37.2746, longitude: 9.8739 },
  { id: 6, name: 'Nabeul', latitude: 36.4565, longitude: 10.7346 },
  { id: 7, name: 'Zaghouan', latitude: 36.4029, longitude: 10.1429 },
  { id: 8, name: 'Sousse', latitude: 35.8256, longitude: 10.641 },
  { id: 9, name: 'Monastir', latitude: 35.7833, longitude: 10.8333 },
  { id: 10, name: 'Mahdia', latitude: 35.5047, longitude: 11.0622 },
  { id: 11, name: 'Sfax', latitude: 34.7406, longitude: 10.7603 },
  { id: 12, name: 'Kairouan', latitude: 35.6781, longitude: 10.0964 },
  { id: 13, name: 'Kasserine', latitude: 35.1676, longitude: 8.8365 },
  { id: 14, name: 'Sidi Bouzid', latitude: 35.0381, longitude: 9.4858 },
  { id: 15, name: 'Gabès', latitude: 33.8815, longitude: 10.0982 },
  { id: 16, name: 'Médenine', latitude: 33.3549, longitude: 10.5055 },
  { id: 17, name: 'Tataouine', latitude: 32.9297, longitude: 10.4518 },
  { id: 18, name: 'Gafsa', latitude: 34.425, longitude: 8.7842 },
  { id: 19, name: 'Tozeur', latitude: 33.9197, longitude: 8.1336 },
  { id: 20, name: 'Kébili', latitude: 33.7045, longitude: 8.9695 },
  { id: 21, name: 'Béja', latitude: 36.7256, longitude: 9.1817 },
  { id: 22, name: 'Jendouba', latitude: 36.5011, longitude: 8.7802 },
  { id: 23, name: 'Le Kef', latitude: 36.1741, longitude: 8.7049 },
  { id: 24, name: 'Siliana', latitude: 36.0849, longitude: 9.3707 }
];
// Groupes de zones par région
export const ZONES_BY_REGION = {
  'Nord-Est': ['Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Bizerte', 'Nabeul'],
  'Nord-Ouest': ['Béja', 'Jendouba', 'Kef', 'Siliana', 'Zaghouan'],
  'Centre-Est': ['Sousse', 'Monastir', 'Mahdia', 'Sfax', 'Gabès'],
  'Centre-Ouest': ['Kairouan', 'Kasserine', 'Sidi Bouzid', 'Gafsa'],
  'Sud': ['Medenine', 'Tataouine', 'Kebili', 'Tozeur']
};
export interface ITruckWithZone extends ITruck {
  zoneName?: string;  // Pour l'affichage après jointure
  zoneCoordinates?: { lat: number; lng: number };
}