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
import { MatChipsModule } from '@angular/material/chips';
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
  driverPhone?: string;
  truckImmatriculation?: string;
  currentLatitude?: number;
  currentLongitude?: number;
  lastPositionUpdate?: Date;
  deliveriesCount?: number;
  estimatedDistance?: number;
  estimatedDuration?: number;
  destination?: string;
  destinationLat?: number;
  destinationLng?: number;
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
    MatButtonModule,
    MatBadgeModule,
    MatChipsModule
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
  destinationMarkers: Map<number, L.Marker> = new Map();
  routePolylines: Map<number, L.Polyline> = new Map();
  positionUpdates: Map<number, any> = new Map();

  private subscriptions: Subscription[] = [];
  public connectionStatus: boolean = false;
  private refreshInterval?: any;

  constructor(
    private router: Router,
    private signalR: SignalRService,
    private http: Http
  ) {}

  ngOnInit() {
    this.initMap();
    this.connectToGPSHub();
    this.loadActiveTrips();
    
    // Refresh every 5 seconds for real-time tracking
    this.refreshInterval = setInterval(() => {
      this.loadActiveTrips();
    }, 5000);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
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

  getTotalTrips(): number {
    return this.activeTrips.length;
  }

  // Check if position is live (less than 1 minute old)
  isPositionLive(lastUpdate?: Date): boolean {
    if (!lastUpdate) return false;
    return (Date.now() - lastUpdate.getTime()) < 60000;
  }

  // Get time ago string
  getTimeAgo(date?: Date): string {
    if (!date) return 'Inconnu';
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'À l\'instant';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} h`;
    return `${Math.floor(seconds / 86400)} j`;
  }

  // Get badge color class
  getStatusBadgeClass(status: string): string {
    const statusMap: Record<string, string> = {
      'Loading': 'warning',
      'InDelivery': 'primary',
      'Arrived': 'success',
      'Completed': 'success',
      'Assigned': 'accent',
      'Refused': 'danger'
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
            setTimeout(() => {
              this.joinAllTripsTracking();
            }, 500);
          }
        })
      );

      // Listen for GPS positions - REAL TIME UPDATES (both event names)
      this.signalR.onGPSPosition((position: any) => {
        console.log('📍 GPS Position received (ReceivePosition):', position);
        this.updateTruckPositionFromSignalR(position);
      });

      // Also listen for ReceiveGPSPosition event name
      this.signalR.getHubConnection()?.on('ReceiveGPSPosition', (position: any) => {
        console.log('📍 GPS Position received (ReceiveGPSPosition):', position);
        this.updateTruckPositionFromSignalR(position);
      });

      // Listen for trip status changes
      this.signalR.onTripStatusChanged((update: any) => {
        console.log('📊 Trip status changed:', update);
        this.handleTripStatusChange(update);
      });

    } catch (error) {
      console.error('❌ Failed to connect to GPS Hub:', error);
    }
  }

  // Update truck position from SignalR real-time data
  private updateTruckPositionFromSignalR(position: any) {
    // Try to get tripId from position data
    const tripId = position.tripId;
    
    if (!tripId) {
      console.warn('⚠️ GPS position received without tripId:', position);
      return;
    }

    console.log('🔄 Updating position for trip', tripId, 'at', position.latitude, position.longitude);

    // Find the trip in our list
    const trip = this.activeTrips.find(t => t.id === tripId);
    if (trip) {
      // Update trip position
      trip.currentLatitude = position.latitude;
      trip.currentLongitude = position.longitude;
      trip.lastPositionUpdate = new Date(position.timestamp);

      // Update marker on map
      this.updateTruckMarkerOnMap(tripId, position.latitude, position.longitude, trip);

      console.log('✅ Position updated for trip', trip.tripReference);
    } else {
      console.log('⚠️ Trip', tripId, 'not in active trips list - will reload trips');
      // Trip might be new, reload active trips
      setTimeout(() => this.loadActiveTrips(), 1000);
    }
  }

  // Update a single truck marker on the map
  private updateTruckMarkerOnMap(tripId: number, lat: number, lng: number, trip: ActiveTrip) {
    if (!this.map) return;

    const newPosition: [number, number] = [lat, lng];
    let marker = this.truckMarkers.get(tripId);

    if (marker) {
      // Update existing marker
      marker.setLatLng(newPosition);
      marker.setPopupContent(this.getTruckPopupContent(trip));
      console.log('✅ Marker updated for trip', trip.tripReference);
    } else {
      // Create new marker
      const truckIcon = this.createTruckIcon();
      marker = L.marker(newPosition, { icon: truckIcon })
        .addTo(this.map)
        .bindPopup(this.getTruckPopupContent(trip));
      this.truckMarkers.set(tripId, marker);
      console.log('✅ Marker created for trip', trip.tripReference);
    }

    // Pan map to new position smoothly
    this.map.panTo(newPosition, { animate: true, duration: 0.3 });
  }

  private async joinAllTripsTracking() {
    try {
      console.log('🚛 Requesting active trips from GPS Hub...');
      
      // Join the AllTrips group to receive real-time updates
      await this.signalR.getHubConnection()?.invoke('JoinAllTripsGroup');
      console.log('✅ Joined AllTrips group');
      
      // Also join Admins group
      await this.signalR.getHubConnection()?.invoke('JoinAdminGroup');
      console.log('✅ Joined Admins group');
      
      // Request active trips
      await this.signalR.invokeGetActiveTrips();
      console.log('✅ Active trips requested successfully');

      // Listen for active trips response
      this.signalR.onActiveTrips((trips: ActiveTrip[]) => {
        console.log('📦 Active trips received from Hub:', trips.length, trips);
        
        // Merge with existing trips (avoid duplicates)
        trips.forEach(newTrip => {
          const existingIndex = this.activeTrips.findIndex(t => t.id === newTrip.id);
          if (existingIndex >= 0) {
            // Update existing trip
            this.activeTrips[existingIndex] = { ...this.activeTrips[existingIndex], ...newTrip };
          } else {
            // Add new trip
            this.activeTrips.push(newTrip);
          }
        });
        
        this.applyFilters();
        this.updateMapMarkers();
      });
    } catch (error) {
      console.error('❌ Error getting active trips:', error);
    }
  }

  private async loadActiveTrips() {
    try {
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
            currentLatitude: t.currentLatitude ? parseFloat(t.currentLatitude) : (t.startLatitude ? parseFloat(t.startLatitude) : null),
            currentLongitude: t.currentLongitude ? parseFloat(t.currentLongitude) : (t.startLongitude ? parseFloat(t.startLongitude) : null),
            lastPositionUpdate: t.lastPositionUpdate ? new Date(t.lastPositionUpdate) : null,
            deliveriesCount: t.deliveryCount || t.deliveriesCount,
            estimatedDistance: t.estimatedDistance,
            estimatedDuration: t.estimatedDuration,
            destination: t.destination || t.dropoffLocation,
            destinationLat: t.destinationLat !== undefined ? parseFloat(t.destinationLat) : (t.endLatitude !== undefined ? parseFloat(t.endLatitude) : null),
            destinationLng: t.destinationLng !== undefined ? parseFloat(t.destinationLng) : (t.endLongitude !== undefined ? parseFloat(t.endLongitude) : null)
          };
        });

        console.log('✅ Active trips processed:', this.activeTrips.length);

        // Update map markers
        this.updateMapMarkers();
      }
    } catch (error) {
      console.error('❌ Error loading active trips:', error);
    }
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

  // Handle trip status change from SignalR
  private handleTripStatusChange(update: any) {
    const tripId = update.TripId || update.tripId;
    const newStatus = update.NewStatus || update.newStatus;
    
    console.log('📊 Handling status change for trip', tripId, '->', newStatus);

    const tripIndex = this.activeTrips.findIndex(t => t.id === tripId);
    
    if (tripIndex !== -1) {
      // Trip exists in our list
      const trip = this.activeTrips[tripIndex];
      
      // Update status
      trip.status = newStatus;
      
      // Update other fields if provided
      if (update.DriverName) trip.driverName = update.DriverName;
      if (update.TruckImmatriculation) trip.truckImmatriculation = update.TruckImmatriculation;
      if (update.CurrentLatitude !== undefined) trip.currentLatitude = update.CurrentLatitude;
      if (update.CurrentLongitude !== undefined) trip.currentLongitude = update.CurrentLongitude;
      if (update.DestinationLat !== undefined) trip.destinationLat = update.DestinationLat;
      if (update.DestinationLng !== undefined) trip.destinationLng = update.DestinationLng;

      // If trip is completed or cancelled, remove it from active trips and map
      if (newStatus === 'Completed' || newStatus === 'Cancelled') {
        console.log('🗑️ Trip', trip.tripReference, 'is now', newStatus, '- removing from active tracking');
        
        // Remove marker from map
        const marker = this.truckMarkers.get(tripId);
        if (marker) {
          marker.remove();
          this.truckMarkers.delete(tripId);
        }
        
        // Remove from active trips
        this.activeTrips.splice(tripIndex, 1);
        this.applyFilters();
        this.showToast(`Trip ${trip.tripReference} terminé - retiré du suivi`, 'info');
      } else {
        // Update existing marker or create if new
        if (trip.currentLatitude && trip.currentLongitude) {
          this.updateTruckMarkerOnMap(tripId, trip.currentLatitude, trip.currentLongitude, trip);
        }
        this.applyFilters();
        this.showToast(`Trip ${trip.tripReference} -> ${newStatus}`, 'success');
      }
    } else {
      // Trip not in list - might be a new active trip (Accepted, Loading, etc.)
      if (newStatus === 'Accepted' || newStatus === 'Loading' || newStatus === 'InDelivery' || newStatus === 'Arrived') {
        console.log('➕ New active trip detected:', tripId, '- reloading trips list');
        // Reload trips to get the new one
        setTimeout(() => this.loadActiveTrips(), 500);
      }
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

    // Remove destination markers for trips that are no longer active
    this.destinationMarkers.forEach((marker, tripId) => {
      const stillActive = this.activeTrips.find(t => t.id === tripId);
      if (!stillActive) {
        marker.remove();
        this.destinationMarkers.delete(tripId);
      }
    });

    // Also clear route polylines
    this.routePolylines.forEach(poly => poly.remove());
    this.routePolylines.clear();

    // Add/update markers for active trips
    let markersWithPositions = 0;

    this.activeTrips.forEach((trip) => {
      // Use current position or fallback to start position
      const lat = trip.currentLatitude;
      const lng = trip.currentLongitude;

      if (lat && lng) {
        markersWithPositions++;

        if (!this.truckMarkers.has(trip.id)) {
          // Create new marker with truck icon
          const truckIcon = this.createTruckIcon(trip.status);
          const marker = L.marker([lat, lng], { icon: truckIcon, zIndexOffset: 1000 })
            .addTo(this.map)
            .bindPopup(this.getTruckPopupContent(trip));

          this.truckMarkers.set(trip.id, marker);
          console.log('✅ Created new marker for trip', trip.tripReference, 'at', [lat, lng]);
        } else {
          // Update existing marker
          const marker = this.truckMarkers.get(trip.id)!;
          const newPosition: [number, number] = [lat, lng];
          marker.setLatLng(newPosition);
          marker.setIcon(this.createTruckIcon(trip.status));
          marker.setPopupContent(this.getTruckPopupContent(trip));
        }

        // Draw route to destination if destination coordinates exist
        if (trip.destinationLat && trip.destinationLng) {
          this.drawRouteToDestination(trip);
        }
      } else {
        console.log('⚠️ Trip', trip.tripReference, 'has no GPS position yet');
      }
    });

    console.log('📍 Markers with positions:', markersWithPositions);
    console.log('🎯 Total markers on map:', this.truckMarkers.size);
    console.log('🏁 Destination markers:', this.destinationMarkers.size);
    console.log('🗺️ Route lines:', this.routePolylines.size);

    // Fit map to show all elements (trucks + destinations + routes)
    const allLayers: L.Layer[] = [...this.truckMarkers.values(), ...this.destinationMarkers.values()];

    if (allLayers.length > 0) {
      const group = L.featureGroup(allLayers);
      const bounds = group.getBounds();
      this.map.fitBounds(bounds, { padding: [60, 60], maxZoom: 12 });
      console.log('🗺️ Map fitted to show all trucks + destinations');
    } else {
      // No markers yet, center on Tunisia
      this.map.setView([36.8065, 10.1815], 8);
    }
  }
  
  // Draw route from truck position to destination
  private async drawRouteToDestination(trip: ActiveTrip) {
    if (!trip.currentLatitude || !trip.currentLongitude || !trip.destinationLat || !trip.destinationLng) {
      return;
    }

    try {
      // Use OSRM to get route
      const url = `https://router.project-osrm.org/route/v1/driving/${trip.currentLongitude},${trip.currentLatitude};${trip.destinationLng},${trip.destinationLat}?overview=full&geometries=geojson`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]] as [number, number]);

        // Remove existing route if any
        const existingRoute = this.routePolylines.get(trip.id);
        if (existingRoute) {
          existingRoute.remove();
        }

        // Draw route line with gradient effect
        const routeLine = L.polyline(coordinates, {
          color: '#667eea',
          weight: 5,
          opacity: 0.8,
          dashArray: '12, 8',
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(this.map);

        // Add a glow effect
        const glowLine = L.polyline(coordinates, {
          color: '#764ba2',
          weight: 10,
          opacity: 0.15,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(this.map);

        this.routePolylines.set(trip.id, routeLine);
        this.routePolylines.set(trip.id + 10000, glowLine);

        // Add or update destination marker
        let destMarker = this.destinationMarkers.get(trip.id);
        if (!destMarker) {
          const destIcon = L.divIcon({
            html: `
              <div style="position:relative;">
                <div style="
                  width: 42px;
                  height: 42px;
                  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
                  border-radius: 50%;
                  border: 3px solid white;
                  box-shadow: 0 4px 15px rgba(67, 233, 123, 0.5);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 20px;
                  animation: destinationPulse 2s infinite;
                ">🏁</div>
                <div style="
                  position: absolute;
                  top: -10px;
                  left: 50%;
                  transform: translateX(-50%);
                  background: white;
                  color: #333;
                  padding: 2px 8px;
                  border-radius: 10px;
                  font-size: 10px;
                  font-weight: bold;
                  white-space: nowrap;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                ">DESTINATION</div>
              </div>
            `,
            className: 'destination-marker',
            iconSize: [42, 42],
            iconAnchor: [21, 21]
          });

          destMarker = L.marker([trip.destinationLat, trip.destinationLng], { icon: destIcon, zIndexOffset: 500 })
            .addTo(this.map)
            .bindPopup(`<b>🏁 Destination Finale</b><br><span style="color:#666;font-size:12px;">${trip.destination || 'Destination'}</span>`);

          this.destinationMarkers.set(trip.id, destMarker);
        } else {
          destMarker.setLatLng([trip.destinationLat, trip.destinationLng]);
        }

        console.log('✅ Route + destination drawn for trip', trip.tripReference);
      }
    } catch (error) {
      console.error('❌ Error drawing route:', error);
    }
  }

  private createTruckIcon(status?: string): L.DivIcon {
    // Color based on status
    const statusColors: Record<string, string> = {
      'InDelivery': '#4CAF50',    // Green - on the road
      'Loading': '#FF9800',       // Orange - loading
      'Arrived': '#2196F3',       // Blue - arrived
      'Accepted': '#9C27B0',      // Purple - accepted
    };
    const color = statusColors[status || ''] || '#667eea';

    const statusEmoji: Record<string, string> = {
      'InDelivery': '🚚',
      'Loading': '📦',
      'Arrived': '✅',
      'Accepted': '🔔',
    };
    const emoji = statusEmoji[status || ''] || '🚛';

    return L.divIcon({
      html: `
        <div style="position:relative;">
          <div style="
            width: 52px;
            height: 52px;
            background: linear-gradient(135deg, ${color} 0%, ${this.darkenColor(color, 20)} 100%);
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 6px 20px ${color}80;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 26px;
            animation: truckPulse 2s infinite;
          ">${emoji}</div>
          <div style="
            position: absolute;
            bottom: -8px;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            color: ${color};
            padding: 1px 6px;
            border-radius: 8px;
            font-size: 9px;
            font-weight: bold;
            white-space: nowrap;
            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
            border: 1px solid ${color};
          ">${status || 'ACTIVE'}</div>
        </div>
      `,
      className: 'truck-marker',
      iconSize: [52, 62],
      iconAnchor: [26, 26]
    });
  }

  // Helper to darken a hex color
  private darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - percent);
    const g = Math.max(0, ((num >> 8) & 0x00FF) - percent);
    const b = Math.max(0, (num & 0x0000FF) - percent);
    return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
  }

  private getTruckPopupContent(trip: ActiveTrip, position?: any): string {
    const statusEmojis: Record<string, string> = {
      'InDelivery': '🚚 En livraison',
      'Loading': '📦 Chargement',
      'Arrived': '✅ Arrivé',
      'Accepted': '🔔 Accepté',
    };
    const statusDisplay = statusEmojis[trip.status] || trip.status;

    return `
      <div style="min-width: 300px; font-family: 'Segoe UI', sans-serif;">
        <!-- Header -->
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px; padding-bottom:10px; border-bottom:2px solid #f0f0f0;">
          <div style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); width:44px; height:44px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:24px;">🚛</div>
          <div style="flex:1;">
            <div style="font-size:15px; font-weight:700; color:#667eea;">${trip.tripReference}</div>
            <div style="font-size:12px; color:#666;">${statusDisplay}</div>
          </div>
        </div>

        <!-- Info -->
        <div style="font-size:13px; line-height:2;">
          <div><b>🚛 Camion:</b> ${trip.truckImmatriculation || 'N/A'}</div>
          <div><b>👤 Chauffeur:</b> ${trip.driverName || 'N/A'}</div>
          <div><b>📞 Téléphone:</b> ${trip.driverPhone || 'N/A'}</div>
          <div><b>📦 Livraisons:</b> ${trip.deliveriesCount || 0}</div>
          ${trip.estimatedDistance ? `<div><b>📏 Distance estimée:</b> ${trip.estimatedDistance} km</div>` : ''}
          ${trip.estimatedDuration ? `<div><b>⏱️ Durée estimée:</b> ${trip.estimatedDuration}h</div>` : ''}
          ${position ? `
            <div><b>📍 Position GPS:</b> ${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}</div>
            <div><b>⏱️ Dernière MAJ:</b> ${this.getTimeAgo(new Date(position.timestamp))}</div>
          ` : ''}
        </div>

        <!-- Destination -->
        ${trip.destination ? `
          <div style="margin-top:12px; background:#e8f5e9; padding:10px; border-radius:8px; border-left:4px solid #4CAF50;">
            <div style="font-size:11px; color:#666; font-weight:bold; margin-bottom:4px;">🏁 DESTINATION FINALE</div>
            <div style="font-size:12px; color:#333;">${trip.destination}</div>
          </div>
        ` : ''}

        <!-- Button -->
        <button onclick="window.location.href='/trips/${trip.id}'"
                style="margin-top:12px; width:100%; padding:10px; background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold; font-size:13px;">
          🔍 Voir détails du voyage
        </button>
      </div>
    `;
  }

  applyFilters() {
    this.filteredTrips = this.activeTrips.filter(trip => {
      const matchesSearch = !this.searchQuery || 
        trip.tripReference.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        trip.driverName?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        trip.truckImmatriculation?.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      const matchesStatus = this.statusFilter === 'all' || trip.status === this.statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }

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
  }
}
