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
  // Enhanced destination data from backend
  lastDeliveryGeolocation?: string;
  lastDeliveryLocationLat?: number;
  lastDeliveryLocationLng?: number;
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
    try {
      this.initMap();
      this.connectToGPSHub();
      this.loadActiveTrips();

      // Refresh every 5 seconds for real-time tracking
      this.refreshInterval = setInterval(() => {
        this.loadActiveTrips();
      }, 5000);
    } catch (error) {
      console.error('❌ Fatal error in ngOnInit:', error);
    }
  }

  ngOnDestroy() {
    try {
      this.subscriptions.forEach(s => s.unsubscribe());
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
      }
      if (this.map) {
        this.map.remove();
      }
    } catch (error) {
      console.error('❌ Error in ngOnDestroy:', error);
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

      // ✅ DIRECT handler registration to ensure positions are always received
      const hubConnection = this.signalR.getHubConnection();
      if (hubConnection) {
        // Remove any existing handlers to avoid duplicates
        hubConnection.off('ReceivePosition');
        
        // Register our own handler directly on the hub
        hubConnection.on('ReceivePosition', (position: any) => {
          console.log('📡📡📡 ========================================');
          console.log('📡 DIRECT GPS POSITION FROM HUB:');
          console.log('📡 ========================================');
          console.log('  → TripId:', position.tripId);
          console.log('  → TripRef:', position.tripReference);
          console.log('  → Latitude:', position.latitude);
          console.log('  → Longitude:', position.longitude);
          console.log('  → Status:', position.status);
          console.log('  → Timestamp:', position.timestamp);
          console.log('📡 ========================================');
          
          this.updateTruckPositionFromSignalR(position);
        });
        
        console.log('✅ Direct ReceivePosition handler registered on hub');
      }

      // Also subscribe to position$ as backup (from signalr.service.ts)
      this.subscriptions.push(
        this.signalR.position$.subscribe((position: any) => {
          if (position && position.tripId) {
            // Only process if not already handled by direct handler
            // (positions will be processed twice, but that's OK - duplicates are ignored)
            console.log('📡 Backup position received via position$:', position.tripId);
          }
        })
      );

      console.log('✅ GPS position listeners registered');

      // Listen for trip status changes
      this.signalR.onTripStatusChanged((update: any) => {
        console.log('📊 Trip status changed:', update);
        this.handleTripStatusChange(update);
      });

      // 🚛 Listen for TripAccepted event
      this.signalR.getHubConnection()?.on('TripAccepted', (data: any) => {
        console.log('🚛 TripAccepted received:', data);
        setTimeout(() => this.loadActiveTrips(), 1500);
      });

      // 🚛 Listen for TripRejected event
      this.signalR.getHubConnection()?.on('TripRejected', (data: any) => {
        console.log('❌ TripRejected received:', data);
        setTimeout(() => this.loadActiveTrips(), 1000);
      });

    } catch (error) {
      console.error('❌ Failed to connect to GPS Hub:', error);
    }
  }

  // Update truck position from SignalR real-time data - EXACT coordinates from mobile
  private updateTruckPositionFromSignalR(position: any) {
    // Try to get tripId from position data
    const tripId = position.tripId;

    if (!tripId) {
      console.warn('⚠️ GPS position received without tripId:', position);
      return;
    }

    console.log('📍📍📍 REAL GPS POSITION FROM MOBILE - Trip', tripId);
    console.log('  → Latitude EXACTE:', position.latitude);
    console.log('  → Longitude EXACTE:', position.longitude);
    console.log('  → Timestamp:', position.timestamp);

    // Find the trip in our list
    let trip = this.activeTrips.find(t => t.id === tripId);
    
    if (trip) {
      // ✅ CRITICAL: Use EXACT coordinates from mobile (NO transformation)
      trip.currentLatitude = position.latitude;
      trip.currentLongitude = position.longitude;
      trip.lastPositionUpdate = new Date(position.timestamp);

      console.log('🗺️ Updating truck marker at EXACT position:', position.latitude, position.longitude);
      
      // Update marker on map with EXACT position
      this.updateTruckMarkerOnMap(tripId, position.latitude, position.longitude, trip);

      // ✅ Recalculate route from new position to destination (like mobile)
      if (trip.destinationLat && trip.destinationLng) {
        console.log('🛣️ Recalculating route from EXACT position to destination');
        this.drawRouteToDestination(trip);
      }

      console.log('✅ Truck position updated - EXACTLY same as mobile');
    } else {
      console.log('⚠️ Trip', tripId, 'not in active trips list - reloading');
      // Trip might be new (just accepted), reload active trips
      setTimeout(() => this.loadActiveTrips(), 1000);
    }
  }

  // Update a single truck marker on the map
  private updateTruckMarkerOnMap(tripId: number, lat: number, lng: number, trip: ActiveTrip) {
    if (!this.map) return;

    // ✅ FIXED: Add small offset for trips with same position to prevent marker overlap
    // Group trips by exact position and offset markers that overlap
    const offset = this.calculateMarkerOffset(tripId, lat, lng);
    const finalLat = lat + offset.lat;
    const finalLng = lng + offset.lng;
    const newPosition: [number, number] = [finalLat, finalLng];
    
    let marker = this.truckMarkers.get(tripId);

    if (marker) {
      // Update existing marker
      marker.setLatLng(newPosition);
      marker.setPopupContent(this.getTruckPopupContent(trip));
      console.log('✅ Marker updated for trip', trip.tripReference, 'at', finalLat.toFixed(6), finalLng.toFixed(6));
    } else {
      // Create new marker
      const truckIcon = this.createTruckIcon();
      marker = L.marker(newPosition, { icon: truckIcon })
        .addTo(this.map)
        .bindPopup(this.getTruckPopupContent(trip));
      this.truckMarkers.set(tripId, marker);
      console.log('✅ Marker created for trip', trip.tripReference, 'at', finalLat.toFixed(6), finalLng.toFixed(6));

      // Center map on truck position when marker is first created (like mobile)
      this.map.setView(newPosition, 15, { animate: true });
      console.log('🎯 Map centered on truck position:', finalLat, finalLng);
    }

    // Pan map to new position smoothly
    this.map.panTo(newPosition, { animate: true, duration: 0.5 });
  }

  // ✅ NEW: Calculate offset for markers at same position to prevent overlap
  private calculateMarkerOffset(tripId: number, lat: number, lng: number): { lat: number, lng: number } {
    // Find all other trips at the EXACT same position
    const samePositionTrips = this.activeTrips.filter(t => 
      t.id !== tripId && 
      t.currentLatitude === lat && 
      t.currentLongitude === lng
    );
    
    if (samePositionTrips.length === 0) {
      // No overlap, no offset needed
      return { lat: 0, lng: 0 };
    }
    
    // Calculate offset based on trip index
    const tripIndex = this.activeTrips.findIndex(t => t.id === tripId);
    const offsetAmount = 0.0005; // ~50 meters offset per trip
    
    // Use tripIndex to create a unique offset for each overlapping marker
    const angle = (tripIndex * 120) * (Math.PI / 180); // 120 degrees apart for up to 3 trips
    const offsetLat = offsetAmount * Math.cos(angle);
    const offsetLng = offsetAmount * Math.sin(angle);
    
    console.log('🔄 Offset applied to trip', tripId, ':', offsetLat.toFixed(6), offsetLng.toFixed(6));
    
    return { lat: offsetLat, lng: offsetLng };
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
          
          // Enhanced destination coordinate resolution (convert null to undefined for TS compatibility)
          const resolvedDestLat = newTrip.destinationLat ?? newTrip.lastDeliveryLocationLat ?? undefined;
          const resolvedDestLng = newTrip.destinationLng ?? newTrip.lastDeliveryLocationLng ?? undefined;
          
          const enrichedTrip: ActiveTrip = {
            ...newTrip,
            destinationLat: resolvedDestLat,
            destinationLng: resolvedDestLng
          };
          
          if (existingIndex >= 0) {
            // Update existing trip with enriched data
            this.activeTrips[existingIndex] = { ...this.activeTrips[existingIndex], ...enrichedTrip };
            console.log('✅ Updated existing trip:', newTrip.tripReference);
          } else {
            // Add new trip
            this.activeTrips.push(enrichedTrip);
            console.log('✅ Added new trip:', newTrip.tripReference);
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

        // Structure 1: {success: true, data: {data: [...], totalData: X}}
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

        // Filter only active trips
        const activeTripsData = trips.filter((t: any) => {
          const status = t.tripStatus || t.status;
          return status === 'InDelivery' || status === 'Loading' || status === 'Arrived' || status === 'Accepted';
        });

        console.log('🚛 Active trips found:', activeTripsData.length);

        // ✅ FIXED: Preserve existing GPS positions when reloading trips
        const existingPositions = new Map<number, { lat: number, lng: number, lastUpdate?: Date }>();
        this.activeTrips.forEach((trip: ActiveTrip) => {
          if (trip.currentLatitude && trip.currentLongitude) {
            existingPositions.set(trip.id, {
              lat: trip.currentLatitude,
              lng: trip.currentLongitude,
              lastUpdate: trip.lastPositionUpdate
            });
          }
        });
        console.log('📍 Preserved existing positions for', existingPositions.size, 'trips');

        // Map trips - handle different field names with enhanced destination resolution
        const newTrips: ActiveTrip[] = activeTripsData.map((t: any): ActiveTrip => {
          // ✅ FIXED: Parse coordinates safely - handle both double? from API and legacy string?
          const parseCoord = (val: any): number | undefined => {
            if (val === undefined || val === null) return undefined;
            const num = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : Number(val);
            // ✅ Validate coordinate ranges
            if (isNaN(num) || Math.abs(num) > 90) return undefined;
            return num;
          };

          const parseLng = (val: any): number | undefined => {
            if (val === undefined || val === null) return undefined;
            const num = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : Number(val);
            // ✅ Validate coordinate ranges
            if (isNaN(num) || Math.abs(num) > 180) return undefined;
            return num;
          };

          const destLat = parseCoord(t.destinationLat) ?? parseCoord(t.endLatitude) ?? parseCoord(t.lastDeliveryLocationLat) ?? parseCoord(t.EndLatitude);
          const destLng = parseLng(t.destinationLng) ?? parseLng(t.endLongitude) ?? parseLng(t.lastDeliveryLocationLng) ?? parseLng(t.EndLongitude);

          const currentLat = parseCoord(t.currentLatitude) ?? parseCoord(t.CurrentLatitude);
          const currentLng = parseLng(t.currentLongitude) ?? parseLng(t.CurrentLongitude);
          
          // ✅ Preserve existing SignalR position if API doesn't have fresh data
          const existingPos = existingPositions.get(t.id);
          const finalLat = currentLat ?? existingPos?.lat;
          const finalLng = currentLng ?? existingPos?.lng;
          const finalUpdate = t.lastPositionUpdate ? new Date(t.lastPositionUpdate) : existingPos?.lastUpdate;

          return {
            id: t.id,
            tripReference: t.tripReference || t.reference || t.TripReference,
            status: t.tripStatus || t.status || t.TripStatus,
            driverName: t.driver || t.driverName || t.Driver,
            driverPhone: t.driverPhone || t.DriverPhone,
            truckImmatriculation: t.truck || t.truckImmatriculation || t.Truck,
            currentLatitude: finalLat,
            currentLongitude: finalLng,
            lastPositionUpdate: finalUpdate,
            deliveriesCount: t.deliveryCount || t.deliveriesCount || t.DeliveryCount,
            estimatedDistance: t.estimatedDistance || t.EstimatedDistance,
            estimatedDuration: t.estimatedDuration || t.EstimatedDuration,
            destination: t.destination || t.dropoffLocation,
            destinationLat: destLat,
            destinationLng: destLng,
            lastDeliveryGeolocation: t.lastDeliveryGeolocation,
            lastDeliveryLocationLat: t.lastDeliveryLocationLat,
            lastDeliveryLocationLng: t.lastDeliveryLocationLng
          };
        });

        // ✅ FIXED: Merge new trips with existing ones (preserve positions)
        newTrips.forEach((newTrip: ActiveTrip) => {
          const existingIndex = this.activeTrips.findIndex((t: ActiveTrip) => t.id === newTrip.id);
          if (existingIndex >= 0) {
            const existing = this.activeTrips[existingIndex];
            if (newTrip.currentLatitude && newTrip.currentLongitude) {
              this.activeTrips[existingIndex] = newTrip;
            } else if (existing.currentLatitude && existing.currentLongitude) {
              newTrip.currentLatitude = existing.currentLatitude;
              newTrip.currentLongitude = existing.currentLongitude;
              newTrip.lastPositionUpdate = existing.lastPositionUpdate;
              this.activeTrips[existingIndex] = newTrip;
            } else {
              this.activeTrips[existingIndex] = newTrip;
            }
          } else {
            this.activeTrips.push(newTrip);
          }
        });

        // Remove trips that are no longer active
        const newTripIds = new Set(newTrips.map((t: ActiveTrip) => t.id));
        this.activeTrips = this.activeTrips.filter((t: ActiveTrip) => newTripIds.has(t.id));

        console.log('✅ Active trips processed:', this.activeTrips.length);
        console.log('📍 Trips with GPS positions:', this.activeTrips.filter((t: ActiveTrip) => t.currentLatitude && t.currentLongitude).length);
        
        // ✅ SAFE: Only log valid coordinates
        this.activeTrips.forEach((t: ActiveTrip) => {
          if (t.currentLatitude && t.currentLongitude && 
              Math.abs(t.currentLatitude) <= 90 && Math.abs(t.currentLongitude) <= 180) {
            console.log('  →', t.tripReference, 'at', t.currentLatitude, t.currentLongitude);
          } else {
            console.log('  →', t.tripReference, 'NO GPS YET');
          }
        });

        // Update map markers
        this.updateMapMarkers();
      }
    } catch (error) {
      console.error('❌ Error loading active trips:', error);
      // ✅ Don't crash - just log and continue
    }
  }


  private initMap() {
    // Initialize map centered on Tunisia
    this.map = L.map('map').setView([36.8065, 10.1815], 8);

    // OpenStreetMap - rendu normal, noms de villes FR/AR en Tunisie
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);

    console.log('🗺️ Map initialized (OpenStreetMap)');
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
      if (update.CurrentLatitude !== undefined && update.CurrentLatitude !== null) {
        trip.currentLatitude = update.CurrentLatitude;
      }
      if (update.CurrentLongitude !== undefined && update.CurrentLongitude !== null) {
        trip.currentLongitude = update.CurrentLongitude;
      }
      if (update.DestinationLat !== undefined && update.DestinationLat !== null) {
        trip.destinationLat = update.DestinationLat;
      }
      if (update.DestinationLng !== undefined && update.DestinationLng !== null) {
        trip.destinationLng = update.DestinationLng;
      }

      // If trip is completed or cancelled, remove it from active trips and map
      if (newStatus === 'Completed' || newStatus === 'Cancelled' || newStatus === 'Refused') {
        console.log('🗑️ Trip', trip.tripReference, 'is now', newStatus, '- removing from active tracking');

        // Remove marker from map
        const marker = this.truckMarkers.get(tripId);
        if (marker) {
          marker.remove();
          this.truckMarkers.delete(tripId);
        }

        // Remove destination marker
        const destMarker = this.destinationMarkers.get(tripId);
        if (destMarker) {
          destMarker.remove();
          this.destinationMarkers.delete(tripId);
        }

        // Remove route polyline
        const routeLine = this.routePolylines.get(tripId);
        if (routeLine) {
          routeLine.remove();
          this.routePolylines.delete(tripId);
        }

        // Remove from active trips
        this.activeTrips.splice(tripIndex, 1);
        this.applyFilters();
        this.showToast(`Trip ${trip.tripReference} terminé - retiré du suivi`, 'info');
      } else if (newStatus === 'Accepted' || newStatus === 'Loading' || newStatus === 'InDelivery' || newStatus === 'Arrived') {
        // Update existing marker or create if new
        if (trip.currentLatitude && trip.currentLongitude) {
          this.updateTruckMarkerOnMap(tripId, trip.currentLatitude, trip.currentLongitude, trip);
        }
        this.applyFilters();
        this.showToast(`Trip ${trip.tripReference} -> ${newStatus}`, 'success');
        
        // If destination coordinates are available, draw route
        if (trip.destinationLat && trip.destinationLng) {
          this.drawRouteToDestination(trip);
        }
      } else {
        // For any other status, just update the UI
        this.applyFilters();
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
    try {
      if (!this.map) {
        console.log('⚠️ Map not initialized yet');
        return;
      }

      console.log('🗺️ Updating map markers for', this.activeTrips.length, 'active trips');

      // Remove markers for trips that are no longer active
      this.truckMarkers.forEach((marker, tripId) => {
        const stillActive = this.activeTrips.find((t: ActiveTrip) => t.id === tripId);
        if (!stillActive) {
          marker.remove();
          this.truckMarkers.delete(tripId);
        }
      });

      // Remove destination markers for trips that are no longer active
      this.destinationMarkers.forEach((marker, tripId) => {
        const stillActive = this.activeTrips.find((t: ActiveTrip) => t.id === tripId);
        if (!stillActive) {
          marker.remove();
          this.destinationMarkers.delete(tripId);
        }
      });

      // Clear route polylines
      this.routePolylines.forEach(poly => poly.remove());
      this.routePolylines.clear();

      // ✅ FIXED: Separate markers when trips share exact same position
      const positionGroups = new Map<string, ActiveTrip[]>();
      this.activeTrips.forEach((trip) => {
        const lat = trip.currentLatitude;
        const lng = trip.currentLongitude;
        if (lat && lng && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
          if (!positionGroups.has(key)) {
            positionGroups.set(key, []);
          }
          positionGroups.get(key)!.push(trip);
        }
      });

      positionGroups.forEach((tripsAtPosition) => {
        tripsAtPosition.forEach((trip, index) => {
          let finalLat = trip.currentLatitude!;
          let finalLng = trip.currentLongitude!;

          // ✅ Add small offset if multiple trips at same position
          if (tripsAtPosition.length > 1) {
            const offsetAmount = 0.0003; // ~30 meters
            const angle = (index * 120) * (Math.PI / 180);
            finalLat += offsetAmount * Math.cos(angle);
            finalLng += offsetAmount * Math.sin(angle);
          }

          const newPosition: [number, number] = [finalLat, finalLng];

          if (!this.truckMarkers.has(trip.id)) {
            const truckIcon = this.createTruckIcon();
            // ✅ SAFETY CHECK: Ensure map is initialized before adding marker
            if (this.map) {
              const marker = L.marker(newPosition, { icon: truckIcon, zIndexOffset: 1000 })
                .addTo(this.map)
                .bindPopup(this.getTruckPopupContent(trip));
              this.truckMarkers.set(trip.id, marker);
              console.log('✅ Marker created for trip', trip.tripReference);
            } else {
              console.warn('⚠️ Map not initialized yet, skipping marker creation for trip', trip.tripReference);
            }
          } else {
            const marker = this.truckMarkers.get(trip.id)!;
            marker.setLatLng(newPosition);
            marker.setPopupContent(this.getTruckPopupContent(trip));
          }

          // Draw route to destination
          if (trip.destinationLat && trip.destinationLng) {
            this.drawRouteToDestination(trip);
          }
        });
      });

      console.log('🎯 Total markers on map:', this.truckMarkers.size);
      console.log('🏁 Destination markers:', this.destinationMarkers.size);
      console.log('🗺️ Route lines:', this.routePolylines.size);
    } catch (error) {
      console.error('❌ Error in updateMapMarkers:', error);
      // ✅ Don't crash - just log and continue
    }
  }
  
  // Draw route from truck position to destination
  private async drawRouteToDestination(trip: ActiveTrip) {
    try {
      // ✅ SAFETY CHECK: Ensure map is initialized
      if (!this.map) {
        console.warn('⚠️ Map not initialized yet, skipping route drawing for trip', trip.tripReference);
        return;
      }

      if (!trip.currentLatitude || !trip.currentLongitude || !trip.destinationLat || !trip.destinationLng) {
        return;
      }

      // ✅ Validate coordinates are reasonable (not huge numbers)
      if (Math.abs(trip.currentLatitude) > 90 || Math.abs(trip.currentLongitude) > 180 ||
          Math.abs(trip.destinationLat) > 90 || Math.abs(trip.destinationLng) > 180) {
        console.log('⚠️ Invalid coordinates for trip', trip.tripReference, '- skipping route');
        return;
      }

      // Create destination marker FIRST
      this.ensureDestinationMarker(trip);

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
        const existingGlow = this.routePolylines.get(trip.id + 10000);
        if (existingGlow) {
          existingGlow.remove();
        }

        // Draw route line
        const routeLine = L.polyline(coordinates, {
          color: '#1a73e8',
          weight: 6,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(this.map);

        const glowLine = L.polyline(coordinates, {
          color: '#4285f4',
          weight: 12,
          opacity: 0.2,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(this.map);

        this.routePolylines.set(trip.id, routeLine);
        this.routePolylines.set(trip.id + 10000, glowLine);

        console.log('✅ Route drawn for trip', trip.tripReference, '- distance:', (route.distance / 1000).toFixed(1), 'km');
      } else {
        console.log('⚠️ No route found for trip', trip.tripReference, '- drawing straight line');
        this.drawStraightLine(trip);
      }
    } catch (error) {
      console.error('❌ Error in drawRouteToDestination:', error);
      // Fallback: draw straight line
      this.drawStraightLine(trip);
    }
  }

  // ✅ NEW: Ensure destination marker is always created - EXACTLY like mobile
  private ensureDestinationMarker(trip: ActiveTrip) {
    if (!trip.destinationLat || !trip.destinationLng) {
      return;
    }

    // ✅ Validate coordinates
    if (Math.abs(trip.destinationLat) > 90 || Math.abs(trip.destinationLng) > 180) {
      return;
    }

    let destMarker = this.destinationMarkers.get(trip.id);
    if (!destMarker) {
      // EXACT same SVG pin as mobile app
      const destIcon = L.divIcon({
        html: `
          <div style="
            position: relative;
            width: 50px;
            height: 65px;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
          ">
            <!-- Pin shadow -->
            <div style="
              position: absolute;
              bottom: 8px;
              left: 5px;
              width: 40px;
              height: 10px;
              background: radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 70%);
              border-radius: 50%;
              filter: blur(1px);
            "></div>

            <!-- Pin marker -->
            <svg width="50" height="65" viewBox="0 0 50 65">
              <!-- Pin shadow base -->
              <ellipse cx="25" cy="58" rx="18" ry="5" fill="rgba(0,0,0,0.2)"/>

              <!-- Pin body -->
              <path d="M 25 2
                       C 12 2 2 12 2 25
                       C 2 42 25 62 25 62
                       C 25 62 48 42 48 25
                       C 48 12 38 2 25 2 Z"
                    fill="url(#pinGradient)"
                    stroke="#c0275a"
                    stroke-width="2"/>

              <!-- Pin highlight -->
              <ellipse cx="20" cy="18" rx="8" ry="10" fill="rgba(255,255,255,0.3)"/>

              <!-- Center circle -->
              <circle cx="25" cy="25" r="10" fill="white" opacity="0.9"/>

              <!-- Location icon -->
              <circle cx="25" cy="25" r="6" fill="#f5576c"/>

              <!-- Gradient -->
              <defs>
                <linearGradient id="pinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#f5576c;stop-opacity:1" />
                  <stop offset="50%" style="stop-color:#d63384;stop-opacity:1" />
                  <stop offset="100%" style="stop-color:#c0275a;stop-opacity:1" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        `,
        className: 'destination-marker-pro',
        iconSize: [50, 65],
        iconAnchor: [25, 65]
      });

      destMarker = L.marker([trip.destinationLat, trip.destinationLng], { icon: destIcon, zIndexOffset: 500 })
        .addTo(this.map)
        .bindPopup(`<b>🏁 Destination</b><br><span style="color:#666;font-size:12px;">${trip.destination || 'Destination finale'}</span>`);

      this.destinationMarkers.set(trip.id, destMarker);
      console.log('✅ Destination marker created for trip', trip.tripReference);
    } else {
      destMarker.setLatLng([trip.destinationLat, trip.destinationLng]);
    }
  }

  // ✅ NEW: Draw straight line as fallback when OSRM fails
  private drawStraightLine(trip: ActiveTrip) {
    // ✅ SAFETY CHECK: Ensure map is initialized before drawing line
    if (!this.map) {
      console.warn('⚠️ Map not initialized yet, skipping route drawing for trip', trip.tripReference);
      return;
    }

    // Remove existing route if any
    const existingRoute = this.routePolylines.get(trip.id);
    if (existingRoute) {
      existingRoute.remove();
    }
    const existingGlow = this.routePolylines.get(trip.id + 10000);
    if (existingGlow) {
      existingGlow.remove();
    }

    // ✅ Validate coordinates
    if (Math.abs(trip.currentLatitude!) > 90 || Math.abs(trip.currentLongitude!) > 180 ||
        Math.abs(trip.destinationLat!) > 90 || Math.abs(trip.destinationLng!) > 180) {
      console.log('⚠️ Invalid coordinates for straight line - skipping');
      return;
    }

    // Draw dashed straight line (fallback)
    const straightLine = L.polyline(
      [[trip.currentLatitude!, trip.currentLongitude!], [trip.destinationLat!, trip.destinationLng!]],
      {
        color: '#1a73e8',
        weight: 6,
        opacity: 0.9,
        dashArray: '10, 8',
        lineCap: 'round'
      }
    ).addTo(this.map);

    this.routePolylines.set(trip.id, straightLine);
    
    // Ensure destination marker exists
    this.ensureDestinationMarker(trip);
    
    console.log('⚠️ Straight line drawn for trip', trip.tripReference);
  }

  /**
   * Marqueur camion SVG professionnel avec effet 3D bombé — même style que mobile
   */
  private createTruckIcon(status?: string): L.DivIcon {
    const statusColors: any = {
      'InDelivery': '#22c55e',
      'Loading': '#f59e0b',
      'Arrived': '#3b82f6',
      'Accepted': '#6366f1',
    };
    const statusColor = statusColors[status || ''] || '#3b82f6';

    return L.divIcon({
      html: `
        <div class="truck-wrapper">
          <svg viewBox="0 0 72 38" xmlns="http://www.w3.org/2000/svg" width="72" height="38">
            <defs>
              <filter id="ts3d" x="-10%" y="-10%" width="130%" height="140%">
                <feDropShadow dx="0" dy="2.5" stdDeviation="2" flood-color="#000" flood-opacity=".3"/>
              </filter>
              <linearGradient id="tb3d" x1="0" y1="0" x2="0.15" y2="1">
                <stop offset="0%" stop-color="#ffffff"/>
                <stop offset="30%" stop-color="#f8f9fa"/>
                <stop offset="70%" stop-color="#e5e7eb"/>
                <stop offset="100%" stop-color="#d1d5db"/>
              </linearGradient>
              <linearGradient id="tbShine" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
                <stop offset="50%" stop-color="#ffffff" stop-opacity="0.3"/>
                <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
              </linearGradient>
              <linearGradient id="tc3d" x1="0" y1="0" x2="0.2" y2="1">
                <stop offset="0%" stop-color="#6b7280"/>
                <stop offset="40%" stop-color="#4b5563"/>
                <stop offset="100%" stop-color="#1f2937"/>
              </linearGradient>
              <linearGradient id="tcShine" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#9ca3af" stop-opacity="0.5"/>
                <stop offset="100%" stop-color="#9ca3af" stop-opacity="0"/>
              </linearGradient>
              <linearGradient id="glass3d" x1="0" y1="0" x2="0.3" y2="1">
                <stop offset="0%" stop-color="#bfdbfe"/>
                <stop offset="60%" stop-color="#93c5fd"/>
                <stop offset="100%" stop-color="#60a5fa" stop-opacity="0.6"/>
              </linearGradient>
              <radialGradient id="w3d" cx="40%" cy="30%" r="60%">
                <stop offset="0%" stop-color="#4b5563"/>
                <stop offset="50%" stop-color="#1f2937"/>
                <stop offset="100%" stop-color="#111827"/>
              </radialGradient>
              <radialGradient id="hlGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#fde68a" stop-opacity="1"/>
                <stop offset="60%" stop-color="#fbbf24" stop-opacity="0.5"/>
                <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
              </radialGradient>
              <radialGradient id="tlGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#fca5a5"/>
                <stop offset="60%" stop-color="#ef4444"/>
                <stop offset="100%" stop-color="#dc2626" stop-opacity="0"/>
              </radialGradient>
            </defs>

            <ellipse cx="36" cy="35.5" rx="30" ry="2.5" fill="rgba(0,0,0,.18)"/>

            <path d="M4,8 Q4,6 6,6 L40,6 Q42,6 42,8 L42,26 Q42,28 40,28 L6,28 Q4,28 4,26 Z"
                  fill="url(#tb3d)" stroke="#d1d5db" stroke-width=".5" filter="url(#ts3d)"/>
            <path d="M5,7 L40,7 L40,13 Q22,11 5,14 Z" fill="url(#tbShine)" opacity=".7"/>
            <path d="M5,24 Q22,22 40,24 L40,27 Q40,28 39,28 L7,28 Q4,28 4,27 L4,26 Q5,26 5,24 Z"
                  fill="rgba(0,0,0,.06)"/>

            <line x1="10" y1="7" x2="10" y2="27" stroke="#e5e7eb" stroke-width=".4"/>
            <line x1="17" y1="7" x2="17" y2="27" stroke="#e5e7eb" stroke-width=".4"/>
            <line x1="24" y1="7" x2="24" y2="27" stroke="#e5e7eb" stroke-width=".4"/>
            <line x1="31" y1="7" x2="31" y2="27" stroke="#e5e7eb" stroke-width=".4"/>
            <line x1="38" y1="7" x2="38" y2="27" stroke="#e5e7eb" stroke-width=".4"/>

            <ellipse cx="4.5" cy="23" rx="1.8" ry="2.5" fill="url(#tlGlow)"/>
            <rect x="3" y="21.5" width="2" height="3" rx=".8" fill="#ef4444" opacity=".85"/>

            <path d="M42,12 Q42,10 44,10 L52,10 Q54,10 55,12 L62,22 Q63,24 63,26 L63,28 Q63,28 61,28 L44,28 Q42,28 42,26 Z"
                  fill="url(#tc3d)" stroke="#374151" stroke-width=".5" filter="url(#ts3d)"/>
            <path d="M43,11 L52,11 L61,22 L61,16 Q54,13 43,12 Z" fill="url(#tcShine)" opacity=".6"/>

            <path d="M44,12 L52,12 L59,21 L44,21 Z"
                  fill="url(#glass3d)" stroke="#60a5fa" stroke-width=".3" opacity=".85"/>
            <path d="M45,13 L49,13 L54,19 L45,18 Z" fill="#fff" opacity=".35"/>
            <line x1="44" y1="16.5" x2="58" y2="16.5" stroke="#93c5fd" stroke-width=".3" opacity=".4"/>

            <ellipse cx="63.5" cy="20" rx="3" ry="2.5" fill="url(#hlGlow)"/>
            <ellipse cx="63" cy="20" rx="1.8" ry="1.4" fill="#fde68a"/>
            <ellipse cx="63" cy="20" rx="1.8" ry="1.4" fill="none" stroke="#f59e0b" stroke-width=".3" opacity=".6"/>

            <rect x="8" y="27" width="53" height="1.5" rx=".5" fill="#9ca3af"/>
            <rect x="8" y="28" width="53" height=".8" rx=".3" fill="rgba(0,0,0,.1)"/>

            <circle cx="56" cy="31.5" r="4" fill="url(#w3d)" stroke="#111827" stroke-width=".4"/>
            <circle cx="56" cy="31.5" r="2.2" fill="#6b7280"/>
            <circle cx="56" cy="31.5" r="1" fill="#9ca3af"/>
            <circle cx="56" cy="31.5" r=".4" fill="#d1d5db"/>
            <path d="M53,30 Q56,29 59,30" stroke="rgba(255,255,255,.15)" stroke-width=".5" fill="none"/>

            <circle cx="16" cy="31.5" r="4" fill="url(#w3d)" stroke="#111827" stroke-width=".4"/>
            <circle cx="16" cy="31.5" r="2.2" fill="#6b7280"/>
            <circle cx="16" cy="31.5" r="1" fill="#9ca3af"/>
            <circle cx="16" cy="31.5" r=".4" fill="#d1d5db"/>
            <path d="M13,30 Q16,29 19,30" stroke="rgba(255,255,255,.15)" stroke-width=".5" fill="none"/>

            <rect x="11" y="28" width="3" height="3" rx=".5" fill="#4b5563" opacity=".4"/>
            <rect x="53" y="28" width="3" height="3" rx=".5" fill="#4b5563" opacity=".4"/>

            <circle cx="60" cy="4" r="5" fill="${statusColor}" stroke="#fff" stroke-width="1.5" filter="url(#ts3d)"/>
          </svg>
        </div>
      `,
      className: 'truck-wrapper',
      iconSize: [72, 38],
      iconAnchor: [36, 19]
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

      // FIXED: "all" now truly means ALL active trip statuses
      const matchesStatus = this.statusFilter === 'all' || trip.status === this.statusFilter;

      return matchesSearch && matchesStatus;
    });
    
    console.log('🔍 Filter applied:', {
      searchQuery: this.searchQuery,
      statusFilter: this.statusFilter,
      totalTrips: this.activeTrips.length,
      filteredTrips: this.filteredTrips.length
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
  }}