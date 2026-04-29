import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { TripService } from '../../services/trip.service';
import { ITrip, TripStatus } from '../../types/trip';
import { Subscription } from 'rxjs';
import { Network } from '@capacitor/network';
import { NotificationStorageService, TripNotification } from '../../services/notification-storage.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule]
})
export class NotificationsPage implements OnInit, OnDestroy {
  tripService = inject(TripService);
  toastController = inject(ToastController);
  alertController = inject(AlertController);
  notificationStorage = inject(NotificationStorageService);
  router = inject(Router);

  notifications: TripNotification[] = [];
  allNotifications: (ITrip & { notificationType?: 'cancelled' | 'new' })[] = [];
  cancelledTrips: (ITrip & { notificationType?: 'cancelled' })[] = [];
  newTrips: (ITrip & { notificationType?: 'new' })[] = [];

  private _sub: Subscription | null = null;
  private networkListener: any;
  private notificationSub: Subscription | null = null;
  
  // Offline mode flags
  isOnline: boolean = true;
  offlineMode: boolean = false;
  isLoading: boolean = false;
  lastSyncTime: Date | null = null;

  async ngOnInit() {
    await this.checkNetworkStatus();
    this.setupNetworkListener();

    // Load notifications from storage
    this.loadStoredNotifications();
    
    // Listen for new notifications
    this.notificationSub = this.notificationStorage.notifications$.subscribe(notifications => {
      this.notifications = notifications;
      console.log('📬 Notifications updated:', notifications.length);
    });

    // Always load from cache first for offline viewing
    this.loadFromCache();

    // Then try to load fresh data if online
    if (this.isOnline) {
      this.loadNotifications();
    }
  }

  ngOnDestroy() {
    this._sub?.unsubscribe();
    this.notificationSub?.unsubscribe();
    if (this.networkListener) {
      this.networkListener.remove();
    }
  }

  loadStoredNotifications(): void {
    this.notifications = this.notificationStorage.getAll();
    console.log('📬 Loaded stored notifications:', this.notifications.length);
  }

  /**
   * Navigate to GPS tracking page when clicking on notification
   */
  async onNotificationClick(notification: TripNotification): Promise<void> {
    console.log('🔔 Notification clicked:', notification);

    // Mark as read
    this.notificationStorage.markAsRead(notification.id);

    // Navigate to GPS tracking page with trip data
    await this.router.navigate(['/trip/' + notification.tripId + '/gps'], {
      queryParams: {
        tripId: notification.tripId,
        tripReference: notification.tripReference,
        destination: notification.destination || '',
        customerName: notification.customerName || '',
        // Pass destination coordinates if available
        destinationLat: notification.additionalData?.destinationLatitude || '',
        destinationLng: notification.additionalData?.destinationLongitude || ''
      }
    });
  }

  private async checkNetworkStatus() {
    try {
      const status = await Network.getStatus();
      this.isOnline = status.connected;
      this.offlineMode = !this.isOnline;
      console.log('Network status:', this.isOnline ? 'online' : 'offline');
    } catch (error) {
      console.error('Error checking network:', error);
      this.isOnline = false;
      this.offlineMode = true;
    }
  }

  private setupNetworkListener() {
    Network.addListener('networkStatusChange', async (status) => {
      const wasOffline = !this.isOnline;
      this.isOnline = status.connected;
      this.offlineMode = !this.isOnline;
      
      console.log('Network changed:', this.isOnline ? 'online' : 'offline');
      
      if (wasOffline && this.isOnline) {
        // Just came online - refresh data
        await this.loadNotifications();
        this.showToast('Connection restored - Notifications updated', 'success');
      }
    });
  }

  loadNotifications() {
    if (!this.isOnline) {
      this.showToast('Offline - Showing cached notifications', 'warning');
      return;
    }

    this.isLoading = true;

    this._sub = this.tripService.getAllTrips().subscribe({
      next: (trips) => {
        // Filtrer les trips supprimés AVANT de les traiter
        const filteredTrips = trips.filter(t => !this.notificationStorage.isDeleted(t.id));
        console.log('📡 Server trips:', trips.length, '-> after filter:', filteredTrips.length);
        this.processTrips(filteredTrips);
        this.cacheNotifications(filteredTrips);
        this.lastSyncTime = new Date();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading notifications:', err);
        this.showToast('Failed to load notifications', 'danger');
        this.isLoading = false;
      }
    });
  }

