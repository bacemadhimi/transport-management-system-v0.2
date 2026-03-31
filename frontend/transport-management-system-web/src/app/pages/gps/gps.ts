import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Http } from '../../services/http';
import { IDriver } from '../../types/driver';
import { ITruck } from '../../types/truck';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../services/auth';
import { SignalRService } from '../../services/signalr.service';
import L from 'leaflet';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-gps',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gps.html',
  styleUrls: ['./gps.scss']
})
export class GpsPage implements OnInit, OnDestroy, AfterViewInit {
  positions: any[] = [];
  drivers: IDriver[] = [];
  trucks: ITruck[] = [];
  trips: any[] = [];
  selectedDriverId: number | null = null;
  selectedTruckId: number | null = null;
  loading = false;
  error = '';
  refreshInterval: any;
  map: L.Map | undefined;
  tripMarkers: Map<number, L.Marker> = new Map();
  routePolylines: L.Polyline[] = [];
  isRealTimeConnected = false;
  
  // Store destination coordinates for each trip
  tripDestinations: Map<number, { address: string; latitude: number; longitude: number }> = new Map();
  
  // Store destination markers separately (using string key for trip IDs)
  destinationMarkers: Map<number, L.Marker> = new Map();
  
  testLat = 36.8065;
  testLng = 10.1815;
  testDriverId: number | null = null;
  testTruckId: number | null = null;
  sendingPosition = false;

  private truckColors = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#795548', '#607D8B'];

  constructor(
    private http: Http,
    public auth: Auth,
    private signalR: SignalRService
  ) {}

  ngOnInit() {
    this.loadDrivers();
    this.loadTrucks();
    this.loadTrips();
    this.loadLatestPositions();

    // Connect to SignalR for real-time updates
    this.connectToSignalR();

    this.signalR.connectionStatus$.subscribe(connected => {
      this.isRealTimeConnected = connected;
<<<<<<< HEAD
      console.log('📡 SignalR connection state:', connected);
      
      // Refresh trips when connection is established
      if (connected) {
        setTimeout(() => {
          this.loadTrips();
        }, 500);
      }
    });

    // Refresh data every 10 seconds
=======
      console.log('SignalR connection state:', connected);
    });

>>>>>>> dev
    this.refreshInterval = setInterval(() => {
      this.refreshData();
    }, 10000);
  }

  connectToSignalR() {
<<<<<<< HEAD
    console.log('🔌 Connecting to SignalR for real-time GPS tracking...');
    
=======
    // Wait for connection to be established
    setTimeout(() => {
      // Request active trips
      this.signalR.requestActiveTrips().then(() => {
        console.log('✅ Requested active trips from SignalR');
      }).catch(err => {
        console.error('❌ Error requesting active trips:', err);
      });
    }, 1000);

>>>>>>> dev
    // Listen for GPS positions
    this.signalR.onGPSPosition((position: any) => {
      console.log('📍 GPS Position received:', position);
      this.handleRealTimePosition(position);
    });

    // Listen for trip status changes
    this.signalR.onTripStatusChanged((update: any) => {
      console.log('📊 Trip status changed:', update);
      this.refreshData();
    });

    // Listen for active trips
    this.signalR.onActiveTrips((trips: any[]) => {
<<<<<<< HEAD
      console.log('🚛 Active trips received via SignalR:', trips.length);
=======
      console.log('🚛 Active trips received:', trips.length);
>>>>>>> dev
      // Update trips with real-time data
      trips.forEach(trip => {
        const existingTrip = this.trips.find(t => t.id === trip.id);
        if (existingTrip) {
          Object.assign(existingTrip, trip);
        } else {
          this.trips.push(trip);
        }
      });
      this.updateTripMarkersOnMap();
    });
  }

  ngAfterViewInit() {
<<<<<<< HEAD
    console.log('🗺️ ngAfterViewInit called - waiting for view to be ready...');
    
    // Wait for view to be fully rendered and map container to have dimensions
    setTimeout(() => {
      this.initMap();
      console.log('🗺️ Map initialization scheduled after 1.5s delay');
    }, 1500);
  }

  initMap() {
    if (this.map) {
      console.log('⚠️ Map already initialized');
      return;
    }

    // Check if map container exists and has dimensions
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      console.error('❌ Map container not found!');
      return;
    }

    console.log('🗺️ Initializing map... Container size:', mapContainer.offsetWidth, 'x', mapContainer.offsetHeight);

    // Check if container has valid dimensions
    if (mapContainer.offsetWidth === 0 || mapContainer.offsetHeight === 0) {
      console.error('❌ Map container has no dimensions! Waiting...');
      // Retry after 500ms
      setTimeout(() => this.initMap(), 500);
      return;
    }
