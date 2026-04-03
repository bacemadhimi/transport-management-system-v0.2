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
import { SignalRService, TripNotification } from '../../services/signalr.service';
import { SignalRChatService } from 'src/app/services/signalr-chat.service';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';
import { FormsModule } from '@angular/forms';
import { BarcodeScannerService } from '../../services/barcode-scanner.service';
import { GPSTrackingService } from '../../services/gps-tracking.service';
import { NotificationStorageService } from '../../services/notification-storage.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule, FormsModule]
})
export class HomePage implements OnInit, OnDestroy {
  authService = inject(AuthService);
  router = inject(Router);
  tripService = inject(TripService);
  toastController = inject(ToastController);
  alertController = inject(AlertController);
  notificationService = inject(NotificationService);
  modalController = inject(ModalController);
  signalRService = inject(SignalRService);
  chatService = inject(SignalRChatService);
  barcodeScanner = inject(BarcodeScannerService);
  gpsService = inject(GPSTrackingService);
  notificationStorageService = inject(NotificationStorageService);

  trips$: Observable<ITrip[]> | null = null;
  totalDistance: number = 0;
  cancelledTripsCount: number = 0;
  notificationBadgeCount: number = 0;
  private _notifSub: Subscription | null = null;
  updatedTripIds: Set<number> = new Set();
  unreadMessagesCount: number = 0;
  private subscriptions: Subscription[] = [];
  
  // Offline mode flags
  isOnline: boolean = true;
  offlineMode: boolean = false;
  private networkListener: any;
  pendingUpdates: Map<number, any> = new Map();

  // QR Code Scanner variables
  showQRScanner: boolean = false;
  isScanning: boolean = false;
  scannedQRData: any = null;
  manualQRCode: string = '';
  currentTripForQR: ITrip | null = null;

  constructor() {}

  async ngOnInit() {
    await this.checkNetworkStatus();
    this.setupNetworkListener();
    await this.loadTrips();
    this.setupSignalR();
    
    // ===== ADDED: Connect to GPS Hub for real-time notifications =====
    const user = this.authService.currentUser();
    if (user && user.role === 'Driver') {
      console.log('🔌 Connecting to GPS Hub from Home Page for driver:', user.id);
      this.gpsService.connect(user.id).catch(err => {
        console.error('❌ Error connecting to GPS Hub:', err);
      });
    } else if (user) {
      console.log('ℹ️ User is not a driver, skipping GPS Hub connection');
    }
    // ================================================================

    this.subscriptions.push(
      this.chatService.unreadCount$.subscribe(count => {
        this.unreadMessagesCount = count;
      }),
      // Subscribe to notification storage unread count for new trip assignments
      this.notificationStorageService.unreadCount$.subscribe(count => {
        this.notificationBadgeCount = count;
        console.log('🔔 Notification badge updated:', count);
      })
    );

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
        await this.syncPendingUpdates();
        this.showToast('Connexion rétablie - Synchronisation des données...', 3000, 'success');
        this.notificationService.startPolling(5000);
        this.loadTrips();
      } else if (!wasOffline && !this.isOnline) {
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
    const offlineCount = localStorage.getItem('cancelledTripsCount');
    this.cancelledTripsCount = offlineCount ? parseInt(offlineCount) : 0;
  }

  private setupSignalR() {
    if (!this.isOnline) return;

    this.signalRService.tripUpdate$.subscribe((notification: TripNotification | null) => {
      if (notification && notification.tripId && this.isOnline) {
        this.updateTripInList(notification);
      }
    });

    this.signalRService.connectionStatus$.subscribe(isConnected => {
      console.log('SignalR:', isConnected ? 'online' : 'offline');
    });
  }

  private updateTripInList(notification: TripNotification) {
    if (!this.isOnline) return;

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
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this._notifSub?.unsubscribe();
    this.notificationService.stopPolling();
    if (this.isOnline) {
      this.signalRService.disconnect();
    }
    if (this.networkListener) {
      this.networkListener.remove();
    }
  }

