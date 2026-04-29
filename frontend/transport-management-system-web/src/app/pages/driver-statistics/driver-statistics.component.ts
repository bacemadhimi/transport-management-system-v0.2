import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

Chart.register(...registerables);

interface DriverStatistics {
  driverId: number;
  driverName: string;
  licenseNumber: string;
  phoneNumber: string;
  totalTrips: number;
  totalDistanceKm: number;
  totalDrivingHours: number;
  averageDistancePerTrip: number;
  averageDurationPerTrip: number;
  completedTrips: number;
  cancelledTrips: number;
  completionRate: number;
  totalStopTimeHours: number;
  stopTimePercentage: number;
  productivityScore: number;
  averageTripsPerDay: number;
  periodStart: string;
  periodEnd: string;
}

interface DriverDetailedStatistics {
  driverId: number;
  driverName: string;
  licenseNumber: string;
  phoneNumber: string;
  email: string;
  status: string;
  summary: DriverPerformanceSummary;
  monthlyStats: MonthlyStatistics[];
  tripStatusDistribution: PieChartData[];
  recentTrips: RecentTripSummary[];
  performanceIndicators: PerformanceIndicators;
}

interface DriverPerformanceSummary {
  totalTrips: number;
  totalDistanceKm: number;
  totalDrivingHours: number;
  completedTrips: number;
  cancelledTrips: number;
  completionRate: number;
  totalStopTimeHours: number;
  stopTimePercentage: number;
  productivityScore: number;
  averageTripsPerDay: number;
  averageDistancePerTrip: number;
  averageDurationPerTrip: number;
}

interface MonthlyStatistics {
  month: string;
  tripCount: number;
  totalDistance: number;
  totalHours: number;
  completedCount: number;
  completionRate: number;
}

interface PieChartData {
  label: string;
  value: number;
  count: number;
  color: string;
}

interface RecentTripSummary {
  tripId: number;
  tripReference: string;
  startDate: string;
  endDate: string;
  status: string;
  distance: number;
  duration: number;
  destination: string;
}

interface PerformanceIndicators {
  efficiencyScore: number;
  onTimeDeliveryRate: number;
  customerSatisfactionScore: number;
  incidentCount: number;
  fuelEfficiency: number;
  vehicleUtilizationRate: number;
  performanceTrend: string;
  trendPercentage: number;
}

@Component({
  selector: 'app-driver-statistics',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSelectModule, MatFormFieldModule, MatIconModule],
  templateUrl: './driver-statistics.component.html',
  styleUrls: ['./driver-statistics.component.scss']
})
export class DriverStatisticsComponent implements OnInit, OnDestroy {
  driverStatistics: DriverStatistics[] = [];
  filteredDrivers: DriverStatistics[] = [];
  filteredStatistics: DriverStatistics[] = [];
  selectedDriverId: number | null = null;
  selectedDriverDetails: DriverDetailedStatistics | null = null; // Vue détaillée intégrée
  
  // Filtres
  startDate: string = '';
  endDate: string = '';
  
  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;
  totalPages: number = 0;
  
  // Loading states
  isLoading: boolean = false;
  isLoadingDetails: boolean = false;
  
  // Charts
  performanceChart: any = null;
  monthlyTrendChart: any = null;
  statusDistributionChart: any = null;
  
  private destroy$ = new Subject<void>();
  
  constructor(private http: HttpClient) {}
  
