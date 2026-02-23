// types/general-settings.types.ts

export enum ParameterType {
  GOVERNORATE = 'GOVERNORATE',
  REGION = 'REGION',
  ZONE = 'ZONE',
  EMPLOYEE_CATEGORY = 'EMPLOYEE_CATEGORY',
  ORDER = 'ORDER',
  TRIP = 'TRIP'
}
export type TripOrderType = 'chronological' | 'alphabetical' | 'custom';
export interface IGeneralSettings {
  id: number;
  parameterType: ParameterType;
  parameterCode: string;
  value: string;
  description: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IGeneralSettingsDto {
  id?: number;
  parameterType: ParameterType;
  parameterCode: string;
  value?: string;
  description: string;
}

export interface SearchOptions {
  pageIndex: number;
  pageSize: number;
  search?: string;
  parameterType?: string;
}

// Order specific settings interface
export interface IOrderSettings {
  allowEditOrder: boolean;
  allowEditDeliveryDate: boolean;
  allowLoadLateOrders: boolean;
  acceptOrdersWithoutAddress: boolean;
  planningHorizon: number;
  loadingUnit: string;
}

// Trip specific settings interface
export interface ITripSettings {
  allowEditTrips: boolean;
  allowDeleteTrips: boolean;
  editTimeLimit: number;
  maxTripsPerDay: number;
  tripOrder: string;
  requireDeleteConfirmation: boolean;
  notifyOnTripEdit: boolean;
  notifyOnTripDelete: boolean;
  linkDriverToTruck: boolean;
}

// Settings mapping keys
export const ORDER_SETTING_KEYS = {
  ALLOW_EDIT_ORDER: 'ALLOW_EDIT_ORDER',
  ALLOW_DELIVERY_DATE_EDIT: 'ALLOW_DELIVERY_DATE_EDIT',
  ALLOW_LOAD_LATE_ORDERS: 'ALLOW_LOAD_LATE_ORDERS',
  ACCEPT_ORDERS_WITHOUT_ADDRESS: 'ACCEPT_ORDERS_WITHOUT_ADDRESS',
  PLANNING_HORIZON: 'PLANNING_HORIZON',
  LOADING_UNIT: 'LOADING_UNIT'
} as const;

export const TRIP_SETTING_KEYS = {
  ALLOW_EDIT_TRIPS: 'ALLOW_EDIT_TRIPS',
  ALLOW_DELETE_TRIPS: 'ALLOW_DELETE_TRIPS',
  EDIT_TIME_LIMIT: 'EDIT_TIME_LIMIT',
  MAX_TRIPS_PER_DAY: 'MAX_TRIPS_PER_DAY',
  TRIP_ORDER: 'TRIP_ORDER',
  REQUIRE_DELETE_CONFIRMATION: 'REQUIRE_DELETE_CONFIRMATION',
  NOTIFY_ON_TRIP_EDIT: 'NOTIFY_ON_TRIP_EDIT',
  NOTIFY_ON_TRIP_DELETE: 'NOTIFY_ON_TRIP_DELETE',
  LINK_DRIVER_TO_TRUCK: 'LINK_DRIVER_TO_TRUCK'
} as const;