import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Chart, registerables } from 'chart.js';
import * as L from 'leaflet';

import { TripsMapService, ITripWithDetails, IEntityDeliveryStats, TRIP_STATUS_CONFIG, DELIVERY_STATUS_CONFIG } from '../../services/trips-map.service';
import { TripStatusOptions, DeliveryStatusOptions, TripStatus, DeliveryStatus } from '../../types/trip';
import { IGeographicalEntity, IGeographicalLevel } from '../../types/general-settings';
import { Http } from '../../services/http';

Chart.register(...registerables);

@Component({
  selector: 'app-trips-map',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trips-map.component.html',
  styleUrls: ['./trips-map.component.scss']
})
export class TripsMapComponent implements OnInit, AfterViewInit, OnDestroy {

  trips: ITripWithDetails[] = [];
  filteredTrips: ITripWithDetails[] = [];
  entityDeliveryStats: IEntityDeliveryStats[] = [];
  geographicalEntities: IGeographicalEntity[] = [];
  geographicalLevels: IGeographicalLevel[] = [];
  mappableEntities: IGeographicalEntity[] = [];

  // Filtres hiérarchiques
  selectedLevelIds: (number | null)[] = [];
  activeRegionFilter: string = 'all';

  tripStats = {
    total: 0,
    planned: 0,
    accepted: 0,
    loading: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    activeEntities: 0,
    totalDistance: 0,
    avgDuration: 0,
    onTimePercentage: 92
  };

  overallProgress: number = 0;
  activeEntitiesCount: number = 0;

  statusFilter: string = 'all';
  entityFilter: string = 'all';
  startDateFilter: string = '';
  endDateFilter: string = '';

  currentMonthLabel: string = '';
  mapsLoading: boolean = false;
  mapsError: boolean = false;
  showTripLines: boolean = true;
  showHelp: boolean = false;

  errorMessage: string = '';
  successMessage: string = '';
  lastUpdateTime: string = '';

  tripStatusOptions = TripStatusOptions;
  deliveryStatusOptions = DeliveryStatusOptions;

  // Carte
  private map: L.Map | null = null;
  private tunisiaCenter: L.LatLngTuple = [34.5, 9.5];
  private tunisiaBounds: L.LatLngBoundsExpression = [
    [30.0, 7.0],
    [37.5, 12.0]
  ];

  // Marqueurs
  private entityMarkers: L.Marker[] = [];
  private tripMarkers: L.Marker[] = [];
  private tripLines: L.Polyline[] = [];

  private subscriptions: Subscription = new Subscription();
  private resizeTimer: any;
  private refreshInterval: any;

  constructor(
    private tripsMapService: TripsMapService,
    private http: Http
  ) {
    this.updateLastUpdateTime();
  }

