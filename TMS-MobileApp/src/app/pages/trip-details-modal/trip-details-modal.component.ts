import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ITrip, TripStatus } from '../../types/trip';
import { Network } from '@capacitor/network';

@Component({
  selector: 'app-trip-details-modal',
  templateUrl: './trip-details-modal.component.html',
  styleUrls: ['./trip-details-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class TripDetailsModalComponent implements OnInit, OnDestroy {
  @Input() trip!: ITrip;
  
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);
  
  // Offline mode flags
  isOnline: boolean = true;
  offlineMode: boolean = false;
  private networkListener: any;
  
  // Cached data
  cachedImages: Map<string, string> = new Map();
  imageLoadError: boolean = false;
  isUpdating: boolean = false;

  async ngOnInit() {
    await this.checkNetworkStatus();
    this.setupNetworkListener();
    this.loadTripFromCache();
    this.cacheTripImages();
    console.log('Trip Details:', this.trip);
  }

  ngOnDestroy() {
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
    Network.addListener('networkStatusChange', (status) => {
      this.isOnline = status.connected;
      this.offlineMode = !this.isOnline;
      console.log('Network changed:', this.isOnline ? 'online' : 'offline');
    });
  }

  private loadTripFromCache() {
    try {
      const cachedTrips = localStorage.getItem('offlineTrips');
      if (cachedTrips) {
        const trips = JSON.parse(cachedTrips) as ITrip[];
        const cachedTrip = trips.find(t => t.id === this.trip.id);
        if (cachedTrip) {
          this.trip = { ...this.trip, ...cachedTrip };
          console.log('Loaded trip from cache:', this.trip.id);
        }
      }
    } catch (error) {
      console.error('Error loading trip from cache:', error);
    }
  }

  private cacheTripImages() {
    if (!this.trip) return;

    if (this.trip.deliveries) {
      this.trip.deliveries.forEach((delivery, index) => {
        if (delivery.proofOfDelivery) {
          const cacheKey = `delivery_${this.trip.id}_${index}`;
          this.cachedImages.set(cacheKey, delivery.proofOfDelivery);
          this.saveImageToLocalStorage(cacheKey, delivery.proofOfDelivery);
        }
      });
    }

    if ((this.trip as any).proofImage) {
      const cacheKey = `trip_${this.trip.id}_proof`;
      this.cachedImages.set(cacheKey, (this.trip as any).proofImage);
      this.saveImageToLocalStorage(cacheKey, (this.trip as any).proofImage);
    }
  }

  private saveImageToLocalStorage(key: string, base64: string) {
    try {
      const images = localStorage.getItem('cachedTripImages');
      let imageCache: Record<string, string> = images ? JSON.parse(images) : {};
      imageCache[key] = base64;
      localStorage.setItem('cachedTripImages', JSON.stringify(imageCache));
    } catch (error) {
      console.error('Error saving image to cache:', error);
    }
  }

  private loadImageFromLocalStorage(key: string): string | null {
    try {
      const images = localStorage.getItem('cachedTripImages');
      if (images) {
        const imageCache = JSON.parse(images);
        return imageCache[key] || null;
      }
    } catch (error) {
      console.error('Error loading image from cache:', error);
    }
    return null;
  }

  private saveTripToCache() {
    try {
      const cachedTrips = localStorage.getItem('offlineTrips');
      let trips: ITrip[] = cachedTrips ? JSON.parse(cachedTrips) : [];
      
      const index = trips.findIndex(t => t.id === this.trip.id);
      if (index !== -1) {
        trips[index] = this.trip;
      } else {
        trips.push(this.trip);
      }
      
      localStorage.setItem('offlineTrips', JSON.stringify(trips));
      console.log('Trip saved to cache:', this.trip.id);
    } catch (error) {
      console.error('Error saving trip to cache:', error);
    }
  }

  close() {
    this.saveTripToCache();
    this.modalCtrl.dismiss();
  }

  getDataUrl(base64?: string | null, imageKey?: string): string | null {
    if (!base64) {
      if (imageKey) {
        const cached = this.loadImageFromLocalStorage(imageKey);
        if (cached) {
          return this.formatDataUrl(cached);
        }
      }
      return null;
    }
    return this.formatDataUrl(base64);
  }

  private formatDataUrl(base64: string): string | null {
    if (!base64) return null;
    
    if (base64.startsWith('data:')) {
      return base64;
    }
    
    if (base64.startsWith('/9j')) return 'data:image/jpeg;base64,' + base64;
    if (base64.startsWith('iVBORw0KG')) return 'data:image/png;base64,' + base64;
    return 'data:image/jpeg;base64,' + base64;
  }

  showOfflineIndicator(): boolean {
    return this.offlineMode;
  }

  getOfflineMessage(): string {
    return 'Vous visualisez des données de trajet en cache. Certaines informations peuvent ne pas être à jour.';
  }

  onImageError(event: any) {
    this.imageLoadError = true;
    event.target.style.display = 'none';
    console.error('Error loading image');
  }

  private async showToast(message: string, duration: number, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      color,
      position: 'top'
    });
    await toast.present();
  }

  /**
   * Update trip status
   * @param newStatus - The new status to set for the trip
   */
  async updateStatus(newStatus: string) {
    if (this.isUpdating) {
      console.log('Update already in progress');
      return;
    }

    this.isUpdating = true;

    try {
      if (!this.isOnline) {
        await this.showToast(
          'Vous êtes hors ligne. Le statut sera mis à jour lorsque la connexion sera rétablie.',
          3000,
          'warning'
        );
        
        this.savePendingStatusUpdate(newStatus);
        this.trip.tripStatus = newStatus as TripStatus;
        this.saveTripToCache();
        
        this.modalCtrl.dismiss({
          action: 'updateStatus',
          tripId: this.trip.id,
          newStatus: newStatus,
          pendingSync: true
        });
        
        await this.showToast(
          'Statut mis à jour localement. Synchronisation en attente.',
          2000,
          'success'
        );
      } else {
        await this.simulateApiCall(newStatus);
        
        this.trip.tripStatus = newStatus as TripStatus;
        this.saveTripToCache();
        
        this.modalCtrl.dismiss({
          action: 'updateStatus',
          tripId: this.trip.id,
          newStatus: newStatus,
          success: true
        });
        
        await this.showToast(
          `Statut du trajet mis à jour : ${this.getStatusFrenchLabel(newStatus)}`,
          2000,
          'success'
        );
      }
    } catch (error) {
      console.error('Error updating status:', error);
      await this.showToast(
        'Erreur lors de la mise à jour du statut. Veuillez réessayer.',
        3000,
        'danger'
      );
    } finally {
      this.isUpdating = false;
    }
  }

  private savePendingStatusUpdate(newStatus: string) {
    try {
      const pending = localStorage.getItem('pendingStatusUpdates');
      let updates: any[] = pending ? JSON.parse(pending) : [];
      updates.push({
        tripId: this.trip.id,
        newStatus: newStatus,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('pendingStatusUpdates', JSON.stringify(updates));
      console.log('Pending status update saved:', newStatus);
    } catch (error) {
      console.error('Error saving pending update:', error);
    }
  }

  private simulateApiCall(newStatus: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Status updated to: ${newStatus}`);
        resolve();
      }, 1000);
    });
  }

  private getStatusFrenchLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'Planned': 'Planifié',
      'Accepted': 'Accepté',
      'LoadingInProgress': 'Chargement en cours',
      'DeliveryInProgress': 'Livraison en cours',
      'Receipt': 'Réceptionné',
      'Cancelled': 'Annulé'
    };
    return labels[status] || status;
  }
  /**
 * Obtenir le texte d'affichage du statut en français
 */
getStatusText(status: string): string {
  const statusTextMap: { [key: string]: string } = {
    'Pending': '⏳ En attente',
    'Planned': '📋 Planifié',
    'Accepted': '✅ Accepté',
    'LOADING': '📦 Chargement',
    'Loading': '📦 Chargement',
    'LoadingInProgress': '📦 Chargement',
    'InDelivery': '🚚 Livraison',
    'DeliveryInProgress': '🚚 Livraison',
    'Receipt': '🎉 Terminé',
    'Completed': '🎉 Terminé',
    'Cancelled': '❌ Annulé'
  };
  return statusTextMap[status] || status;
}

/**
 * Obtenir la classe CSS pour le statut (en minuscules)
 */
getStatusClass(status: string): string {
  const classMap: { [key: string]: string } = {
    'Pending': 'pending',
    'Planned': 'planned',
    'Accepted': 'accepted',
    'LOADING': 'loading',
    'Loading': 'loading',
    'LoadingInProgress': 'loading',
    'InDelivery': 'delivery',
    'DeliveryInProgress': 'delivery',
    'Receipt': 'receipt',
    'Completed': 'receipt',
    'Cancelled': 'cancelled'
  };
  return classMap[status] || 'default';
}
}