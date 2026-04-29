import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TripService } from '../../services/trip.service';
import { SignalRService } from '../../services/signalr.service';
import { Subscription } from 'rxjs';
import { TripDetailsModalComponent } from '../trip-details-modal/trip-details-modal.component';

interface TripHistory {
  id: number;
  tripReference: string;
  status: string;
  date: string;
  distance: number;
  deliveriesCount: number;
  destination: string;
  driverName?: string;
  truckImmatriculation?: string;
  estimatedStartDate: string;
  estimatedEndDate?: string;
}

@Component({
  selector: 'app-trip-history',
  templateUrl: './trip-history.page.html',
  styleUrls: ['./trip-history.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class TripHistoryPage implements OnInit, OnDestroy {
  private router = inject(Router);
  private modalController = inject(ModalController);
  private authService = inject(AuthService);
  private tripService = inject(TripService);
  private toastController = inject(ToastController);
  private signalRService = inject(SignalRService);

  history: TripHistory[] = [];
  filteredHistory: TripHistory[] = [];
  filterStatus: string = 'all';
  loading: boolean = true;
  private signalRSubscription?: Subscription;

  ngOnInit() {
    this.loadHistory();

    // ✅ Écouter les changements de statut en temps réel via BehaviorSubject - MISE À JOUR EN MÉMOIRE
    this.signalRSubscription = this.signalRService.tripStatusChanged$.subscribe((update: any) => {
      if (update && (update.TripId || update.tripId)) {
        const tripId = update.TripId || update.tripId;
        const newStatus = update.NewStatus || update.newStatus || update.status;
        console.log('📜 History received TripStatusChanged:', tripId, '→', newStatus);
        
        // ✅ Mettre à jour DIRECTEMENT dans localStorage
        const offlineTrips = localStorage.getItem('offlineTrips');
        if (offlineTrips) {
          try {
            const trips = JSON.parse(offlineTrips);
            const tripIndex = trips.findIndex((t: any) => t.id === tripId);
            if (tripIndex !== -1) {
              trips[tripIndex].tripStatus = newStatus;
              localStorage.setItem('offlineTrips', JSON.stringify(trips));
              console.log(`✅ History: Trip ${tripId} status updated in localStorage to ${newStatus}`);
              
              // ✅ Recharger depuis localStorage (pas l'API)
              this.loadHistory();
            } else {
              console.warn(`⚠️ History: Trip ${tripId} not found, reloading from API`);
              this.loadHistory();
            }
          } catch (e) {
            console.error('❌ History: Error updating localStorage:', e);
            this.loadHistory();
          }
        }
      }
    });
  }

  ngOnDestroy() {
    if (this.signalRSubscription) {
      this.signalRSubscription.unsubscribe();
    }
  }

  async loadHistory() {
    this.loading = true;
    try {
      const user = this.authService.currentUser();
      const token = localStorage.getItem('token');
      
      if (!user || !token) {
        await this.showToast('Veuillez vous connecter', 'danger');
        this.loading = false;
        return;
      }

      console.log('📡 Loading history from API...');

      // Charger depuis l'API directement
      this.tripService.getAllTrips().subscribe({
        next: (trips: any[]) => {
          console.log('📦 Trips received from API:', trips.length);
          
          // Log TRÈS détaillé pour voir la structure exacte
          const firstTrip = trips[0];
          console.log('🔍 Trip keys:', Object.keys(firstTrip));
          console.log('🔍 Trip estimatedDistance:', firstTrip.estimatedDistance);
          console.log('🔍 Trip deliveries:', firstTrip.deliveries);
          console.log('🔍 Trip driver:', firstTrip.driver);
          console.log('🔍 Trip full JSON:', JSON.stringify(firstTrip, null, 2).substring(0, 1000));

          // Filtrer les trajets du conducteur
          const driverId = (user as any).driverId || user.id;
          const userEmail = user.email;
          
          const userTrips = trips.filter((trip: any) => {
            const tripData = trip.data || trip; // Parfois dans data
            return tripData.driverId === driverId || 
                   tripData.driver?.id === driverId ||
                   tripData.driver?.email === userEmail;
          });

          console.log('🚗 User trips:', userTrips.length);

          // Mapper avec les VRAIES données
          this.history = userTrips.map((trip: any) => {
            const tripData = trip.data || trip;
            
            let destination = 'Destination';
            let distance = 0;
            let deliveriesCount = 0;
            let driverName = '';
            let truckImmat = '';

            // Destination et livraisons
            if (tripData.deliveries && tripData.deliveries.length > 0) {
              const lastDelivery = tripData.deliveries[tripData.deliveries.length - 1];
              destination = lastDelivery.customerName || 
                           lastDelivery.customer?.companyName ||
                           lastDelivery.deliveryAddress || 
                           `Livraison #${lastDelivery.sequence}`;
              deliveriesCount = tripData.deliveries.length;
            } else if (tripData.destination) {
              destination = tripData.destination;
            } else if (tripData.dropoffLocation) {
              destination = tripData.dropoffLocation.address || tripData.dropoffLocation.name || 'Destination';
            }

            // Distance
            distance = tripData.estimatedDistance || 0;

            // Chauffeur
            driverName = tripData.driver?.name || tripData.driverName || '';

            // Véhicule
            truckImmat = tripData.truck?.immatriculation || tripData.truckImmatriculation || '';

            return {
              id: tripData.id,
              tripReference: tripData.tripReference || `TRIP-${tripData.id}`,
              status: tripData.tripStatus || tripData.status || 'Planned',
              date: tripData.actualEndDate || tripData.estimatedEndDate || tripData.estimatedStartDate,
              distance: distance,
              deliveriesCount: deliveriesCount,
              destination: destination,
              driverName: driverName,
              truckImmatriculation: truckImmat,
              estimatedStartDate: tripData.estimatedStartDate,
              estimatedEndDate: tripData.estimatedEndDate
            };
          });

          console.log('✅ History loaded:', this.history.length);
          console.log('📋 Sample:', this.history[0]);

          this.applyFilter();
          this.loading = false;
        },
        error: (err) => {
          console.error('❌ Error loading history:', err);
          this.showToast('Erreur de chargement', 'danger');
          this.loading = false;
        }
      });
    } catch (error) {
      console.error('❌ Error:', error);
      await this.showToast('Erreur inattendue', 'danger');
      this.loading = false;
    }
  }

  /**
   * Obtenir le texte d'affichage du statut
   */
  getStatusText(status: string): string {
    const statusTextMap: { [key: string]: string } = {
      'Receipt': '🎉 Terminé',
      'Completed': '🎉 Terminé',
      'Cancelled': '❌ Annulé',
      'Refused': '⛔ Refusé',
      'Pending': '⏳ En attente',
      'Planned': '📋 Planifié',
      'Accepted': '✅ Accepté',
      'Loading': '📦 Chargement',
      'LoadingInProgress': '📦 Chargement',
      'InDelivery': '🚚 Livraison',
      'DeliveryInProgress': '🚚 Livraison'
    };
    return statusTextMap[status] || status;
  }

  /**
   * Obtenir l'icône du statut
   */
  getStatusIcon(status: string): string {
    const iconMap: { [key: string]: string } = {
      'Receipt': 'checkmark-done-circle',
      'Completed': 'checkmark-done-circle',
      'Cancelled': 'close-circle',
      'Refused': 'ban',
      'Pending': 'time',
      'Planned': 'calendar',
      'Accepted': 'checkmark-circle',
      'Loading': 'cube',
      'LoadingInProgress': 'cube',
      'InDelivery': 'truck',
      'DeliveryInProgress': 'truck'
    };
    return iconMap[status] || 'help-circle';
  }

  /**
   * Obtenir le gradient du statut
   */
  getStatusGradient(status: string): string {
    const gradientMap: { [key: string]: string } = {
      'Receipt': 'linear-gradient(135deg, #4caf50, #45a049)',
      'Completed': 'linear-gradient(135deg, #4caf50, #45a049)',
      'Cancelled': 'linear-gradient(135deg, #f44336, #da190b)',
      'Refused': 'linear-gradient(135deg, #f44336, #da190b)',
      'Pending': 'linear-gradient(135deg, #ff8c00, #ffcc00)',
      'Planned': 'linear-gradient(135deg, #ff8c00, #ffcc00)',
      'Accepted': 'linear-gradient(135deg, #4caf50, #45a049)',
      'Loading': 'linear-gradient(135deg, #5856d6, #5e5ce0)',
      'LoadingInProgress': 'linear-gradient(135deg, #5856d6, #5e5ce0)',
      'InDelivery': 'linear-gradient(135deg, #ff9500, #ff9f0a)',
      'DeliveryInProgress': 'linear-gradient(135deg, #ff9500, #ff9f0a)'
    };
    return gradientMap[status] || 'linear-gradient(135deg, #94a3b8, #64748b)';
  }

  /**
   * Obtenir la couleur du texte pour le badge
   */
  getStatusTextColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'Receipt': '#ffffff',
      'Completed': '#ffffff',
      'Cancelled': '#ffffff',
      'Refused': '#ffffff',
      'Pending': '#000000',
      'Planned': '#000000',
      'Accepted': '#ffffff',
      'Loading': '#ffffff',
      'LoadingInProgress': '#ffffff',
      'InDelivery': '#ffffff',
      'DeliveryInProgress': '#ffffff'
    };
    return colorMap[status] || '#ffffff';
  }

  /**
   * Appliquer le filtre
   */
  applyFilter() {
    console.log('🔍 Applying filter:', this.filterStatus);
    
    if (this.filterStatus === 'all') {
      this.filteredHistory = this.history;
    } else if (this.filterStatus === 'Completed') {
      this.filteredHistory = this.history.filter(trip =>
        trip.status === 'Receipt' || trip.status === 'Completed'
      );
    } else if (this.filterStatus === 'Cancelled') {
      this.filteredHistory = this.history.filter(trip =>
        trip.status === 'Cancelled' || trip.status === 'Refused'
      );
    }
    
    console.log('✅ Filtered history:', this.filteredHistory.length, 'trips');
  }

  /**
   * Formater la date
   */
  formatDate(dateString: string): string {
    if (!dateString) return 'Date non disponible';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Voir les détails du trajet
   */
  async viewDetails(trip: TripHistory) {
    // Sauvegarder pour le modal
    localStorage.setItem('selectedTripId', trip.id.toString());
    
    this.router.navigate(['/trip-history']);
    
    const toast = await this.toastController.create({
      message: 'Détails : ' + trip.tripReference,
      duration: 2000,
      color: 'primary',
      position: 'top'
    });
    await toast.present();
  }

  /**
   * Naviguer vers la carte GPS
   */
  async viewOnGPS(trip: TripHistory) {
    this.router.navigate(['/gps-tracking'], {
      queryParams: {
        tripId: trip.id,
        tripReference: trip.tripReference,
        destination: trip.destination
      }
    });
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