  ngOnInit(): void {
    this.loadDriverStatistics();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  compareDrivers(id1: any, id2: any): boolean {
    return id1 === id2;
  }
  
  onDriverSelect(driverId: number | null): void {
    console.log('🔍 Chauffeur sélectionné:', driverId);
    this.selectedDriverId = driverId;
    
    // Si un chauffeur est sélectionné, charger ses détails directement
    if (driverId !== null && driverId !== undefined) {
      this.viewDriverDetails(driverId);
    } else {
      // Sinon, revenir à la liste complète
      this.backToDriversList();
    }
  }
  
  onDateFilterChange(): void {
    console.log('📅 Dates modifiées - Rechargement des données');
    console.log('   - startDate:', this.startDate);
    console.log('   - endDate:', this.endDate);
    console.log('   - selectedDriverId:', this.selectedDriverId);
    
    // Recharger les données avec les nouveaux filtres de dates
    if (this.selectedDriverId !== null && this.selectedDriverId !== undefined) {
      // Si un chauffeur est sélectionné, recharger ses détails avec les nouvelles dates
      this.viewDriverDetails(this.selectedDriverId);
    } else {
      // Sinon, recharger la liste complète avec les filtres de dates
      this.loadDriverStatistics();
    }
  }
  
  loadDriverStatistics(): void {
    this.isLoading = true;
    
    // Si un chauffeur spécifique est sélectionné, charger ses détails avec les filtres de dates
    if (this.selectedDriverId !== null && this.selectedDriverId !== undefined) {
      console.log('📡 Chargement des détails du chauffeur', this.selectedDriverId, 'avec dates');
      this.viewDriverDetails(this.selectedDriverId);
      return; // On sort car viewDriverDetails gère le chargement
    }
    
    let url = 'http://localhost:5191/api/statistics/driver-statistics';
    const params: string[] = [];
    
    if (this.startDate) {
      params.push(`startDate=${this.startDate}`);
    }
    if (this.endDate) {
      params.push(`endDate=${this.endDate}`);
    }
    
    if (params.length > 0) {
      url += '?' + params.join('&');
    }
    
    console.log('🔄 Chargement des statistiques depuis:', url);
    
    this.http.get<DriverStatistics[]>(url).subscribe({
      next: (data) => {
        console.log('✅ Données reçues:', data.length, 'chauffeurs');
        console.log('   Données:', data);
        
        this.driverStatistics = data;
        this.filteredDrivers = [...data];
        this.filteredStatistics = [...data];
        this.totalItems = data.length;
        this.totalPages = Math.ceil(this.totalItems / this.pageSize);
        
        console.log('📊 driverStatistics:', this.driverStatistics.length);
        console.log('📊 filteredStatistics:', this.filteredStatistics.length);
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Error loading driver statistics:', error);
        console.error('   Status:', error.status);
        console.error('   Message:', error.message);
        this.isLoading = false;
      }
    });
  }
  
  applyFilters(): void {
    console.log('📊 ApplyFilters appelé');
    console.log('   - selectedDriverId:', this.selectedDriverId);
    console.log('   - driverStatistics.length:', this.driverStatistics.length);
    
    let filtered = [...this.driverStatistics];
    
    // Filter by selected driver ID
    if (this.selectedDriverId !== null && this.selectedDriverId !== undefined) {
      console.log('   - Filtrage par ID:', this.selectedDriverId);
      filtered = filtered.filter(driver => {
        const match = driver.driverId === this.selectedDriverId;
        console.log(`     * Driver ${driver.driverName} (${driver.driverId}): ${match ? '✅ MATCH' : '❌'}`);
        return match;
      });
    }
    
    console.log('   - filteredStatistics.length:', filtered.length);
    this.filteredStatistics = filtered;
    this.totalItems = filtered.length;
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
    this.currentPage = 1;
  }
  
  get paginatedStatistics(): DriverStatistics[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredStatistics.slice(start, end);
  }
  
  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }
  
  viewDriverDetails(driverId: number): void {
    console.log('🔍 Chargement des détails pour le chauffeur ID:', driverId);
    this.isLoadingDetails = true;
    this.selectedDriverId = driverId;
    
    let url = `http://localhost:5191/api/statistics/driver-statistics/${driverId}`;
    const params: string[] = [];
    
    if (this.startDate) {
      params.push(`startDate=${this.startDate}`);
    }
    if (this.endDate) {
      params.push(`endDate=${this.endDate}`);
    }
    
    if (params.length > 0) {
      url += '?' + params.join('&');
    }
    
    console.log('📡 Requête API:', url);
    
    this.http.get<DriverDetailedStatistics>(url).subscribe({
      next: (data) => {
        console.log('✅ Détails reçus:', data);
        this.selectedDriverDetails = data;
        this.isLoadingDetails = false;
        
        // Créer les graphiques après un court délai pour s'assurer que le DOM est prêt
        setTimeout(() => {
          this.createCharts();
        }, 200);
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des détails:', error);
        this.isLoadingDetails = false;
        this.selectedDriverId = null;
      }
    });
  }
  
  backToDriversList(): void {
    console.log('↩️ Retour à la liste des chauffeurs');
    this.selectedDriverId = null;
    this.selectedDriverDetails = null;
    this.destroyCharts();
  }
  
  clearSelectedDriver(): void {
    this.selectedDriverDetails = null;
    this.selectedDriverId = null;
    this.destroyCharts();
  }
  
  createCharts(): void {
    if (!this.selectedDriverDetails) return;
    
    this.createPerformanceChart();
    this.createMonthlyTrendChart();
    this.createStatusDistributionChart();
  }
  
