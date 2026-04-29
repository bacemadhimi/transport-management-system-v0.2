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
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MaintenanceForm } from './maintenance-form/maintenance-form';
import { IMaintenance } from '../../types/maintenance';
import { Auth } from '../../services/auth';
import { CommonModule } from '@angular/common';
import { Translation } from '../../services/Translation';
import Swal from 'sweetalert2';
import { IMarque } from '../../types/marque';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-maintenance',
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
  templateUrl: './maintenance.html',
  styleUrls: ['./maintenance.scss']
})
export class Maintenance implements OnInit {
  constructor(public auth: Auth) {}

  httpService = inject(Http);
  pagedMaintenanceData!: PagedData<IMaintenance>;
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
      if (a === this.t('ACTION_EDIT') && this.auth.hasPermission('TRUCK_MAINTENANCE_EDIT')) {
        permittedActions.push(a);
      }
      if (a === this.t('ACTION_DELETE') && this.auth.hasPermission('TRUCK_MAINTENANCE_DISABLE')) {
        permittedActions.push(a);
      }
    }

    return permittedActions;
  }

  getMarqueName(marqueId?: number): string {
    if (!marqueId) return this.t('NOT_AVAILABLE');
    return this.marqueMap.get(marqueId) || `${this.t('BRAND')} #${marqueId}`;
  }

  getTruckDisplayName(row: IMaintenance): string {
    if (row.truck) {
      const truck = row.truck as any;
      const brandName = this.getMarqueName(truck.marqueTruckId || truck.typeTruck?.marqueTruckId);
      return `${brandName} - ${truck.immatriculation}`;
    }
    return `${this.t('TRUCK')} #${row.trip?.truckId || this.t('NOT_AVAILABLE')}`;
  }

  get showCols() {
    return [
      {
        key: 'truck',
        label: this.t('TRUCK'),
        format: (row: IMaintenance) => this.getTruckDisplayName(row)
      },
      {
        key: 'trip',
        label: this.t('TRIP'),
        format: (row: IMaintenance) => row.trip ? `${this.t('TRIP')} #${row.trip.id} - ${row.trip.bookingId}` : `${this.t('TRIP')} #${row.tripId}`
      },
      {
        key: 'mechanic',
        label: this.t('MECHANIC'),
        format: (row: IMaintenance) => row.mechanic ? row.mechanic.name : `${this.t('MECHANIC')} #${row.mechanicId}`
      },
      {
        key: 'vendor',
        label: this.t('VENDOR'),
        format: (row: IMaintenance) => row.vendor ? row.vendor.name : `${this.t('VENDOR')} #${row.vendorId}`
      },
      {
        key: 'status',
        label: this.t('STATUS'),
        format: (row: IMaintenance) => {
          const statusColors: { [key: string]: string } = {
            'En cours': 'blue',
            'Terminé': 'green',
            'Planifié': 'orange',
            'Annulé': 'red'
          };
          return `<span class="status-badge status-${statusColors[row.status] || 'gray'}">${row.status}</span>`;
        }
      },
      {
        key: 'startDate',
        label: this.t('START_DATE'),
        format: (row: IMaintenance) => {
          if (!row.startDate) return this.t('NOT_AVAILABLE');
          const date = new Date(row.startDate);
          return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        }
      },
      {
        key: 'endDate',
        label: this.t('END_DATE'),
        format: (row: IMaintenance) => {
          if (!row.endDate) return this.t('NOT_AVAILABLE');
          const date = new Date(row.endDate);
          return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        }
      },
      { key: 'odometerReading', label: this.t('ODOMETER_KM') },
      { 
        key: 'totalCost', 
        label: this.t('TOTAL_COST_EUR'),
        format: (row: IMaintenance) => row.totalCost ? row.totalCost.toFixed(2) + ' €' : this.t('NOT_AVAILABLE')
      },
      { key: 'partsName', label: this.t('PARTS') },
      { key: 'quantity', label: this.t('QUANTITY') },
      {
        key: 'notificationType',
        label: this.t('NOTIFICATION'),
        format: (row: IMaintenance) => row.notificationType || this.t('NOT_AVAILABLE')
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
    this.httpService.getMaintenancesList(this.filter).subscribe(result => {
      this.pagedMaintenanceData = result;
      this.totalData = result.totalData;
    });
  }

  add() {
    this.openDialog();
  }

  edit(maintenance: IMaintenance) {
    const ref = this.dialog.open(MaintenanceForm, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: ['dialog-overlay', 'wide-dialog'],
      data: { maintenanceId: maintenance.id }
    });

    ref.afterClosed().subscribe(() => this.getLatestData());
  }

  delete(maintenance: IMaintenance) {
    const truckInfo = this.getTruckDisplayName(maintenance);
    
    Swal.fire({
      title: this.t('CONFIRMATION'),
      text: `${this.t('MAINTENANCE_DELETE_CONFIRM')} ${truckInfo} ?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: this.t('YES_DELETE'),
      cancelButtonText: this.t('CANCEL')
    }).then((result) => {
      if (result.isConfirmed) {
        this.httpService.deleteMaintenance(maintenance.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: this.t('SUCCESS'),
              text: this.t('MAINTENANCE_DELETE_SUCCESS'),
              timer: 2000,
              showConfirmButton: false
            });
            this.getLatestData();
          },
          error: (err) => {
            console.error('Error deleting maintenance:', err);
            Swal.fire({
              icon: 'error',
              title: this.t('ERROR'),
              text: err?.error?.message || this.t('MAINTENANCE_DELETE_ERROR'),
              confirmButtonText: this.t('OK')
            });
          }
        });
      }
    });
  }

  openDialog(): void {
    const ref = this.dialog.open(MaintenanceForm, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: ['dialog-overlay', 'wide-dialog'],
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
    const rows = this.pagedMaintenanceData?.data || [];

    const csvContent = [
      ['ID', this.t('TRUCK'), this.t('TRIP'), this.t('MECHANIC'), this.t('VENDOR'), this.t('STATUS'), this.t('START_DATE'), this.t('END_DATE'), this.t('ODOMETER_KM'), this.t('TOTAL_COST_EUR'), this.t('SERVICE_DETAILS'), this.t('PARTS'), this.t('QUANTITY'), this.t('NOTIFICATION'), this.t('MEMBERS')],
      ...rows.map(m => [
        m.id,
        this.getTruckDisplayName(m),
        m.trip ? `${this.t('TRIP')} #${m.trip.id} - ${m.trip.destination}` : `${this.t('TRIP')} #${m.tripId}`,
        m.mechanic ? `${m.mechanic.name} (${m.mechanic.specialization})` : `${this.t('MECHANIC')} #${m.mechanicId}`,
        m.vendor ? m.vendor.name : `${this.t('VENDOR')} #${m.vendorId}`,
        m.status,
        m.startDate ? new Date(m.startDate).toLocaleDateString('fr-FR') : this.t('NOT_AVAILABLE'),
        m.endDate ? new Date(m.endDate).toLocaleDateString('fr-FR') : this.t('NOT_AVAILABLE'),
        m.odometerReading,
        m.totalCost,
        m.serviceDetails || '',
        m.partsName || '',
        m.quantity,
        m.notificationType,
        m.members || ''
      ])
    ]
      .map(e => e.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'maintenances.csv';
    link.click();
  }

  exportExcel() {
    const data = this.pagedMaintenanceData?.data.map(m => ({
      ID: m.id,
      [this.t('TRUCK')]: this.getTruckDisplayName(m),
      [this.t('TRIP')]: m.trip ? `${this.t('TRIP')} #${m.trip.id} - ${m.trip.destination}` : `${this.t('TRIP')} #${m.tripId}`,
      [this.t('MECHANIC')]: m.mechanic ? `${m.mechanic.name} (${m.mechanic.specialization})` : `${this.t('MECHANIC')} #${m.mechanicId}`,
      [this.t('VENDOR')]: m.vendor ? m.vendor.name : `${this.t('VENDOR')} #${m.vendorId}`,
      [this.t('STATUS')]: m.status,
      [this.t('START_DATE')]: m.startDate ? new Date(m.startDate).toLocaleDateString('fr-FR') : this.t('NOT_AVAILABLE'),
      [this.t('END_DATE')]: m.endDate ? new Date(m.endDate).toLocaleDateString('fr-FR') : this.t('NOT_AVAILABLE'),
      [this.t('ODOMETER_KM')]: m.odometerReading,
      [this.t('TOTAL_COST_EUR')]: m.totalCost,
      [this.t('SERVICE_DETAILS')]: m.serviceDetails || '',
      [this.t('PARTS')]: m.partsName || '',
      [this.t('QUANTITY')]: m.quantity,
      [this.t('NOTIFICATION')]: m.notificationType,
      [this.t('MEMBERS')]: m.members || ''
    })) || [];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = {
      Sheets: { Maintenances: worksheet },
      SheetNames: ['Maintenances']
    };

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const blob = new Blob([excelBuffer], {
      type: 'application/octet-stream'
    });

    saveAs(blob, 'maintenances.xlsx');
  }

  exportPDF() {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text(this.t('MAINTENANCE_REPORT_TITLE'), 14, 22);
    doc.setFontSize(10);
    doc.text(`${this.t('GENERATED_ON')}: ${new Date().toLocaleDateString('fr-FR')}`, 14, 30);

    const rows = this.pagedMaintenanceData?.data || [];

    autoTable(doc, {
      startY: 35,
      head: [['ID', this.t('TRUCK'), this.t('TRIP'), this.t('MECHANIC'), this.t('STATUS'), this.t('START_DATE'), this.t('END_DATE'), this.t('COST_EUR')]],
      body: rows.map(m => [
        m.id,
        this.getTruckDisplayName(m),
        m.trip ? `${this.t('TRIP')} #${m.trip.id}` : `#${m.tripId}`,
        m.mechanic ? m.mechanic.name : `${this.t('MECHANIC')} #${m.mechanicId}`,
        m.status,
        m.startDate ? new Date(m.startDate).toLocaleDateString('fr-FR') : this.t('NOT_AVAILABLE'),
        m.endDate ? new Date(m.endDate).toLocaleDateString('fr-FR') : this.t('NOT_AVAILABLE'),
        m.totalCost ? m.totalCost.toFixed(2) : '0.00'
      ]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    const totalCost = rows.reduce((sum, m) => sum + (m.totalCost || 0), 0);
    const activeMaintenances = rows.filter(m => m.status === 'En cours' || m.status === 'Planifié').length;
    const completedMaintenances = rows.filter(m => m.status === 'Terminé').length;

    const finalY = (doc as any).lastAutoTable.finalY || 100;
    doc.setFontSize(10);
    doc.text(`${this.t('TOTAL_COST')}: ${totalCost.toFixed(2)} €`, 14, finalY + 10);
    doc.text(`${this.t('ACTIVE_MAINTENANCES')}: ${activeMaintenances}`, 14, finalY + 20);
    doc.text(`${this.t('COMPLETED_MAINTENANCES')}: ${completedMaintenances}`, 14, finalY + 30);

    doc.save('maintenances.pdf');
  }
}