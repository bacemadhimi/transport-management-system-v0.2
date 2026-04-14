import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TripService } from '../../services/trip.service';
import { SignalRService } from '../../services/signalr.service';
import { Subscription } from 'rxjs';

interface MyTrip {
  id: number;
  tripReference: string;
  status: string;
  destination: string;
  estimatedDistance: number;
  estimatedDuration: number;
  deliveriesCount: number;
  isActive: boolean;
  driverName?: string;
  truckImmatriculation?: string;
  startDate?: string;
}

@Component({
  selector: 'app-my-trips',
  templateUrl: './my-trips.page.html',
  styleUrls: ['./my-trips.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule
  ]
})
export class MyTripsPage implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private tripService = inject(TripService);
  private toastController = inject(ToastController);
  private signalRService = inject(SignalRService);

  trips: MyTrip[] = [];
  activeTrips: MyTrip[] = [];
  historyTrips: MyTrip[] = [];
  loading: boolean = true;
  error: string | null = null;
  private signalRSubscription?: Subscription;

  ngOnInit() {
    this.loadMyTrips();

    // ✅ Écouter les changements de statut en temps réel via BehaviorSubject - MISE À JOUR EN MÉMOIRE
    this.signalRSubscription = this.signalRService.tripStatusChanged$.subscribe((update: any) => {
      if (update && (update.TripId || update.tripId)) {
        const tripId = update.TripId || update.tripId;
        const newStatus = update.NewStatus || update.newStatus || update.status;
        console.log('🚗 My Trips received TripStatusChanged:', tripId, '→', newStatus);
        
        // ✅ Mettre à jour DIRECTEMENT dans localStorage
        const offlineTrips = localStorage.getItem('offlineTrips');
        if (offlineTrips) {
          try {
            const trips = JSON.parse(offlineTrips);
            const tripIndex = trips.findIndex((t: any) => t.id === tripId);
            if (tripIndex !== -1) {
              trips[tripIndex].tripStatus = newStatus;
              localStorage.setItem('offlineTrips', JSON.stringify(trips));
              console.log(`✅ My Trips: Trip ${tripId} status updated in localStorage to ${newStatus}`);
              
              // ✅ Recharger depuis localStorage (pas l'API)
              this.loadMyTrips();
            } else {
              console.warn(`⚠️ My Trips: Trip ${tripId} not found, reloading from API`);
              this.loadMyTrips();
            }
          } catch (e) {
            console.error('❌ My Trips: Error updating localStorage:', e);
            this.loadMyTrips();
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

  async loadMyTrips() {
    this.loading = true;
    this.error = null;

    try {
      const user = this.authService.currentUser();
      const token = localStorage.getItem('token');
      
      if (!user || !token) {
        this.error = 'Utilisateur non connecté';
        this.loading = false;
        await this.showToast('Veuillez vous connecter', 'danger');
        return;
      }

      console.log('📡 Loading trips from API...');

      // Charger depuis l'API directement
      this.tripService.getAllTrips().subscribe({
        next: (trips: any[]) => {
          console.log('📦 Trips received from API:', trips.length);
          console.log('🔍 Sample trip structure:', trips[0]);

          // Filtrer les trajets du conducteur
          const driverId = (user as any).driverId || user.id;
          const userEmail = user.email;
          
          const userTrips = trips.filter((trip: any) => {
            const tripData = trip.data || trip;
            return tripData.driverId === driverId || 
                   tripData.driver?.id === driverId ||
                   tripData.driver?.email === userEmail;
          });

          console.log('🚗 User trips:', userTrips.length);

          // Mapper avec les VRAIES données
          this.trips = userTrips.map((trip: any) => {
            let destination = 'Destination';
            let distance = 0;
            let deliveriesCount = 0;
            let driverName = '';
            let truckImmat = '';

            // Destination et livraisons
            if (trip.deliveries && trip.deliveries.length > 0) {
              const lastDelivery = trip.deliveries[trip.deliveries.length - 1];
              destination = lastDelivery.customerName || 
                           lastDelivery.customer?.companyName ||
                           lastDelivery.customer?.name ||
                           lastDelivery.deliveryAddress || 
                           `Livraison #${lastDelivery.sequence}`;
              deliveriesCount = trip.deliveries.length;
            } else if (trip.destination) {
              destination = trip.destination;
            } else if (trip.dropoffLocation) {
              destination = trip.dropoffLocation.address || trip.dropoffLocation.name || 'Destination';
            }

            // Distance
            distance = trip.estimatedDistance || 0;

            // Durée
            const duration = trip.estimatedDuration || 0;

            // Chauffeur
            driverName = trip.driver?.name || trip.driverName || '';

            // Véhicule
            truckImmat = trip.truck?.immatriculation || trip.truckImmatriculation || '';

            return {
              id: trip.id,
              tripReference: trip.tripReference || `TRIP-${trip.id}`,
              status: trip.tripStatus || trip.status || 'Planned',
              destination: destination,
              estimatedDistance: distance,
              estimatedDuration: duration,
              deliveriesCount: deliveriesCount,
              isActive: this.isActiveStatus(trip.tripStatus || trip.status),
              driverName: driverName,
              truckImmatriculation: truckImmat,
              startDate: trip.estimatedStartDate
            };
          });

          // Trier par date (plus récent en premier)
          this.trips.sort((a, b) => {
            const dateA = new Date(a.startDate || 0).getTime();
            const dateB = new Date(b.startDate || 0).getTime();
            return dateB - dateA;
          });

          // Séparer les trajets actifs et historiques
          this.activeTrips = this.trips.filter(t => t.isActive);
          this.historyTrips = this.trips.filter(t => !t.isActive);

          console.log('✅ Active trips:', this.activeTrips.length);
          console.log('📚 History trips:', this.historyTrips.length);
          console.log('📋 Sample trip:', this.trips[0]);

          this.loading = false;
          
          if (this.trips.length === 0) {
            this.error = 'Aucun trajet assigné pour le moment';
          }
        },
        error: (err) => {
          console.error('❌ Error loading trips:', err);
          this.error = 'Erreur de chargement des trajets';
          this.loading = false;
        }
      });
    } catch (error) {
      console.error('❌ Error:', error);
      this.error = 'Erreur inattendue';
      this.loading = false;
    }
  }

  private isActiveStatus(status: string): boolean {
    const inactiveStatuses = ['Receipt', 'Completed', 'Cancelled', 'Refused'];
    return !inactiveStatuses.includes(status);
  }

  /**
   * Formater la date
   */
  formatDate(dateString: string): string {
    if (!dateString) return '';
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
   * Obtenir l'icône du statut
   */
  getStatusIcon(status: string): string {
    const iconMap: { [key: string]: string } = {
      'Receipt': 'checkmark-done',
      'Completed': 'checkmark-done',
      'Cancelled': 'close',
      'Refused': 'ban',
      'Pending': 'time',
      'Planned': 'calendar',
      'Accepted': 'checkmark',
      'Loading': 'cube',
      'LoadingInProgress': 'cube',
      'InDelivery': 'truck',
      'DeliveryInProgress': 'truck'
    };
    return iconMap[status] || 'help';
  }

  getStatusText(status: string): string {
    const texts: Record<string, string> = {
      'Pending': '⏳ En attente',
      'Planned': '📋 Planifié',
      'Accepted': '✅ Accepté',
      'Loading': '📦 Chargement',
      'LoadingInProgress': '📦 Chargement',
      'InDelivery': '🚚 Livraison',
      'DeliveryInProgress': '🚚 Livraison',
      'Completed': '🎉 Terminé',
      'Receipt': '🎉 Terminé',
      'Cancelled': '❌ Annulé',
      'Refused': '⛔ Refusé'
    };
    return texts[status] || status;
  }

  viewTrip(trip: MyTrip) {
    localStorage.setItem('selectedTrip', JSON.stringify(trip));
    this.router.navigate([`/trip/${trip.id}`]);
  }

  viewGPS(trip: MyTrip) {
    this.router.navigate([`/gps-tracking`], {
      queryParams: {
        tripId: trip.id,
        tripReference: trip.tripReference,
        destination: trip.destination
      }
    });
  }

  async refreshData() {
    await this.showToast('Actualisation des trajets...', 'primary', 'bottom');
    await this.loadMyTrips();
  }

  private async showToast(message: string, color: string, position: 'top' | 'bottom' | 'middle' = 'top') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position
    });
    await toast.present();
  }
}
