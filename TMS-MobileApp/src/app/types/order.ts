import { ICustomer } from "./customer";

export interface IOrder {
  id: number;
  customerId: number;
  customerName: string;
  customerMatricule: string;
  reference: string;
  type: string;
  weight: number;
  status: OrderStatus;
  createdDate: Date;
  deliveryAddress?: string;
  notes?: string;
  priority: number;
  hasDelivery?: boolean;
  customer?: ICustomer;
  sourceSystem?: string;
}
export interface CreateOrderDto {
  customerId: number;
  reference?: string;
  type: string;
  weight: number;
  deliveryAddress?: string;
  notes?: string;
  priority: number;
  status?: OrderStatus;
}

export interface UpdateOrderDto {
  customerId?: number;
  type?: string;
  weight?: number;
  status?: OrderStatus;
  deliveryAddress?: string;
  notes?: string;
  priority?: number;

}

export enum OrderStatus {
  Pending = 'pending',
  InProgress = 'inProgress',
  Delivered = 'delivered',
  Cancelled = 'cancelled'
}
export function getOrderStatusText(status: OrderStatus): string {
  switch (status) {
    case OrderStatus.Pending:
      return 'En attente';
    case OrderStatus.InProgress:
      return 'En cours';
    case OrderStatus.Delivered:
      return 'Terminée';
    case OrderStatus.Cancelled:
      return 'Annulée';
    default:
      return String(status); // Fallback to string representation
  }
}

// Helper function to get status CSS class
export function getOrderStatusClass(status: OrderStatus): string {
  switch (status) {
    case OrderStatus.Pending:
      return 'status-pending';
    case OrderStatus.InProgress:
      return 'status-in-progress';
    case OrderStatus.Delivered:
      return 'status-completed';
    case OrderStatus.Cancelled:
      return 'status-cancelled';
    default:
      return '';
  }
}