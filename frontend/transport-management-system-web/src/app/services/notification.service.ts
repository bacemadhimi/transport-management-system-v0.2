
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TripNotification } from './signalr.service';

export interface NotificationFilter {
  isRead?: boolean;
  type?: string;
  fromDate?: Date;
  toDate?: Date;
  tripId?: number;
  pageIndex?: number;
  pageSize?: number;
}

export interface NotificationResponse {
  success: boolean;
  message: string;
  data: {
    notifications: TripNotification[];
    unreadCount: number;
    totalCount: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/notifications`;

  constructor() { }

  getNotifications(filter?: NotificationFilter): Observable<NotificationResponse> {
    let params: any = {};
    if (filter) {
      if (filter.isRead !== undefined) params.isRead = filter.isRead;
      if (filter.type) params.type = filter.type;
      if (filter.fromDate) params.fromDate = filter.fromDate.toISOString();
      if (filter.toDate) params.toDate = filter.toDate.toISOString();
      if (filter.tripId) params.tripId = filter.tripId;
      if (filter.pageIndex !== undefined) params.pageIndex = filter.pageIndex;
      if (filter.pageSize !== undefined) params.pageSize = filter.pageSize;
    }
    return this.http.get<NotificationResponse>(this.apiUrl, { params });
  }

  getUnreadCount(): Observable<{ success: boolean; data: { unreadCount: number } }> {
    return this.http.get<{ success: boolean; data: { unreadCount: number } }>(`${this.apiUrl}/unread-count`);
  }

  markAsRead(notificationId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${notificationId}/read`, {});
  }

  markAllAsRead(): Observable<any> {
    return this.http.put(`${this.apiUrl}/mark-all-read`, {});
  }
  // In your notification.service.ts
deleteAllNotifications(): Observable<any> {
  return this.http.delete(`${this.apiUrl}/delete-all`);
}
}