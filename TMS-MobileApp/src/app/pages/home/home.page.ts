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
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { NotificationService } from '../../services/notification.service';
import { GPSTrackingService } from '../../services/gps-tracking.service';
import { NotificationStorageService } from '../../services/notification-storage.service';

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
  gpsService = inject(GPSTrackingService);
  notificationStorage = inject(NotificationStorageService);

  trips$: Observable<ITrip[]> | null = null;
  totalDistance: number = 0;
  cancelledTripsCount: number = 0;
  unreadNotificationsCount: number = 0;
  private _notifSub: Subscription | null = null;
  private _gpsSub: Subscription | null = null;
  private _unreadSub: Subscription | null = null;

  constructor() {}

  async ngOnInit() {
    this.loadTrips();
    this.notificationService.startPolling(5000);
    this._notifSub = this.notificationService.cancelledCount$.subscribe(count => {
      this.cancelledTripsCount = count;
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
    this._notifSub?.unsubscribe();
    this._gpsSub?.unsubscribe();
    this._unreadSub?.unsubscribe();
    this.notificationService.stopPolling();
    this.gpsService.disconnect();
  }

  loadTrips() {
    const userEmail = this.authService.currentUser()?.email;
    this.trips$ = this.tripService.getAllTrips().pipe(
      map(trips => {
        if (userEmail) {
          return trips.filter(trip => trip.driver?.email === userEmail);
        }
        return trips;
      })
    );
    console.log('Loaded trips:', this.trips$);
    
    this.trips$.subscribe(trips => {
      console.log('Trips data:', trips);
      this.totalDistance = this.calculateTotalDistance(trips);
    });
  }

  
  getCompletedTripsCount(): number {
   
    return 0; 
  }

  
  getPendingTripsCount(): number {
    
    return 0; 
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
      componentProps: { trip },
      cssClass: 'trip-details-modal'
    });

    await modal.present();
  }

  logout() {
    this.authService.logout();
  }

  navigateToProfile() {
    console.log('Navigate to profile');
  }

  navigateToTrips() {
    console.log('Navigate to trips');
  }

  updateTripStatus(trip: ITrip, newStatus: string) {
   
    if (newStatus === 'Receipt') {
      this.showReceiptAlert(trip);
      return;
    }

    const oldStatus = trip.tripStatus;
    trip.updating = true;

    this.tripService.updateTripStatus(trip.id, { status: newStatus }).subscribe({
      next: async (response) => {
        console.log('Status updated successfully', response);
        trip.updating = false;
        trip.tripStatus = newStatus as TripStatus;
        const toast = await this.toastController.create({
          message: 'Trip status updated successfully',
          duration: 2000,
          color: 'success'
        });
        toast.present();
      },
      error: async (err) => {
        console.error('Error updating trip status', err);
        trip.updating = false;
        trip.tripStatus = oldStatus; 
        const toast = await this.toastController.create({
          message: 'Failed to update trip status',
          duration: 2000,
          color: 'danger'
        });
        toast.present();
      }
    });
  }

  private readFileAsDataURL(file: File): Promise<string> {
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
      if (!file) {
        return; 
      }

      if (!['image/png', 'image/jpeg'].includes(file.type)) {
        const t = await this.toastController.create({ message: 'Veuillez sélectionner un fichier PNG ou JPEG.', duration: 2000, color: 'warning' });
        t.present();
        return;
      }

      try {
        const dataUrl = await this.readFileAsDataURL(file);
        
        const pureBase64 = dataUrl.split(',')[1];
        await this.performStatusUpdateWithProof(trip, 'Receipt', pureBase64);
      } catch (err) {
        console.error('Error reading file', err);
        const t = await this.toastController.create({ message: 'Erreur lors de la lecture de l\'image.', duration: 2000, color: 'danger' });
        t.present();
      }
    };

    
    document.body.appendChild(fileInput);
    fileInput.click();
   
    setTimeout(() => fileInput.remove(), 1000);
  }

  private async performStatusUpdateWithProof(trip: ITrip, newStatus: string, proofBase64: string) {
    const oldStatus = trip.tripStatus;
    trip.updating = true;

    this.tripService.updateTripStatus(trip.id, { status: newStatus, proofImage: proofBase64 }).subscribe({
      next: async (response) => {
        console.log('Status updated with proof', response);
        trip.updating = false;
        trip.tripStatus = newStatus as TripStatus;
       
        if (trip.deliveries) {
          trip.deliveries.forEach(d => d.proofOfDelivery = proofBase64);
        }
        const toast = await this.toastController.create({ message: 'Réception confirmée avec preuve', duration: 2000, color: 'success' });
        toast.present();
      },
      error: async (err) => {
        console.error('Error updating trip status with proof', err);
        trip.updating = false;
        trip.tripStatus = oldStatus;
        const toast = await this.toastController.create({ message: 'Erreur lors de la confirmation de la réception', duration: 2000, color: 'danger' });
        toast.present();
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
      header: 'Annuler le voyage',
      message: 'Pourquoi voulez-vous annuler ce voyage ?',
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
          role: 'cancel',
          handler: () => {
            console.log('Cancel action cancelled');
          }
        },
        {
          text: 'Confirmer',
          handler: (data) => {
            const reason = data.reason;
            if (reason && reason.trim()) {
              this.cancelTrip(trip, reason.trim());
            } else {
             
              this.toastController.create({
                message: 'Veuillez fournir une raison pour l\'annulation.',
                duration: 2000,
                color: 'warning'
              }).then(toast => toast.present());
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async showReceiptAlert(trip: ITrip) {
    const alert = await this.alertController.create({
      header: 'Veuillez ajouter une preuve de livraison',
      message: 'Veuillez ajouter une preuve de livraison',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel',
          handler: () => {
            
          }
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
    
    this.tripService.cancelTrip(trip.id, { message: reason }).subscribe({
      next: async (response) => {
        console.log('Trip cancelled successfully', response);
        trip.tripStatus = TripStatus.Cancelled;
        trip.message = reason;
        const toast = await this.toastController.create({
          message: 'Voyage annulé avec succès',
          duration: 2000,
          color: 'success'
        });
        toast.present();
      },
      error: async (err) => {
        console.error('Error cancelling trip', err);
        const toast = await this.toastController.create({
          message: 'Erreur lors de l\'annulation du voyage',
          duration: 2000,
          color: 'danger'
        });
        toast.present();
      }
    });
  }

  navigateToCancelledTrips() {
    console.log('Navigate to cancelled trips clicked');
    this.router.navigate(['/cancelled-trips']);
    
  }

  openNotifications() {
    this.router.navigate(['/notifications']);
  }
}