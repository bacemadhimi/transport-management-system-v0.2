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
<<<<<<< HEAD
<<<<<<< HEAD
import { MatChipsModule } from '@angular/material/chips';
=======
>>>>>>> dev
=======
import { MatChipsModule } from '@angular/material/chips';
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
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
<<<<<<< HEAD
<<<<<<< HEAD
  driverPhone?: string;
=======
>>>>>>> dev
=======
  driverPhone?: string;
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
  truckImmatriculation?: string;
  currentLatitude?: number;
  currentLongitude?: number;
  lastPositionUpdate?: Date;
  deliveriesCount?: number;
  estimatedDistance?: number;
  estimatedDuration?: number;
<<<<<<< HEAD
<<<<<<< HEAD
  destination?: string;
  destinationLat?: number;
  destinationLng?: number;
=======
>>>>>>> dev
=======
  destination?: string;
  destinationLat?: number;
  destinationLng?: number;
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
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
<<<<<<< HEAD
<<<<<<< HEAD
    MatButtonModule,
    MatBadgeModule,
    MatChipsModule
=======
    MatButtonModule
>>>>>>> dev
=======
    MatButtonModule,
    MatBadgeModule,
    MatChipsModule
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
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
<<<<<<< HEAD
<<<<<<< HEAD
  routePolylines: Map<number, L.Polyline> = new Map();
=======
>>>>>>> dev
=======
  routePolylines: Map<number, L.Polyline> = new Map();
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
  positionUpdates: Map<number, any> = new Map();

  private subscriptions: Subscription[] = [];
  public connectionStatus: boolean = false;
<<<<<<< HEAD
<<<<<<< HEAD
  private refreshInterval?: any;
=======
>>>>>>> dev
=======
  private refreshInterval?: any;
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d

  constructor(
    private router: Router,
    private signalR: SignalRService,
    private http: Http
  ) {}

  ngOnInit() {
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
    this.initMap();
    this.connectToGPSHub();
    this.loadActiveTrips();
    
    // Refresh every 5 seconds for real-time tracking
    this.refreshInterval = setInterval(() => {
      this.loadActiveTrips();
    }, 5000);
<<<<<<< HEAD
=======
    this.connectToGPSHub();
    this.loadActiveTrips();
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
  }

  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
<<<<<<< HEAD
<<<<<<< HEAD
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
=======
>>>>>>> dev
=======
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
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

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
  getTotalTrips(): number {
    return this.activeTrips.length;
  }

