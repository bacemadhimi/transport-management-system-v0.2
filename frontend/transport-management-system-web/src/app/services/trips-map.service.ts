import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, forkJoin, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { ITrip, IDelivery, TripStatus, DeliveryStatus } from '../types/trip';
import { ITruck } from '../types/truck';
import { IDriver } from '../types/driver';
import { ICustomer } from '../types/customer';
import { IGeographicalEntity } from '../types/general-settings';

export interface ITripWithDetails extends ITrip {
  truck?: ITruck;
  driver?: IDriver;
  deliveries?: IDeliveryWithDetails[];
  statusColor?: string;
  progress?: number;
  statusLabel?: string;
  statusIcon?: string;
  startEntity?: IGeographicalEntity;
  endEntity?: IGeographicalEntity;
  startEntityName?: string;
  endEntityName?: string;
  startCoordinates?: { lat: number; lng: number };
  endCoordinates?: { lat: number; lng: number };
}

export interface IDeliveryWithDetails extends IDelivery {
  customer?: ICustomer;
  entityName?: string;
  entityId?: number;
  entityCoordinates?: { lat: number; lng: number };
  statusColor?: string;
  statusLabel?: string;
  statusIcon?: string;
  levelName?: string;
  levelNumber?: number;
}

export interface IEntityDeliveryStats {
  entityId: number;
  entityName: string;
  levelName: string;
  levelNumber: number;
  total: number;
  planned: number;
  pending: number;
  inProgress: number;
  delivered: number;
  failed: number;
  cancelled: number;
  latitude?: number;
  longitude?: number;
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

  private entityById: Map<number, IGeographicalEntity> = new Map();
  private levelsByEntityId: Map<number, { name: string; number: number }> = new Map();

  /**
   * Récupère les tournées avec tous les détails
   */
  getTripsWithDetails(
    status?: string,
    entityName?: string,
    startDate?: string,
    endDate?: string
  ): Observable<ITripWithDetails[]> {
    console.log('🌐 Chargement des données...');
    
    return forkJoin({
      trips: this.getTripsFromApi(status, startDate, endDate),
      trucks: this.getTrucksFromApi(),
      drivers: this.getDriversFromApi(),
      customers: this.getCustomersFromApi(),
      geographicalEntities: this.getGeographicalEntitiesFromApi()
    }).pipe(
      map(({ trips, trucks, drivers, customers, geographicalEntities }) => {
        console.log(`🔍 Enrichissement de ${trips.length} tournées...`);
        
        // Build entity map
        geographicalEntities.forEach(entity => {
          if (entity.id) {
            this.entityById.set(entity.id, entity);
            // Store level info if available
            if (entity.level) {
              this.levelsByEntityId.set(entity.id, {
                name: entity.level.name,
                number: entity.level.levelNumber
              });
            }
          }
        });
        
        let enrichedTrips = this.enrichTrips(trips, trucks, drivers, customers, geographicalEntities);
        
        // Filter by entity name if provided
        if (entityName && entityName !== 'all') {
          enrichedTrips = enrichedTrips.filter(trip => 
            trip.deliveries?.some(d => d.entityName === entityName)
          );
        }
        
        return enrichedTrips;
      }),
      catchError(error => {
        console.error('Erreur chargement données:', error);
        return of([]);
      })
    );
  }

