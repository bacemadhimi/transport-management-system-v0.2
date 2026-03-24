import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

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
  deliveries?: any[];
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
  refreshing: boolean = false;
  stats = {
    total: 0,
    completed: 0,
    cancelled: 0,
    refused: 0,
    totalDistance: 0
  };

  private readonly API_URL = 'http://localhost:5191/api/Trips';

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadHistory();
  }

  async loadHistory() {
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
      console.log('📚 Loading history for driver:', this.driverId);

      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

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
    if (trip.Deliveries && trip.Deliveries.length > 0) {
      const lastDelivery = trip.Deliveries[trip.Deliveries.length - 1];
      return lastDelivery.CustomerName || lastDelivery.DeliveryAddress || 'Destination inconnue';
    }
    return 'Destination inconnue';
  }

  private calculateStats() {
    this.stats.total = this.history.length;
    this.stats.completed = this.history.filter(h => h.status === 'Completed' || h.status === 'Arrived' || h.status === 'Receipt').length;
    this.stats.cancelled = this.history.filter(h => h.status === 'Cancelled').length;
    this.stats.refused = this.history.filter(h => h.status === 'Refused').length;
    this.stats.totalDistance = this.history.reduce((sum, h) => sum + (h.distance || 0), 0);

    console.log('📊 Stats:', this.stats);
  }

  applyFilter() {
    if (this.filterStatus === 'all') {
      this.filteredHistory = this.history;
    } else if (this.filterStatus === 'completed') {
      this.filteredHistory = this.history.filter(h => 
        h.status === 'Completed' || h.status === 'Arrived' || h.status === 'Receipt'
      );
    } else {
      this.filteredHistory = this.history.filter(h => h.status === this.filterStatus);
    }
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'Completed': 'success',
      'Arrived': 'success',
      'Receipt': 'success',
      'Cancelled': 'danger',
      'Refused': 'danger'
    };
    return colors[status] || 'medium';
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'Completed': 'checkmark-done-circle',
      'Arrived': 'checkmark-done-circle',
      'Receipt': 'checkmark-done-circle',
      'Cancelled': 'close-circle',
      'Refused': 'close-circle'
    };
    return icons[status] || 'document';
  }

  getStatusText(status: string): string {
    const texts: Record<string, string> = {
      'Completed': 'Terminé',
      'Arrived': 'Arrivé',
      'Receipt': 'Livré',
      'Cancelled': 'Annulé',
      'Refused': 'Refusé'
    };
    return texts[status] || status;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'short',
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
    this.router.navigate([`/trip/${trip.id}`]);
  }

  doRefresh(event: any) {
    this.refreshing = true;
    this.loadHistory().finally(() => {
      this.refreshing = false;
      event.target.complete();
    });
  }
}
