import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SignalRService } from '../../services/signalr.service';
import { Http } from '../../services/http';
import * as L from 'leaflet';

interface ActiveTrip {
  id: number;
  tripReference: string;
  status: string;
  driverName?: string;
  truckImmatriculation?: string;
  currentLatitude?: number;
  currentLongitude?: number;
  lastPositionUpdate?: Date;
  deliveriesCount?: number;
  estimatedDistance?: number;
  estimatedDuration?: number;
}

@Component({
  selector: 'app-live-gps-tracking',
  templateUrl: './live-gps-tracking.page.html',
  styleUrls: ['./live-gps-tracking.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule
  ]
})
export class LiveGPSTrackingPage implements OnInit, OnDestroy {
  activeTrips: ActiveTrip[] = [];
  filteredTrips: ActiveTrip[] = [];
  selectedTrip?: ActiveTrip;
  searchQuery: string = '';
  statusFilter: string = 'all';

  map!: L.Map;
  truckMarkers: Map<number, L.Marker> = new Map();
  positionUpdates: Map<number, any> = new Map();

  private subscriptions: Subscription[] = [];
  public connectionStatus: boolean = false;

  constructor(
    private router: Router,
    private signalR: SignalRService,
    private http: Http
  ) {}

  ngOnInit() {
    this.connectToGPSHub();
    this.loadActiveTrips();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
    if (this.map) {
      this.map.remove();
    }
  }

  // Get counts for stats
  getInDeliveryCount(): number {
    return this.activeTrips.filter(t => t.status === 'InDelivery').length;
  }

  getLoadingCount(): number {
    return this.activeTrips.filter(t => t.status === 'Loading').length;
  }

  getArrivedCount(): number {
    return this.activeTrips.filter(t => t.status === 'Arrived').length;
  }

  // Check if position is live (less than 1 minute old)
  isPositionLive(lastUpdate?: Date): boolean {
    if (!lastUpdate) return false;
    return (Date.now() - lastUpdate.getTime()) < 60000;
  }

  // Get badge color class
  getStatusBadgeClass(status: string): string {
    const statusMap: Record<string, string> = {
      'Loading': 'warning',
      'InDelivery': 'primary',
      'Arrived': 'success',
      'Completed': 'success',
      'Assigned': 'accent'
    };
    return statusMap[status] || 'medium';
  }

  private async connectToGPSHub() {
    try {
      await this.signalR.connect();

      this.subscriptions.push(
        this.signalR.connectionStatus$.subscribe(connected => {
          this.connectionStatus = connected;
          console.log('🔌 GPS Hub connection status:', connected);
          if (connected) {
            // Wait a bit for connection to stabilize
            setTimeout(() => {
              this.joinAllTripsTracking();
            }, 500);
          }
        })
      );

      // Écouter les positions GPS
      this.signalR.onGPSPosition((position: any) => {
        console.log('📍 GPS Position received:', position);
        this.updateTruckPosition(position);
      });

      // Écouter les changements de statut
      this.signalR.onTripStatusChanged((update: any) => {
        console.log('📊 Trip status changed:', update);
        this.updateTripStatus(update);
      });

    } catch (error) {
      console.error('❌ Failed to connect to GPS Hub:', error);
    }
  }

  private async joinAllTripsTracking() {
    try {
      console.log('🚛 Requesting active trips from GPS Hub...');
      await this.signalR.invokeGetActiveTrips();
      console.log('✅ Active trips requested successfully');

      this.signalR.onActiveTrips((trips: ActiveTrip[]) => {
        console.log('📦 Active trips received:', trips.length);
        this.activeTrips = trips;
        this.applyFilters();
        this.updateMapMarkers();
      });
    } catch (error) {
      console.error('❌ Error getting active trips:', error);
    }
  }

  private async loadActiveTrips() {
    try {
      console.log('📋 Loading active trips...');
      await this.signalR.invokeGetActiveTrips();
    } catch (error) {
      console.error('❌ Error loading active trips:', error);
    }
  }

