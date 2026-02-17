import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.development';
import { IDashboard } from '../types/dashboard';

export interface ITripByTruck {
  truckImmatriculation: string;
  tripCount: number;
}

export interface ITodayTrip {
  tripId: number;
  driverName: string;
  truckImmatriculation: string;
  customerName: string;
  tripStart: string;
  tripEnd: string;
  tripStatus: string;
  approxTotalKM?: number;
}

@Injectable({
  providedIn: 'root'
})
export class Dashboard {
  private http = inject(HttpClient);

  constructor() { }

  // Statistiques totales (utilisateurs, chauffeurs, camions)
  getDashboardData() {
    return this.http.get<IDashboard>(`${environment.apiUrl}/api/Dashboard`);
  }

  // Nombre de trajets par camion
  getTripsByTruck() {
    return this.http.get<ITripByTruck[]>(`${environment.apiUrl}/api/Dashboard/trips-by-truck`);
  }

  // Trajets du jour
  getTodayTrips() {
    return this.http.get<ITodayTrip[]>(`${environment.apiUrl}/api/Dashboard/today-trips`);
  }
}
