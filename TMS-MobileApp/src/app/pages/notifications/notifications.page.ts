import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
<<<<<<< HEAD
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';
import { NotificationStorageService, TripNotification } from '../../services/notification-storage.service';
import { GPSTrackingService } from '../../services/gps-tracking.service';
import { Observable } from 'rxjs';
=======
import { IonicModule, ToastController } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { TripService } from '../../services/trip.service';
import { ITrip, TripStatus } from '../../types/trip';
import { Subscription } from 'rxjs';
import { Network } from '@capacitor/network';
>>>>>>> dev

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule]
})
<<<<<<< HEAD
export class NotificationsPage implements OnInit {
  notificationStorage = inject(NotificationStorageService);
  gpsService = inject(GPSTrackingService);
  alertController = inject(AlertController);
  toastController = inject(ToastController);
  router = inject(Router);
=======
export class NotificationsPage implements OnInit, OnDestroy {
  tripService = inject(TripService);
  toastController = inject(ToastController);
>>>>>>> dev

  notifications$: Observable<TripNotification[]>;
  unreadCount$: Observable<number>;
  unreadTripAssignmentsCount: number = 0;

<<<<<<< HEAD
  constructor() {
    this.notifications$ = this.notificationStorage.notifications$;
    this.unreadCount$ = this.notificationStorage.unreadCount$;
  }

  ngOnInit() {
    // Subscribe to count unread trip assignments
    this.notifications$.subscribe(notifications => {
      this.unreadTripAssignmentsCount = notifications.filter(
        n => n.type === 'NEW_TRIP_ASSIGNMENT' && !n.isRead
      ).length;
    });
  }

  /**
   * Track by function for ngFor
   */
  trackByFn(index: number, notification: TripNotification): number {
    return notification.id;
  }

  /**
   * Get notification icon based on type
   */
  getNotificationIcon(type: string): string {
    switch (type) {
      case 'NEW_TRIP_ASSIGNMENT':
        return 'clipboard-outline';
      case 'TRIP_UPDATE':
        return 'refresh-outline';
      case 'TRIP_CANCELLED':
        return 'close-circle-outline';
      default:
        return 'notifications-outline';
    }
  }

  /**
   * Get notification color based on type
   */
  getNotificationColor(type: string): string {
    switch (type) {
      case 'NEW_TRIP_ASSIGNMENT':
        return 'primary';
      case 'TRIP_UPDATE':
        return 'secondary';
      case 'TRIP_CANCELLED':
        return 'danger';
      default:
        return 'medium';
    }
  }

