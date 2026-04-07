

export enum ParameterType {
  ORDER = 'ORDER',
  TRIP = 'TRIP',
  EMPLOYEE_CATEGORY = 'EMPLOYEE_CATEGORY',
  TRUCK_TYPE = 'TRUCK_TYPE',
  TRUCK_BRAND = 'TRUCK_BRAND',
  TRUCK_STATUS = 'TRUCK_STATUS'
}

export interface IOrderSettings {
  allowEditOrder: boolean;
  allowEditDeliveryDate: boolean;
  allowLoadLateOrders: boolean;
  acceptOrdersWithoutAddress: boolean;
  planningHorizon: number;
  loadingUnit: string;
  allowMixingOrderTypes: boolean;
}

export interface ITripSettings {
  allowEditTrips: boolean;
  allowDeleteTrips: boolean;
  editTimeLimit: number;
  maxTripsPerDay: number;
  tripOrder: TripOrderType;
  requireDeleteConfirmation: boolean;
  notifyOnTripEdit: boolean;
  notifyOnTripDelete: boolean;
  linkDriverToTruck: boolean;
  useGpsInTrips: boolean; // ✅ GPS tracking setting
}

export type TripOrderType = 'chronological' | 'priority' | 'geographical' | 'optimized';

export interface IGeneralSettings {
  id: number;
  parameterType: string;
  parameterCode: string;
  description: string;
  logoBase64?: string| null;
}

export interface IGeneralSettingsDto {
  parameterType: string;
  parameterCode: string;
  description: string;
  logoBase64?: string;
}

export interface SearchOptions {
  pageIndex: number;
  pageSize: number;
  search?: string;
  parameterType?: string;
}

export interface PagedData<T> {
  data: T[];
  totalData: number;
  pageIndex: number;
  pageSize: number;
}


export interface IGeographicalLevel {
  id: number;
  name: string;
  levelNumber: number;
  isMappable: boolean;
  isActive: boolean;
}

export interface IGeographicalEntity {
  id: number;
  name: string;
  levelId: number;
  level?: IGeographicalLevel;
  parentId?: number;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}