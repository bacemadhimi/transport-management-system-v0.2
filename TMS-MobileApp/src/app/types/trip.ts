// types/trip.ts

import { IConvoyeur } from "./convoyeur";
import { ICustomer } from "./customer";
import { IDriver } from "./driver";
import { IOrder } from "./order";
import { ITraject } from "./traject";
import { ITruck } from "./truck";

export interface ITrip {
  id: number;
  bookingId: string;
  tripReference: string;
  estimatedDistance: number;
  estimatedDuration: number;
  estimatedStartDate: string;
  estimatedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  truckId: number;
  driverId: number;
  tripStatus: TripStatus;
  trajectId?: number| null;
  traject?: ITraject;
  
  truck?: ITruck;
  driver?: IDriver;
  deliveries?: IDelivery[];
  startLocationId?: number;
  endLocationId?: number;
  updating?: boolean;
  convoyeurId?: number | null;
  convoyeur?: IConvoyeur;
  message?: string;

  createdBy: number;
  createdByName: string;
  createdAt: string;

  updatedBy?: number | null;
  updatedByName?: string;
  updatedAt?: string | null;
}

export interface IDelivery {
  id: number;
  tripId: number;
  customerId: number;
  orderId: number;
  deliveryAddress: string;
  sequence: number;
  plannedTime?: string;
  actualArrivalTime?: string;
  actualDepartureTime?: string;
  status: DeliveryStatus;
  notes?: string;
  proofOfDelivery?: string;

 
  customer?: ICustomer;
  order?: IOrder;
}

export enum TripStatus {
  Planned = 'Planned',
  Accepted = 'Accepted',
  LoadingInProgress = 'LoadingInProgress',
  DeliveryInProgress = 'DeliveryInProgress',
  Receipt = 'Receipt',
  Cancelled = 'Cancelled'
}

export enum DeliveryStatus {
  Pending = 'Pending',
  EnRoute = 'EnRoute',
  Arrived = 'Arrived',
  Delivered = 'Delivered',
  Failed = 'Failed',
  Cancelled = 'Cancelled'
}

export const TripStatusOptions = [
  { value: TripStatus.Planned, label: 'Planifié' },
  { value: TripStatus.Accepted, label: 'Accepté' },
  { value: TripStatus.LoadingInProgress, label: 'En cours de chargement' },
  { value: TripStatus.DeliveryInProgress, label: 'En cours de livraison' },
  { value: TripStatus.Receipt, label: 'Réception' },
  { value: TripStatus.Cancelled, label: 'Annulé' }
];

export const DeliveryStatusOptions = [
  { value: DeliveryStatus.Pending, label: 'En attente' },
  { value: DeliveryStatus.EnRoute, label: 'En route' },
  { value: DeliveryStatus.Arrived, label: 'Arrivé' },
  { value: DeliveryStatus.Delivered, label: 'Livré' },
  { value: DeliveryStatus.Failed, label: 'Échoué' },
  { value: DeliveryStatus.Cancelled, label: 'Annulé' }
];

export interface CreateTripDto {
  tripReference?: string;
  estimatedDistance: number;
  estimatedDuration: number;
  estimatedStartDate: string;
  estimatedEndDate: string;
  truckId: number;
  driverId: number;
  deliveries: CreateDeliveryDto[];
  trajectId?: number | null;
  convoyeurId?: number | null;

}

export interface UpdateTripDto {
  tripReference?: string;
  estimatedDistance: number;
  estimatedDuration: number;
  estimatedStartDate: string;
  estimatedEndDate: string;
  truckId: number;
  driverId: number;
  tripStatus: TripStatus;
  deliveries: CreateDeliveryDto[];
  trajectId?: number | null;
  convoyeurId?: number | null;
}

export interface CreateDeliveryDto {
  customerId: number;
  orderId: number;
  deliveryAddress: string;
  sequence: number;
  plannedTime?: string | null;
  notes?: string | null;
}