=======
    setTimeout(() => this.initMap(), 500);
  }

  initMap() {
    if (this.map) return;
>>>>>>> dev

    // Configure Leaflet icons to fix default marker icon issues
    this.configureLeafletIcons();

    this.map = L.map('map', {
      zoomControl: true,
      attributionControl: true,
      minZoom: 6,
      maxZoom: 18
    }).setView([35.5, 10.0], 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18,
      minZoom: 6
    }).addTo(this.map);

    // Fix map rendering by invalidating size after initialization
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
<<<<<<< HEAD
        console.log('✅ Map size invalidated');
      }
    }, 300);

    // Load initial data
    console.log('✅ Map initialized successfully');
=======
      }
    }, 300);

    console.log('Map initialized');
>>>>>>> dev
    this.refreshData();
  }

  private configureLeafletIcons(): void {
    try {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });
    } catch (error) {
      console.warn('⚠️ Error configuring Leaflet icons:', error);
    }
  }

  handleRealTimePosition(position: any) {
<<<<<<< HEAD
    console.log('📍 Real-time position received:', position);
    
    // Add or update position - match by driverId OR truckId OR by trip ID (which mobile sends as driverId/truckId)
    const exists = this.positions.find(p =>
      p.driverId === position.driverId ||
=======
    // Add or update position - match by driverId OR truckId OR by trip ID (which mobile sends as driverId/truckId)
    const exists = this.positions.find(p => 
      p.driverId === position.driverId || 
>>>>>>> dev
      p.truckId === position.truckId ||
      p.driverId === position.truckId
    );
    if (!exists) {
      this.positions.push(position);
<<<<<<< HEAD
      console.log('✅ New real-time position added:', position);
    } else {
      const index = this.positions.findIndex(p =>
        p.driverId === position.driverId ||
        p.truckId === position.truckId ||
        p.driverId === position.truckId
      );
      if (index >= 0) {
        this.positions[index] = position;
        console.log('🔄 Real-time position updated:', position);
      }
    }
    
    // Update map immediately with new position
    if (this.map) {
      this.updateTripMarkersOnMap();
    }
  }

  refreshData() {
    console.log('🔄 Refreshing data...');
    this.loadTrips();
    this.loadLatestPositions();
    // updateTripMarkersOnMap will be called automatically when trips are loaded
=======
      console.log('New real-time position added:', position);
    } else {
      const index = this.positions.findIndex(p => 
        p.driverId === position.driverId || 
        p.truckId === position.truckId ||
        p.driverId === position.truckId
      );
      if (index >= 0) this.positions[index] = position;
      console.log('Real-time position updated:', position);
    }
    if (this.map) this.updateTripMarkersOnMap();
  }

  refreshData() {
    this.loadTrips();
    this.loadLatestPositions();
    if (this.map) this.updateTripMarkersOnMap();
>>>>>>> dev
  }

  updateTripMarkersOnMap() {
    if (!this.map) {
<<<<<<< HEAD
      console.error('❌ Map not initialized! Waiting...');
      // Retry after 500ms if map is not ready
      setTimeout(() => {
        if (this.map) {
          this.updateTripMarkersOnMap();
        } else {
          console.error('❌ Map still not initialized after retry');
        }
      }, 500);
=======
      console.error('❌ Map not initialized!');
>>>>>>> dev
      return;
    }

    console.log('🗺️ updateTripMarkersOnMap called');
    console.log('  - Trips count:', this.trips.length);
    console.log('  - Positions count:', this.positions.length);

    this.tripMarkers.forEach(marker => marker.remove());
    this.tripMarkers.clear();
    this.routePolylines.forEach(polyline => polyline.remove());
    this.routePolylines = [];

    // Filter ONLY trips currently in delivery (real-time tracking on map)
    const activeTrips = this.trips.filter(t =>
      t.tripStatus === 'DeliveryInProgress' ||
<<<<<<< HEAD
      t.tripStatus === 'LoadingInProgress' ||
      t.tripStatus === 'Accepted'
    );

    console.log('🚛 Active trips on map:', activeTrips.length);
    console.log('📊 Active trips statuses:', activeTrips.map(t => `${t.tripReference} (${t.tripStatus})`));

    if (activeTrips.length === 0) {
      console.log('⚠️ No active trips to display on map');
      console.log('💡 Available trips:', this.trips.map(t => `${t.tripReference} - ${t.tripStatus}`));
=======
      t.tripStatus === 'LoadingInProgress'
    );

    console.log('🚛 Active trips on map:', activeTrips.length);

    if (activeTrips.length === 0) {
      console.log('⚠️ No active trips to display on map');
>>>>>>> dev
      return;
    }

    activeTrips.forEach((trip, index) => {
      const color = this.truckColors[index % this.truckColors.length];

      const tripDriverId = trip.driverId || trip.driver?.id;
      const tripTruckId = trip.truckId || trip.truck?.id;

      let lat = trip.startLatitude || 36.8;
      let lng = trip.startLongitude || 10.0;
      let hasRealPosition = false;

      const tripPosition = this.positions.find(p => {
        return (tripDriverId && p.driverId === tripDriverId) ||
               (tripTruckId && p.truckId === tripTruckId);
      });

      if (tripPosition && tripPosition.latitude && tripPosition.longitude) {
        lat = tripPosition.latitude;
        lng = tripPosition.longitude;
        hasRealPosition = true;
        console.log(`🚛 Trip ${trip.id} - GPS position: ${lat}, ${lng}`);
      }

      // Get deliveries
      const deliveries = trip.deliveries || [];
      console.log(`📦 Trip ${trip.id} - Deliveries: ${deliveries.length}`);
      
      if (deliveries.length === 0) {
        console.log(`  ⚠️ Trip ${trip.id} has NO deliveries`);
      }

      // Create truck marker
      const iconHtml = `<div style="position:relative;">
        <div style="background:${color};width:44px;height:44px;border-radius:50%;border:3px solid white;box-shadow:0 4px 15px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:22px;">🚛</div>
        ${hasRealPosition ? '<div style="position:absolute;top:-2px;right:-2px;width:14px;height:14px;background:#4CAF50;border-radius:50%;border:3px solid white;animation:pulse 1.5s infinite;"></div>' : ''}
      </div>`;

      const truckIcon = L.divIcon({
        html: iconHtml,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        className: 'truck-marker'
      });
      
      const marker = L.marker([lat, lng], { icon: truckIcon }).addTo(this.map!);
      this.tripMarkers.set(trip.id, marker);

      const statusInfo = this.getStatusInfo(trip.tripStatus);
      const driverName = trip.driver?.name || 'Non assigné';
      const driverPhone = trip.driver?.phone || 'Non disponible';
      const truckPlate = trip.truck?.immatriculation || 'Non assigné';
      const destination = deliveries.length > 0 ? deliveries[deliveries.length - 1] : null;
      const destinationText = destination ? (destination.customerName || destination.deliveryAddress || 'Non défini') : 'Non défini';
      const distance = trip.estimatedDistance || 0;
      const duration = trip.estimatedDuration || 0;
      const startDate = trip.estimatedStartDate ? new Date(trip.estimatedStartDate).toLocaleDateString('fr-FR') : 'Non définie';
      
      // Calculate estimated arrival
      const estimatedArrival = new Date();
      estimatedArrival.setHours(estimatedArrival.getHours() + duration);

      marker.bindPopup(`
        <div style="min-width:350px; font-family: 'Segoe UI', sans-serif;">
          <!-- Header -->
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:15px; padding-bottom:12px; border-bottom:2px solid #f0f0f0;">
            <div style="background:${color}; width:50px; height:50px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:28px;">🚛</div>
            <div style="flex:1;">
              <div style="font-size:16px; font-weight:700; color:${color}; margin-bottom:4px;">${trip.tripReference || 'TRIP-' + trip.id}</div>
              <div style="font-size:12px; color:#666;">📦 ${deliveries.length} livraisons</div>
            </div>
          </div>

          <!-- Status -->
          <div style="background:${statusInfo.bgColor}; padding:10px; border-radius:8px; margin-bottom:12px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="color:${statusInfo.color}; font-size:18px;">●</span>
              <span style="color:${statusInfo.color}; font-weight:600; font-size:14px;">${statusInfo.text}</span>
            </div>
          </div>

          <!-- Driver & Truck Info -->
          <div style="background:#f8f9fa; padding:12px; border-radius:8px; margin-bottom:12px;">
            <div style="font-size:13px; margin-bottom:8px;"><b>👤 Chauffeur:</b> ${driverName}</div>
            <div style="font-size:13px; margin-bottom:8px;"><b>📞 Téléphone:</b> ${driverPhone}</div>
            <div style="font-size:13px;"><b>🚛 Camion:</b> ${truckPlate}</div>
          </div>

          <!-- Trip Details -->
          <div style="background:#f8f9fa; padding:12px; border-radius:8px; margin-bottom:12px;">
            <div style="font-size:13px; margin-bottom:6px;"><b>📏 Distance:</b> ${distance} km</div>
            <div style="font-size:13px; margin-bottom:6px;"><b>⏱️ Durée estimée:</b> ${duration} min</div>
            <div style="font-size:13px; margin-bottom:6px;"><b>📅 Date début:</b> ${startDate}</div>
            <div style="font-size:13px;"><b>🕐 Arrivée estimée:</b> ${estimatedArrival.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}</div>
          </div>

          <!-- Destination -->
          <div style="background:#fff3e0; padding:12px; border-radius:8px; margin-bottom:12px; border-left:4px solid #ff9800;">
            <div style="font-size:13px; font-weight:600; margin-bottom:6px;">🏁 DESTINATION FINALE</div>
            <div style="font-size:13px; color:#333;">${destinationText}</div>
          </div>

          <!-- Delivery Points -->
          <div style="margin-bottom:12px;">
            <div style="font-size:13px; font-weight:600; margin-bottom:8px;">📋 Points de livraison (${deliveries.length}):</div>
            <div style="max-height:150px; overflow-y:auto;">
              ${deliveries.map((d: any, i: number) => `
                <div style="display:flex; align-items:center; gap:8px; padding:6px; margin-bottom:4px; background:${i === deliveries.length - 1 ? '#e8f5e9' : '#f5f5f5'}; border-radius:6px;">
                  <span style="background:${i === deliveries.length - 1 ? '#4CAF50' : color}; color:white; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:bold;">${i === deliveries.length - 1 ? '🏁' : (i + 1)}</span>
                  <span style="font-size:12px; flex:1; color:#333;">${d.customerName || d.deliveryAddress || 'Point ' + (i + 1)}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Real-time position indicator -->
          ${hasRealPosition ? `
            <div style="background:#e8f5e9; padding:8px; border-radius:6px; text-align:center;">
              <div style="color:#4CAF50; font-size:12px; font-weight:600;">📍 Position GPS temps réel ACTIVE</div>
            </div>
          ` : `
            <div style="background:#fff3e0; padding:8px; border-radius:6px; text-align:center;">
              <div style="color:#ff9800; font-size:12px; font-weight:600;">⚠️ Position GPS non disponible</div>
            </div>
          `}
        </div>
      `);
    });

    // NOW ADD DELIVERY MARKERS AND ROUTE
    console.log('\n🗺️ Adding delivery markers and routes...');
    
    activeTrips.forEach((trip, tripIndex) => {
      const deliveryColor = this.truckColors[tripIndex % this.truckColors.length];
      const deliveries = trip.deliveries || [];

      console.log(`\n📍 Processing Trip ${trip.id}:`);
      console.log(`  - Deliveries count: ${deliveries.length}`);

      if (deliveries.length === 0) {
        console.log(`  ⚠️ No deliveries for Trip ${trip.id}`);
        return;
      }

      // Get truck position
      const tripDriverId = trip.driverId || trip.driver?.id;
      const tripTruckId = trip.truckId || trip.truck?.id;
      let truckLat = trip.startLatitude || 36.8;
      let truckLng = trip.startLongitude || 10.0;

      const truckPosition = this.positions.find(p => {
        return (tripDriverId && p.driverId === tripDriverId) ||
               (tripTruckId && p.truckId === tripTruckId);
      });

      if (truckPosition && truckPosition.latitude && truckPosition.longitude) {
        truckLat = truckPosition.latitude;
        truckLng = truckPosition.longitude;
      }

      console.log(`  - Starting from: ${truckLat}, ${truckLng}`);

      const waypoints: [number, number][] = [];
      waypoints.push([truckLat, truckLng]);

      // Add all delivery points
      deliveries.forEach((delivery: any, deliveryIndex: number) => {
<<<<<<< HEAD
        let deliveryLat: number = 0;
        let deliveryLng: number = 0;
=======
        let deliveryLat: number | null = null;
        let deliveryLng: number | null = null;
>>>>>>> dev
        const isLast = deliveryIndex === deliveries.length - 1;

        console.log(`    Delivery ${deliveryIndex + 1}/${deliveries.length}:`, {
          customer: delivery.customerName,
          geolocation: delivery.geolocation,
          lat: delivery.latitude,
<<<<<<< HEAD
          lng: delivery.longitude,
          isLast: isLast
        });

        // Priority 1: geolocation field (format: "lat,lng")
        if (delivery.geolocation) {
          const parts = delivery.geolocation.split(',');
          if (parts.length >= 2) {
            const lat = parseFloat(parts[0].trim());
            const lng = parseFloat(parts[1].trim());
            if (!isNaN(lat) && !isNaN(lng)) {
              deliveryLat = lat;
              deliveryLng = lng;
              console.log(`      ✅ From geolocation: ${deliveryLat}, ${deliveryLng}`);
            } else {
              console.log(`      ⚠️ Invalid geolocation coordinates`);
            }
=======
          lng: delivery.longitude
        });

        // Priority 1: geolocation field
        if (delivery.geolocation) {
          const parts = delivery.geolocation.split(',');
          if (parts.length >= 2) {
            deliveryLat = parseFloat(parts[0].trim());
            deliveryLng = parseFloat(parts[1].trim());
            console.log(`      ✅ From geolocation: ${deliveryLat}, ${deliveryLng}`);
>>>>>>> dev
          }
        }

        // Priority 2: latitude/longitude fields
<<<<<<< HEAD
        if (deliveryLat === 0 && delivery.latitude && delivery.longitude) {
=======
        if ((deliveryLat === null || deliveryLng === null) && delivery.latitude && delivery.longitude) {
>>>>>>> dev
          deliveryLat = delivery.latitude;
          deliveryLng = delivery.longitude;
          console.log(`      ✅ From lat/lng: ${deliveryLat}, ${deliveryLng}`);
        }

        // Priority 3: deliveryLatitude/deliveryLongitude
<<<<<<< HEAD
        if (deliveryLat === 0 && delivery.deliveryLatitude && delivery.deliveryLongitude) {
=======
        if ((deliveryLat === null || deliveryLng === null) && delivery.deliveryLatitude && delivery.deliveryLongitude) {
>>>>>>> dev
          deliveryLat = delivery.deliveryLatitude;
          deliveryLng = delivery.deliveryLongitude;
          console.log(`      ✅ From delivery lat/lng: ${deliveryLat}, ${deliveryLng}`);
        }

<<<<<<< HEAD
        // Fallback: use truck position + offset (for display purposes)
        if (deliveryLat === 0) {
          deliveryLat = truckLat + (deliveryIndex + 1) * 0.05;
          deliveryLng = truckLng + (deliveryIndex + 1) * 0.05;
          console.log(`      ⚠️ Using fallback position: ${deliveryLat}, ${deliveryLng}`);
=======
        // Fallback: use truck position + offset
        if (deliveryLat === null || deliveryLng === null) {
          deliveryLat = 36.8 + deliveryIndex * 0.08;
          deliveryLng = 10.0 + deliveryIndex * 0.12;
          console.log(`      ⚠️ Using fallback: ${deliveryLat}, ${deliveryLng}`);
>>>>>>> dev
        }

        // Create marker
        const deliveryIcon = L.divIcon({
          html: `<div style="background:${isLast ? '#4CAF50' : deliveryColor};width:32px;height:32px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-weight:bold;color:white;font-size:13px;box-shadow:0 3px 10px rgba(0,0,0,0.3);">${isLast ? '🏁' : (deliveryIndex + 1)}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const deliveryMarker = L.marker([deliveryLat, deliveryLng], { icon: deliveryIcon }).addTo(this.map!);
<<<<<<< HEAD

        if (isLast) {
          deliveryMarker.bindPopup(`
            <div style="min-width:200px;">
              <b>🏁 DESTINATION FINALE - ${trip.tripReference}</b><br>
=======
        
        if (isLast) {
          deliveryMarker.bindPopup(`
            <div style="min-width:200px;">
              <b>🏁 DESTINATION FINALE</b><br>
>>>>>>> dev
              <b>Client:</b> ${delivery.customerName || 'N/A'}<br>
              <b>Adresse:</b> ${delivery.deliveryAddress || 'Non définie'}<br>
              <small>Coords: ${deliveryLat.toFixed(4)}, ${deliveryLng.toFixed(4)}</small>
            </div>
          `);
          console.log(`      🏁 DESTINATION MARKER ADDED at ${deliveryLat}, ${deliveryLng}`);
        } else {
<<<<<<< HEAD
          deliveryMarker.bindPopup(`
            <div style="min-width:200px;">
              <b>📦 Point ${deliveryIndex + 1} - ${trip.tripReference}</b><br>
              <b>Client:</b> ${delivery.customerName || 'N/A'}<br>
              <b>Adresse:</b> ${delivery.deliveryAddress || 'Non définie'}
            </div>
          `);
=======
>>>>>>> dev
          console.log(`      ✅ Delivery marker ${deliveryIndex + 1} added at ${deliveryLat}, ${deliveryLng}`);
        }

        waypoints.push([deliveryLat, deliveryLng]);
      });

      console.log(`  🗺️ Waypoints count: ${waypoints.length}`);
      console.log(`  🗺️ Fetching OSRM route...`);
      
      // Fetch and draw route
      this.fetchOSRMRoute(waypoints, deliveryColor, tripIndex);
    });

    // Adjust map to show all markers
    setTimeout(() => {
      if (this.tripMarkers.size > 0 && this.map) {
        const allCoords = Array.from(this.tripMarkers.values()).map(m => m.getLatLng());
        const allBoundsCoords = [...allCoords];
        
        if (allBoundsCoords.length > 0) {
          const bounds = L.latLngBounds(allBoundsCoords);
          this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
          console.log('🗺️ Map bounds adjusted');
        }
      }
    }, 500);
  }

  getStatusInfo(status: string): { color: string; bgColor: string; text: string } {
    const statusMap: any = {
      'Planned': { color: '#2196F3', bgColor: '#E3F2FD', text: 'Planifié' },
      'Accepted': { color: '#9C27B0', bgColor: '#F3E5F5', text: 'Accepté' },
      'LoadingInProgress': { color: '#FF9800', bgColor: '#FFF3E0', text: 'En chargement' },
      'DeliveryInProgress': { color: '#4CAF50', bgColor: '#E8F5E9', text: 'En livraison' },
      'Receipt': { color: '#4CAF50', bgColor: '#C8E6C9', text: 'Livré' },
      'Cancelled': { color: '#F44336', bgColor: '#FFEBEE', text: 'Annulé' }
    };
    return statusMap[status] || { color: '#9E9E9E', bgColor: '#F5F5F5', text: status };
  }

  loadDrivers() {
    this.http.getDrivers().subscribe({ next: (data) => { this.drivers = data || []; }, error: (err) => console.error('Error loading drivers:', err) });
  }

  loadTrucks() {
    this.http.getTrucks().subscribe({ next: (data) => { this.trucks = data || []; }, error: (err) => console.error('Error loading trucks:', err) });
  }

  loadTrips() {
    this.http.getTripsList({ pageIndex: 0, pageSize: 50 }).subscribe({
      next: (data: any) => {
        let tripsList = data?.data || [];
        if (!Array.isArray(tripsList)) tripsList = [];
        console.log('📦 Trips loaded:', tripsList.length);

        // Use the trips directly first
        this.trips = tripsList;

        // Load full details for each trip WITH DELIVERIES
        const detailPromises: Promise<void>[] = [];
        
        if (tripsList.length > 0) {
          tripsList.forEach((trip: any) => {
            const promise = new Promise<void>((resolve) => {
              this.http.getTrip(trip.id).subscribe({
                next: (response: any) => {
                  // API returns ApiResponse format, extract data
                  const fullTrip = response?.data || response;
                  if (fullTrip && fullTrip.id) {
                    // Update the trip with full details including deliveries
                    const index = this.trips.findIndex(t => t.id === fullTrip.id);
                    if (index >= 0) {
                      this.trips[index] = fullTrip;
                      console.log(`✅ Trip ${fullTrip.id} loaded with ${fullTrip.deliveries?.length || 0} deliveries`);
                      
                      // Log delivery geolocation data
                      if (fullTrip.deliveries && fullTrip.deliveries.length > 0) {
                        fullTrip.deliveries.forEach((d: any, i: number) => {
                          console.log(`  Delivery ${i + 1}:`, {
                            customer: d.customerName,
                            address: d.deliveryAddress?.substring(0, 30),
                            geolocation: d.geolocation,
                            hasCoords: !!(d.geolocation || (d.latitude && d.longitude))
                          });
                        });
                      }
                    }
                  }
                  resolve();
                },
                error: (err: any) => {
                  console.error('❌ Error loading trip details:', err);
                  resolve();
                }
              });
            });
            detailPromises.push(promise);
          });

          // Wait for all trip details to load, then update map
          Promise.all(detailPromises).then(() => {
            console.log('✅ All trip details loaded - updating map...');
            
            // Force map update after a short delay
            setTimeout(() => {
              if (this.map) {
                this.updateTripMarkersOnMap();
              }
            }, 1000);
          });
        }

        // Initial map update (will be updated again when details load)
        setTimeout(() => {
          if (this.map) {
            this.updateTripMarkersOnMap();
          }
        }, 500);
      },
      error: (err: any) => {
        console.error('❌ Error loading trips:', err);
        this.trips = [];
        if (this.map) this.updateTripMarkersOnMap();
      }
    });
  }

  /**
   * Load destination coordinates for a trip using the new geocoding endpoint
   */
  loadTripDestination(tripId: number) {
    // Get the trip to find the destination address
    const trip = this.trips.find(t => t.id === tripId);
    if (!trip) return;

    // Get the last delivery as destination
    const deliveries = trip.deliveries || [];
    if (deliveries.length === 0) return;

    const destination = deliveries[deliveries.length - 1];
    
    console.log(`🔍 Trip ${tripId} - Checking destination in delivery ${deliveries.length - 1}:`, {
      address: destination.deliveryAddress,
      geolocation: destination.geolocation,
      latitude: destination.latitude,
      longitude: destination.longitude
    });

    // Parse destination coordinates from geolocation field
    let destLat: number | null = null;
    let destLng: number | null = null;
    let destAddress = destination.customerName || destination.deliveryAddress || 'Destination';

    // Priority 1: Use geolocation field (format: "lat,lng")
    if (destination.geolocation) {
      const geoParts = destination.geolocation.split(',');
      if (geoParts.length >= 2) {
        const parsedLat = parseFloat(geoParts[0].trim());
        const parsedLng = parseFloat(geoParts[1].trim());
        if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
          destLat = parsedLat;
          destLng = parsedLng;
          console.log(`✅ Coordinates from geolocation field: ${destLat}, ${destLng}`);
        }
      }
    }
    
    // Priority 2: Use latitude/longitude fields
    if ((destLat === null || destLng === null) && destination.latitude && destination.longitude) {
      destLat = destination.latitude;
      destLng = destination.longitude;
      console.log(`✅ Coordinates from latitude/longitude fields: ${destLat}, ${destLng}`);
    }
    
    // Priority 3: Use deliveryLatitude/deliveryLongitude fields
    if ((destLat === null || destLng === null) && destination.deliveryLatitude && destination.deliveryLongitude) {
      destLat = destination.deliveryLatitude;
      destLng = destination.deliveryLongitude;
      console.log(`✅ Coordinates from deliveryLatitude/deliveryLongitude fields: ${destLat}, ${destLng}`);
    }

    // If we have coordinates, add the destination marker
    if (destLat !== null && destLng !== null) {
      this.tripDestinations.set(tripId, {
        address: destAddress,
        latitude: destLat,
        longitude: destLng
      });
      console.log(`🏁 Trip ${tripId} destination saved: ${destAddress} (${destLat}, ${destLng})`);

      // Update map with the destination marker
      if (this.map) {
        this.addDestinationMarker(tripId, destLat, destLng, destAddress);
      }
    } else {
      console.warn(`⚠️ No coordinates found for trip ${tripId} destination. Address: ${destAddress}`);
      // Try to geocode the address
      if (destAddress && destAddress !== 'Destination' && destAddress.trim().length > 0) {
        this.geocodeDestinationAddress(tripId, destAddress);
      }
    }
  }

  /**
   * Geocode a destination address using Nominatim
   */
  private geocodeDestinationAddress(tripId: number, address: string) {
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          const result = data[0];
          const lat = parseFloat(result.lat);
          const lng = parseFloat(result.lon);
          
          this.tripDestinations.set(tripId, {
            address: result.display_name || address,
            latitude: lat,
            longitude: lng
          });
          console.log(`Trip ${tripId} destination geocoded: ${result.display_name} (${lat}, ${lng})`);

          if (this.map) {
            this.addDestinationMarker(tripId, lat, lng, result.display_name || address);
          }
        } else {
          console.warn(`Address not found for trip ${tripId}:`, address);
        }
      })
      .catch(error => {
        console.error(`Error geocoding destination for trip ${tripId}:`, error);
      });
  }

  /**
   * Add a destination marker on the map
   */
  addDestinationMarker(tripId: number, lat: number, lng: number, address: string) {
    if (!this.map) return;
    
    // Create destination marker (green flag)
    const destIcon = L.divIcon({
      html: `<div style="background:#4CAF50;width:32px;height:32px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 3px10px rgba(0,0,0,0.3);">🏁</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    
    const destMarker = L.marker([lat, lng], { icon: destIcon }).addTo(this.map);
    destMarker.bindPopup(`
      <div style="min-width:200px;">
        <b>🏁 Destination finale</b><br>
        <span>${address || 'Adresse inconnue'}</span><br>
        <small>Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}</small>
      </div>
    `);
    
    // Store marker to clean up later in destinationMarkers instead
    this.destinationMarkers.set(tripId, destMarker);
  }

  loadLatestPositions() {
    // TODO: Implement when getLatestPositions method is available in Http service
    // this.http.getLatestPositions(50).subscribe({
    //   next: (data: any) => {
    //     if (Array.isArray(data)) {
    //       this.positions = data.map((p: any) => ({ id: p.id, driverId: p.driverId, truckId: p.truckId, latitude: p.latitude, longitude: p.longitude, timestamp: p.timestamp, source: p.source }));
    //     }
    //     console.log('GPS Positions loaded:', this.positions.length);
    //     if (this.map) this.updateTripMarkersOnMap();
    //   },
    //   error: (err) => console.error('Error loading positions:', err)
    // });
  }

  loadDriverPositions() {
    if (!this.selectedDriverId) return;
    // TODO: Implement when getDriverPositions method is available in Http service
    // this.http.getDriverPositions(this.selectedDriverId).subscribe({
    //   next: (data: any) => { if (Array.isArray(data)) { this.positions = data.map((p: any) => ({ id: p.id, driverId: p.driverId, truckId: p.truckId, latitude: p.latitude, longitude: p.longitude, timestamp: p.timestamp, source: p.source })); } if (this.map) this.updateTripMarkersOnMap(); },
    //   error: () => {}
    // });
  }

  loadTruckPositions() {
    if (!this.selectedTruckId) return;
    // TODO: Implement when getTruckPositions method is available in Http service
    // this.http.getTruckPositions(this.selectedTruckId).subscribe({
    //   next: (data: any) => { if (Array.isArray(data)) { this.positions = data.map((p: any) => ({ id: p.id, driverId: p.driverId, truckId: p.truckId, latitude: p.latitude, longitude: p.longitude, timestamp: p.timestamp, source: p.source })); } if (this.map) this.updateTripMarkersOnMap(); },
    //   error: () => {}
    // });
  }

  sendTestPosition() {
    if (!this.testLat || !this.testLng) { this.error = 'Veuillez entrer des coordonnées valides'; return; }
    this.sendingPosition = true;
    // TODO: Implement when sendGPSPosition method is available in Http service
    // this.http.sendGPSPosition({ driverId: this.testDriverId, truckId: this.testTruckId, latitude: this.testLat, longitude: this.testLng, source: 'Web Test' }).subscribe({
    //   next: () => { alert('Position GPS envoyée avec succès!'); this.sendingPosition = false; this.loadLatestPositions(); },
    //   error: () => { this.error = 'Erreur lors de l\'envoi'; this.sendingPosition = false; }
    // });
  }

  formatDate(timestamp: string | undefined): string {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString('fr-FR');
  }

  getDriverName(driverId: number | null | undefined): string {
    if (!driverId) return '-';
    const driver = this.drivers.find(d => d.id === driverId);
    return driver ? driver.name : `ID: ${driverId}`;
  }

  getTruckName(truckId: number | null | undefined): string {
    if (!truckId) return '-';
    const truck = this.trucks.find(t => t.id === truckId);
    return truck ? truck.immatriculation : `ID: ${truckId}`;
  }

  clearFilter() {
    this.selectedDriverId = null;
    this.selectedTruckId = null;
    this.loadLatestPositions();
  }

  // Helper methods for template
  getActiveTrips() {
    // Return ONLY trips currently in delivery (real-time tracking)
    return this.trips.filter(t =>
      t.tripStatus === 'DeliveryInProgress' ||
      t.tripStatus === 'LoadingInProgress'
    );
  }

  getActiveTripsCount(): number {
    return this.getActiveTrips().length;
  }

  getTotalDeliveries(): number {
    return this.getActiveTrips().reduce((sum, t) => sum + (t.deliveryCount || 0), 0);
  }

  getTotalDistance(): number {
    return this.getActiveTrips().reduce((sum, t) => sum + (t.estimatedDistance || 0), 0);
  }

  getStatusClass(status: string): string {
    const classes: any = {
      'Planned': 'planned',
      'Accepted': 'accepted',
      'LoadingInProgress': 'loading',
      'DeliveryInProgress': 'active',
      'Receipt': 'completed',
      'Cancelled': 'cancelled'
    };
    return classes[status] || '';
  }

  getStatusText(status: string): string {
    const texts: any = {
      'Planned': 'Planifié',
      'Accepted': 'Accepté',
      'LoadingInProgress': 'En chargement',
      'DeliveryInProgress': 'En livraison',
      'Receipt': 'Livré',
      'Cancelled': 'Annulé'
    };
    return texts[status] || status;
  }

  getTripProgress(status: string): number {
    const progress: any = {
      'Planned': 0,
      'Accepted': 25,
      'LoadingInProgress': 50,
      'DeliveryInProgress': 75,
      'Receipt': 100,
      'Cancelled': 0
    };
    return progress[status] || 0;
  }

  getStatusColor(status: string): string {
    const colors: any = {
      'Planned': '#2196F3',
      'Accepted': '#9C27B0',
      'LoadingInProgress': '#FF9800',
      'DeliveryInProgress': '#4CAF50',
      'Receipt': '#4CAF50',
      'Cancelled': '#F44336'
    };
    return colors[status] || '#9E9E9E';
  }

  focusOnTrip(trip: any) {
    if (this.map) {
      const tripPosition = this.positions.find(p => p.driverId === trip.driverId || p.truckId === trip.truckId);
      if (tripPosition) {
        this.map.setView([tripPosition.latitude, tripPosition.longitude], 14);
      } else {
        this.map.setView([36.8065, 10.1815], 10);
      }
    }
  }

  // Fetch real road route from OSRM
  fetchOSRMRoute(waypoints: [number, number][], color: string, tripIndex: number) {
    if (!this.map || waypoints.length < 2) return;

    // Build OSRM URL
    const coords = waypoints.map(w => `${w[1]},${w[0]}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const geojson = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]]);

          // Remove existing route for this trip
          const existingRoute = this.routePolylines[tripIndex];
          if (existingRoute) {
            existingRoute.remove();
          }

          // Draw the route with better visibility
          const routeLine = L.polyline(geojson as [number, number][], {
            color: color,
            weight: 5,
            opacity: 0.8,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(this.map!);

          this.routePolylines[tripIndex] = routeLine;

          console.log(`Route fetched for trip ${tripIndex}: ${route.distance}m, ${route.duration}s`);
        } else {
          console.warn('No route found from OSRM');
          this.drawFallbackRoute(waypoints, color, tripIndex);
        }
      })
      .catch(err => {
        console.error('OSRM route error:', err);
        this.drawFallbackRoute(waypoints, color, tripIndex);
      });
  }

  /**
   * Draw a fallback straight line route if OSRM fails
   */
  drawFallbackRoute(waypoints: [number, number][], color: string, tripIndex: number) {
    if (!this.map || waypoints.length < 2) return;

    // Remove existing route
    const existingRoute = this.routePolylines[tripIndex];
    if (existingRoute) {
      existingRoute.remove();
    }

    // Draw a simple polyline connecting waypoints with better visibility
    const fallbackLine = L.polyline(waypoints, {
      color: color,
      weight: 4,
      opacity: 0.7,
      dashArray: '10, 10',
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(this.map!);

    this.routePolylines[tripIndex] = fallbackLine;
    console.log(`Fallback route drawn for trip ${tripIndex}`);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    // Clean up destination markers
    if (this.destinationMarkers) {
      this.destinationMarkers.forEach((marker: L.Marker) => marker.remove());
      this.destinationMarkers.clear();
    }
    if (this.map) {
      this.map.remove();
    }
  }
}


