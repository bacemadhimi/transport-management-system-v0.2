import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

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
  deliveries?: any[];
  truck?: any;
  driver?: any;
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
export class MyTripsPage implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastController = inject(ToastController);

  trips: MyTrip[] = [];
  activeTrips: MyTrip[] = [];
  historyTrips: MyTrip[] = [];
  loading: boolean = true;
  error: string | null = null;

  ngOnInit() {
    this.loadMyTrips();
  }

  async loadMyTrips() {
    this.loading = true;
    this.error = null;

    try {
      const user = this.authService.currentUser();
      if (!user) {
        this.error = 'Utilisateur non connecté';
        this.loading = false;
        await this.showToast('Veuillez vous connecter', 'danger');
        return;
      }

      console.log('📦 Loading trips for user:', user.email, 'role:', user.role);

      // Charger depuis localStorage comme la page Home
      const offlineTrips = localStorage.getItem('offlineTrips');
      
      if (!offlineTrips) {
        console.warn('⚠️ No trips found in localStorage');
        this.error = 'Aucun trajet disponible. Revenez à la page d\'accueil pour synchroniser les données.';
        this.loading = false;
        return;
      }

      let allTrips = JSON.parse(offlineTrips);
      console.log('📊 Total trips in storage:', allTrips.length);

      // Filtrer les trajets du conducteur connecté
      const driverId = (user as any).driverId || user.id;
      const userEmail = user.email;
      
      let userTrips = allTrips.filter((trip: any) => {
        // Filtrer par driverId ou par email du conducteur
        return trip.driverId === driverId || 
               trip.driver?.id === driverId ||
               trip.driver?.email === userEmail;
      });

      console.log('🚗 User trips count:', userTrips.length);

      // Mapper les trajets
      this.trips = userTrips.map((trip: any) => ({
        id: trip.id,
        tripReference: trip.tripReference || `TRIP-${trip.id}`,
        status: trip.tripStatus || trip.status || 'Planned',
        destination: this.getDestination(trip),
        estimatedDistance: trip.estimatedDistance || 0,
        estimatedDuration: trip.estimatedDuration || 0,
        deliveriesCount: trip.deliveries?.length || 0,
        isActive: this.isActiveStatus(trip.tripStatus || trip.status),
        driverName: trip.driver?.name,
        truckImmatriculation: trip.truck?.immatriculation,
        startDate: trip.estimatedStartDate,
        deliveries: trip.deliveries || [],
        truck: trip.truck,
        driver: trip.driver
      }));

      // Séparer les trajets actifs et historiques
      this.activeTrips = this.trips.filter(t => t.isActive);
      this.historyTrips = this.trips.filter(t => !t.isActive);

      console.log('✅ Active trips:', this.activeTrips.length);
      console.log('📚 History trips:', this.historyTrips.length);
      console.log('📋 Active statuses:', this.activeTrips.map(t => t.status));
      console.log('📋 History statuses:', this.historyTrips.map(t => t.status));

      this.loading = false;
      
      if (this.trips.length === 0) {
        this.error = 'Aucun trajet assigné pour le moment';
      }
    } catch (error) {
      console.error('❌ Error loading trips:', error);
      this.error = 'Erreur de chargement des trajets. Revenez à l\'accueil et réessayez.';
      this.trips = [];
      this.activeTrips = [];
      this.historyTrips = [];
      this.loading = false;
    }
  }

  private getDestination(trip: any): string {
    if (trip.deliveries && trip.deliveries.length > 0) {
      const lastDelivery = trip.deliveries[trip.deliveries.length - 1];
      return lastDelivery.customerName || lastDelivery.deliveryAddress || 'Destination inconnue';
    }
    return 'Destination inconnue';
  }

  private isActiveStatus(status: string): boolean {
    // Les statuts actifs sont ceux qui ne sont pas terminés ou annulés
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
      'InDelivery': 'boat',
      'DeliveryInProgress': 'boat'
    };
    return iconMap[status] || 'help';
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'Planned': 'medium',
      'Pending': 'warning',
      'Accepted': 'primary',
      'LoadingInProgress': 'warning',
      'Loading': 'warning',
      'DeliveryInProgress': 'primary',
      'InDelivery': 'primary',
      'Completed': 'success',
      'Receipt': 'success',
      'Cancelled': 'danger',
      'Refused': 'danger'
    };
    return colors[status] || 'medium';
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
    // Stocker le trajet sélectionné pour les détails
    localStorage.setItem('selectedTrip', JSON.stringify(trip));
    this.router.navigate([`/trip/${trip.id}`]);
  }

  viewGPS(trip: MyTrip) {
    this.router.navigate([`/gps-tracking`], {
      queryParams: {
        tripId: trip.id,
        tripReference: trip.tripReference
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
