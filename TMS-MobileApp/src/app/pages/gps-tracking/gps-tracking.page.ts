import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController, ToastController, LoadingController } from '@ionic/angular';
import { GPSTrackingService, GPSPosition } from '../../services/gps-tracking.service';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import * as L from 'leaflet';

@Component({
  selector: 'app-gps-tracking',
  templateUrl: './gps-tracking.page.html',
  styleUrls: ['./gps-tracking.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule
  ]
})
export class GPSTrackingPage implements OnInit, OnDestroy {
  map!: L.Map;
  truckMarker!: L.Marker;
  truckIcon!: L.DivIcon;
  destinationMarker!: L.Marker;
  routePolyline?: L.Polyline;

  currentLocation: { lat: number, lng: number } | null = null;
  destination: { lat: number, lng: number, address: string } | null = null;
  isTracking: boolean = false;
  speed: number = 0;
  accuracy: number = 0;
  lastUpdate: Date | null = null;
  connectionStatus: boolean = false;

  tripId?: number;
  tripReference: string = '';
  driverName: string = '';
  truckImmatriculation: string = '';
  destinationAddress: string = '';

  // Mission status
  missionStatus: string = 'pending'; // pending, accepted, loading, delivery, completed

  // Voice Navigation
  voiceNavigationEnabled: boolean = false;
  isSpeaking: boolean = false;
  lastNavigationInstruction: string = '';
  navigationInstructions: string[] = [];
  
  // Intelligent navigation tracking
  private currentInstruction: string = '';
  private lastInstructionTime: Date | null = null;
  private instructionRepeatCount: number = 0;
  private navigationCheckInterval: any = null;

