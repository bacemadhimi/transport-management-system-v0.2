import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
<<<<<<< HEAD
<<<<<<< HEAD
import { Router } from '@angular/router';
=======
import { environment } from 'src/environments/environment.prod';
>>>>>>> dev
=======
import { Router } from '@angular/router';
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d

interface TripHistory {
  id: number;
  tripReference: string;
  status: string;
  date: Date;
  distance: number;
  duration: number;
  deliveriesCount: number;
  destination?: string;
  truckImmatriculation?: string;
<<<<<<< HEAD
<<<<<<< HEAD
  deliveries?: any[];
=======
>>>>>>> dev
=======
  deliveries?: any[];
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
}

@Component({
  selector: 'app-trip-history',
  templateUrl: './trip-history.page.html',
  styleUrls: ['./trip-history.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule
  ]
})
export class TripHistoryPage implements OnInit {
  history: TripHistory[] = [];
  filteredHistory: TripHistory[] = [];
  filterStatus: string = 'all';
  loading: boolean = true;
  driverId: number | null = null;
  error: string | null = null;
<<<<<<< HEAD
<<<<<<< HEAD
  refreshing: boolean = false;
=======
>>>>>>> dev
=======
  refreshing: boolean = false;
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
  stats = {
    total: 0,
    completed: 0,
    cancelled: 0,
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
    refused: 0,
    totalDistance: 0
  };

