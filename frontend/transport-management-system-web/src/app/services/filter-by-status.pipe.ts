import { Pipe, PipeTransform } from '@angular/core';
import { IOrder, OrderStatus } from '../types/order';

@Pipe({
  name: 'filterByStatus',
  standalone: true
})
export class FilterByStatusPipe implements PipeTransform {
  transform(orders: IOrder[], status: OrderStatus): IOrder[] {
    if (!orders || !status) return [];
    return orders.filter(order => order.status === status);
  }
}