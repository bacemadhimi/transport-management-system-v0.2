import { Component, inject, OnInit } from '@angular/core';
import { Http } from '../../services/http';
import { SettingsService } from '../../services/settings.service';
import { Table } from '../../components/table/table';
import { ITypeTruck } from '../../types/type-truck';
import { MatButtonModule } from '@angular/material/button';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { TypeTruckForm } from './type-truck-form/type-truck-form';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { debounceTime } from 'rxjs';
import { PagedData } from '../../types/paged-data';
import { Auth } from '../../services/auth';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-type-truck',
  standalone: true,
  imports: [
    Table,
    CommonModule,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule
  ],
  templateUrl: './type-truck.html',
  styleUrls: ['./type-truck.scss']
})
export class TypeTruck implements OnInit {
  constructor(public auth: Auth) {}

  getActions(row: any, actions: string[]) {
    const permittedActions: string[] = [];

    for (const a of actions) {
      if (a === 'Modifier' && this.auth.hasPermission('TYPE_VEHICULE_EDIT')) {
        permittedActions.push(a);
      }
      if (a === 'Supprimer' && this.auth.hasPermission('TYPE_VEHICULE_DISABLE')) {
        permittedActions.push(a);
      }
    }

    return permittedActions;
  }

  httpService = inject(Http);
  settingsService = inject(SettingsService);
  pagedTypeTruckData!: PagedData<ITypeTruck>;
  totalData!: number;

  filter: any = {
    pageIndex: 0,
    pageSize: 10
  };

  loadingUnit: string = 'tonnes'; 

  searchControl = new FormControl('');
  readonly dialog = inject(MatDialog);

  showCols = [
    { key: 'type', label: 'Type' },
    { key: 'capacity', label: 'Capacité' },
    { 
      key: 'unit', 
      label: 'Unité',
      format: (row: ITypeTruck) => {
        return this.loadingUnit || 'tonnes';
      }
    },
    {
      key: 'Action',
      format: () => ["Modifier", "Supprimer"]
    }
  ];

  ngOnInit() {
    this.loadSettings();
    this.getLatestData();

    this.searchControl.valueChanges.pipe(debounceTime(250))
      .subscribe((value: string | null) => {
        this.filter.search = value;
        this.filter.pageIndex = 0;
        this.getLatestData();
      });
  }

  private loadSettings(): void {
    this.settingsService.getOrderSettings().subscribe({
      next: (settings) => {
        this.loadingUnit = settings.loadingUnit || 'tonnes';
        console.log('✅ Loading unit from settings:', this.loadingUnit);
      },
      error: (err) => {
        console.error('Error loading settings:', err);
        this.loadingUnit = 'tonnes';
      }
    });

    this.settingsService.orderSettings$.subscribe(settings => {
      if (settings) {
        this.loadingUnit = settings.loadingUnit || 'tonnes';
        console.log('🔄 Loading unit updated:', this.loadingUnit);
      }
    });
  }

  getLatestData() {
    this.httpService.getTypeTrucksList(this.filter).subscribe(result => {
      this.pagedTypeTruckData = result;
      this.totalData = result.totalData;
    });
  }

  add() {
    this.openDialog();
  }

  edit(typeTruck: ITypeTruck) {
    const ref = this.dialog.open(TypeTruckForm, {
      panelClass: 'm-auto',
      width: '500px',
      data: { 
        typeTruckId: typeTruck.id,
        defaultUnit: this.loadingUnit // Pass default unit to form
      }
    });

    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.getLatestData();
      }
    });
  }

  delete(typeTruck: ITypeTruck) {
    Swal.fire({
      title: 'Êtes-vous sûr?',
      text: `Voulez-vous vraiment supprimer le type "${typeTruck.type}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.httpService.deleteTypeTruck(typeTruck.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Supprimé!',
              text: 'Le type de véhicule a été supprimé avec succès',
              confirmButtonText: 'OK'
            });
            this.getLatestData();
          },
          error: (error) => {
            Swal.fire({
              icon: 'error',
              title: 'Erreur',
              text: 'Une erreur est survenue lors de la suppression',
              confirmButtonText: 'OK'
            });
            console.error('Error:', error);
          }
        });
      }
    });
  }

  openDialog(): void {
    const ref = this.dialog.open(TypeTruckForm, {
      panelClass: 'm-auto',
      width: '500px',
      data: {
        defaultUnit: this.loadingUnit 
      }
    });

    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.getLatestData();
      }
    });
  }

  pageChange(event: any) {
    this.filter.pageIndex = event.pageIndex;
    this.getLatestData();
  }

  onRowClick(event: any) {
    if (event.btn === "Modifier") this.edit(event.rowData);
    if (event.btn === "Supprimer") this.delete(event.rowData);
  }
}