  async loadTrips() {
    const userEmail = this.authService.currentUser()?.email;
    
    if (this.isOnline) {
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
      this.trips$ = this.loadOfflineTrips(userEmail);
    }

    this.trips$.subscribe(trips => {
      console.log('Trips loaded:', trips.length, 'mode:', this.isOnline ? 'online' : 'offline');
      this.totalDistance = this.calculateTotalDistance(trips);
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

  // ==================== QR CODE SCANNER METHODS ====================

  openQRScannerForTrip(trip: ITrip) {
    this.currentTripForQR = trip;
    this.showQRScanner = true;
    this.scannedQRData = null;
    this.manualQRCode = '';
    // Lancer le scan automatiquement après l'ouverture
    setTimeout(() => {
      this.startQRScan();
    }, 500);
  }

  closeQRScanner() {
    this.showQRScanner = false;
    this.currentTripForQR = null;
    this.scannedQRData = null;
    this.manualQRCode = '';
    this.isScanning = false;
  }

  clearQRScan() {
    this.scannedQRData = null;
    this.manualQRCode = '';
  }

  async startQRScan() {
    if (this.isScanning) return;
    
    this.isScanning = true;
    
    try {
      const isMobile = Capacitor.isNativePlatform();
      
      if (isMobile) {
        // Sur mobile - utiliser le vrai scanner avec caméra
        const result = await this.barcodeScanner.scanBarcode();
        
        if (result && result.content) {
          this.scannedQRData = result;
          this.showToast('✅ QR Code scanné avec succès!', 2000, 'success');
        } else {
          this.showToast('❌ Scan annulé', 2000, 'warning');
        }
      } else {
        // Sur web - simulation avec saisie manuelle
        const result = await this.manualQRCodeInput();
        if (result) {
          this.scannedQRData = result;
          this.showToast('✅ QR Code saisi avec succès', 2000, 'success');
        }
      }
    } catch (error) {
      console.error('Erreur scan:', error);
      this.showToast('❌ Erreur lors du scan', 2000, 'danger');
    } finally {
      this.isScanning = false;
    }
  }

  private async manualQRCodeInput(): Promise<any> {
    return new Promise((resolve) => {
      const alertDiv = document.createElement('div');
      alertDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      
      const dialog = document.createElement('div');
      dialog.style.cssText = `
        background: white;
        border-radius: 20px;
        padding: 24px;
        width: 90%;
        max-width: 350px;
        text-align: center;
      `;
      
      dialog.innerHTML = `
        <ion-icon name="qr-code-outline" style="font-size: 48px; color: #ff8c00; margin-bottom: 16px;"></ion-icon>
        <h3 style="margin: 0 0 10px; color: #ff8c00;">Saisie QR Code</h3>
        <p style="margin: 0 0 20px; color: #666;">Entrez le contenu du QR Code</p>
        <input 
          id="qrInput" 
          type="text" 
          placeholder="Contenu du QR Code..." 
          style="
            width: 100%;
            padding: 12px;
            border: 2px solid #ff8c00;
            border-radius: 12px;
            margin-bottom: 20px;
            box-sizing: border-box;
            font-size: 14px;
          "
        >
        <div style="display: flex; gap: 12px;">
          <button 
            id="cancelBtn" 
            style="
              flex: 1;
              padding: 12px;
              background: #e0e0e0;
              border: none;
              border-radius: 12px;
              cursor: pointer;
              font-size: 14px;
            "
          >Annuler</button>
          <button 
            id="confirmBtn" 
            style="
              flex: 1;
              padding: 12px;
              background: linear-gradient(135deg, #ff8c00, #ffcc00);
              color: white;
              border: none;
              border-radius: 12px;
              cursor: pointer;
              font-weight: 600;
              font-size: 14px;
            "
          >Valider</button>
        </div>
      `;
      
      alertDiv.appendChild(dialog);
      document.body.appendChild(alertDiv);
      
      const input = dialog.querySelector('#qrInput') as HTMLInputElement;
      const confirmBtn = dialog.querySelector('#confirmBtn');
      const cancelBtn = dialog.querySelector('#cancelBtn');
      
      const cleanup = () => alertDiv.remove();
      
      const handleConfirm = () => {
        const value = input.value.trim();
        if (value) {
          resolve({
            content: value,
            format: 'QR_CODE',
            formatType: '2D',
            timestamp: new Date()
          });
        } else {
          resolve(null);
        }
        cleanup();
      };
      
      const handleCancel = () => {
        resolve(null);
        cleanup();
      };
      
      confirmBtn?.addEventListener('click', handleConfirm);
      cancelBtn?.addEventListener('click', handleCancel);
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleConfirm();
      });
      
      input.focus();
    });
  }

  async confirmDeliveryWithQR() {
    const qrData = this.scannedQRData || (this.manualQRCode ? {
      content: this.manualQRCode,
      format: 'QR_CODE',
      formatType: '2D',
      timestamp: new Date()
    } : null);
    
    if (!qrData || !this.currentTripForQR) {
      this.showToast('Veuillez scanner ou saisir un QR Code', 2000, 'warning');
      return;
    }
    
    console.log('📦 Confirming delivery with QR:', qrData.content);
    
    // Sauvegarder les données QR dans le trajet
    if (this.currentTripForQR.deliveries && this.currentTripForQR.deliveries.length > 0) {
      const lastDelivery = this.currentTripForQR.deliveries[this.currentTripForQR.deliveries.length - 1];
      (lastDelivery as any).qrCodeData = qrData.content;
      (lastDelivery as any).qrCodeFormat = qrData.format;
      (lastDelivery as any).qrCodeTimestamp = qrData.timestamp;
    }
    
    // Sauvegarder dans localStorage
    this.updateTripInLocalStorage(this.currentTripForQR);
    
    // Fermer le scanner
    this.closeQRScanner();
    
    // Mettre à jour le statut
    const trip = this.currentTripForQR;
    trip.updating = true;
    
    if (!this.isOnline) {
      // Mode hors ligne
      this.pendingUpdates.set(trip.id, {
        type: 'status',
        status: 'Receipt'
      });
      trip.tripStatus = TripStatus.Receipt;
      trip.updating = false;
      this.updateTripInLocalStorage(trip);
      this.showToast('Livraison confirmée (hors ligne) - Synchronisation à la reconnexion', 3000, 'warning');
      await this.loadTrips();
    } else {
      // Mode en ligne
      this.tripService.updateTripStatus(trip.id, { status: 'Receipt' }).subscribe({
        next: async (response) => {
          console.log('Delivery confirmed with QR', response);
          trip.updating = false;
          trip.tripStatus = TripStatus.Receipt;
          this.updateTripInLocalStorage(trip);
          this.showToast('✅ Livraison confirmée avec succès!', 2000, 'success');
          await this.loadTrips();
        },
        error: async (err) => {
          console.error('Error confirming delivery', err);
          trip.updating = false;
          this.showToast('❌ Erreur lors de la confirmation', 2000, 'danger');
        }
      });
    }
  }

  // ==================== TRIP STATUS UPDATE ====================

  async updateTripStatus(trip: ITrip, newStatus: string) {
    // Pour la confirmation de livraison, utiliser QR Code
    if (newStatus === 'Receipt') {
      this.openQRScannerForTrip(trip);
      return;
    }

    const oldStatus = trip.tripStatus;
    trip.updating = true;

    if (!this.isOnline) {
      this.pendingUpdates.set(trip.id, {
        type: 'status',
        status: newStatus
      });
      
      trip.tripStatus = newStatus as TripStatus;
      trip.updating = false;
      this.updateTripInLocalStorage(trip);
      this.showToast('Statut mis à jour (hors ligne) - Synchronisation à la reconnexion', 3000, 'warning');
      return;
    }

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

  cancelTrip(trip: ITrip, reason: string) {
    if (!this.isOnline) {
      this.pendingUpdates.set(trip.id, {
        type: 'cancel',
        reason: reason
      });
      
      trip.tripStatus = TripStatus.Cancelled;
      trip.message = reason;
      this.updateTripInLocalStorage(trip);
      
      this.cancelledTripsCount++;
      localStorage.setItem('cancelledTripsCount', this.cancelledTripsCount.toString());
      
      this.showToast('Trajet annulé (hors ligne) - Synchronisation à la reconnexion', 3000, 'warning');
      return;
    }

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

  hasPendingUpdates(): boolean {
    return this.pendingUpdates.size > 0;
  }

  getPendingUpdatesCount(): number {
    return this.pendingUpdates.size;
  }
  
  getProfileImageUrl(): string {
    const user = this.authService.currentUser();
    if (!user) return '';
    
    const profileImage = (user as any).profileImage;
    if (profileImage) {
      if (profileImage.startsWith('data:')) {
        return profileImage;
      }
      return `data:image/jpeg;base64,${profileImage}`;
    }
    return '';
  }

  navigateToMyTrips() {
    console.log('Navigating to My Trips');
    if (!this.isOnline) {
      this.showToast('Mode hors ligne - Données limitées', 2000, 'warning');
    }
    this.router.navigate(['/my-trips'], {
      queryParams: { offline: !this.isOnline }
    });
  }

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
    
    if (!this.trips$) {
      console.error('❌ trips$ is null');
      this.showToast('Erreur: Données non disponibles', 2000, 'danger');
      return;
    }
    
    this.trips$.pipe(take(1)).subscribe(trips => {
      console.log('📋 Trips disponibles:', trips?.length || 0);
      
      if (!trips || trips.length === 0) {
        console.log('❌ Aucun trajet trouvé');
        this.showToast('Aucun trajet trouvé pour le GPS', 2000, 'warning');
        return;
      }
      
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

  private getTripDestination(trip: ITrip): string {
    if (trip.deliveries && trip.deliveries.length > 0) {
      const lastDelivery = trip.deliveries[trip.deliveries.length - 1];
      return lastDelivery.deliveryAddress || '';
    }
    return '';
  }

  navigateToAllTrips() {
    console.log('Navigating to All Trips');
    this.router.navigate(['/trips']);
  }
}