  ngOnInit(): void {
    this.initializeWithCurrentMonth();
    this.loadGeographicalData();
    this.loadInitialData();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initMap();
    }, 500);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.subscriptions.unsubscribe();
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.handleResize.bind(this));
    }
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
    }
  }

  private updateLastUpdateTime(): void {
    const now = new Date();
    this.lastUpdateTime = now.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  private handleResize(): void {
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
    }
    this.resizeTimer = setTimeout(() => {
      if (this.map) this.map.invalidateSize();
    }, 250);
  }

  private configureLeafletIcons(): void {
    try {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
    } catch (error) {
      console.warn('Erreur configuration icônes:', error);
    }
  }

  private initializeWithCurrentMonth(): void {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    this.startDateFilter = this.formatDate(firstDay);
    this.endDateFilter = this.formatDate(lastDay);

    this.updateCurrentMonthLabel();
  }

  private updateCurrentMonthLabel(): void {
    const now = new Date();
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    this.currentMonthLabel = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private loadGeographicalData(): void {
    // Charger les niveaux géographiques
    this.http.getGeographicalLevels().subscribe({
      next: (levels) => {
        this.geographicalLevels = levels.filter(l => l.isActive);
        this.selectedLevelIds = new Array(this.geographicalLevels.length).fill(null);
      },
      error: (error) => {
        console.error('Error loading geographical levels:', error);
      }
    });

    // Charger les entités géographiques
    this.http.getGeographicalEntities().subscribe({
      next: (entities) => {
        this.geographicalEntities = entities.filter(e => e.isActive);
        this.mappableEntities = this.geographicalEntities.filter(e => {
          return e.latitude != null && e.longitude != null;
        });
        
        if (this.map) {
          this.addEntityMarkers();
        }
      },
      error: (error) => {
        console.error('Error loading geographical entities:', error);
      }
    });
  }

  private loadInitialData(): void {
    this.mapsLoading = true;

    const subscription = this.tripsMapService.getTripsWithDetails(
      this.statusFilter !== 'all' ? this.statusFilter : undefined,
      this.entityFilter !== 'all' ? this.entityFilter : undefined,
      this.startDateFilter || undefined,
      this.endDateFilter || undefined
    ).subscribe({
      next: (trips) => {
        this.trips = trips;
        this.filteredTrips = trips;

        this.http.getGeographicalEntities().subscribe(entities => {
          this.geographicalEntities = entities.filter(e => e.isActive);
          this.entityDeliveryStats = this.tripsMapService.getEntityDeliveryStats(trips, this.geographicalEntities);
          this.updateTripStats();
          this.updateActiveEntitiesCount();
          
          if (this.map) {
            this.addEntityMarkers();
            this.addTripMarkers();
            if (this.showTripLines) {
              this.addTripLines();
            }
          }
        });

        this.mapsLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Erreur chargement des tournées';
        this.mapsError = true;
        this.mapsLoading = false;
      }
    });

    this.subscriptions.add(subscription);
  }

  private reloadData(): void {
    if (this.mapsLoading) return;

    this.mapsLoading = true;

    const subscription = this.tripsMapService.getTripsWithDetails(
      this.statusFilter !== 'all' ? this.statusFilter : undefined,
      this.entityFilter !== 'all' ? this.entityFilter : undefined,
      this.startDateFilter || undefined,
      this.endDateFilter || undefined
    ).subscribe({
      next: (trips) => {
        this.trips = trips;
        this.filteredTrips = trips;
        this.entityDeliveryStats = this.tripsMapService.getEntityDeliveryStats(trips, this.geographicalEntities);
        this.updateTripStats();
        this.updateActiveEntitiesCount();
        
        if (this.map) {
          this.addEntityMarkers();
          this.addTripMarkers();
          if (this.showTripLines) {
            this.addTripLines();
          }
        }

        this.mapsLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Erreur chargement des tournées';
        this.mapsError = true;
        this.mapsLoading = false;
      }
    });

    this.subscriptions.add(subscription);
  }

private updateActiveEntitiesCount(): void {
  // Compter les entités uniques à partir des endEntityName des tournées
  const uniqueEntities = new Set<string>();
  this.filteredTrips.forEach(trip => {
    if (trip.endEntityName) {
      uniqueEntities.add(trip.endEntityName);
    }
  });
  this.activeEntitiesCount = uniqueEntities.size;
}

private updateTripStats(): void {
  this.tripStats = {
    total: this.filteredTrips.length,
    planned: this.filteredTrips.filter(t => t.tripStatus === TripStatus.Planned).length,
    accepted: this.filteredTrips.filter(t => t.tripStatus === TripStatus.Accepted).length,
    loading: this.filteredTrips.filter(t => t.tripStatus === TripStatus.LoadingInProgress).length,
    inProgress: this.filteredTrips.filter(t => t.tripStatus === TripStatus.DeliveryInProgress).length,
    completed: this.filteredTrips.filter(t => t.tripStatus === TripStatus.Receipt).length,
    cancelled: this.filteredTrips.filter(t => t.tripStatus === TripStatus.Cancelled).length,
    activeEntities: this.entityDeliveryStats.length,
    totalDistance: this.filteredTrips.reduce((sum, t) => sum + (t.estimatedDistance || 0), 0),
    avgDuration: this.calculateAvgDuration(),
    onTimePercentage: 92
  };

  // CORRECTION: Vérifier que deliveries existe avant de faire les calculs
  const totalDeliveries = this.filteredTrips.reduce((sum, t) => sum + (t.deliveries?.length || 0), 0);
  const completedDeliveries = this.filteredTrips.reduce((sum, t) =>
    sum + (t.deliveries?.filter(d => d.status === DeliveryStatus.Delivered).length || 0), 0
  );
  this.overallProgress = totalDeliveries > 0 ? Math.round((completedDeliveries / totalDeliveries) * 100) : 0;
}

  private calculateAvgDuration(): number {
    const tripsWithDuration = this.filteredTrips.filter(t =>
      t.actualStartDate && t.actualEndDate && t.tripStatus === TripStatus.Receipt
    );
    if (tripsWithDuration.length === 0) return 0;
    let total = 0;
    for (const t of tripsWithDuration) {
      const start = new Date(t.actualStartDate!).getTime();
      const end = new Date(t.actualEndDate!).getTime();
      total += (end - start) / (1000 * 60 * 60);
    }
    return Math.round(total / tripsWithDuration.length);
  }

private initMap(): void {
  if (typeof window === 'undefined') return;
  if (this.map) return;

  this.mapsLoading = true;

  // Attendre que l'élément DOM soit complètement chargé
  setTimeout(() => {
    const mapElement = document.getElementById('tripsMap');
    if (!mapElement) {
      console.error('❌ Élément #tripsMap non trouvé');
      this.mapsLoading = false;
      this.mapsError = true;
      return;
    }

    // Vérifier que l'élément est visible
    const rect = mapElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      console.warn('⚠️ L\'élément #tripsMap n\'est pas visible, réessai dans 500ms');
      setTimeout(() => this.initMap(), 500);
      return;
    }

    try {
      this.configureLeafletIcons();

      this.map = L.map('tripsMap', {
        center: this.tunisiaCenter,
        zoom: 7,
        zoomControl: true,
        maxBounds: this.tunisiaBounds,
        maxBoundsViscosity: 1.0
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap Tunisie',
        maxZoom: 19,
        minZoom: 6
      }).addTo(this.map);

      // Forcer l'invalidation de la taille
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
          this.addEntityMarkers();
          this.addTripMarkers();
          if (this.showTripLines) {
            this.addTripLines();
          }
          this.mapsLoading = false;
        }
      }, 200);

    } catch (error) {
      console.error('❌ Erreur création carte:', error);
      this.mapsError = true;
      this.mapsLoading = false;
    }
  }, 100);
}

