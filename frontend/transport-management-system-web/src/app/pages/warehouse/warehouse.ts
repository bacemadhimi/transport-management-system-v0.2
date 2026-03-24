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
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { WarehousePlantIt, WarehouseSearchOptions } from '../../types/WarehouseDTO';
import { Http } from '../../services/http';
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
  displayedColumns: string[] = ['code', 'name', 'pipeCount', 'supportMultipleDocking', 'status', 'lastModified', 'action'];

  filterControl = new FormControl('');
  statusControl = new FormControl('');
  processUnitControl = new FormControl('');

  statusOptions = [
    { id: true, label: 'Actif' },
    { id: false, label: 'Inactif' }
  ];

  processUnitOptions = [
    { id: 1, label: 'Unité 1' },
    { id: 2, label: 'Unité 2' },
    { id: 3, label: 'Unité 3' }
  ];

  isLoading = false;
  totalItems = 0;
  pageSize = 10;
  pageIndex = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private http: WarehouseService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadData();

    this.filterControl.valueChanges
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => {
        this.pageIndex = 0;
        this.loadData();
      });

    this.statusControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.pageIndex = 0;
        this.loadData();
      });

    this.processUnitControl.valueChanges
      .pipe(takeUntil(this.destroy$))
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

  loadData() {
    this.isLoading = true;
    
    const searchOptions: WarehouseSearchOptions = {
      search: this.filterControl.value || '',
      status: this.statusControl.value !== null ? (this.statusControl.value === 'true') : undefined,
      processUnitClassLink: this.processUnitControl.value ? Number(this.processUnitControl.value) : undefined,
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
      sortField: this.sort?.active || 'key',
      sortDirection: this.sort?.direction || 'desc'
    };

    this.http.getWarehousesPlantIt(searchOptions).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response.success) {
          const warehouses = response.data.data.map((w: any) => ({
            ...w,
            lastModified: new Date(w.lastModified)
          }));
          this.dataSource.data = warehouses;
          this.totalItems = response.data.totalData;
          
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
      minute: '2-digit'
    });
  }

  edit(item: WarehousePlantIt) {
    console.log('Modifier:', item);
  }

  delete(item: WarehousePlantIt) {
    if (confirm(`Supprimer l'entrepôt ${item.warehouseCode} - ${item.warehouseName} ?`)) {
      this.http.deleteWarehousePlantIt(item.key).subscribe({
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

  viewDetails(item: WarehousePlantIt) {
    console.log('Détails:', item);
  }
}