  /**
   * Format timestamp to relative time
   */
  getTimeAgo(timestamp: string): string {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} j`;
    return past.toLocaleDateString('fr-FR');
  }

  /**
   * Navigate to trip details page
   */
  async viewNotification(notification: TripNotification) {
    // Mark as read
    this.notificationStorage.markAsRead(notification.id);

    // Navigate to trip details with action
    const tripId = notification.tripId;
    
    // Format trip info as clean text
    const tripInfo = [
      `🚛 Camion: ${notification.truckImmatriculation || 'N/A'}`,
      `👤 Chauffeur: ${notification.driverName || 'N/A'}`,
      `📍 Destination: ${notification.destination || 'Non définie'}`,
      `🏢 Client: ${notification.customerName || 'N/A'}`,
      `📦 Livraisons: ${notification.deliveriesCount || 0}`,
      `📏 Distance: ${notification.estimatedDistance || 0} km`,
      `⏱️ Durée: ${notification.estimatedDuration || 0} heures`
    ].join('\n\n');
    
    // Show action alert with clean text
    const alert = await this.alertController.create({
      header: notification.title,
      subHeader: `Trip ${notification.tripReference}`,
      message: tripInfo,
      cssClass: 'trip-notification-alert',
      buttons: [
        {
          text: 'Refuser',
          role: 'cancel',
          cssClass: 'alert-button-cancel',
          handler: () => {
            this.rejectTrip(notification);
          }
        },
        {
          text: 'Accepter',
          cssClass: 'alert-button-confirm',
          handler: () => {
            this.acceptTrip(notification);
          }
        },
        {
          text: 'Voir sur la carte',
          handler: () => {
            this.viewOnMap(notification);
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Accept trip
   */
  async acceptTrip(notification: TripNotification) {
    try {
      await this.gpsService.acceptTrip(notification.tripId);
      
      const toast = await this.toastController.create({
        message: '✅ Trip accepté avec succès!',
        duration: 2000,
        color: 'success',
        position: 'top'
      });
      await toast.present();

      // Navigate to GPS tracking page
      // this.router.navigate(['/gps-tracking', notification.tripId]);
    } catch (error) {
      console.error('Error accepting trip:', error);
      
      const toast = await this.toastController.create({
        message: '❌ Erreur lors de l\'acceptation',
        duration: 2000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
    }
  }

  /**
   * Reject trip
   */
  async rejectTrip(notification: TripNotification) {
    const alert = await this.alertController.create({
      header: 'Raison du refus',
      inputs: [
        {
          name: 'reason',
          type: 'radio',
          label: '🌧️ Mauvais temps',
          value: 'BadWeather'
        },
        {
          name: 'reason',
          type: 'radio',
          label: '🚛 Camion non disponible',
          value: 'Unavailable'
        },
        {
          name: 'reason',
          type: 'radio',
          label: '⚙️ Problème technique',
          value: 'Technical'
        },
        {
          name: 'reason',
          type: 'radio',
          label: '🏥 Raison médicale',
          value: 'Medical'
        },
        {
          name: 'reason',
          type: 'radio',
          label: '📋 Autre',
          value: 'Other'
        }
      ],
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Refuser',
          handler: (data: any) => {
            if (data.reason) {
              this.gpsService.rejectTrip(notification.tripId, data.reason, data.reason);
              this.showToast('❌ Trip refusé', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * View trip on GPS map
   */
  async viewOnMap(notification: TripNotification) {
    console.log('🗺️ Navigate to GPS - Trip ID:', notification.tripId, 'Destination:', notification.destination);
    
    // Navigate to GPS tracking page with trip data
    await this.router.navigate(['/gps-tracking'], {
      queryParams: {
        tripId: notification.tripId,
        tripReference: notification.tripReference,
        destination: notification.destination || ''
=======
  private _sub: Subscription | null = null;
  private networkListener: any;
  
  // Offline mode flags
  isOnline: boolean = true;
  offlineMode: boolean = false;
  isLoading: boolean = false;
  lastSyncTime: Date | null = null;

  async ngOnInit() {
    await this.checkNetworkStatus();
    this.setupNetworkListener();
    
    // Always load from cache first for offline viewing
    this.loadFromCache();
    
    // Then try to load fresh data if online
    if (this.isOnline) {
      this.loadNotifications();
    }
  }

  ngOnDestroy() {
    this._sub?.unsubscribe();
    if (this.networkListener) {
      this.networkListener.remove();
    }
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
      // Still show cached data when offline
      this.showToast('Offline - Showing cached notifications', 'warning');
      return;
    }

    this.isLoading = true;
    
    this._sub = this.tripService.getAllTrips().subscribe({
      next: (trips) => {
        this.processTrips(trips);
        this.cacheNotifications(trips);
        this.lastSyncTime = new Date();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading notifications:', err);
        this.showToast('Failed to load notifications', 'danger');
        this.isLoading = false;
>>>>>>> dev
      }
    });
  }

<<<<<<< HEAD
  /**
   * Mark all as read
   */
  async markAllAsRead() {
    this.notificationStorage.markAllAsRead();
    await this.showToast('✅ Toutes les notifications ont été marquées comme lues', 'success');
=======
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
        this.processTrips(trips);
        
        if (syncTime) {
          this.lastSyncTime = new Date(parseInt(syncTime));
        }
        
        console.log('Loaded notifications from cache:', trips.length);
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
>>>>>>> dev
  }

  /**
   * Clear all notifications
   */
  async clearAll() {
    const alert = await this.alertController.create({
      header: 'Confirmer',
      message: 'Voulez-vous vraiment supprimer toutes les notifications ?',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Supprimer',
          cssClass: 'alert-button-confirm',
          handler: () => {
            this.notificationStorage.clearAll();
            this.showToast('🗑️ Toutes les notifications ont été supprimées', 'medium');
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Delete single notification
   */
  async deleteNotification(notification: TripNotification, event: Event) {
    event.stopPropagation();
    
    const alert = await this.alertController.create({
      header: 'Confirmer',
      message: 'Supprimer cette notification ?',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Supprimer',
          cssClass: 'alert-button-confirm',
          handler: () => {
            this.notificationStorage.delete(notification.id);
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Show toast message
   */
  async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    await toast.present();
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
}