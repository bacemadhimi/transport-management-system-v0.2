import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TripNotification {
  id: number;
  type: 'NEW_TRIP_ASSIGNMENT' | 'TRIP_UPDATE' | 'TRIP_CANCELLED';
  title: string;
  message: string;
  tripId: number;
  tripReference: string;
  driverId?: number;
  driverName?: string;
  truckImmatriculation?: string;
  destination?: string;
  customerName?: string;
  deliveriesCount?: number;
  estimatedDistance?: number;
  estimatedDuration?: number;
  estimatedStartDate?: string;
  estimatedEndDate?: string;
  timestamp: string;
  isRead: boolean;
  additionalData?: any;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationStorageService {
  private notificationsKey = 'tms_notifications';
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private notificationsSubject = new BehaviorSubject<TripNotification[]>([]);
  
  public unreadCount$ = this.unreadCountSubject.asObservable();
  public notifications$ = this.notificationsSubject.asObservable();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Add a new notification (avoid duplicates)
   */
  addNotification(notification: Omit<TripNotification, 'id' | 'isRead'>): TripNotification | null {
    const notifications = this.getAll();
    
    // Check for duplicate (same tripId and type)
    const exists = notifications.find(
      n => n.tripId === notification.tripId && n.type === notification.type
    );
    
    if (exists) {
      console.log('⚠️ Duplicate notification ignored for trip:', notification.tripId);
      return null; // Don't add duplicate
    }
    
    const newNotification: TripNotification = {
      ...notification,
      id: Date.now(), // Unique ID based on timestamp
      isRead: false
    };

    // Add to beginning of array (newest first)
    notifications.unshift(newNotification);
    
    // Keep only last 50 notifications
    if (notifications.length > 50) {
      notifications.pop();
    }

    this.saveToStorage(notifications);
    this.updateSubjects(notifications);
    
    console.log('💾 NEW Notification stored:', newNotification);
    return newNotification;
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: number): void {
    const notifications = this.getAll();
    const notification = notifications.find(n => n.id === notificationId);
    
    if (notification && !notification.isRead) {
      notification.isRead = true;
      this.saveToStorage(notifications);
      this.updateSubjects(notifications);
      console.log('✅ Notification marked as read:', notificationId);
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    const notifications = this.getAll();
    let hasChanges = false;
    
    notifications.forEach(n => {
      if (!n.isRead) {
        n.isRead = true;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.saveToStorage(notifications);
      this.updateSubjects(notifications);
      console.log('✅ All notifications marked as read');
    }
  }

  /**
   * Get notification by ID
   */
  getNotification(notificationId: number): TripNotification | undefined {
    return this.getAll().find(n => n.id === notificationId);
  }

  /**
   * Get all notifications
   */
  getAll(): TripNotification[] {
    return this.notificationsSubject.getValue();
  }

  /**
   * Get unread notifications
   */
  getUnread(): TripNotification[] {
    return this.getAll().filter(n => !n.isRead);
  }

  /**
   * Get unread count
   */
  getUnreadCount(): number {
    return this.unreadCountSubject.getValue();
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    localStorage.removeItem(this.notificationsKey);
    this.updateSubjects([]);
    console.log('🗑️ All notifications cleared');
  }

  /**
   * Mark all notifications as unread (for testing)
   */
  markAllAsUnread(): void {
    const notifications = this.getAll();
    let hasChanges = false;

    notifications.forEach(n => {
      if (n.isRead) {
        n.isRead = false;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.saveToStorage(notifications);
      this.updateSubjects(notifications);
      console.log('✅ All notifications marked as UNREAD');
    }
  }

  /**
   * Delete specific notification
   */
  delete(notificationId: number): void {
    const notifications = this.getAll().filter(n => n.id !== notificationId);
    this.saveToStorage(notifications);
    this.updateSubjects(notifications);
    console.log('🗑️ Notification deleted:', notificationId);
  }

  /**
   * Load notifications from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.notificationsKey);
      if (stored) {
        const notifications = JSON.parse(stored) as TripNotification[];
        this.notificationsSubject.next(notifications);
        this.updateUnreadCount(notifications);
        console.log('📥 Loaded', notifications.length, 'notifications from storage');
        
        // Count unread notifications
        const unreadCount = notifications.filter(n => !n.isRead).length;
        console.log('📥 Unread notifications on load:', unreadCount);
      } else {
        console.log('📥 No notifications in storage');
      }
    } catch (error) {
      console.error('❌ Error loading notifications from storage:', error);
    }
  }

  /**
   * Save notifications to localStorage
   */
  private saveToStorage(notifications: TripNotification[]): void {
    try {
      localStorage.setItem(this.notificationsKey, JSON.stringify(notifications));
    } catch (error) {
      console.error('❌ Error saving notifications to storage:', error);
    }
  }

  /**
   * Update RxJS subjects
   */
  private updateSubjects(notifications: TripNotification[]): void {
    this.notificationsSubject.next(notifications);
    this.updateUnreadCount(notifications);
  }

  /**
   * Update unread count
   */
  private updateUnreadCount(notifications: TripNotification[]): void {
    const unreadCount = notifications.filter(n => !n.isRead).length;
    this.unreadCountSubject.next(unreadCount);

    // Update browser badge (if supported)
    if ('setAppBadge' in navigator) {
      if (unreadCount > 0) {
        navigator.setAppBadge(unreadCount);
      } else {
        navigator.clearAppBadge();
      }
    }

    // Update document title
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) TMS Mobile`;
    } else {
      document.title = 'TMS Mobile';
    }
  }

  /**
   * Sync notifications from server (for offline drivers)
   */
  async syncNotificationsFromServer(): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('⚠️ No token, cannot sync notifications - user not logged in?');
        return;
      }

      console.log('🔄 Syncing notifications from server...');

      // Fetch unread notifications from server
      const response = await fetch(`${environment.apiUrl}/api/Notifications?pageIndex=0&pageSize=10`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('📦 Server notifications response:', JSON.stringify(result, null, 2));

        // Structure: { data: { notifications: [...], unreadCount: N, totalCount: N } }
        if (result.data && result.data.notifications) {
          const notifications = result.data.notifications;
          console.log('📋 Notifications count:', notifications.length);

          // Add each notification to local storage
          notifications.forEach((serverNotif: any) => {
            try {
              // Handle both nested and flat structures
              const notif = serverNotif.notification || serverNotif;
              
              if (!notif.type) {
                console.warn('⚠️ Skipping notification without type:', serverNotif);
                return;
              }

              this.addNotification({
                type: notif.type as any,
                title: notif.title,
                message: notif.message,
                tripId: notif.tripId || 0,
                tripReference: notif.tripReference || '',
                driverName: notif.driverName,
                truckImmatriculation: notif.truckImmatriculation,
                destination: notif.additionalData?.destination,
                customerName: notif.additionalData?.customerName,
                deliveriesCount: notif.additionalData?.deliveriesCount,
                estimatedDistance: notif.additionalData?.estimatedDistance,
                estimatedDuration: notif.additionalData?.estimatedDuration,
                timestamp: notif.timestamp || new Date().toISOString()
              });
            } catch (e) {
              console.error('❌ Error processing notification:', e, serverNotif);
            }
          });

          console.log('✅ Notifications synced from server:', notifications.length);
        } else {
          console.warn('⚠️ No notifications in response data');
        }
      } else if (response.status === 401) {
        console.error('❌ 401 Unauthorized - Token may be invalid or expired');
      } else {
        console.error('❌ Failed to sync notifications:', response.status);
      }
    } catch (error) {
      console.error('❌ Error syncing notifications:', error);
    }
  }
}