  private updateTruckPosition(position: any) {
    const tripId = position.tripId;
    if (!tripId) return;

    this.positionUpdates.set(tripId, position);

    // Mettre à jour le marker
    const marker = this.truckMarkers.get(tripId);
    if (marker && this.map) {
      const newPosition: [number, number] = [position.latitude, position.longitude];
      marker.setLatLng(newPosition);
      
      // Mettre à jour le popup
      const trip = this.activeTrips.find(t => t.id === tripId);
      if (trip) {
        marker.setPopupContent(`
          <b>${trip.tripReference}</b><br>
          🚛 ${trip.truckImmatriculation || 'N/A'}<br>
          👤 ${trip.driverName || 'N/A'}<br>
          📍 ${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}<br>
          ⏱️ ${new Date(position.timestamp).toLocaleTimeString()}
        `);
      }

      // Animation de la carte
      this.map.panTo(newPosition, { animate: true, duration: 0.5 });
    }
  }

  private updateTripStatus(update: any) {
    const tripIndex = this.activeTrips.findIndex(t => t.id === update.tripId);
    if (tripIndex !== -1) {
      this.activeTrips[tripIndex].status = update.status;
      this.applyFilters();
    }
  }

  private initializeMap() {
    this.map = L.map('map').setView([36.8, 10.1], 8);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);
  }

  private updateMapMarkers() {
    if (!this.map) {
      this.initializeMap();
    }

    // Supprimer les anciens markers
    this.truckMarkers.forEach(marker => this.map.removeLayer(marker));
    this.truckMarkers.clear();

    // Ajouter les nouveaux markers
    this.activeTrips.forEach(trip => {
      if (trip.currentLatitude && trip.currentLongitude) {
        const truckIcon = L.divIcon({
          html: `
            <div style="
              background: ${this.getStatusColor(trip.status)};
              border: 3px solid white;
              border-radius: 50%;
              width: 44px;
              height: 44px;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              animation: pulse 2s infinite;
            ">
              <span style="font-size: 22px;">🚛</span>
            </div>
          `,
          className: 'truck-marker',
          iconSize: [44, 44],
          iconAnchor: [22, 22]
        });

        const marker = L.marker(
          [trip.currentLatitude, trip.currentLongitude],
          { icon: truckIcon }
        ).addTo(this.map);

        marker.bindPopup(`
          <b>${trip.tripReference}</b><br>
          🚛 ${trip.truckImmatriculation || 'N/A'}<br>
          👤 ${trip.driverName || 'N/A'}<br>
          📊 Statut: ${trip.status}<br>
          📍 ${trip.currentLatitude.toFixed(6)}, ${trip.currentLongitude.toFixed(6)}<br>
          📦 ${trip.deliveriesCount || 0} livraisons<br>
          📏 ${trip.estimatedDistance || 0} km
        `);

        marker.on('click', () => this.selectTrip(trip));

        this.truckMarkers.set(trip.id, marker);
      }
    });
  }

  private getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'Loading': '#f59e0b',
      'InDelivery': '#3b82f6',
      'Arrived': '#10b981',
      'Completed': '#059669'
    };
    return colors[status] || '#64748b';
  }

  public selectTrip(trip: ActiveTrip) {
    this.selectedTrip = trip;
    
    // Centrer la carte sur le trip
    if (trip.currentLatitude && trip.currentLongitude) {
      this.map.setView([trip.currentLatitude, trip.currentLongitude], 14);
      const marker = this.truckMarkers.get(trip.id);
      if (marker) {
        marker.openPopup();
      }
    }
  }

  public applyFilters() {
    this.filteredTrips = this.activeTrips.filter(trip => {
      const matchesSearch = !this.searchQuery || 
        trip.tripReference.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        trip.driverName?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        trip.truckImmatriculation?.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      const matchesStatus = this.statusFilter === 'all' || trip.status === this.statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }

  public getStatusBadgeColor(status: string): string {
    const colors: Record<string, string> = {
      'Loading': 'warning',
      'InDelivery': 'primary',
      'Arrived': 'success',
      'Completed': 'success'
    };
    return colors[status] || 'medium';
  }

  public formatLastUpdate(date?: Date): string {
    if (!date) return 'Jamais';
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `Il y a ${hours}h ${minutes % 60}min`;
  }
}
