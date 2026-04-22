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
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { PagedData } from '../../types/paged-data';
import { Auth } from '../../services/auth';
import { CommonModule } from '@angular/common';
import { Translation } from '../../services/Translation';
import Swal from 'sweetalert2';
import { MatIconModule } from '@angular/material/icon';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    MatFormFieldModule,
    MatIconModule
  ],
  templateUrl: './type-truck.html',
  styleUrls: ['./type-truck.scss']
})
export class TypeTruck implements OnInit {
  constructor(public auth: Auth) {}

  httpService = inject(Http);
  settingsService = inject(SettingsService);
  pagedTypeTruckData!: PagedData<ITypeTruck>;
  totalData!: number;

  private translation = inject(Translation);
  t(key: string): string { return this.translation.t(key); }

  filter: any = {
    pageIndex: 0,
    pageSize: 10
  };

  loadingUnit: string = 'tonnes';

  searchControl = new FormControl('');
  readonly dialog = inject(MatDialog);

  get showCols() {
    return [
      { key: 'type', label: this.t('TYPE_LABEL') },
      { key: 'capacity', label: this.t('CAPACITY_LABEL') },
      { 
        key: 'unit', 
        label: this.t('UNIT_LABEL'),
        format: (row: ITypeTruck) => {
          return this.t(this.loadingUnit.toUpperCase()) || this.loadingUnit;
        }
      },
      {
        key: 'Action',
        format: () => [this.t('ACTION_EDIT'), this.t('ACTION_DELETE')]
      }
    ];
  }

  getActions(row: any, actions: string[]) {
    const permittedActions: string[] = [];

    for (const a of actions) {
      if (a === this.t('ACTION_EDIT') && this.auth.hasPermission('TYPE_VEHICULE_EDIT')) {
        permittedActions.push(a);
      }
      if (a === this.t('ACTION_DELETE') && this.auth.hasPermission('TYPE_VEHICULE_DISABLE')) {
        permittedActions.push(a);
      }
    }

    return permittedActions;
  }

  ngOnInit() {
    this.loadSettings();
    this.getLatestData();

    this.searchControl.valueChanges.pipe(
      debounceTime(250),
      distinctUntilChanged()
    ).subscribe((value: string | null) => {
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
        defaultUnit: this.loadingUnit
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
      title: this.t('CONFIRMATION'),
      text: `${this.t('TYPE_TRUCK_DELETE_CONFIRM')} "${typeTruck.type}" ?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: this.t('YES_DELETE'),
      cancelButtonText: this.t('CANCEL')
    }).then((result) => {
      if (result.isConfirmed) {
        this.httpService.deleteTypeTruck(typeTruck.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: this.t('SUCCESS'),
              text: this.t('TYPE_TRUCK_DELETE_SUCCESS'),
              timer: 2000,
              showConfirmButton: false
            });
            this.getLatestData();
          },
          error: (error) => {
            Swal.fire({
              icon: 'error',
              title: this.t('ERROR'),
              text: this.t('TYPE_TRUCK_DELETE_ERROR'),
              confirmButtonText: this.t('OK')
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
    const editLabel = this.t('ACTION_EDIT');
    const deleteLabel = this.t('ACTION_DELETE');
    
    if (event.btn === editLabel) {
      this.edit(event.rowData);
    }
    if (event.btn === deleteLabel) {
      this.delete(event.rowData);
    }
  }

  exportCSV() {
    const rows = this.pagedTypeTruckData?.data || [];
    const csvContent = [
      ['ID', this.t('TYPE_LABEL'), this.t('CAPACITY_LABEL'), this.t('UNIT_LABEL')],
      ...rows.map(t => [t.id, t.type, t.capacity, this.t(this.loadingUnit.toUpperCase()) || this.loadingUnit])
    ].map(e => e.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'types-vehicules.csv';
    link.click();
  }

  exportExcel() {
    const data = this.pagedTypeTruckData?.data.map(t => ({
      ID: t.id,
      [this.t('TYPE_LABEL')]: t.type,
      [this.t('CAPACITY_LABEL')]: t.capacity,
      [this.t('UNIT_LABEL')]: this.t(this.loadingUnit.toUpperCase()) || this.loadingUnit
    })) || [];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = {
      Sheets: { 'TypesVehicules': worksheet },
      SheetNames: ['TypesVehicules']
    };

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const blob = new Blob([excelBuffer], {
      type: 'application/octet-stream'
    });

    saveAs(blob, 'types-vehicules.xlsx');
  }

  exportPDF() {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text(this.t('TYPE_TRUCK_LIST_TITLE'), 14, 22);
    doc.setFontSize(10);
    doc.text(`${this.t('GENERATED_ON')}: ${new Date().toLocaleDateString('fr-FR')}`, 14, 30);

    const rows = this.pagedTypeTruckData?.data || [];

    autoTable(doc, {
      startY: 35,
      head: [['ID', this.t('TYPE_LABEL'), this.t('CAPACITY_LABEL'), this.t('UNIT_LABEL')]],
      body: rows.map(t => [t.id.toString(), t.type, t.capacity.toString(), this.t(this.loadingUnit.toUpperCase()) || this.loadingUnit]),
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    doc.save('types-vehicules.pdf');
  }
}