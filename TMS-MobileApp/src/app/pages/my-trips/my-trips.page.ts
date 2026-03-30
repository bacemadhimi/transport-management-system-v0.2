import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';

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
export class MyTripsPage implements OnInit {
  trips: MyTrip[] = [];
  activeTrips: MyTrip[] = [];
  historyTrips: MyTrip[] = [];
  loading: boolean = true;
  driverId: number | null = null;
  error: string | null = null;

  private readonly API_URL = `${environment.apiUrl}/api/Trips`;

  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient
  ) {}

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
        return;
      }

      this.driverId = (user as any).driverId || user.id;
      console.log('📦 Loading trips for driver:', this.driverId);

      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      this.http.get<any[]>(`${this.API_URL}?status=all`, { headers })
        .subscribe({
          next: (trips) => {
            console.log('📦 Trips received:', trips.length);
            
            const driverTrips = trips.filter(trip => 
              trip.driverId === this.driverId || 
              (trip.driver && trip.driver.id === this.driverId)
            );

            console.log('🚛 Driver trips:', driverTrips.length);

            this.trips = driverTrips.map(trip => ({
              id: trip.id,
              tripReference: trip.tripReference || `TRIP-${trip.id}`,
              status: trip.status || trip.tripStatus || 'Planned',
              destination: this.getDestination(trip),
              estimatedDistance: trip.estimatedDistance || 0,
              estimatedDuration: trip.estimatedDuration || 0,
              deliveriesCount: trip.deliveriesCount || trip.deliveries?.length || 0,
              isActive: this.isActiveStatus(trip.status || trip.tripStatus),
              driverName: trip.driver?.name,
              truckImmatriculation: trip.truck?.immatriculation,
              startDate: trip.estimatedStartDate
            }));

            this.activeTrips = this.trips.filter(t => t.isActive);
            this.historyTrips = this.trips.filter(t => !t.isActive);

            console.log('✅ Active trips:', this.activeTrips.length);
            console.log('📚 History trips:', this.historyTrips.length);
            
            this.loading = false;
          },
          error: (err) => {
            console.error('❌ Error loading trips:', err);
            this.error = 'Erreur de chargement des trajets';
            this.trips = [];
            this.activeTrips = [];
            this.historyTrips = [];
            this.loading = false;
          }
        });

    } catch (error) {
      console.error('Error loading trips:', error);
      this.error = 'Erreur inattendue';
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
    const activeStatuses = ['Pending', 'Planned', 'Accepted', 'LoadingInProgress', 'DeliveryInProgress', 'InDelivery', 'Loading'];
    return activeStatuses.includes(status);
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
      'Refused': 'close',
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

  refreshData() {
    this.loadMyTrips();
  }
}