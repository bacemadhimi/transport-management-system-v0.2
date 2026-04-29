import { Component, OnInit, inject } from '@angular/core';
import { Http } from '../../services/http';
import { Table } from '../../components/table/table';
import { MatButtonModule } from '@angular/material/button';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { PagedData } from '../../types/paged-data';
import { Router } from '@angular/router';
import { IFuel } from '../../types/fuel';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FuelForm } from './fuel-form/fuel-form';
import { Auth } from '../../services/auth';
import { CommonModule } from '@angular/common';
import { IMarque } from '../../types/marque';
import { Translation } from '../../services/Translation';
import Swal from 'sweetalert2';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-fuel',
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
  templateUrl: './fuel.html',
  styleUrls: ['./fuel.scss']
})
export class Fuel implements OnInit {
  constructor(public auth: Auth) {}

  httpService = inject(Http);
  pagedFuelData!: PagedData<IFuel>;
  totalData!: number;
  router = inject(Router);
  readonly dialog = inject(MatDialog);
  
  private translation = inject(Translation);
  t(key: string): string { return this.translation.t(key); }
  
  marques: IMarque[] = [];
  marqueMap: Map<number, string> = new Map();

  filter: any = {
    pageIndex: 0,
    pageSize: 10
  };

  searchControl = new FormControl('');

  getActions(row: any, actions: string[]) {
    const permittedActions: string[] = [];

    for (const a of actions) {
      if (a === this.t('ACTION_EDIT') && this.auth.hasPermission('FUEL_EDIT')) {
        permittedActions.push(a);
      }
      if (a === this.t('ACTION_DELETE') && this.auth.hasPermission('FUEL_DISABLE')) {
        permittedActions.push(a);
      }
    }

    return permittedActions;
  }

  getMarqueName(marqueId?: number): string {
    if (!marqueId) return this.t('NOT_AVAILABLE');
    return this.marqueMap.get(marqueId) || `${this.t('BRAND')} #${marqueId}`;
  }

  getTruckDisplayName(row: IFuel): string {
    if (row.truck) {
      const truck = row.truck as any;
      const brandName = this.getMarqueName(truck.marqueTruckId || truck.typeTruck?.marqueTruckId);
      return `${brandName} - ${truck.immatriculation}`;
    }
    return `${this.t('TRUCK')} #${row.truckId}`;
  }

  get showCols() {
    return [
      {
        key: 'truck',
        label: this.t('TRUCK'),
        format: (row: IFuel) => this.getTruckDisplayName(row)
      },
      {
        key: 'driver',
        label: this.t('DRIVER'),
        format: (row: IFuel) => row.driver ? row.driver.name : `${this.t('DRIVER')} #${row.driverId}`
      },
      {
        key: 'fillDate',
        label: this.t('FILL_DATE'),
        format: (row: IFuel) => {
          if (!row.fillDate) return this.t('NOT_AVAILABLE');
          const date = new Date(row.fillDate);
          return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        }
      },
      { key: 'quantity', label: this.t('QUANTITY_L') },
      { key: 'odometerReading', label: this.t('ODOMETER_KM') },
      { 
        key: 'amount', 
        label: this.t('AMOUNT_EUR'),
        format: (row: IFuel) => row.amount ? row.amount.toFixed(2) + ' €' : this.t('NOT_AVAILABLE')
      },
      { key: 'fuelTank', label: this.t('FUEL_TYPE') },
      {
        key: 'fuelVendor',
        label: this.t('VENDOR'),
        format: (row: IFuel) => row.fuelVendor ? row.fuelVendor.name : `${this.t('VENDOR')} #${row.fuelVendorId}`
      },
      {
        key: 'Action',
        format: () => [this.t('ACTION_EDIT'), this.t('ACTION_DELETE')]
      }
    ];
  }

