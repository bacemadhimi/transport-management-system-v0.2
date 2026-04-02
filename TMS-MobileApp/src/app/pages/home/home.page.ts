import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TripDetailsModalComponent } from '../trip-details-modal/trip-details-modal.component';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { TripService } from '../../services/trip.service';
import { ITrip, TripStatus } from '../../types/trip';
import { Observable, Subscription, of } from 'rxjs';
import { map, catchError, take } from 'rxjs/operators';
import { NotificationService } from '../../services/notification.service';
<<<<<<< HEAD
<<<<<<< HEAD
import { GPSTrackingService } from '../../services/gps-tracking.service';
import { NotificationStorageService } from '../../services/notification-storage.service';
=======
import { SignalRService, TripNotification } from '../../services/signalr.service';
import { SignalRChatService } from 'src/app/services/signalr-chat.service';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';
>>>>>>> dev
=======
import { GPSTrackingService } from '../../services/gps-tracking.service';
import { NotificationStorageService } from '../../services/notification-storage.service';
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule]
})
export class HomePage implements OnInit, OnDestroy {
  authService = inject(AuthService);
  router = inject(Router);
  tripService = inject(TripService);
  toastController = inject(ToastController);
  alertController = inject(AlertController);
  notificationService = inject(NotificationService);
  modalController = inject(ModalController);
<<<<<<< HEAD
<<<<<<< HEAD
  gpsService = inject(GPSTrackingService);
  notificationStorage = inject(NotificationStorageService);
=======
  signalRService = inject(SignalRService);
  chatService = inject(SignalRChatService);
>>>>>>> dev
=======
  gpsService = inject(GPSTrackingService);
  notificationStorage = inject(NotificationStorageService);
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d

  trips$: Observable<ITrip[]> | null = null;
  totalDistance: number = 0;
  cancelledTripsCount: number = 0;
  unreadNotificationsCount: number = 0;
  private _notifSub: Subscription | null = null;
<<<<<<< HEAD
<<<<<<< HEAD
  private _gpsSub: Subscription | null = null;
  private _unreadSub: Subscription | null = null;
=======
  updatedTripIds: Set<number> = new Set();
  unreadMessagesCount: number = 0;
  private subscriptions: Subscription[] = [];
  
  // Offline mode flags
  isOnline: boolean = true;
  offlineMode: boolean = false;
  private networkListener: any;
  pendingUpdates: Map<number, any> = new Map(); // Store pending updates for sync when online
>>>>>>> dev
=======
  private _gpsSub: Subscription | null = null;
  private _unreadSub: Subscription | null = null;
  private subscriptions: Subscription[] = []; // Added for compatibility

  // Network status - temporarily default to online
  isOnline: boolean = true;
  offlineMode: boolean = false;
  pendingUpdates: Map<number, any> = new Map();
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d

  constructor() {}

  async ngOnInit() {
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
    this.loadTrips();
    this.notificationService.startPolling(5000);
    this._notifSub = this.notificationService.cancelledCount$.subscribe(count => {
      this.cancelledTripsCount = count;
<<<<<<< HEAD
=======
    await this.checkNetworkStatus();
    this.setupNetworkListener();
    await this.loadTrips();
    this.setupSignalR(); 
    
    this.subscriptions.push(
      this.chatService.unreadCount$.subscribe(count => {
        this.unreadMessagesCount = count;
      })
    );

    // Only start polling if online
    if (this.isOnline) {
      this.notificationService.startPolling(5000);
      this._notifSub = this.notificationService.cancelledCount$.subscribe(count => {
        this.cancelledTripsCount = count;
      });
    } else {
      this.offlineMode = true;
      this.loadOfflineCancelledCount();
    }
  }

  private async checkNetworkStatus() {
  try {
    const status = await Network.getStatus();
    this.isOnline = status.connected;
    this.offlineMode = !this.isOnline;
    console.log('État du réseau:', this.isOnline ? 'en ligne' : 'hors ligne');
  } catch (error) {
    console.error('Erreur lors de la vérification du réseau:', error);
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
        // Just came online - sync pending updates
        await this.syncPendingUpdates();
        this.showToast('Connexion rétablie - Synchronisation des données...', 3000, 'success');
        
        // Restart polling
        this.notificationService.startPolling(5000);
        
        // Reload trips from server
        this.loadTrips();
      } else if (!wasOffline && !this.isOnline) {
        // Just went offline
        this.showToast('Vous êtes hors ligne - Mode hors ligne activé', 3000, 'warning');
        this.notificationService.stopPolling();
      }
    });
  }

