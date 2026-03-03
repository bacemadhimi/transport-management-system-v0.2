import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';

import { StatisticsService } from '../../services/statistics.service';
import { 
  StatisticsFilter
} from '../../types/pie-chart-data.model';
import { 
  ITruck, 
  IZone, 
  ITruckWithZone,
  TUNISIA_ZONES, 
  ZONES_BY_REGION,
  STATUS_CONFIG 
} from '../../types/truck';
import { IDriver } from '../../types/driver';
import { IGeographicalEntity, IGeographicalLevel } from '../../types/general-settings';
import * as L from 'leaflet';
import { Http } from '../../services/http';

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss']
})
export class StatisticsComponent implements OnInit, AfterViewInit, OnDestroy {
  // ========== FILTRES ==========
  filter: StatisticsFilter = {};
  startDate: string = '';
  endDate: string = '';

  // ========== DONNÉES PRINCIPALES ==========
  trucks: ITruck[] = [];
  trucksWithZone: (ITruck & { geographicalEntity?: IGeographicalEntity; zoneName?: string; zoneCoordinates?: { lat: number; lng: number } })[] = [];
  
  drivers: IDriver[] = [];
  driversWithZone: (IDriver & { zoneName?: string; zoneCoordinates?: { lat: number; lng: number } })[] = [];
  zones: IZone[] = TUNISIA_ZONES; // Keep zones for drivers
  
  // ========== DONNÉES GÉOGRAPHIQUES (for trucks) ==========
  geographicalLevels: IGeographicalLevel[] = [];
  geographicalEntities: IGeographicalEntity[] = [];
  mappableEntities: IGeographicalEntity[] = [];
  
  // ========== DONNÉES FILTRÉES ==========
  filteredTrucks: ITruck[] = [];
  filteredDrivers: IDriver[] = [];
  inactiveTrucks: ITruck[] = [];
  unavailableDrivers: IDriver[] = [];

  // ========== DONNÉES PAR ZONE/ENTITÉ ==========
  // For trucks - entity-based
  trucksByEntity: { [entityId: number]: ITruck[] } = {};
  
  // For drivers - zone-based (keep old logic)
  driversByZone: { [zoneName: string]: IDriver[] } = {};
  
  entityStatistics: {
    entityId: number;
    entityName: string;
    levelName: string;
    levelNumber: number;
    totalTrucks: number;
    availableTrucks: number;
    onMissionTrucks: number;
    maintenanceTrucks: number;
    outOfServiceTrucks: number;
  }[] = [];

  zoneStatistics: {
    zoneId: number;
    zoneName: string;
    total: number;
    available: number;
    onMission: number;
    maintenance: number;
    outOfService: number;
  }[] = [];

  driverZoneStatistics: {
    zoneId: number;
    zoneName: string;
    total: number;
    available: number;
    onMission: number;
    overtime: number;
    exceeded: number;
    conflict: number;
    offDuty: number;
  }[] = [];

  // ========== ÉTATS DE CHARGEMENT ==========
  loadingTrucks = false;
  loadingDrivers = false;
  loadingGeographical = false;
  
  mapsLoading = {
    trucks: false,
    drivers: false
  };
  
  mapsError = {
    trucks: false,
    drivers: false
  };

  // ========== ÉTAT DE L'INTERFACE ==========
  activeZoneView: 'trucks' | 'drivers' = 'trucks';
  activeZoneName: string = 'all';
  
  // ✅ FILTRES RÉGIONAUX INDÉPENDANTS
  activeTruckRegionFilter: string = 'all';   // For truck map (levels)
  activeDriverRegionFilter: string = 'all';  // For driver map (regions)
  
  showHelp = false;
  errorMessage: string = '';
  successMessage: string = '';
  lastUpdateTime: string = '';

  // ========== STATISTIQUES RAPIDES ==========
  truckStats = {
    total: 0,
    available: 0,
    onMission: 0,
    maintenance: 0,
    outOfService: 0,
    activeEntities: 0
  };

  driverStats = {
    total: 0,
    available: 0,
    onMission: 0,
    overtime: 0,
    exceeded: 0,
    conflict: 0,
    offDuty: 0,
    activeZones: 0
  };
  
  // ========== STATISTIQUES ZONES ==========
  driverActiveZones: number = 0;
  truckActiveEntities: number = 0;

  // ========== CARTES LEAFLET ==========
  private truckMap: L.Map | null = null;
  private driverMap: L.Map | null = null;
  private tunisiaCenter: L.LatLngTuple = [34.5, 9.5];
  
  private truckEntityMarkers: L.Marker[] = [];
  private truckMarkers: L.Marker[] = [];
  private driverZoneMarkers: L.Marker[] = [];
  private driverMarkers: L.Marker[] = [];
  
  private regionBounds: { [region: string]: L.LatLngBounds } = {};

  // ========== ABONNEMENTS ==========
  private subscriptions: Subscription = new Subscription();
  private resizeTimer: any;

  // ========== CONSTANTES ==========
  Object = Object;
  ZONES_BY_REGION = ZONES_BY_REGION;

  // ========== PALETTES DE COULEURS ==========
  private driverStatusColors = {
    'available': '#1cc88a',
    'on_trip': '#4e73df',
    'overtime': '#f6c23e',
    'exceeded': '#e74a3b',
    'conflict': '#e74a3b',
    'off_duty': '#858796',
    'default': '#6c757d'
  };

  constructor(
    private statisticsService: StatisticsService,
    private httpService: Http
  ) {
    this.initializeDates();
    this.calculateRegionBounds();
    this.configureLeafletIcons();
  }