  constructor(
    private gpsService: GPSTrackingService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {}

  ngOnInit() {
    // Read from query params
    this.tripId = Number(this.route.snapshot.queryParamMap.get('tripId'));
    this.tripReference = this.route.snapshot.queryParamMap.get('tripReference') || '';
    this.destinationAddress = this.route.snapshot.queryParamMap.get('destination') || '';

    // Read destination coordinates from query params (if available)
    const destLat = this.route.snapshot.queryParamMap.get('destinationLat');
    const destLng = this.route.snapshot.queryParamMap.get('destinationLng');

    console.log('🗺️ GPS Tracking - Trip ID:', this.tripId);
    console.log('🏁 Destination from params:', this.destinationAddress);
    console.log('📍 Destination coords from params:', destLat, destLng);

    // If destination coordinates are provided, use them directly
    if (destLat && destLng) {
      const lat = parseFloat(destLat);
      const lng = parseFloat(destLng);
      if (!isNaN(lat) && !isNaN(lng)) {
        console.log('✅ Using destination coordinates from notification:', lat, lng);
        this.destination = {
          lat: lat,
          lng: lng,
          address: this.destinationAddress || 'Destination'
        };
      }
    }
    // If we have destination address but no coordinates, geocode it immediately
    else if (this.destinationAddress && this.destinationAddress.trim() !== '' && this.destinationAddress !== 'Non définie') {
      console.log('📍 Geocoding destination from address:', this.destinationAddress);
      this.geocodeAddress(this.destinationAddress);
    }
    // If destination is still empty, try to fetch it from the trip details
    else {
      console.log('⚠️ No destination coords in params, will fetch from trip details');
      this.fetchTripDetails();
    }

    // Subscribe to connection status
    this.gpsService.getConnectionStatus().subscribe(status => {
      this.connectionStatus = status;
    });

    // Initialize map after view is ready
    setTimeout(() => {
      this.initMap();
      this.startGPSTracking();
    }, 500);
  }

  /**
   * Fetch trip details to get destination address - with multiple fallbacks
   */
  private async fetchTripDetails() {
    if (!this.tripId) return;

    try {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No authentication token found');
        return;
      }

      console.log('📡 Fetching trip details from API...');

      const response = await fetch(`${environment.apiUrl}/api/Trips/${this.tripId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`❌ API error: ${response.status} ${response.statusText}`);
        return;
      }

      const result = await response.json();
      console.log('📦 Trip details received:', result);

      if (result && result.data) {
        const trip = result.data;

        console.log('🔍 Searching for destination in trip data...');

        // Strategy 1: Use trip destination coordinates (MOST ACCURATE - from backend)
        if (trip.destinationLatitude && trip.destinationLongitude) {
          this.destination = {
            lat: parseFloat(trip.destinationLatitude),
            lng: parseFloat(trip.destinationLongitude),
            address: trip.destination || `Destination: ${trip.tripReference}`
          };

          console.log('✅ Destination loaded from trip coordinates:', this.destination);

          if (this.map) {
            this.addDestinationMarker();
            setTimeout(() => {
              this.updateRoute();
            }, 500);
          }
          return;
        }

        // Strategy 2: Get destination from last delivery geolocation
        if (trip.deliveries && trip.deliveries.length > 0) {
          const lastDelivery = trip.deliveries[trip.deliveries.length - 1];
          console.log('📦 Last delivery:', lastDelivery);

          // Try to get coordinates from geolocation field
          if (lastDelivery.geolocation) {
            const parts = lastDelivery.geolocation.split(',');
            if (parts.length >= 2) {
              const lat = parseFloat(parts[0].trim());
              const lng = parseFloat(parts[1].trim());

              if (!isNaN(lat) && !isNaN(lng)) {
                this.destination = {
                  lat,
                  lng,
                  address: lastDelivery.deliveryAddress || lastDelivery.customerAddress || `Destination: ${lastDelivery.customerName || 'Client'}`
                };

                console.log('✅ Destination loaded from geolocation:', this.destination);

                if (this.map) {
                  this.addDestinationMarker();
                  setTimeout(() => {
                    this.updateRoute();
                  }, 500);
                }
                return;
              }
            }
          }

          // Strategy 3: Use delivery address text
          if (lastDelivery.deliveryAddress && lastDelivery.deliveryAddress.trim().length > 0) {
            this.destinationAddress = lastDelivery.deliveryAddress;
            console.log('📝 Using delivery address:', this.destinationAddress);
            await this.geocodeAddress(this.destinationAddress);
            return;
          }

          // Strategy 4: Use customer address
          if (lastDelivery.customerAddress && lastDelivery.customerAddress.trim().length > 0) {
            this.destinationAddress = lastDelivery.customerAddress;
            console.log('📝 Using customer address:', this.destinationAddress);
            await this.geocodeAddress(this.destinationAddress);
            return;
          }

          // Strategy 5: Use customer name as fallback
          if (lastDelivery.customerName) {
            console.log('⚠️ No address, using customer name for geocoding:', lastDelivery.customerName);
            await this.geocodeAddress(lastDelivery.customerName + ', Tunisia');
            return;
          }
        }

        // Strategy 6: Use trip dropoff location
        if (trip.dropoffLocation) {
          console.log('📍 Using trip dropoff location:', trip.dropoffLocation);
          await this.geocodeAddress(trip.dropoffLocation);
          return;
        }

        // Strategy 7: Use trip destination address
        if (trip.destinationAddress) {
          console.log('📍 Using trip destination address:', trip.destinationAddress);
          await this.geocodeAddress(trip.destinationAddress);
          return;
        }

        // Strategy 8: Use pickup location as fallback
        if (trip.pickupLocation) {
          console.log('⚠️ Using pickup location as fallback:', trip.pickupLocation);
          await this.geocodeAddress(trip.pickupLocation);
          return;
        }

        // Strategy 9: Default to Tunis center
        console.warn('⚠️ No destination found, using Tunis center as fallback');
        this.destination = {
          lat: 36.8065,
          lng: 10.1815,
          address: 'Tunis, Tunisia'
        };
        
        if (this.map) {
          this.addDestinationMarker();
          setTimeout(() => {
            this.updateRoute();
          }, 500);
        }

      }
    } catch (error) {
      console.error('❌ Error fetching trip details:', error);
    }
  }

  /**
   * Add destination marker to map
   */
  private addDestinationMarker() {
    if (!this.destination) {
      console.log('⚠️ Cannot add destination marker: missing destination');
      return;
    }

    if (!this.map) {
      console.log('⚠️ Map not ready yet, will add destination marker later');
      // Will be added when map is initialized
      return;
    }

    console.log('🏁 Adding destination marker at:', this.destination);

    const destIcon = this.createDestinationIcon();
    this.destinationMarker = L.marker(
      [this.destination.lat, this.destination.lng],
      { icon: destIcon }
    ).addTo(this.map);

    this.destinationMarker.bindPopup(`
      <div style="text-align: center;">
        <b>🏁 Destination</b><br>
        <span style="color: #666; font-size: 12px;">${this.destination?.address || 'Non définie'}</span>
      </div>
    `);

    // Update route after adding marker
    setTimeout(() => {
      console.log('🔄 Updating route after adding destination marker...');
      this.updateRoute();
    }, 300);
  }

  ngOnDestroy() {
    this.gpsService.stopTracking();
    this.stopIntelligentNavigationCheck();
    if (this.map) {
      this.map.remove();
    }
  }

  /**
   * Initialiser la carte OpenStreetMap
   */
  private initMap() {
    if (this.map) {
      console.log('Map already initialized');
      return;
    }

    console.log('🗺️ Initializing map...');

    // Centre sur la Tunisie
    const tunisiaCenter: [number, number] = [36.8065, 10.1815];

    this.map = L.map('map', {
      center: tunisiaCenter,
      zoom: 10,
      minZoom: 6,
      maxZoom: 16,
      zoomControl: true,
      attributionControl: true,
      preferCanvas: true,
      touchZoom: true
    });

    // Tuiles OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 16,
      minZoom: 6,
      crossOrigin: true
    }).addTo(this.map);

    // Force map to render properly on mobile
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize(true);
        console.log('✅ Map initialized and size invalidated');

        // Check if destination was already loaded (geocoded before map was ready)
        if (this.destination) {
          console.log('✅ Destination already loaded, adding marker now...');
          this.addDestinationMarker();
        }
      }
    }, 300);

    // Second invalidate to ensure proper rendering on mobile
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize(true);
        console.log('✅ Map size invalidated (second pass for mobile)');
      }
    }, 1000);

    // Le marker du camion sera créé UNIQUEMENT quand la position GPS réelle est obtenue
    // PAS de position par défaut
    this.truckMarker = L.marker([0, 0], { icon: this.createTruckIcon(), opacity: 0 }).addTo(this.map);

    // Géocoder la destination si fournie
    if (this.destinationAddress) {
      console.log('📍 Geocoding destination from address:', this.destinationAddress);
      this.geocodeAddress(this.destinationAddress);
    } else {
      console.log('⏳ No destination address, waiting for fetchTripDetails...');
    }
  }

  /**
   * Géocoder une adresse avec Nominatim + fallback base locale
   */
  private async geocodeAddress(address: string) {
    try {
      console.log('🔍 Geocoding address:', address);

      if (!address || address.trim().length === 0) {
        console.error('❌ Empty address provided!');
        await this.showToast('Adresse vide', 'danger');
        return;
      }

      // ESSAI 1 : Chercher dans la base locale d'abord
      const localResult = this.searchLocalPOIDatabase(address);
      if (localResult) {
        console.log('✅ Found in local database:', localResult);
        this.destination = {
          lat: localResult.lat,
          lng: localResult.lng,
          address: localResult.address
        };

        if (this.map) {
          const destIcon = this.createDestinationIcon();
          this.destinationMarker = L.marker(
            [localResult.lat, localResult.lng],
            { icon: destIcon }
          ).addTo(this.map);

          this.destinationMarker.bindPopup(`
            <div style="text-align: center;">
              <b>🏁 Destination</b><br>
              <span style="color: #666; font-size: 12px;">${this.destination.address}</span>
            </div>
          `);

          await this.updateRoute();

          if (this.currentLocation) {
            const group = L.featureGroup([this.truckMarker, this.destinationMarker]);
            this.map.fitBounds(group.getBounds(), { padding: [50, 50] });
          }

          await this.showToast('✅ Destination trouvée', 'success');
        }
        return;
      }

      // ESSAI 2 : Nominatim via proxy CORS
      const searchAddress = address.includes('Tunisia') || address.includes('Tunisie')
        ? address
        : address + ', Tunisia';

      console.log('🔍 Searching Nominatim for:', searchAddress);

      const proxyUrl = 'https://corsproxy.io/?';
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&limit=5&addressdetails=1&accept-language=fr`;
      const fullUrl = proxyUrl + encodeURIComponent(nominatimUrl);

      const response = await fetch(fullUrl, {
        headers: {
          'User-Agent': 'TMS-MobileApp/1.0',
          'Accept-Language': 'fr'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📡 Geocoding result:', data);

      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);

        this.destination = {
          lat,
          lng,
          address: result.display_name || address
        };

        console.log('✅ Destination géocodée:', this.destination);

        if (this.map) {
          console.log('✅ Map is ready, adding destination marker...');
          const destIcon = this.createDestinationIcon();
          this.destinationMarker = L.marker(
            [lat, lng],
            { icon: destIcon }
          ).addTo(this.map);

          this.destinationMarker.bindPopup(`
            <div style="text-align: center;">
              <b>🏁 Destination</b><br>
              <span style="color: #666; font-size: 12px;">${this.destination.address}</span>
            </div>
          `);

          await this.updateRoute();

          if (this.currentLocation) {
            const group = L.featureGroup([this.truckMarker, this.destinationMarker]);
            this.map.fitBounds(group.getBounds(), { padding: [50, 50] });
          }

          await this.showToast('✅ Destination trouvée', 'success');
        } else {
          console.log('⏳ Map not ready yet, will add marker when map initializes...');
        }
      } else {
        console.warn('⚠️ Adresse non trouvée:', searchAddress);

        // ESSAI 3 : Fallback centre de la ville
        const cityOnly = address.split(',')[0].trim();
        const citySearch = `${cityOnly}, Tunisia`;
        const cityUrl = proxyUrl + encodeURIComponent(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(citySearch)}&limit=1&addressdetails=1&accept-language=fr`);
        
        const cityResponse = await fetch(cityUrl);
        const cityData = await cityResponse.json();
        
        if (cityData && cityData.length > 0) {
          const cityResult = cityData[0];
          this.destination = {
            lat: parseFloat(cityResult.lat),
            lng: parseFloat(cityResult.lon),
            address: cityResult.display_name || cityOnly
          };

          if (this.map) {
            const destIcon = this.createDestinationIcon();
            this.destinationMarker = L.marker(
              [this.destination.lat, this.destination.lng],
              { icon: destIcon }
            ).addTo(this.map);

            this.destinationMarker.bindPopup(`
              <div style="text-align: center;">
                <b>🏁 Destination</b><br>
                <span style="color: #666; font-size: 12px;">${this.destination.address}</span>
              </div>
            `);

            await this.updateRoute();

            if (this.currentLocation) {
              const group = L.featureGroup([this.truckMarker, this.destinationMarker]);
              this.map.fitBounds(group.getBounds(), { padding: [50, 50] });
            }

            await this.showToast('✅ Ville trouvée', 'success');
          }
        } else {
          // DERNIER RECOURS : Tunis
          this.destination = {
            lat: 36.8065,
            lng: 10.1815,
            address: 'Tunis, Tunisia'
          };

          if (this.map) {
            this.addDestinationMarker();
            setTimeout(() => {
              this.updateRoute();
            }, 500);
          }
          
          await this.showToast('⚠️ Utilisation Tunis par défaut', 'warning');
        }
      }
    } catch (error) {
      console.error('❌ Erreur de géocodage:', error);
      await this.showToast('Erreur de géocodage: ' + (error as Error).message, 'danger');
    }
  }

  /**
   * Chercher dans la base locale de POI tunisiens
   */
  private searchLocalPOIDatabase(address: string): { lat: number, lng: number, address: string } | null {
    const addressLower = address.toLowerCase();

    const LOCAL_POI = [
      // Tajerouine - CORRECTED coordinates
      { name: 'aziza tajerouine', lat: 35.8914, lng: 8.5530, address: 'Aziza Tajerouine Centre, Avenue Habib Bourguiba, Tajerouine' },
      { name: 'magasin general tajerouine', lat: 35.8930, lng: 8.5540, address: 'Magasin General Tajerouine, Avenue Habib Bourguiba, Tajerouine' },
      { name: 'tajerouine', lat: 35.8914, lng: 8.5530, address: 'Avenue Habib Bourguiba, Tajerouine' },
      { name: 'hôpital tajerouine', lat: 35.8920, lng: 8.5545, address: 'Hôpital Régional Tajerouine' },
      { name: 'école tajerouine', lat: 35.8920, lng: 8.5540, address: 'École Primaire Tajerouine' },
      { name: 'pharmacie tajerouine', lat: 35.8918, lng: 8.5535, address: 'Pharmacie Centrale Tajerouine' },
      
      // Grand Tunis
      { name: 'aziza la marsa', lat: 36.8790, lng: 10.3250, address: 'Aziza La Marsa Centre, Avenue Habib Bourguiba, La Marsa' },
      { name: 'magasin general la marsa', lat: 36.8785, lng: 10.3245, address: 'Magasin General La Marsa, Avenue Habib Bourguiba' },
      { name: 'aziza ariana', lat: 36.8625, lng: 10.1955, address: 'Aziza Ariana Centre, Avenue de la République, Ariana' },
      { name: 'magasin general ariana', lat: 36.8620, lng: 10.1950, address: 'Magasin General Ariana, Avenue de la République' },
      { name: 'carrefour lac', lat: 36.8380, lng: 10.2440, address: 'Carrefour Market Lac 1, Les Berges du Lac, Tunis' },
      { name: 'monoprix tunis', lat: 36.8050, lng: 10.1800, address: 'Monoprix Tunis Lafayette, Avenue de Paris' },
      
      // Sousse
      { name: 'aziza sousse', lat: 35.8295, lng: 10.6385, address: 'Aziza Sousse Centre, Avenue Habib Bourguiba' },
      { name: 'magasin general sousse', lat: 35.8290, lng: 10.6380, address: 'Magasin General Sousse, Avenue Habib Bourguiba' },
      
      // Sfax
      { name: 'aziza sfax', lat: 34.7405, lng: 10.7605, address: 'Aziza Sfax Centre, Rue Habib Maazoun' },
      { name: 'magasin general sfax', lat: 34.7400, lng: 10.7600, address: 'Magasin General Sfax, Route de Tunis' },
      
      // Bizerte
      { name: 'aziza bizerte', lat: 37.2745, lng: 9.8745, address: 'Aziza Bizerte Centre, Rue de la République' },
      { name: 'magasin general bizerte', lat: 37.2740, lng: 9.8740, address: 'Magasin General Bizerte, Rue de la République' },
      
      // Nabeul
      { name: 'aziza nabeul', lat: 36.4565, lng: 10.7375, address: 'Aziza Nabeul Centre, Avenue Habib Bourguiba' },
      { name: 'magasin general nabeul', lat: 36.4560, lng: 10.7370, address: 'Magasin General Nabeul, Avenue Habib Bourguiba' },
      
      // Gabes
      { name: 'aziza gabes', lat: 33.8875, lng: 10.0985, address: 'Aziza Gabes Centre, Avenue Habib Bourguiba' },
      { name: 'magasin general gabes', lat: 33.8870, lng: 10.0980, address: 'Magasin General Gabes, Avenue Habib Bourguiba' },
      
      // Kairouan
      { name: 'aziza kairouan', lat: 35.6785, lng: 10.0965, address: 'Aziza Kairouan Centre, Avenue de la République' },
      { name: 'magasin general kairouan', lat: 35.6780, lng: 10.0960, address: 'Magasin General Kairouan, Avenue de la République' },
      
      // Béja
      { name: 'aziza beja', lat: 36.7265, lng: 9.1845, address: 'Aziza Béja Centre, Avenue Habib Bourguiba' },
      { name: 'magasin general beja', lat: 36.7260, lng: 9.1840, address: 'Magasin General Béja, Avenue Habib Bourguiba' },
      
      // Jendouba
      { name: 'aziza jendouba', lat: 36.5065, lng: 8.7815, address: 'Aziza Jendouba Centre, Avenue Habib Bourguiba' },
      { name: 'magasin general jendouba', lat: 36.5060, lng: 8.7810, address: 'Magasin General Jendouba, Avenue Habib Bourguiba' },
      
      // Le Kef
      { name: 'aziza kef', lat: 36.1745, lng: 8.7055, address: 'Aziza El Kef Centre, Avenue Habib Bourguiba' },
      { name: 'magasin general kef', lat: 36.1740, lng: 8.7050, address: 'Magasin General Le Kef, Avenue Habib Bourguiba' },
      
      // Siliana
      { name: 'aziza siliana', lat: 36.0855, lng: 9.3705, address: 'Aziza Siliana Centre, Avenue Habib Bourguiba' },
      { name: 'magasin general siliana', lat: 36.0850, lng: 9.3700, address: 'Magasin General Siliana, Avenue Habib Bourguiba' },
      
      // Kasserine
      { name: 'aziza kasserine', lat: 35.1675, lng: 8.8365, address: 'Aziza Kasserine Centre, Avenue de la République' },
      { name: 'magasin general kasserine', lat: 35.1670, lng: 8.8360, address: 'Magasin General Kasserine, Avenue de la République' },
      
      // Sidi Bouzid
      { name: 'aziza sidi bouzid', lat: 35.0385, lng: 9.4855, address: 'Aziza Sidi Bouzid Centre, Avenue Habib Bourguiba' },
      { name: 'magasin general sidi bouzid', lat: 35.0380, lng: 9.4850, address: 'Magasin General Sidi Bouzid, Avenue Habib Bourguiba' },
      
      // Gafsa
      { name: 'aziza gafsa', lat: 34.4255, lng: 8.7845, address: 'Aziza Gafsa Centre, Avenue Habib Bourguiba' },
      { name: 'magasin general gafsa', lat: 34.4250, lng: 8.7840, address: 'Magasin General Gafsa, Avenue Habib Bourguiba' },
      
      // Tozeur
      { name: 'aziza tozeur', lat: 33.9195, lng: 8.1335, address: 'Aziza Tozeur Centre, Avenue Habib Bourguiba' },
      { name: 'magasin general tozeur', lat: 33.9190, lng: 8.1330, address: 'Magasin General Tozeur, Avenue Habib Bourguiba' },
      
      // Médenine
      { name: 'aziza medenine', lat: 33.3555, lng: 10.5055, address: 'Aziza Médenine Centre, Avenue Habib Bourguiba' },
      { name: 'magasin general medenine', lat: 33.3550, lng: 10.5050, address: 'Magasin General Médenine, Avenue Habib Bourguiba' },
      
      // Tataouine
      { name: 'aziza tataouine', lat: 32.9295, lng: 10.4515, address: 'Aziza Tataouine, Avenue de la République' },
      { name: 'magasin general tataouine', lat: 32.9290, lng: 10.4510, address: 'Magasin General Tataouine, Avenue de la République' },
      
      // Monastir
      { name: 'aziza monastir', lat: 35.7775, lng: 10.8265, address: 'Aziza Monastir Centre, Avenue de l\'Indépendance' },
      { name: 'magasin general monastir', lat: 35.7770, lng: 10.8260, address: 'Magasin General Monastir, Avenue de l\'Indépendance' },
      
      // Mahdia
      { name: 'aziza mahdia', lat: 35.5045, lng: 11.0625, address: 'Aziza Mahdia Centre, Avenue Habib Bourguiba' },
      { name: 'magasin general mahdia', lat: 35.5040, lng: 11.0620, address: 'Magasin General Mahdia, Avenue Habib Bourguiba' },
      
      // Zaghouan
      { name: 'aziza zaghouan', lat: 36.4035, lng: 10.1435, address: 'Aziza Zaghouan Centre, Avenue Habib Bourguiba' },
      { name: 'magasin general zaghouan', lat: 36.4030, lng: 10.1430, address: 'Magasin General Zaghouan, Avenue Habib Bourguiba' },
      
      // Ben Arous
      { name: 'aziza ben arous', lat: 36.7475, lng: 10.2185, address: 'Aziza Ben Arous, Avenue Habib Bourguiba' },
      { name: 'magasin general ben arous', lat: 36.7470, lng: 10.2180, address: 'Magasin General Ben Arous, Avenue Habib Bourguiba' },
      
      // Manouba
      { name: 'aziza manouba', lat: 36.8085, lng: 10.0985, address: 'Aziza Manouba, Avenue Habib Bourguiba' },
      { name: 'magasin general manouba', lat: 36.8080, lng: 10.0980, address: 'Magasin General Manouba, Centre-ville' },
    ];

    // Chercher un match
    for (const poi of LOCAL_POI) {
      if (addressLower.includes(poi.name)) {
        console.log(`📍 Found local POI: ${poi.name} -> ${poi.address}`);
        return { lat: poi.lat, lng: poi.lng, address: poi.address };
      }
    }

    return null;
  }

  /**
   * Camion 3D blanc/gris professionnel — proportions ajustées
   * Remorque plus courte et plus haute, effet 3D renforcé
   */
  private createTruckIcon(color?: string): L.DivIcon {
    return L.divIcon({
      html: `
        <div class="truck-v2">
          <svg viewBox="0 0 56 34" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <!-- Remorque blanc 3D -->
              <linearGradient id="wBody" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#fff;stop-opacity:1"/>
                <stop offset="100%" style="stop-color:#ececec;stop-opacity:1"/>
              </linearGradient>
              <!-- Côté remorque (gris 3D) -->
              <linearGradient id="wSide" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#e0e0e0;stop-opacity:1"/>
                <stop offset="100%" style="stop-color:#bbb;stop-opacity:1"/>
              </linearGradient>
              <!-- Haut remorque -->
              <linearGradient id="wTop" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#fff;stop-opacity:0.8"/>
                <stop offset="100%" style="stop-color:#f5f5f5;stop-opacity:0.4"/>
              </linearGradient>
              <!-- Cabine gris foncé 3D -->
              <linearGradient id="wCab" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#6a6a6a;stop-opacity:1"/>
                <stop offset="100%" style="stop-color:#4a4a4a;stop-opacity:1"/>
              </linearGradient>
              <!-- Côté cabine -->
              <linearGradient id="wCabSide" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#4a4a4a;stop-opacity:1"/>
                <stop offset="100%" style="stop-color:#333;stop-opacity:1"/>
              </linearGradient>
              <!-- Toit cabine -->
              <linearGradient id="wCabTop" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#888;stop-opacity:0.7"/>
                <stop offset="100%" style="stop-color:#666;stop-opacity:0.5"/>
              </linearGradient>
              <!-- Vitre -->
              <linearGradient id="wGlass" x1="20%" y1="0%" x2="80%" y2="100%">
                <stop offset="0%" style="stop-color:#b0bec5;stop-opacity:0.6"/>
                <stop offset="50%" style="stop-color:#cfd8dc;stop-opacity:0.3"/>
                <stop offset="100%" style="stop-color:#546e7a;stop-opacity:0.7"/>
              </linearGradient>
              <!-- Pneus -->
              <radialGradient id="wTire" cx="45%" cy="40%" r="55%">
                <stop offset="0%" style="stop-color:#444;stop-opacity:1"/>
                <stop offset="100%" style="stop-color:#1a1a1a;stop-opacity:1"/>
              </radialGradient>
              <!-- Jante -->
              <radialGradient id="wRim" cx="50%" cy="50%" r="50%">
                <stop offset="0%" style="stop-color:#eee;stop-opacity:1"/>
                <stop offset="100%" style="stop-color:#aaa;stop-opacity:1"/>
              </radialGradient>
              <!-- Ombre -->
              <filter id="wSh">
                <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#000" flood-opacity="0.15"/>
              </filter>
            </defs>

            <g filter="url(#wSh)">
              <!-- Ombre sol -->
              <ellipse cx="28" cy="32" rx="22" ry="1.8" fill="rgba(0,0,0,0.1)"/>

              <!-- === REMORQUE (plus courte, plus haute, 3D) === -->
              <!-- Face -->
              <rect x="4" y="8" width="18" height="16" rx="1.5" fill="url(#wBody)" stroke="#ccc" stroke-width="0.3"/>
              <!-- Côté 3D (profondeur) -->
              <path d="M22,9.5 L26,8 Q27.5,8 27.5,9.5 L27.5,23 Q27.5,24.5 26,24 L22,24 Z"
                    fill="url(#wSide)" stroke="#aaa" stroke-width="0.25"/>
              <!-- Haut 3D (dessus) -->
              <path d="M4,8 L22,8 L26,8 Q27.5,8 27.5,9.5 L5,10.5 Z" fill="url(#wTop)"/>

              <!-- Reflet haut remorque -->
              <rect x="5" y="8.5" width="16" height="3" rx="1" fill="#fff" opacity="0.25"/>
              <!-- Ombre basse remorque -->
              <rect x="4" y="22" width="18" height="2" rx="0.8" fill="#ddd" opacity="0.5"/>

              <!-- Rainures verticales -->
              <line x1="8" y1="8" x2="8" y2="24" stroke="#eee" stroke-width="0.3"/>
              <line x1="12" y1="8" x2="12" y2="24" stroke="#eee" stroke-width="0.3"/>
              <line x1="16" y1="8" x2="16" y2="24" stroke="#eee" stroke-width="0.3"/>
              <line x1="20" y1="8" x2="20" y2="24" stroke="#eee" stroke-width="0.3"/>

              <!-- Feux arrière -->
              <rect x="4" y="21" width="1.5" height="2.5" rx="0.5" fill="#e53935" opacity="0.7"/>

              <!-- === CABINE === -->
              <!-- Face cabine -->
              <path d="M27.5,10 L36,8 Q38,7.5 38,10 L38,24 Q38,25 36,25 L27.5,25 Z"
                    fill="url(#wCab)" stroke="#3a3a3a" stroke-width="0.3"/>
              <!-- Côté cabine -->
              <path d="M38,10 L42,8.5 Q43,8.5 43,10 L43,24 Q43,25 42,25 L38,25 Z"
                    fill="url(#wCabSide)" stroke="#2a2a2a" stroke-width="0.2"/>
              <!-- Toit cabine -->
              <path d="M27.5,8 L36,8 Q38,7.5 39,8 L42,8.5 L38,10 L27.5,10 Z"
                    fill="url(#wCabTop)"/>

              <!-- Vitre -->
              <path d="M30,11 L36,9.5 Q37,9.3 37,10.5 L37,18 L30,18 Z"
                    fill="url(#wGlass)" stroke="#455a64" stroke-width="0.25"/>
              <!-- Reflet vitre -->
              <path d="M31,11.5 L34,10.8 L34,15 L31,15.5 Z" fill="#cfd8dc" opacity="0.25"/>

              <!-- Phare -->
              <rect x="40" y="15" width="2.2" height="1.8" rx="0.5" fill="#ffee58" opacity="0.9">
                <animate attributeName="opacity" values="0.9;0.5;0.9" dur="2s" repeatCount="indefinite"/>
              </rect>
              <ellipse cx="41.1" cy="15.9" rx="0.8" ry="0.5" fill="#fff9c4"/>
              <!-- Clignotant -->
              <rect x="40" y="18" width="2.2" height="1" rx="0.3" fill="#ff9800" opacity="0.6"/>

              <!-- Pare-choc -->
              <rect x="38" y="23" width="5" height="1.5" rx="0.5" fill="#333"/>
              <!-- Bande chrome -->
              <rect x="39" y="23.3" width="3.5" height="0.4" rx="0.1" fill="#888" opacity="0.5"/>

              <!-- Rétroviseur -->
              <rect x="26" y="11" width="1.8" height="3" rx="0.7" fill="#555"/>
              <line x1="27.2" y1="12.5" x2="28.5" y2="12.5" stroke="#666" stroke-width="0.5"/>

              <!-- Châssis -->
              <rect x="8" y="23" width="34" height="1.5" rx="0.5" fill="#888"/>

              <!-- === ROUES === -->
              <!-- Avant -->
              <circle cx="35" cy="27.5" r="3.5" fill="url(#wTire)" stroke="#111" stroke-width="0.2"/>
              <circle cx="35" cy="27.5" r="2" fill="url(#wRim)"/>
              <circle cx="35" cy="27.5" r="0.7" fill="#888"/>
              <circle cx="35" cy="27.5" r="0.3" fill="#aaa"/>
              <!-- Arrière -->
              <circle cx="13" cy="27.5" r="3.5" fill="url(#wTire)" stroke="#111" stroke-width="0.2"/>
              <circle cx="13" cy="27.5" r="2" fill="url(#wRim)"/>
              <circle cx="13" cy="27.5" r="0.7" fill="#888"/>
              <circle cx="13" cy="27.5" r="0.3" fill="#aaa"/>

              <!-- Bavettes -->
              <path d="M8,23 L8,27 Q8,28 9,28 L10,28 L10,23" fill="#666" opacity="0.5"/>
              <path d="M31,23 L31,27 Q31,28 32,28 L33,28 L33,23" fill="#666" opacity="0.5"/>
            </g>
          </svg>
        </div>
      `,
      className: 'truck-v2',
      iconSize: [66, 38],
      iconAnchor: [33, 19]
    });
  }

  /**
   * Helper: Lighten color for highlights
   */
  private lightenColor(color: string, percent: number): string {
    if (color.startsWith('#')) {
      const num = parseInt(color.slice(1), 16);
      const amt = Math.round(2.55 * percent);
      const R = Math.min((num >> 16) + amt, 255);
      const G = Math.min((num >> 8 & 0x00FF) + amt, 255);
      const B = Math.min((num & 0x0000FF) + amt, 255);
      return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }
    return color;
  }

  /**
   * Helper: Darken color for 3D effect
   */
  private darkenColor(color: string, percent: number): string {
    if (color.startsWith('#')) {
      const num = parseInt(color.slice(1), 16);
      const amt = Math.round(2.55 * percent);
      const R = Math.max((num >> 16) - amt, 0);
      const G = Math.max((num >> 8 & 0x00FF) - amt, 0);
      const B = Math.max((num & 0x0000FF) - amt, 0);
      return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }
    return color;
  }

  /**
   * Créer l'icône de destination - Style Épingle Pro (Comme Google Maps/Uber)
   */
  private createDestinationIcon(): L.DivIcon {
    return L.divIcon({
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
  }

  /**
   * Mettre à jour la route avec OSRM - Style PROFESSIONNEL BLEU
   * Ligne bleue fine et élégante
   */
  private async updateRoute() {
    if (!this.currentLocation || !this.destination) {
      console.log('⚠️ Missing location or destination for route');
      return;
    }

    try {
      // Fetch route from OSRM - TOUJOURS chemin optimisé et optimal
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${this.currentLocation.lng},${this.currentLocation.lat};${this.destination.lng},${this.destination.lat}?overview=full&geometries=geojson`;

      console.log('🗺️ Fetching OPTIMIZED route from OSRM:', osrmUrl);

      const response = await fetch(osrmUrl);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]] as [number, number]);

        const distanceKm = (route.distance / 1000).toFixed(1);
        const durationMin = Math.round(route.duration / 60);
        console.log(`✅ Route optimisée: ${distanceKm} km, ${durationMin} min`);

        // Remove ONLY the old route polyline (NOT destination marker)
        if (this.routePolyline && this.map) {
          this.map.removeLayer(this.routePolyline);
          this.routePolyline = undefined;
        }

        // CHEMIN OPTIMISÉ BLEU - Route réelle OSRM
        this.routePolyline = L.polyline(coordinates, {
          color: '#1a73e8',
          weight: 6,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
          className: 'optimized-route'
        }).addTo(this.map);

        // Ajuster les bornes pour montrer tout le chemin
        const bounds = L.latLngBounds(coordinates);

        // Padding dynamique selon la distance
        let padding: [number, number] = [60, 60];
        let maxZoom = 15;

        if (route.distance > 100000) {
          padding = [80, 80];
          maxZoom = 11;
        } else if (route.distance > 50000) {
          padding = [70, 70];
          maxZoom = 12;
        } else if (route.distance > 20000) {
          padding = [65, 65];
          maxZoom = 13;
        }

        this.map.fitBounds(bounds, {
          padding,
          maxZoom,
          animate: true,
          duration: 0.5
        });

        // Ensure destination marker exists
        if (!this.destinationMarker && this.destination) {
          this.addDestinationMarker();
        }

        // Update route info
        this.routeInfo = {
          distance: route.distance,
          duration: route.duration
        };

        // Marquer le timestamp du dernier calcul de route
        this.lastRouteUpdate = Date.now();

      } else {
        console.warn('⚠️ OSRM ne peut pas calculer le chemin optimisé');
        this.routeInfo = this.routeInfo || { distance: 0, duration: 0 };
      }
    } catch (error) {
      console.error('❌ Error fetching route:', error);
      // PAS de ligne droite - afficher info uniquement
      this.routeInfo = this.routeInfo || { distance: 0, duration: 0 };
    }
  }

  // Store route information
  private routeInfo: { distance: number; duration: number } | null = null;

  /**
   * Démarrer le tracking GPS - TOUJOURS position réelle de l'appareil
   */
  private startGPSTracking() {
    const user = this.authService.currentUser();
    if (!user) return;

    // Connect to SignalR
    this.gpsService.connect((user as any).driverId);

    // Obtenir la position actuelle AVEC watchPosition pour un suivi continu réel
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          // TOUJOURS utiliser la position réelle de l'appareil
          this.currentLocation = { lat, lng };
          this.speed = position.coords.speed ? position.coords.speed * 3.6 : 0;
          this.accuracy = position.coords.accuracy;
          this.lastUpdate = new Date();

          console.log('📍 GPS Position (réelle appareil):', this.currentLocation, 'Accuracy:', this.accuracy, 'm');

          // Mettre à jour le camion IMMÉDIATEMENT sur la carte
          this.updateTruckPosition(lat, lng);

          // Démarrer le tracking continu SignalR (toutes les 5 secondes)
          this.gpsService.startTracking(
            (user as any).driverId,
            undefined,
            this.tripId
          );

          this.isTracking = true;
          console.log('✅ GPS Tracking started with watchPosition');
        },
        (error) => {
          console.error('❌ Erreur GPS:', error);
          // NE JAMAIS utiliser de position par défaut si GPS non disponible
          if (error.code === error.PERMISSION_DENIED) {
            this.showToast('⚠️ Autorisez la localisation GPS pour le suivi', 'danger');
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            this.showToast('⚠️ GPS non disponible, vérifiez vos paramètres', 'danger');
          } else if (error.code === error.TIMEOUT) {
            this.showToast('⏱️ Timeout GPS, réessayez en extérieur', 'warning');
          }
        },
        {
          enableHighAccuracy: true,  // GPS réel, pas WiFi/cellules
          timeout: 20000,            // 20s max pour obtenir une position
          maximumAge: 0              // JAMAIS de cache - TOUJOURS position actuelle
        }
      );
    } else {
      this.showToast('⚠️ Géolocalisation non supportée sur cet appareil', 'danger');
    }
  }

  private previousPosition: { lat: number, lng: number } | null = null;
  private lastRouteUpdate: number = 0;
  private readonly ROUTE_UPDATE_INTERVAL = 15000; // Route recalculée toutes les 15s

  /**
   * Mettre à jour la position du camion EN TEMPS RÉEL - même petites distances
   */
  private updateTruckPosition(lat: number, lng: number) {
    if (!this.truckMarker || !this.map) return;

    // Première position GPS réelle → rendre le marker visible
    if (this.truckMarker.options.opacity === 0) {
      this.truckMarker.setOpacity(1);
      this.truckMarker.setLatLng([lat, lng]);
      this.truckMarker.bindPopup(`<b>Votre Camion</b><br>Position actuelle<br><small>Précision: ${this.accuracy.toFixed(0)}m</small>`);
      // Centrer la carte sur la position réelle
      this.map.setView([lat, lng], 17);
      console.log('📍 Première position GPS obtenue → marqueur affiché');
    }

    const newPosition: [number, number] = [lat, lng];

    // Calculate GPS direction and rotate truck to face movement direction
    if (this.previousPosition) {
      const bearing = this.calculateRotationAngle(
        this.previousPosition.lat,
        this.previousPosition.lng,
        lat,
        lng
      );

      const truckElement = this.truckMarker?.getElement();
      if (truckElement) {
        // Truck points RIGHT by default (cabine à droite)
        // bearing=0 (north) → rotate -90deg (face le haut)
        // bearing=90 (east) → rotate 0deg (face la droite, position par défaut)
        truckElement.style.transform = `rotate(${bearing - 90}deg)`;
      }
    }

    // Update speed badge
    this.updateSpeedBadge();

    // Update marker position IMMÉDIATEMENT (sans animation brusque)
    this.truckMarker.setLatLng(newPosition);

    // Pan map SANS zoom excessif pour les petites distances
    this.map.panTo(newPosition, {
      animate: true,
      duration: 0.8,
      noMoveStart: true
    });

    // Recalculer la route SEULEMENT toutes les 15 secondes (économie API)
    const now = Date.now();
    if (this.destination && (now - this.lastRouteUpdate > this.ROUTE_UPDATE_INTERVAL)) {
      console.log('🗺️ Recalcul route optimisée...');
      this.updateRoute();
      this.lastRouteUpdate = now;
    }

    // Stocker position pour prochain calcul de direction
    this.previousPosition = { lat, lng };
  }

  /**
   * Calculate rotation angle between two GPS coordinates
   */
  private calculateRotationAngle(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dLng = lng2 - lng1;
    const dLat = lat2 - lat1;
    
    // Calculate bearing in radians
    const y = Math.sin(dLng * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
              Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLng * Math.PI / 180);
    
    // Convert to degrees
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    
    // Normalize to 0-360
    bearing = (bearing + 360) % 360;
    
    return bearing;
  }

  /**
   * Update wheel animation speed based on vehicle speed
   */
  private updateWheelAnimationSpeed() {
    const wheelElements = document.querySelectorAll('.wheel-spokes, .truck-wheels');
    
    // Calculate animation duration based on speed (faster speed = shorter duration)
    // Base duration: 1s at 0 km/h, minimum 0.2s at high speed
    const baseDuration = 1;
    const minDuration = 0.2;
    const maxSpeed = 100; // km/h
    
    let duration = baseDuration - (this.speed / maxSpeed) * (baseDuration - minDuration);
    duration = Math.max(minDuration, Math.min(baseDuration, duration));
    
    wheelElements.forEach(element => {
      const htmlElement = element as HTMLElement;
      htmlElement.style.animationDuration = `${duration}s`;
    });
    
    // Add/remove moving class based on speed
    const truckContainer = this.truckMarker?.getElement();
    if (truckContainer) {
      if (this.speed > 1) {
        truckContainer.classList.add('truck-moving');
        truckContainer.classList.remove('truck-idle');
      } else {
        truckContainer.classList.add('truck-idle');
        truckContainer.classList.remove('truck-moving');
      }
    }
  }

  /**
   * Update speed badge with current speed and color coding
   */
  private updateSpeedBadge() {
    const speedBadge = document.querySelector('.speed-badge') as HTMLElement;
    if (speedBadge) {
      // Update speed text
      speedBadge.textContent = this.speed > 0 ? `${Math.round(this.speed)} km/h` : 'STOP';
      
      // Update color based on speed
      speedBadge.classList.remove('speed-high', 'speed-medium', 'speed-low');
      
      if (this.speed > 80) {
        speedBadge.classList.add('speed-high');
      } else if (this.speed > 40) {
        speedBadge.classList.add('speed-medium');
      } else {
        speedBadge.classList.add('speed-low');
      }
    }
  }

  /**
   * Rafraîchir la position
   */
  refreshPosition() {
    this.startGPSTracking();
  }

  /**
   * Calculer la distance restante (Haversine formula)
   */
  getDistanceRemaining(): number {
    if (!this.currentLocation || !this.destination) return 0;

    const R = 6371; // Rayon de la terre en km
    const dLat = this.toRad(this.destination.lat - this.currentLocation.lat);
    const dLng = this.toRad(this.destination.lng - this.currentLocation.lng);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(this.currentLocation.lat)) *
              Math.cos(this.toRad(this.destination.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  private toRad(degrees: number): number {
    return degrees * Math.PI / 180;
  }

  /**
   * Estimer le temps restant
   */
  getEstimatedTime(): string {
    // Use route info if available (more accurate)
    if (this.routeInfo && this.routeInfo.duration > 0) {
      const minutes = Math.round(this.routeInfo.duration / 60);
      if (minutes < 60) {
        return `${minutes} min`;
      }
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}min`;
    }

    // Fallback to speed-based calculation
    const distance = this.getDistanceRemaining();
    if (!this.speed || distance === 0) return '-- min';

    const timeHours = distance / this.speed;
    const timeMinutes = Math.round(timeHours * 60);
    return `${timeMinutes} min`;
  }

  /**
   * Get total route distance from OSRM
   */
  getRouteDistance(): string {
    if (this.routeInfo && this.routeInfo.distance > 0) {
      const km = this.routeInfo.distance / 1000;
      if (km >= 1) {
        return `${km.toFixed(1)} km`;
      }
      return `${Math.round(this.routeInfo.distance)} m`;
    }
    return '';
  }

  /**
   * Update mission status
   */
  async updateMissionStatus(newStatus: string) {
    if (!this.tripId) {
      await this.showToast('Trip ID non disponible', 'danger');
      return;
    }

    try {
      // Send status update via SignalR
      switch (newStatus) {
        case 'accepted':
          await this.gpsService.acceptTrip(this.tripId);
          this.missionStatus = 'accepted';
          await this.showToast('✅ Mission acceptée', 'success');
          break;
        case 'loading':
          await this.gpsService.startLoading(this.tripId);
          this.missionStatus = 'loading';
          await this.showToast('📦 Chargement commencé', 'success');
          break;
        case 'delivery':
          await this.gpsService.startDelivery(this.tripId);
          this.missionStatus = 'delivery';
          await this.showToast('🚚 Livraison en cours', 'success');
          break;
        case 'completed':
          await this.gpsService.completeTrip(this.tripId);
          this.missionStatus = 'completed';
          await this.showToast('🎉 Livraison terminée!', 'success');
          break;
      }
    } catch (error) {
      console.error('Error updating status:', error);
      await this.showToast('Erreur lors de la mise à jour', 'danger');
    }
  }

  /**
   * Accept mission - Admin notified in real-time
   */
  async acceptMission() {
    // Check if tripId is valid
    if (!this.tripId) {
      console.error('❌ No tripId available for acceptance!');
      await this.showToast('❌ Erreur: Trip ID non disponible', 'danger');
      return;
    }

    try {
      console.log('✅ Driver accepting mission, tripId:', this.tripId);

      // Show loading
      const loading = await this.loadingController.create({
        message: 'Acceptation en cours...',
        duration: 3000
      });
      await loading.present();

      // Update local status
      this.missionStatus = 'accepted';

      // Send acceptance via SignalR - this will notify admin in real-time
      await this.gpsService.acceptTrip(this.tripId);

      console.log('✅ AcceptTrip SignalR call completed - Admin notified');

      // Show success feedback
      await this.showToast('✅ Mission acceptée - Admin notifié en temps réel', 'success');

      // Dismiss loading
      await loading.dismiss();

      // Speak confirmation if voice navigation is enabled
      if (this.voiceNavigationEnabled) {
        this.speak('Mission acceptée. Je vais vous guider vers la destination.');
      }

      // Start navigation to destination
      setTimeout(() => {
        this.provideNavigationInstructions();
      }, 1000);

    } catch (error) {
      console.error('❌ Error accepting mission:', error);
      await this.showToast('Erreur lors de l\'acceptation', 'danger');
    }
  }

  /**
   * Reject mission - Admin notified in real-time + Redirect to home
   */
  async rejectMission() {
    if (!this.tripId) {
      console.error('❌ No tripId for rejectMission');
      return;
    }

    const alert = await this.alertController.create({
      header: '❌ Raison du refus',
      subHeader: 'Votre refus sera notifié à l\'admin en temps réel',
      inputs: [
        {
          name: 'reason',
          type: 'radio',
          label: '🌧️ Mauvais temps',
          value: 'BadWeather',
          checked: true // Pre-select first option
        },
        {
          name: 'reason',
          type: 'radio',
          label: '🚛 Camion non disponible',
          value: 'Unavailable',
        },
        {
          name: 'reason',
          type: 'radio',
          label: '⚙️ Problème technique',
          value: 'Technical',
        },
        {
          name: 'reason',
          type: 'radio',
          label: '🏥 Raison médicale',
          value: 'Medical',
        },
        {
          name: 'reason',
          type: 'radio',
          label: '📋 Autre',
          value: 'Other',
        }
      ],
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel',
          handler: () => {
            console.log('❌ Refus annulé');
          }
        },
        {
          text: 'Refuser',
          handler: async (data: any) => {
            // Force a reason to be selected
            const selectedReason = data?.reason || 'BadWeather'; // Default to first option
            
            // Check if tripId is valid
            if (!this.tripId) {
              console.error('❌ No tripId available for rejection!');
              await this.showToast('❌ Erreur: Trip ID non disponible', 'danger');
              return;
            }
            
            try {
              console.log('❌ Driver rejecting mission, tripId:', this.tripId, 'reason:', selectedReason);

              // Show loading
              const loading = await this.loadingController.create({
                message: 'Refus en cours...',
                duration: 3000
              });
              await loading.present();

              // Send rejection via SignalR - this will notify admin in real-time
              await this.gpsService.rejectTrip(this.tripId, selectedReason, selectedReason);

              console.log('✅ RejectTrip SignalR call completed - Admin notified');

              // Update local status
              this.missionStatus = 'refused';

              await this.showToast('❌ Mission refusée - Admin notifié en temps réel', 'danger');

              // Dismiss loading
              await loading.dismiss();

              console.log('🏠 Navigating to home immediately...');
              // Navigate back home immediately after choosing reason
              await this.router.navigate(['/home']);

            } catch (error) {
              console.error('❌ Error rejecting mission:', error);
              await this.showToast('Erreur lors du refus', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Start loading directly
   */
  async startLoading() {
    await this.updateMissionStatus('loading');
  }

  /**
   * Start delivery directly
   */
  async startDelivery() {
    await this.updateMissionStatus('delivery');
  }

  /**
   * Complete mission directly
   */
  async completeMission() {
    await this.updateMissionStatus('completed');
  }

  /**
   * Show toast message
   */
  async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    await toast.present();
  }

  /**
   * Get status icon
   */
  getStatusIcon(): string {
    switch (this.missionStatus) {
      case 'pending': return 'time';
      case 'accepted': return 'checkmark-circle';
      case 'loading': return 'cube';
      case 'delivery': return 'boat';
      case 'completed': return 'checkmark-done-circle';
      case 'refused': return 'close-circle';
      default: return 'help-circle';
    }
  }

  /**
   * Get status color
   */
  getStatusColor(): string {
    switch (this.missionStatus) {
      case 'pending': return 'warning';
      case 'accepted': return 'primary';
      case 'loading': return 'success';
      case 'delivery': return 'secondary';
      case 'completed': return 'success';
      case 'refused': return 'danger';
      default: return 'medium';
    }
  }

  /**
   * Get status text
   */
  getStatusText(): string {
    switch (this.missionStatus) {
      case 'pending': return 'En attente d\'acceptation';
      case 'accepted': return 'Mission acceptée';
      case 'loading': return 'Chargement en cours';
      case 'delivery': return 'Livraison en cours';
      case 'completed': return 'Mission terminée';
      case 'refused': return 'Mission refusée';
      default: return 'État inconnu';
    }
  }

  /**
   * Toggle Voice Navigation
   */
  toggleVoiceNavigation() {
    this.voiceNavigationEnabled = !this.voiceNavigationEnabled;

    if (this.voiceNavigationEnabled) {
      this.showToast('🔊 Navigation vocale activée', 'success');
      this.speak('Navigation vocale activée. Je vais vous guider intelligemment vers la destination.');
      
      // Reset navigation tracking
      this.currentInstruction = '';
      this.lastInstructionTime = null;
      this.instructionRepeatCount = 0;
      
      // Start providing navigation instructions
      setTimeout(() => {
        this.provideNavigationInstructions();
      }, 1000);
    } else {
      this.showToast('🔇 Navigation vocale désactivée', 'medium');
      this.stopSpeaking();
      this.stopIntelligentNavigationCheck();
      
      // Reset tracking
      this.currentInstruction = '';
      this.lastInstructionTime = null;
      this.instructionRepeatCount = 0;
    }
  }

  /**
   * Provide intelligent navigation instructions based on route - EN FRANÇAIS
   * Navigation INTELLIGENTE avec répétition si instruction non suivie + TEMPS RÉEL
   */
  private async provideNavigationInstructions() {
    if (!this.voiceNavigationEnabled || !this.currentLocation || !this.destination) {
      return;
    }

    try {
      // Fetch route with turn-by-turn instructions from OSRM
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${this.currentLocation.lng},${this.currentLocation.lat};${this.destination.lng},${this.destination.lat}?overview=full&geometries=geojson&steps=true`;

      const response = await fetch(osrmUrl);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const legs = route.legs;

        if (legs && legs.length > 0) {
          const steps = legs[0].steps;
          const instructions: string[] = [];
          let nextCriticalInstruction = '';
          let distanceToNextInstruction = 0;
          let currentStepIndex = -1;

          // Calculate current position along route
          const totalDistance = route.distance;
          let distanceTraveled = 0;

          // Extract navigation instructions from route steps
          steps.forEach((step: any, index: number) => {
            const maneuver = step.maneuver;
            const instruction = this.convertManeuverToInstruction(maneuver.type, maneuver.modifier, step.name);
            const distance = step.distance;

            if (instruction && distance) {
              const distanceText = this.formatDistance(distance);
              const fullInstruction = `${instruction} dans ${distanceText}`;
              instructions.push(fullInstruction);

              // Track current step
              if (distanceTraveled <= (totalDistance * 0.1) && currentStepIndex === -1) {
                currentStepIndex = index;
              }
              distanceTraveled += distance;

              // Find next critical instruction (turn, roundabout, etc.)
              if (!nextCriticalInstruction && 
                  ['turn', 'roundabout', 'rotary', 'fork', 'merge'].includes(maneuver.type) &&
                  maneuver.type !== 'depart') {
                nextCriticalInstruction = fullInstruction;
                distanceToNextInstruction = distance;
              }
            }
          });

          this.navigationInstructions = instructions;

          // Calculate remaining distance and time
          const remainingDistance = this.getDistanceRemaining() * 1000; // meters
          const remainingTime = route.duration; // seconds

          // INTELLIGENT REPETITION LOGIC
          const now = new Date();
          const shouldRepeat = this.shouldRepeatInstruction(nextCriticalInstruction, distanceToNextInstruction, now);

          if (shouldRepeat && nextCriticalInstruction) {
            const urgency = this.getUrgencyLevel(distanceToNextInstruction);
            const repeatedInstruction = this.addUrgencyToInstruction(nextCriticalInstruction, urgency);
            this.speak(repeatedInstruction);
            this.currentInstruction = nextCriticalInstruction;
            this.lastInstructionTime = now;
            this.instructionRepeatCount++;
            
            console.log(`🔊 Repeating instruction (${this.instructionRepeatCount}x, ${urgency}): ${repeatedInstruction}`);
          } else if (nextCriticalInstruction && nextCriticalInstruction !== this.lastNavigationInstruction) {
            // New instruction - announce with context
            const contextMessage = this.getContextMessage(remainingDistance, remainingTime);
            if (contextMessage) {
              this.speak(contextMessage);
              setTimeout(() => {
                this.speak(nextCriticalInstruction);
              }, 1500);
            } else {
              this.speak(nextCriticalInstruction);
            }
            
            this.currentInstruction = nextCriticalInstruction;
            this.lastNavigationInstruction = nextCriticalInstruction;
            this.lastInstructionTime = now;
            this.instructionRepeatCount = 1;
            
            console.log(`🔊 New instruction: ${nextCriticalInstruction}`);
          }

          // Start intelligent checking interval
          this.startIntelligentNavigationCheck();
        }
      }
    } catch (error) {
      console.error('Error fetching navigation instructions:', error);
    }
  }

  /**
   * Get contextual message based on remaining distance/time
   */
  private getContextMessage(remainingDistance: number, remainingTime: number): string {
    const distanceKm = remainingDistance / 1000;
    const timeMinutes = remainingTime / 60;

    // Only give context message at start or major checkpoints
    if (distanceKm > 5 && this.instructionRepeatCount <= 1) {
      const timeText = timeMinutes > 60 
        ? `${Math.round(timeMinutes / 60)}h${Math.round(timeMinutes % 60)}`
        : `${Math.round(timeMinutes)} minutes`;
      const distanceText = distanceKm > 10 
        ? `${Math.round(distanceKm)} kilomètres`
        : `${Math.round(distanceKm * 10) / 10} kilomètres`;
      
      return `Trajet de ${distanceText}, environ ${timeText}. Je vais vous guider.`;
    }
    
    return '';
  }

  /**
   * Determine if instruction should be repeated based on time and distance
   */
  private shouldRepeatInstruction(instruction: string, distanceToInstruction: number, now: Date): boolean {
    if (!this.lastInstructionTime || !this.currentInstruction) {
      return false;
    }

    const timeSinceLastInstruction = (now.getTime() - this.lastInstructionTime.getTime()) / 1000; // seconds
    const distanceKm = distanceToInstruction / 1000;

    // Repeat if:
    // 1. Same instruction as before
    // 2. More than 10 seconds since last announcement
    // 3. Still more than 100m to the maneuver
    // 4. Less than 3 repeats so far
    const shouldRepeat = 
      instruction === this.currentInstruction &&
      timeSinceLastInstruction > 10 &&
      distanceKm > 0.1 &&
      this.instructionRepeatCount < 3;

    return shouldRepeat;
  }

  /**
   * Start intelligent navigation checking - repeats instructions if needed
   */
  private startIntelligentNavigationCheck() {
    // Clear previous interval
    if (this.navigationCheckInterval) {
      clearInterval(this.navigationCheckInterval);
    }

    // Check every 5 seconds if instruction needs to be repeated
    this.navigationCheckInterval = setInterval(() => {
      if (!this.voiceNavigationEnabled || !this.currentLocation || !this.destination) {
        this.stopIntelligentNavigationCheck();
        return;
      }

      const now = new Date();
      const shouldRepeat = this.shouldRepeatInstruction(
        this.currentInstruction, 
        this.getDistanceToNextManeuver(), 
        now
      );

      if (shouldRepeat) {
        const urgency = this.getUrgencyLevel(this.getDistanceToNextManeuver());
        const repeatedInstruction = this.addUrgencyToInstruction(this.currentInstruction, urgency);
        this.speak(repeatedInstruction);
        
        console.log(`⚠️ Urgent repetition (${urgency}): ${repeatedInstruction}`);
      }
    }, 5000);
  }

  /**
   * Stop intelligent navigation checking
   */
  private stopIntelligentNavigationCheck() {
    if (this.navigationCheckInterval) {
      clearInterval(this.navigationCheckInterval);
      this.navigationCheckInterval = null;
    }
  }

  /**
   * Get distance to next maneuver
   */
  private getDistanceToNextManeuver(): number {
    // Simplified: return remaining distance to destination
    return this.getDistanceRemaining() * 1000; // in meters
  }

  /**
   * Get urgency level based on distance to maneuver
   */
  private getUrgencyLevel(distance: number): 'soon' | 'very-soon' | 'immediate' {
    const distanceMeters = distance;
    
    if (distanceMeters < 50) {
      return 'immediate';
    } else if (distanceMeters < 100) {
      return 'very-soon';
    } else {
      return 'soon';
    }
  }

  /**
   * Add urgency to instruction
   */
  private addUrgencyToInstruction(instruction: string, urgency: 'soon' | 'very-soon' | 'immediate'): string {
    switch (urgency) {
      case 'immediate':
        return `Maintenant ! ${instruction}`;
      case 'very-soon':
        return `Très bientôt ! ${instruction}`;
      case 'soon':
      default:
        return instruction;
    }
  }

  /**
   * Convert OSRM maneuver to French instruction - NAVIGATION INTELLIGENTE
   */
  private convertManeuverToInstruction(type: string, modifier?: string, streetName?: string): string {
    const streetText = streetName ? `sur ${streetName}` : '';

    switch (type) {
      case 'depart':
        return 'Départ';
      case 'turn':
        const turnInstructions: { [key: string]: string } = {
          'left': 'Tournez à gauche',
          'right': 'Tournez à droite',
          'sharp left': 'Tournez franchement à gauche',
          'sharp right': 'Tournez franchement à droite',
          'slight left': 'Obliquez légèrement à gauche',
          'slight right': 'Obliquez légèrement à droite',
          'uturn': 'Faites demi-tour'
        };
        return `${turnInstructions[modifier || 'straight'] || 'Continuez'} ${streetText}`;
      case 'new name':
        return `Continuez ${streetText}`;
      case 'continue':
        return `Continuez tout droit ${streetText}`;
      case 'roundabout':
        return `Prenez le rond-point ${streetText}`;
      case 'rotary':
        return `Prenez le giratoire ${streetText}`;
      case 'merge':
        return `Rejoignez la route ${streetText}`;
      case 'fork':
        return `Prenez la fourche ${streetText}`;
      case 'end of road':
        return `À la fin de la route ${streetText}`;
      case 'arrive':
        return 'Vous êtes arrivé à destination';
      default:
        return `Continuez ${streetText}`;
    }
  }

  /**
   * Format distance for display
   */
  private formatDistance(meters: number): string {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} mètres`;
  }

  /**
   * Speak text using Text-to-Speech - VOIX FRANÇAISE
   * Translates Arabic text to French before speaking
   */
  private speak(text: string) {
    if (!this.voiceNavigationEnabled || !text) return;

    // Stop any ongoing speech
    this.stopSpeaking();

    // Translate Arabic to French if needed
    const translatedText = this.translateArabicToFrench(text);

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(translatedText);
      utterance.lang = 'fr-FR'; // French
      utterance.rate = 0.95; // Slightly slower for clarity
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        this.isSpeaking = true;
      };

      utterance.onend = () => {
        this.isSpeaking = false;
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        this.isSpeaking = false;
      };

      speechSynthesis.speak(utterance);
    } else {
      console.warn('Text-to-Speech not supported');
    }
  }

  /**
   * Translate Arabic text to French for voice navigation
   * Transliterates Arabic script to French phonetics for proper pronunciation
   */
  private translateArabicToFrench(text: string): string {
    if (!text) return text;

    // Check if text contains Arabic script
    if (!/[\u0600-\u06FF]/.test(text)) {
      return text; // No Arabic, return as-is
    }

    console.log('🔤 Arabic text detected:', text);

    // Arabic to French phonetic transliteration map
    const transliterations: { [key: string]: string } = {
      // Common street types
      'شارع': 'rue',
      'نهج': 'rue',
      'طريق': 'route',
      'جادة': 'avenue',
      'بوليفار': 'boulevard',
      'ساحة': 'place',
      'زنقة': 'impasse',
      
      // Cities and regions in Tunisia
      'تونس': 'Tunis',
      'أريانة': 'Ariana',
      'بن عروس': 'Ben Arous',
      'المنوبة': 'Manouba',
      'نابل': 'Nabeul',
      'زغوان': 'Zaghouan',
      'بنزرت': 'Bizerte',
      'باجة': 'Béja',
      'جندوبة': 'Jendouba',
      'الكاف': 'Le Kef',
      'سليانة': 'Siliana',
      'قيروان': 'Kairouan',
      'القيروان': 'Kairouan',
      'القصرين': 'Kasserine',
      'سيدي بوزيد': 'Sidi Bouzid',
      'سوسة': 'Sousse',
      'المنستير': 'Monastir',
      'المهدية': 'Mahdia',
      'صفاقس': 'Sfax',
      'قفصة': 'Gafsa',
      'توزر': 'Tozeur',
      'قبلي': 'Kébili',
      'تطاوين': 'Tataouine',
      'مدنين': 'Médenine',
      'جربة': 'Djerba',
      
      // Common place names
      'المنزه': 'Menzah',
      'المرسى': 'Marsa',
      'باردو': 'Bardo',
      'أوتيك': 'Ottak',
      'المدينة': 'Médina',
      'الوسط': 'Centre',
      'الجنوب': 'Sud',
      'الشمال': 'Nord',
      
      // Directions
      'يسار': 'gauche',
      'يمين': 'droite',
      'أمام': 'tout droit',
      'خلف': 'derrière',
      
      // Actions
      'دور': 'tournez',
      'خذ': 'prenez',
      'استمر': 'continuez',
      'امش': 'marchez',
      'اتجه': 'dirigez-vous',
    };

    let translated = text;

    // Apply transliterations (longer phrases first)
    Object.keys(transliterations)
      .sort((a, b) => b.length - a.length) // Sort by length (longest first)
      .forEach(arabic => {
        const regex = new RegExp(arabic, 'g');
        translated = translated.replace(regex, transliterations[arabic]);
      });

    // Character-by-character transliteration for remaining Arabic
    const charMap: { [key: string]: string } = {
      'ا': 'a',
      'أ': 'a',
      'إ': 'i',
      'آ': 'aa',
      'ب': 'b',
      'ت': 't',
      'ث': 'th',
      'ج': 'j',
      'ح': 'h',
      'خ': 'kh',
      'د': 'd',
      'ذ': 'dh',
      'ر': 'r',
      'ز': 'z',
      'س': 's',
      'ش': 'ch',
      'ص': 's',
      'ض': 'd',
      'ط': 't',
      'ظ': 'z',
      'ع': 'a',
      'غ': 'gh',
      'ف': 'f',
      'ق': 'k',
      'ك': 'k',
      'ل': 'l',
      'م': 'm',
      'ن': 'n',
      'ه': 'h',
      'و': 'ou',
      'ي': 'i',
      'ى': 'a',
      'ة': 'a',
      ' ': ' ',
    };

    // Transliterate any remaining Arabic characters
    let result = '';
    for (const char of translated) {
      result += charMap[char] || char;
    }

    console.log('🔤 Transliterated to:', result);

    return result;
  }

  /**
   * Stop current speech
   */
  private stopSpeaking() {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    this.isSpeaking = false;
  }

  /**
   * Announce direction based on bearing to destination
   */
  private announceDirection() {
    if (!this.currentLocation || !this.destination) return;

    const bearing = this.calculateBearingToDestination();
    const direction = this.getBearingDirection(bearing);
    
    const distance = this.getDistanceRemaining();
    const distanceText = this.formatDistance(distance * 1000); // Convert km to meters

    if (distance < 0.5) { // Less than 500m
      this.speak(`Vous êtes arrivé à destination dans ${distanceText}`);
    } else if (distance < 2) { // Less than 2km
      this.speak(`Continuez vers ${direction}, destination dans ${distanceText}`);
    }
  }

  /**
   * Calculate bearing to destination
   */
  private calculateBearingToDestination(): number {
    if (!this.currentLocation || !this.destination) return 0;

    const lat1 = this.toRad(this.currentLocation.lat);
    const lat2 = this.toRad(this.destination.lat);
    const dLng = this.toRad(this.destination.lng - this.currentLocation.lng);

    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

    const bearing = Math.atan2(y, x);
    return (this.toDeg(bearing) + 360) % 360;
  }

  /**
   * Convert bearing to direction text
   */
  private getBearingDirection(bearing: number): string {
    const directions = ['Nord', 'Nord-Est', 'Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  }

  private toDeg(rad: number): number {
    return rad * 180 / Math.PI;
  }
}