  private processTrips(trips: ITrip[]) {
    this.cancelledTrips = trips
      .filter(t => t.tripStatus === TripStatus.Cancelled)
      .map(t => ({ ...t, notificationType: 'cancelled' as const }));

    this.newTrips = trips
      .filter(t => t.tripStatus === TripStatus.Planned)
      .map(t => ({ ...t, notificationType: 'new' as const }));

    this.allNotifications = [
      ...this.cancelledTrips,
      ...this.newTrips
    ];
  }

  private loadFromCache() {
    try {
      const cached = localStorage.getItem('cachedNotifications');
      const syncTime = localStorage.getItem('notificationsSyncTime');

      if (cached) {
        const trips = JSON.parse(cached) as ITrip[];
        // Filtrer les trips supprimés
        const filteredTrips = trips.filter(t => !this.notificationStorage.isDeleted(t.id));
        this.processTrips(filteredTrips);

        if (syncTime) {
          this.lastSyncTime = new Date(parseInt(syncTime));
        }

        console.log('Loaded notifications from cache:', filteredTrips.length, '(filtered from', trips.length, ')');
      }
    } catch (error) {
      console.error('Error loading from cache:', error);
    }
  }

  private cacheNotifications(trips: ITrip[]) {
    try {
      localStorage.setItem('cachedNotifications', JSON.stringify(trips));
      localStorage.setItem('notificationsSyncTime', Date.now().toString());
      console.log('Notifications cached successfully');
    } catch (error) {
      console.error('Error caching notifications:', error);
    }
  }

  async refreshNotifications(event?: any) {
    if (this.isOnline) {
      await this.loadNotifications();
    } else {
      this.showToast('Cannot refresh while offline - Showing cached data', 'warning');
    }
    
    if (event) {
      event.target.complete();
    }
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }

  getReasonOrVehicle(trip: ITrip): string {
    if (trip.tripStatus === 'Cancelled' && trip.message) {
      return trip.message;
    }
    return trip.truck?.immatriculation || 'No vehicle';
  }

  getStatusLabel(status: TripStatus): string {
    const labels: { [key: string]: string } = {
      'Planned': 'Planifié',
      'Cancelled': 'Annulé'
    };
    return labels[status] || status;
  }

  getSectionTitle(type: 'cancelled' | 'new'): string {
    return type === 'cancelled' ? '🚫 CANCELLED TRIPS' : '✨ NEW TRIPS';
  }

  getOfflineStatusText(): string {
    if (this.offlineMode) {
      return '📴 Offline Mode - Showing cached notifications';
    }
    if (this.lastSyncTime) {
      return `Last updated: ${this.lastSyncTime.toLocaleString()}`;
    }
    return '';
  }

  hasNotifications(): boolean {
    return this.allNotifications.length > 0;
  }

  getEmptyStateMessage(): string {
    if (this.isLoading) {
      return 'Loading notifications...';
    }
    if (this.offlineMode && !this.hasNotifications()) {
      return 'No cached notifications available offline';
    }
    return 'No notifications to display';
  }

  clearCache() {
    try {
      localStorage.removeItem('cachedNotifications');
      localStorage.removeItem('notificationsSyncTime');
      this.allNotifications = [];
      this.cancelledTrips = [];
      this.newTrips = [];
      this.lastSyncTime = null;
      this.showToast('Cache cleared', 'success');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Clear all notifications from storage (for testing)
   */
  clearAllNotifications(): void {
    this.notificationStorage.clearAll();
    this.notifications = [];
    this.showToast('All notifications cleared', 'success');
  }

  /**
   * Mark all notifications as unread (for testing)
   */
  markAllAsUnread(): void {
    this.notificationStorage.markAllAsUnread();
    this.showToast('All notifications marked as unread', 'success');
  }
}