  private async syncPendingUpdates() {
    if (this.pendingUpdates.size === 0) return;

    this.showToast(`Synchronisation de ${this.pendingUpdates.size} mise(s) à jour en attente...`, 3000, 'primary');

    for (const [tripId, update] of this.pendingUpdates.entries()) {
      try {
        if (update.type === 'status') {
          await this.tripService.updateTripStatus(tripId, { status: update.status }).toPromise();
        } else if (update.type === 'cancel') {
          await this.tripService.cancelTrip(tripId, { message: update.reason }).toPromise();
        } else if (update.type === 'receipt') {
          await this.tripService.updateTripStatus(tripId, { 
            status: 'Receipt', 
            proofImage: update.proof 
          }).toPromise();
        }
        
        this.pendingUpdates.delete(tripId);
        console.log(`Synced update for trip ${tripId}`);
      } catch (error) {
        console.error(`Failed to sync trip ${tripId}:`, error);
      }
    }

    if (this.pendingUpdates.size === 0) {
      this.showToast('Toutes les mises à jour synchronisées avec succès', 2000, 'success');
    } else {
      this.showToast(`${this.pendingUpdates.size} mise(s) à jour non synchronisée(s)`, 3000, 'warning');
    }
  }

  private loadOfflineCancelledCount() {
    // Load cancelled count from local storage or service
    const offlineCount = localStorage.getItem('cancelledTripsCount');
    this.cancelledTripsCount = offlineCount ? parseInt(offlineCount) : 0;
  }

  private setupSignalR() {
    // Only setup SignalR if online
    if (!this.isOnline) return;

    // Listen for trip updates
    this.signalRService.tripUpdate$.subscribe((notification: TripNotification | null) => {
      if (notification && notification.tripId && this.isOnline) {
        this.updateTripInList(notification);
      }
    });

    // Log connection status
    this.signalRService.connectionStatus$.subscribe(isConnected => {
      console.log('SignalR:', isConnected ? 'online' : 'offline');
    });
  }

  private updateTripInList(notification: TripNotification) {
    if (!this.isOnline) return; // Don't process real-time updates when offline

    this.trips$?.subscribe(trips => {
      const tripIndex = trips.findIndex(t => t.id === notification.tripId);
      
      if (tripIndex !== -1) {
        if (notification.tripId) this.updatedTripIds.add(notification.tripId);
        
        const updatedTrip = { ...trips[tripIndex] };
        
        if (notification.type === 'STATUS_CHANGE' && notification.newStatus) {
          updatedTrip.tripStatus = notification.newStatus as any;
        } else if (notification.type === 'TRIP_CANCELLED') {
          updatedTrip.tripStatus = 'Cancelled' as any;
        }
        
        this.loadTrips();
        
        setTimeout(() => {
          if (notification.tripId) this.updatedTripIds.delete(notification.tripId);
        }, 1000);
      }
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
    });

    // Subscribe to unread count
    this._unreadSub = this.notificationStorage.unreadCount$.subscribe(count => {
      this.unreadNotificationsCount = count;
      console.log('🔔 Unread notifications:', count);
    });

    // Connect to GPS Hub for real-time notifications FIRST
    await this.connectToGPSHub();

    // ✅ DISABLED: Server sync was causing 401 errors
    // Real-time notifications via SignalR work perfectly
    // setTimeout(() => {
    //   console.log('🔄 Starting notification sync after connection...');
    //   this.notificationStorage.syncNotificationsFromServer();
    // }, 3000);
    
    console.log('✅ Using real-time notifications via SignalR only');
  }

