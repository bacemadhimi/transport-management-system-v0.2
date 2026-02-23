// services/settings.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, BehaviorSubject, tap, catchError, of } from 'rxjs'; // ADD BehaviorSubject
import { 
  IGeneralSettings, 
  IGeneralSettingsDto, 
  IOrderSettings, 
  ITripSettings, 
  ParameterType,
  SearchOptions, 
  TripOrderType
} from '../types/general-settings';
import { environment } from '../../environments/environment.development';
import { PagedData } from '../types/paged-data';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private apiUrl = `${environment.apiUrl}/api/GeneralSettings`;

  // ADD these BehaviorSubjects
  private orderSettingsSubject = new BehaviorSubject<IOrderSettings | null>(null);
  private tripSettingsSubject = new BehaviorSubject<ITripSettings | null>(null);
  
  // ADD these observables
  orderSettings$ = this.orderSettingsSubject.asObservable();
  tripSettings$ = this.tripSettingsSubject.asObservable();

  constructor(private http: HttpClient) {
    // Optional: Load settings on service initialization
    this.loadAllSettings();
  }

  // ADD this method to load all settings
  private loadAllSettings(): void {
    this.getOrderSettings().subscribe({
      next: (settings) => this.orderSettingsSubject.next(settings),
      error: (err) => console.error('Error loading order settings:', err)
    });
    
    this.getTripSettings().subscribe({
      next: (settings) => this.tripSettingsSubject.next(settings),
      error: (err) => console.error('Error loading trip settings:', err)
    });
  }
getSettingsByType(parameterType: ParameterType): Observable<IGeneralSettings[]> {
  return this.http.get<IGeneralSettings[]>(`${this.apiUrl}/by-type/${parameterType}`);
}
  // ========== CRUD Operations ==========
  getSettings(options: SearchOptions): Observable<PagedData<IGeneralSettings>> {
    const params: any = {
      pageIndex: options.pageIndex,
      pageSize: options.pageSize
    };
    
    if (options.search) params.search = options.search;
    if (options.parameterType) params.parameterType = options.parameterType;
    
    return this.http.get<PagedData<IGeneralSettings>>(this.apiUrl, { params });
  }

  getSetting(id: number): Observable<IGeneralSettings> {
    return this.http.get<IGeneralSettings>(`${this.apiUrl}/${id}`);
  }

  addSetting(setting: IGeneralSettingsDto): Observable<IGeneralSettings> {
    return this.http.post<IGeneralSettings>(this.apiUrl, setting);
  }

  updateSetting(id: number, setting: IGeneralSettingsDto): Observable<IGeneralSettings> {
    return this.http.put<IGeneralSettings>(`${this.apiUrl}/${id}`, setting);
  }

  deleteSetting(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // ========== ORDER Settings Methods ==========

getOrderSettings(): Observable<IOrderSettings> {
  return this.getSettingsByType(ParameterType.ORDER).pipe(
    tap(settings => console.log('Raw ORDER settings from API:', settings)),
    map(settings => {
      const orderSettings = this.mapToOrderSettings(settings);
      this.orderSettingsSubject.next(orderSettings);
      return orderSettings;
    })
  );
}
  private mapToOrderSettings(settings: IGeneralSettings[]): IOrderSettings {
    const settingsMap = new Map(settings.map(s => [s.parameterCode, s.value]));
    console.log(settingsMap)
    return {
      allowEditOrder: this.getBooleanValue(settingsMap, 'ALLOW_EDIT_ORDER', true),
      allowEditDeliveryDate: this.getBooleanValue(settingsMap, 'ALLOW_DELIVERY_DATE_EDIT', true),
      allowLoadLateOrders: this.getBooleanValue(settingsMap, 'ALLOW_LOAD_LATE_ORDERS', true),
      acceptOrdersWithoutAddress: this.getBooleanValue(settingsMap, 'ACCEPT_ORDERS_WITHOUT_ADDRESS', true),
      planningHorizon: this.getNumberValue(settingsMap, 'PLANNING_HORIZON', 30),
      loadingUnit: this.getStringValue(settingsMap, 'LOADING_UNIT', 'palette')
    };
  }

  // ========== TRIP Settings Methods ==========

  getTripSettings(): Observable<ITripSettings> {
  return this.getSettingsByType(ParameterType.TRIP).pipe(
    tap(settings => console.log('Raw TRIP settings from API:', settings)),
    map(settings => {
      const tripSettings = this.mapToTripSettings(settings);
      this.tripSettingsSubject.next(tripSettings);
      return tripSettings;
    })
  );
}

  private mapToTripSettings(settings: IGeneralSettings[]): ITripSettings {
    const settingsMap = new Map(settings.map(s => [s.parameterCode, s.value]));
    
    return {
      allowEditTrips: this.getBooleanValue(settingsMap, 'ALLOW_EDIT_TRIPS', true),
      allowDeleteTrips: this.getBooleanValue(settingsMap, 'ALLOW_DELETE_TRIPS', true),
      editTimeLimit: this.getNumberValue(settingsMap, 'EDIT_TIME_LIMIT', 60),
      maxTripsPerDay: this.getNumberValue(settingsMap, 'MAX_TRIPS_PER_DAY', 10),
      tripOrder: this.getTripOrderValue(settingsMap, 'TRIP_ORDER', 'chronological'),
      requireDeleteConfirmation: this.getBooleanValue(settingsMap, 'REQUIRE_DELETE_CONFIRMATION', true),
      notifyOnTripEdit: this.getBooleanValue(settingsMap, 'NOTIFY_ON_TRIP_EDIT', false),
      notifyOnTripDelete: this.getBooleanValue(settingsMap, 'NOTIFY_ON_TRIP_DELETE', false),
      linkDriverToTruck: this.getBooleanValue(settingsMap, 'LINK_DRIVER_TO_TRUCK', true)
    };
  }

  // ========== GOVERNORATE Methods ==========

  getGovernorates(): Observable<IGeneralSettings[]> {
    const options: SearchOptions = {
      pageIndex: 0,
      pageSize: 100,
      parameterType: ParameterType.GOVERNORATE
    };
    
    return this.getSettings(options).pipe(
      map(response => response.data || [])
    );
  }

  private getBooleanValue(map: Map<string, string>, key: string, defaultValue: boolean): boolean {
    const value = map.get(key);
    return value ? value.toLowerCase() === 'true' : defaultValue;
  }

  private getNumberValue(map: Map<string, string>, key: string, defaultValue: number): number {
    const value = map.get(key);
    return value ? parseInt(value, 10) : defaultValue;
  }

  private getStringValue(map: Map<string, string>, key: string, defaultValue: string): string {
    return map.get(key) || defaultValue;
  }

  private getTripOrderValue(map: Map<string, string>, key: string, defaultValue: TripOrderType): TripOrderType {
    const value = map.get(key);
    if (value === 'chronological' || value === 'alphabetical' || value === 'custom') {
      return value;
    }
    return defaultValue;
  }

  // Optional: Method to refresh settings
  refreshSettings(): void {
    this.loadAllSettings();
  }

getEmployeeCategories(): Observable<IGeneralSettings[]> {
  console.log('🔍 Fetching employee categories from:', `${this.apiUrl}/type/EMPLOYEE_CATEGORY`);
  
  return this.http.get<IGeneralSettings[]>(`${this.apiUrl}/type/EMPLOYEE_CATEGORY`).pipe(
    tap(categories => console.log('📦 Employee categories response:', categories)),
    catchError(error => {
      console.error('❌ Error fetching employee categories:', error);
      return of([]); 
    })
  );
}
}