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
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { StorageLocationService } from '../../services/storage-location.service';
import { StorageLocationDetail } from '../../types/StorageLocationDTO';

@Component({
  selector: 'app-storage-location-details',
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
    MatProgressSpinnerModule,
    MatExpansionModule
  ],
  templateUrl: './storage-location-details.html',
  styleUrls: ['./storage-location-details.scss']
})
export class StorageLocationDetailsComponent implements OnInit, OnDestroy {
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  dataSource = new MatTableDataSource<StorageLocationDetail>([]);
  displayedColumns: string[] = [
    'lieuStockageNom', 'capacite', 'volume', 
    'materiauDesignation', 'stockTotal', 'stockDisponible', 
    'stockBloque', 'stockReserve', 'densite', 'dateLimiteConsommation', 
    'numLotFournisseur', 'statutQuant'
  ];
  
  filterControl = new FormControl('');
  materialFilterControl = new FormControl('');
  
  isLoading = false;
  totalItems = 0;
  pageSize = 10;
  pageIndex = 0;
  
  warehouseKey: number;
  warehouseName: string = '';
  warehouseDescription: string = '';
  
  private destroy$ = new Subject<void>();

  constructor(
    private storageLocationService: StorageLocationService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.warehouseKey = Number(this.route.snapshot.paramMap.get('id'));
  }

  ngOnInit() {
    this.loadWarehouseInfo();
    this.loadData();

    this.filterControl.valueChanges
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => {
        this.pageIndex = 0;
        this.loadData();
      });

    this.materialFilterControl.valueChanges
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => {
        this.pageIndex = 0;
        this.loadData();
      });
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
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadWarehouseInfo() {
    this.storageLocationService.getWarehouseInfo(this.warehouseKey).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.warehouseName = response.data.warehouseName;
          this.warehouseDescription = response.data.warehouseDescription;
        }
      },
      error: (error) => {
        console.error('Erreur chargement info dépôt:', error);
      }
    });
  }

  loadData() {
    this.isLoading = true;
    
    const searchOptions = {
      warehouseKey: this.warehouseKey,
      search: this.filterControl.value || '',
      materialSearch: this.materialFilterControl.value || '',
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
      sortField: this.sort?.active || 'lieuStockageNom',
      sortDirection: this.sort?.direction || 'asc'
    };

    this.storageLocationService.getStorageLocationsByWarehouse(searchOptions).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response.success) {
          const locations = response.data.data.map((loc: any) => ({
            ...loc,
            dateLimiteConsommation: loc.dateLimiteConsommation ? new Date(loc.dateLimiteConsommation) : null
          }));
          this.dataSource.data = locations;
          this.totalItems = response.data.totalData;
          
          if (this.paginator) {
            this.paginator.length = this.totalItems;
          }
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        console.error('Erreur:', error);
        this.snackBar.open('Erreur lors du chargement des données', 'Fermer', { duration: 3000 });
      }
    });
  }

  formatDate(date: Date | null): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatQuantity(quantity: number): string {
    if (quantity === undefined || quantity === null) return '0';
    return quantity.toLocaleString('fr-FR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }

  isDateExpired(date: Date | null): boolean {
    if (!date) return false;
    return new Date(date) < new Date();
  }

  goBack() {
    this.router.navigate(['/warehouse']);
  }
}