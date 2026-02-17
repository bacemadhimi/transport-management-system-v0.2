import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import * as L from 'leaflet';

import { TripsMapService, ITripWithDetails, IZoneDeliveryStats, TRIP_STATUS_CONFIG, DELIVERY_STATUS_CONFIG, IDeliveryWithDetails } from '../../services/trips-map.service';
import { IZone, TUNISIA_ZONES, ZONES_BY_REGION } from '../../types/truck';
import { TripStatusOptions, DeliveryStatusOptions, TripStatus, DeliveryStatus } from '../../types/trip';
import { ScrollingModule } from '@angular/cdk/scrolling';
@Component({
  selector: 'app-trips-map',
  standalone: true,
  imports: [CommonModule, FormsModule, ScrollingModule],
  templateUrl: './trips-map.component.html',
  styleUrls: ['./trips-map.component.scss']
})
export class TripsMapComponent implements OnInit, AfterViewInit, OnDestroy {
  
  trips: ITripWithDetails[] = [];
  filteredTrips: ITripWithDetails[] = [];
  activeTrips: ITripWithDetails[] = [];
  zoneDeliveryStats: IZoneDeliveryStats[] = [];
  zones = TUNISIA_ZONES;
  itemSize: number = 280;     
  bufferSize: number = 5;       

  
  tripStats = {
    total: 0,
    planned: 0,
    accepted: 0,
    loading: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    activeZones: 0,
    totalDistance: 0,
    avgDuration: 0,
    onTimePercentage: 92
  };
  
  overallProgress: number = 0;
  
  
  statusFilter: string = 'all';
  zoneFilter: string = 'all';
  startDateFilter: string = '';
  endDateFilter: string = '';
  
  
  currentMonthLabel: string = '';
  showMonthShortcuts: boolean = true;
  mapLoading: boolean = false;
  initialLoadDone: boolean = false;
  mapError: boolean = false;
  showRoutes: boolean = true;
  showTripModal: boolean = false;
  
  selectedTripId: number | null = null;
  selectedTrip: ITripWithDetails | null = null;
  selectedZoneName: string = 'all';
  activeRegionFilter: string = 'all';
  
  errorMessage: string = '';
  successMessage: string = '';
  lastUpdateTime: string = '';
  
  
  private isLoading: boolean = false;
  private filterTimeout: any = null;
  
  
  tripStatusOptions = TripStatusOptions;
  deliveryStatusOptions = DeliveryStatusOptions;
  
  tripStatusList = Object.entries(TRIP_STATUS_CONFIG).map(([key, value]) => ({
    key,
    ...value
  }));
  
  deliveryStatusList = Object.entries(DELIVERY_STATUS_CONFIG).map(([key, value]) => ({
    key,
    ...value
  }));
  
  
  private map: L.Map | null = null;
  private tunisiaCenter: L.LatLngTuple = [34.5, 9.5];
  
  private zoneMarkers: L.Marker[] = [];
  private deliveryMarkers: L.Marker[] = [];
  private routeLines: L.Polyline[] = [];
  
  private regionBounds: { [region: string]: L.LatLngBounds } = {};
  
  
  private highlightedTripId: number | null = null;
  private readonly OTHER_TRIPS_COLOR = '#cccccc';
  private readonly OTHER_TRIPS_OPACITY = 0.3;
  
  
  private subscriptions: Subscription = new Subscription();
  private resizeTimer: any;
  
  
  Object = Object;
  ZONES_BY_REGION = ZONES_BY_REGION;

  constructor(private tripsMapService: TripsMapService) {
    this.updateLastUpdateTime();
    this.calculateRegionBounds();
    this.configureLeafletIcons();
  }

