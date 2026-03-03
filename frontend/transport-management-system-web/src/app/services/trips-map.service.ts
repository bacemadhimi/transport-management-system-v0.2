
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, forkJoin, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { ITrip, IDelivery, TripStatus, DeliveryStatus } from '../types/trip';
import { ITruck } from '../types/truck';
import { IDriver } from '../types/driver';
import { ICustomer } from '../types/customer';
import { IZone, TUNISIA_ZONES } from '../types/truck';

export interface ITripWithDetails extends ITrip {
  truck?: ITruck;
  driver?: IDriver;
  deliveries?: IDeliveryWithDetails[];
  statusColor?: string;
  progress?: number;
  statusLabel?: string;
  statusIcon?: string;
  startZone?: IZone;
  endZone?: IZone;
  startZoneName?: string;
  endZoneName?: string;
  startCoordinates?: { lat: number; lng: number };
  endCoordinates?: { lat: number; lng: number };
}

export interface IDeliveryWithDetails extends IDelivery {
  customer?: ICustomer;
  zoneName?: string;
  zoneId?: number;
  zoneCoordinates?: { lat: number; lng: number };
  statusColor?: string;
  statusLabel?: string;
  statusIcon?: string;
  gouvernorat?: string;
}

export interface IZoneDeliveryStats {
  zoneId: number;
  zoneName: string;
  total: number;
  planned: number;
  pending: number;
  inProgress: number;
  delivered: number;
  failed: number;
  cancelled: number;
}

export const TRIP_STATUS_CONFIG: Record<TripStatus, { label: string; color: string; icon: string }> = {
  [TripStatus.Planned]: { label: 'Planifié', color: '#6c757d', icon: 'fa-calendar-alt' },
  [TripStatus.Accepted]: { label: 'Accepté', color: '#4e73df', icon: 'fa-check-circle' },
  [TripStatus.LoadingInProgress]: { label: 'Chargement', color: '#f6c23e', icon: 'fa-boxes' },
  [TripStatus.DeliveryInProgress]: { label: 'Livraison', color: '#1cc88a', icon: 'fa-truck' },
  [TripStatus.Receipt]: { label: 'Livré', color: '#1cc88a', icon: 'fa-check-double' },
  [TripStatus.Cancelled]: { label: 'Annulé', color: '#e74a3b', icon: 'fa-times-circle' }
};

export const DELIVERY_STATUS_CONFIG: Record<DeliveryStatus, { label: string; color: string; icon: string }> = {
  [DeliveryStatus.Pending]: { label: 'En attente', color: '#6c757d', icon: 'fa-clock' },
  [DeliveryStatus.EnRoute]: { label: 'En route', color: '#4e73df', icon: 'fa-truck' },
  [DeliveryStatus.Arrived]: { label: 'Arrivé', color: '#f6c23e', icon: 'fa-map-pin' },
  [DeliveryStatus.Delivered]: { label: 'Livré', color: '#1cc88a', icon: 'fa-check-circle' },
  [DeliveryStatus.Failed]: { label: 'Échoué', color: '#e74a3b', icon: 'fa-exclamation-circle' },
  [DeliveryStatus.Cancelled]: { label: 'Annulé', color: '#858796', icon: 'fa-times-circle' }
};

