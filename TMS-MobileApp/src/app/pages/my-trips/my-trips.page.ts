import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
<<<<<<< HEAD
<<<<<<< HEAD
=======
import { environment } from 'src/environments/environment.prod';
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d

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
<<<<<<< HEAD
<<<<<<< HEAD
  endDate?: string;
  deliveries?: any[];
=======
>>>>>>> dev
=======
  endDate?: string;
  deliveries?: any[];
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
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
<<<<<<< HEAD
<<<<<<< HEAD
  refreshing: boolean = false;

  private readonly API_URL = 'http://localhost:5191/api/Trips';
=======

  private readonly API_URL = `${environment.apiUrl}/api/Trips`;
>>>>>>> dev
=======
  refreshing: boolean = false;

  private readonly API_URL = 'http://localhost:5191/api/Trips';
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d

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
      console.log('📦 Loading trips for driver:', this.driverId);
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
      console.log('👤 User object:', JSON.stringify(user, null, 2));

      const token = localStorage.getItem('token');
      console.log('🔑 Token:', token ? 'PRESENT (' + token.length + ' chars)' : 'MISSING');
      
<<<<<<< HEAD
=======

      // Get token
      const token = localStorage.getItem('token');
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
      // Fetch ALL trips for this driver (both active and history)
      const apiUrl = `${this.API_URL}/driver/${this.driverId}`;
      console.log('📡 API URL:', apiUrl);
      
      this.http.get<any[]>(apiUrl, { headers })
        .subscribe({
          next: (trips) => {
            console.log('📦 Total trips received:', trips.length);
            console.log('📦 Trips data:', JSON.stringify(trips, null, 2));

            // Transform API data
            this.trips = trips.map(trip => {
              const transformed = {
                id: trip.id,
                tripReference: trip.tripReference || `TRIP-${trip.id}`,
                status: trip.Status || 'Planned',
                destination: this.getDestination(trip),
                estimatedDistance: trip.EstimatedDistance || 0,
                estimatedDuration: trip.EstimatedDuration || 0,
                deliveriesCount: trip.DeliveriesCount || 0,
                isActive: this.isActiveStatus(trip.Status),
                driverName: trip.DriverName,
                truckImmatriculation: trip.TruckImmatriculation,
                startDate: trip.EstimatedStartDate,
                endDate: trip.EstimatedEndDate,
                deliveries: trip.Deliveries
              };
              console.log('🔄 Transformed trip:', transformed.tripReference, 'Status:', transformed.status, 'Active:', transformed.isActive);
              return transformed;
            });

            // Separate active and history
            // Active trips: sorted by CreatedAt ascending (oldest first)
            this.activeTrips = this.trips
              .filter(t => t.isActive)
              .sort((a, b) => new Date(a.startDate || '').getTime() - new Date(b.startDate || '').getTime());
            
            // History trips: sorted by CreatedAt descending (newest first)
            this.historyTrips = this.trips
              .filter(t => !t.isActive)
              .sort((a, b) => new Date(b.endDate || b.startDate || '').getTime() - new Date(a.endDate || a.startDate || '').getTime());

            console.log('✅ Active trips:', this.activeTrips.length, this.activeTrips.map(t => `${t.tripReference} (${t.status})`));
            console.log('📚 History trips:', this.historyTrips.length, this.historyTrips.map(t => `${t.tripReference} (${t.status})`));

<<<<<<< HEAD
=======
      // Fetch real trips from API - Filter by driver
      this.http.get<any[]>(`${this.API_URL}?status=all`, { headers })
        .subscribe({
          next: (trips) => {
            console.log('📦 Trips received:', trips.length);
            
            // Filter trips for this driver only
            const driverTrips = trips.filter(trip => 
              trip.driverId === this.driverId || 
              (trip.driver && trip.driver.id === this.driverId)
            );

            console.log('🚛 Driver trips:', driverTrips.length);

            // Transform API data
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

            // Separate active and history
            this.activeTrips = this.trips.filter(t => t.isActive);
            this.historyTrips = this.trips.filter(t => !t.isActive);

            console.log('✅ Active trips:', this.activeTrips.length);
            console.log('📚 History trips:', this.historyTrips.length);
            
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
            this.loading = false;
          },
          error: (err) => {
            console.error('❌ Error loading trips:', err);
<<<<<<< HEAD
<<<<<<< HEAD
            console.error('❌ Error details:', JSON.stringify(err, null, 2));
            this.error = 'Erreur de chargement des trajets: ' + (err.message || err.error?.message || 'Inconnue');
=======
            this.error = 'Erreur de chargement des trajets';
>>>>>>> dev
=======
            console.error('❌ Error details:', JSON.stringify(err, null, 2));
            this.error = 'Erreur de chargement des trajets: ' + (err.message || err.error?.message || 'Inconnue');
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
            this.trips = [];
            this.activeTrips = [];
            this.historyTrips = [];
            this.loading = false;
          }
        });

    } catch (error) {
      console.error('Error loading trips:', error);
<<<<<<< HEAD
<<<<<<< HEAD
      this.error = 'Erreur inattendue: ' + (error as any).message;
=======
      this.error = 'Erreur inattendue';
>>>>>>> dev
=======
      this.error = 'Erreur inattendue: ' + (error as any).message;
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
      this.trips = [];
      this.activeTrips = [];
      this.historyTrips = [];
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

  private isActiveStatus(status: string): boolean {
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
    const activeStatuses = [
      'Pending',
      'Planned',
      'Assigned',
      'Accepted',
      'Loading',
      'LoadingInProgress',
      'DeliveryInProgress',
      'InDelivery',
      'Arrived'
    ];
<<<<<<< HEAD
=======
    const activeStatuses = ['Planned', 'Accepted', 'LoadingInProgress', 'DeliveryInProgress', 'InDelivery', 'Loading'];
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
    return activeStatuses.includes(status);
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
      'Pending': 'medium',
      'Planned': 'medium',
      'Assigned': 'primary',
      'Accepted': 'primary',
      'Loading': 'warning',
      'LoadingInProgress': 'warning',
      'DeliveryInProgress': 'primary',
      'InDelivery': 'primary',
      'Arrived': 'success',
<<<<<<< HEAD
=======
      'Planned': 'medium',
      'Accepted': 'primary',
      'LoadingInProgress': 'warning',
      'Loading': 'warning',
      'DeliveryInProgress': 'primary',
      'InDelivery': 'primary',
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
      'Completed': 'success',
      'Receipt': 'success',
      'Cancelled': 'danger',
      'Refused': 'danger'
    };
    return colors[status] || 'medium';
  }

  getStatusText(status: string): string {
    const texts: Record<string, string> = {
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
      'Pending': 'En attente',
      'Planned': 'Planifié',
      'Assigned': 'Assigné',
      'Accepted': 'Accepté',
      'Loading': 'Chargement',
      'LoadingInProgress': 'Chargement',
      'DeliveryInProgress': 'Livraison',
      'InDelivery': 'Livraison',
      'Arrived': 'Arrivé',
<<<<<<< HEAD
=======
      'Planned': 'Planifié',
      'Accepted': 'Accepté',
      'LoadingInProgress': 'Chargement',
      'Loading': 'Chargement',
      'DeliveryInProgress': 'Livraison',
      'InDelivery': 'Livraison',
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
      'Completed': 'Terminé',
      'Receipt': 'Livré',
      'Cancelled': 'Annulé',
      'Refused': 'Refusé'
    };
    return texts[status] || status;
  }

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'Pending': 'time',
      'Planned': 'calendar',
      'Assigned': 'person',
      'Accepted': 'checkmark-circle',
      'Loading': 'cube',
      'LoadingInProgress': 'cube',
      'DeliveryInProgress': 'truck',
      'InDelivery': 'truck',
      'Arrived': 'location',
      'Completed': 'checkmark-done-circle',
      'Receipt': 'checkmark-done-circle',
      'Cancelled': 'close-circle',
      'Refused': 'close-circle'
    };
    return icons[status] || 'document';
  }

<<<<<<< HEAD
=======
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
  viewTrip(trip: MyTrip) {
    this.router.navigate([`/trip/${trip.id}`]);
  }

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
  viewGPS(trip: MyTrip, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
<<<<<<< HEAD
=======
  viewGPS(trip: MyTrip) {
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
    this.router.navigate([`/gps-tracking`], {
      queryParams: {
        tripId: trip.id,
        tripReference: trip.tripReference
      }
    });
  }

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
  doRefresh(event: any) {
    this.refreshing = true;
    this.loadMyTrips().finally(() => {
      this.refreshing = false;
      event.target.complete();
    });
<<<<<<< HEAD
=======
  refreshData() {
    this.loadMyTrips();
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
  }
}
