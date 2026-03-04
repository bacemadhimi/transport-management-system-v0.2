import { ICustomer } from "./customer";

export interface IOrder {
  id: number;
  customerId: number;
  customerName: string;
  customerMatricule: string;
  customerCity?: string;
  reference: string;
  type: string;
  weight: number;
   weightUnit: string;
  status: OrderStatus;
  createdDate: Date;
   deliveryDate?: Date | string;
  deliveryAddress?: string;
  notes?: string;

  hasDelivery?: boolean;
  customer?: ICustomer;
  sourceSystem?: string;
  zoneId?: number;
  zoneName?: string;
}
export interface CreateOrderDto {
  customerId?: number;
  reference?: string;
  weight?: number;
  weightUnit: string;

  deliveryAddress?: string;
  notes?: string;
    customerCity?: string;
      deliveryDate?: string;
}

export interface UpdateOrderDto {
  customerId?: number;
  reference?: string;
  weight?: number;
  weightUnit: string;
  status?: OrderStatus;
  deliveryAddress?: string;
  notes?: string;

}

export enum OrderStatus {
  Pending = 'pending',
  ReadyToLoad = 'readyToLoad',
  InProgress = 'inProgress',
  Received = 'received',
  Closed = 'closed',
  Cancelled = 'cancelled'
}

export function getOrderStatusText(status: OrderStatus): string {
  switch (status) {
    case OrderStatus.Pending:
      return 'En attente';
    case OrderStatus.ReadyToLoad:
      return 'À charger';
    case OrderStatus.InProgress:
      return 'En cours de livraison';
    case OrderStatus.Received:
      return 'Réception';
    case OrderStatus.Closed:
      return 'Clôturée';
    case OrderStatus.Cancelled:
      return 'Annulée';
    default:
      return String(status);
  }
}



export function getOrderStatusClass(status: OrderStatus): string {
  switch (status) {
    case OrderStatus.Pending:
      return 'status-pending';
    case OrderStatus.ReadyToLoad:
      return 'status-ready';
    case OrderStatus.InProgress:
      return 'status-in-progress';
    case OrderStatus.Received:
      return 'status-received';
    case OrderStatus.Closed:
      return 'status-closed';
    case OrderStatus.Cancelled:
      return 'status-cancelled';
    default:
      return '';
  }


}