private addEntityMarkers(): void {
  if (!this.map) return;

  this.entityMarkers.forEach(marker => marker.remove());
  this.entityMarkers = [];

  let entitiesToShow = [...this.mappableEntities];

  // Appliquer les filtres hiérarchiques
  for (let i = 0; i < this.selectedLevelIds.length; i++) {
    const filterId = this.selectedLevelIds[i];
    if (filterId !== null) {
      const filteredEntity = this.geographicalEntities.find(e => e.id === filterId);
      if (filteredEntity) {
        entitiesToShow = entitiesToShow.filter(e => 
          this.isDescendantOf(e, filteredEntity) || e.id === filterId
        );
      }
    }
  }

  entitiesToShow.forEach(entity => {
    if (!entity.id || !entity.latitude || !entity.longitude) return;

    // CORRECTION: Vérifier que entityStats existe avant de l'utiliser
    const entityStats = this.entityDeliveryStats.find(s => s.entityName === entity.name);
    const totalTrips = entityStats?.total || 0;
    const level = this.geographicalLevels.find(l => l.id === entity.levelId);

    let entityColor = '#6c757d';
    if (totalTrips > 0) {
      if (totalTrips > 10) entityColor = '#1cc88a';
      else if (totalTrips > 5) entityColor = '#4e73df';
      else if (totalTrips > 0) entityColor = '#f6c23e';
      else entityColor = '#e74a3b';
    }

    const entityIcon = L.divIcon({
      html: `
        <div style="
          background: ${entityColor};
          width: ${totalTrips > 0 ? '50px' : '36px'};
          height: ${totalTrips > 0 ? '50px' : '36px'};
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          cursor: pointer;
        ">
          <i class="fas fa-route" style="font-size: ${totalTrips > 0 ? '18px' : '14px'}; margin-bottom: 2px;"></i>
          <span style="font-size: ${totalTrips > 0 ? '11px' : '9px'};">${entity.name.substring(0, 3)}</span>
          ${totalTrips > 0 ? `<span style="font-size: 10px; margin-top: -2px;">${totalTrips}</span>` : ''}
        </div>
      `,
      className: 'entity-marker',
      iconSize: totalTrips > 0 ? [50, 50] : [36, 36],
      iconAnchor: totalTrips > 0 ? [25, 25] : [18, 18],
      popupAnchor: [0, -25]
    });

    const marker = L.marker([entity.latitude, entity.longitude], {
      icon: entityIcon,
      zIndexOffset: totalTrips > 0 ? 1000 : 500
    }).addTo(this.map!);

    // CORRECTION: Utiliser entityStats?. pour accéder aux propriétés en toute sécurité
    marker.bindPopup(`
      <div style="font-family: 'Segoe UI', sans-serif; padding: 12px; min-width: 200px;">
        <h4 style="margin: 0 0 8px 0; color: ${entityColor};">${entity.name}</h4>
        <div><strong>Niveau:</strong> ${level?.name || 'Inconnu'}</div>
        <div><strong>Tournées:</strong> ${totalTrips}</div>
        <div><strong>Livrées:</strong> ${entityStats?.delivered || 0}</div>
        <div><strong>En cours:</strong> ${entityStats?.inProgress || 0}</div>
        <div><strong>Progression:</strong> ${this.getEntityCompletionPercentage(entityStats)}%</div>
      </div>
    `);

    this.entityMarkers.push(marker);
  });
}
private addTripMarkers(): void {
  if (!this.map) return;

  this.tripMarkers.forEach(marker => marker.remove());
  this.tripMarkers = [];

  this.filteredTrips.forEach(trip => {
    // Utiliser endEntityName pour trouver l'entité associée à la tournée
    const entity = this.geographicalEntities.find(e => e.name === trip.endEntityName);
    if (!entity || !entity.latitude || !entity.longitude) return;

    const statusColor = this.getTripStatusColor(trip.tripStatus);
    const statusLabel = this.getTripStatusLabel(trip.tripStatus);
    
    // CORRECTION: Vérifier que deliveries existe avant d'accéder à .length
    const deliveriesCount = trip.deliveries?.length || 0;
    const completedDeliveries = trip.deliveries?.filter(d => d.status === DeliveryStatus.Delivered).length || 0;
    const completionRate = deliveriesCount > 0 
      ? Math.round((completedDeliveries / deliveriesCount) * 100)
      : 0;

    const tripIcon = L.divIcon({
      html: `
        <div class="trip-marker-wrapper" style="position: relative; cursor: pointer;">
          <div style="
            background: ${statusColor};
            width: 40px;
            height: 40px;
            border-radius: 8px;
            border: 2px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
          ">
            <i class="fas fa-truck" style="font-size: 16px;"></i>
            <span style="font-size: 9px;">#${trip.id}</span>
          </div>
          <div style="
            position: absolute;
            bottom: -20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${statusColor};
            color: white;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 9px;
            font-weight: bold;
            white-space: nowrap;
          ">
            ${completionRate}%
          </div>
        </div>
      `,
      className: 'trip-marker',
      iconSize: [40, 58],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40]
    });

    const marker = L.marker([entity.latitude, entity.longitude], {
      icon: tripIcon,
      zIndexOffset: 2000
    }).addTo(this.map!);

    const popupContent = `
      <div style="font-family: 'Segoe UI', sans-serif; min-width: 280px;">
        <div style="background: ${statusColor}; padding: 12px; color: white; border-radius: 8px 8px 0 0;">
          <h3 style="margin: 0; font-size: 16px;">Tournée #${trip.id}</h3>
          <div style="font-size: 11px; margin-top: 4px;">${statusLabel}</div>
        </div>
        <div style="padding: 12px;">
          <div><strong>Entité:</strong> ${trip.endEntityName || 'Non assignée'}</div>
          <div><strong>Camion:</strong> ${trip.truck?.immatriculation || 'Non assigné'}</div>
          <div><strong>Chauffeur:</strong> ${trip.driver?.name || 'Non assigné'}</div>
          <div><strong>Distance:</strong> ${trip.estimatedDistance || 0} km</div>
          <div><strong>Livraisons:</strong> ${deliveriesCount}</div>
          <div><strong>Progression:</strong> ${completionRate}%</div>
        </div>
        <div style="padding: 8px 12px 12px; border-top: 1px solid #e9ecef;">
          <button onclick="window.dispatchEvent(new CustomEvent('viewTripDetails', { detail: ${trip.id} }))" 
                  style="width: 100%; padding: 8px; background: ${statusColor}; color: white; border: none; border-radius: 6px; cursor: pointer;">
            Voir les détails
          </button>
        </div>
      </div>
    `;

    marker.bindPopup(popupContent);
    this.tripMarkers.push(marker);
  });

  // Écouter l'événement personnalisé pour les détails de tournée
  window.addEventListener('viewTripDetails', ((event: any) => {
    this.focusOnTrip(event.detail);
  }) as EventListener);
}