  // ========== CYCLES DE VIE ==========
  ngOnInit(): void {
    this.updateLastUpdateTime();
    this.loadMarques();
    this.loadGeographicalData(); // Load geographical data for trucks
    this.loadTrucks();
    this.loadDrivers(); // Keep old driver loading
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initTrucksMap();
      this.initDriversMap();
    }, 500);
  }

  ngOnDestroy(): void {
    if (this.truckMap) {
      this.truckMap.remove();
      this.truckMap = null;
    }
    if (this.driverMap) {
      this.driverMap.remove();
      this.driverMap = null;
    }
    this.subscriptions.unsubscribe();
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.handleResize.bind(this));
    }
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
    }
  }

  // ========== INITIALISATION ==========
  private initializeDates(): void {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    this.startDate = this.formatDate(firstDay);
    this.endDate = this.formatDate(today);
  }

  private updateLastUpdateTime(): void {
    const now = new Date();
    this.lastUpdateTime = now.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  private setupResizeListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.handleResize.bind(this));
    }
  }

  private handleResize(): void {
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
    }
    this.resizeTimer = setTimeout(() => {
      if (this.truckMap) this.truckMap.invalidateSize();
      if (this.driverMap) this.driverMap.invalidateSize();
    }, 250);
  }

  // ========== CONFIGURATION LEAFLET ==========
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

  // ========== CALCUL DES BOUNDS (for drivers) ==========
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

  // ========== CHARGEMENT DES DONNÉES GÉOGRAPHIQUES (for trucks) ==========
  private loadGeographicalData(): void {
    this.loadingGeographical = true;
    
    // Load geographical levels
    const levelsSub = this.httpService.getGeographicalLevels().subscribe({
      next: (levels) => {
        this.geographicalLevels = levels.filter(l => l.isActive);
        
        // Load geographical entities (only active and mappable for trucks)
        const entitiesSub = this.httpService.getGeographicalEntities().subscribe({
          next: (entities) => {
            this.geographicalEntities = entities.filter(e => e.isActive);
            // For trucks: filter mappable entities only
            this.mappableEntities = this.geographicalEntities.filter(e => {
              const level = this.geographicalLevels.find(l => l.id === e.levelId);
              return level?.isMappable === true;
            });
            
            this.loadingGeographical = false;
            // After loading geographical data, process trucks
            if (this.trucks.length > 0) {
              this.processTrucksByEntity();
            }
          },
          error: (error) => {
            console.error('Error loading geographical entities:', error);
            this.loadingGeographical = false;
          }
        });
        this.subscriptions.add(entitiesSub);
      },
      error: (error) => {
        console.error('Error loading geographical levels:', error);
        this.loadingGeographical = false;
      }
    });
    this.subscriptions.add(levelsSub);
  }

  // ========== CHARGEMENT DES DONNÉES ==========
  loadTrucks(): void {
    this.loadingTrucks = true;
    const subscription = this.statisticsService.getTrucks().subscribe({
      next: (trucks) => {
        this.trucks = trucks;
        this.enrichTrucksWithGeographicalData();
        
        // Only process if geographical data is already loaded
        if (this.geographicalEntities.length > 0) {
          this.processTrucksByEntity();
        }
        
        this.updateTruckStats();
        this.filteredTrucks = trucks.filter(t => 
          t.status.toLowerCase() === 'disponible' || 
          t.status.toLowerCase() === 'en mission' ||
          t.status.toLowerCase() === 'available'
        );
        this.inactiveTrucks = trucks.filter(t => 
          t.status.toLowerCase() === 'maintenance' || 
          t.status.toLowerCase() === 'hors service' ||
          t.status.toLowerCase() === 'inactive'
        );
        this.loadingTrucks = false;
        
        if (this.truckMap) {
          this.addTruckEntityMarkers();
          this.addTruckMarkers();
        }
      },
      error: (error) => {
        console.error('Erreur chargement camions:', error);
        this.errorMessage = 'Erreur chargement camions';
        this.loadingTrucks = false;
      }
    });
    this.subscriptions.add(subscription);
  }

  // Keep old driver loading with zones
  loadDrivers(): void {
    this.loadingDrivers = true;
    const subscription = this.statisticsService.getDrivers().subscribe({
      next: (drivers) => {
        this.drivers = drivers;
        this.enrichDriversWithZoneData(); // Keep old zone enrichment
        this.processDriversByZone(); // Keep old zone processing
        this.updateDriverStats();
        this.filteredDrivers = drivers.filter(d => 
          d.status?.toLowerCase() === 'disponible' || 
          d.status?.toLowerCase() === 'available' || 
          d.availabilityStatus === 'available'
        );
        this.unavailableDrivers = drivers.filter(d => 
          d.status?.toLowerCase() !== 'disponible' && 
          d.status?.toLowerCase() !== 'available'
        );
        this.loadingDrivers = false;
        
        if (this.driverMap) {
          this.addDriverZoneMarkers(); // Keep old zone markers
          this.addDriverMarkers();
        }
      },
      error: (error) => {
        console.error('Erreur chargement chauffeurs:', error);
        this.errorMessage = 'Erreur chargement chauffeurs';
        this.loadingDrivers = false;
      }
    });
    this.subscriptions.add(subscription);
  }

  // ========== ENRICHISSEMENT DES DONNÉES ==========
  private enrichTrucksWithGeographicalData(): void {
    this.trucksWithZone = this.trucks.map(truck => {
      // Find geographical entities associated with this truck
      // This assumes your truck object has geographicalEntities array
      const truckEntities = (truck as any).geographicalEntities || [];
      
      // For display purposes, use the first mappable entity
      const firstEntity = truckEntities.length > 0 ? 
        this.geographicalEntities.find(e => e.id === truckEntities[0]?.geographicalEntityId) : 
        undefined;
      
      return {
        ...truck,
        geographicalEntity: firstEntity,
        zoneName: firstEntity?.name || 'Non assigné',
        zoneCoordinates: firstEntity?.latitude && firstEntity?.longitude ? 
          { lat: firstEntity.latitude, lng: firstEntity.longitude } : undefined
      };
    });
  }

  // Keep old driver zone enrichment
  private enrichDriversWithZoneData(): void {
    this.driversWithZone = this.drivers.map(driver => {
      const zone = TUNISIA_ZONES.find(z => z.id === driver.zoneId);
      
      return {
        ...driver,
        zoneName: zone?.name || 'Non assigné',
        zoneCoordinates: zone ? { lat: zone.latitude, lng: zone.longitude } : undefined,
        imageBase64: driver.imageBase64 || null
      };
    });
  }

  // ========== TRAITEMENT PAR ENTITÉ (for trucks) ==========
  private processTrucksByEntity(): void {
    this.trucksByEntity = {};
    this.entityStatistics = [];
    
    // Initialize with all mappable entities
    this.mappableEntities.forEach(entity => {
      if (entity.id) {
        this.trucksByEntity[entity.id] = [];
      }
    });
    
    // Group trucks by entity
    this.trucksWithZone.forEach(truck => {
      const truckEntities = (truck as any).geographicalEntities || [];
      
      truckEntities.forEach((item: any) => {
        const entityId = item.geographicalEntityId;
        if (entityId && this.trucksByEntity[entityId]) {
          this.trucksByEntity[entityId].push(truck);
        }
      });
    });
    
    // Calculate statistics for each entity
    this.mappableEntities.forEach(entity => {
      if (!entity.id) return;
      
      const entityTrucks = this.trucksByEntity[entity.id] || [];
      const level = this.geographicalLevels.find(l => l.id === entity.levelId);
      
      this.entityStatistics.push({
        entityId: entity.id,
        entityName: entity.name,
        levelName: level?.name || 'Niveau inconnu',
        levelNumber: level?.levelNumber || 0,
        totalTrucks: entityTrucks.length,
        availableTrucks: entityTrucks.filter(t => 
          t.status.toLowerCase() === 'disponible' || t.status.toLowerCase() === 'available'
        ).length,
        onMissionTrucks: entityTrucks.filter(t => 
          t.status.toLowerCase() === 'en mission' || t.status.toLowerCase() === 'on_mission'
        ).length,
        maintenanceTrucks: entityTrucks.filter(t => 
          t.status.toLowerCase() === 'maintenance'
        ).length,
        outOfServiceTrucks: entityTrucks.filter(t => 
          t.status.toLowerCase() === 'hors service' || t.status.toLowerCase() === 'inactive'
        ).length
      });
    });
    
    this.truckActiveEntities = this.entityStatistics.filter(e => e.totalTrucks > 0).length;
    this.truckStats.activeEntities = this.truckActiveEntities;
  }

  // Keep old driver zone processing
  private processDriversByZone(): void {
    this.driversByZone = {};
    this.driverZoneStatistics = [];
    
    TUNISIA_ZONES.forEach(zone => {
      this.driversByZone[zone.name] = [];
    });
    
    this.driversWithZone.forEach(driver => {
      const zoneName = driver.zoneName || 'Non assigné';
      if (this.driversByZone[zoneName]) {
        this.driversByZone[zoneName].push(driver);
      } else {
        if (!this.driversByZone['Non assigné']) this.driversByZone['Non assigné'] = [];
        this.driversByZone['Non assigné'].push(driver);
      }
    });
    
    TUNISIA_ZONES.forEach(zone => {
      const zoneDrivers = this.driversByZone[zone.name] || [];
      
      this.driverZoneStatistics.push({
        zoneId: zone.id,
        zoneName: zone.name,
        total: zoneDrivers.length,
        available: zoneDrivers.filter(d => 
          d.status?.toLowerCase() === 'disponible' || 
          d.status?.toLowerCase() === 'available' || 
          d.availabilityStatus === 'available'
        ).length,
        onMission: zoneDrivers.filter(d => 
          d.status?.toLowerCase() === 'on_trip' || 
          d.status?.toLowerCase() === 'en mission'
        ).length,
        overtime: zoneDrivers.filter(d => 
          d.availabilityStatus === 'overtime' || 
          (d.totalHours && d.totalHours > 8)
        ).length,
        exceeded: zoneDrivers.filter(d => 
          d.availabilityStatus === 'exceeded' || 
          (d.totalHours && d.totalHours > 12)
        ).length,
        conflict: zoneDrivers.filter(d => 
          d.availabilityStatus === 'conflict' || 
          d.requiresApproval === true
        ).length,
        offDuty: zoneDrivers.filter(d => 
          d.status === 'off_duty' || 
          d.status === 'hors service'
        ).length
      });
    });
    
    this.driverActiveZones = this.driverZoneStatistics.filter(z => z.total > 0).length;
    this.driverStats.activeZones = this.driverActiveZones;
  }

  // ========== MISE À JOUR DES STATS ==========
  private updateTruckStats(): void {
    this.truckStats = {
      total: this.trucksWithZone.length,
      available: this.trucksWithZone.filter(t => 
        t.status.toLowerCase() === 'disponible' || t.status.toLowerCase() === 'available'
      ).length,
      onMission: this.trucksWithZone.filter(t => 
        t.status.toLowerCase() === 'en mission' || t.status.toLowerCase() === 'on_mission'
      ).length,
      maintenance: this.trucksWithZone.filter(t => 
        t.status.toLowerCase() === 'maintenance'
      ).length,
      outOfService: this.trucksWithZone.filter(t => 
        t.status.toLowerCase() === 'hors service' || t.status.toLowerCase() === 'inactive'
      ).length,
      activeEntities: this.truckActiveEntities
    };
  }

  private updateDriverStats(): void {
    this.driverStats = {
      total: this.driversWithZone.length,
      available: this.driversWithZone.filter(d => 
        d.status?.toLowerCase() === 'disponible' || 
        d.status?.toLowerCase() === 'available' || 
        d.availabilityStatus === 'available'
      ).length,
      onMission: this.driversWithZone.filter(d => 
        d.status?.toLowerCase() === 'on_trip' || 
        d.status?.toLowerCase() === 'en mission'
      ).length,
      overtime: this.driversWithZone.filter(d => 
        d.availabilityStatus === 'overtime' || (d.totalHours && d.totalHours > 8)
      ).length,
      exceeded: this.driversWithZone.filter(d => 
        d.availabilityStatus === 'exceeded' || (d.totalHours && d.totalHours > 12)
      ).length,
      conflict: this.driversWithZone.filter(d => 
        d.availabilityStatus === 'conflict' || d.requiresApproval === true
      ).length,
      offDuty: this.driversWithZone.filter(d => 
        d.status === 'off_duty' || d.status === 'hors service'
      ).length,
      activeZones: this.driverActiveZones
    };
  }

  // ========== INITIALISATION DES CARTES ==========
  private initTrucksMap(): void {
    if (typeof window === 'undefined') return;
    if (this.truckMap) return;
    
    this.mapsLoading.trucks = true;
    
    setTimeout(() => {
      const mapElement = document.getElementById('trucksMap');
      if (!mapElement) {
        console.error('❌ Élément #trucksMap non trouvé');
        this.mapsLoading.trucks = false;
        this.mapsError.trucks = true;
        return;
      }
      
      try {
        this.truckMap = L.map('trucksMap', {
          center: this.tunisiaCenter,
          zoom: 7,
          zoomControl: true
        });
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap Tunisie',
          maxZoom: 19,
          minZoom: 6
        }).addTo(this.truckMap);
        
        setTimeout(() => {
          if (this.truckMap) {
            this.truckMap.invalidateSize();
            this.addTruckEntityMarkers();
            this.addTruckMarkers();
            this.mapsLoading.trucks = false;
          }
        }, 300);
        
      } catch (error) {
        console.error('❌ Erreur création carte camions:', error);
        this.mapsError.trucks = true;
        this.mapsLoading.trucks = false;
      }
    }, 300);
  }

  private initDriversMap(): void {
    if (typeof window === 'undefined') return;
    if (this.driverMap) return;
    
    this.mapsLoading.drivers = true;
    
    setTimeout(() => {
      const mapElement = document.getElementById('driversMap');
      if (!mapElement) {
        console.error('❌ Élément #driversMap non trouvé');
        this.mapsLoading.drivers = false;
        this.mapsError.drivers = true;
        return;
      }
      
      try {
        this.driverMap = L.map('driversMap', {
          center: this.tunisiaCenter,
          zoom: 7,
          zoomControl: true
        });
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap Tunisie',
          maxZoom: 19,
          minZoom: 6
        }).addTo(this.driverMap);
        
        setTimeout(() => {
          if (this.driverMap) {
            this.driverMap.invalidateSize();
            this.addDriverZoneMarkers(); // Keep old zone markers
            this.addDriverMarkers();
            this.mapsLoading.drivers = false;
          }
        }, 300);
        
      } catch (error) {
        console.error('❌ Erreur création carte chauffeurs:', error);
        this.mapsError.drivers = true;
        this.mapsLoading.drivers = false;
      }
    }, 300);
  }

  // ========== MARQUEURS ENTITÉS CAMIONS (new) ==========
  private addTruckEntityMarkers(): void {
    if (!this.truckMap) return;
    
    this.truckEntityMarkers.forEach(marker => marker.remove());
    this.truckEntityMarkers = [];
    
    // Only show mappable entities on truck map
    this.mappableEntities.forEach(entity => {
      if (!entity.id || !entity.latitude || !entity.longitude) return;
      
      const entityTrucks = this.trucksByEntity[entity.id] || [];
      const totalTrucks = entityTrucks.length;
      const level = this.geographicalLevels.find(l => l.id === entity.levelId);
      
      let entityColor = '#6c757d';
      if (totalTrucks > 0) {
        const activeTrucks = entityTrucks.filter(t => 
          t.status.toLowerCase() === 'en mission' || 
          t.status.toLowerCase() === 'available' ||
          t.status.toLowerCase() === 'disponible'
        ).length;
        if (activeTrucks > 5) entityColor = '#1cc88a';
        else if (activeTrucks > 2) entityColor = '#4e73df';
        else if (activeTrucks > 0) entityColor = '#f6c23e';
        else entityColor = '#e74a3b';
      }
      
      const entityIcon = this.createTruckEntityIcon(entity, entityColor, totalTrucks, level?.name || '');
      
      const marker = L.marker([entity.latitude, entity.longitude], { 
        icon: entityIcon,
        zIndexOffset: totalTrucks > 0 ? 1000 : 500
      }).addTo(this.truckMap!);
      
      marker.bindPopup(this.createTruckEntityPopup(entity, entityColor, entityTrucks, level?.name || ''));
      
      marker.on('popupopen', () => {
        setTimeout(() => {
          const btn = document.getElementById(`truck-filter-entity-btn-${entity.id}`);
          if (btn) {
            btn.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              this.filterByEntity(entity.id!);
              marker.closePopup();
            };
          }
        }, 100);
      });
      
      this.truckEntityMarkers.push(marker);
    });
  }

  private createTruckEntityIcon(entity: IGeographicalEntity, color: string, totalTrucks: number, levelName: string): L.DivIcon {
    return L.divIcon({
      html: `
        <div style="
          background: ${color};
          width: ${totalTrucks > 0 ? '60px' : '36px'};
          height: ${totalTrucks > 0 ? '60px' : '36px'};
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
          transition: all 0.3s ease;
        ">
          <span style="font-size: ${totalTrucks > 0 ? '16px' : '12px'};">${entity.name.substring(0, 3)}</span>
          ${totalTrucks > 0 ? `<span style="font-size: 12px; margin-top: -2px;">${totalTrucks}</span>` : ''}
        </div>
      `,
      className: 'entity-marker',
      iconSize: totalTrucks > 0 ? [60, 60] : [36, 36],
      iconAnchor: totalTrucks > 0 ? [30, 30] : [18, 18],
      popupAnchor: [0, -30]
    });
  }

  private createTruckEntityPopup(entity: IGeographicalEntity, color: string, entityTrucks: ITruck[], levelName: string): HTMLDivElement {
    const total = entityTrucks.length;
    const available = entityTrucks.filter(t => 
      t.status.toLowerCase() === 'disponible' || t.status.toLowerCase() === 'available'
    ).length;
    const onMission = entityTrucks.filter(t => 
      t.status.toLowerCase() === 'en mission' || t.status.toLowerCase() === 'on_mission'
    ).length;
    const maintenance = entityTrucks.filter(t => t.status.toLowerCase() === 'maintenance').length;
    const outOfService = entityTrucks.filter(t => 
      t.status.toLowerCase() === 'hors service' || t.status.toLowerCase() === 'inactive'
    ).length;
    
    const popup = document.createElement('div');
    popup.style.fontFamily = 'Segoe UI, sans-serif';
    popup.style.padding = '15px';
    popup.style.minWidth = '280px';
    
    popup.innerHTML = `
      <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
        <div style="background: ${color}; width: 50px; height: 50px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; font-weight: bold;">
          <span style="font-size: 18px;">${entity.name.substring(0, 3)}</span>
          <span style="font-size: 12px;">${total}</span>
        </div>
        <div>
          <div style="color: #2c3e50; font-size: 18px; font-weight: 700;">${entity.name}</div>
          <div style="color: #6c757d; font-size: 13px;">${levelName} • ${total} camions</div>
        </div>
      </div>
      
      <div style="border-top: 1px solid #e9ecef; padding-top: 12px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div style="background: #f8f9fa; padding: 8px; border-radius: 6px;">
            <i class="fas fa-check-circle" style="color: #1cc88a;"></i>
            <span style="margin-left: 6px; font-weight: 600;">${available}</span>
            <span style="color: #6c757d; margin-left: 4px;">Dispo</span>
          </div>
          <div style="background: #f8f9fa; padding: 8px; border-radius: 6px;">
            <i class="fas fa-truck" style="color: #4e73df;"></i>
            <span style="margin-left: 6px; font-weight: 600;">${onMission}</span>
            <span style="color: #6c757d; margin-left: 4px;">Mission</span>
          </div>
          <div style="background: #f8f9fa; padding: 8px; border-radius: 6px;">
            <i class="fas fa-tools" style="color: #f6c23e;"></i>
            <span style="margin-left: 6px; font-weight: 600;">${maintenance}</span>
            <span style="color: #6c757d; margin-left: 4px;">Maintenance</span>
          </div>
          <div style="background: #f8f9fa; padding: 8px; border-radius: 6px;">
            <i class="fas fa-exclamation-circle" style="color: #e74a3b;"></i>
            <span style="margin-left: 6px; font-weight: 600;">${outOfService}</span>
            <span style="color: #6c757d; margin-left: 4px;">HS</span>
          </div>
        </div>
        
        <button id="truck-filter-entity-btn-${entity.id}" 
                style="width: 100%; margin-top: 15px; padding: 10px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
          <i class="fas fa-filter"></i> Voir les camions de ${entity.name}
        </button>
      </div>
    `;
    
    return popup;
  }

  // Keep old driver zone markers
  private addDriverZoneMarkers(): void {
    if (!this.driverMap) return;
    
    this.driverZoneMarkers.forEach(marker => marker.remove());
    this.driverZoneMarkers = [];
    
    TUNISIA_ZONES.forEach(zone => {
      const zoneDrivers = this.driversByZone[zone.name] || [];
      const totalDrivers = zoneDrivers.length;
      
      let zoneColor = '#6c757d';
      if (totalDrivers > 0) {
        const availableDrivers = zoneDrivers.filter(d => 
          d.status?.toLowerCase() === 'disponible' || 
          d.status?.toLowerCase() === 'available' || 
          d.availabilityStatus === 'available'
        ).length;
        if (availableDrivers > 3) zoneColor = '#1cc88a';
        else if (availableDrivers > 1) zoneColor = '#4e73df';
        else if (availableDrivers > 0) zoneColor = '#f6c23e';
        else zoneColor = '#e74a3b';
      }
      
      const zoneIcon = this.createDriverZoneIcon(zone, zoneColor, totalDrivers);
      
      const marker = L.marker([zone.latitude, zone.longitude], { 
        icon: zoneIcon,
        zIndexOffset: totalDrivers > 0 ? 1000 : 500
      }).addTo(this.driverMap!);
      
      marker.bindPopup(this.createDriverZonePopup(zone, zoneColor, zoneDrivers));
      
      marker.on('popupopen', () => {
        setTimeout(() => {
          const btn = document.getElementById(`driver-filter-zone-btn-${zone.id}`);
          if (btn) {
            btn.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              this.filterByZone(zone.name);
              marker.closePopup();
            };
          }
        }, 100);
      });
      
      this.driverZoneMarkers.push(marker);
    });
  }

  private createDriverZoneIcon(zone: IZone, color: string, totalDrivers: number): L.DivIcon {
    return L.divIcon({
      html: `
        <div style="
          background: ${color};
          width: ${totalDrivers > 0 ? '60px' : '36px'};
          height: ${totalDrivers > 0 ? '60px' : '36px'};
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
          <span style="font-size: ${totalDrivers > 0 ? '16px' : '12px'};">${zone.name.substring(0, 3)}</span>
          ${totalDrivers > 0 ? `<span style="font-size: 12px; margin-top: -2px;">${totalDrivers}</span>` : ''}
        </div>
      `,
      className: 'zone-marker',
      iconSize: totalDrivers > 0 ? [60, 60] : [36, 36],
      iconAnchor: totalDrivers > 0 ? [30, 30] : [18, 18],
      popupAnchor: [0, -30]
    });
  }

  private createDriverZonePopup(zone: IZone, color: string, zoneDrivers: IDriver[]): HTMLDivElement {
    const total = zoneDrivers.length;
    const available = zoneDrivers.filter(d => 
      d.status?.toLowerCase() === 'disponible' || 
      d.status?.toLowerCase() === 'available' || 
      d.availabilityStatus === 'available'
    ).length;
    const onMission = zoneDrivers.filter(d => 
      d.status?.toLowerCase() === 'on_trip' || 
      d.status?.toLowerCase() === 'en mission'
    ).length;
    const overtime = zoneDrivers.filter(d => 
      d.availabilityStatus === 'overtime' || (d.totalHours && d.totalHours > 8)
    ).length;
    const conflict = zoneDrivers.filter(d => 
      d.availabilityStatus === 'conflict' || d.requiresApproval === true
    ).length;
    
    const popup = document.createElement('div');
    popup.style.fontFamily = 'Segoe UI, sans-serif';
    popup.style.padding = '15px';
    popup.style.minWidth = '280px';
    
    popup.innerHTML = `
      <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
        <div style="background: ${color}; width: 50px; height: 50px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; font-weight: bold;">
          <span style="font-size: 18px;">${zone.name.substring(0, 3)}</span>
          <span style="font-size: 12px;">${total}</span>
        </div>
        <div>
          <div style="color: #2c3e50; font-size: 18px; font-weight: 700;">${zone.name}</div>
          <div style="color: #6c757d; font-size: 13px;">${total} chauffeurs</div>
        </div>
      </div>
      
      <div style="border-top: 1px solid #e9ecef; padding-top: 12px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div style="background: #f8f9fa; padding: 8px; border-radius: 6px;">
            <i class="fas fa-check-circle" style="color: #1cc88a;"></i>
            <span style="margin-left: 6px; font-weight: 600;">${available}</span>
            <span style="color: #6c757d; margin-left: 4px;">Dispo</span>
          </div>
          <div style="background: #f8f9fa; padding: 8px; border-radius: 6px;">
            <i class="fas fa-truck" style="color: #4e73df;"></i>
            <span style="margin-left: 6px; font-weight: 600;">${onMission}</span>
            <span style="color: #6c757d; margin-left: 4px;">Mission</span>
          </div>
          <div style="background: #f8f9fa; padding: 8px; border-radius: 6px;">
            <i class="fas fa-clock" style="color: #f6c23e;"></i>
            <span style="margin-left: 6px; font-weight: 600;">${overtime}</span>
            <span style="color: #6c757d; margin-left: 4px;">Heures sup</span>
          </div>
          <div style="background: #f8f9fa; padding: 8px; border-radius: 6px;">
            <i class="fas fa-exclamation-triangle" style="color: #e74a3b;"></i>
            <span style="margin-left: 6px; font-weight: 600;">${conflict}</span>
            <span style="color: #6c757d; margin-left: 4px;">Conflit</span>
          </div>
        </div>
        
        <button id="driver-filter-zone-btn-${zone.id}" 
                style="width: 100%; margin-top: 15px; padding: 10px; background: linear-gradient(135deg, #36b9cc, #4e73df); color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
          <i class="fas fa-filter"></i> Voir les chauffeurs de ${zone.name}
        </button>
      </div>
    `;
    
    return popup;
  }

  // ========== MARQUEURS CAMIONS (keep as before) ==========
  private addTruckMarkers(): void {
    if (!this.truckMap) return;
    
    this.truckMarkers.forEach(marker => marker.remove());
    this.truckMarkers = [];
    
    const activeTrucks = this.trucks.filter(t => 
      t.status.toLowerCase() !== 'inactive' && 
      t.status.toLowerCase() !== 'hors service'
    );
    
    activeTrucks.forEach(truck => {
      const truckWithGeo = this.trucksWithZone.find(t => t.id === truck.id);
      if (!truckWithGeo?.zoneCoordinates) return;
      
      const coords = truckWithGeo.zoneCoordinates;
      
      const latOffset = (Math.random() - 0.5) * 0.03;
      const lngOffset = (Math.random() - 0.5) * 0.03;
      
      const status = STATUS_CONFIG[truck.status] || STATUS_CONFIG['available'];
      const truckColor = truck.color || this.getStatusColor(truck.status);
      
      const firstImage = (truck.images && truck.images.length > 0) ? truck.images[0] : null;
      const formattedImage = this.formatBase64Image(firstImage);
      const hasValidImage = !!formattedImage;
      
      let iconHtml = '';
      
      if (hasValidImage) {
        iconHtml = `
          <div style="
            width: 48px;
            height: 48px;
            border-radius: 8px;
            border: 3px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            overflow: hidden;
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: ${truck.status.toLowerCase() === 'en mission' || truck.status.toLowerCase() === 'on_mission' ? 'bounce 2s infinite' : 'none'};
          ">
            <img src="${formattedImage}" 
                 style="width: 100%; height: 100%; object-fit: contain;" 
                 alt="Camion ${truck.immatriculation}"
                 title="${truck.brand} - ${truck.immatriculation}"
                 onerror="this.style.display='none'; this.parentElement.style.background='${truckColor}'; this.parentElement.innerHTML='<i class=\\'fas fa-truck\\' style=\\'color: white; font-size: 20px;\\'></i>';">
          </div>
        `;
      } else {
        iconHtml = `
          <div style="
            background: ${truckColor};
            width: 48px;
            height: 48px;
            border-radius: 8px;
            border: 3px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 20px;
            animation: ${truck.status.toLowerCase() === 'en mission' || truck.status.toLowerCase() === 'on_mission' ? 'bounce 2s infinite' : 'none'};
          ">
            <i class="fas fa-truck"></i>
          </div>
        `;
      }
      
      const truckIcon = L.divIcon({
        html: iconHtml,
        className: `truck-marker-${truck.status}`,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        popupAnchor: [0, -24]
      });
      
      const marker = L.marker([
        coords.lat + latOffset, 
        coords.lng + lngOffset
      ], { 
        icon: truckIcon,
        zIndexOffset: 2000
      }).addTo(this.truckMap!);
      
      const truckWithZone = {
        ...truck,
        zoneName: truckWithGeo.zoneName
      };
      
      marker.bindPopup(this.createTruckPopup(truckWithZone, truckColor, formattedImage));
      
      this.truckMarkers.push(marker);
    });
  }

  private createTruckPopup(truck: any, color: string, imageBase64: string | null): HTMLDivElement {
    const status = STATUS_CONFIG[truck.status] || STATUS_CONFIG['available'];
    const zoneName = truck.zoneName || 'Non assigné';
    
    const popup = document.createElement('div');
    popup.style.fontFamily = 'Segoe UI, sans-serif';
    popup.style.padding = '16px';
    popup.style.minWidth = '320px';
    
    const imageHtml = imageBase64 
      ? `<img src="${imageBase64}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;" alt="Camion">`
      : `<div style="width: 100%; height: 100%; background: ${color}; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; border-radius: 8px;">
           <i class="fas fa-truck"></i>
         </div>`;
    
    popup.innerHTML = `
      <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
        <div style="
          width: 80px;
          height: 80px;
          border-radius: 8px;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          overflow: hidden;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        ">
          ${imageHtml}
        </div>
        <div style="flex: 1;">
          <div style="color: #2c3e50; font-size: 18px; font-weight: 700; margin-bottom: 4px;">
            ${truck.immatriculation}
          </div>
          <div style="color: #6c757d; font-size: 14px; margin-bottom: 8px;">
            ${this.getMarqueName(truck.marqueTruckId)} • ${truck.typeTruck?.capacity}t
          </div>
          <div style="display: inline-block; padding: 4px 12px; background: ${color}20; border-radius: 20px; color: ${color}; font-weight: 600; font-size: 12px;">
            ${status.label}
          </div>
        </div>
      </div>
      
      <div style="border-top: 1px solid #e9ecef; padding-top: 12px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div>
            <span style="color: #6c757d; font-size: 11px; text-transform: uppercase; display: block; font-weight: 600;">ZONE</span>
            <div style="color: #2c3e50; font-weight: 600; font-size: 15px; background: #f0f7ff; padding: 4px 8px; border-radius: 6px; display: inline-block;">
              <i class="fas fa-map-pin" style="color: #667eea; margin-right: 4px;"></i>
              ${zoneName}
            </div>
          </div>
          <div>
            <span style="color: #6c757d; font-size: 11px; text-transform: uppercase; display: block;">CT</span>
            <div style="color: #2c3e50; font-weight: 500; font-size: 14px;">${truck.technicalVisitDate || 'Non renseigné'}</div>
          </div>
          <div>
            <span style="color: #6c757d; font-size: 11px; text-transform: uppercase; display: block;">ID</span>
            <div style="color: #2c3e50; font-weight: 500; font-size: 14px;">#${truck.id}</div>
          </div>
          <div>
            <span style="color: #6c757d; font-size: 11px; text-transform: uppercase; display: block;">COULEUR</span>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="display: inline-block; width: 16px; height: 16px; background: ${color}; border-radius: 4px;"></span>
              <span style="color: #2c3e50; font-size: 14px;">${color}</span>
            </div>
          </div>
        </div>
      </div>
    `;
    
    return popup;
  }

