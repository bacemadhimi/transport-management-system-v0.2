import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { 
  TripStatistics, 
  StatisticsFilter, 
  Truck, 
  Driver,
  PieChartData
} from '../types/pie-chart-data.model';
import { IDriver } from '../types/driver';
import { ITruck } from '../types/truck';

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {
  private baseUrl = environment.apiUrl + '/api/statistics';

  constructor(private http: HttpClient) {}

  getTripStatistics(filter: StatisticsFilter): Observable<TripStatistics> {
    const params = this.buildQueryParams(filter);
    
    return this.http.get<TripStatistics>(`${this.baseUrl}/trip-statistics`, { params }).pipe(
      catchError(error => {
        console.error('Error fetching trip statistics:', error);
        // Return fallback data if API fails
        return of(this.getFallbackStatistics(filter));
      })
    );
  }

  getTripStatusDistribution(filter: StatisticsFilter): Observable<PieChartData[]> {
    const params = this.buildQueryParams(filter);
    
    return this.http.get<PieChartData[]>(`${this.baseUrl}/trip-status-distribution`, { params }).pipe(
      catchError(error => {
        console.error('Error fetching trip status distribution:', error);
        return of(this.getFallbackStatusDistribution());
      })
    );
  }

  getTruckUtilization(filter: StatisticsFilter): Observable<PieChartData[]> {
    const params = this.buildQueryParams(filter);
    
    return this.http.get<PieChartData[]>(`${this.baseUrl}/truck-utilization`, { params }).pipe(
      catchError(error => {
        console.error('Error fetching truck utilization:', error);
        return of(this.getFallbackTruckUtilization(filter));
      })
    );
  }

  getOrdersByType(filter: StatisticsFilter): Observable<PieChartData[]> {
    const params = this.buildQueryParams(filter);
    
    return this.http.get<PieChartData[]>(`${this.baseUrl}/orders-by-type`, { params }).pipe(
      catchError(error => {
        console.error('Error fetching orders by type:', error);
        return of(this.getFallbackOrdersByType());
      })
    );
  }

  // Alternative: Get all statistics at once
  getAllStatistics(filter: StatisticsFilter): Observable<{
    statusDistribution: PieChartData[];
    truckUtilization: PieChartData[];
    deliveryByType: PieChartData[];
  }> {
    return this.http.get<TripStatistics>(`${this.baseUrl}/trip-statistics`, { 
      params: this.buildQueryParams(filter) 
    }).pipe(
      map(response => ({
        statusDistribution: response.statusDistribution || [],
        truckUtilization: response.truckUtilization || [],
        deliveryByType: response.deliveryByType || []
      })),
      catchError(error => {
        console.error('Error fetching all statistics:', error);
        return of({
          statusDistribution: this.getFallbackStatusDistribution(),
          truckUtilization: this.getFallbackTruckUtilization(filter),
          deliveryByType: this.getFallbackOrdersByType()
        });
      })
    );
  }

  getTrucks(): Observable<ITruck[]> {
    return this.http.get<ITruck[]>(environment.apiUrl + '/api/Trucks/list').pipe(
      catchError(error => {
        console.error('Error fetching trucks:', error);
        return of([]);
      })
    );
  }

  getDrivers(): Observable<IDriver[]> {
    return this.http.get<IDriver[]>(environment.apiUrl + '/api/Driver/ListOfDrivers').pipe(
      catchError(error => {
        console.error('Error fetching drivers:', error);
        return of([]);
      })
    );
  }

  getAvailableTrucks(): Observable<ITruck[]> {
    return this.http.get<ITruck[]>(environment.apiUrl + '/api/Trucks/available').pipe(
      catchError(error => {
        console.error('Error fetching available trucks:', error);
        return of([]);
      })
    );
  }

  getAvailableDrivers(): Observable<IDriver[]> {
    return this.http.get<IDriver[]>(environment.apiUrl + '/api/Driver/available').pipe(
      catchError(error => {
        console.error('Error fetching available drivers:', error);
        return of([]);
      })
    );
  }

  private buildQueryParams(filter: StatisticsFilter): HttpParams {
    let params = new HttpParams();
    
    if (filter.startDate) {
      // Format date as YYYY-MM-DD
      const dateStr = filter.startDate.toISOString().split('T')[0];
      params = params.set('startDate', dateStr);
    }
    if (filter.endDate) {
      const dateStr = filter.endDate.toISOString().split('T')[0];
      params = params.set('endDate', dateStr);
    }
    if (filter.truckId) {
      params = params.set('truckId', filter.truckId.toString());
    }
    if (filter.driverId) {
      params = params.set('driverId', filter.driverId.toString());
    }
    
    return params;
  }

  // Fallback data methods
  private getFallbackStatistics(filter: StatisticsFilter): TripStatistics {
    return {
      statusDistribution: this.getFallbackStatusDistribution(),
      truckUtilization: this.getFallbackTruckUtilization(filter),
      deliveryByType: this.getFallbackOrdersByType(),
      generatedAt: new Date()
    };
  }

private getFallbackStatusDistribution(): PieChartData[] {
  return [
    { label: 'Planned', value: 25, color: '#4e73df', count: 15 },
    { label: 'Accepted', value: 20, color: '#751cc8', count: 12 },
    { label: 'LoadingInProgress', value: 10, color: '#36b9cc', count: 6 },
    { label: 'DeliveryInProgress', value: 30, color: '#f6c23e', count: 18 },
    { label: 'Receipt', value: 12, color: '#20c9a6', count: 7 },  
    { label: 'Cancelled', value: 3, color: '#e74a3b', count: 2 }
  ];
}

  private getFallbackTruckUtilization(filter: StatisticsFilter): PieChartData[] {
    if (filter.truckId) {
      // If specific truck is selected
      return [
        { label: `Truck ${filter.truckId}`, value: 85, color: '#4e73df', count: 17 }
      ];
    }
    
    // General truck utilization
    return [
      { label: 'TRK-001 (Volvo)', value: 85, color: '#4e73df', count: 17 },
      { label: 'TRK-002 (Mercedes)', value: 90, color: '#1cc88a', count: 18 },
      { label: 'TRK-003 (Scania)', value: 75, color: '#36b9cc', count: 15 },
      { label: 'TRK-004 (MAN)', value: 80, color: '#f6c23e', count: 16 },
      { label: 'TRK-005 (Iveco)', value: 70, color: '#e74a3b', count: 14 }
    ];
  }

  private getFallbackOrdersByType(): PieChartData[] {
    return [
      { label: 'General Cargo', value: 40, color: '#4e73df', count: 32 },
      { label: 'Refrigerated', value: 25, color: '#1cc88a', count: 20 },
      { label: 'Hazardous', value: 15, color: '#f6c23e', count: 12 },
      { label: 'Oversized', value: 12, color: '#36b9cc', count: 10 },
      { label: 'Express', value: 8, color: '#e74a3b', count: 6 }
    ];
  }
}