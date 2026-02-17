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
import { debounceTime } from 'rxjs';
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
    MatFormFieldModule
  ],
  templateUrl: './fuel.html',
  styleUrls: ['./fuel.scss']
})
export class Fuel implements OnInit {
      constructor(public auth: Auth) {}  
    
      getActions(row: any, actions: string[]) {
        const permittedActions: string[] = [];
    
        for (const a of actions) {
          if (a === 'Modifier' && this.auth.hasPermission('FUEL_EDIT')) {
            permittedActions.push(a);
          }
          if (a === 'Supprimer' && this.auth.hasPermission('FUEL_DISABLE')) {
            permittedActions.push(a);
          }
        }
    
        return permittedActions;
      }
      
  httpService = inject(Http);
  pagedFuelData!: PagedData<IFuel>;
  totalData!: number;

  filter: any = {
    pageIndex: 0,
    pageSize: 10
  };

  searchControl = new FormControl('');
  router = inject(Router);
  readonly dialog = inject(MatDialog);

  showCols = [
 
    { 
      key: 'truck', 
      label: 'Camion',
      format: (row: IFuel) => row.truck ? `${row.truck.brand} - ${row.truck.immatriculation}` : `Camion #${row.truckId}`
    },
    { 
      key: 'driver', 
      label: 'Chauffeur',
      format: (row: IFuel) => row.driver ? row.driver.name : `Chauffeur #${row.driverId}`
    },
    { 
      key: 'fillDate', 
      label: 'Date Remplissage',
      format: (row: IFuel) => {
        if (!row.fillDate) return 'N/A';
        const date = new Date(row.fillDate);
        return date.toLocaleDateString('fr-FR', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        });
      }
    },
    { key: 'quantity', label: 'Quantité (L)' },
    { key: 'odometerReading', label: 'Compteur KM' },
    { key: 'amount', label: 'Montant (€)' },
    { key: 'fuelTank', label: 'Type Carburant' },
    { 
      key: 'fuelVendor', 
      label: 'Fournisseur',
      format: (row: IFuel) => row.fuelVendor ? row.fuelVendor.name : `Fournisseur #${row.fuelVendorId}`
    },
    {
      key: 'Action',
      format: () => ["Modifier", "Supprimer"]
    }
  ];

  ngOnInit() {
    this.getLatestData();
    this.searchControl.valueChanges.pipe(debounceTime(250))
      .subscribe((value: string | null) => {
        this.filter.search = value;
        this.filter.pageIndex = 0;
        this.getLatestData();
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
    const truckInfo = fuel.truck ? `${fuel.truck.brand} - ${fuel.truck.immatriculation}` : `Camion #${fuel.truckId}`;
    if (confirm(`Voulez-vous vraiment supprimer le remplissage de carburant pour ${truckInfo}?`)) {
      this.httpService.deleteFuel(fuel.id).subscribe(() => {
        alert("Remplissage de carburant supprimé avec succès");
        this.getLatestData();
      });
    }
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
    if (event.btn === "Modifier") this.edit(event.rowData);
    if (event.btn === "Supprimer") this.delete(event.rowData);
  }

  exportCSV() {
    const rows = this.pagedFuelData?.data || [];

    const csvContent = [
      ['ID', 'Camion', 'Chauffeur', 'Date Remplissage', 'Quantité (L)', 'Compteur KM', 'Montant (€)', 'Type Carburant', 'Fournisseur', 'Commentaire'],
      ...rows.map(f => [
        f.id,
        f.truck ? `${f.truck.brand} - ${f.truck.immatriculation}` : `Camion #${f.truckId}`,
        f.driver ? f.driver.name : `Chauffeur #${f.driverId}`,
        f.fillDate ? new Date(f.fillDate).toLocaleDateString('fr-FR') : 'N/A',
        f.quantity,
        f.odometerReading,
        f.amount,
        f.fuelTank,
        f.fuelVendor ? f.fuelVendor.name : `Fournisseur #${f.fuelVendorId}`,
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
      Camion: f.truck ? `${f.truck.brand} - ${f.truck.immatriculation}` : `Camion #${f.truckId}`,
      Chauffeur: f.driver ? f.driver.name : `Chauffeur #${f.driverId}`,
      'Date Remplissage': f.fillDate ? new Date(f.fillDate).toLocaleDateString('fr-FR') : 'N/A',
      'Quantité (L)': f.quantity,
      'Compteur KM': f.odometerReading,
      'Montant (€)': f.amount,
      'Type Carburant': f.fuelTank,
      Fournisseur: f.fuelVendor ? f.fuelVendor.name : `Fournisseur #${f.fuelVendorId}`,
      Commentaire: f.comment || ''
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
    
    // Add title
    doc.setFontSize(16);
    doc.text('Rapport des Remplissages Carburant', 14, 22);
    doc.setFontSize(10);
    doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 14, 30);

    const rows = this.pagedFuelData?.data || [];

    autoTable(doc, {
      startY: 35,
      head: [['ID', 'Camion', 'Chauffeur', 'Date', 'Quantité (L)', 'KM', 'Montant (€)', 'Type', 'Fournisseur']],
      body: rows.map(f => [
        f.id,
        f.truck ? `${f.truck.brand}\n${f.truck.immatriculation}` : `Camion #${f.truckId}`,
        f.driver ? f.driver.name : `Chauffeur #${f.driverId}`,
        f.fillDate ? new Date(f.fillDate).toLocaleDateString('fr-FR') : 'N/A',
        f.quantity,
        f.odometerReading,
        f.amount.toFixed(2),
        f.fuelTank,
        f.fuelVendor ? f.fuelVendor.name : `Fournisseur #${f.fuelVendorId}`
      ]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    // Add total summary
    const totalQuantity = rows.reduce((sum, f) => sum + (f.quantity || 0), 0);
    const totalAmount = rows.reduce((sum, f) => sum + (f.amount || 0), 0);
    
    const finalY = (doc as any).lastAutoTable.finalY || 100;
    doc.setFontSize(10);
    doc.text(`Total Quantité: ${totalQuantity} L`, 14, finalY + 10);
    doc.text(`Total Montant: ${totalAmount.toFixed(2)} €`, 14, finalY + 20);

    doc.save('carburants.pdf');
  }
}