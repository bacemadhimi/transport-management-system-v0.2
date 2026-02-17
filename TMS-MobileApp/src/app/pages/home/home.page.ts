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

  trips$: Observable<ITrip[]> | null = null;
  totalDistance: number = 0;
  cancelledTripsCount: number = 0;
  private _notifSub: Subscription | null = null;

  constructor() {}

  ngOnInit() {
    this.loadTrips();
    this.notificationService.startPolling(5000);
    this._notifSub = this.notificationService.cancelledCount$.subscribe(count => {
      this.cancelledTripsCount = count;
    });
  }

  ngOnDestroy(): void {
    this._notifSub?.unsubscribe();
    this.notificationService.stopPolling();
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