  private readonly API_URL = 'http://localhost:5191/api/Trips';

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private router: Router
<<<<<<< HEAD
=======
    totalDistance: 0
  };

  private readonly API_URL = `${environment.apiUrl}/api/Trips`;

  constructor(
    private authService: AuthService,
    private http: HttpClient
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
  ) {}

  ngOnInit() {
    this.loadHistory();
  }

  async loadHistory() {
    this.loading = true;
    this.error = null;

    try {
<<<<<<< HEAD
<<<<<<< HEAD
=======
      // Get current user info
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
      const user = this.authService.currentUser();
      if (!user) {
        this.error = 'Utilisateur non connecté';
        this.loading = false;
        return;
      }

      this.driverId = (user as any).driverId || user.id;
      console.log('📚 Loading history for driver:', this.driverId);

<<<<<<< HEAD
<<<<<<< HEAD
=======
      // Get token
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
      // Use the new driver-specific endpoint with history filter
      this.http.get<any[]>(`${this.API_URL}/driver/${this.driverId}?status=history`, { headers })
        .subscribe({
          next: (trips) => {
            console.log('📦 Driver history trips:', trips.length);

            // Transform API data - already sorted by CreatedAt descending (newest first)
            this.history = trips.map(trip => ({
              id: trip.id,
              tripReference: trip.tripReference || `TRIP-${trip.id}`,
              status: trip.Status || 'Completed',
              date: new Date(trip.EstimatedEndDate || trip.EstimatedStartDate || trip.CreatedAt || Date.now()),
              distance: trip.EstimatedDistance || 0,
              duration: trip.EstimatedDuration || 0,
              deliveriesCount: trip.DeliveriesCount || 0,
              destination: this.getDestination(trip),
              truckImmatriculation: trip.TruckImmatriculation,
              deliveries: trip.Deliveries
            }));

            this.calculateStats();
            this.applyFilter();
<<<<<<< HEAD
=======
      // Fetch real trips from API
      this.http.get<any[]>(`${this.API_URL}?status=all`, { headers })
        .subscribe({
          next: (trips) => {
            console.log('📦 All trips received:', trips.length);
            
            // Filter completed/cancelled trips for this driver only
            const driverHistory = trips.filter(trip => {
              const isDriverTrip = trip.driverId === this.driverId || 
                                  (trip.driver && trip.driver.id === this.driverId);
              const isCompleted = ['Completed', 'Receipt', 'Cancelled', 'Refused']
                .includes(trip.status || trip.tripStatus);
              return isDriverTrip && isCompleted;
            });

            console.log('📚 Driver history trips:', driverHistory.length);

            // Transform API data
            this.history = driverHistory.map(trip => ({
              id: trip.id,
              tripReference: trip.tripReference || `TRIP-${trip.id}`,
              status: trip.status || trip.tripStatus || 'Completed',
              date: new Date(trip.estimatedEndDate || trip.estimatedStartDate || Date.now()),
              distance: trip.estimatedDistance || 0,
              duration: trip.estimatedDuration || 0,
              deliveriesCount: trip.deliveriesCount || trip.deliveries?.length || 0,
              destination: this.getDestination(trip),
              truckImmatriculation: trip.truck?.immatriculation
            }));

            // Calculate stats
            this.calculateStats();

            // Apply default filter
            this.applyFilter();
            
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
            this.loading = false;
          },
          error: (err) => {
            console.error('❌ Error loading history:', err);
            this.error = 'Erreur de chargement de l\'historique';
            this.history = [];
            this.filteredHistory = [];
            this.loading = false;
          }
        });

    } catch (error) {
      console.error('Error loading history:', error);
      this.error = 'Erreur inattendue';
      this.history = [];
      this.filteredHistory = [];
      this.loading = false;
    }
  }

  private getDestination(trip: any): string {
<<<<<<< HEAD
<<<<<<< HEAD
    if (trip.Deliveries && trip.Deliveries.length > 0) {
      const lastDelivery = trip.Deliveries[trip.Deliveries.length - 1];
      return lastDelivery.CustomerName || lastDelivery.DeliveryAddress || 'Destination inconnue';
=======
    if (trip.deliveries && trip.deliveries.length > 0) {
      const lastDelivery = trip.deliveries[trip.deliveries.length - 1];
      return lastDelivery.customerName || lastDelivery.deliveryAddress || 'Destination inconnue';
>>>>>>> dev
=======
    if (trip.Deliveries && trip.Deliveries.length > 0) {
      const lastDelivery = trip.Deliveries[trip.Deliveries.length - 1];
      return lastDelivery.CustomerName || lastDelivery.DeliveryAddress || 'Destination inconnue';
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
    }
    return 'Destination inconnue';
  }

  private calculateStats() {
    this.stats.total = this.history.length;
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
    this.stats.completed = this.history.filter(h => h.status === 'Completed' || h.status === 'Arrived' || h.status === 'Receipt').length;
    this.stats.cancelled = this.history.filter(h => h.status === 'Cancelled').length;
    this.stats.refused = this.history.filter(h => h.status === 'Refused').length;
    this.stats.totalDistance = this.history.reduce((sum, h) => sum + (h.distance || 0), 0);

<<<<<<< HEAD
=======
    this.stats.completed = this.history.filter(h => h.status === 'Completed' || h.status === 'Receipt').length;
    this.stats.cancelled = this.history.filter(h => h.status === 'Cancelled' || h.status === 'Refused').length;
    this.stats.totalDistance = this.history.reduce((sum, h) => sum + (h.distance || 0), 0);
    
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
    console.log('📊 Stats:', this.stats);
  }

  applyFilter() {
    if (this.filterStatus === 'all') {
      this.filteredHistory = this.history;
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
    } else if (this.filterStatus === 'completed') {
      this.filteredHistory = this.history.filter(h => 
        h.status === 'Completed' || h.status === 'Arrived' || h.status === 'Receipt'
      );
<<<<<<< HEAD
=======
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
    } else {
      this.filteredHistory = this.history.filter(h => h.status === this.filterStatus);
    }
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'Completed': 'success',
<<<<<<< HEAD
<<<<<<< HEAD
      'Arrived': 'success',
=======
>>>>>>> dev
=======
      'Arrived': 'success',
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
      'Receipt': 'success',
      'Cancelled': 'danger',
      'Refused': 'danger'
    };
    return colors[status] || 'medium';
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'Completed': 'checkmark-done-circle',
<<<<<<< HEAD
<<<<<<< HEAD
      'Arrived': 'checkmark-done-circle',
=======
>>>>>>> dev
=======
      'Arrived': 'checkmark-done-circle',
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
      'Receipt': 'checkmark-done-circle',
      'Cancelled': 'close-circle',
      'Refused': 'close-circle'
    };
    return icons[status] || 'document';
  }

  getStatusText(status: string): string {
    const texts: Record<string, string> = {
      'Completed': 'Terminé',
<<<<<<< HEAD
<<<<<<< HEAD
      'Arrived': 'Arrivé',
=======
>>>>>>> dev
=======
      'Arrived': 'Arrivé',
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
      'Receipt': 'Livré',
      'Cancelled': 'Annulé',
      'Refused': 'Refusé'
    };
    return texts[status] || status;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
<<<<<<< HEAD
<<<<<<< HEAD
      weekday: 'short',
=======
>>>>>>> dev
=======
      weekday: 'short',
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDistance(distance: number): string {
    return `${distance} km`;
  }

  formatDuration(duration: number): string {
    if (duration < 60) {
      return `${duration} min`;
    }
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return `${hours}h ${minutes > 0 ? minutes + 'min' : ''}`;
  }

  viewDetails(trip: TripHistory) {
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
    this.router.navigate([`/trip/${trip.id}`]);
  }

  doRefresh(event: any) {
    this.refreshing = true;
    this.loadHistory().finally(() => {
      this.refreshing = false;
      event.target.complete();
    });
<<<<<<< HEAD
=======
    console.log('View details:', trip);
  }

  refreshData() {
    this.loadHistory();
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
  }
}
