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
   * Créer l'icône du camion
   */
  private createTruckIcon(): L.DivIcon {
    return L.divIcon({
      html: `
        <div style="
          background: linear-gradient(135deg, #667eea, #764ba2);
          border: 3px solid white;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(102, 126, 234, 0.5);
          animation: pulse 2s infinite;
        ">
          <span style="font-size: 24px;">🚛</span>
        </div>
      `,
      className: 'truck-marker',
      iconSize: [50, 50],
      iconAnchor: [25, 25]
    });
  }

  /**
   * Créer l'icône de destination
   */
  private createDestinationIcon(): L.DivIcon {
    return L.divIcon({
      html: `
        <div style="
          background: linear-gradient(135deg, #f093fb, #f5576c);
          border: 3px solid white;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(240, 147, 251, 0.5);
        ">
          <span style="font-size: 20px;">📍</span>
        </div>
      `,
      className: 'destination-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
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
      // Fetch route from OSRM
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${this.currentLocation.lng},${this.currentLocation.lat};${this.destination.lng},${this.destination.lat}?overview=full&geometries=geojson`;
      
      console.log('🗺️ Fetching route from OSRM:', osrmUrl);
      
      const response = await fetch(osrmUrl);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
        
        console.log(`✅ Route fetched: ${route.distance}m, ${route.duration}s`);

        if (this.routePolyline) {
          this.routePolyline.setLatLngs(coordinates);
        } else {
          this.routePolyline = L.polyline(coordinates, {
            color: '#667eea',
            weight: 5,
            opacity: 0.8,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(this.map);
        }

        // Adjust map to show full route
        const bounds = L.latLngBounds(coordinates);
        this.map.fitBounds(bounds, { padding: [50, 50] });
      } else {
        console.warn('⚠️ No route found from OSRM, using fallback');
        this.drawFallbackRoute();
      }
    } catch (error) {
      console.error('❌ Error fetching route:', error);
      this.drawFallbackRoute();
    }
  }

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

  /**
   * Mettre à jour la position du camion
   */
  private updateTruckPosition(lat: number, lng: number) {
    if (this.truckMarker && this.map) {
      const newPosition: [number, number] = [lat, lng];
      this.truckMarker.setLatLng(newPosition);

      // Pan smoothly to new position
      this.map.panTo(newPosition, {
        animate: true,
        duration: 0.5,
        noMoveStart: true
      });
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
    const distance = this.getDistanceRemaining();
    if (!this.speed || distance === 0) return '-- min';

    const timeHours = distance / this.speed;
    const timeMinutes = Math.round(timeHours * 60);

    return `${timeMinutes} min`;
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
    await this.updateMissionStatus('accepted');
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
   * Show mission status action sheet
   */
  async showStatusActions() {
    const alert = await this.alertController.create({
      header: 'État de la mission',
      subHeader: `Trip ${this.tripReference}`,
      buttons: [
        {
          text: '✅ Accepter',
          handler: () => this.updateMissionStatus('accepted')
        },
        {
          text: '📦 Chargement',
          handler: () => this.updateMissionStatus('loading')
        },
        {
          text: '🚚 Livraison',
          handler: () => this.updateMissionStatus('delivery')
        },
        {
          text: '🎉 Terminé',
          handler: () => this.updateMissionStatus('completed')
        },
        {
          text: '❌ Refuser',
          role: 'cancel',
          handler: () => this.rejectMission()
        }
      ]
    });

    await alert.present();
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
              await this.gpsService.rejectTrip(this.tripId, data.reason, data.reason);
              await this.showToast('❌ Mission refusée', 'danger');
              this.router.navigate(['/home']);
            }
          }
        }
      ]
    });

    await alert.present();
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
}