@Injectable({
  providedIn: 'root'
})
export class TripsMapService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  private zoneById: Map<number, IZone> = new Map();
  private zoneByName: Map<string, IZone> = new Map();

  constructor() {
    TUNISIA_ZONES.forEach(zone => {
      this.zoneById.set(zone.id, zone);
      this.zoneByName.set(zone.name.toLowerCase(), zone);
    });
  }

  /**
   * Récupère les tournées avec tous les détails - PAS DE CACHE
   */
  getTripsWithDetails(
    status?: string,
    zoneName?: string,
    startDate?: string,
    endDate?: string
  ): Observable<ITripWithDetails[]> {
    console.log('🌐 Chargement des données fraîches...');
    
    let zoneId: number | undefined;
    if (zoneName && zoneName !== 'all') {
      const zone = this.zoneByName.get(zoneName.toLowerCase());
      zoneId = zone?.id;
    }

    // Charger toutes les données en parallèle
    return forkJoin({
      trips: this.getTripsFromApi(status, zoneId, startDate, endDate),
      trucks: this.getTrucksFromApi(),
      drivers: this.getDriversFromApi(),
      customers: this.getCustomersFromApi()
    }).pipe(
      map(({ trips, trucks, drivers, customers }) => {
        console.log(`🔍 Enrichissement de ${trips.length} tournées...`);
        return this.enrichTrips(trips, trucks, drivers, customers);
      }),
      catchError(error => {
        console.error('Erreur chargement données:', error);
        return of([]);
      })
    );
  }

  private getTripsFromApi(
    status?: string,
    zoneId?: number,
    startDate?: string,
    endDate?: string
  ): Observable<ITrip[]> {
    let params = new HttpParams();
    
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (status && status !== 'all') params = params.set('status', status);
    if (zoneId) params = params.set('zoneId', zoneId.toString());

    return this.http.get<ITrip[]>(`${this.apiUrl}/api/Trips/list_filtered`, { params }).pipe(
      catchError(error => {
        console.error('Erreur API trips:', error);
        return of([]);
      })
    );
  }

  private getTrucksFromApi(): Observable<ITruck[]> {
    return this.http.get<ITruck[]>(`${this.apiUrl}/api/Trucks/list`).pipe(
      catchError(() => of([]))
    );
  }

 private getDriversFromApi(): Observable<IDriver[]> {
  return this.http.get<IDriver[]>(`${this.apiUrl}/api/Drivers/list`).pipe(
    map(drivers => drivers.map(driver => ({
      ...driver,
      employeeCategory: "DRIVER" as const  
    }))),
    catchError(error => {
      console.error('Error fetching drivers:', error);
      return of([]);
    })
  );
}

  private getCustomersFromApi(): Observable<ICustomer[]> {
    return this.http.get<ICustomer[]>(`${this.apiUrl}/api/customer/list`).pipe(
      catchError(() => of([]))
    );
  }

  private enrichTrips(
    trips: ITrip[], 
    trucks: ITruck[], 
    drivers: IDriver[], 
    customers: ICustomer[]
  ): ITripWithDetails[] {
    const truckMap = new Map(trucks.map(t => [t.id, t]));
    const driverMap = new Map(drivers.map(d => [d.id, d]));
    const customerMap = new Map(customers.map(c => [c.id, c]));

    return trips.map(trip => {
      const truck = truckMap.get(trip.truckId);
      const driver = driverMap.get(trip.driverId);
      const statusConfig = TRIP_STATUS_CONFIG[trip.tripStatus as TripStatus] || TRIP_STATUS_CONFIG[TripStatus.Planned];
      
      const startZone = truck?.zoneId ? this.zoneById.get(truck.zoneId) : undefined;
      
      const deliveries = (trip.deliveries || []).map(delivery => {
        const customer = customerMap.get(delivery.customerId);
        
        let zoneName = 'Non assigné';
        let zoneCoordinates = null;
        
        if (customer?.zoneId) {
          const zone = this.zoneById.get(customer.zoneId);
          if (zone) {
            zoneName = zone.name;
            zoneCoordinates = { lat: zone.latitude, lng: zone.longitude };
          }
        }
        
        const deliveryStatusConfig = DELIVERY_STATUS_CONFIG[delivery.status as DeliveryStatus] || DELIVERY_STATUS_CONFIG[DeliveryStatus.Pending];
        
        return {
          ...delivery,
          customer,
          zoneName,
          zoneId: customer?.zoneId,
          zoneCoordinates,
          gouvernorat: customer?.gouvernorat,
          statusColor: deliveryStatusConfig.color,
          statusLabel: deliveryStatusConfig.label,
          statusIcon: deliveryStatusConfig.icon
        } as IDeliveryWithDetails;
      });
      
      const progress = deliveries.length > 0 
        ? Math.round((deliveries.filter(d => d.status === DeliveryStatus.Delivered).length / deliveries.length) * 100) 
        : 0;
      
      return {
        ...trip,
        truck,
        driver,
        deliveries,
        startZone,
        endZone: startZone,
        startZoneName: startZone?.name,
        endZoneName: startZone?.name,
        startCoordinates: startZone ? { lat: startZone.latitude, lng: startZone.longitude } : undefined,
        endCoordinates: startZone ? { lat: startZone.latitude, lng: startZone.longitude } : undefined,
        statusColor: statusConfig.color,
        statusLabel: statusConfig.label,
        statusIcon: statusConfig.icon,
        progress
      } as ITripWithDetails;
    });
  }
  
  getZoneDeliveryStats(trips: ITripWithDetails[]): IZoneDeliveryStats[] {
    const statsMap = new Map<number, IZoneDeliveryStats>();
    
    TUNISIA_ZONES.forEach(zone => {
      statsMap.set(zone.id, {
        zoneId: zone.id,
        zoneName: zone.name,
        total: 0,
        planned: 0,
        pending: 0,
        inProgress: 0,
        delivered: 0,
        failed: 0,
        cancelled: 0
      });
    });
    
    trips.forEach(trip => {
      trip.deliveries?.forEach(delivery => {
        if (delivery.zoneName && delivery.zoneName !== 'Non assigné') {
          const zone = this.zoneByName.get(delivery.zoneName.toLowerCase());
          if (zone) {
            const stats = statsMap.get(zone.id);
            if (stats) {
              stats.total++;
              
              if (trip.tripStatus === TripStatus.Planned) {
                stats.planned++;
              }
              
              switch (delivery.status) {
                case DeliveryStatus.Pending: stats.pending++; break;
                case DeliveryStatus.EnRoute: 
                case DeliveryStatus.Arrived: stats.inProgress++; break;
                case DeliveryStatus.Delivered: stats.delivered++; break;
                case DeliveryStatus.Failed: stats.failed++; break;
                case DeliveryStatus.Cancelled: stats.cancelled++; break;
              }
            }
          }
        }
      });
    });
    
    return Array.from(statsMap.values()).filter(s => s.total > 0);
  }
}