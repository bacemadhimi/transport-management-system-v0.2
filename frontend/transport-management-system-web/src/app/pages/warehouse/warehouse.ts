import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, takeUntil, debounceTime } from 'rxjs';


import { Auth } from '../../services/auth';
import { Http } from '../../services/http';

interface WarehouseItem {
  id: number;
  reference: string;
  material: string;
  quantity: number;
  zone: string;
  status: string;
}

@Component({
  selector: 'app-warehouse',
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
    MatSnackBarModule
  ],
  templateUrl: './warehouse.html',
  styleUrls: ['./warehouse.scss']
})
export class WarehouseComponent implements OnInit, OnDestroy {
  @ViewChild(MatSort) sort!: MatSort;

  dataSource = new MatTableDataSource<WarehouseItem>([]);
  displayedColumns: string[] = ['reference', 'material', 'quantity', 'zone', 'status', 'action'];

  filterControl = new FormControl('');
  materialControl = new FormControl('');
  statusControl = new FormControl('');

  materialOptions = [
    { id: 1, label: 'Acier' },
    { id: 2, label: 'Aluminium' },
    { id: 3, label: 'Cuivre' }
  ];

  statusOptions = [
    { id: 'pending', label: 'En attente' },
    { id: 'ready', label: 'Prêt' },
    { id: 'done', label: 'Terminé' }
  ];

  private destroy$ = new Subject<void>();

  constructor(public auth: Auth, private http: Http, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.loadData();

    this.filterControl.valueChanges
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(value => this.applyFilters());

    this.materialControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());

    this.statusControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData() {
    // Ici tu appelles ton API pour récupérer la liste
    //this.http.getWarehouseItems().subscribe((data: WarehouseItem[]) => {
   //   this.dataSource.data = data;
  //  });
  }

  applyFilters() {
    const filterText = this.filterControl.value?.toLowerCase() || '';
    const materialId = this.materialControl.value;
    const status = this.statusControl.value;

    this.dataSource.filterPredicate = (item: WarehouseItem) => {
      const matchesText = item.reference.toLowerCase().includes(filterText) || item.material.toLowerCase().includes(filterText);
      //const matchesMaterial = materialId ? item.material === this.materialOptions.find(m => m.id === materialId)?.label : true;
      const matchesStatus = status ? item.status === status : true;
      return matchesText  && matchesStatus;
    };

    this.dataSource.filter = '' + Math.random(); // trigger filter
  }

  edit(item: WarehouseItem) {
    alert('Modifier : ' + item.reference);
  }

  delete(item: WarehouseItem) {
    if (confirm('Supprimer ' + item.reference + ' ?')) {
      alert('Supprimé !');
    }
  }
}