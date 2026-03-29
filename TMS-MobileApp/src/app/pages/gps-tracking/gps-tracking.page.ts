import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { GPSTrackingService, GPSPosition } from '../../services/gps-tracking.service';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
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
  destinationMarker!: L.Marker;
  routePolyline!: L.Polyline;

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

  constructor(
    private gpsService: GPSTrackingService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    // Read from query params
    this.tripId = Number(this.route.snapshot.queryParamMap.get('tripId'));
    this.tripReference = this.route.snapshot.queryParamMap.get('tripReference') || '';
    this.destinationAddress = this.route.snapshot.queryParamMap.get('destination') || '';

    console.log('🗺️ GPS Tracking - Trip ID:', this.tripId);
    console.log('🏁 Destination from params:', this.destinationAddress);

    // If destination is empty, try to fetch it from the trip details
    if (!this.destinationAddress || this.destinationAddress.trim() === '') {
      console.log('⚠️ No destination in params, will fetch from trip details');
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
   * Fetch trip details to get destination address
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
      
      const response = await fetch(`http://localhost:5191/api/Trips/${this.tripId}`, {
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
        
        // Get destination from last delivery
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
                  address: lastDelivery.deliveryAddress || 'Destination'
                };
                
                console.log('✅ Destination loaded from geolocation:', this.destination);
                
                // Add destination marker if map is ready
                if (this.map) {
                  this.addDestinationMarker();
                  this.updateRoute();
                }
                return;
              }
            }
          }
          
          // Fallback to address text and geocode it
          this.destinationAddress = lastDelivery.deliveryAddress || '';
          console.log('📝 Destination address from delivery:', this.destinationAddress);
          
          if (this.destinationAddress && this.destinationAddress.trim().length > 0) {
            await this.geocodeAddress(this.destinationAddress);
          }
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
    if (!this.destination || !this.map) return;

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
  }

  ngOnDestroy() {
    this.gpsService.stopTracking();
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

    // Centre sur la Tunisie
    const tunisiaCenter: [number, number] = [36.8065, 10.1815];

    this.map = L.map('map', {
      center: tunisiaCenter,
      zoom: 10,
      minZoom: 8,
      maxZoom: 16,
      zoomControl: true,
      attributionControl: true,
      preferCanvas: true
    });

    // Tuiles OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 16,
      minZoom: 8
    }).addTo(this.map);

    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 500);

    // Créer le marker du camion
    const truckIcon = this.createTruckIcon();
    this.truckMarker = L.marker([36.8, 10.1], { icon: truckIcon }).addTo(this.map);
    this.truckMarker.bindPopup(`<b>Votre Camion</b><br>Position actuelle`);

    // Géocoder la destination si fournie
    if (this.destinationAddress) {
      this.geocodeAddress(this.destinationAddress);
    }
  }

  /**
   * Géocoder une adresse avec Nominatim
   */
  private async geocodeAddress(address: string) {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);

        this.destination = {
          lat,
          lng,
          address: result.display_name || address
        };

        console.log('Destination géocodée:', this.destination);

        // Ajouter le marker de destination
        const destIcon = this.createDestinationIcon();
        this.destinationMarker = L.marker(
          [lat, lng],
          { icon: destIcon }
        ).addTo(this.map);

        this.destinationMarker.bindPopup(`
          <div style="text-align: center;">
            <b>Destination</b><br>
            <span style="color: #666; font-size: 12px;">${this.destination.address}</span>
          </div>
        `);

        // Mettre à jour la route
        this.updateRoute();

        // Ajuster la vue pour voir les deux markers
        if (this.currentLocation) {
          const group = L.featureGroup([this.truckMarker, this.destinationMarker]);
          this.map.fitBounds(group.getBounds(), { padding: [50, 50] });
        }
      } else {
        console.warn('Adresse non trouvée:', address);
        await this.showToast('Adresse non trouvée, utilisation de la destination par défaut', 'warning');
      }
    } catch (error) {
      console.error('Erreur de géocodage:', error);
      await this.showToast('Erreur de géocodage', 'danger');
    }
  }

  /**
   * Créer l'icône du camion - ULTRA RÉALISTE comme un vrai camion de livraison
   * Design: Camion moderne avec cabine avancée, proportions réalistes
   */
  private createTruckIcon(color?: string): L.DivIcon {
    const truckColor = color || '#2563eb'; // Bleu moderne

    return L.divIcon({
      html: `
        <div class="truck-marker-container" style="
          position: relative;
          width: 60px;
          height: 60px;
          filter: drop-shadow(0 4px 10px rgba(0,0,0,0.45));
          transition: transform 0.15s ease-out;
        ">
          <!-- Ultra Realistic Modern Delivery Truck -->
          <svg width="60" height="60" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <!-- Main body metallic gradient -->
              <linearGradient id="bodyMetal" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#60a5fa;stop-opacity:1" />
                <stop offset="20%" style="stop-color:#3b82f6;stop-opacity:1" />
                <stop offset="50%" style="stop-color:${truckColor};stop-opacity:1" />
                <stop offset="80%" style="stop-color:#1d4ed8;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#1e3a8a;stop-opacity:1" />
              </linearGradient>

              <!-- Cab front with depth -->
              <linearGradient id="cabMetal" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
                <stop offset="40%" style="stop-color:#2563eb;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#1e40af;stop-opacity:1" />
              </linearGradient>

              <!-- Windshield realistic -->
              <linearGradient id="windshield" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#e0f2fe;stop-opacity:1" />
                <stop offset="30%" style="stop-color:#7dd3fc;stop-opacity:0.95" />
                <stop offset="60%" style="stop-color:#38bdf8;stop-opacity:0.9" />
                <stop offset="100%" style="stop-color:#0ea5e9;stop-opacity:0.85" />
              </linearGradient>

              <!-- Chrome realistic -->
              <linearGradient id="chrome" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#fafafa;stop-opacity:1" />
                <stop offset="20%" style="stop-color:#e5e5e5;stop-opacity:1" />
                <stop offset="50%" style="stop-color:#a3a3a3;stop-opacity:1" />
                <stop offset="80%" style="stop-color:#737373;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#525252;stop-opacity:1" />
              </linearGradient>

              <!-- Tire realistic -->
              <radialGradient id="tire" cx="40%" cy="40%" r="60%">
                <stop offset="0%" style="stop-color:#525252;stop-opacity:1" />
                <stop offset="50%" style="stop-color:#262626;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#0a0a0a;stop-opacity:1" />
              </radialGradient>

              <!-- Headlight LED -->
              <radialGradient id="headlight" cx="50%" cy="50%" r="50%">
                <stop offset="0%" style="stop-color:#fef9c3;stop-opacity:1" />
                <stop offset="60%" style="stop-color:#fef08a;stop-opacity:0.9" />
                <stop offset="100%" style="stop-color:#fde047;stop-opacity:0.7" />
              </radialGradient>
            </defs>

            <!-- Ground shadow with blur -->
            <ellipse cx="60" cy="112" rx="50" ry="7" fill="rgba(0,0,0,0.3)" filter="blur(3px)"/>

            <!-- ===== CARGO BOX (Realistic proportions) ===== -->
            <!-- Back panel (3D depth) -->
            <rect x="5" y="22" width="58" height="58" rx="4" fill="#1e3a8a"/>
            
            <!-- Side panel main -->
            <rect x="7" y="20" width="58" height="58" rx="4" fill="url(#bodyMetal)"/>
            
            <!-- Top highlight (roof reflection) -->
            <rect x="7" y="20" width="58" height="10" rx="4" fill="#93c5fd" opacity="0.5"/>
            
            <!-- Side panel border -->
            <rect x="11" y="24" width="50" height="50" rx="3" fill="none" stroke="#1e40af" stroke-width="1.5"/>
            
            <!-- Vertical structural ribs -->
            <line x1="23" y1="26" x2="23" y2="72" stroke="#1e3a8a" stroke-width="2" opacity="0.7"/>
            <line x1="36" y1="26" x2="36" y2="72" stroke="#1e3a8a" stroke-width="2" opacity="0.7"/>
            <line x1="49" y1="26" x2="49" y2="72" stroke="#1e3a8a" stroke-width="2" opacity="0.7"/>

            <!-- Rear access door -->
            <rect x="9" y="24" width="11" height="50" rx="2" fill="#2563eb" opacity="0.85"/>
            <line x1="14.5" y1="24" x2="14.5" y2="74" stroke="#1e3a8a" stroke-width="1.5"/>
            
            <!-- Door lock -->
            <circle cx="17" cy="50" r="1.5" fill="url(#chrome)"/>

            <!-- Safety/reflective stripes -->
            <rect x="9" y="70" width="52" height="5" rx="1" fill="#fbbf24"/>
            <rect x="9" y="70" width="52" height="1" fill="#fef3c7" opacity="0.5"/>
            <line x1="18" y1="70" x2="18" y2="75" stroke="#1e3a8a" stroke-width="1.5"/>
            <line x1="28" y1="70" x2="28" y2="75" stroke="#1e3a8a" stroke-width="1.5"/>
            <line x1="38" y1="70" x2="38" y2="75" stroke="#1e3a8a" stroke-width="1.5"/>
            <line x1="48" y1="70" x2="48" y2="75" stroke="#1e3a8a" stroke-width="1.5"/>
            <line x1="56" y1="70" x2="56" y2="75" stroke="#1e3a8a" stroke-width="1.5"/>

            <!-- ===== CAB (Modern aerodynamic) ===== -->
            <!-- Cab body shadow -->
            <path d="M65 26 L108 26 L114 38 L114 82 L65 82 Z" fill="#1e3a8a"/>
            
            <!-- Cab main body -->
            <path d="M67 24 L106 24 L113 36 L113 80 L67 80 Z" fill="url(#cabMetal)"/>
            
            <!-- Cab roof with aerodynamic curve -->
            <path d="M65 16 L104 16 Q112 16 114 24 L65 24 Z" fill="#3b82f6"/>
            
            <!-- Roof edge highlight -->
            <path d="M66 17 L103 17 Q110 17 112 23 L66 23 Z" fill="#60a5fa" opacity="0.4"/>
            
            <!-- Cab side panel -->
            <path d="M69 26 L103 26 L109 36 L109 78 L69 78 Z" fill="url(#cabMetal)" opacity="0.9"/>

            <!-- ===== WINDSHIELD (Realistic curved glass) ===== -->
            <path d="M105 30 L112 30 L112 58 L105 58 Q104 44 105 30" fill="url(#windshield)" stroke="#1e40af" stroke-width="2"/>
            
            <!-- Windshield reflection (top) -->
            <path d="M106 32 L110 32 L110 42 L106 42 Z" fill="white" opacity="0.5"/>
            
            <!-- Windshield wiper -->
            <line x1="107" y1="48" x2="111" y2="56" stroke="#374151" stroke-width="1.2"/>

            <!-- Side window (driver) -->
            <rect x="74" y="32" width="24" height="18" rx="3" fill="url(#windshield)" stroke="#1e40af" stroke-width="1.5"/>
            
            <!-- Window shine -->
            <rect x="76" y="34" width="10" height="5" rx="1.5" fill="white" opacity="0.45"/>
            
            <!-- Window divider -->
            <line x1="86" y1="32" x2="86" y2="50" stroke="#1e40af" stroke-width="1"/>

            <!-- ===== WHEELS (Realistic with detail) ===== -->
            <!-- Rear wheel -->
            <g transform="translate(26, 88)">
              <!-- Tire -->
              <circle r="12" fill="url(#tire)" stroke="#000" stroke-width="2"/>
              <!-- Tire tread -->
              <circle r="11" fill="none" stroke="#171717" stroke-width="0.8" stroke-dasharray="2,2"/>
              <!-- Rim -->
              <circle r="7.5" fill="url(#chrome)" stroke="#525252" stroke-width="1.2"/>
              <!-- Hubcap -->
              <circle r="4" fill="#a3a3a3"/>
              <circle r="2" fill="#737373"/>
              <!-- Spokes -->
              <line x1="-6" y1="0" x2="6" y2="0" stroke="#525252" stroke-width="2"/>
              <line x1="0" y1="-6" x2="0" y2="6" stroke="#525252" stroke-width="2"/>
              <line x1="-4.2" y1="-4.2" x2="4.2" y2="4.2" stroke="#525252" stroke-width="1.5"/>
              <line x1="-4.2" y1="4.2" x2="4.2" y2="-4.2" stroke="#525252" stroke-width="1.5"/>
            </g>

            <!-- Front wheel -->
            <g transform="translate(90, 88)">
              <!-- Tire -->
              <circle r="12" fill="url(#tire)" stroke="#000" stroke-width="2"/>
              <!-- Tire tread -->
              <circle r="11" fill="none" stroke="#171717" stroke-width="0.8" stroke-dasharray="2,2"/>
              <!-- Rim -->
              <circle r="7.5" fill="url(#chrome)" stroke="#525252" stroke-width="1.2"/>
              <!-- Hubcap -->
              <circle r="4" fill="#a3a3a3"/>
              <circle r="2" fill="#737373"/>
              <!-- Spokes -->
              <line x1="-6" y1="0" x2="6" y2="0" stroke="#525252" stroke-width="2"/>
              <line x1="0" y1="-6" x2="0" y2="6" stroke="#525252" stroke-width="2"/>
              <line x1="-4.2" y1="-4.2" x2="4.2" y2="4.2" stroke="#525252" stroke-width="1.5"/>
              <line x1="-4.2" y1="4.2" x2="4.2" y2="-4.2" stroke="#525252" stroke-width="1.5"/>
            </g>

            <!-- ===== HEADLIGHTS (Modern LED) ===== -->
            <!-- Main headlight -->
            <ellipse cx="114" cy="42" rx="2.5" ry="7" fill="url(#headlight)"/>
            <ellipse cx="114" cy="42" rx="1.5" ry="5" fill="#fef9c3"/>
            
            <!-- DRL (Daytime Running Light) -->
            <rect x="113" y="52" width="3" height="2" rx="0.5" fill="#fef9c3" opacity="0.8"/>

            <!-- Turn signal -->
            <ellipse cx="114" cy="62" rx="2" ry="4" fill="#fb923c"/>

            <!-- ===== FRONT GRILL ===== -->
            <rect x="112" y="64" width="4" height="14" fill="#171717"/>
            <!-- Grill chrome bars -->
            <line x1="113" y1="67" x2="115" y2="67" stroke="url(#chrome)" stroke-width="1"/>
            <line x1="113" y1="71" x2="115" y2="71" stroke="url(#chrome)" stroke-width="1"/>
            <line x1="113" y1="75" x2="115" y2="75" stroke="url(#chrome)" stroke-width="1"/>

            <!-- ===== BUMPERS ===== -->
            <!-- Front bumper -->
            <rect x="111" y="76" width="6" height="7" rx="1.5" fill="url(#chrome)"/>
            <!-- Bumper reflection -->
            <rect x="112" y="77" width="4" height="2" rx="0.5" fill="white" opacity="0.3"/>
            
            <!-- Rear bumper -->
            <rect x="3" y="76" width="6" height="7" rx="1.5" fill="url(#chrome)"/>

            <!-- ===== TAIL LIGHTS ===== -->
            <rect x="4" y="40" width="3" height="8" rx="1" fill="#ef4444"/>
            <rect x="4" y="52" width="3" height="8" rx="1" fill="#ef4444"/>
            <!-- Tail light glow -->
            <rect x="3" y="41" width="2" height="6" rx="0.5" fill="#fca5a5" opacity="0.5"/>
            <rect x="3" y="53" width="2" height="6" rx="0.5" fill="#fca5a5" opacity="0.5"/>

            <!-- ===== MIRRORS ===== -->
            <!-- Main mirror arm -->
            <rect x="63" y="34" width="8" height="3" rx="1" fill="#374151"/>
            <!-- Mirror housing -->
            <rect x="60" y="32" width="6" height="7" rx="1.5" fill="#374151"/>
            <!-- Mirror glass -->
            <rect x="61" y="33" width="4" height="5" rx="1" fill="#6b7280"/>

            <!-- ===== DOOR DETAILS ===== -->
            <!-- Door line -->
            <line x1="72" y1="28" x2="72" y2="78" stroke="#1e40af" stroke-width="1.5"/>
            <!-- Door handle -->
            <rect x="82" y="58" width="8" height="3" rx="1" fill="url(#chrome)"/>
            <!-- Key hole -->
            <circle cx="88" cy="59.5" r="0.8" fill="#374151"/>

            <!-- ===== COMPANY BRANDING ===== -->
            <rect x="25" y="42" width="20" height="12" rx="2" fill="white" opacity="0.15"/>
            <text x="35" y="51" text-anchor="middle" fill="white" font-size="9" font-weight="bold" opacity="0.8">TMS</text>

            <!-- ===== SIDE MARKERS (Amber) ===== -->
            <rect x="65" y="78" width="6" height="3" rx="1" fill="#f59e0b" opacity="0.9"/>
            <rect x="100" y="78" width="6" height="3" rx="1" fill="#f59e0b" opacity="0.9"/>
          </svg>

          <!-- GPS live indicator (pulsing green) -->
          <div class="gps-indicator" style="
            position: absolute;
            top: -5px;
            right: -5px;
            width: 18px;
            height: 18px;
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 10px rgba(34, 197, 94, 0.8);
            animation: gps-pulse 1s ease-in-out infinite;
          "></div>

          <!-- Speed indicator badge -->
          <div class="speed-badge" style="
            position: absolute;
            bottom: -3px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
            color: white;
            font-size: 9px;
            font-weight: 700;
            padding: 2px 7px;
            border-radius: 8px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.35);
            white-space: nowrap;
            letter-spacing: 0.3px;
          ">${this.speed > 0 ? Math.round(this.speed) + ' km/h' : '●'}</div>
        </div>
      `,
      className: 'truck-marker-ultra-realistic',
      iconSize: [60, 60],
      iconAnchor: [30, 30]
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
   * Mettre à jour la route avec OSRM
   */
  private async updateRoute() {
    if (!this.currentLocation || !this.destination) {
      console.log('⚠️ Missing location or destination for route');
      return;
    }

    try {
      // Fetch route from OSRM with full geometry and turn-by-turn instructions
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${this.currentLocation.lng},${this.currentLocation.lat};${this.destination.lng},${this.destination.lat}?overview=full&geometries=geojson&steps=true&annotations=true`;

      console.log('🗺️ Fetching route from OSRM:', osrmUrl);

      const response = await fetch(osrmUrl);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]] as [number, number]);

        console.log(`✅ Route fetched: ${route.distance}m, ${route.duration}s`);

        // Draw the complete route on map
        if (this.routePolyline) {
          this.routePolyline.setLatLngs(coordinates);
        } else {
          this.routePolyline = L.polyline(coordinates, {
            color: '#667eea',
            weight: 6,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(this.map);
        }

        // Add a lighter outer line for better visibility
        const outerPolyline = L.polyline(coordinates, {
          color: '#ffffff',
          weight: 10,
          opacity: 0.3,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(this.map);

        // Adjust map bounds to show the COMPLETE route and destination
        const bounds = L.latLngBounds(coordinates);
        
        // Add padding to ensure full route is visible
        this.map.fitBounds(bounds, { 
          padding: [80, 80],
          maxZoom: 14,
          minZoom: 10
        });

        // Provide voice navigation instructions if enabled
        if (this.voiceNavigationEnabled) {
          this.provideNavigationInstructions();
        }

        // Store route info for display
        this.routeInfo = {
          distance: route.distance,
          duration: route.duration
        };

      } else {
        console.warn('⚠️ No route found from OSRM, using fallback');
        this.drawFallbackRoute();
      }
    } catch (error) {
      console.error('❌ Error fetching route:', error);
      this.drawFallbackRoute();
    }
  }

  // Store route information
  private routeInfo: { distance: number; duration: number } | null = null;

  /**
   * Draw fallback straight line route if OSRM fails
   */
  private drawFallbackRoute() {
    if (!this.currentLocation || !this.destination) return;

    const latlngs: [number, number][] = [
      [this.currentLocation.lat, this.currentLocation.lng],
      [this.destination.lat, this.destination.lng]
    ];

    if (this.routePolyline) {
      this.routePolyline.setLatLngs(latlngs);
    } else {
      this.routePolyline = L.polyline(latlngs, {
        color: '#667eea',
        weight: 4,
        opacity: 0.7,
        dashArray: '10, 10',
        lineCap: 'round'
      }).addTo(this.map);
    }
  }

  /**
   * Démarrer le tracking GPS
   */
  private startGPSTracking() {
    const user = this.authService.currentUser();
    if (!user) return;

    // Connect to SignalR
    this.gpsService.connect((user as any).driverId);

    // Obtenir la position actuelle
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          this.currentLocation = { lat, lng };
          this.speed = position.coords.speed ? position.coords.speed * 3.6 : 0;
          this.accuracy = position.coords.accuracy;
          this.lastUpdate = new Date();

          this.updateTruckPosition(lat, lng);
          this.updateRoute();

          // Démarrer le tracking continu (toutes les 5 secondes)
          this.gpsService.startTracking(
            (user as any).driverId,
            undefined,
            this.tripId
          );

          this.isTracking = true;
          console.log('GPS Tracking started');
        },
        (error) => {
          console.error('Erreur GPS:', error);
          // Position par défaut si GPS non disponible
          this.currentLocation = { lat: 36.8, lng: 10.1 };
          this.updateTruckPosition(36.8, 10.1);
          this.updateRoute();
          this.isTracking = true;
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 3000
        }
      );
    } else {
      this.currentLocation = { lat: 36.8, lng: 10.1 };
      this.updateTruckPosition(36.8, 10.1);
      this.updateRoute();
      this.isTracking = true;
    }
  }

  // Store previous position for calculating direction
  private previousPosition: { lat: number, lng: number } | null = null;

  /**
   * Mettre à jour la position du camion avec rotation et animations
   */
  private updateTruckPosition(lat: number, lng: number) {
    if (this.truckMarker && this.map) {
      const newPosition: [number, number] = [lat, lng];
      
      // Calculate rotation angle based on movement direction
      if (this.previousPosition) {
        const angle = this.calculateRotationAngle(
          this.previousPosition.lat,
          this.previousPosition.lng,
          lat,
          lng
        );
        
        // Apply rotation to truck marker with smooth transition
        const truckElement = document.querySelector('.truck-marker-container') as HTMLElement;
        if (truckElement) {
          truckElement.style.transform = `rotate(${angle - 90}deg)`;
        }
      }
      
      // Update wheel animation speed based on current speed
      this.updateWheelAnimationSpeed();
      
      // Update speed badge
      this.updateSpeedBadge();
      
      // Set marker position
      this.truckMarker.setLatLng(newPosition);

      // Store position for next rotation calculation
      this.previousPosition = { lat, lng };

      // Pan smoothly to new position
      this.map.panTo(newPosition, {
        animate: true,
        duration: 0.5,
        noMoveStart: true
      });
    }
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
    const truckContainer = document.querySelector('.truck-marker-container') as HTMLElement;
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
   * Accept mission directly
   */
  async acceptMission() {
    if (!this.tripId) return;

    try {
      // Update local status
      this.missionStatus = 'accepted';
      
      // Send acceptance via SignalR - this will notify admin
      await this.gpsService.acceptTrip(this.tripId);
      
      // Show success feedback
      await this.showToast('✅ Mission acceptée', 'success');
      
      // Speak confirmation if voice navigation is enabled
      if (this.voiceNavigationEnabled) {
        this.speak('Mission acceptée. Je vais vous guider vers la destination.');
      }

      // Start navigation to destination
      setTimeout(() => {
        this.provideNavigationInstructions();
      }, 1000);

    } catch (error) {
      console.error('Error accepting mission:', error);
      await this.showToast('Erreur lors de l\'acceptation', 'danger');
    }
  }

  /**
   * Reject mission
   */
  async rejectMission() {
    if (!this.tripId) return;

    const alert = await this.alertController.create({
      header: 'Raison du refus',
      inputs: [
        {
          name: 'reason',
          type: 'radio',
          label: '🌧️ Mauvais temps',
          value: 'BadWeather'
        },
        {
          name: 'reason',
          type: 'radio',
          label: '🚛 Camion non disponible',
          value: 'Unavailable'
        },
        {
          name: 'reason',
          type: 'radio',
          label: '⚙️ Problème technique',
          value: 'Technical'
        },
        {
          name: 'reason',
          type: 'radio',
          label: '🏥 Raison médicale',
          value: 'Medical'
        },
        {
          name: 'reason',
          type: 'radio',
          label: '📋 Autre',
          value: 'Other'
        }
      ],
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Refuser',
          handler: async (data: any) => {
            if (data.reason && this.tripId) {
              try {
                // Send rejection via SignalR - this will notify admin
                await this.gpsService.rejectTrip(this.tripId, data.reason, data.reason);
                
                // Update local status
                this.missionStatus = 'refused';
                
                await this.showToast('❌ Mission refusée', 'danger');
                
                // Navigate back home
                this.router.navigate(['/home']);
              } catch (error) {
                console.error('Error rejecting mission:', error);
                await this.showToast('Erreur lors du refus', 'danger');
              }
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
      this.speak('Navigation vocale activée. Je vais vous guider vers la destination.');
      
      // Start providing navigation instructions
      this.provideNavigationInstructions();
    } else {
      this.showToast('🔇 Navigation vocale désactivée', 'medium');
      this.stopSpeaking();
    }
  }

  /**
   * Provide intelligent navigation instructions based on route
   */
  private async provideNavigationInstructions() {
    if (!this.voiceNavigationEnabled || !this.currentLocation || !this.destination) {
      return;
    }

    try {
      // Fetch route with turn-by-turn instructions from OSRM
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${this.currentLocation.lng},${this.currentLocation.lat};${this.destination.lng},${this.destination.lat}?overview=full&geometries=geojson&steps=true&annotations=true`;

      const response = await fetch(osrmUrl);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const legs = route.legs;
        
        if (legs && legs.length > 0) {
          const steps = legs[0].steps;
          const instructions: string[] = [];

          // Extract navigation instructions from route steps
          steps.forEach((step: any, index: number) => {
            const maneuver = step.maneuver;
            const instruction = this.convertManeuverToInstruction(maneuver.type, maneuver.modifier, step.name);
            const distance = step.distance;
            
            if (instruction && distance) {
              const distanceText = this.formatDistance(distance);
              instructions.push(`${instruction} dans ${distanceText}`);
            }
          });

          this.navigationInstructions = instructions;

          // Speak next instruction if not already speaking
          if (instructions.length > 0 && !this.isSpeaking) {
            const nextInstruction = instructions[0];
            if (nextInstruction !== this.lastNavigationInstruction) {
              this.speak(nextInstruction);
              this.lastNavigationInstruction = nextInstruction;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching navigation instructions:', error);
    }
  }

  /**
   * Convert OSRM maneuver to French instruction
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
   * Speak text using Text-to-Speech
   */
  private speak(text: string) {
    if (!this.voiceNavigationEnabled || !text) return;

    // Stop any ongoing speech
    this.stopSpeaking();

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR'; // French
      utterance.rate = 0.9; // Slightly slower for clarity
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
