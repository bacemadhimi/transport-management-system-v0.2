import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';

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
  stats = {
    total: 0,
    completed: 0,
    cancelled: 0,
    totalDistance: 0
  };

  private readonly API_URL = 'http://localhost:5191/api/Trips';

  constructor(
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.loadHistory();
  }

  async loadHistory() {
    this.loading = true;
    this.error = null;

    try {
      // Get current user info
      const user = this.authService.currentUser();
      if (!user) {
        this.error = 'Utilisateur non connecté';
        this.loading = false;
        return;
      }

      this.driverId = (user as any).driverId || user.id;
      console.log('📚 Loading history for driver:', this.driverId);

      // Get token
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

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
    if (trip.deliveries && trip.deliveries.length > 0) {
      const lastDelivery = trip.deliveries[trip.deliveries.length - 1];
      return lastDelivery.customerName || lastDelivery.deliveryAddress || 'Destination inconnue';
    }
    return 'Destination inconnue';
  }

  private calculateStats() {
    this.stats.total = this.history.length;
    this.stats.completed = this.history.filter(h => h.status === 'Completed' || h.status === 'Receipt').length;
    this.stats.cancelled = this.history.filter(h => h.status === 'Cancelled' || h.status === 'Refused').length;
    this.stats.totalDistance = this.history.reduce((sum, h) => sum + (h.distance || 0), 0);
    
    console.log('📊 Stats:', this.stats);
  }

  applyFilter() {
    if (this.filterStatus === 'all') {
      this.filteredHistory = this.history;
    } else {
      this.filteredHistory = this.history.filter(h => h.status === this.filterStatus);
    }
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'Completed': 'success',
      'Receipt': 'success',
      'Cancelled': 'danger',
      'Refused': 'danger'
    };
    return colors[status] || 'medium';
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'Completed': 'checkmark-done-circle',
      'Receipt': 'checkmark-done-circle',
      'Cancelled': 'close-circle',
      'Refused': 'close-circle'
    };
    return icons[status] || 'document';
  }

  getStatusText(status: string): string {
    const texts: Record<string, string> = {
      'Completed': 'Terminé',
      'Receipt': 'Livré',
      'Cancelled': 'Annulé',
      'Refused': 'Refusé'
    };
    return texts[status] || status;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
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
    console.log('View details:', trip);
  }

  refreshData() {
    this.loadHistory();
  }
}