private addTripLines(): void {
  if (!this.map) return;

  this.tripLines.forEach(line => line.remove());
  this.tripLines = [];

  // Regrouper les tournées par entité (utiliser endEntityName)
  const tripsByEntity = new Map<string, ITripWithDetails[]>();
  this.filteredTrips.forEach(trip => {
    // CORRECTION: Vérifier que endEntityName existe
    if (trip.endEntityName) {
      if (!tripsByEntity.has(trip.endEntityName)) {
        tripsByEntity.set(trip.endEntityName, []);
      }
      tripsByEntity.get(trip.endEntityName)!.push(trip);
    }
  });

  tripsByEntity.forEach((trips, entityName) => {
    const entity = this.geographicalEntities.find(e => e.name === entityName);
    if (!entity || !entity.latitude || !entity.longitude) return;

    const centerPoint: L.LatLngTuple = [entity.latitude, entity.longitude];
    
    // Créer des points autour du centre pour chaque tournée
    const points = trips.map((trip, index) => {
      const angle = (index / trips.length) * 2 * Math.PI;
      const radius = 0.05;
      return [
        centerPoint[0] + radius * Math.cos(angle),
        centerPoint[1] + radius * Math.sin(angle)
      ] as L.LatLngTuple;
    });

    // Ajouter des lignes du centre vers chaque point
    points.forEach(point => {
      const line = L.polyline([centerPoint, point], {
        color: '#667eea',
        weight: 2,
        opacity: 0.6,
        dashArray: '5, 5'
      }).addTo(this.map!);
      this.tripLines.push(line);
    });
  });
}

  private isDescendantOf(entity: IGeographicalEntity, ancestor: IGeographicalEntity): boolean {
    if (entity.id === ancestor.id) return true;
    if (!entity.parentId) return false;
    const parent = this.geographicalEntities.find(e => e.id === entity.parentId);
    if (!parent) return false;
    if (parent.id === ancestor.id) return true;
    return this.isDescendantOf(parent, ancestor);
  }

  private getTripStatusColor(status: string): string {
    switch (status) {
      case TripStatus.Planned: return '#f6c23e';
      case TripStatus.Accepted: return '#4e73df';
      case TripStatus.LoadingInProgress: return '#36b9cc';
      case TripStatus.DeliveryInProgress: return '#1cc88a';
      case TripStatus.Receipt: return '#10b981';
      case TripStatus.Cancelled: return '#e74a3b';
      default: return '#6c757d';
    }
  }

  private getTripStatusLabel(status: string): string {
    switch (status) {
      case TripStatus.Planned: return 'Planifiée';
      case TripStatus.Accepted: return 'Acceptée';
      case TripStatus.LoadingInProgress: return 'Chargement';
      case TripStatus.DeliveryInProgress: return 'En cours';
      case TripStatus.Receipt: return 'Terminée';
      case TripStatus.Cancelled: return 'Annulée';
      default: return status;
    }
  }

