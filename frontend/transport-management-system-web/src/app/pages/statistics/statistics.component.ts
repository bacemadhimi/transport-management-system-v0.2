import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { StatisticsService } from '../../services/statistics.service';
import {
  StatisticsFilter
} from '../../types/pie-chart-data.model';
import {
  ITruck,
  ITruckWithZone,
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

  filter: StatisticsFilter = {};
  startDate: string = '';
  endDate: string = '';

  trucks: ITruck[] = [];
  trucksWithGeo: (ITruck & { geographicalEntity?: IGeographicalEntity; entityName?: string; entityCoordinates?: { lat: number; lng: number } })[] = [];

  drivers: IDriver[] = [];
  driversWithGeo: (IDriver & { geographicalEntity?: IGeographicalEntity; entityName?: string; entityCoordinates?: { lat: number; lng: number } })[] = [];

  geographicalLevels: IGeographicalLevel[] = [];
  geographicalEntities: IGeographicalEntity[] = [];
  mappableEntities: IGeographicalEntity[] = [];

  filteredTrucks: ITruck[] = [];
  filteredDrivers: IDriver[] = [];
  inactiveTrucks: ITruck[] = [];
  unavailableDrivers: IDriver[] = [];

  trucksByEntity: { [entityId: number]: ITruck[] } = {};
  driversByEntity: { [entityId: number]: IDriver[] } = {};

  truckEntityStatistics: {
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

  driverEntityStatistics: {
    entityId: number;
    entityName: string;
    levelName: string;
    levelNumber: number;
    totalDrivers: number;
    availableDrivers: number;
    onMissionDrivers: number;
    overtimeDrivers: number;
    exceededDrivers: number;
    conflictDrivers: number;
    offDutyDrivers: number;
  }[] = [];

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

  activeEntityView: 'trucks' | 'drivers' = 'trucks';
  activeEntityName: string = 'all';

  activeTruckRegionFilter: string = 'all';
  activeDriverRegionFilter: string = 'all';

  showHelp = false;
  errorMessage: string = '';
  successMessage: string = '';
  lastUpdateTime: string = '';

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
    activeEntities: 0
  };

  // Propriétés pour l'affichage hiérarchique - INDÉPENDANTES pour camions et chauffeurs
  truckSelectedLevelIds: (number | null)[] = [];
  driverSelectedLevelIds: (number | null)[] = [];
  
  expandedBranches: Set<number> = new Set();
  expandedChildren: Set<number> = new Set();
  entitiesByParentMap: Map<number, IGeographicalEntity[]> = new Map();
  rootEntitiesList: IGeographicalEntity[] = [];

  private truckMap: L.Map | null = null;
  private driverMap: L.Map | null = null;
  private tunisiaCenter: L.LatLngTuple = [34.5, 9.5];

  private truckEntityMarkers: L.Marker[] = [];
  private truckMarkers: L.Marker[] = [];
  private driverEntityMarkers: L.Marker[] = [];
  private driverMarkers: L.Marker[] = [];

  private subscriptions: Subscription = new Subscription();
  private resizeTimer: any;

  Object = Object;

  private driverStatusColors = {
    'available': '#1cc88a',
    'on_trip': '#4e73df',
    'overtime': '#f6c23e',
    'exceeded': '#e74a3b',
    'conflict': '#e74a3b',
    'off_duty': '#858796',
    'default': '#6c757d'
  };

  marqueMap: Map<number, string> = new Map();

  constructor(
    private statisticsService: StatisticsService,
    private httpService: Http
  ) {
    this.initializeDates();
    this.configureLeafletIcons();
  }

  ngOnInit(): void {
    this.updateLastUpdateTime();
    this.loadMarques();
    this.loadGeographicalData();
    this.loadTrucks();
    this.loadDrivers();
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

  private handleResize(): void {
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
    }
    this.resizeTimer = setTimeout(() => {
      if (this.truckMap) this.truckMap.invalidateSize();
      if (this.driverMap) this.driverMap.invalidateSize();
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

  private loadGeographicalData(): void {
    this.loadingGeographical = true;

    const levelsSub = this.httpService.getGeographicalLevels().subscribe({
      next: (levels) => {
        this.geographicalLevels = levels.filter(l => l.isActive);
        this.truckSelectedLevelIds = new Array(this.geographicalLevels.length).fill(null);
        this.driverSelectedLevelIds = new Array(this.geographicalLevels.length).fill(null);

        const entitiesSub = this.httpService.getGeographicalEntities().subscribe({
          next: (entities) => {
            this.geographicalEntities = entities.filter(e => e.isActive);
            this.mappableEntities = this.geographicalEntities.filter(e => {
              return e.latitude != null && e.longitude != null;
            });
            this.initializeHierarchy();

            this.loadingGeographical = false;

            if (this.trucks.length > 0) {
              this.processTrucksByEntity();
            }
            if (this.drivers.length > 0) {
              this.processDriversByEntity();
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

  loadTrucks(): void {
    this.loadingTrucks = true;
    const subscription = this.statisticsService.getTrucks().subscribe({
      next: (trucks) => {
        console.log('Trucks loaded:', trucks.length);
        
        this.trucks = trucks.map(truck => {
          if (!truck.color || truck.color === '#000000') {
            truck.color = this.getStatusColor(truck.status);
          }
          return truck;
        });
        
        this.enrichTrucksWithGeographicalData();

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

  loadDrivers(): void {
    this.loadingDrivers = true;
    const subscription = this.statisticsService.getDrivers().subscribe({
      next: (drivers) => {
        console.log('Drivers loaded:', drivers.length);
        this.drivers = drivers;
        this.enrichDriversWithGeographicalData();

        if (this.geographicalEntities.length > 0) {
          this.processDriversByEntity();
        }

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
          this.addDriverEntityMarkers();
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

  private enrichTrucksWithGeographicalData(): void {
    this.trucksWithGeo = this.trucks.map(truck => {
      let entityCoordinates = undefined;
      let entityName = 'Non assigné';
      let geographicalEntity = undefined;

      const truckEntities = (truck as any).geographicalEntities || [];
      
      if (truckEntities.length > 0) {
        const entityId = truckEntities[0]?.geographicalEntityId;
        const entity = this.geographicalEntities.find(e => e.id === entityId);
        
        if (entity) {
          geographicalEntity = entity;
          entityName = entity.name;
          if (entity.latitude && entity.longitude) {
            entityCoordinates = { lat: entity.latitude, lng: entity.longitude };
          }
        }
      }

      if (!entityCoordinates && (truck as any).geographicalEntity) {
        const entity = (truck as any).geographicalEntity;
        if (entity && entity.latitude && entity.longitude) {
          entityCoordinates = { lat: entity.latitude, lng: entity.longitude };
          entityName = entity.name || 'Entité';
        }
      }

      return {
        ...truck,
        geographicalEntity,
        entityName,
        entityCoordinates
      };
    });
    
    const trucksWithCoords = this.trucksWithGeo.filter(t => t.entityCoordinates);
    console.log('Trucks with coordinates:', trucksWithCoords.length);
  }

  private enrichDriversWithGeographicalData(): void {
    this.driversWithGeo = this.drivers.map(driver => {
      let entityCoordinates = undefined;
      let entityName = 'Non assigné';
      let geographicalEntity = undefined;

      const driverEntities = (driver as any).geographicalEntities || [];
      
      if (driverEntities.length > 0) {
        const entityId = driverEntities[0]?.geographicalEntityId;
        const entity = this.geographicalEntities.find(e => e.id === entityId);
        
        if (entity) {
          geographicalEntity = entity;
          entityName = entity.name;
          if (entity.latitude && entity.longitude) {
            entityCoordinates = { lat: entity.latitude, lng: entity.longitude };
          }
        }
      }

      return {
        ...driver,
        geographicalEntity,
        entityName,
        entityCoordinates,
        imageBase64: driver.imageBase64 || null
      };
    });
    
    const driversWithCoords = this.driversWithGeo.filter(d => d.entityCoordinates);
    console.log('Drivers with coordinates:', driversWithCoords.length);
  }

  private getTruckEntityId(truck: any): number | null {
    const truckEntities = truck.geographicalEntities || [];
    if (truckEntities.length > 0) {
      return truckEntities[0]?.geographicalEntityId;
    }
    return null;
  }

  private getDriverEntityId(driver: any): number | null {
    const driverEntities = driver.geographicalEntities || [];
    if (driverEntities.length > 0) {
      return driverEntities[0]?.geographicalEntityId;
    }
    return null;
  }

  private isDescendantOf(entity: IGeographicalEntity, ancestor: IGeographicalEntity): boolean {
    if (entity.id === ancestor.id) return true;
    
    if (!entity.parentId) return false;
    
    const parent = this.geographicalEntities.find(e => e.id === entity.parentId);
    if (!parent) return false;
    
    if (parent.id === ancestor.id) return true;
    
    return this.isDescendantOf(parent, ancestor);
  }

  private adjustColor(color: string, percent: number): string {
    if (!color || color === '#6c757d') return color;
    
    let r, g, b;
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
      }
    } else {
      return color;
    }
    
    r = Math.max(0, Math.min(255, r + (r * percent / 100)));
    g = Math.max(0, Math.min(255, g + (g * percent / 100)));
    b = Math.max(0, Math.min(255, b + (b * percent / 100)));
    
    return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
  }

  private createTruckEntityPopup(entity: IGeographicalEntity, entityTrucks: ITruck[], entityColor: string, levelName: string): HTMLDivElement {
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
    popup.style.padding = '0';
    popup.style.minWidth = '320px';
    popup.style.maxWidth = '400px';

    const header = document.createElement('div');
    header.style.background = `linear-gradient(135deg, ${entityColor}, ${this.adjustColor(entityColor, -20)})`;
    header.style.padding = '16px';
    header.style.color = 'white';
    header.style.borderRadius = '12px 12px 0 0';
    header.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="background: rgba(255,255,255,0.2); width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
          <i class="fas fa-truck" style="font-size: 24px;"></i>
        </div>
        <div>
          <h3 style="margin: 0; font-size: 18px; font-weight: 700;">${entity.name}</h3>
          <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">${levelName} • ${total} camion${total > 1 ? 's' : ''}</p>
        </div>
      </div>
    `;

    const stats = document.createElement('div');
    stats.style.padding = '16px';
    stats.style.background = '#f8f9fa';
    stats.style.borderBottom = '1px solid #e9ecef';
    stats.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
        <div style="text-align: center;">
          <div style="font-size: 20px; font-weight: 700; color: #1cc88a;">${available}</div>
          <div style="font-size: 11px; color: #6c757d;">Disponibles</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 20px; font-weight: 700; color: #4e73df;">${onMission}</div>
          <div style="font-size: 11px; color: #6c757d;">En mission</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 20px; font-weight: 700; color: #f6c23e;">${maintenance}</div>
          <div style="font-size: 11px; color: #6c757d;">Maintenance</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 20px; font-weight: 700; color: #e74a3b;">${outOfService}</div>
          <div style="font-size: 11px; color: #6c757d;">Hors service</div>
        </div>
      </div>
    `;

    const truckList = document.createElement('div');
    truckList.style.padding = '12px';
    truckList.style.maxHeight = '300px';
    truckList.style.overflowY = 'auto';

    if (total > 0) {
      truckList.innerHTML = `<div style="padding: 8px 0 4px 0; font-weight: 600; color: #2c3e50; border-bottom: 2px solid ${entityColor}; margin-bottom: 12px;">Liste des camions (${total})</div>`;
      
      entityTrucks.forEach(truck => {
        const statusColor = this.getStatusBadgeColor(truck.status);
        const statusIcon = this.getStatusIcon(truck.status);
        const statusLabel = STATUS_CONFIG[truck.status]?.label || truck.status;
        const marqueName = this.getMarqueName(truck.marqueTruckId);
        
        const truckItem = document.createElement('div');
        truckItem.style.padding = '12px';
        truckItem.style.marginBottom = '8px';
        truckItem.style.background = '#ffffff';
        truckItem.style.borderRadius = '8px';
        truckItem.style.border = '1px solid #e9ecef';
        truckItem.style.cursor = 'pointer';
        truckItem.style.transition = 'all 0.2s ease';
        
        truckItem.onmouseenter = () => {
          truckItem.style.background = '#f8f9fa';
          truckItem.style.transform = 'translateX(4px)';
        };
        truckItem.onmouseleave = () => {
          truckItem.style.background = '#ffffff';
          truckItem.style.transform = 'translateX(0)';
        };
        
        const truckWithGeo = this.trucksWithGeo.find(t => t.id === truck.id);
        if (truckWithGeo?.entityCoordinates) {
          truckItem.onclick = () => {
            if (this.truckMap) {
              this.truckMap.setView([truckWithGeo.entityCoordinates!.lat, truckWithGeo.entityCoordinates!.lng], 14);
            }
            truckItem.style.background = `${statusColor}20`;
            setTimeout(() => {
              truckItem.style.background = '#ffffff';
            }, 500);
          };
        }
        
        truckItem.innerHTML = `
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; background: ${truck.color || '#6c757d'}; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white;">
              <i class="fas fa-truck" style="font-size: 20px;"></i>
            </div>
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap;">
                <strong style="font-size: 14px;">${truck.immatriculation}</strong>
                <span style="display: inline-flex; align-items: center; gap: 4px; background: ${statusColor}20; color: ${statusColor}; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600;">
                  <i class="fas ${statusIcon}" style="font-size: 8px;"></i>
                  ${statusLabel}
                </span>
              </div>
              <div style="font-size: 11px; color: #6c757d;">
                <i class="fas fa-industry"></i> ${marqueName} • ${truck.typeTruck?.capacity || '?'} tonnes
              </div>
            </div>
            <div style="font-size: 11px; color: #6c757d;">
              #${truck.id}
            </div>
          </div>
        `;
        
        truckList.appendChild(truckItem);
      });
    } else {
      truckList.innerHTML = `
        <div style="text-align: center; padding: 32px; color: #6c757d;">
          <i class="fas fa-truck" style="font-size: 32px; margin-bottom: 12px; display: block;"></i>
          <p style="margin: 0;">Aucun camion assigné à cette entité</p>
        </div>
      `;
    }

    const footer = document.createElement('div');
    footer.style.padding = '12px 16px';
    footer.style.borderTop = '1px solid #e9ecef';
    footer.style.background = '#ffffff';
    footer.style.borderRadius = '0 0 12px 12px';
    footer.innerHTML = `
      <button id="center-entity-btn-${entity.id}" style="width: 100%; padding: 10px; background: ${entityColor}; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
        <i class="fas fa-crosshairs"></i> Centrer la carte sur ${entity.name}
      </button>
    `;

    popup.appendChild(header);
    popup.appendChild(stats);
    popup.appendChild(truckList);
    popup.appendChild(footer);

    setTimeout(() => {
      const centerBtn = document.getElementById(`center-entity-btn-${entity.id}`);
      if (centerBtn && this.truckMap) {
        centerBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (entity.latitude && entity.longitude) {
            this.truckMap?.setView([entity.latitude, entity.longitude], 12);
          }
        };
      }
    }, 100);

    return popup;
  }

  private createDriverEntityPopup(entity: IGeographicalEntity, entityDrivers: IDriver[], entityColor: string, levelName: string): HTMLDivElement {
    const total = entityDrivers.length;
    const available = entityDrivers.filter(d =>
      d.status?.toLowerCase() === 'disponible' ||
      d.status?.toLowerCase() === 'available' ||
      d.availabilityStatus === 'available'
    ).length;
    const onMission = entityDrivers.filter(d =>
      d.status?.toLowerCase() === 'on_trip' ||
      d.status?.toLowerCase() === 'en mission'
    ).length;
    const overtime = entityDrivers.filter(d =>
      d.availabilityStatus === 'overtime' || (d.totalHours && d.totalHours > 8)
    ).length;
    const conflict = entityDrivers.filter(d =>
      d.availabilityStatus === 'conflict' || d.requiresApproval === true
    ).length;

    const popup = document.createElement('div');
    popup.style.fontFamily = 'Segoe UI, sans-serif';
    popup.style.padding = '0';
    popup.style.minWidth = '320px';
    popup.style.maxWidth = '400px';

    const header = document.createElement('div');
    header.style.background = `linear-gradient(135deg, ${entityColor}, ${this.adjustColor(entityColor, -20)})`;
    header.style.padding = '16px';
    header.style.color = 'white';
    header.style.borderRadius = '12px 12px 0 0';
    header.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="background: rgba(255,255,255,0.2); width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
          <i class="fas fa-user-tie" style="font-size: 24px;"></i>
        </div>
        <div>
          <h3 style="margin: 0; font-size: 18px; font-weight: 700;">${entity.name}</h3>
          <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">${levelName} • ${total} chauffeur${total > 1 ? 's' : ''}</p>
        </div>
      </div>
    `;

    const stats = document.createElement('div');
    stats.style.padding = '16px';
    stats.style.background = '#f8f9fa';
    stats.style.borderBottom = '1px solid #e9ecef';
    stats.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
        <div style="text-align: center;">
          <div style="font-size: 20px; font-weight: 700; color: #1cc88a;">${available}</div>
          <div style="font-size: 11px; color: #6c757d;">Disponibles</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 20px; font-weight: 700; color: #4e73df;">${onMission}</div>
          <div style="font-size: 11px; color: #6c757d;">En mission</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 20px; font-weight: 700; color: #f6c23e;">${overtime}</div>
          <div style="font-size: 11px; color: #6c757d;">Heures sup</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 20px; font-weight: 700; color: #e74a3b;">${conflict}</div>
          <div style="font-size: 11px; color: #6c757d;">Conflits</div>
        </div>
      </div>
    `;

    const driverList = document.createElement('div');
    driverList.style.padding = '12px';
    driverList.style.maxHeight = '300px';
    driverList.style.overflowY = 'auto';

    if (total > 0) {
      driverList.innerHTML = `<div style="padding: 8px 0 4px 0; font-weight: 600; color: #2c3e50; border-bottom: 2px solid ${entityColor}; margin-bottom: 12px;">Liste des chauffeurs (${total})</div>`;
      
      entityDrivers.forEach(driver => {
        const statusColor = this.getDriverStatusColor(driver);
        const statusLabel = this.getDriverStatusLabel(driver);
        
        const driverItem = document.createElement('div');
        driverItem.style.padding = '12px';
        driverItem.style.marginBottom = '8px';
        driverItem.style.background = '#ffffff';
        driverItem.style.borderRadius = '8px';
        driverItem.style.border = '1px solid #e9ecef';
        driverItem.style.cursor = 'pointer';
        driverItem.style.transition = 'all 0.2s ease';
        
        driverItem.onmouseenter = () => {
          driverItem.style.background = '#f8f9fa';
          driverItem.style.transform = 'translateX(4px)';
        };
        driverItem.onmouseleave = () => {
          driverItem.style.background = '#ffffff';
          driverItem.style.transform = 'translateX(0)';
        };
        
        const driverWithGeo = this.driversWithGeo.find(d => d.id === driver.id);
        if (driverWithGeo?.entityCoordinates) {
          driverItem.onclick = () => {
            if (this.driverMap) {
              this.driverMap.setView([driverWithGeo.entityCoordinates!.lat, driverWithGeo.entityCoordinates!.lng], 14);
            }
            driverItem.style.background = `${statusColor}20`;
            setTimeout(() => {
              driverItem.style.background = '#ffffff';
            }, 500);
          };
        }
        
        const assignedTruck = driver.idCamion ? this.trucks.find(t => t.id === driver.idCamion) : null;
        const truckInfo = assignedTruck ? `${assignedTruck.immatriculation}` : 'Non assigné';
        
        driverItem.innerHTML = `
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; background: ${statusColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">
              <i class="fas fa-user-tie" style="font-size: 18px;"></i>
            </div>
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap;">
                <strong style="font-size: 14px;">${driver.name}</strong>
                <span style="display: inline-flex; align-items: center; gap: 4px; background: ${statusColor}20; color: ${statusColor}; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600;">
                  <i class="fas ${driver.availabilityStatus === 'overtime' ? 'fa-clock' : driver.requiresApproval ? 'fa-exclamation-triangle' : 'fa-circle'}" style="font-size: 8px;"></i>
                  ${statusLabel}
                </span>
              </div>
              <div style="font-size: 11px; color: #6c757d; display: flex; gap: 12px; flex-wrap: wrap;">
                <span><i class="fas fa-id-card"></i> ${driver.drivingLicense || 'Permis non renseigné'}</span>
                <span><i class="fas fa-truck"></i> ${truckInfo}</span>
              </div>
              ${driver.totalHours ? `<div style="font-size: 10px; color: ${driver.totalHours > 12 ? '#e74a3b' : driver.totalHours > 8 ? '#f6c23e' : '#1cc88a'}; margin-top: 4px;">
                <i class="fas fa-clock"></i> ${driver.totalHours} heures travaillées
              </div>` : ''}
            </div>
          </div>
        `;
        
        driverList.appendChild(driverItem);
      });
    } else {
      driverList.innerHTML = `
        <div style="text-align: center; padding: 32px; color: #6c757d;">
          <i class="fas fa-user-tie" style="font-size: 32px; margin-bottom: 12px; display: block;"></i>
          <p style="margin: 0;">Aucun chauffeur assigné à cette entité</p>
        </div>
      `;
    }

    const footer = document.createElement('div');
    footer.style.padding = '12px 16px';
    footer.style.borderTop = '1px solid #e9ecef';
    footer.style.background = '#ffffff';
    footer.style.borderRadius = '0 0 12px 12px';
    footer.innerHTML = `
      <button id="center-entity-btn-${entity.id}" style="width: 100%; padding: 10px; background: ${entityColor}; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
        <i class="fas fa-crosshairs"></i> Centrer la carte sur ${entity.name}
      </button>
    `;

    popup.appendChild(header);
    popup.appendChild(stats);
    popup.appendChild(driverList);
    popup.appendChild(footer);

    setTimeout(() => {
      const centerBtn = document.getElementById(`center-entity-btn-${entity.id}`);
      if (centerBtn && this.driverMap) {
        centerBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (entity.latitude && entity.longitude) {
            this.driverMap?.setView([entity.latitude, entity.longitude], 12);
          }
        };
      }
    }, 100);

    return popup;
  }

  private processTrucksByEntity(): void {
    this.trucksByEntity = {};
    this.truckEntityStatistics = [];

    this.mappableEntities.forEach(entity => {
      if (entity.id) {
        this.trucksByEntity[entity.id] = [];
      }
    });

    this.trucksWithGeo.forEach(truck => {
      const truckEntities = (truck as any).geographicalEntities || [];

      truckEntities.forEach((item: any) => {
        const entityId = item.geographicalEntityId;
        if (entityId && this.trucksByEntity[entityId]) {
          this.trucksByEntity[entityId].push(truck);
        }
      });
    });

    this.mappableEntities.forEach(entity => {
      if (!entity.id) return;

      const entityTrucks = this.trucksByEntity[entity.id] || [];
      const level = this.geographicalLevels.find(l => l.id === entity.levelId);

      this.truckEntityStatistics.push({
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

    this.truckStats.activeEntities = this.truckEntityStatistics.filter(e => e.totalTrucks > 0).length;
  }

  private processDriversByEntity(): void {
    this.driversByEntity = {};
    this.driverEntityStatistics = [];

    this.mappableEntities.forEach(entity => {
      if (entity.id) {
        this.driversByEntity[entity.id] = [];
      }
    });

    this.driversWithGeo.forEach(driver => {
      const driverEntities = (driver as any).geographicalEntities || [];

      driverEntities.forEach((item: any) => {
        const entityId = item.geographicalEntityId;
        if (entityId && this.driversByEntity[entityId]) {
          this.driversByEntity[entityId].push(driver);
        }
      });
    });

    this.mappableEntities.forEach(entity => {
      if (!entity.id) return;

      const entityDrivers = this.driversByEntity[entity.id] || [];
      const level = this.geographicalLevels.find(l => l.id === entity.levelId);

      this.driverEntityStatistics.push({
        entityId: entity.id,
        entityName: entity.name,
        levelName: level?.name || 'Niveau inconnu',
        levelNumber: level?.levelNumber || 0,
        totalDrivers: entityDrivers.length,
        availableDrivers: entityDrivers.filter(d =>
          d.status?.toLowerCase() === 'disponible' ||
          d.status?.toLowerCase() === 'available' ||
          d.availabilityStatus === 'available'
        ).length,
        onMissionDrivers: entityDrivers.filter(d =>
          d.status?.toLowerCase() === 'on_trip' ||
          d.status?.toLowerCase() === 'en mission'
        ).length,
        overtimeDrivers: entityDrivers.filter(d =>
          d.availabilityStatus === 'overtime' ||
          (d.totalHours && d.totalHours > 8)
        ).length,
        exceededDrivers: entityDrivers.filter(d =>
          d.availabilityStatus === 'exceeded' ||
          (d.totalHours && d.totalHours > 12)
        ).length,
        conflictDrivers: entityDrivers.filter(d =>
          d.availabilityStatus === 'conflict' ||
          d.requiresApproval === true
        ).length,
        offDutyDrivers: entityDrivers.filter(d =>
          d.status === 'off_duty' ||
          d.status === 'hors service'
        ).length
      });
    });

    this.driverStats.activeEntities = this.driverEntityStatistics.filter(e => e.totalDrivers > 0).length;
  }

  private updateTruckStats(): void {
    this.truckStats = {
      total: this.trucksWithGeo.length,
      available: this.trucksWithGeo.filter(t =>
        t.status.toLowerCase() === 'disponible' || t.status.toLowerCase() === 'available'
      ).length,
      onMission: this.trucksWithGeo.filter(t =>
        t.status.toLowerCase() === 'en mission' || t.status.toLowerCase() === 'on_mission'
      ).length,
      maintenance: this.trucksWithGeo.filter(t =>
        t.status.toLowerCase() === 'maintenance'
      ).length,
      outOfService: this.trucksWithGeo.filter(t =>
        t.status.toLowerCase() === 'hors service' || t.status.toLowerCase() === 'inactive'
      ).length,
      activeEntities: this.truckStats.activeEntities
    };
  }

  private updateDriverStats(): void {
    this.driverStats = {
      total: this.driversWithGeo.length,
      available: this.driversWithGeo.filter(d =>
        d.status?.toLowerCase() === 'disponible' ||
        d.status?.toLowerCase() === 'available' ||
        d.availabilityStatus === 'available'
      ).length,
      onMission: this.driversWithGeo.filter(d =>
        d.status?.toLowerCase() === 'on_trip' ||
        d.status?.toLowerCase() === 'en mission'
      ).length,
      overtime: this.driversWithGeo.filter(d =>
        d.availabilityStatus === 'overtime' || (d.totalHours && d.totalHours > 8)
      ).length,
      exceeded: this.driversWithGeo.filter(d =>
        d.availabilityStatus === 'exceeded' || (d.totalHours && d.totalHours > 12)
      ).length,
      conflict: this.driversWithGeo.filter(d =>
        d.availabilityStatus === 'conflict' || d.requiresApproval === true
      ).length,
      offDuty: this.driversWithGeo.filter(d =>
        d.status === 'off_duty' || d.status === 'hors service'
      ).length,
      activeEntities: this.driverStats.activeEntities
    };
  }

  private initializeHierarchy(): void {
    this.entitiesByParentMap.clear();
    
    this.geographicalEntities.forEach(entity => {
      const parentId = entity.parentId || 0;
      if (!this.entitiesByParentMap.has(parentId)) {
        this.entitiesByParentMap.set(parentId, []);
      }
      this.entitiesByParentMap.get(parentId)!.push(entity);
    });
    
    this.entitiesByParentMap.forEach(entities => {
      entities.sort((a, b) => a.name.localeCompare(b.name));
    });
    
    this.rootEntitiesList = this.entitiesByParentMap.get(0) || [];
  }

  getTruckEntitiesForLevel(levelId: number, parentId: number | null): IGeographicalEntity[] {
    let entities: IGeographicalEntity[] = [];
    
    if (parentId === null) {
      entities = this.geographicalEntities.filter(e => 
        e.levelId === levelId && 
        (!e.parentId || e.parentId === 0)
      );
    } else {
      entities = this.geographicalEntities.filter(e => 
        e.levelId === levelId && 
        e.parentId === parentId
      );
    }
    
    return entities.sort((a, b) => a.name.localeCompare(b.name));
  }

  getDriverEntitiesForLevel(levelId: number, parentId: number | null): IGeographicalEntity[] {
    let entities: IGeographicalEntity[] = [];
    
    if (parentId === null) {
      entities = this.geographicalEntities.filter(e => 
        e.levelId === levelId && 
        (!e.parentId || e.parentId === 0)
      );
    } else {
      entities = this.geographicalEntities.filter(e => 
        e.levelId === levelId && 
        e.parentId === parentId
      );
    }
    
    return entities.sort((a, b) => a.name.localeCompare(b.name));
  }

  onTruckLevelChange(levelIndex: number, event: any): void {
    const selectedId = event.target.value === 'null' ? null : Number(event.target.value);
    this.truckSelectedLevelIds[levelIndex] = selectedId;
    
    for (let i = levelIndex + 1; i < this.truckSelectedLevelIds.length; i++) {
      this.truckSelectedLevelIds[i] = null;
    }
    
    if (this.truckMap) {
      this.addTruckEntityMarkers();
      this.addTruckMarkers();
    }
  }

  onDriverLevelChange(levelIndex: number, event: any): void {
    const selectedId = event.target.value === 'null' ? null : Number(event.target.value);
    this.driverSelectedLevelIds[levelIndex] = selectedId;
    
    for (let i = levelIndex + 1; i < this.driverSelectedLevelIds.length; i++) {
      this.driverSelectedLevelIds[i] = null;
    }
    
    if (this.driverMap) {
      this.addDriverEntityMarkers();
      this.addDriverMarkers();
    }
  }

  clearTruckFilters(): void {
    this.truckSelectedLevelIds = this.truckSelectedLevelIds.map(() => null);
    
    if (this.truckMap) {
      this.addTruckEntityMarkers();
      this.addTruckMarkers();
    }
  }

  clearDriverFilters(): void {
    this.driverSelectedLevelIds = this.driverSelectedLevelIds.map(() => null);
    
    if (this.driverMap) {
      this.addDriverEntityMarkers();
      this.addDriverMarkers();
    }
  }

  hasTruckActiveFilters(): boolean {
    return this.truckSelectedLevelIds.some(id => id !== null && id !== undefined);
  }

  hasDriverActiveFilters(): boolean {
    return this.driverSelectedLevelIds.some(id => id !== null && id !== undefined);
  }

  getTruckActiveFiltersCount(): number {
    return this.truckSelectedLevelIds.filter(id => id !== null && id !== undefined).length;
  }

  getDriverActiveFiltersCount(): number {
    return this.driverSelectedLevelIds.filter(id => id !== null && id !== undefined).length;
  }

  getTruckActiveFiltersList(): { levelIndex: number; levelName: string; entityName: string }[] {
    const activeFilters: { levelIndex: number; levelName: string; entityName: string }[] = [];
    
    this.truckSelectedLevelIds.forEach((entityId, index) => {
      if (entityId !== null && entityId !== undefined) {
        const level = this.geographicalLevels[index];
        const entity = this.geographicalEntities.find(e => e.id === entityId);
        if (level && entity) {
          activeFilters.push({
            levelIndex: index,
            levelName: level.name,
            entityName: entity.name
          });
        }
      }
    });
    
    return activeFilters;
  }

  getDriverActiveFiltersList(): { levelIndex: number; levelName: string; entityName: string }[] {
    const activeFilters: { levelIndex: number; levelName: string; entityName: string }[] = [];
    
    this.driverSelectedLevelIds.forEach((entityId, index) => {
      if (entityId !== null && entityId !== undefined) {
        const level = this.geographicalLevels[index];
        const entity = this.geographicalEntities.find(e => e.id === entityId);
        if (level && entity) {
          activeFilters.push({
            levelIndex: index,
            levelName: level.name,
            entityName: entity.name
          });
        }
      }
    });
    
    return activeFilters;
  }

  removeTruckFilter(levelIndex: number): void {
    this.truckSelectedLevelIds[levelIndex] = null;
    
    for (let i = levelIndex + 1; i < this.truckSelectedLevelIds.length; i++) {
      this.truckSelectedLevelIds[i] = null;
    }
    
    if (this.truckMap) {
      this.addTruckEntityMarkers();
      this.addTruckMarkers();
    }
  }

  removeDriverFilter(levelIndex: number): void {
    this.driverSelectedLevelIds[levelIndex] = null;
    
    for (let i = levelIndex + 1; i < this.driverSelectedLevelIds.length; i++) {
      this.driverSelectedLevelIds[i] = null;
    }
    
    if (this.driverMap) {
      this.addDriverEntityMarkers();
      this.addDriverMarkers();
    }
  }

  getRootEntitiesForView(): IGeographicalEntity[] {
    return [...this.rootEntitiesList];
  }

  getChildrenEntitiesForView(parentId: number): IGeographicalEntity[] {
    return this.entitiesByParentMap.get(parentId) || [];
  }

  hasChildrenEntities(entityId: number): boolean {
    const children = this.entitiesByParentMap.get(entityId) || [];
    return children.length > 0;
  }

  toggleBranchExpanded(entityId: number): void {
    if (this.expandedBranches.has(entityId)) {
      this.expandedBranches.delete(entityId);
    } else {
      this.expandedBranches.add(entityId);
    }
  }

  isBranchExpanded(entityId: number): boolean {
    return this.expandedBranches.has(entityId);
  }

  toggleChildExpanded(entityId: number): void {
    if (this.expandedChildren.has(entityId)) {
      this.expandedChildren.delete(entityId);
    } else {
      this.expandedChildren.add(entityId);
    }
  }

  isChildExpanded(entityId: number): boolean {
    return this.expandedChildren.has(entityId);
  }

  getEntityTotalCount(entityId: number, viewType: 'trucks' | 'drivers'): number {
    if (viewType === 'trucks') {
      return this.getTruckEntityStats(entityId).totalTrucks;
    } else {
      return this.getDriverEntityStats(entityId).totalDrivers;
    }
  }

  getEntityActiveCount(entityId: number, viewType: 'trucks' | 'drivers'): number {
    if (viewType === 'trucks') {
      const stats = this.getTruckEntityStats(entityId);
      return stats.availableTrucks + stats.onMissionTrucks;
    } else {
      const stats = this.getDriverEntityStats(entityId);
      return stats.availableDrivers + stats.onMissionDrivers;
    }
  }

  getEntityColorForView(entity: IGeographicalEntity): string {
    if (this.activeEntityView === 'trucks') {
      return this.getTruckEntityColor(entity.id!);
    } else {
      return this.getDriverEntityColor(entity.id!);
    }
  }

  getLevelName(levelId: number): string {
    const level = this.geographicalLevels.find(l => l.id === levelId);
    return level ? level.name : 'Niveau inconnu';
  }

  getTruckEntityStats(entityId: number) {
    return this.truckEntityStatistics.find(e => e.entityId === entityId) || {
      totalTrucks: 0, availableTrucks: 0, onMissionTrucks: 0, maintenanceTrucks: 0, outOfServiceTrucks: 0
    };
  }

  getDriverEntityStats(entityId: number) {
    return this.driverEntityStatistics.find(e => e.entityId === entityId) || {
      totalDrivers: 0, availableDrivers: 0, onMissionDrivers: 0, overtimeDrivers: 0, exceededDrivers: 0, conflictDrivers: 0, offDutyDrivers: 0
    };
  }

  getTruckEntityColor(entityId: number): string {
    const stats = this.getTruckEntityStats(entityId);
    if (stats.totalTrucks === 0) return '#6c757d';
    const activeRatio = stats.onMissionTrucks / stats.totalTrucks;
    if (activeRatio > 0.5) return '#1cc88a';
    if (activeRatio > 0.2) return '#4e73df';
    if (activeRatio > 0) return '#f6c23e';
    return '#e74a3b';
  }

  getDriverEntityColor(entityId: number): string {
    const stats = this.getDriverEntityStats(entityId);
    if (stats.totalDrivers === 0) return '#6c757d';
    const availableRatio = stats.availableDrivers / stats.totalDrivers;
    if (availableRatio > 0.5) return '#1cc88a';
    if (availableRatio > 0.2) return '#4e73df';
    if (availableRatio > 0) return '#f6c23e';
    return '#e74a3b';
  }

  getTruckEntityUtilizationPercentage(entityId: number): number {
    const stats = this.getTruckEntityStats(entityId);
    if (stats.totalTrucks === 0) return 0;
    return Math.round((stats.onMissionTrucks / stats.totalTrucks) * 100);
  }

  getDriverEntityUtilizationPercentage(entityId: number): number {
    const stats = this.getDriverEntityStats(entityId);
    if (stats.totalDrivers === 0) return 0;
    return Math.round((stats.onMissionDrivers / stats.totalDrivers) * 100);
  }

  getEntityName(entityId: number): string {
    const entity = this.geographicalEntities.find(e => e.id === entityId);
    return entity ? entity.name : 'Inconnu';
  }

  getEntityLevelName(entityId: number): string {
    const entity = this.geographicalEntities.find(e => e.id === entityId);
    if (!entity) return '';
    const level = this.geographicalLevels.find(l => l.id === entity.levelId);
    return level ? level.name : '';
  }

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
            this.addDriverEntityMarkers();
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

private addTruckEntityMarkers(): void {
  if (!this.truckMap) return;

  this.truckEntityMarkers.forEach(marker => marker.remove());
  this.truckEntityMarkers = [];

  let entitiesToShow: IGeographicalEntity[] = [];
  
  // Vérifier si des filtres sont actifs
  const hasActiveFilters = this.hasTruckActiveFilters();
  
  if (hasActiveFilters) {
    // Si des filtres sont actifs, montrer toutes les entités qui correspondent
    entitiesToShow = [...this.mappableEntities];
    
    for (let i = 0; i < this.truckSelectedLevelIds.length; i++) {
      const filterId = this.truckSelectedLevelIds[i];
      if (filterId !== null) {
        const filteredEntity = this.geographicalEntities.find(e => e.id === filterId);
        if (filteredEntity) {
          entitiesToShow = entitiesToShow.filter(e => 
            this.isDescendantOf(e, filteredEntity) || e.id === filterId
          );
        }
      }
    }
  } else {
    // Si aucun filtre, montrer UNIQUEMENT les entités racines (sans parent)
    entitiesToShow = this.mappableEntities.filter(e => !e.parentId || e.parentId === 0);
  }

  console.log('Truck entities to show:', entitiesToShow.length);
  console.log('Has active filters:', hasActiveFilters);

  entitiesToShow.forEach(entity => {
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

    const entityIcon = L.divIcon({
      html: `
        <div class="entity-marker-icon" style="background: ${entityColor};">
          <i class="fas fa-truck"></i>
          <span class="marker-label">${entity.name.substring(0, 3)}</span>
          ${totalTrucks > 0 ? `<span class="marker-count">${totalTrucks}</span>` : ''}
        </div>
      `,
      className: 'entity-marker',
      iconSize: totalTrucks > 0 ? [50, 50] : [36, 36],
      iconAnchor: totalTrucks > 0 ? [25, 25] : [18, 18],
      popupAnchor: [0, -25]
    });

    const marker = L.marker([entity.latitude, entity.longitude], {
      icon: entityIcon,
      zIndexOffset: totalTrucks > 0 ? 1000 : 500
    }).addTo(this.truckMap!);

    const popupContent = this.createTruckEntityPopup(entity, entityTrucks, entityColor, level?.name || '');
    marker.bindPopup(popupContent);

    this.truckEntityMarkers.push(marker);
  });
}

private addDriverEntityMarkers(): void {
  if (!this.driverMap) return;

  this.driverEntityMarkers.forEach(marker => marker.remove());
  this.driverEntityMarkers = [];

  let entitiesToShow: IGeographicalEntity[] = [];
  
  const hasActiveFilters = this.hasDriverActiveFilters();
  
  if (hasActiveFilters) {
    entitiesToShow = [...this.mappableEntities];
    
    for (let i = 0; i < this.driverSelectedLevelIds.length; i++) {
      const filterId = this.driverSelectedLevelIds[i];
      if (filterId !== null) {
        const filteredEntity = this.geographicalEntities.find(e => e.id === filterId);
        if (filteredEntity) {
          entitiesToShow = entitiesToShow.filter(e => 
            this.isDescendantOf(e, filteredEntity) || e.id === filterId
          );
        }
      }
    }
  } else {
    // Si aucun filtre, montrer UNIQUEMENT les entités racines
    entitiesToShow = this.mappableEntities.filter(e => !e.parentId || e.parentId === 0);
  }

  console.log('Driver entities to show:', entitiesToShow.length);
  console.log('Has active filters:', hasActiveFilters);

  entitiesToShow.forEach(entity => {
    if (!entity.id || !entity.latitude || !entity.longitude) return;

    const entityDrivers = this.driversByEntity[entity.id] || [];
    const totalDrivers = entityDrivers.length;
    const level = this.geographicalLevels.find(l => l.id === entity.levelId);

    let entityColor = '#6c757d';
    if (totalDrivers > 0) {
      const activeDrivers = entityDrivers.filter(d =>
        d.status?.toLowerCase() === 'disponible' ||
        d.status?.toLowerCase() === 'available' ||
        d.availabilityStatus === 'available'
      ).length;
      if (activeDrivers > 3) entityColor = '#1cc88a';
      else if (activeDrivers > 1) entityColor = '#4e73df';
      else if (activeDrivers > 0) entityColor = '#f6c23e';
      else entityColor = '#e74a3b';
    }

    const entityIcon = L.divIcon({
      html: `
        <div class="entity-marker-icon" style="background: ${entityColor};">
          <i class="fas fa-user-tie"></i>
          <span class="marker-label">${entity.name.substring(0, 3)}</span>
          ${totalDrivers > 0 ? `<span class="marker-count">${totalDrivers}</span>` : ''}
        </div>
      `,
      className: 'entity-marker',
      iconSize: totalDrivers > 0 ? [50, 50] : [36, 36],
      iconAnchor: totalDrivers > 0 ? [25, 25] : [18, 18],
      popupAnchor: [0, -25]
    });

    const marker = L.marker([entity.latitude, entity.longitude], {
      icon: entityIcon,
      zIndexOffset: totalDrivers > 0 ? 1000 : 500
    }).addTo(this.driverMap!);

    const popupContent = this.createDriverEntityPopup(entity, entityDrivers, entityColor, level?.name || '');
    marker.bindPopup(popupContent);

    this.driverEntityMarkers.push(marker);
  });
}
private addTruckMarkers(): void {
  if (!this.truckMap) return;

  this.truckMarkers.forEach(marker => marker.remove());
  this.truckMarkers = [];

  // NE PAS afficher les camions individuels si aucun filtre n'est actif
  const hasActiveFilters = this.hasTruckActiveFilters();
  
  if (!hasActiveFilters) {
    console.log('No active filters - hiding individual truck markers');
    return;
  }

  let filteredTrucks = [...this.trucksWithGeo];
  
  for (let i = 0; i < this.truckSelectedLevelIds.length; i++) {
    const filterId = this.truckSelectedLevelIds[i];
    if (filterId !== null) {
      const filteredEntity = this.geographicalEntities.find(e => e.id === filterId);
      if (filteredEntity) {
        filteredTrucks = filteredTrucks.filter(truck => {
          const truckEntityId = this.getTruckEntityId(truck);
          if (!truckEntityId) return false;
          
          const truckEntity = this.geographicalEntities.find(e => e.id === truckEntityId);
          if (!truckEntity) return false;
          
          return this.isDescendantOf(truckEntity, filteredEntity);
        });
      }
    }
  }

  const trucksToShow = filteredTrucks.filter(t => t.entityCoordinates);
  
  console.log('Trucks to display on map (with filters):', trucksToShow.length);

  trucksToShow.forEach(truck => {
    if (!truck.entityCoordinates) return;

    const coords = truck.entityCoordinates;
    const truckColor = truck.color || this.getStatusColor(truck.status);
    const finalColor = (truck.color && truck.color !== '#000000') ? truck.color : truckColor;
    const marqueName = this.getMarqueName(truck.marqueTruckId);
    const statusLabel = STATUS_CONFIG[truck.status]?.label || truck.status;
    const statusColor = this.getStatusBadgeColor(truck.status);
    const statusIcon = this.getStatusIcon(truck.status);

    const truckIcon = L.divIcon({
      html: `
        <div class="truck-marker-wrapper" style="position: relative; cursor: pointer;">
          <div class="truck-icon" style="
            background: ${finalColor};
            width: 45px;
            height: 45px;
            border-radius: 10px;
            border: 3px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
            position: relative;
          ">
            <i class="fas fa-truck" style="font-size: 20px;"></i>
            <span style="font-size: 8px; margin-top: 2px;">${truck.typeTruck?.capacity || '?'}t</span>
          </div>
          <div class="truck-label" style="
            position: absolute;
            bottom: -22px;
            left: 50%;
            transform: translateX(-50%);
            background: ${finalColor};
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 9px;
            font-weight: bold;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            border: 1px solid rgba(255,255,255,0.3);
          ">
            ${truck.immatriculation}
          </div>
          <div class="truck-status-badge" style="
            position: absolute;
            top: -8px;
            right: -8px;
            background: ${statusColor};
            border-radius: 50%;
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          ">
            <i class="fas ${statusIcon}" style="font-size: 8px;"></i>
          </div>
        </div>
      `,
      className: 'custom-truck-marker',
      iconSize: [45, 67],
      iconAnchor: [22, 45],
      popupAnchor: [0, -45]
    });

    const marker = L.marker([coords.lat, coords.lng], {
      icon: truckIcon,
      zIndexOffset: 2000
    }).addTo(this.truckMap!);

    const popupContent = `
      <div style="font-family: 'Segoe UI', sans-serif; min-width: 260px;">
        <div style="background: ${finalColor}; padding: 12px; color: white; border-radius: 8px 8px 0 0;">
          <h3 style="margin: 0; font-size: 16px;">${truck.immatriculation}</h3>
          <div style="font-size: 11px; margin-top: 4px; opacity: 0.9;">
            <i class="fas fa-industry"></i> ${marqueName} • ${truck.typeTruck?.capacity || '?'} tonnes
          </div>
        </div>
        <div style="padding: 12px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span><strong>Statut:</strong></span>
            <span style="color: ${statusColor};">${statusLabel}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span><strong>Entité:</strong></span>
            <span>${truck.entityName || 'Non assigné'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span><strong>Couleur:</strong></span>
            <span><span style="display: inline-block; width: 16px; height: 16px; background: ${finalColor}; border-radius: 4px; vertical-align: middle;"></span> ${finalColor}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span><strong>ID:</strong></span>
            <span>#${truck.id}</span>
          </div>
        </div>
      </div>
    `;

    marker.bindPopup(popupContent);
    marker.bindTooltip(`${truck.immatriculation} - ${statusLabel}`, {
      permanent: false,
      direction: 'top',
      offset: [0, -50],
      className: 'truck-tooltip'
    });

    this.truckMarkers.push(marker);
  });
}

private addDriverMarkers(): void {
  if (!this.driverMap) return;

  this.driverMarkers.forEach(marker => marker.remove());
  this.driverMarkers = [];

  // NE PAS afficher les chauffeurs individuels si aucun filtre n'est actif
  const hasActiveFilters = this.hasDriverActiveFilters();
  
  if (!hasActiveFilters) {
    console.log('No active filters - hiding individual driver markers');
    return;
  }

  let filteredDrivers = [...this.driversWithGeo];
  
  for (let i = 0; i < this.driverSelectedLevelIds.length; i++) {
    const filterId = this.driverSelectedLevelIds[i];
    if (filterId !== null) {
      const filteredEntity = this.geographicalEntities.find(e => e.id === filterId);
      if (filteredEntity) {
        filteredDrivers = filteredDrivers.filter(driver => {
          const driverEntityId = this.getDriverEntityId(driver);
          if (!driverEntityId) return false;
          
          const driverEntity = this.geographicalEntities.find(e => e.id === driverEntityId);
          if (!driverEntity) return false;
          
          return this.isDescendantOf(driverEntity, filteredEntity);
        });
      }
    }
  }

  const driversToShow = filteredDrivers.filter(d => d.entityCoordinates);
  
  console.log('Drivers to display on map (with filters):', driversToShow.length);

  driversToShow.forEach(driver => {
    if (!driver.entityCoordinates) return;

    const coords = driver.entityCoordinates;
    const driverColor = this.getDriverStatusColor(driver);
    const statusLabel = this.getDriverStatusLabel(driver);

    const driverIcon = L.divIcon({
      html: `
        <div class="driver-marker-wrapper" style="position: relative; cursor: pointer;">
          <div style="
            background: ${driverColor};
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
          ">
            <i class="fas fa-user-tie" style="font-size: 18px;"></i>
          </div>
          <div style="
            position: absolute;
            bottom: -18px;
            left: 50%;
            transform: translateX(-50%);
            background: ${driverColor};
            color: white;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 8px;
            font-weight: bold;
            white-space: nowrap;
          ">
            ${driver.name?.substring(0, 12)}${driver.name?.length > 12 ? '...' : ''}
          </div>
        </div>
      `,
      className: 'custom-driver-marker',
      iconSize: [40, 58],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40]
    });

    const marker = L.marker([coords.lat, coords.lng], {
      icon: driverIcon,
      zIndexOffset: 2000
    }).addTo(this.driverMap!);

    const popupContent = `
      <div style="font-family: 'Segoe UI', sans-serif; min-width: 240px;">
        <div style="background: ${driverColor}; padding: 10px; color: white; border-radius: 8px 8px 0 0;">
          <strong>${driver.name}</strong><br>
          <small>${driver.drivingLicense || 'Permis non renseigné'}</small>
        </div>
        <div style="padding: 10px;">
          <div><strong>Statut:</strong> ${statusLabel}</div>
          <div><strong>Entité:</strong> ${driver.entityName || 'Non assigné'}</div>
          <div><strong>Téléphone:</strong> ${driver.phoneCountry || driver.phoneNumber || 'Non renseigné'}</div>
        </div>
      </div>
    `;

    marker.bindPopup(popupContent);
    this.driverMarkers.push(marker);
  });
}

  private getStatusBadgeColor(status: string): string {
    const statusLower = status.toLowerCase();
    switch(statusLower) {
      case 'disponible':
      case 'available':
        return '#1cc88a';
      case 'en mission':
      case 'on_mission':
        return '#4e73df';
      case 'maintenance':
        return '#f6c23e';
      case 'hors service':
      case 'inactive':
        return '#e74a3b';
      default:
        return '#6c757d';
    }
  }

  private getStatusIcon(status: string): string {
    const statusLower = status.toLowerCase();
    switch(statusLower) {
      case 'disponible':
      case 'available':
        return 'fa-check-circle';
      case 'en mission':
      case 'on_mission':
        return 'fa-truck';
      case 'maintenance':
        return 'fa-tools';
      case 'hors service':
      case 'inactive':
        return 'fa-exclamation-circle';
      default:
        return 'fa-question-circle';
    }
  }

  private getDriverStatusColor(driver: IDriver): string {
    if (driver.availabilityStatus === 'overtime' || (driver.totalHours && driver.totalHours > 8)) {
      return '#f6c23e';
    }
    if (driver.availabilityStatus === 'conflict' || driver.requiresApproval) {
      return '#e74a3b';
    }
    if (driver.status?.toLowerCase() === 'available' || driver.status?.toLowerCase() === 'disponible') {
      return '#1cc88a';
    }
    if (driver.status?.toLowerCase() === 'on_trip' || driver.status?.toLowerCase() === 'en mission') {
      return '#4e73df';
    }
    return '#858796';
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

  getStatusColor(status: string): string {
    return STATUS_CONFIG[status]?.color || '#6c757d';
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  centerMap(mapType: 'truck' | 'driver'): void {
    if (mapType === 'truck' && this.truckMap) {
      this.truckMap.setView(this.tunisiaCenter, 7);
      this.activeTruckRegionFilter = 'all';
    }
    if (mapType === 'driver' && this.driverMap) {
      this.driverMap.setView(this.tunisiaCenter, 7);
      this.activeDriverRegionFilter = 'all';
    }
    this.activeEntityName = 'all';
  }

  refreshMap(mapType: 'truck' | 'driver'): void {
    if (mapType === 'truck' && this.truckMap) {
      this.addTruckEntityMarkers();
      this.addTruckMarkers();
      this.truckMap.invalidateSize();
    }
    if (mapType === 'driver' && this.driverMap) {
      this.addDriverEntityMarkers();
      this.addDriverMarkers();
      this.driverMap.invalidateSize();
    }
    this.updateLastUpdateTime();
    this.successMessage = `Carte actualisée`;
    setTimeout(() => this.successMessage = '', 3000);
  }

  focusOnRegion(region: string, mapType: 'truck' | 'driver'): void {
    const level = this.geographicalLevels.find(l => l.name === region);
    if (!level) return;

    const entities = this.mappableEntities.filter(e => e.levelId === level.id && e.latitude && e.longitude);
    if (entities.length === 0) return;

    const bounds = L.latLngBounds(entities.map(e => [e.latitude!, e.longitude!] as L.LatLngTuple));

    if (mapType === 'truck' && this.truckMap) {
      this.truckMap.fitBounds(bounds);
      this.activeTruckRegionFilter = region;
    }
    if (mapType === 'driver' && this.driverMap) {
      this.driverMap.fitBounds(bounds);
      this.activeDriverRegionFilter = region;
    }
    this.activeEntityName = 'all';
  }

  focusOnEntity(entityId: number, viewType: 'trucks' | 'drivers'): void {
    const entity = this.geographicalEntities.find(e => e.id === entityId);
    if (!entity || !entity.latitude || !entity.longitude) return;

    this.activeEntityName = entity.name;

    if (viewType === 'trucks' && this.truckMap) {
      this.truckMap.setView([entity.latitude, entity.longitude], 12);
      const marker = this.truckEntityMarkers.find(m => {
        const latLng = m.getLatLng();
        return latLng.lat === entity.latitude && latLng.lng === entity.longitude;
      });
      if (marker) marker.openPopup();
    }

    if (viewType === 'drivers' && this.driverMap) {
      this.driverMap.setView([entity.latitude, entity.longitude], 12);
      const marker = this.driverEntityMarkers.find(m => {
        const latLng = m.getLatLng();
        return latLng.lat === entity.latitude && latLng.lng === entity.longitude;
      });
      if (marker) marker.openPopup();
    }
  }

  filterByEntity(entityId: number, viewType: 'trucks' | 'drivers'): void {
    this.activeEntityName = this.getEntityName(entityId);
    this.successMessage = `Filtre appliqué: ${this.getEntityName(entityId)}`;
    setTimeout(() => this.successMessage = '', 3000);
  }

  switchEntityView(view: 'trucks' | 'drivers'): void {
    this.activeEntityView = view;
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