  ngOnInit(): void {
    this.initializeWithCurrentMonth();
    
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
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.handleResize.bind(this));
    }
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
    }
    if (this.filterTimeout) {
      clearTimeout(this.filterTimeout);
    }
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
      console.warn('⚠️ Erreur configuration icônes:', error);
    }
  }

  private calculateRegionBounds(): void {
    Object.keys(ZONES_BY_REGION).forEach(region => {
      const zoneNames = ZONES_BY_REGION[region as keyof typeof ZONES_BY_REGION];
      const regionZones = TUNISIA_ZONES.filter(z => zoneNames.includes(z.name));
      
      if (regionZones.length > 0) {
        const bounds = L.latLngBounds(
          regionZones.map(z => [z.latitude, z.longitude] as L.LatLngTuple)
        );
        this.regionBounds[region] = bounds;
      }
    });
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

  isCurrentMonthSelected(): boolean {
    if (!this.startDateFilter || !this.endDateFilter) return false;
    
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return this.startDateFilter === this.formatDate(firstDay) && 
           this.endDateFilter === this.formatDate(lastDay);
  }

  
  private loadInitialData(): void {
    if (this.initialLoadDone) {
      console.log('✅ Données déjà chargées initialement');
      return;
    }
    
    console.log('🚀 PREMIER CHARGEMENT - Appel au backend...');
    this.mapLoading = true;
    this.isLoading = true;
    
    const subscription = this.tripsMapService.getTripsWithDetails(
      this.statusFilter !== 'all' ? this.statusFilter : undefined,
      this.zoneFilter !== 'all' ? this.zoneFilter : undefined,
      this.startDateFilter || undefined,
      this.endDateFilter || undefined
    ).subscribe({
      next: (trips) => {
        console.log(`✅ ${trips.length} tournées chargées (premier chargement)`);
        this.trips = trips;
        this.filteredTrips = trips;
        this.zoneDeliveryStats = this.tripsMapService.getZoneDeliveryStats(trips);
        this.updateTripStats();
        this.updateActiveTrips();
        
        this.mapLoading = false;
        this.isLoading = false;
        this.initialLoadDone = true;
        
        if (this.map) {
          this.refreshMapOnce();
        }
      },
      error: (error) => {
        console.error('❌ Erreur chargement initial:', error);
        this.errorMessage = 'Erreur chargement des tournées';
        this.mapError = true;
        this.mapLoading = false;
        this.isLoading = false;
      }
    });
    
    this.subscriptions.add(subscription);
  }

  
  private reloadData(): void {
    
    if (this.isLoading) {
      console.log('⏳ Chargement déjà en cours, ignoré');
      return;
    }
    
    console.log('🔄 RECHARGEMENT - Action utilisateur détectée');
    this.mapLoading = true;
    this.isLoading = true;
    
    const subscription = this.tripsMapService.getTripsWithDetails(
      this.statusFilter !== 'all' ? this.statusFilter : undefined,
      this.zoneFilter !== 'all' ? this.zoneFilter : undefined,
      this.startDateFilter || undefined,
      this.endDateFilter || undefined
    ).subscribe({
      next: (trips) => {
        console.log(`✅ ${trips.length} tournées rechargées`);
        this.trips = trips;
        this.filteredTrips = trips;
        this.zoneDeliveryStats = this.tripsMapService.getZoneDeliveryStats(trips);
        this.updateTripStats();
        this.updateActiveTrips();
        
        this.mapLoading = false;
        this.isLoading = false;
        
        if (this.map) {
          this.refreshMapOnce();
        }
        
        this.activeRegionFilter = 'all';
        this.selectedZoneName = 'all';
        this.clearHighlight();
      },
      error: (error) => {
        console.error('❌ Erreur rechargement:', error);
        this.errorMessage = 'Erreur chargement des tournées';
        this.mapError = true;
        this.mapLoading = false;
        this.isLoading = false;
      }
    });
    
    this.subscriptions.add(subscription);
  }

  
  applyFilters(): void {
    
    if (this.filterTimeout) {
      clearTimeout(this.filterTimeout);
    }
    
    this.filterTimeout = setTimeout(() => {
      console.log('🔍 Filtre appliqué - Rechargement');
      this.reloadData();
    }, 300);
  }

  setCurrentMonth(): void {
    this.initializeWithCurrentMonth();
    this.reloadData();
  }

  setPreviousMonth(): void {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    this.startDateFilter = this.formatDate(firstDay);
    this.endDateFilter = this.formatDate(lastDay);
    this.reloadData();
  }

  setNextMonth(): void {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    this.startDateFilter = this.formatDate(firstDay);
    this.endDateFilter = this.formatDate(lastDay);
    this.reloadData();
  }

  clearDates(): void {
    this.startDateFilter = '';
    this.endDateFilter = '';
    this.reloadData();
  }

  resetToCurrentMonth(): void {
    this.initializeWithCurrentMonth();
    this.reloadData();
  }

  resetFilters(): void {
    this.statusFilter = 'all';
    this.zoneFilter = 'all';
    this.initializeWithCurrentMonth();
    this.reloadData();
    this.centerMap();
    this.clearHighlight();
  }

  refreshData(): void {
    this.reloadData();
    this.updateLastUpdateTime();
    this.successMessage = 'Données actualisées';
    setTimeout(() => this.successMessage = '', 3000);
  }

  
  private refreshMapOnce(): void {
    if (!this.map) return;
    
    setTimeout(() => {
      this.addZoneMarkers();
      this.addDeliveryMarkers();
      if (this.showRoutes) {
        this.addTripRoutes();
      }
      this.map?.invalidateSize();
    }, 100);
  }

  refreshMap(): void {
    this.refreshMapOnce();
    this.updateLastUpdateTime();
    this.successMessage = 'Carte actualisée';
    setTimeout(() => this.successMessage = '', 3000);
  }

  highlightTrip(tripId: number): void {
    this.highlightedTripId = tripId;
    this.selectedTripId = tripId;
    this.refreshMapOnce();
  }

  clearHighlight(): void {
    this.highlightedTripId = null;
    this.selectedTripId = null;
    this.refreshMapOnce();
  }

  
  private initMap(): void {
    if (typeof window === 'undefined') return;
    if (this.map) return;
    
    setTimeout(() => {
      const mapElement = document.getElementById('tripsMap');
      if (!mapElement) {
        console.error('❌ Élément #tripsMap non trouvé');
        this.mapError = true;
        return;
      }
      
      try {
        this.map = L.map('tripsMap', {
          center: this.tunisiaCenter,
          zoom: 7,
          zoomControl: true
        });
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap Tunisie',
          maxZoom: 19,
          minZoom: 6
        }).addTo(this.map);
        
        setTimeout(() => {
          if (this.map && this.initialLoadDone) {
            this.map.invalidateSize();
            this.addZoneMarkers();
            this.addDeliveryMarkers();
            this.addTripRoutes();
          }
        }, 300);
        
      } catch (error) {
        console.error('❌ Erreur création carte:', error);
        this.mapError = true;
      }
    }, 300);
  }

  
  private addZoneMarkers(): void {
    if (!this.map) return;
    
    this.zoneMarkers.forEach(marker => marker.remove());
    this.zoneMarkers = [];
    
    this.zoneDeliveryStats.forEach(stat => {
      const zone = TUNISIA_ZONES.find(z => z.name === stat.zoneName);
      if (!zone) return;
      
      const totalDeliveries = stat.total;
      const zoneColor = this.getZoneColor(stat);
      
      const zoneIcon = this.createZoneIcon(zone, zoneColor, totalDeliveries, stat);
      
      const marker = L.marker([zone.latitude, zone.longitude], { 
        icon: zoneIcon,
        zIndexOffset: totalDeliveries > 0 ? 1000 : 500
      }).addTo(this.map!);
      
      marker.bindPopup(this.createZonePopup(zone, stat));
      
      marker.on('popupopen', () => {
        setTimeout(() => {
          const btn = document.getElementById(`zone-filter-btn-${zone.id}`);
          if (btn) {
            btn.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              this.focusOnZone(zone.name);
              marker.closePopup();
            };
          }
        }, 100);
      });
      
      this.zoneMarkers.push(marker);
    });
  }

  private createZoneIcon(zone: IZone, color: string, totalDeliveries: number, stats: IZoneDeliveryStats): L.DivIcon {
    
    let zoneEmoji = '📍';
    if (stats.delivered > stats.pending) {
      zoneEmoji = '✅';
    } else if (stats.inProgress > 0) {
      zoneEmoji = '🚚';
    }
    
    return L.divIcon({
      html: `
        <div style="
          background: ${color};
          width: ${totalDeliveries > 0 ? '70px' : '40px'};
          height: ${totalDeliveries > 0 ? '70px' : '40px'};
          border-radius: 50%;
          border: 4px solid white;
          box-shadow: 0 4px 15px rgba(0,0,0,0.3);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          cursor: pointer;
          position: relative;
          font-size: ${totalDeliveries > 0 ? '28px' : '20px'};
        ">
          <div>${zoneEmoji}</div>
          ${totalDeliveries > 0 ? `
            <span style="font-size: 12px; margin-top: -5px; background: rgba(0,0,0,0.5); padding: 2px 6px; border-radius: 10px;">${totalDeliveries}</span>
          ` : ''}
        </div>
      `,
      className: 'zone-marker',
      iconSize: totalDeliveries > 0 ? [70, 70] : [40, 40],
      iconAnchor: totalDeliveries > 0 ? [35, 35] : [20, 20],
      popupAnchor: [0, -35]
    });
  }

  private createZonePopup(zone: IZone, stats: IZoneDeliveryStats): HTMLDivElement {
    const popup = document.createElement('div');
    popup.style.fontFamily = 'Segoe UI, sans-serif';
    popup.style.padding = '15px';
    popup.style.minWidth = '280px';
    
    const completionRate = stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 0;
    const zoneColor = this.getZoneColor(stats);
    
    popup.innerHTML = `
      <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
        <div style="background: ${zoneColor}; width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px;">
          📍
        </div>
        <div>
          <div style="color: #2c3e50; font-size: 18px; font-weight: 700;">${zone.name}</div>
          <div style="color: #6c757d; font-size: 13px;">${stats.total} livraisons</div>
        </div>
      </div>
      
      <div style="border-top: 1px solid #e9ecef; padding-top: 12px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
          <div style="background: #f8f9fa; padding: 8px; border-radius: 6px;">
            <span style="font-size: 16px; margin-right: 6px;">🕒</span>
            <span style="font-weight: 600;">${stats.pending}</span>
            <span style="color: #6c757d; margin-left: 4px;">En attente</span>
          </div>
          <div style="background: #f8f9fa; padding: 8px; border-radius: 6px;">
            <span style="font-size: 16px; margin-right: 6px;">🚚</span>
            <span style="font-weight: 600;">${stats.inProgress}</span>
            <span style="color: #6c757d; margin-left: 4px;">En cours</span>
          </div>
          <div style="background: #f8f9fa; padding: 8px; border-radius: 6px;">
            <span style="font-size: 16px; margin-right: 6px;">✅</span>
            <span style="font-weight: 600;">${stats.delivered}</span>
            <span style="color: #6c757d; margin-left: 4px;">Livrées</span>
          </div>
          <div style="background: #f8f9fa; padding: 8px; border-radius: 6px;">
            <span style="font-size: 16px; margin-right: 6px;">❌</span>
            <span style="font-weight: 600;">${stats.failed}</span>
            <span style="color: #6c757d; margin-left: 4px;">Échouées</span>
          </div>
        </div>
        
        <div style="margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #6c757d; font-size: 12px;">Progression</span>
            <span style="font-weight: 600; color: ${zoneColor};">${completionRate}%</span>
          </div>
          <div style="height: 6px; background: #e9ecef; border-radius: 3px; overflow: hidden;">
            <div style="height: 100%; width: ${completionRate}%; background: ${zoneColor}; border-radius: 3px;"></div>
          </div>
        </div>
        
        <button id="zone-filter-btn-${zone.id}" 
                style="width: 100%; padding: 10px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
          <i class="fas fa-filter"></i> Voir les livraisons de ${zone.name}
        </button>
      </div>
    `;
    
    return popup;
  }

  
  private addDeliveryMarkers(): void {
    if (!this.map) return;
    
    this.deliveryMarkers.forEach(marker => marker.remove());
    this.deliveryMarkers = [];
    
    
    const deliveriesByLocation = new Map<string, IDeliveryWithDetails[]>();
    
    this.filteredTrips.forEach(trip => {
      trip.deliveries?.forEach(delivery => {
        if (!delivery.zoneCoordinates) return;
        
        const key = `${delivery.zoneCoordinates.lat.toFixed(4)},${delivery.zoneCoordinates.lng.toFixed(4)}`;
        if (!deliveriesByLocation.has(key)) {
          deliveriesByLocation.set(key, []);
        }
        deliveriesByLocation.get(key)!.push(delivery);
      });
    });
    
    
    deliveriesByLocation.forEach((deliveries, key) => {
      const hasHighlightedTrip = this.highlightedTripId !== null && 
        deliveries.some(d => {
          const trip = this.filteredTrips.find(t => 
            t.deliveries?.some(del => del.id === d.id)
          );
          return trip?.id === this.highlightedTripId;
        });
      
      deliveries.forEach((delivery, index) => {
        const trip = this.filteredTrips.find(t => 
          t.deliveries?.some(d => d.id === delivery.id)
        );
        
        if (!trip) return;
        
        const isHighlighted = trip.id === this.highlightedTripId;
        
        let markerColor: string;
        let opacity: number;
        let size: number;
        
        if (this.highlightedTripId) {
          if (isHighlighted) {
            markerColor = delivery.statusColor!;
            opacity = 1;
            size = 48;
          } else if (hasHighlightedTrip) {
            markerColor = this.OTHER_TRIPS_COLOR;
            opacity = this.OTHER_TRIPS_OPACITY;
            size = 32;
          } else {
            markerColor = this.OTHER_TRIPS_COLOR;
            opacity = this.OTHER_TRIPS_OPACITY;
            size = 28;
          }
        } else {
          markerColor = delivery.statusColor!;
          opacity = 1;
          size = 36;
        }
        
        
        const baseLat = delivery.zoneCoordinates!.lat;
        const baseLng = delivery.zoneCoordinates!.lng;
        
        let finalLat = baseLat;
        let finalLng = baseLng;
        
        if (deliveries.length > 1) {
          const angle = (index * 0.5) * Math.PI;
          const radius = 0.008 + (Math.floor(index / 4) * 0.004);
          finalLat = baseLat + Math.cos(angle) * radius;
          finalLng = baseLng + Math.sin(angle) * radius;
        }
        
        const deliveryIcon = this.createDeliveryIcon(
          delivery, markerColor, opacity, size, isHighlighted
        );
        
        const marker = L.marker([finalLat, finalLng], { 
          icon: deliveryIcon,
          zIndexOffset: isHighlighted ? 3000 : 2000
        }).addTo(this.map!);
        
        if (deliveries.length > 1) {
          marker.bindPopup(this.createClusterPopup(deliveries, trip, index));
        } else {
          marker.bindPopup(this.createDeliveryPopup(delivery, trip));
        }
        
        this.deliveryMarkers.push(marker);
      });
    });
  }

  private createDeliveryIcon(
    delivery: IDeliveryWithDetails, 
    color: string, 
    opacity: number = 1,
    size: number = 36,
    isHighlighted: boolean = false
  ): L.DivIcon {
    const isInProgress = delivery.status === DeliveryStatus.EnRoute || delivery.status === DeliveryStatus.Arrived;
    
    
    let emoji = '📍';
    switch (delivery.status) {
      case DeliveryStatus.Pending:
        emoji = '🕒';
        break;
      case DeliveryStatus.EnRoute:
        emoji = '🚚';
        break;
      case DeliveryStatus.Arrived:
        emoji = '📍';
        break;
      case DeliveryStatus.Delivered:
        emoji = '✅';
        break;
      case DeliveryStatus.Failed:
        emoji = '❌';
        break;
      case DeliveryStatus.Cancelled:
        emoji = '🚫';
        break;
    }
    
    return L.divIcon({
      html: `
        <div style="
          background: ${color};
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          border: ${isHighlighted ? '4px solid #ffd700' : '3px solid white'};
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: ${size > 36 ? '24px' : '18px'};
          ${isInProgress && isHighlighted ? 'animation: pulse-highlight 1.5s infinite;' : isInProgress ? 'animation: pulse 2s infinite;' : ''}
          opacity: ${opacity};
        ">
          ${emoji}
        </div>
      `,
      className: 'delivery-marker',
      iconSize: [size, size],
      iconAnchor: [size/2, size/2],
      popupAnchor: [0, -size/2]
    });
  }

  private createDeliveryPopup(delivery: IDeliveryWithDetails, trip: ITripWithDetails): HTMLDivElement {
    const popup = document.createElement('div');
    popup.style.fontFamily = 'Segoe UI, sans-serif';
    popup.style.padding = '15px';
    popup.style.minWidth = '320px';
    
    const isHighlighted = trip.id === this.highlightedTripId;
    const zoneName = delivery.zoneName || 'Non assigné';
    const customerName = delivery.customer?.name || 'Client inconnu';
    
    
    let statusEmoji = '📍';
    switch (delivery.status) {
      case DeliveryStatus.Pending: statusEmoji = '🕒'; break;
      case DeliveryStatus.EnRoute: statusEmoji = '🚚'; break;
      case DeliveryStatus.Arrived: statusEmoji = '📍'; break;
      case DeliveryStatus.Delivered: statusEmoji = '✅'; break;
      case DeliveryStatus.Failed: statusEmoji = '❌'; break;
      case DeliveryStatus.Cancelled: statusEmoji = '🚫'; break;
    }
    
    popup.innerHTML = `
      <div style="margin-bottom: 15px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px;">
          <div style="background: ${delivery.statusColor}; width: 45px; height: 45px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px;">
            ${statusEmoji}
          </div>
          <div style="flex: 1;">
            <div style="color: #2c3e50; font-size: 16px; font-weight: 700; margin-bottom: 4px;">${customerName}</div>
            <div style="color: #6c757d; font-size: 12px;">Livraison #${delivery.sequence}</div>
          </div>
          ${isHighlighted ? `
            <div style="background: #ffd700; color: #2c3e50; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;">
              ⭐ Sélectionnée
            </div>
          ` : ''}
        </div>
        
        <div style="background: ${delivery.statusColor}20; padding: 8px 12px; border-radius: 8px; margin-bottom: 15px;">
          <span style="color: ${delivery.statusColor}; font-weight: 600; font-size: 13px;">
            ${statusEmoji} ${delivery.statusLabel || delivery.status}
          </span>
        </div>
        
        <div style="background: linear-gradient(135deg, #667eea10, #764ba210); border-radius: 10px; padding: 12px; margin-bottom: 15px; border-left: 4px solid #667eea;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="background: linear-gradient(135deg, #667eea, #764ba2); width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px;">
              📍
            </div>
            <div>
              <div style="color: #6c757d; font-size: 11px; text-transform: uppercase;">ZONE DU CLIENT</div>
              <div style="color: #2c3e50; font-size: 16px; font-weight: 600;">${zoneName}</div>
              ${delivery.gouvernorat && delivery.gouvernorat !== zoneName ? `
                <div style="color: #6c757d; font-size: 12px;">${delivery.gouvernorat}</div>
              ` : ''}
            </div>
          </div>
        </div>
        
        <div style="margin-bottom: 12px;">
          <div style="color: #6c757d; font-size: 11px; margin-bottom: 4px;">ADRESSE</div>
          <div style="background: #f8f9fa; border-radius: 8px; padding: 10px; display: flex; gap: 8px;">
            <span style="font-size: 16px;">📍</span>
            <span style="color: #2c3e50; font-size: 13px;">${delivery.deliveryAddress}</span>
          </div>
        </div>
        
        <div style="background: #f8f9fa; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="font-size: 16px;">🚚</span>
            <span style="color: #2c3e50; font-size: 13px; font-weight: ${isHighlighted ? '600' : 'normal'};">
              ${trip.tripReference || 'Tournée #' + trip.id}
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">👤</span>
            <span style="color: #2c3e50; font-size: 13px;">${trip.driver?.name || 'Non assigné'}</span>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          ${delivery.plannedTime ? `
            <div style="background: #e8f4fd; border-radius: 8px; padding: 8px;">
              <div style="color: #4e73df; font-size: 10px;">PRÉVU</div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 14px;">🕒</span>
                <span style="color: #2c3e50; font-size: 13px; font-weight: 600;">
                  ${new Date(delivery.plannedTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ` : ''}
          
          ${delivery.actualArrivalTime ? `
            <div style="background: #e3f9e5; border-radius: 8px; padding: 8px;">
              <div style="color: #1cc88a; font-size: 10px;">LIVRÉ</div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 14px;">✅</span>
                <span style="color: #2c3e50; font-size: 13px; font-weight: 600;">
                  ${new Date(delivery.actualArrivalTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ` : ''}
        </div>
        
        ${delivery.notes ? `
          <div style="margin-top: 15px; background: #fff3cd; border-left: 4px solid #f6c23e; border-radius: 6px; padding: 10px;">
            <div style="display: flex; gap: 8px;">
              <span style="font-size: 16px;">📝</span>
              <div>
                <div style="color: #856404; font-size: 11px; margin-bottom: 4px;">NOTE</div>
                <div style="color: #2c3e50; font-size: 12px;">"${delivery.notes}"</div>
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
    
    return popup;
  }

private createClusterPopup(deliveries: IDeliveryWithDetails[], mainTrip: ITripWithDetails, currentIndex: number): HTMLDivElement {
  const popup = document.createElement('div');
  popup.style.fontFamily = 'Segoe UI, sans-serif';
  popup.style.padding = '15px';
  popup.style.minWidth = '350px';
  popup.style.maxHeight = '450px';
  popup.style.overflowY = 'auto';
  
  
  const uniqueDeliveries = new Map<string, IDeliveryWithDetails & { count: number }>();
  
  deliveries.forEach(delivery => {
    
    
    const uniqueKey = `${delivery.customerId}_${delivery.deliveryAddress}`;
    
    if (uniqueDeliveries.has(uniqueKey)) {
      
      const existing = uniqueDeliveries.get(uniqueKey)!;
      existing.count++;
    } else {
      
      uniqueDeliveries.set(uniqueKey, { 
        ...delivery, 
        count: 1 
      });
    }
  });
  
  const zoneName = deliveries[0].zoneName || 'Zone non assignée';
  const totalUnique = uniqueDeliveries.size;
  const totalOriginal = deliveries.length;
  
  let html = `
    <div style="margin-bottom: 15px; border-bottom: 2px solid #e9ecef; padding-bottom: 12px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="background: linear-gradient(135deg, #667eea, #764ba2); width: 45px; height: 45px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px;">
          📍
        </div>
        <div>
          <div style="color: #2c3e50; font-size: 18px; font-weight: 700;">${zoneName}</div>
          <div style="color: #6c757d; font-size: 13px;">
            ${totalUnique} livraison${totalUnique > 1 ? 's' : ''} unique${totalUnique > 1 ? 's' : ''}
            ${totalOriginal > totalUnique ? `(${totalOriginal} au total)` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
  
  
  const uniqueDeliveriesList = Array.from(uniqueDeliveries.values())
    .sort((a, b) => a.sequence - b.sequence);
  
  uniqueDeliveriesList.forEach((delivery) => {
    const trip = this.filteredTrips.find(t => 
      t.deliveries?.some(d => d.id === delivery.id)
    );
    
    const isHighlighted = trip?.id === this.highlightedTripId;
    const backgroundColor = isHighlighted ? '#fff9e6' : 'white';
    
    
    let statusEmoji = '📍';
    switch (delivery.status) {
      case DeliveryStatus.Pending: statusEmoji = '🕒'; break;
      case DeliveryStatus.EnRoute: statusEmoji = '🚚'; break;
      case DeliveryStatus.Arrived: statusEmoji = '📍'; break;
      case DeliveryStatus.Delivered: statusEmoji = '✅'; break;
      case DeliveryStatus.Failed: statusEmoji = '❌'; break;
      case DeliveryStatus.Cancelled: statusEmoji = '🚫'; break;
    }
    
    html += `
      <div style="margin-bottom: 12px; padding: 12px; background: ${backgroundColor}; border-radius: 8px; border-left: 4px solid ${delivery.statusColor};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 20px;">${statusEmoji}</span>
            <div>
              <div style="font-weight: 700; color: #2c3e50;">${delivery.customer?.name || 'Client'}</div>
              <div style="font-size: 11px; color: #6c757d;">
                ${delivery.customer?.gouvernorat || ''} • ${delivery.zoneName || 'Zone inconnue'}
              </div>
            </div>
          </div>
          ${delivery.count > 1 ? `
            <span style="background: #667eea; color: white; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">
              x${delivery.count}
            </span>
          ` : `
            <span style="background: ${delivery.statusColor}20; color: ${delivery.statusColor}; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;">
              #${delivery.sequence}
            </span>
          `}
        </div>
        
        <div style="color: #6c757d; font-size: 12px; margin-bottom: 4px;">
          <span style="font-size: 14px; margin-right: 4px;">📦</span> 
          Commande #${delivery.orderId}
        </div>
        
        <div style="color: #6c757d; font-size: 12px; margin-bottom: 4px;">
          <span style="font-size: 14px; margin-right: 4px;">🚚</span> 
          ${trip?.tripReference || 'Tournée'}
          ${isHighlighted ? ' <span style="color: #ffd700;">⭐</span>' : ''}
        </div>
        
        <div style="color: #6c757d; font-size: 12px; margin-bottom: 8px;">
          <span style="font-size: 14px; margin-right: 4px;">📌</span> 
          ${delivery.deliveryAddress}
        </div>
        
        ${delivery.plannedTime ? `
          <div style="font-size: 11px; color: #999; border-top: 1px dashed #e9ecef; padding-top: 6px;">
            <span style="font-size: 12px; margin-right: 4px;">🕒</span> 
            Prévu: ${new Date(delivery.plannedTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        ` : ''}
      </div>
    `;
  });
  
  popup.innerHTML = html;
  return popup;
}

  private addTripRoutes(): void {
    if (!this.map || !this.showRoutes) return;
    
    this.routeLines.forEach(line => line.remove());
    this.routeLines = [];
    
    this.filteredTrips.forEach(trip => {
      if (!trip.deliveries || trip.deliveries.length < 2) return;
      
      const isHighlighted = trip.id === this.highlightedTripId;
      
      const validDeliveries = trip.deliveries
        .filter(d => d.zoneCoordinates)
        .sort((a, b) => a.sequence - b.sequence);
      
      if (validDeliveries.length < 2) return;
      
      const points: L.LatLngTuple[] = validDeliveries.map(d => [
        d.zoneCoordinates!.lat,
        d.zoneCoordinates!.lng
      ]);
      
      const routeColor = isHighlighted ? trip.statusColor! : this.OTHER_TRIPS_COLOR;
      const routeWeight = isHighlighted ? 5 : 2;
      const routeOpacity = isHighlighted ? 0.9 : this.OTHER_TRIPS_OPACITY;
      
      const routeLine = L.polyline(points, {
        color: routeColor,
        weight: routeWeight,
        opacity: routeOpacity,
        dashArray: isHighlighted ? undefined : '5, 10'
      }).addTo(this.map!);
      
      this.routeLines.push(routeLine);
    });
  }

  
  centerMap(): void {
    if (this.map) {
      this.map.setView(this.tunisiaCenter, 7);
      setTimeout(() => {
        if (this.map) this.map.invalidateSize();
      }, 100);
    }
    this.activeRegionFilter = 'all';
    this.selectedZoneName = 'all';
    this.clearHighlight();
  }

  toggleRoutes(): void {
    this.showRoutes = !this.showRoutes;
    this.refreshMapOnce();
  }

  focusOnZone(zoneName: string): void {
    const zone = TUNISIA_ZONES.find(z => z.name === zoneName);
    if (!zone || !this.map) return;
    
    this.selectedZoneName = zoneName;
    this.map.setView([zone.latitude, zone.longitude], 9);
    
    const zoneMarker = this.zoneMarkers.find(m => {
      const latLng = m.getLatLng();
      return latLng.lat === zone.latitude && latLng.lng === zone.longitude;
    });
    
    if (zoneMarker) {
      zoneMarker.openPopup();
    }
  }

  focusOnRegion(region: string): void {
    if (!this.map) return;
    
    if (region === 'all') {
      this.centerMap();
      return;
    }
    
    if (!this.regionBounds[region]) return;
    
    this.map.fitBounds(this.regionBounds[region]);
    this.activeRegionFilter = region;
    this.selectedZoneName = 'all';
  }

  focusOnTrip(tripId: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    
    const trip = this.filteredTrips.find(t => t.id === tripId);
    if (!trip || !trip.deliveries || !this.map) return;
    
    this.highlightTrip(tripId);
    
    const validDeliveries = trip.deliveries.filter(d => d.zoneCoordinates);
    if (validDeliveries.length === 0) return;
    
    const bounds = L.latLngBounds(
      validDeliveries.map(d => [d.zoneCoordinates!.lat, d.zoneCoordinates!.lng] as L.LatLngTuple)
    );
    
    this.map.fitBounds(bounds, { padding: [50, 50] });
  }

  viewTripDetails(tripId: number, event: Event): void {
    event.stopPropagation();
    
    const trip = this.filteredTrips.find(t => t.id === tripId);
    if (trip) {
      this.selectedTrip = trip;
      this.selectedTripId = tripId;
      this.showTripModal = true;
    }
  }

  closeModal(): void {
    this.showTripModal = false;
    this.selectedTrip = null;
  }

  
  getZoneColor(stat: IZoneDeliveryStats): string {
    if (stat.total === 0) return '#6c757d';
    
    const completionRate = (stat.delivered / stat.total) * 100;
    
    if (completionRate > 70) return '#1cc88a';
    if (completionRate > 30) return '#4e73df';
    if (completionRate > 0) return '#f6c23e';
    return '#e74a3b';
  }

  getZoneCompletionPercentage(stat: IZoneDeliveryStats): number {
    if (stat.total === 0) return 0;
    return Math.round((stat.delivered / stat.total) * 100);
  }

  clearError(): void {
    this.errorMessage = '';
  }

  clearSuccess(): void {
    this.successMessage = '';
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
      activeZones: this.zoneDeliveryStats.length,
      totalDistance: this.filteredTrips.reduce((sum, t) => sum + (t.estimatedDistance || 0), 0),
      avgDuration: this.calculateAvgDuration(),
      onTimePercentage: 92
    };
    
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
    
    const totalDuration = tripsWithDuration.reduce((sum, t) => {
      const start = new Date(t.actualStartDate!).getTime();
      const end = new Date(t.actualEndDate!).getTime();
      return sum + (end - start) / (1000 * 60 * 60);
    }, 0);
    
    return Math.round(totalDuration / tripsWithDuration.length);
  }

  private updateActiveTrips(): void {
    this.activeTrips = this.filteredTrips.filter(t => 
      t.tripStatus === TripStatus.Planned ||
      t.tripStatus === TripStatus.Accepted || 
      t.tripStatus === TripStatus.LoadingInProgress ||
      t.tripStatus === TripStatus.DeliveryInProgress ||
      t.tripStatus === TripStatus.Receipt
    )
  }

trackByTripId(index: number, trip: ITripWithDetails): number {
  return trip.id;
}
}