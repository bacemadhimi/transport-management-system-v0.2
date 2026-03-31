import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil, debounceTime, interval } from 'rxjs';
import { Router } from '@angular/router';  // 👈 Ajoutez cette importation
import { WarehousePlantIt, WarehouseSearchOptions } from '../../types/WarehouseDTO';
import { WarehouseService } from '../../services/warehouse.service';

@Component({
  selector: 'app-warehouse-plantit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './warehouse.html',
  styleUrls: ['./warehouse.scss']
})
export class WarehousePlantItComponent implements OnInit, OnDestroy {
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  dataSource = new MatTableDataSource<WarehousePlantIt>([]);
  displayedColumns: string[] = ['code', 'name', 'parent', 'pipeCount', 'supportMultipleDocking', 'status', 'lastModified', 'action'];
  filterControl = new FormControl('');
  statusControl = new FormControl(null);
  warehouseTypeControl = new FormControl(null);
  parentLinkControl = new FormControl(null);

  statusOptions = [
    { id: true, label: 'Actif' },
    { id: false, label: 'Inactif' }
  ];

  warehouseTypeOptions = [
    { id: 70604, label: 'Matière première' },
    { id: 70603, label: 'Produit fini' }
  ];

  parentOptions: { id: number; label: string }[] = [];

  isLoading = false;
  totalItems = 0;
  pageSize = 10;
  pageIndex = 0;
  
  // Variables pour le rafraîchissement automatique
  autoRefreshEnabled = true;
  refreshInterval = 1000; // 1 seconde
  lastRefreshTime: Date = new Date();
  private refreshSubscription: any;

  private destroy$ = new Subject<void>();

  constructor(
    private warehouseService: WarehouseService,
    private snackBar: MatSnackBar,
    private router: Router  // 👈 Ajoutez le Router ici
  ) {}

  ngOnInit() {
    this.loadParentOptions();
    this.loadData();

    // Filtrer par recherche
    this.filterControl.valueChanges
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => {
        this.pageIndex = 0;
        this.loadData();
      });

    // Filtrer par statut
    this.statusControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.pageIndex = 0;
        this.loadData();
      });

    // Filtrer par type d'entrepôt
    this.warehouseTypeControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.pageIndex = 0;
        this.loadData();
      });

    // Filtrer par parent
    this.parentLinkControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.pageIndex = 0;
        this.loadData();
      });

    // Démarrer le rafraîchissement automatique
    this.startAutoRefresh();
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    
    if (this.paginator) {
      this.paginator.page.pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.pageIndex = this.paginator.pageIndex;
        this.pageSize = this.paginator.pageSize;
        this.loadData();
      });
    }
  }

  ngOnDestroy() {
    this.stopAutoRefresh();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Démarrer le rafraîchissement automatique
  startAutoRefresh() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
    
    if (this.autoRefreshEnabled) {
      this.refreshSubscription = interval(this.refreshInterval)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.refreshDataSilently();
        });
      console.log('Rafraîchissement automatique démarré (toutes les 1 seconde)');
    }
  }

  // Arrêter le rafraîchissement automatique
  stopAutoRefresh() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = null;
      console.log('Rafraîchissement automatique arrêté');
    }
  }

  // Rafraîchissement silencieux (sans spinner)
  refreshDataSilently() {
    if (this.isLoading) return;
    
    const searchOptions: WarehouseSearchOptions = {
      search: this.filterControl.value || '',
      status: this.statusControl.value !== null && this.statusControl.value !== undefined ? this.statusControl.value : undefined,
      warehouseType: this.warehouseTypeControl.value ? Number(this.warehouseTypeControl.value) : undefined,
      parentLink: this.parentLinkControl.value ? Number(this.parentLinkControl.value) : undefined,
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
      sortField: this.sort?.active || 'key',
      sortDirection: this.sort?.direction || 'desc'
    };

    this.warehouseService.getWarehousesPlantIt(searchOptions).subscribe({
      next: (response: any) => {
        if (response.success) {
          const warehouses = response.data.data.map((w: any) => ({
            ...w,
            lastModified: new Date(w.lastModified)
          }));
          this.dataSource.data = warehouses;
          this.totalItems = response.data.totalData;
          this.lastRefreshTime = new Date();
          
          if (this.paginator && this.totalItems !== this.paginator.length) {
            this.paginator.length = this.totalItems;
          }
        }
      },
      error: (error: any) => {
        console.error('Erreur refresh auto:', error);
      }
    });
  }

  // Rafraîchissement manuel avec spinner
  refreshDataManually() {
    if (this.isLoading) return;
    this.loadData();
  }

  // Activer/Désactiver le rafraîchissement auto
  toggleAutoRefresh() {
    this.autoRefreshEnabled = !this.autoRefreshEnabled;
    if (this.autoRefreshEnabled) {
      this.startAutoRefresh();
      this.snackBar.open('Rafraîchissement automatique activé (1 seconde)', 'Fermer', { duration: 2000 });
    } else {
      this.stopAutoRefresh();
      this.snackBar.open('Rafraîchissement automatique désactivé', 'Fermer', { duration: 2000 });
    }
  }

  loadParentOptions() {
    this.warehouseService.getParentOptions().subscribe({
      next: (response: any) => {
        if (response.success) {
          this.parentOptions = response.data;
        }
      },
      error: (error) => {
        console.error('Erreur chargement parents:', error);
      }
    });
  }

  loadData() {
    this.isLoading = true;
    
    const statusValue = this.statusControl.value;

    const searchOptions: WarehouseSearchOptions = {
      search: this.filterControl.value || '',
      status: statusValue !== null && statusValue !== undefined ? statusValue : undefined,
      warehouseType: this.warehouseTypeControl.value ? Number(this.warehouseTypeControl.value) : undefined,
      parentLink: this.parentLinkControl.value ? Number(this.parentLinkControl.value) : undefined,
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
      sortField: this.sort?.active || 'key',
      sortDirection: this.sort?.direction || 'desc'
    };

    this.warehouseService.getWarehousesPlantIt(searchOptions).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response.success) {
          const warehouses = response.data.data.map((w: any) => ({
            ...w,
            lastModified: new Date(w.lastModified)
          }));
          this.dataSource.data = warehouses;
          this.totalItems = response.data.totalData;
          this.lastRefreshTime = new Date();
          
          if (this.paginator) {
            this.paginator.length = this.totalItems;
          }
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        console.error('Erreur lors du chargement des entrepôts:', error);
        this.snackBar.open('Erreur lors du chargement des données', 'Fermer', { duration: 3000 });
      }
    });
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  edit(item: WarehousePlantIt) {
    console.log('Modifier:', item);
  }

  delete(item: WarehousePlantIt) {
    if (confirm(`Supprimer l'entrepôt ${item.warehouseCode} - ${item.warehouseName} ?`)) {
      this.warehouseService.deleteWarehousePlantIt(item.key).subscribe({
        next: (response) => {
          this.snackBar.open('Entrepôt supprimé avec succès', 'Fermer', { duration: 3000 });
          this.loadData();
        },
        error: (error) => {
          this.snackBar.open('Erreur lors de la suppression', 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  // 👈 MODIFIEZ CETTE MÉTHODE POUR NAVIGUER VERS LA PAGE DES LIEUX DE STOCKAGE
  viewDetails(item: WarehousePlantIt) {
    // Navigation vers la page des lieux de stockage avec l'ID du dépôt
    this.router.navigate(['/warehouse', item.key, 'storage-locations']);
  }
}