<<<<<<< HEAD
=======
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
  // Check if position is live (less than 1 minute old)
  isPositionLive(lastUpdate?: Date): boolean {
    if (!lastUpdate) return false;
    return (Date.now() - lastUpdate.getTime()) < 60000;
  }

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
  // Get time ago string
  getTimeAgo(date?: Date): string {
    if (!date) return 'Inconnu';
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'À l\'instant';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} h`;
    return `${Math.floor(seconds / 86400)} j`;
  }

<<<<<<< HEAD
=======
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
  // Get badge color class
  getStatusBadgeClass(status: string): string {
    const statusMap: Record<string, string> = {
      'Loading': 'warning',
      'InDelivery': 'primary',
      'Arrived': 'success',
      'Completed': 'success',
<<<<<<< HEAD
<<<<<<< HEAD
      'Assigned': 'accent',
      'Refused': 'danger'
=======
      'Assigned': 'accent'
>>>>>>> dev
=======
      'Assigned': 'accent',
      'Refused': 'danger'
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
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
<<<<<<< HEAD
<<<<<<< HEAD
=======
            // Wait a bit for connection to stabilize
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
            setTimeout(() => {
              this.joinAllTripsTracking();
            }, 500);
          }
        })
      );

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
      // Listen for GPS positions - REAL TIME UPDATES
      this.signalR.onGPSPosition((position: any) => {
        console.log('📍 GPS Position received in real-time:', position);
        this.updateTruckPositionFromSignalR(position);
      });

      // Listen for trip status changes
<<<<<<< HEAD
=======
      // Écouter les positions GPS
      this.signalR.onGPSPosition((position: any) => {
        console.log('📍 GPS Position received:', position);
        this.updateTruckPosition(position);
      });

      // Écouter les changements de statut
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
      this.signalR.onTripStatusChanged((update: any) => {
        console.log('📊 Trip status changed:', update);
        this.updateTripStatus(update);
      });

    } catch (error) {
      console.error('❌ Failed to connect to GPS Hub:', error);
    }
  }

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
  // Update truck position from SignalR real-time data
  private updateTruckPositionFromSignalR(position: any) {
    const tripId = position.tripId;
    if (!tripId) return;

    console.log('🔄 Updating position for trip', tripId, 'at', position.latitude, position.longitude);

    // Find the trip in our list
    const trip = this.activeTrips.find(t => t.id === tripId);
    if (trip) {
      // Update trip position
      trip.currentLatitude = position.latitude;
      trip.currentLongitude = position.longitude;
      trip.lastPositionUpdate = new Date(position.timestamp);

      // Update marker on map
      const marker = this.truckMarkers.get(tripId);
      if (marker && this.map) {
        const newPosition: [number, number] = [position.latitude, position.longitude];
        marker.setLatLng(newPosition);
        marker.setPopupContent(this.getTruckPopupContent(trip));
        
        console.log('✅ Marker updated for trip', trip.tripReference);
      } else {
        console.log('⚠️ No marker found, will create on next update');
      }
    } else {
      console.log('⚠️ Trip', tripId, 'not in active trips list, will load on next refresh');
    }
  }

<<<<<<< HEAD
=======
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
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
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
      console.log('📋 Loading active trips from API...');
      
      // Get all trips and filter active ones
      const response: any = await this.http.getTripsList({ 
        pageIndex: 0,
        pageSize: 200
      }).toPromise();
      
      console.log('📦 API Response:', response);
      
      if (response) {
        // Handle different response structures
        let trips = [];
        
        // Structure 1: {success: true, data: {data: [...], totalData: X}} - API returns nested data
        if (response.data && response.data.data && Array.isArray(response.data.data)) {
          trips = response.data.data;
          console.log('📊 Found trips in response.data.data (nested array)');
        }
        // Structure 2: {success: true, data: {trips: [...], totalCount: X}}
        else if (response.data && response.data.trips && Array.isArray(response.data.trips)) {
          trips = response.data.trips;
          console.log('📊 Found trips in response.data.trips');
        }
        // Structure 3: {success: true, data: [...]}
        else if (response.data && Array.isArray(response.data)) {
          trips = response.data;
          console.log('📊 Found trips in response.data (array)');
        }
        // Structure 4: Direct array
        else if (Array.isArray(response)) {
          trips = response;
          console.log('📊 Found trips as direct array');
        }
        
        console.log('📦 Total trips loaded from API:', trips.length);
        
        // Filter only active trips (InDelivery, Loading, Arrived, Accepted)
        const activeTripsData = trips.filter((t: any) => {
          const status = t.tripStatus || t.status;
          const isActive = status === 'InDelivery' || 
                          status === 'Loading' || 
                          status === 'Arrived' ||
                          status === 'Accepted';
          
          if (isActive) {
            console.log('✅ Active trip found:', t.tripReference, 'Status:', status);
          }
          
          return isActive;
        });
        
        console.log('🚛 Active trips found:', activeTripsData.length);
        
        // Map trips - handle different field names
        this.activeTrips = activeTripsData.map((t: any) => {
          return {
            id: t.id,
            tripReference: t.tripReference || t.reference,
            status: t.tripStatus || t.status,
            driverName: t.driver || t.driverName,
            driverPhone: t.driverPhone,
            truckImmatriculation: t.truck || t.truckImmatriculation,
            currentLatitude: null, // Will be updated by SignalR
            currentLongitude: null, // Will be updated by SignalR
            lastPositionUpdate: null,
            deliveriesCount: t.deliveryCount || t.deliveriesCount,
            estimatedDistance: t.estimatedDistance,
            estimatedDuration: t.estimatedDuration,
            destination: t.destination || t.dropoffLocation,
            destinationLat: t.destinationLat || t.endLatitude ? parseFloat(t.destinationLat || t.endLatitude) : null,
            destinationLng: t.destinationLng || t.endLongitude ? parseFloat(t.destinationLng || t.endLongitude) : null
          };
        });
        
        console.log('✅ Active trips processed:', this.activeTrips.length);
        
        // Fetch GPS positions for all active trips from PositionsGPS table
        await this.fetchGPSPositionsForActiveTrips();
        
        this.applyFilters();
        this.updateMapMarkers();
      }
<<<<<<< HEAD
=======
      console.log('📋 Loading active trips...');
      await this.signalR.invokeGetActiveTrips();
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
    } catch (error) {
      console.error('❌ Error loading active trips:', error);
    }
  }

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
  // Fetch latest GPS positions for all active trips - NOW USING SIGNALR ONLY
  private async fetchGPSPositionsForActiveTrips() {
    console.log('📡 GPS positions will be received via SignalR real-time updates');
    // No HTTP calls needed - SignalR handles everything in real-time
  }

  private initMap() {
    // Initialize map centered on Tunisia
    this.map = L.map('map').setView([36.8065, 10.1815], 8);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(this.map);

    console.log('🗺️ Map initialized');
  }

<<<<<<< HEAD
=======
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
  private updateTruckPosition(position: any) {
    const tripId = position.tripId;
    if (!tripId) return;

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
    console.log('📍 GPS Position received via SignalR:', position);
    this.positionUpdates.set(tripId, position);

    // Find the trip
    const trip = this.activeTrips.find(t => t.id === tripId);
    
    // Update marker if it exists or create new one
    const marker = this.truckMarkers.get(tripId);
    if (this.map) {
      const newPosition: [number, number] = [position.latitude, position.longitude];
      
      if (marker) {
        // Update existing marker
        marker.setLatLng(newPosition);
        if (trip) {
          marker.setPopupContent(this.getTruckPopupContent(trip, position));
        }
        console.log(`✅ Marker updated for trip ${tripId}`);
      } else if (trip) {
        // Create new marker
        const truckIcon = this.createTruckIcon();
        const newMarker = L.marker(newPosition, { icon: truckIcon })
          .addTo(this.map)
          .bindPopup(this.getTruckPopupContent(trip, position));
        
        this.truckMarkers.set(tripId, newMarker);
        console.log(`✅ Marker created for trip ${trip.tripReference}`);
      }

      // Pan map to new position
<<<<<<< HEAD
=======
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
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
      this.map.panTo(newPosition, { animate: true, duration: 0.5 });
    }
  }

  private updateTripStatus(update: any) {
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
    const tripIndex = this.activeTrips.findIndex(t => t.id === update.TripId);
    if (tripIndex !== -1) {
      this.activeTrips[tripIndex].status = update.NewStatus;
      this.applyFilters();
      console.log('✅ Trip status updated:', update.TripId, update.NewStatus);
    }
  }

  private updateMapMarkers() {
    if (!this.map) {
      console.log('⚠️ Map not initialized yet');
      return;
    }

    console.log('🗺️ Updating map markers for', this.activeTrips.length, 'active trips');

    // Remove markers for trips that are no longer active
    this.truckMarkers.forEach((marker, tripId) => {
      const stillActive = this.activeTrips.find(t => t.id === tripId);
      if (!stillActive) {
        marker.remove();
        this.truckMarkers.delete(tripId);
        console.log('🗑️ Removed marker for trip', tripId);
      }
    });

    // Add/update markers for active trips
    let markersWithPositions = 0;
    this.activeTrips.forEach(trip => {
      if (trip.currentLatitude && trip.currentLongitude) {
        markersWithPositions++;
        
        if (!this.truckMarkers.has(trip.id)) {
          // Create new marker with truck icon
          const truckIcon = this.createTruckIcon();
          const marker = L.marker([trip.currentLatitude, trip.currentLongitude], { icon: truckIcon })
            .addTo(this.map)
            .bindPopup(this.getTruckPopupContent(trip));
          
          this.truckMarkers.set(trip.id, marker);
          console.log('✅ Created new marker for trip', trip.tripReference, 'at', [trip.currentLatitude, trip.currentLongitude]);
        } else {
          // Update existing marker
          const marker = this.truckMarkers.get(trip.id)!;
          const newPosition: [number, number] = [trip.currentLatitude, trip.currentLongitude];
          marker.setLatLng(newPosition);
          marker.setPopupContent(this.getTruckPopupContent(trip));
        }
      } else {
        console.log('⚠️ Trip', trip.tripReference, 'has no GPS position');
      }
    });

    console.log('📍 Markers with positions:', markersWithPositions);
    console.log('🎯 Total markers on map:', this.truckMarkers.size);

    // Fit map to show all trucks
    if (this.truckMarkers.size > 0) {
      const markersArray = Array.from(this.truckMarkers.values());
      const group = L.featureGroup(markersArray);
      const bounds = group.getBounds();
      this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      console.log('🗺️ Map fitted to show all trucks');
    } else {
      // No trucks yet, center on Tunisia
      this.map.setView([36.8065, 10.1815], 8);
    }
  }

  private createTruckIcon(): L.DivIcon {
    return L.divIcon({
      html: `
        <div style="
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <mat-icon style="
            color: white;
            font-size: 20px;
            width: 20px;
            height: 20px;
          ">local_shipping</mat-icon>
        </div>
      `,
      className: 'truck-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
  }

  private getTruckPopupContent(trip: ActiveTrip, position?: any): string {
    return `
      <div style="min-width: 250px;">
        <h3 style="margin: 0 0 10px 0; color: #667eea; font-size: 16px;">
          ${trip.tripReference}
        </h3>
        <div style="font-size: 13px; line-height: 1.8;">
          <div><strong>🚛 Camion:</strong> ${trip.truckImmatriculation || 'N/A'}</div>
          <div><strong>👤 Chauffeur:</strong> ${trip.driverName || 'N/A'}</div>
          <div><strong>📞 Téléphone:</strong> ${trip.driverPhone || 'N/A'}</div>
          <div><strong>📊 Statut:</strong> <span style="color: #667eea; font-weight: bold;">${trip.status}</span></div>
          <div><strong>📦 Livraisons:</strong> ${trip.deliveriesCount || 0}</div>
          ${trip.estimatedDistance ? `<div><strong>📏 Distance:</strong> ${trip.estimatedDistance} km</div>` : ''}
          ${position ? `
            <div><strong>📍 Position:</strong> ${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}</div>
            <div><strong>⏱️ Mise à jour:</strong> ${this.getTimeAgo(new Date(position.timestamp))}</div>
          ` : ''}
        </div>
        <button onclick="window.location.href='/trips/${trip.id}'" 
                style="margin-top: 10px; width: 100%; padding: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 4px; cursor: pointer;">
          Voir détails
        </button>
      </div>
    `;
  }

  applyFilters() {
<<<<<<< HEAD
=======
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
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
    this.filteredTrips = this.activeTrips.filter(trip => {
      const matchesSearch = !this.searchQuery || 
        trip.tripReference.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        trip.driverName?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        trip.truckImmatriculation?.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      const matchesStatus = this.statusFilter === 'all' || trip.status === this.statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
  selectTrip(trip: ActiveTrip) {
    this.selectedTrip = trip;
    
    // Center map on selected truck
    if (trip.currentLatitude && trip.currentLongitude) {
      this.map.setView([trip.currentLatitude, trip.currentLongitude], 14);
      const marker = this.truckMarkers.get(trip.id);
      if (marker) {
        marker.openPopup();
      }
    }
  }

  refreshData() {
    this.loadActiveTrips();
    this.showToast('Données actualisées', 'success');
  }

  private showToast(message: string, color: string) {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 1000;
      animation: slideIn 0.3s ease-out;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
<<<<<<< HEAD
=======
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
>>>>>>> dev
=======
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d
  }
}