  async connectToGPSHub() {
    const user = this.authService.currentUser();
    if (!user) {
      console.log('⚠️ No user logged in, cannot connect to GPS Hub');
      return;
    }

    // Get driver ID - use user.id as fallback
    let driverId = (user as any).driverId;

    if (!driverId) {
      driverId = user.id || 1;
      console.log('⚠️ No driverId, using:', driverId);
    }

    console.log('🔌 Connecting to GPS Hub for driver:', driverId);
    console.log('📋 User data:', user);

    // Check if token exists
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('❌ No token found! User not properly authenticated.');
      return;
    }
    console.log('✅ Token found (length:', token.length, ')');

    // Decode token to get UserId
    try {
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      const userIdFromToken = tokenPayload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
      console.log('👤 UserId from token:', userIdFromToken);
      console.log('👤 DriverId:', driverId);
      
      if (userIdFromToken != driverId) {
        console.warn('⚠️ UserId from token (' + userIdFromToken + ') does not match DriverId (' + driverId + ')');
        console.warn('⚠️ This may cause notification sync issues!');
      }
    } catch (e) {
      console.error('❌ Error decoding token:', e);
    }

    await this.gpsService.connect(driverId);

    // Listen for new trip notifications - ALL drivers receive it
    this._gpsSub = this.gpsService.getNotifications().subscribe(notification => {
      console.log('🔔🔔🔔 NOTIFICATION REÇUE:', notification);

      // Show alert immediately for NEW_TRIP_ASSIGNMENT
      if (notification.type === 'NEW_TRIP_ASSIGNMENT') {
        console.log('✅ Showing notification for trip:', notification.tripReference);
        this.showTripNotification(notification);
      }
    });
  }

  async showTripNotification(notification: any) {
    const alert = await this.alertController.create({
      header: notification.title || 'Nouvelle Mission',
      message: `
        <p><strong>Trip:</strong> ${notification.tripReference}</p>
        <p><strong>Destination:</strong> ${notification.destination}</p>
        <p><strong>Distance:</strong> ${notification.estimatedDistance} km</p>
        <p><strong>Duration:</strong> ${notification.estimatedDuration}h</p>
      `,
      buttons: [
        {
          text: 'Refuser',
          role: 'cancel',
          handler: () => {
            this.rejectTrip(notification.tripId);
          }
        },
        {
          text: 'Accepter',
          handler: () => {
            this.acceptTrip(notification.tripId);
          }
        }
      ]
    });

    await alert.present();
  }

  async acceptTrip(tripId: number) {
    try {
      await this.gpsService.acceptTrip(tripId);
      const toast = await this.toastController.create({
        message: 'Trip accepté avec succès!',
        duration: 2000,
        color: 'success'
      });
      await toast.present();
    } catch (error) {
      console.error('Error accepting trip:', error);
    }
  }

  async rejectTrip(tripId: number) {
    const alert = await this.alertController.create({
      header: 'Raison du refus',
      inputs: [
        {
          name: 'reason',
          type: 'radio',
          label: 'Mauvais temps',
          value: 'BadWeather'
        },
        {
          name: 'reason',
          type: 'radio',
          label: 'Camion non disponible',
          value: 'Unavailable'
        },
        {
          name: 'reason',
          type: 'radio',
          label: 'Problème technique',
          value: 'Technical'
        },
        {
          name: 'reason',
          type: 'radio',
          label: 'Raison médicale',
          value: 'Medical'
        },
        {
          name: 'reason',
          type: 'radio',
          label: 'Autre',
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
              this.gpsService.rejectTrip(tripId, data.reason, data.reason);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this._notifSub?.unsubscribe();
    this._gpsSub?.unsubscribe();
    this._unreadSub?.unsubscribe();
    this.notificationService.stopPolling();
<<<<<<< HEAD
<<<<<<< HEAD
    this.gpsService.disconnect();
=======
    if (this.isOnline) {
      this.signalRService.disconnect();
    }
    if (this.networkListener) {
      this.networkListener.remove();
    }
>>>>>>> dev
=======
    this.gpsService.disconnect();
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
  }

  async loadTrips() {
    const userEmail = this.authService.currentUser()?.email;
    
    if (this.isOnline) {
      // Online mode - load from API
      this.trips$ = this.tripService.getAllTrips().pipe(
        map(trips => {
          if (userEmail) {
            return trips.filter(trip => trip.driver?.email === userEmail);
          }
          return trips;
        }),
        catchError(error => {
          console.error('Error loading trips online, falling back to offline:', error);
          return this.loadOfflineTrips(userEmail);
        })
      );
    } else {
      // Offline mode - load from local storage
      this.trips$ = this.loadOfflineTrips(userEmail);
    }

    this.trips$.subscribe(trips => {
      console.log('Trips loaded:', trips.length, 'mode:', this.isOnline ? 'online' : 'offline');
      this.totalDistance = this.calculateTotalDistance(trips);
      
      // Save to offline storage for offline access
      this.saveTripsOffline(trips);
    });
  }

  private loadOfflineTrips(userEmail?: string): Observable<ITrip[]> {
    try {
      const offlineTrips = localStorage.getItem('offlineTrips');
      if (offlineTrips) {
        let trips = JSON.parse(offlineTrips) as ITrip[];
        if (userEmail) {
          trips = trips.filter(trip => trip.driver?.email === userEmail);
        }
        return of(trips);
      }
    } catch (error) {
      console.error('Error loading offline trips:', error);
    }
    return of([]);
  }

  private saveTripsOffline(trips: ITrip[]) {
    try {
      localStorage.setItem('offlineTrips', JSON.stringify(trips));
    } catch (error) {
      console.error('Error saving trips offline:', error);
    }
  }

  getCompletedTripsCount(): number {
    let count = 0;
    this.trips$?.subscribe(trips => {
      count = trips.filter(t => t.tripStatus === 'Receipt').length;
    }).unsubscribe();
    return count;
  }

  getPendingTripsCount(): number {
    let count = 0;
    this.trips$?.subscribe(trips => {
      count = trips.filter(t => 
        t.tripStatus !== 'Receipt' && 
        t.tripStatus !== 'Cancelled'
      ).length;
    }).unsubscribe();
    return count;
  }

  getTotalDistance(): number {
    return this.totalDistance;
  }

  private calculateTotalDistance(trips: ITrip[]): number {
    return trips.reduce((total, trip) => total + (trip.estimatedDistance || 0), 0);
  }

  getTripProgress(trip: ITrip): number {
    switch (trip.tripStatus) {
      case TripStatus.LoadingInProgress:
      case TripStatus.DeliveryInProgress:
        return Math.floor(Math.random() * 80) + 10;
      case TripStatus.Receipt:
        return 100;
      default:
        return 0;
    }
  }

  trackByTripId(index: number, trip: ITrip): number {
    return trip.id;
  }

  async viewTripDetails(trip: ITrip) {
    const modal = await this.modalController.create({
      component: TripDetailsModalComponent,
      componentProps: { 
        trip,
        offlineMode: this.offlineMode 
      },
      cssClass: 'trip-details-modal'
    });
    await modal.present();
  }

  logout() {
    this.authService.logout();
  }

  navigateToProfile() {
    this.router.navigate(['/profile']);
  }

  navigateToTrips() {
    this.router.navigate(['/trips']);
  }

  async updateTripStatus(trip: ITrip, newStatus: string) {
    if (newStatus === 'Receipt') {
      this.showReceiptAlert(trip);
      return;
    }

    const oldStatus = trip.tripStatus;
    trip.updating = true;

    if (!this.isOnline) {
      // Offline mode - store update locally
      this.pendingUpdates.set(trip.id, {
        type: 'status',
        status: newStatus
      });
      
      // Update UI optimistically
      trip.tripStatus = newStatus as TripStatus;
      trip.updating = false;
      
      // Save to local storage
      this.updateTripInLocalStorage(trip);
      
      this.showToast('Statut mis à jour (hors ligne) - Synchronisation à la reconnexion', 3000, 'warning');
      return;
    }

    // Online mode - normal API call
    this.tripService.updateTripStatus(trip.id, { status: newStatus }).subscribe({
      next: async (response) => {
        console.log('Status updated successfully', response);
        trip.updating = false;
        trip.tripStatus = newStatus as TripStatus;
        this.updateTripInLocalStorage(trip);
        this.showToast('Statut du trajet mis à jour avec succès', 2000, 'success');
      },
      error: async (err) => {
        console.error('Error updating trip status', err);
        trip.updating = false;
        trip.tripStatus = oldStatus;
        this.showToast('Échec de la mise à jour du statut', 2000, 'danger');
      }
    });
  }

  private updateTripInLocalStorage(updatedTrip: ITrip) {
    try {
      const offlineTrips = localStorage.getItem('offlineTrips');
      if (offlineTrips) {
        let trips = JSON.parse(offlineTrips) as ITrip[];
        const index = trips.findIndex(t => t.id === updatedTrip.id);
        if (index !== -1) {
          trips[index] = updatedTrip;
          localStorage.setItem('offlineTrips', JSON.stringify(trips));
        }
      }
    } catch (error) {
      console.error('Error updating trip in local storage:', error);
    }
  }

  private async readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private async promptForReceiptProof(trip: ITrip) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/png, image/jpeg';
    fileInput.style.display = 'none';

    fileInput.onchange = async () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      if (!['image/png', 'image/jpeg'].includes(file.type)) {
        this.showToast('Veuillez sélectionner un fichier PNG ou JPEG', 2000, 'warning');
        return;
      }

      try {
        const dataUrl = await this.readFileAsDataURL(file);
        const pureBase64 = dataUrl.split(',')[1];
        await this.performStatusUpdateWithProof(trip, 'Receipt', pureBase64);
      } catch (err) {
        console.error('Error reading file', err);
        this.showToast('Erreur lors de la lecture de l\'image', 2000, 'danger');
      }
    };

    document.body.appendChild(fileInput);
    fileInput.click();
    setTimeout(() => fileInput.remove(), 1000);
  }

  private async performStatusUpdateWithProof(trip: ITrip, newStatus: string, proofBase64: string) {
    const oldStatus = trip.tripStatus;
    trip.updating = true;

    if (!this.isOnline) {
      // Offline mode - store receipt for later sync
      this.pendingUpdates.set(trip.id, {
        type: 'receipt',
        proof: proofBase64
      });
      
      trip.tripStatus = newStatus as TripStatus;
      trip.updating = false;
      
      if (trip.deliveries) {
        trip.deliveries.forEach(d => d.proofOfDelivery = proofBase64);
      }
      
      this.updateTripInLocalStorage(trip);
      this.showToast('Preuve enregistrée hors ligne - Synchronisation à la reconnexion', 3000, 'warning');
      return;
    }

    // Online mode
    this.tripService.updateTripStatus(trip.id, { status: newStatus, proofImage: proofBase64 }).subscribe({
      next: async (response) => {
        console.log('Status updated with proof', response);
        trip.updating = false;
        trip.tripStatus = newStatus as TripStatus;
       
        if (trip.deliveries) {
          trip.deliveries.forEach(d => d.proofOfDelivery = proofBase64);
        }
        
        this.updateTripInLocalStorage(trip);
        this.showToast('Livraison confirmée avec preuve', 2000, 'success');
      },
      error: async (err) => {
        console.error('Error updating trip status with proof', err);
        trip.updating = false;
        trip.tripStatus = oldStatus;
        this.showToast('Erreur lors de la confirmation de livraison', 2000, 'danger');
      }
    });
  }

  goToProfile() {
    this.router.navigate(['/profile']);
  }

  canCancelTrip(status: TripStatus): boolean {
    return status === TripStatus.Planned || 
           status === TripStatus.Accepted || 
           status === TripStatus.LoadingInProgress || 
           status === TripStatus.DeliveryInProgress;
  }

  async showCancelConfirmation(trip: ITrip) {
    const alert = await this.alertController.create({
      header: 'Annuler le trajet',
      message: this.offlineMode ? 
        'Vous êtes hors ligne. L\'annulation sera enregistrée et synchronisée à la reconnexion.' :
        'Pourquoi souhaitez-vous annuler ce trajet ?',
      inputs: [
        {
          name: 'reason',
          type: 'textarea',
          placeholder: 'Entrez la raison de l\'annulation...'
        }
      ],
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Confirmer',
          handler: (data) => {
            const reason = data.reason;
            if (reason && reason.trim()) {
              this.cancelTrip(trip, reason.trim());
            } else {
              this.showToast('Veuillez fournir une raison pour l\'annulation', 2000, 'warning');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async showReceiptAlert(trip: ITrip) {
    const alert = await this.alertController.create({
      header: 'Preuve de livraison requise',
      message: this.offlineMode ?
        'Vous êtes hors ligne. La preuve sera enregistrée et téléchargée à la reconnexion.' :
        'Veuillez ajouter une preuve de livraison',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'OK',
          handler: () => {
            this.promptForReceiptProof(trip);
          }
        }
      ]
    });
    await alert.present();
  }

  cancelTrip(trip: ITrip, reason: string) {
    if (!this.isOnline) {
      // Offline mode
      this.pendingUpdates.set(trip.id, {
        type: 'cancel',
        reason: reason
      });
      
      trip.tripStatus = TripStatus.Cancelled;
      trip.message = reason;
      this.updateTripInLocalStorage(trip);
      
      // Update cancelled count locally
      this.cancelledTripsCount++;
      localStorage.setItem('cancelledTripsCount', this.cancelledTripsCount.toString());
      
      this.showToast('Trajet annulé (hors ligne) - Synchronisation à la reconnexion', 3000, 'warning');
      return;
    }

    // Online mode
    this.tripService.cancelTrip(trip.id, { message: reason }).subscribe({
      next: async (response) => {
        console.log('Trip cancelled successfully', response);
        trip.tripStatus = TripStatus.Cancelled;
        trip.message = reason;
        this.updateTripInLocalStorage(trip);
        this.showToast('Trajet annulé avec succès', 2000, 'success');
      },
      error: async (err) => {
        console.error('Error cancelling trip', err);
        this.showToast('Erreur lors de l\'annulation du trajet', 2000, 'danger');
      }
    });
  }

  navigateToCancelledTrips() {
    this.router.navigate(['/cancelled-trips'], {
      queryParams: this.offlineMode ? { offline: true } : {}
    });
  }

  openNotifications() {
    if (!this.isOnline) {
      this.showToast('Les notifications nécessitent une connexion internet', 2000, 'warning');
      return;
    }
    this.router.navigate(['/notifications']);
  }

  openChat() {
    if (!this.isOnline) {
      this.showToast('Le chat nécessite une connexion internet', 2000, 'warning');
      return;
    }
    this.router.navigate(['/chat']);
  }

  private async showToast(message: string, duration: number, color: string) {
    const toast = await this.toastController.create({
      message,
      duration,
      color,
      position: 'top'
    });
    await toast.present();
  }

  // Helper to check pending updates
  hasPendingUpdates(): boolean {
    return this.pendingUpdates.size > 0;
  }

  // Get pending updates count
  getPendingUpdatesCount(): number {
    return this.pendingUpdates.size;
  }
  
  // Add this method to get profile image URL
  getProfileImageUrl(): string {
    const user = this.authService.currentUser();
    if (!user) return '';
    
    // If profileImage exists and is base64, convert to data URL
    const profileImage = (user as any).profileImage;
    if (profileImage) {
      // Check if it's already a data URL
      if (profileImage.startsWith('data:')) {
        return profileImage;
      }
      // Convert pure base64 to data URL
      return `data:image/jpeg;base64,${profileImage}`;
    }
    return '';
  }
  // Ajoutez ces méthodes dans votre classe HomePage

/**
 * Naviguer vers la page Mes Trajets
 */
navigateToMyTrips() {
  console.log('Navigating to My Trips');
  if (!this.isOnline) {
    this.showToast('Mode hors ligne - Données limitées', 2000, 'warning');
  }
  this.router.navigate(['/my-trips'], {
    queryParams: { offline: !this.isOnline }
  });
}

/**
 * Naviguer vers l'historique des trajets
 */
navigateToTripHistory() {
  console.log('Navigating to Trip History');
  if (!this.isOnline) {
    this.showToast('Mode hors ligne - Historique limité', 2000, 'warning');
  }
  this.router.navigate(['/trip-history'], {
    queryParams: { offline: !this.isOnline }
  });
}

navigateToGPSTracking() {
  console.log('🚀 Navigating to GPS Tracking');
  
  if (!this.isOnline) {
    this.showToast('Mode hors ligne - GPS limité', 2000, 'warning');
  }
  
  // Vérifier que trips$ existe
  if (!this.trips$) {
    console.error('❌ trips$ is null');
    this.showToast('Erreur: Données non disponibles', 2000, 'danger');
    return;
  }
  
  // Prendre la première valeur et garder l'abonnement jusqu'à la navigation
  this.trips$.pipe(take(1)).subscribe(trips => {
    console.log('📋 Trips disponibles:', trips?.length || 0);
    
    if (!trips || trips.length === 0) {
      console.log('❌ Aucun trajet trouvé');
      this.showToast('Aucun trajet trouvé pour le GPS', 2000, 'warning');
      return;
    }
    
    // Chercher un trajet en cours
    const activeTrip = trips.find(t => 
      t.tripStatus === 'Accepted' || 
      t.tripStatus === 'LoadingInProgress' || 
      t.tripStatus === 'DeliveryInProgress'
    );
    
    const tripToUse = activeTrip || trips[0];
    
    console.log('✅ Trajet sélectionné:', {
      id: tripToUse.id,
      reference: tripToUse.tripReference,
      status: tripToUse.tripStatus
    });
    
    const destination = this.getTripDestination(tripToUse);
    console.log('📍 Destination:', destination);
    
    // Navigation avec vérification
    this.router.navigate(['/gps-tracking'], {
      queryParams: {
        tripId: tripToUse.id,
        tripReference: tripToUse.tripReference,
        destination: destination
      }
    }).then(success => {
      if (success) {
        console.log('✅ Navigation réussie vers GPS');
      } else {
        console.log('❌ Navigation échouée');
        this.showToast('Erreur de navigation', 2000, 'danger');
      }
    }).catch(error => {
      console.error('❌ Erreur navigation:', error);
      this.showToast('Erreur: ' + error.message, 2000, 'danger');
    });
  });
}
/**
 * Récupérer la destination d'un trajet
 */
private getTripDestination(trip: ITrip): string {
  if (trip.deliveries && trip.deliveries.length > 0) {
    const lastDelivery = trip.deliveries[trip.deliveries.length - 1];
    return lastDelivery.deliveryAddress || '';
  }
  return '';
}

/**
 * Naviguer vers tous les trajets
 */
navigateToAllTrips() {
  console.log('Navigating to All Trips');
  this.router.navigate(['/trips']);
}
}