  createPerformanceChart(): void {
    const ctx = document.getElementById('performanceChart') as HTMLCanvasElement;
    if (!ctx || !this.selectedDriverDetails) return;
    
    this.performanceChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Productivité', 'Efficacité', 'Ponctualité', 'Utilisation Véhicule'],
        datasets: [{
          label: 'Score (%)',
          data: [
            this.selectedDriverDetails.summary.productivityScore,
            this.selectedDriverDetails.performanceIndicators.efficiencyScore,
            this.selectedDriverDetails.performanceIndicators.onTimeDeliveryRate,
            this.selectedDriverDetails.performanceIndicators.vehicleUtilizationRate
          ],
          backgroundColor: [
            'rgba(78, 115, 223, 0.8)',
            'rgba(28, 200, 138, 0.8)',
            'rgba(54, 185, 204, 0.8)',
            'rgba(246, 194, 62, 0.8)'
          ],
          borderColor: [
            'rgba(78, 115, 223, 1)',
            'rgba(28, 200, 138, 1)',
            'rgba(54, 185, 204, 1)',
            'rgba(246, 194, 62, 1)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  }
  
  createMonthlyTrendChart(): void {
    const ctx = document.getElementById('monthlyTrendChart') as HTMLCanvasElement;
    if (!ctx || !this.selectedDriverDetails || !this.selectedDriverDetails.monthlyStats.length) return;
    
    const labels = this.selectedDriverDetails.monthlyStats.map(m => {
      const [year, month] = m.month.split('-');
      return `${month}/${year}`;
    });
    
    this.monthlyTrendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Trajets',
            data: this.selectedDriverDetails.monthlyStats.map(m => m.tripCount),
            borderColor: 'rgba(78, 115, 223, 1)',
            backgroundColor: 'rgba(78, 115, 223, 0.1)',
            tension: 0.4,
            yAxisID: 'y'
          },
          {
            label: 'Distance (km)',
            data: this.selectedDriverDetails.monthlyStats.map(m => m.totalDistance),
            borderColor: 'rgba(28, 200, 138, 1)',
            backgroundColor: 'rgba(28, 200, 138, 0.1)',
            tension: 0.4,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Nombre de trajets'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: {
              drawOnChartArea: false
            },
            title: {
              display: true,
              text: 'Distance (km)'
            }
          }
        }
      }
    });
  }
  
  createStatusDistributionChart(): void {
    const ctx = document.getElementById('statusDistributionChart') as HTMLCanvasElement;
    if (!ctx || !this.selectedDriverDetails || !this.selectedDriverDetails.tripStatusDistribution.length) return;
    
    this.statusDistributionChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.selectedDriverDetails.tripStatusDistribution.map(s => s.label),
        datasets: [{
          data: this.selectedDriverDetails.tripStatusDistribution.map(s => s.count),
          backgroundColor: this.selectedDriverDetails.tripStatusDistribution.map(s => s.color),
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }
  
  destroyCharts(): void {
    if (this.performanceChart) {
      this.performanceChart.destroy();
      this.performanceChart = null;
    }
    if (this.monthlyTrendChart) {
      this.monthlyTrendChart.destroy();
      this.monthlyTrendChart = null;
    }
    if (this.statusDistributionChart) {
      this.statusDistributionChart.destroy();
      this.statusDistributionChart = null;
    }
  }
  
  getStatusColor(status: string): string {
    const colors: any = {
      'Planned': '#4e73df',
      'Accepted': '#1cc88a',
      'LoadingInProgress': '#36b9cc',
      'DeliveryInProgress': '#f6c23e',
      'Receipt': '#20c9a6',
      'Cancelled': '#e74a3b'
    };
    return colors[status] || '#858796';
  }
  
  getStatusClass(status: string): string {
    return status.toLowerCase().replace(/\s+/g, '-');
  }
  
  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'Planned': 'Planifié',
      'Accepted': 'Accepté',
      'LoadingInProgress': 'Chargement',
      'DeliveryInProgress': 'En cours',
      'Receipt': 'Terminé',
      'Cancelled': 'Annulé'
    };
    return labels[status] || status;
  }
  
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  }
  
  formatDateTime(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR');
  }
  
  getTrendIcon(trend: string): string {
    switch (trend.toLowerCase()) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      default: return '➡️';
    }
  }
  
  getTrendColor(trend: string): string {
    switch (trend.toLowerCase()) {
      case 'improving': return '#28a745';
      case 'declining': return '#dc3545';
      default: return '#6c757d';
    }
  }
}
