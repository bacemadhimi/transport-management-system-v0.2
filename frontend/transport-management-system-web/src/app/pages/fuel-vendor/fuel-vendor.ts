import { Component, inject, OnInit } from '@angular/core';
import { Http } from '../../services/http';
import { Table } from '../../components/table/table';
import { IFuelVendor } from '../../types/fuel-vendor';
import { MatButtonModule } from '@angular/material/button';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';

import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { debounceTime } from 'rxjs';
import { PagedData } from '../../types/paged-data';
import { FuelVendorForm } from './fuel-vendor-form/fuel-vendor-form';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Auth } from '../../services/auth';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-fuel-vendor',
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
  templateUrl: './fuel-vendor.html',
  styleUrls: ['./fuel-vendor.scss']
})
export class FuelVendor implements OnInit {
      constructor(public auth: Auth) {}  
    
      getActions(row: any, actions: string[]) {
        const permittedActions: string[] = [];
    
        for (const a of actions) {
          if (a === 'Modifier' && this.auth.hasPermission('FUEL_VENDOR_EDIT')) {
            permittedActions.push(a);
          }
          if (a === 'Supprimer' && this.auth.hasPermission('FUEL_VENDOR_DISABLE')) {
            permittedActions.push(a);
          }
        }
    
        return permittedActions;
      }
      
  httpService = inject(Http);
  pagedFuelVendorData!: PagedData<IFuelVendor>;
  totalData!: number;
  
  filter: any = {
    pageIndex: 0,
    pageSize: 10
  };
  
  searchControl = new FormControl('');
  readonly dialog = inject(MatDialog);

  showCols = [
    
    { key: 'name', label: 'Nom du Fournisseur' },
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
    this.httpService.getFuelVendorsList(this.filter).subscribe(result => {
      this.pagedFuelVendorData = result;
      this.totalData = result.totalData;
    });
  }

  add() {
    this.openDialog();
  }

  edit(vendor: IFuelVendor) {
    const ref = this.dialog.open(FuelVendorForm, {
      panelClass: 'm-auto',
      width: '500px',
      data: { vendorId: vendor.id }
    });

    ref.afterClosed().subscribe(() => this.getLatestData());
  }

  delete(vendor: IFuelVendor) {
    if (confirm(`Voulez-vous vraiment supprimer le fournisseur "${vendor.name}"?`)) {
      this.httpService.deleteFuelVendor(vendor.id).subscribe(() => {
        alert("Fournisseur supprimé avec succès");
        this.getLatestData();
      });
    }
  }

  openDialog(): void {
    const ref = this.dialog.open(FuelVendorForm, {
      panelClass: 'm-auto',
      width: '500px',
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
    const rows = this.pagedFuelVendorData?.data || [];

    const escape = (v: any) => {
      if (v === null || v === undefined) return '""';
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    };

    const csvContent = [
      ['ID', 'Nom du Fournisseur'],
      ...rows.map(r => [r.id, r.name])
    ]
      .map(row => row.map(escape).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'fournisseurs_carburant.csv';
    link.click();
  }

  exportExcel() {
    const data = this.pagedFuelVendorData?.data || [];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = {
      Sheets: { Fournisseurs: worksheet },
      SheetNames: ['Fournisseurs']
    };

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const blob = new Blob([excelBuffer], {
      type: 'application/octet-stream'
    });

    saveAs(blob, 'fournisseurs_carburant.xlsx');
  }

  exportPDF() {
    const doc = new jsPDF();

    const rows = this.pagedFuelVendorData?.data || [];

    autoTable(doc, {
      head: [['ID', 'Nom du Fournisseur']],
      body: rows.map(r => [r.id, r.name])
    });

    doc.save('fournisseurs_carburant.pdf');
  }
}