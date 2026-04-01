import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Chart, registerables } from 'chart.js';

import { TripsMapService, ITripWithDetails, IEntityDeliveryStats, TRIP_STATUS_CONFIG, DELIVERY_STATUS_CONFIG, IDeliveryWithDetails } from '../../services/trips-map.service';
import { TripStatusOptions, DeliveryStatusOptions, TripStatus, DeliveryStatus } from '../../types/trip';
import { IGeographicalEntity } from '../../types/general-settings';
import { ScrollingModule } from '@angular/cdk/scrolling';

Chart.register(...registerables);

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
  entityDeliveryStats: IEntityDeliveryStats[] = [];
  geographicalEntities: IGeographicalEntity[] = [];
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
    activeEntities: 0,
    totalDistance: 0,
    avgDuration: 0,
    onTimePercentage: 92
  };

  overallProgress: number = 0;

  statusFilter: string = 'all';
  entityFilter: string = 'all';
  startDateFilter: string = '';
  endDateFilter: string = '';

  currentMonthLabel: string = '';
  showMonthShortcuts: boolean = true;
  mapLoading: boolean = false;
  initialLoadDone: boolean = false;
  mapError: boolean = false;
  showTripModal: boolean = false;

  selectedTripId: number | null = null;
  selectedTrip: ITripWithDetails | null = null;
  selectedEntityName: string = 'all';

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

  // Graphiques
  private statusChart: Chart | null = null;
  private completionChart: Chart | null = null;

  private subscriptions: Subscription = new Subscription();
  private resizeTimer: any;

  Object = Object;

  constructor(private tripsMapService: TripsMapService) {
    this.updateLastUpdateTime();
  }

  ngOnInit(): void {
    this.initializeWithCurrentMonth();
    this.loadGeographicalEntities();
    this.loadInitialData();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initCharts();
    }, 500);
  }

  ngOnDestroy(): void {
    if (this.statusChart) {
      this.statusChart.destroy();
    }
    if (this.completionChart) {
      this.completionChart.destroy();
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
      this.refreshCharts();
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

  private loadGeographicalEntities(): void {
    this.tripsMapService['getGeographicalEntitiesFromApi']().subscribe(entities => {
      this.geographicalEntities = entities;
    });
  }

  private loadInitialData(): void {
    if (this.initialLoadDone) return;

    this.mapLoading = true;
    this.isLoading = true;

    const subscription = this.tripsMapService.getTripsWithDetails(
      this.statusFilter !== 'all' ? this.statusFilter : undefined,
      this.entityFilter !== 'all' ? this.entityFilter : undefined,
      this.startDateFilter || undefined,
      this.endDateFilter || undefined
    ).subscribe({
      next: (trips) => {
        this.trips = trips;
        this.filteredTrips = trips;

        this.tripsMapService['getGeographicalEntitiesFromApi']().subscribe(entities => {
          this.geographicalEntities = entities;
          this.entityDeliveryStats = this.tripsMapService.getEntityDeliveryStats(trips, entities);
          this.updateTripStats();
          this.refreshCharts();
        });

        this.mapLoading = false;
        this.isLoading = false;
        this.initialLoadDone = true;
      },
      error: (error) => {
        this.errorMessage = 'Erreur chargement des tournées';
        this.mapError = true;
        this.mapLoading = false;
        this.isLoading = false;
      }
    });

    this.subscriptions.add(subscription);
  }

  private reloadData(): void {
    if (this.isLoading) return;

    this.mapLoading = true;
    this.isLoading = true;

    const subscription = this.tripsMapService.getTripsWithDetails(
      this.statusFilter !== 'all' ? this.statusFilter : undefined,
      this.entityFilter !== 'all' ? this.entityFilter : undefined,
      this.startDateFilter || undefined,
      this.endDateFilter || undefined
    ).subscribe({
      next: (trips) => {
        this.trips = trips;
        this.filteredTrips = trips;

        this.tripsMapService['getGeographicalEntitiesFromApi']().subscribe(entities => {
          this.geographicalEntities = entities;
          this.entityDeliveryStats = this.tripsMapService.getEntityDeliveryStats(trips, entities);
          this.updateTripStats();
          this.refreshCharts();
        });

        this.mapLoading = false;
        this.isLoading = false;
        this.selectedEntityName = 'all';
      },
      error: (error) => {
        this.errorMessage = 'Erreur chargement des tournées';
        this.mapError = true;
        this.mapLoading = false;
        this.isLoading = false;
      }
    });

    this.subscriptions.add(subscription);
  }

  applyFilters(): void {
    if (this.filterTimeout) clearTimeout(this.filterTimeout);
    this.filterTimeout = setTimeout(() => this.reloadData(), 300);
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
    this.entityFilter = 'all';
    this.initializeWithCurrentMonth();
    this.reloadData();
  }

  refreshData(): void {
    this.reloadData();
    this.updateLastUpdateTime();
    this.successMessage = 'Données actualisées';
    setTimeout(() => this.successMessage = '', 3000);
  }

  refreshCharts(): void {
    setTimeout(() => {
      this.initStatusBarChart();
      this.initCompletionPieChart();
    }, 100);
  }

  private initCharts(): void {
    this.initStatusBarChart();
    this.initCompletionPieChart();
  }

  private initStatusBarChart(): void {
    const canvas = document.getElementById('statusBarChart') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (this.statusChart) this.statusChart.destroy();

    const statusData = [
      this.tripStats.planned,
      this.tripStats.accepted,
      this.tripStats.loading,
      this.tripStats.inProgress,
      this.tripStats.completed,
      this.tripStats.cancelled
    ];

    this.statusChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Planifié', 'Accepté', 'Chargement', 'Livraison', 'Terminé', 'Annulé'],
        datasets: [{
          label: 'Nombre de tournées',
          data: statusData,
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(59, 130, 246, 0.7)',
            'rgba(59, 130, 246, 0.6)',
            'rgba(59, 130, 246, 0.5)',
            'rgba(16, 185, 129, 0.7)',
            'rgba(239, 68, 68, 0.7)'
          ],
          borderColor: ['#3b82f6', '#3b82f6', '#3b82f6', '#3b82f6', '#10b981', '#ef4444'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}` } }
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    });
  }

  private initCompletionPieChart(): void {
    const canvas = document.getElementById('completionPieChart') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (this.completionChart) this.completionChart.destroy();

    const totalDeliveries = this.filteredTrips.reduce((sum, t) => sum + (t.deliveries?.length || 0), 0);
    const completedDeliveries = this.filteredTrips.reduce((sum, t) =>
      sum + (t.deliveries?.filter(d => d.status === DeliveryStatus.Delivered).length || 0), 0
    );
    const pendingDeliveries = totalDeliveries - completedDeliveries;

    this.completionChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Livrées', 'En attente'],
        datasets: [{
          data: [completedDeliveries, pendingDeliveries],
          backgroundColor: ['#10b981', '#3b82f6'],
          borderColor: '#fff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const value = ctx.raw as number;
                const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                return `${ctx.label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  focusOnEntity(entityName: string): void {
    this.selectedEntityName = entityName;
    this.entityFilter = entityName;
    this.applyFilters();
  }

  focusOnTrip(tripId: number, event?: Event): void {
    if (event) event.stopPropagation();
    const trip = this.filteredTrips.find(t => t.id === tripId);
    if (trip) {
      this.selectedTrip = trip;
      this.selectedTripId = tripId;
      this.showTripModal = true;
    }
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

  getEntityColor(stat: IEntityDeliveryStats): string {
    const total = stat.total || 0;
    if (total === 0) return '#9ca3af';
    const rate = (stat.delivered / total) * 100;
    if (rate > 70) return '#10b981';
    if (rate > 30) return '#3b82f6';
    if (rate > 0) return '#f59e0b';
    return '#ef4444';
  }

  getEntityCompletionPercentage(stat: IEntityDeliveryStats): number {
    const total = stat.total || 0;
    if (total === 0) return 0;
    return Math.round((stat.delivered / total) * 100);
  }

  clearError(): void { this.errorMessage = ''; }
  clearSuccess(): void { this.successMessage = ''; }

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

  trackByTripId(index: number, trip: ITripWithDetails): number {
    return trip.id;
  }
}