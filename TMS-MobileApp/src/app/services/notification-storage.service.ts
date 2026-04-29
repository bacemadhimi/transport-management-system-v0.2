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
  private deletedNotificationsKey = 'tms_notifications_deleted_ids';
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private notificationsSubject = new BehaviorSubject<TripNotification[]>([]);

  public unreadCount$ = this.unreadCountSubject.asObservable();
  public notifications$ = this.notificationsSubject.asObservable();

  // IDs de notifications supprimées (persisté dans localStorage)
  private deletedNotificationIds: Set<number> = new Set();

  constructor() {
    this.loadFromStorage();
    this.loadDeletedIds();
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
   * Clear all notifications from storage
   */
  clearAll(): void {
    // Stocker les tripIds des notifications supprimées
    const currentNotifications = this.getAll();
    currentNotifications.forEach(n => this.deletedNotificationIds.add(n.tripId));
    this.saveDeletedIds();

    // Supprimer aussi le cache des trips pour éviter qu'ils réapparaissent
    localStorage.removeItem('cachedNotifications');
    localStorage.removeItem('notificationsSyncTime');

    localStorage.removeItem(this.notificationsKey);
    this.updateSubjects([]);
    console.log('🗑️ All notifications and cache cleared');
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
    // Trouver la notification pour récupérer son tripId
    const notifications = this.getAll();
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      this.deletedNotificationIds.add(notification.tripId);
      this.saveDeletedIds();
    }

    const filtered = notifications.filter(n => n.id !== notificationId);
    this.saveToStorage(filtered);
    this.updateSubjects(filtered);
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

        if (result.data && result.data.notifications) {
          const notifications = result.data.notifications;
          console.log('📋 Notifications count:', notifications.length);

          notifications.forEach((serverNotif: any) => {
            try {
              const notif = serverNotif.notification || serverNotif;

              if (!notif.type) {
                console.warn('⚠️ Skipping notification without type:', serverNotif);
                return;
              }

              // Ignorer si déjà supprimée localement
              if (this.deletedNotificationIds.has(notif.tripId)) {
                console.log('⏭️ Skipping deleted notification for trip:', notif.tripId);
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

  // ===== Gestion des notifications supprimées (localStorage) =====
  private loadDeletedIds(): void {
    try {
      const stored = localStorage.getItem(this.deletedNotificationsKey);
      if (stored) {
        const ids = JSON.parse(stored) as number[];
        this.deletedNotificationIds = new Set(ids);
        console.log('📖 Loaded deleted notification IDs:', this.deletedNotificationIds.size);
      }
    } catch (e) {
      console.error('Error loading deleted notification IDs:', e);
    }
  }

  private saveDeletedIds(): void {
    try {
      localStorage.setItem(this.deletedNotificationsKey, JSON.stringify(Array.from(this.deletedNotificationIds)));
    } catch (e) {
      console.error('Error saving deleted notification IDs:', e);
    }
  }

  /**
   * Filtrer les notifications supprimées (appelé après le chargement serveur)
   */
  filterDeletedNotifications(notifications: TripNotification[]): TripNotification[] {
    return notifications.filter(n => !this.deletedNotificationIds.has(n.id));
  }

  /**
   * Vérifier si une notification/trip a été supprimée
   */
  isDeleted(id: number): boolean {
    return this.deletedNotificationIds.has(id);
  }

  // ============================================================
}