  ngOnInit() {
    this.loadMarques();
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

  private loadMarques(): void {
    this.httpService.getMarqueTrucks().subscribe({
      next: (response) => {
        let marquesData: IMarque[];

        if (response && typeof response === 'object' && 'data' in response) {
          marquesData = (response as any).data;
        } else if (Array.isArray(response)) {
          marquesData = response;
        } else {
          marquesData = [];
        }

        this.marques = marquesData;
        this.marqueMap.clear();
        this.marques.forEach(marque => {
          this.marqueMap.set(marque.id, marque.name);
        });
      },
      error: (error) => {
        console.error('Error loading marques:', error);
      }
    });
  }

  getLatestData() {
    this.httpService.getFuelsList(this.filter).subscribe(result => {
      this.pagedFuelData = result;
      this.totalData = result.totalData;
    });
  }

  add() {
    this.openDialog();
  }

  edit(fuel: IFuel) {
    const ref = this.dialog.open(FuelForm, {
      panelClass: 'm-auto',
      width: '600px',
      data: { fuelId: fuel.id }
    });

    ref.afterClosed().subscribe(() => this.getLatestData());
  }

  delete(fuel: IFuel) {
    const truckInfo = this.getTruckDisplayName(fuel);
    
    Swal.fire({
      title: this.t('CONFIRMATION'),
      text: `${this.t('FUEL_DELETE_CONFIRM')} ${truckInfo} ?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: this.t('YES_DELETE'),
      cancelButtonText: this.t('CANCEL')
    }).then((result) => {
      if (result.isConfirmed) {
        this.httpService.deleteFuel(fuel.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: this.t('SUCCESS'),
              text: this.t('FUEL_DELETE_SUCCESS'),
              timer: 2000,
              showConfirmButton: false
            });
            this.getLatestData();
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: this.t('ERROR'),
              text: err?.message || this.t('FUEL_DELETE_ERROR'),
              confirmButtonText: this.t('OK')
            });
          }
        });
      }
    });
  }

  openDialog(): void {
    const ref = this.dialog.open(FuelForm, {
      panelClass: 'm-auto',
      width: '600px',
      data: {}
    });

    ref.afterClosed().subscribe(() => this.getLatestData());
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
    const rows = this.pagedFuelData?.data || [];

    const csvContent = [
      ['ID', this.t('TRUCK'), this.t('DRIVER'), this.t('FILL_DATE'), this.t('QUANTITY_L'), this.t('ODOMETER_KM'), this.t('AMOUNT_EUR'), this.t('FUEL_TYPE'), this.t('VENDOR'), this.t('COMMENT')],
      ...rows.map(f => [
        f.id,
        this.getTruckDisplayName(f),
        f.driver ? f.driver.name : `${this.t('DRIVER')} #${f.driverId}`,
        f.fillDate ? new Date(f.fillDate).toLocaleDateString('fr-FR') : this.t('NOT_AVAILABLE'),
        f.quantity,
        f.odometerReading,
        f.amount,
        f.fuelTank,
        f.fuelVendor ? f.fuelVendor.name : `${this.t('VENDOR')} #${f.fuelVendorId}`,
        f.comment || ''
      ])
    ]
      .map(e => e.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'carburants.csv';
    link.click();
  }

  exportExcel() {
    const data = this.pagedFuelData?.data.map(f => ({
      ID: f.id,
      [this.t('TRUCK')]: this.getTruckDisplayName(f),
      [this.t('DRIVER')]: f.driver ? f.driver.name : `${this.t('DRIVER')} #${f.driverId}`,
      [this.t('FILL_DATE')]: f.fillDate ? new Date(f.fillDate).toLocaleDateString('fr-FR') : this.t('NOT_AVAILABLE'),
      [this.t('QUANTITY_L')]: f.quantity,
      [this.t('ODOMETER_KM')]: f.odometerReading,
      [this.t('AMOUNT_EUR')]: f.amount,
      [this.t('FUEL_TYPE')]: f.fuelTank,
      [this.t('VENDOR')]: f.fuelVendor ? f.fuelVendor.name : `${this.t('VENDOR')} #${f.fuelVendorId}`,
      [this.t('COMMENT')]: f.comment || ''
    })) || [];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = {
      Sheets: { Carburants: worksheet },
      SheetNames: ['Carburants']
    };

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const blob = new Blob([excelBuffer], {
      type: 'application/octet-stream'
    });

    saveAs(blob, 'carburants.xlsx');
  }

  exportPDF() {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text(this.t('FUEL_REPORT_TITLE'), 14, 22);
    doc.setFontSize(10);
    doc.text(`${this.t('GENERATED_ON')}: ${new Date().toLocaleDateString('fr-FR')}`, 14, 30);

    const rows = this.pagedFuelData?.data || [];

    autoTable(doc, {
      startY: 35,
      head: [['ID', this.t('TRUCK'), this.t('DRIVER'), this.t('DATE'), this.t('QUANTITY_L'), this.t('KM'), this.t('AMOUNT_EUR'), this.t('TYPE'), this.t('VENDOR')]],
      body: rows.map(f => [
        f.id,
        this.getTruckDisplayName(f),
        f.driver ? f.driver.name : `${this.t('DRIVER')} #${f.driverId}`,
        f.fillDate ? new Date(f.fillDate).toLocaleDateString('fr-FR') : this.t('NOT_AVAILABLE'),
        f.quantity,
        f.odometerReading,
        f.amount.toFixed(2),
        f.fuelTank,
        f.fuelVendor ? f.fuelVendor.name : `${this.t('VENDOR')} #${f.fuelVendorId}`
      ]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    const totalQuantity = rows.reduce((sum, f) => sum + (f.quantity || 0), 0);
    const totalAmount = rows.reduce((sum, f) => sum + (f.amount || 0), 0);

    const finalY = (doc as any).lastAutoTable.finalY || 100;
    doc.setFontSize(10);
    doc.text(`${this.t('TOTAL_QUANTITY')}: ${totalQuantity} L`, 14, finalY + 10);
    doc.text(`${this.t('TOTAL_AMOUNT')}: ${totalAmount.toFixed(2)} €`, 14, finalY + 20);

    doc.save('carburants.pdf');
  }
}