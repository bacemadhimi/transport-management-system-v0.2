

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, BehaviorSubject, tap, catchError, of } from 'rxjs';
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


  private orderSettingsSubject = new BehaviorSubject<IOrderSettings | null>(null);
  private tripSettingsSubject = new BehaviorSubject<ITripSettings | null>(null);


  orderSettings$ = this.orderSettingsSubject.asObservable();
  tripSettings$ = this.tripSettingsSubject.asObservable();

  constructor(private http: HttpClient) {

    this.loadAllSettings();
  }


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
    return this.http.get<IGeneralSettings[]>(`${this.apiUrl}/type/${parameterType}`);
  }


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

    const settingsMap = new Map<string, string>();

    settings.forEach(setting => {
      const [key, value] = this.parseParameterCode(setting.parameterCode);
      settingsMap.set(key, value);
    });

    console.log('Order settings map:', settingsMap);

    return {
      allowEditOrder: this.getBooleanValue(settingsMap, 'ALLOW_EDIT_ORDER', true),
      allowEditDeliveryDate: this.getBooleanValue(settingsMap, 'ALLOW_DELIVERY_DATE_EDIT', true),
      allowLoadLateOrders: this.getBooleanValue(settingsMap, 'ALLOW_LOAD_LATE_ORDERS', true),
      acceptOrdersWithoutAddress: this.getBooleanValue(settingsMap, 'ACCEPT_ORDERS_WITHOUT_ADDRESS', true),
      planningHorizon: this.getNumberValue(settingsMap, 'PLANNING_HORIZON', 30),
      loadingUnit: this.getStringValue(settingsMap, 'LOADING_UNIT', 'palette'),
      allowMixingOrderTypes: this.getBooleanValue(settingsMap, 'ALLOW_MIXING_ORDER_TYPES', false)
    };
  }



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

    const settingsMap = new Map<string, string>();

    settings.forEach(setting => {
      const [key, value] = this.parseParameterCode(setting.parameterCode);
      settingsMap.set(key, value);
    });

    return {
      allowEditTrips: this.getBooleanValue(settingsMap, 'ALLOW_EDIT_TRIPS', true),
      allowDeleteTrips: this.getBooleanValue(settingsMap, 'ALLOW_DELETE_TRIPS', true),
      editTimeLimit: this.getNumberValue(settingsMap, 'EDIT_TIME_LIMIT', 60),
      maxTripsPerDay: this.getNumberValue(settingsMap, 'MAX_TRIPS_PER_DAY', 10),
      tripOrder: this.getTripOrderValue(settingsMap, 'TRIP_ORDER', 'chronological'),
      requireDeleteConfirmation: this.getBooleanValue(settingsMap, 'REQUIRE_DELETE_CONFIRMATION', true),
      notifyOnTripEdit: this.getBooleanValue(settingsMap, 'NOTIFY_ON_TRIP_EDIT', false),
      notifyOnTripDelete: this.getBooleanValue(settingsMap, 'NOTIFY_ON_TRIP_DELETE', false),
      linkDriverToTruck: this.getBooleanValue(settingsMap, 'LINK_DRIVER_TO_TRUCK', true),
       useGpsInTrips: this.getBooleanValue(settingsMap, 'USE_GPS_IN_TRIPS', true), // ✅ True by default
       tripAddressMode: this.getStringValue(settingsMap, 'MODE_ADRESSE_TRIP', 'MANUEL') as 'MANUEL' | 'AUTOMATIQUE'
    };
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




  private parseParameterCode(parameterCode: string): [string, string] {
    const parts = parameterCode.split('=');
    if (parts.length === 2) {
      return [parts[0], parts[1]];
    }

    return [parameterCode, parameterCode];
  }

  private getBooleanValue(map: Map<string, string>, key: string, defaultValue: boolean): boolean {
    const value = map.get(key);
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true';
  }

  private getNumberValue(map: Map<string, string>, key: string, defaultValue: number): number {
    const value = map.get(key);
    if (value === undefined) return defaultValue;
    const num = parseInt(value, 10);
    return isNaN(num) ? defaultValue : num;
  }

  private getStringValue(map: Map<string, string>, key: string, defaultValue: string): string {
    return map.get(key) || defaultValue;
  }

  private getTripOrderValue(map: Map<string, string>, key: string, defaultValue: TripOrderType): TripOrderType {
    const value = map.get(key);
    if (value === 'chronological' || value === 'priority' || value === 'geographical' || value === 'optimized') {
      return value as TripOrderType;
    }
    return defaultValue;
  }


  refreshSettings(): void {
    this.loadAllSettings();
  }


  saveOrderSettings(settings: IOrderSettings): Observable<any> {
    const updates: IGeneralSettingsDto[] = Object.entries(settings).map(([key, value]) => {

      const paramCode = this.camelToUpper(key);
      return {
        parameterType: ParameterType.ORDER,
        parameterCode: this.formatParameterCode(paramCode, value),
        description: this.getDescriptionForKey(key)
      };
    });

    return this.http.post(`${this.apiUrl}/bulk`, updates);
  }


  saveTripSettings(settings: ITripSettings): Observable<any> {
    const updates: IGeneralSettingsDto[] = Object.entries(settings).map(([key, value]) => {

      const paramCode = this.camelToUpper(key);
      return {
        parameterType: ParameterType.TRIP,
        parameterCode: this.formatParameterCode(paramCode, value),
        description: this.getDescriptionForKey(key)
      };
    });

    return this.http.post(`${this.apiUrl}/bulk`, updates);
  }

  private formatParameterCode(key: string, value: any): string {
    const stringValue = typeof value === 'boolean' ? value.toString() : value.toString();
    return `${key}=${stringValue}`;
  }

  private camelToUpper(camel: string): string {
    return camel.replace(/([A-Z])/g, '_$1').toUpperCase();
  }

  private getDescriptionForKey(key: string): string {
    const descriptions: { [key: string]: string } = {
      'allowEditOrder': 'Allow editing orders',
      'allowEditDeliveryDate': 'Allow editing delivery date',
      'allowLoadLateOrders': 'Allow loading late orders',
      'acceptOrdersWithoutAddress': 'Accept orders without address',
      'loadingUnit': 'Default loading unit',
      'planningHorizon': 'Planning horizon in days',
      'allowEditTrips': 'Allow editing trips',
      'allowDeleteTrips': 'Allow deleting trips',
      'editTimeLimit': 'Edit limit in minutes',
      'maxTripsPerDay': 'Maximum trips per day',
      'tripOrder': 'Trip ordering method',
      'requireDeleteConfirmation': 'Require delete confirmation',
      'notifyOnTripEdit': 'Notify when trip edited',
      'notifyOnTripDelete': 'Notify when trip deleted',
      'linkDriverToTruck': 'Driver must match truck'
    };
    return descriptions[key] || key;
  }
}