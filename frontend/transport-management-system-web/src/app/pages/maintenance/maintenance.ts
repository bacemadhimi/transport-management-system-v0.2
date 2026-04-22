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
import Swal from 'sweetalert2';
import { IMarque } from '../../types/marque';

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
    MatFormFieldModule
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
      if (a === 'Modifier' && this.auth.hasPermission('TRUCK_MAINTENANCE_EDIT')) {
        permittedActions.push(a);
      }
      if (a === 'Supprimer' && this.auth.hasPermission('TRUCK_MAINTENANCE_DISABLE')) {
        permittedActions.push(a);
      }
    }

    return permittedActions;
  }

  getMarqueName(marqueId?: number): string {
    if (!marqueId) return 'N/A';
    return this.marqueMap.get(marqueId) || `Marque #${marqueId}`;
  }

  getTruckDisplayName(row: IMaintenance): string {
    if (row.truck) {
      const truck = row.truck as any;
      const brandName = this.getMarqueName(truck.marqueTruckId || truck.typeTruck?.marqueTruckId);
      return `${brandName} - ${truck.immatriculation}`;
    }
    return `Camion #${row.trip?.truckId || 'N/A'}`;
  }

  showCols = [
    {
      key: 'truck',
      label: 'Camion',
      format: (row: IMaintenance) => this.getTruckDisplayName(row)
    },
    {
      key: 'trip',
      label: 'Mission',
      format: (row: IMaintenance) => row.trip ? `Mission #${row.trip.id} - ${row.trip.bookingId}` : `Mission #${row.tripId}`
    },
    {
      key: 'mechanic',
      label: 'Mécanicien',
      format: (row: IMaintenance) => row.mechanic ? `${row.mechanic.name}` : `Mécanicien #${row.mechanicId}`
    },
    {
      key: 'vendor',
      label: 'Fournisseur',
      format: (row: IMaintenance) => row.vendor ? row.vendor.name : `Fournisseur #${row.vendorId}`
    },
    {
      key: 'status',
      label: 'Statut',
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
      label: 'Date Début',
      format: (row: IMaintenance) => {
        if (!row.startDate) return 'N/A';
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
      label: 'Date Fin',
      format: (row: IMaintenance) => {
        if (!row.endDate) return 'N/A';
        const date = new Date(row.endDate);
        return date.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
    },
    { key: 'odometerReading', label: 'Compteur KM' },
    { 
      key: 'totalCost', 
      label: 'Coût Total (€)',
      format: (row: IMaintenance) => row.totalCost ? row.totalCost.toFixed(2) + ' €' : 'N/A'
    },
    { key: 'partsName', label: 'Pièces' },
    { key: 'quantity', label: 'Quantité' },
    {
      key: 'notificationType',
      label: 'Notification',
      format: (row: IMaintenance) => row.notificationType || 'N/A'
    },
    {
      key: 'Action',
      format: () => ["Modifier", "Supprimer"]
    }
  ];

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
      title: 'Confirmation',
      text: `Voulez-vous vraiment supprimer la maintenance pour ${truckInfo} ?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.httpService.deleteMaintenance(maintenance.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Succès',
              text: 'Maintenance supprimée avec succès',
              timer: 2000,
              showConfirmButton: false
            });
            this.getLatestData();
          },
          error: (err) => {
            console.error('Error deleting maintenance:', err);
            Swal.fire({
              icon: 'error',
              title: 'Erreur',
              text: err?.error?.message || 'Impossible de supprimer la maintenance',
              confirmButtonText: 'OK'
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
    if (event.btn === "Modifier") this.edit(event.rowData);
    if (event.btn === "Supprimer") this.delete(event.rowData);
  }

  exportCSV() {
    const rows = this.pagedMaintenanceData?.data || [];

    const csvContent = [
      ['ID', 'Camion', 'Mission', 'Mécanicien', 'Fournisseur', 'Statut', 'Date Début', 'Date Fin', 'Compteur KM', 'Coût Total (€)', 'Détails Service', 'Pièces', 'Quantité', 'Notification', 'Membres'],
      ...rows.map(m => [
        m.id,
        this.getTruckDisplayName(m),
        m.trip ? `Mission #${m.trip.id} - ${m.trip.destination}` : `Mission #${m.tripId}`,
        m.mechanic ? `${m.mechanic.name} (${m.mechanic.specialization})` : `Mécanicien #${m.mechanicId}`,
        m.vendor ? m.vendor.name : `Fournisseur #${m.vendorId}`,
        m.status,
        m.startDate ? new Date(m.startDate).toLocaleDateString('fr-FR') : 'N/A',
        m.endDate ? new Date(m.endDate).toLocaleDateString('fr-FR') : 'N/A',
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
      Camion: this.getTruckDisplayName(m),
      Mission: m.trip ? `Mission #${m.trip.id} - ${m.trip.destination}` : `Mission #${m.tripId}`,
      Mécanicien: m.mechanic ? `${m.mechanic.name} (${m.mechanic.specialization})` : `Mécanicien #${m.mechanicId}`,
      Fournisseur: m.vendor ? m.vendor.name : `Fournisseur #${m.vendorId}`,
      Statut: m.status,
      'Date Début': m.startDate ? new Date(m.startDate).toLocaleDateString('fr-FR') : 'N/A',
      'Date Fin': m.endDate ? new Date(m.endDate).toLocaleDateString('fr-FR') : 'N/A',
      'Compteur KM': m.odometerReading,
      'Coût Total (€)': m.totalCost,
      'Détails Service': m.serviceDetails || '',
      Pièces: m.partsName || '',
      Quantité: m.quantity,
      Notification: m.notificationType,
      Membres: m.members || ''
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
    doc.text('Rapport des Maintenances', 14, 22);
    doc.setFontSize(10);
    doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 14, 30);

    const rows = this.pagedMaintenanceData?.data || [];

    autoTable(doc, {
      startY: 35,
      head: [['ID', 'Camion', 'Mission', 'Mécanicien', 'Statut', 'Date Début', 'Date Fin', 'Coût (€)']],
      body: rows.map(m => [
        m.id,
        this.getTruckDisplayName(m),
        m.trip ? `Mission #${m.trip.id}` : `#${m.tripId}`,
        m.mechanic ? m.mechanic.name : `Méc #${m.mechanicId}`,
        m.status,
        m.startDate ? new Date(m.startDate).toLocaleDateString('fr-FR') : 'N/A',
        m.endDate ? new Date(m.endDate).toLocaleDateString('fr-FR') : 'N/A',
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
    doc.text(`Coût Total: ${totalCost.toFixed(2)} €`, 14, finalY + 10);
    doc.text(`Maintenances Actives: ${activeMaintenances}`, 14, finalY + 20);
    doc.text(`Maintenances Terminées: ${completedMaintenances}`, 14, finalY + 30);

    doc.save('maintenances.pdf');
  }
}