getEntityCompletionPercentage(stat: IEntityDeliveryStats | undefined): number {
  if (!stat) return 0;
  const total = stat.total || 0;
  if (total === 0) return 0;
  return Math.round((stat.delivered / total) * 100);
}

  applyFilters(): void {
    this.reloadData();
  }

  resetToCurrentMonth(): void {
    this.initializeWithCurrentMonth();
    this.reloadData();
  }

  resetFilters(): void {
    this.statusFilter = 'all';
    this.entityFilter = 'all';
    this.selectedLevelIds = this.selectedLevelIds.map(() => null);
    this.activeRegionFilter = 'all';
    this.initializeWithCurrentMonth();
    this.reloadData();
    if (this.map) {
      this.map.setView(this.tunisiaCenter, 7);
    }
  }

  refreshData(): void {
    this.reloadData();
    this.updateLastUpdateTime();
    this.successMessage = 'Données actualisées';
    setTimeout(() => this.successMessage = '', 3000);
  }

  refreshMap(): void {
    if (this.map) {
      this.addEntityMarkers();
      this.addTripMarkers();
      if (this.showTripLines) {
        this.addTripLines();
      }
      this.map.invalidateSize();
    }
    this.updateLastUpdateTime();
    this.successMessage = 'Carte actualisée';
    setTimeout(() => this.successMessage = '', 3000);
  }

  centerMap(): void {
    if (this.map) {
      this.map.setView(this.tunisiaCenter, 7);
      this.activeRegionFilter = 'all';
    }
  }

  focusOnRegion(region: string): void {
    const level = this.geographicalLevels.find(l => l.name === region);
    if (!level) return;

    const entities = this.mappableEntities.filter(e => e.levelId === level.id && e.latitude && e.longitude);
    if (entities.length === 0) return;

    const bounds = L.latLngBounds(entities.map(e => [e.latitude!, e.longitude!] as L.LatLngTuple));

    if (this.map) {
      this.map.fitBounds(bounds);
      this.activeRegionFilter = region;
    }
  }

focusOnEntity(entityName: string): void {
  const entity = this.geographicalEntities.find(e => e.name === entityName);
  if (!entity || !entity.latitude || !entity.longitude) return;

  if (this.map) {
    this.map.setView([entity.latitude, entity.longitude], 10);
    this.entityFilter = entityName;
    this.reloadData();
  }
}

  focusOnTrip(tripId: number): void {
    const trip = this.filteredTrips.find(t => t.id === tripId);
    if (trip) {
      // Ouvrir le modal avec les détails de la tournée
      this.showTripDetails(trip);
    }
  }

  showTripDetails(trip: ITripWithDetails): void {
    // Implémentez votre modal ici
    console.log('Trip details:', trip);
  }

  toggleTripLines(): void {
    this.showTripLines = !this.showTripLines;
    if (this.showTripLines) {
      this.addTripLines();
    } else {
      this.tripLines.forEach(line => line.remove());
      this.tripLines = [];
    }
  }

  clearError(): void {
    this.errorMessage = '';
  }

  clearSuccess(): void {
    this.successMessage = '';
  }

  toggleHelp(): void {
    this.showHelp = !this.showHelp;
  }
}