  private getTripsFromApi(
    status?: string,
    startDate?: string,
    endDate?: string
  ): Observable<ITrip[]> {
    let params = new HttpParams();
    
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (status && status !== 'all') params = params.set('status', status);

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

  private getGeographicalEntitiesFromApi(): Observable<IGeographicalEntity[]> {
    return this.http.get<IGeographicalEntity[]>(`${this.apiUrl}/api/GeographicalEntities`).pipe(
      catchError(() => of([]))
    );
  }

  private enrichTrips(
    trips: ITrip[], 
    trucks: ITruck[], 
    drivers: IDriver[], 
    customers: ICustomer[],
    geographicalEntities: IGeographicalEntity[]
  ): ITripWithDetails[] {
    const truckMap = new Map(trucks.map(t => [t.id, t]));
    const driverMap = new Map(drivers.map(d => [d.id, d]));
    const customerMap = new Map(customers.map(c => [c.id, c]));
    const entityMap = new Map(geographicalEntities.map(e => [e.id, e]));

    return trips.map(trip => {
      const truck = truckMap.get(trip.truckId);
      const driver = driverMap.get(trip.driverId);
      const statusConfig = TRIP_STATUS_CONFIG[trip.tripStatus as TripStatus] || TRIP_STATUS_CONFIG[TripStatus.Planned];
      
      // Get start entity from truck's geographical entities (first one)
      const startEntityId = truck?.geographicalEntities?.[0]?.id;
      const startEntity = startEntityId ? entityMap.get(startEntityId) : undefined;
      
      const deliveries = (trip.deliveries || []).map(delivery => {
        const customer = customerMap.get(delivery.customerId);
        
        let entityName = 'Non assigné';
        let entityCoordinates = null;
        let entityId: number | undefined;
        let levelName = '';
        let levelNumber = 0;
        
        // Get geographical entity from customer
        if (customer?.geographicalEntities && customer.geographicalEntities.length > 0) {
          const firstEntity = customer.geographicalEntities[0];
          entityId = firstEntity.geographicalEntityId;
          const entity = entityMap.get(entityId);
          if (entity) {
            entityName = entity.name;
            entityCoordinates = entity.latitude && entity.longitude 
              ? { lat: entity.latitude, lng: entity.longitude } 
              : undefined;
            
            // Get level info from entity
            if (entity.level) {
              levelName = entity.level.name;
              levelNumber = entity.level.levelNumber;
            }
          }
        }
        
        const deliveryStatusConfig = DELIVERY_STATUS_CONFIG[delivery.status as DeliveryStatus] || DELIVERY_STATUS_CONFIG[DeliveryStatus.Pending];
        
        return {
          ...delivery,
          customer,
          entityName,
          entityId,
          entityCoordinates,
          levelName,
          levelNumber,
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
        startEntity,
        endEntity: startEntity,
        startEntityName: startEntity?.name,
        endEntityName: startEntity?.name,
        startCoordinates: startEntity?.latitude && startEntity?.longitude 
          ? { lat: startEntity.latitude, lng: startEntity.longitude } 
          : undefined,
        endCoordinates: startEntity?.latitude && startEntity?.longitude 
          ? { lat: startEntity.latitude, lng: startEntity.longitude } 
          : undefined,
        statusColor: statusConfig.color,
        statusLabel: statusConfig.label,
        statusIcon: statusConfig.icon,
        progress
      } as ITripWithDetails;
    });
  }
  
  getEntityDeliveryStats(trips: ITripWithDetails[], geographicalEntities: IGeographicalEntity[]): IEntityDeliveryStats[] {
    const statsMap = new Map<number, IEntityDeliveryStats>();
    
    // Initialize stats for all geographical entities
    geographicalEntities.forEach(entity => {
      if (entity.id) {
        statsMap.set(entity.id, {
          entityId: entity.id,
          entityName: entity.name,
          levelName: entity.level?.name || 'Niveau inconnu',
          levelNumber: entity.level?.levelNumber || 0,
          total: 0,
          planned: 0,
          pending: 0,
          inProgress: 0,
          delivered: 0,
          failed: 0,
          cancelled: 0,
          latitude: entity.latitude,
          longitude: entity.longitude
        });
      }
    });
    
    // Calculate stats from deliveries
    trips.forEach(trip => {
      trip.deliveries?.forEach(delivery => {
        if (delivery.entityId) {
          const stats = statsMap.get(delivery.entityId);
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
      });
    });
    
    // Return only entities with deliveries
    return Array.from(statsMap.values()).filter(s => s.total > 0);
  }
}