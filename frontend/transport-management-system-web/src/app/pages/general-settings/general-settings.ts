import { Component, inject, OnInit } from '@angular/core';
import { Http } from '../../services/http';
import { Table } from '../../components/table/table';
import { IGeneralSettings, ParameterType, SearchOptions } from '../../types/general-settings';
import { MatButtonModule } from '@angular/material/button';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { GeneralSettingsForm } from './general-settings-form/general-settings-form';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { debounceTime } from 'rxjs';
import { PagedData } from '../../types/paged-data';
import { Auth } from '../../services/auth';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-general-settings',
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
    MatFormFieldModule,
    MatIconModule
  ],
  templateUrl: './general-settings.html',
  styleUrls: ['./general-settings.scss']
})
export class GeneralSettings implements OnInit {
  constructor(public auth: Auth) {}

  getActions(row: any, actions: string[]) {
    const permittedActions: string[] = [];
    for (const a of actions) {
      if (a === 'Modifier' && this.auth.hasPermission('PARAMETER_EDIT')) {
        permittedActions.push(a);
      }
      if (a === 'Supprimer' && this.auth.hasPermission('PARAMETER_DISABLE')) {
        permittedActions.push(a);
      }
    }
    return permittedActions;
  }
 filter: SearchOptions = {
    pageIndex: 0,
    pageSize: 10,
    search: '',
    parameterType: ''
  };
  httpService = inject(Http);
  pagedParameterData!: PagedData<IGeneralSettings>;
  totalData!: number;

  // Available parameter types for filter
  parameterTypes = Object.values(ParameterType);


  searchControl = new FormControl('');
  typeControl = new FormControl('');
  readonly dialog = inject(MatDialog);

  showCols = [
    { 
    key: 'parameterType', 
    label: 'Type de paramètre',
    // The value parameter is the entire row object
    format: (row: any) => this.formatParameterType(row.parameterType)
  },
    { key: 'parameterCode', label: 'Code' },
    { key: 'description', label: 'Description' },
    { key: 'value', label: 'Valeur' },
    {
      key: 'Action',
      format: () => ["Modifier", "Supprimer"]
    }
  ];

  ngOnInit() {
    this.getLatestData();

     this.searchControl.valueChanges.pipe(debounceTime(250))
      .subscribe((value: string | null) => {
        this.filter.search = value || '';
        this.filter.pageIndex = 0; // Reset to first page
        this.getLatestData();
      });

    // Type filter with debounce
    this.typeControl.valueChanges.pipe(debounceTime(250))
      .subscribe((value: string | null) => {
        console.log('Filtering by type:', value); // Debug log
        this.filter.parameterType = value || '';
        this.filter.pageIndex = 0; // Reset to first page
        this.getLatestData();
      });
  }

 getLatestData() {
    // Create clean search options object
    const searchOptions: SearchOptions = {
      pageIndex: this.filter.pageIndex,
      pageSize: this.filter.pageSize
    };
    
    // Only add properties that have values
    if (this.filter.search && this.filter.search.trim() !== '') {
      searchOptions.search = this.filter.search.trim();
    }
    
    if (this.filter.parameterType && this.filter.parameterType !== '') {
      searchOptions.parameterType = this.filter.parameterType;
    }
    
    console.log('Sending to backend:', searchOptions); // Debug log
    
    this.httpService.getGeneralSettings(searchOptions).subscribe({
      next: (result) => {
        this.pagedParameterData = result;
        this.totalData = result.totalData;
        console.log('Received from backend:', result); // Debug log
      },
      error: (error) => {
        console.error('Error loading settings:', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Impossible de charger les paramètres',
          confirmButtonText: 'OK'
        });
      }
    });
  }

  add() {
    this.openDialog();
  }

  edit(parameter: IGeneralSettings) {
    const ref = this.dialog.open(GeneralSettingsForm, {
      panelClass: 'm-auto',
      width: '600px',
      data: { parameterId: parameter.id }
    });

    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.getLatestData();
      }
    });
  }

  delete(parameter: IGeneralSettings) {
    Swal.fire({
      title: 'Êtes-vous sûr?',
      text: `Voulez-vous vraiment supprimer le paramètre "${parameter.parameterCode}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, supprimer!',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.httpService.deleteGeneralSettings(parameter.id).subscribe({
          next: () => {
            Swal.fire(
              'Supprimée!',
              'Le paramètre a été supprimé avec succès.',
              'success'
            );
            this.getLatestData();
          },
          error: (error) => {
            console.error('Error deleting parameter:', error);
            Swal.fire(
              'Erreur!',
              error.error?.message || 'Une erreur est survenue lors de la suppression.',
              'error'
            );
          }
        });
      }
    });
  }

  openDialog(): void {
    const ref = this.dialog.open(GeneralSettingsForm, {
      panelClass: 'm-auto',
      width: '600px',
      data: {}
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
formatParameterType(type: string): string {
  const typeMap: { [key: string]: string } = {
    'GOVERNORATE': 'Gouvernorat',
    'REGION': 'Région',
    'ZONE': 'Zone',
    'EMPLOYEE_CATEGORY': 'Catégorie d\'employé',
    'ORDER': 'Commande',
    'TRIP': 'Voyage'
  };
  return typeMap[type] || type;
}
}