private addDriverMarkers(): void {
  if (!this.driverMap) return;
  
  this.driverMarkers.forEach(marker => marker.remove());
  this.driverMarkers = [];
  
  const activeDrivers = this.drivers.filter(d => 
    d.status !== 'off_duty' && d.status !== 'hors service'
  );
  
  activeDrivers.forEach(driver => {
    const driverWithZoneData = this.driversWithZone.find(d => d.id === driver.id);
    if (!driverWithZoneData?.zoneCoordinates) return;
    
    const coords = driverWithZoneData.zoneCoordinates;
    
    const latOffset = (Math.random() - 0.5) * 0.03;
    const lngOffset = (Math.random() - 0.5) * 0.03;
    
    const driverColor = this.getDriverStatusColor(driver);
    const statusLabel = this.getDriverStatusLabel(driver);
    
    const formattedImage = this.formatBase64Image(driver.imageBase64);
    const hasValidImage = !!formattedImage;
    
    let iconHtml = '';
    
    if (hasValidImage) {
      iconHtml = `
        <div style="
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          overflow: hidden;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        ">
          <img src="${formattedImage}" 
               style="width: 100%; height: 100%; object-fit: cover;" 
               alt="Chauffeur ${driver.name}"
               title="${driver.name}"
               onerror="this.style.display='none'; this.parentElement.style.background='${driverColor}'; this.parentElement.innerHTML='<i class=\\'fas fa-user-tie\\' style=\\'color: white; font-size: 20px;\\'></i>';">
          ${driver.availabilityStatus === 'conflict' || driver.requiresApproval ? `
            <span style="position: absolute; top: -5px; right: -5px; background: #e74a3b; color: white; border-radius: 50%; width: 18px; height: 18px; font-size: 10px; display: flex; align-items: center; justify-content: center; border: 2px solid white;">
              !
            </span>
          ` : ''}
        </div>
      `;
    } else {
      iconHtml = `
        <div style="
          background: ${driverColor};
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 20px;
          position: relative;
        ">
          <i class="fas fa-user-tie"></i>
          ${driver.availabilityStatus === 'conflict' || driver.requiresApproval ? `
            <span style="position: absolute; top: -5px; right: -5px; background: #e74a3b; color: white; border-radius: 50%; width: 18px; height: 18px; font-size: 10px; display: flex; align-items: center; justify-content: center; border: 2px solid white;">
              !
            </span>
          ` : ''}
        </div>
      `;
    }
    
    const driverIcon = L.divIcon({
      html: iconHtml,
      className: `driver-marker-${driver.status}`,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
      popupAnchor: [0, -24]
    });
    
    const marker = L.marker([
      coords.lat + latOffset, 
      coords.lng + lngOffset
    ], { 
      icon: driverIcon,
      zIndexOffset: 2000
    }).addTo(this.driverMap!);
    
    const driverForPopup = {
      ...driver,
      zoneName: driverWithZoneData.zoneName
    };
    
    marker.bindPopup(this.createDriverPopup(driverForPopup, driverColor, statusLabel, formattedImage));
    
    this.driverMarkers.push(marker);
  });
}
  private createDriverPopup(
    driver: any, 
    color: string, 
    statusLabel: string,
    imageBase64: string | null
  ): HTMLDivElement {
    const zoneName = driver.zoneName || 'Non assigné';
    const hours = driver.totalHours || 0;
    
    const assignedTruck = driver.idCamion ? this.trucks.find(t => t.id === driver.idCamion) : null;
    const marqueName = assignedTruck ? this.getMarqueName(assignedTruck.marqueTruckId) : '';
    const truckDisplay = assignedTruck 
      ? `${assignedTruck.immatriculation} - ${marqueName}` 
      : 'Non assigné';
    
    const popup = document.createElement('div');
    popup.style.fontFamily = 'Segoe UI, sans-serif';
    popup.style.padding = '16px';
    popup.style.minWidth = '320px';
    
    const imageHtml = imageBase64 
      ? `<img src="${imageBase64}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" alt="Chauffeur">`
      : `<div style="width: 100%; height: 100%; background: ${color}; display: flex; align-items: center; justify-content: center; color: white; font-size: 30px; border-radius: 50%;">
           <i class="fas fa-user-tie"></i>
         </div>`;
    
    popup.innerHTML = `
      <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
        <div style="
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          overflow: hidden;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        ">
          ${imageHtml}
        </div>
        <div style="flex: 1;">
          <div style="color: #2c3e50; font-size: 18px; font-weight: 700; margin-bottom: 4px;">
            ${driver.name}
          </div>
          <div style="color: #6c757d; font-size: 14px; margin-bottom: 8px;">
            ${driver.permisNumber}
          </div>
          <div style="display: inline-block; padding: 4px 12px; background: ${color}20; border-radius: 20px; color: ${color}; font-weight: 600; font-size: 12px;">
            ${statusLabel}
          </div>
        </div>
      </div>
      
      <div style="border-top: 1px solid #e9ecef; padding-top: 12px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div>
            <span style="color: #6c757d; font-size: 11px; text-transform: uppercase; display: block; font-weight: 600;">ZONE</span>
            <div style="color: #2c3e50; font-weight: 600; font-size: 15px; background: #f0f7ff; padding: 4px 8px; border-radius: 6px; display: inline-block;">
              <i class="fas fa-map-pin" style="color: #667eea; margin-right: 4px;"></i>
              ${zoneName}
            </div>
          </div>
          <div>
            <span style="color: #6c757d; font-size: 11px; text-transform: uppercase; display: block;">TÉLÉPHONE</span>
            <div style="color: #2c3e50; font-weight: 500; font-size: 14px;">${driver.phone || 'Non renseigné'}</div>
          </div>
          <div>
            <span style="color: #6c757d; font-size: 11px; text-transform: uppercase; display: block;">EMAIL</span>
            <div style="color: #2c3e50; font-weight: 500; font-size: 14px; word-break: break-all;">${driver.email || 'Non renseigné'}</div>
          </div>
          <div>
            <span style="color: #6c757d; font-size: 11px; text-transform: uppercase; display: block;">CAMION</span>
            <div style="color: #2c3e50; font-weight: 500; font-size: 14px;">
              <i class="fas fa-truck" style="color: #667eea; margin-right: 4px;"></i>
              ${truckDisplay}
            </div>
          </div>
        </div>
        
        <div style="background: #f8f9fa; border-radius: 8px; padding: 12px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <i class="fas fa-clock" style="color: ${hours > 12 ? '#e74a3b' : hours > 8 ? '#f6c23e' : '#1cc88a'};"></i>
            <span style="color: #2c3e50; font-size: 13px;">Heures travaillées:</span>
            <span style="font-weight: 700; color: ${hours > 12 ? '#e74a3b' : hours > 8 ? '#f6c23e' : '#1cc88a'};">${hours}h</span>
            <span style="color: #6c757d; font-size: 11px; margin-left: auto;">
              ${hours > 12 ? 'Dépassé' : hours > 8 ? 'Heures sup' : 'Normal'}
            </span>
          </div>
          
          ${driver.requiresApproval ? `
            <div style="margin-top: 8px; padding: 8px; background: #e74a3b10; border-radius: 6px; color: #e74a3b; font-size: 12px; display: flex; align-items: center; gap: 8px; border-left: 3px solid #e74a3b;">
              <i class="fas fa-exclamation-triangle"></i>
              <span>Approbation requise</span>
            </div>
          ` : ''}
          
          ${driver.availabilityMessage ? `
            <div style="margin-top: 8px; color: #6c757d; font-size: 12px; font-style: italic; padding: 4px 0;">
              "${driver.availabilityMessage}"
            </div>
          ` : ''}
        </div>
      </div>
    `;
    
    return popup;
  }

  // ========== FORMATAGE IMAGE ==========
  private formatBase64Image(base64: string | null | undefined): string | null {
    if (!base64) return null;
    if (base64.startsWith('data:image/')) {
      return base64;
    }
    return `data:image/jpeg;base64,${base64}`;
  }

  // ========== GESTION DES CARTES ==========
  centerMap(mapType: 'truck' | 'driver'): void {
    if (mapType === 'truck' && this.truckMap) {
      this.truckMap.setView(this.tunisiaCenter, 7);
      setTimeout(() => {
        if (this.truckMap) this.truckMap.invalidateSize();
      }, 100);
      this.activeTruckRegionFilter = 'all';
    }
    
    if (mapType === 'driver' && this.driverMap) {
      this.driverMap.setView(this.tunisiaCenter, 7);
      setTimeout(() => {
        if (this.driverMap) this.driverMap.invalidateSize();
      }, 100);
      this.activeDriverRegionFilter = 'all';
    }
    
    this.activeZoneName = 'all';
  }

  refreshMap(mapType: 'truck' | 'driver'): void {
    if (mapType === 'truck' && this.truckMap) {
      this.addTruckEntityMarkers();
      this.addTruckMarkers();
      this.truckMap.invalidateSize();
    }
    
    if (mapType === 'driver' && this.driverMap) {
      this.addDriverZoneMarkers();
      this.addDriverMarkers();
      this.driverMap.invalidateSize();
    }
    
    this.updateLastUpdateTime();
    this.successMessage = `Carte des ${mapType === 'truck' ? 'camions' : 'chauffeurs'} actualisée`;
    setTimeout(() => this.successMessage = '', 3000);
  }

  focusOnRegion(region: string, mapType: 'truck' | 'driver'): void {
    if (mapType === 'truck') {
      // For trucks, region is actually level name
      const level = this.geographicalLevels.find(l => l.name === region);
      if (!level || !this.truckMap) return;
      
      // Find all entities with this level
      const entities = this.mappableEntities.filter(e => e.levelId === level.id && e.latitude && e.longitude);
      if (entities.length === 0) return;
      
      const bounds = L.latLngBounds(
        entities.map(e => [e.latitude!, e.longitude!] as L.LatLngTuple)
      );
      
      this.truckMap.fitBounds(bounds);
      this.activeTruckRegionFilter = region;
    } else {
      // For drivers, use region bounds
      if (!this.regionBounds[region] || !this.driverMap) return;
      this.driverMap.fitBounds(this.regionBounds[region]);
      this.activeDriverRegionFilter = region;
    }
    
    this.activeZoneName = 'all';
  }

  focusOnZone(zoneName: string): void {
    const zone = TUNISIA_ZONES.find(z => z.name === zoneName);
    if (!zone) return;
    
    this.activeZoneName = zoneName;
    
    if (this.activeZoneView === 'trucks' && this.truckMap) {
      this.truckMap.setView([zone.latitude, zone.longitude], 10);
      this.highlightTruckZone(zoneName);
    }
    
    if (this.activeZoneView === 'drivers' && this.driverMap) {
      this.driverMap.setView([zone.latitude, zone.longitude], 10);
      this.highlightDriverZone(zoneName);
    }
  }

  focusOnEntity(entityId: number): void {
    const entity = this.geographicalEntities.find(e => e.id === entityId);
    if (!entity || !entity.latitude || !entity.longitude) return;
    
    this.activeZoneName = entity.name;
    
    if (this.activeZoneView === 'trucks' && this.truckMap) {
      this.truckMap.setView([entity.latitude, entity.longitude], 10);
      this.highlightTruckEntity(entityId);
    }
  }

  private highlightTruckZone(zoneName: string): void {
    if (!this.truckMap) return;
    
    const zone = TUNISIA_ZONES.find(z => z.name === zoneName);
    if (!zone) return;
    
    const zoneMarker = this.truckEntityMarkers.find(m => {
      const latLng = m.getLatLng();
      return latLng.lat === zone.latitude && latLng.lng === zone.longitude;
    });
    
    if (zoneMarker) {
      zoneMarker.openPopup();
    }
  }

  private highlightDriverZone(zoneName: string): void {
    if (!this.driverMap) return;
    
    const zone = TUNISIA_ZONES.find(z => z.name === zoneName);
    if (!zone) return;
    
    const zoneMarker = this.driverZoneMarkers.find(m => {
      const latLng = m.getLatLng();
      return latLng.lat === zone.latitude && latLng.lng === zone.longitude;
    });
    
    if (zoneMarker) {
      zoneMarker.openPopup();
    }
  }

  private highlightTruckEntity(entityId: number): void {
    if (!this.truckMap) return;
    
    const entityMarker = this.truckEntityMarkers.find(m => {
      const latLng = m.getLatLng();
      const entity = this.mappableEntities.find(e => e.latitude === latLng.lat && e.longitude === latLng.lng);
      return entity?.id === entityId;
    });
    
    if (entityMarker) {
      entityMarker.openPopup();
    }
  }

  filterByZone(zoneName: string): void {
    this.activeZoneName = zoneName;
    this.successMessage = `Filtre appliqué: ${zoneName}`;
    setTimeout(() => this.successMessage = '', 3000);
  }

  filterByEntity(entityId: number): void {
    this.activeZoneName = this.getEntityName(entityId);
    this.successMessage = `Filtre appliqué: ${this.getEntityName(entityId)}`;
    setTimeout(() => this.successMessage = '', 3000);
  }

  // ========== CHANGEMENT DE VUE ==========
  switchZoneView(view: 'trucks' | 'drivers'): void {
    this.activeZoneView = view;
  }

  // ========== GETTERS STATISTIQUES ==========
  getZoneStats(zoneName: string) {
    return this.zoneStatistics.find(z => z.zoneName === zoneName) || {
      total: 0, available: 0, onMission: 0, maintenance: 0, outOfService: 0
    };
  }

  getDriverZoneStats(zoneName: string) {
    return this.driverZoneStatistics.find(z => z.zoneName === zoneName) || {
      total: 0, available: 0, onMission: 0, overtime: 0, exceeded: 0, conflict: 0, offDuty: 0
    };
  }

  getEntityStats(entityId: number) {
    return this.entityStatistics.find(e => e.entityId === entityId) || {
      totalTrucks: 0, availableTrucks: 0, onMissionTrucks: 0, maintenanceTrucks: 0, outOfServiceTrucks: 0
    };
  }

  getZoneColor(zoneName: string): string {
    const stats = this.getZoneStats(zoneName);
    if (stats.total === 0) return '#6c757d';
    const activeRatio = stats.onMission / stats.total;
    if (activeRatio > 0.5) return '#1cc88a';
    if (activeRatio > 0.2) return '#4e73df';
    if (activeRatio > 0) return '#f6c23e';
    return '#e74a3b';
  }

  getDriverZoneColor(zoneName: string): string {
    const stats = this.getDriverZoneStats(zoneName);
    if (stats.total === 0) return '#6c757d';
    const availableRatio = stats.available / stats.total;
    if (availableRatio > 0.5) return '#1cc88a';
    if (availableRatio > 0.2) return '#4e73df';
    if (availableRatio > 0) return '#f6c23e';
    return '#e74a3b';
  }

  getEntityColor(entityId: number): string {
    const stats = this.getEntityStats(entityId);
    if (stats.totalTrucks === 0) return '#6c757d';
    const activeRatio = stats.onMissionTrucks / stats.totalTrucks;
    if (activeRatio > 0.5) return '#1cc88a';
    if (activeRatio > 0.2) return '#4e73df';
    if (activeRatio > 0) return '#f6c23e';
    return '#e74a3b';
  }

  getZoneUtilizationPercentage(zoneName: string): number {
    const stats = this.getZoneStats(zoneName);
    if (stats.total === 0) return 0;
    return Math.round((stats.onMission / stats.total) * 100);
  }

  getDriverUtilizationPercentage(zoneName: string): number {
    const stats = this.getDriverZoneStats(zoneName);
    if (stats.total === 0) return 0;
    return Math.round((stats.onMission / stats.total) * 100);
  }

  getEntityUtilizationPercentage(entityId: number): number {
    const stats = this.getEntityStats(entityId);
    if (stats.totalTrucks === 0) return 0;
    return Math.round((stats.onMissionTrucks / stats.totalTrucks) * 100);
  }

  getEntityName(entityId: number): string {
    const entity = this.geographicalEntities.find(e => e.id === entityId);
    return entity ? entity.name : 'Inconnu';
  }

  // ========== UTILITAIRES ==========
  getTruckDisplay(truck: ITruck): string {
    const status = STATUS_CONFIG[truck.status]?.label || truck.status;
    const truckWithGeo = this.trucksWithZone.find(t => t.id === truck.id);
    const zoneName = truckWithGeo?.zoneName || 'Non assigné';
    const marqueName = this.getMarqueName(truck.marqueTruckId);
    return `${truck.immatriculation} - ${marqueName} (${truck.typeTruck?.capacity}t) - ${status} - ${zoneName}`;
  }

  getDriverDisplay(driver: IDriver): string {
    const status = this.getDriverStatusLabel(driver);
    const driverWithZone = this.driversWithZone.find(d => d.id === driver.id);
    const zoneName = driverWithZone?.zoneName || 'Non assigné';
    return `${driver.name} - ${driver.drivingLicense} - ${status} - ${zoneName}`;
  }

  getSelectedTruckName(): string {
    if (!this.filter.truckId) return 'Tous les Camions';
    const truck = this.trucks.find(t => t.id === this.filter.truckId);
    const marqueName = truck ? this.getMarqueName(truck.marqueTruckId) : '';
    return truck ? `${truck.immatriculation} (${marqueName})` : 'Camion Sélectionné';
  }

  getSelectedDriverName(): string {
    if (!this.filter.driverId) return 'Tous les Chauffeurs';
    const driver = this.drivers.find(d => d.id === this.filter.driverId);
    return driver ? driver.name : 'Chauffeur Sélectionné';
  }

  getStatusColor(status: string): string {
    return STATUS_CONFIG[status]?.color || '#6c757d';
  }

  private getDriverStatusColor(driver: IDriver): string {
    if (driver.availabilityStatus === 'conflict' || driver.requiresApproval) {
      return this.driverStatusColors['conflict'];
    }
    if (driver.availabilityStatus === 'exceeded') {
      return this.driverStatusColors['exceeded'];
    }
    if (driver.availabilityStatus === 'overtime' || (driver.totalHours && driver.totalHours > 8)) {
      return this.driverStatusColors['overtime'];
    }
    return this.driverStatusColors[driver.status as keyof typeof this.driverStatusColors] || 
           this.driverStatusColors['default'];
  }

  private getDriverStatusLabel(driver: IDriver): string {
    if (driver.requiresApproval) return 'Approbation requise';
    if (driver.availabilityStatus === 'conflict') return 'Conflit';
    if (driver.availabilityStatus === 'exceeded') return 'Dépassé';
    if (driver.availabilityStatus === 'overtime') return 'Heures sup';
    if (driver.status?.toLowerCase() === 'available' || driver.status?.toLowerCase() === 'disponible') return 'Disponible';
    if (driver.status?.toLowerCase() === 'on_trip' || driver.status?.toLowerCase() === 'en mission') return 'En mission';
    if (driver.status?.toLowerCase() === 'off_duty' || driver.status?.toLowerCase() === 'hors service') return 'Hors service';
    return driver.status || 'Inconnu';
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ========== GESTION DES ERREURS ==========
  clearError(): void {
    this.errorMessage = '';
  }

  clearSuccess(): void {
    this.successMessage = '';
  }

  toggleHelp(): void {
    this.showHelp = !this.showHelp;
  }

  marqueMap: Map<number, string> = new Map();

  private loadMarques(): void {
    this.httpService.getMarqueTrucks().subscribe({
      next: (marques) => {
        this.marqueMap.clear();
        marques.forEach(marque => {
          this.marqueMap.set(marque.id, marque.name);
        });
      },
      error: (error) => {
        console.error('Error loading marques:', error);
      }
    });
  }

  getMarqueName(marqueId?: number): string {
    if (!marqueId) return 'N/A';
    return this.marqueMap.get(marqueId) || 'N/A';
  }
  getEntityLevelName(entityId: number | undefined): string {
  if (!entityId) return '';
  const entity = this.geographicalEntities.find(e => e.id === entityId);
  if (!entity) return '';
  const level = this.geographicalLevels.find(l => l.id === entity.levelId);
  return level ? level.name : '';
}
}