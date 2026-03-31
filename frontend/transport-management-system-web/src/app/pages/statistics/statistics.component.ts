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

  // Propriétés pour l'affichage hiérarchique
  selectedLevelIds: (number | null)[] = [];
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

  // ========== MÉTHODES D'INITIALISATION ==========

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
      console.warn('⚠️ Erreur configuration icônes:', error);
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

  // ========== CHARGEMENT DES DONNÉES ==========

  private loadGeographicalData(): void {
    this.loadingGeographical = true;

    const levelsSub = this.httpService.getGeographicalLevels().subscribe({
      next: (levels) => {
        this.geographicalLevels = levels.filter(l => l.isActive);
        this.selectedLevelIds = new Array(this.geographicalLevels.length).fill(null);

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
      // S'assurer que chaque camion a une couleur
      this.trucks = trucks.map(truck => {
        if (!truck.color || truck.color === '#000000') {
          // Assigner une couleur par défaut basée sur le statut
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
      const truckEntities = (truck as any).geographicalEntities || [];

      const firstEntity = truckEntities.length > 0 ?
        this.geographicalEntities.find(e => e.id === truckEntities[0]?.geographicalEntityId) :
        undefined;

      return {
        ...truck,
        geographicalEntity: firstEntity,
        entityName: firstEntity?.name || 'Non assigné',
        entityCoordinates: firstEntity?.latitude && firstEntity?.longitude ?
          { lat: firstEntity.latitude, lng: firstEntity.longitude } : undefined
      };
    });
  }

  private enrichDriversWithGeographicalData(): void {
    this.driversWithGeo = this.drivers.map(driver => {
      const driverEntities = (driver as any).geographicalEntities || [];

      const firstEntity = driverEntities.length > 0 ?
        this.geographicalEntities.find(e => e.id === driverEntities[0]?.geographicalEntityId) :
        undefined;

      return {
        ...driver,
        geographicalEntity: firstEntity,
        entityName: firstEntity?.name || 'Non assigné',
        entityCoordinates: firstEntity?.latitude && firstEntity?.longitude ?
          { lat: firstEntity.latitude, lng: firstEntity.longitude } : undefined,
        imageBase64: driver.imageBase64 || null
      };
    });
  }

  // ========== TRAITEMENT DES DONNÉES PAR ENTITÉ ==========

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

  // ========== MÉTHODES HIÉRARCHIQUES ==========

  initializeHierarchy(): void {
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

  getEntitiesForLevel(levelId: number, parentId: number | null): IGeographicalEntity[] {
    let entities: IGeographicalEntity[] = [];
    
    if (parentId === null) {
      entities = this.rootEntitiesList.filter(e => e.levelId === levelId);
    } else {
      const parent = this.geographicalEntities.find(e => e.id === parentId);
      if (parent) {
        entities = (this.entitiesByParentMap.get(parentId) || []).filter(e => e.levelId === levelId);
      }
    }
    
    return entities;
  }

  onLevelChange(levelIndex: number, event: any): void {
    const selectedId = event.target.value === 'null' ? null : Number(event.target.value);
    this.selectedLevelIds[levelIndex] = selectedId;
    
    // NE PAS réinitialiser automatiquement les niveaux suivants
    // L'utilisateur peut filtrer uniquement par niveau 2 sans niveau 1
  }

  getRootEntitiesForView(): IGeographicalEntity[] {
    let roots = [...this.rootEntitiesList];
    
    // Si un filtre est actif sur le niveau 1, l'appliquer
    if (this.selectedLevelIds[0] !== null && this.selectedLevelIds[0] !== undefined) {
      roots = roots.filter(e => e.id === this.selectedLevelIds[0]);
    }
    
    return roots;
  }

  getChildrenEntitiesForView(parentId: number): IGeographicalEntity[] {
    let children = this.entitiesByParentMap.get(parentId) || [];
    
    const parent = this.geographicalEntities.find(e => e.id === parentId);
    if (parent) {
      const parentLevelIndex = this.geographicalLevels.findIndex(l => l.id === parent.levelId);
      
      // Vérifier s'il y a un filtre sur le niveau suivant
      const nextLevelId = this.selectedLevelIds[parentLevelIndex + 1];
      
      if (nextLevelId !== null && nextLevelId !== undefined) {
        // Filtrer par l'entité spécifique du niveau suivant
        children = children.filter(e => e.id === nextLevelId);
      }
    }
    
    return children;
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

  getEntityCountForLevelAndParent(parentId: number, viewType: 'trucks' | 'drivers'): number {
    const children = this.entitiesByParentMap.get(parentId) || [];
    let total = 0;
    
    children.forEach(child => {
      total += this.getEntityTotalCount(child.id!, viewType);
    });
    
    return total;
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

  // ========== MÉTHODES DE FILTRAGE ==========

  hasActiveFilters(): boolean {
    return this.selectedLevelIds.some(id => id !== null && id !== undefined);
  }

  getActiveFiltersCount(): number {
    return this.selectedLevelIds.filter(id => id !== null && id !== undefined).length;
  }

  getActiveFiltersList(): { levelIndex: number; levelName: string; entityName: string }[] {
    const activeFilters: { levelIndex: number; levelName: string; entityName: string }[] = [];
    
    this.selectedLevelIds.forEach((entityId, index) => {
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

  removeFilter(levelIndex: number): void {
    this.selectedLevelIds[levelIndex] = null;
    
    // Réinitialiser également les niveaux inférieurs pour éviter l'incohérence
    for (let i = levelIndex + 1; i < this.selectedLevelIds.length; i++) {
      this.selectedLevelIds[i] = null;
    }
  }

  clearAllFilters(): void {
    this.selectedLevelIds = this.selectedLevelIds.map(() => null);
    this.expandedBranches.clear();
    this.expandedChildren.clear();
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

  // ========== MARQUEURS DES ENTITÉS (CAMIONS) ==========

  private addTruckEntityMarkers(): void {
    if (!this.truckMap) return;

    this.truckEntityMarkers.forEach(marker => marker.remove());
    this.truckEntityMarkers = [];

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
              this.filterByEntity(entity.id!, 'trucks');
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
          <i class="fas fa-truck" style="font-size: ${totalTrucks > 0 ? '20px' : '14px'}; margin-bottom: 2px;"></i>
          <span style="font-size: ${totalTrucks > 0 ? '12px' : '10px'};">${entity.name.substring(0, 3)}</span>
          ${totalTrucks > 0 ? `<span style="font-size: 10px; margin-top: -2px;">${totalTrucks}</span>` : ''}
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
          <i class="fas fa-truck" style="font-size: 18px; margin-bottom: 2px;"></i>
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

  // ========== MARQUEURS DES ENTITÉS (CHAUFFEURS) ==========

  private addDriverEntityMarkers(): void {
    if (!this.driverMap) return;

    this.driverEntityMarkers.forEach(marker => marker.remove());
    this.driverEntityMarkers = [];

    this.mappableEntities.forEach(entity => {
      if (!entity.id || !entity.latitude || !entity.longitude) return;

      const entityDrivers = this.driversByEntity[entity.id] || [];
      const totalDrivers = entityDrivers.length;
      const level = this.geographicalLevels.find(l => l.id === entity.levelId);

      let entityColor = '#6c757d';
      if (totalDrivers > 0) {
        const availableDrivers = entityDrivers.filter(d =>
          d.status?.toLowerCase() === 'disponible' ||
          d.status?.toLowerCase() === 'available' ||
          d.availabilityStatus === 'available'
        ).length;
        if (availableDrivers > 3) entityColor = '#1cc88a';
        else if (availableDrivers > 1) entityColor = '#4e73df';
        else if (availableDrivers > 0) entityColor = '#f6c23e';
        else entityColor = '#e74a3b';
      }

      const entityIcon = this.createDriverEntityIcon(entity, entityColor, totalDrivers, level?.name || '');

      const marker = L.marker([entity.latitude, entity.longitude], {
        icon: entityIcon,
        zIndexOffset: totalDrivers > 0 ? 1000 : 500
      }).addTo(this.driverMap!);

      marker.bindPopup(this.createDriverEntityPopup(entity, entityColor, entityDrivers, level?.name || ''));

      marker.on('popupopen', () => {
        setTimeout(() => {
          const btn = document.getElementById(`driver-filter-entity-btn-${entity.id}`);
          if (btn) {
            btn.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              this.filterByEntity(entity.id!, 'drivers');
              marker.closePopup();
            };
          }
        }, 100);
      });

      this.driverEntityMarkers.push(marker);
    });
  }

  private createDriverEntityIcon(entity: IGeographicalEntity, color: string, totalDrivers: number, levelName: string): L.DivIcon {
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
          transition: all 0.3s ease;
        ">
          <i class="fas fa-user-tie" style="font-size: ${totalDrivers > 0 ? '20px' : '14px'}; margin-bottom: 2px;"></i>
          <span style="font-size: ${totalDrivers > 0 ? '12px' : '10px'};">${entity.name.substring(0, 3)}</span>
          ${totalDrivers > 0 ? `<span style="font-size: 10px; margin-top: -2px;">${totalDrivers}</span>` : ''}
        </div>
      `,
      className: 'entity-marker',
      iconSize: totalDrivers > 0 ? [60, 60] : [36, 36],
      iconAnchor: totalDrivers > 0 ? [30, 30] : [18, 18],
      popupAnchor: [0, -30]
    });
  }

  private createDriverEntityPopup(entity: IGeographicalEntity, color: string, entityDrivers: IDriver[], levelName: string): HTMLDivElement {
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
    popup.style.padding = '15px';
    popup.style.minWidth = '280px';

    popup.innerHTML = `
      <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
        <div style="background: ${color}; width: 50px; height: 50px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; font-weight: bold;">
          <i class="fas fa-user-tie" style="font-size: 18px; margin-bottom: 2px;"></i>
          <span style="font-size: 12px;">${total}</span>
        </div>
        <div>
          <div style="color: #2c3e50; font-size: 18px; font-weight: 700;">${entity.name}</div>
          <div style="color: #6c757d; font-size: 13px;">${levelName} • ${total} chauffeurs</div>
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

        <button id="driver-filter-entity-btn-${entity.id}"
                style="width: 100%; margin-top: 15px; padding: 10px; background: linear-gradient(135deg, #36b9cc, #4e73df); color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
          <i class="fas fa-filter"></i> Voir les chauffeurs de ${entity.name}
        </button>
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
      const driverWithGeo = this.driversWithGeo.find(d => d.id === driver.id);
      if (!driverWithGeo?.entityCoordinates) return;

      const coords = driverWithGeo.entityCoordinates;

      const latOffset = (Math.random() - 0.5) * 0.02;
      const lngOffset = (Math.random() - 0.5) * 0.02;

      const driverColor = this.getDriverStatusColor(driver);
      const formattedImage = this.formatBase64Image(driver.imageBase64);

      const driverIcon = this.createDriverIcon(driver, driverColor, formattedImage);

      const marker = L.marker([
        coords.lat + latOffset,
        coords.lng + lngOffset
      ], {
        icon: driverIcon,
        zIndexOffset: 2000
      }).addTo(this.driverMap!);

      const statusLabel = this.getDriverStatusLabel(driver);
      const driverForPopup = {
        ...driver,
        zoneName: driverWithGeo.entityName
      };

      marker.bindPopup(this.createDriverPopup(driverForPopup, driverColor, statusLabel, formattedImage));

      this.driverMarkers.push(marker);
    });
  }

  private createDriverIcon(driver: IDriver, color: string, imageBase64: string | null): L.DivIcon {
    const hasImage = !!imageBase64;
    const hasConflict = driver.availabilityStatus === 'conflict' || driver.requiresApproval;
    const isOvertime = driver.availabilityStatus === 'overtime';

    let iconHtml = '';

    if (hasImage) {
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
          <img src="${imageBase64}"
               style="width: 100%; height: 100%; object-fit: cover;"
               alt="Chauffeur ${driver.name}"
               title="${driver.name}"
               onerror="this.style.display='none'; this.parentElement.style.background='${color}'; this.parentElement.innerHTML='<i class=\\'fas fa-user-tie\\' style=\\'color: white; font-size: 24px;\\'></i>';">
          ${hasConflict ? `
            <span style="position: absolute; top: -5px; right: -5px; background: #e74a3b; color: white; border-radius: 50%; width: 18px; height: 18px; font-size: 10px; display: flex; align-items: center; justify-content: center; border: 2px solid white;">
              !
            </span>
          ` : ''}
          ${isOvertime ? `
            <span style="position: absolute; bottom: -5px; right: -5px; background: #f6c23e; color: white; border-radius: 50%; width: 18px; height: 18px; font-size: 10px; display: flex; align-items: center; justify-content: center; border: 2px solid white;">
              <i class="fas fa-clock" style="font-size: 8px;"></i>
            </span>
          ` : ''}
        </div>
      `;
    } else {
      iconHtml = `
        <div style="
          background: ${color};
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 24px;
          position: relative;
        ">
          <i class="fas fa-user-tie"></i>
          ${hasConflict ? `
            <span style="position: absolute; top: -5px; right: -5px; background: #e74a3b; color: white; border-radius: 50%; width: 18px; height: 18px; font-size: 10px; display: flex; align-items: center; justify-content: center; border: 2px solid white;">
              !
            </span>
          ` : ''}
          ${isOvertime ? `
            <span style="position: absolute; bottom: -5px; right: -5px; background: #f6c23e; color: white; border-radius: 50%; width: 18px; height: 18px; font-size: 10px; display: flex; align-items: center; justify-content: center; border: 2px solid white;">
              <i class="fas fa-clock" style="font-size: 8px;"></i>
            </span>
          ` : ''}
        </div>
      `;
    }

    return L.divIcon({
      html: iconHtml,
      className: `driver-marker-${driver.status}`,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
      popupAnchor: [0, -24]
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
            ${driver.drivingLicense}
          </div>
          <div style="display: inline-block; padding: 4px 12px; background: ${color}20; border-radius: 20px; color: ${color}; font-weight: 600; font-size: 12px;">
            ${statusLabel}
          </div>
        </div>
      </div>

      <div style="border-top: 1px solid #e9ecef; padding-top: 12px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div>
            <span style="color: #6c757d; font-size: 11px; text-transform: uppercase; display: block; font-weight: 600;">ENTITÉ</span>
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

  // ========== MÉTHODES UTILITAIRES ==========

  private formatBase64Image(base64: string | null | undefined): string | null {
    if (!base64) return null;
    if (base64.startsWith('data:image/')) {
      return base64;
    }
    return `data:image/jpeg;base64,${base64}`;
  }

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
    this.successMessage = `Carte des ${mapType === 'truck' ? 'camions' : 'chauffeurs'} actualisée`;
    setTimeout(() => this.successMessage = '', 3000);
  }

  focusOnRegion(region: string, mapType: 'truck' | 'driver'): void {
    if (mapType === 'truck') {
      const level = this.geographicalLevels.find(l => l.name === region);
      if (!level || !this.truckMap) return;

      const entities = this.mappableEntities.filter(e => e.levelId === level.id && e.latitude && e.longitude);
      if (entities.length === 0) return;

      const bounds = L.latLngBounds(
        entities.map(e => [e.latitude!, e.longitude!] as L.LatLngTuple)
      );

      this.truckMap.fitBounds(bounds);
      this.activeTruckRegionFilter = region;
    } else {
      const level = this.geographicalLevels.find(l => l.name === region);
      if (!level || !this.driverMap) return;

      const entities = this.mappableEntities.filter(e => e.levelId === level.id && e.latitude && e.longitude);
      if (entities.length === 0) return;

      const bounds = L.latLngBounds(
        entities.map(e => [e.latitude!, e.longitude!] as L.LatLngTuple)
      );

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
      this.truckMap.setView([entity.latitude, entity.longitude], 10);
      this.highlightTruckEntity(entityId);
    }

    if (viewType === 'drivers' && this.driverMap) {
      this.driverMap.setView([entity.latitude, entity.longitude], 10);
      this.highlightDriverEntity(entityId);
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

  private highlightDriverEntity(entityId: number): void {
    if (!this.driverMap) return;

    const entityMarker = this.driverEntityMarkers.find(m => {
      const latLng = m.getLatLng();
      const entity = this.mappableEntities.find(e => e.latitude === latLng.lat && e.longitude === latLng.lng);
      return entity?.id === entityId;
    });

    if (entityMarker) {
      entityMarker.openPopup();
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

  clearError(): void {
    this.errorMessage = '';
  }

  clearSuccess(): void {
    this.successMessage = '';
  }

  toggleHelp(): void {
    this.showHelp = !this.showHelp;
  }

  // Ajoutez cette méthode améliorée pour créer l'icône du camion avec le nom et la couleur

private createTruckIcon(truck: ITruck, color: string, imageBase64: string | null): L.DivIcon {
  const hasImage = !!imageBase64;
  const isOnMission = truck.status.toLowerCase() === 'en mission' || truck.status.toLowerCase() === 'on_mission';
  const truckName = truck.immatriculation || `Camion ${truck.id}`;
  const shortName = truckName.length > 8 ? truckName.substring(0, 6) + '...' : truckName;
  
  // Récupérer la marque du camion
  const marqueName = this.getMarqueName(truck.marqueTruckId);
  const capacity = truck.typeTruck?.capacity || '?';
  
  // Déterminer la couleur de fond en fonction du statut
  let bgColor = color;
  let borderColor = '#ffffff';
  let animationClass = '';
  
  if (isOnMission) {
    animationClass = 'truck-mission-animation';
    borderColor = '#ffd700';
  }
  
  // Icône avec nom du camion et couleur
  let iconHtml = '';
  
  if (hasImage) {
    iconHtml = `
      <div class="truck-marker-wrapper ${animationClass}" style="
        position: relative;
        cursor: pointer;
      ">
        <div class="truck-image-container" style="
          width: 56px;
          height: 56px;
          border-radius: 12px;
          border: 3px solid ${borderColor};
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          overflow: hidden;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        ">
          <img src="${imageBase64}"
               style="width: 100%; height: 100%; object-fit: contain;"
               alt="${truckName}"
               title="${marqueName} - ${truckName}"
               onerror="this.style.display='none'; this.parentElement.style.background='${color}'; this.parentElement.innerHTML='<i class=\\'fas fa-truck\\' style=\\'color: white; font-size: 24px;\\'></i>';">
        </div>
        <div class="truck-label" style="
          position: absolute;
          bottom: -22px;
          left: 50%;
          transform: translateX(-50%);
          background: ${color};
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: bold;
          white-space: nowrap;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          text-shadow: 0 1px 1px rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.3);
          font-family: 'Segoe UI', sans-serif;
          z-index: 10;
        ">
          ${shortName}
        </div>
        <div class="truck-status-badge" style="
          position: absolute;
          top: -8px;
          right: -8px;
          background: ${this.getStatusBadgeColor(truck.status)};
          color: white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        ">
          <i class="fas ${this.getStatusIcon(truck.status)}" style="font-size: 10px;"></i>
        </div>
      </div>
    `;
  } else {
    iconHtml = `
      <div class="truck-marker-wrapper ${animationClass}" style="
        position: relative;
        cursor: pointer;
      ">
        <div class="truck-icon-container" style="
          background: ${color};
          width: 56px;
          height: 56px;
          border-radius: 12px;
          border: 3px solid ${borderColor};
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          position: relative;
        ">
          <i class="fas fa-truck" style="font-size: 24px; margin-bottom: 2px;"></i>
          <span style="font-size: 9px; font-weight: bold; text-shadow: 0 1px 1px rgba(0,0,0,0.3);">${capacity}t</span>
        </div>
        <div class="truck-label" style="
          position: absolute;
          bottom: -22px;
          left: 50%;
          transform: translateX(-50%);
          background: ${color};
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: bold;
          white-space: nowrap;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          text-shadow: 0 1px 1px rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.3);
          font-family: 'Segoe UI', sans-serif;
          z-index: 10;
        ">
          ${shortName}
        </div>
        <div class="truck-status-badge" style="
          position: absolute;
          top: -8px;
          right: -8px;
          background: ${this.getStatusBadgeColor(truck.status)};
          color: white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        ">
          <i class="fas ${this.getStatusIcon(truck.status)}" style="font-size: 10px;"></i>
        </div>
      </div>
    `;
  }
  
  return L.divIcon({
    html: iconHtml,
    className: `custom-truck-marker truck-status-${truck.status.toLowerCase().replace(/ /g, '-')}`,
    iconSize: [56, 78],
    iconAnchor: [28, 56],
    popupAnchor: [0, -56]
  });
}

// Ajoutez ces méthodes utilitaires

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


private addTruckMarkers(): void {
  if (!this.truckMap) return;

  this.truckMarkers.forEach(marker => marker.remove());
  this.truckMarkers = [];

  const activeTrucks = this.trucks.filter(t =>
    t.status.toLowerCase() !== 'inactive' &&
    t.status.toLowerCase() !== 'hors service'
  );

  activeTrucks.forEach(truck => {
    const truckWithGeo = this.trucksWithGeo.find(t => t.id === truck.id);
    if (!truckWithGeo?.entityCoordinates) return;

    const coords = truckWithGeo.entityCoordinates;

    // Ajouter une petite variation pour éviter les superpositions
    const latOffset = (Math.random() - 0.5) * 0.01;
    const lngOffset = (Math.random() - 0.5) * 0.01;

    const truckColor = truck.color || this.getStatusColor(truck.status);
    
    // Utiliser la couleur spécifique du camion si disponible
    let finalColor = truckColor;
    if (truck.color && truck.color !== '#000000') {
      finalColor = truck.color;
    }

    const firstImage = (truck.images && truck.images.length > 0) ? truck.images[0] : null;
    const formattedImage = this.formatBase64Image(firstImage);

    const truckIcon = this.createTruckIcon(truck, finalColor, formattedImage);

    const marker = L.marker([
      coords.lat + latOffset,
      coords.lng + lngOffset
    ], {
      icon: truckIcon,
      zIndexOffset: 2000
    }).addTo(this.truckMap!);

    // Ajouter un tooltip au survol
    const marqueName = this.getMarqueName(truck.marqueTruckId);
    marker.bindTooltip(`
      <div style="font-family: 'Segoe UI', sans-serif; padding: 4px 8px;">
        <strong>${truck.immatriculation}</strong><br>
        ${marqueName} - ${truck.typeTruck?.capacity || '?'}t<br>
        Statut: ${STATUS_CONFIG[truck.status]?.label || truck.status}
      </div>
    `, {
      permanent: false,
      direction: 'top',
      offset: [0, -70],
      className: 'truck-tooltip'
    });

    const truckWithZone = {
      ...truck,
      zoneName: truckWithGeo.entityName,
      marqueName: marqueName
    };

    marker.bindPopup(this.createTruckPopup(truckWithZone, finalColor, formattedImage));

    // Animation au survol - Utiliser des fonctions fléchées pour conserver le contexte
    marker.on('mouseover', (event: L.LeafletMouseEvent) => {
      const target = event.target;
      const element = target.getElement();
      if (element) {
        element.style.transform = 'scale(1.1)';
        element.style.transition = 'transform 0.2s ease';
      }
    });
    
    marker.on('mouseout', (event: L.LeafletMouseEvent) => {
      const target = event.target;
      const element = target.getElement();
      if (element) {
        element.style.transform = 'scale(1)';
      }
    });

    this.truckMarkers.push(marker);
  });
}


private createTruckPopup(truck: any, color: string, imageBase64: string | null): HTMLDivElement {
  const status = STATUS_CONFIG[truck.status] || STATUS_CONFIG['available'];
  const zoneName = truck.zoneName || 'Non assigné';
  const marqueName = truck.marqueName || this.getMarqueName(truck.marqueTruckId);

  const popup = document.createElement('div');
  popup.style.fontFamily = 'Segoe UI, sans-serif';
  popup.style.padding = '0';
  popup.style.minWidth = '300px';
  popup.style.maxWidth = '350px';

  const imageHtml = imageBase64
    ? `<img src="${imageBase64}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;" alt="Camion">`
    : `<div style="width: 100%; height: 100%; background: ${color}; display: flex; align-items: center; justify-content: center; color: white; font-size: 32px; border-radius: 8px;">
         <i class="fas fa-truck"></i>
       </div>`;

  // Déterminer la couleur du statut
  const statusColor = this.getStatusBadgeColor(truck.status);
  
  // Informations supplémentaires
  const lastMaintenance = truck.lastMaintenanceDate || 'Non renseignée';
  const nextMaintenance = truck.nextMaintenanceDate || 'Non renseignée';
  const mileage = truck.mileage ? `${truck.mileage.toLocaleString()} km` : 'Non renseigné';

  popup.innerHTML = `
    <div style="background: linear-gradient(135deg, ${color}, ${this.adjustColor(color, -30)}); padding: 12px 16px; color: white;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h3 style="margin: 0; font-size: 18px; font-weight: 700;">${truck.immatriculation}</h3>
          <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">
            <i class="fas fa-industry"></i> ${marqueName} • ${truck.typeTruck?.capacity || '?'} tonnes
          </div>
        </div>
        <div style="background: ${statusColor}; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;">
          <i class="fas ${this.getStatusIcon(truck.status)}" style="margin-right: 4px;"></i>
          ${status.label}
        </div>
      </div>
    </div>
    
    <div style="padding: 16px;">
      <div style="display: flex; gap: 16px; margin-bottom: 16px;">
        <div style="width: 80px; height: 80px; border-radius: 8px; overflow: hidden; background: #f8f9fa; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          ${imageHtml}
        </div>
        <div style="flex: 1;">
          <div style="margin-bottom: 8px;">
            <span style="color: #6c757d; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">ENTITÉ GÉOGRAPHIQUE</span>
            <div style="color: #2c3e50; font-weight: 600; font-size: 14px; margin-top: 2px;">
              <i class="fas fa-map-pin" style="color: ${color}; margin-right: 6px;"></i>
              ${zoneName}
            </div>
          </div>
          <div>
            <span style="color: #6c757d; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">COULEUR</span>
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
              <span style="display: inline-block; width: 20px; height: 20px; background: ${color}; border-radius: 4px; border: 1px solid #dee2e6;"></span>
              <span style="color: #2c3e50; font-size: 13px; font-family: monospace;">${color.toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div style="border-top: 1px solid #e9ecef; padding-top: 12px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <span style="color: #6c757d; font-size: 10px; text-transform: uppercase;">ID</span>
            <div style="color: #2c3e50; font-weight: 500; font-size: 13px;">#${truck.id}</div>
          </div>
          <div>
            <span style="color: #6c757d; font-size: 10px; text-transform: uppercase;">KILOMÉTRAGE</span>
            <div style="color: #2c3e50; font-weight: 500; font-size: 13px;">${mileage}</div>
          </div>
          <div>
            <span style="color: #6c757d; font-size: 10px; text-transform: uppercase;">DERNIÈRE MAINTENANCE</span>
            <div style="color: #2c3e50; font-weight: 500; font-size: 12px;">${lastMaintenance}</div>
          </div>
          <div>
            <span style="color: #6c757d; font-size: 10px; text-transform: uppercase;">PROCHAINE MAINTENANCE</span>
            <div style="color: ${this.isMaintenanceDue(nextMaintenance) ? '#e74a3b' : '#2c3e50'}; font-weight: 500; font-size: 12px;">
              ${nextMaintenance}
              ${this.isMaintenanceDue(nextMaintenance) ? '<i class="fas fa-exclamation-triangle" style="margin-left: 4px;"></i>' : ''}
            </div>
          </div>
        </div>
      </div>
      
      <div style="margin-top: 12px; padding: 8px; background: #f8f9fa; border-radius: 6px; font-size: 11px; color: #6c757d; text-align: center;">
        <i class="fas fa-info-circle"></i> Cliquez sur le marqueur pour plus de détails
      </div>
    </div>
  `;

  return popup;
}

// Ajoutez cette méthode utilitaire
private adjustColor(color: string, amount: number): string {
  // Convertir la couleur hex en RGB et ajuster la luminosité
  // Pour simplifier, on retourne une version plus foncée/plus claire
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const newR = Math.max(0, Math.min(255, r + amount));
    const newG = Math.max(0, Math.min(255, g + amount));
    const newB = Math.max(0, Math.min(255, b + amount));
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  }
  return color;
}

private isMaintenanceDue(dateStr: string): boolean {
  if (!dateStr || dateStr === 'Non renseignée') return false;
  const dueDate = new Date(dateStr);
  const today = new Date();
  const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
  return diffDays <= 7 && diffDays >= 0;
}
}