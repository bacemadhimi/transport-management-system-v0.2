// Types pour le GPS

export interface IPositionGPS {
  id: number;
  driverId?: number | null;
  truckId?: number | null;
  latitude: number;
  longitude: number;
  timestamp: string;
  source?: string;
  driverName?: string;
  truckName?: string;
}

export interface GPSPositionDto {
  driverId?: number | null;
  truckId?: number | null;
  latitude: number;
  longitude: number;
  source?: string;
}

export interface DistanceCalculationDto {
  lat1: number;
  lng1: number;
  lat2: number;
  lng2: number;
}

export interface IOptimisationResult {
  id: number;
  tripId: number;
  originalDistance: number;
  optimizedDistance: number;
  distanceSaved: number;
  distanceSavedPercent: number;
  estimatedTimeOriginal: number;
  estimatedTimeOptimized: number;
  timeSaved: number;
  timeSavedPercent: number;
  costOriginal: number;
  costOptimized: number;
  costSaved: number;
  optimizedOrder: number[];
  points: { lat: number; lng: number; order: number }[];
  createdAt: string;
}

export interface OptimizeRouteDto {
  tripId: number;
  points: { lat: number; lng: number }[];
}

export interface EstimateTimeDto {
  distance: number;
}

export interface EstimateTimeResult {
  distance: number;
  timeInMinutes: number;
  timeInHours: number;
}
