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
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { PagedData } from '../../types/paged-data';
import { FuelVendorForm } from './fuel-vendor-form/fuel-vendor-form';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Auth } from '../../services/auth';
import { CommonModule } from '@angular/common';
import { Translation } from '../../services/Translation';
import Swal from 'sweetalert2';
import { MatIconModule } from '@angular/material/icon';

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
    MatFormFieldModule,
    MatIconModule
  ],
  templateUrl: './fuel-vendor.html',
  styleUrls: ['./fuel-vendor.scss']
})
export class FuelVendor implements OnInit {
  constructor(public auth: Auth) {}

  httpService = inject(Http);
  pagedFuelVendorData!: PagedData<IFuelVendor>;
  totalData!: number;

  private translation = inject(Translation);
  t(key: string): string { return this.translation.t(key); }

  filter: any = {
    pageIndex: 0,
    pageSize: 10
  };

  searchControl = new FormControl('');
  readonly dialog = inject(MatDialog);

  get showCols() {
    return [
      { key: 'name', label: this.t('VENDOR_NAME') },
      {
        key: 'Action',
        format: () => [this.t('ACTION_EDIT'), this.t('ACTION_DELETE')]
      }
    ];
  }

  getActions(row: any, actions: string[]) {
    const permittedActions: string[] = [];

    for (const a of actions) {
      if (a === this.t('ACTION_EDIT') && this.auth.hasPermission('FUEL_VENDOR_EDIT')) {
        permittedActions.push(a);
      }
      if (a === this.t('ACTION_DELETE') && this.auth.hasPermission('FUEL_VENDOR_DISABLE')) {
        permittedActions.push(a);
      }
    }

    return permittedActions;
  }

  ngOnInit() {
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
    Swal.fire({
      title: this.t('CONFIRMATION'),
      text: `${this.t('FUEL_VENDOR_DELETE_CONFIRM')} "${vendor.name}" ?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: this.t('YES_DELETE'),
      cancelButtonText: this.t('CANCEL')
    }).then((result) => {
      if (result.isConfirmed) {
        this.httpService.deleteFuelVendor(vendor.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: this.t('SUCCESS'),
              text: this.t('FUEL_VENDOR_DELETE_SUCCESS'),
              timer: 2000,
              showConfirmButton: false
            });
            this.getLatestData();
          },
          error: (err) => {
            console.error('Error deleting fuel vendor:', err);
            Swal.fire({
              icon: 'error',
              title: this.t('ERROR'),
              text: err?.error?.message || this.t('FUEL_VENDOR_DELETE_ERROR'),
              confirmButtonText: this.t('OK')
            });
          }
        });
      }
    });
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
    const rows = this.pagedFuelVendorData?.data || [];

    const escape = (v: any) => {
      if (v === null || v === undefined) return '""';
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    };

    const csvContent = [
      ['ID', this.t('VENDOR_NAME')],
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

    const excelData = data.map(v => ({
      ID: v.id,
      [this.t('VENDOR_NAME')]: v.name
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
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

    doc.setFontSize(16);
    doc.text(this.t('FUEL_VENDOR_LIST_TITLE'), 14, 22);
    doc.setFontSize(10);
    doc.text(`${this.t('GENERATED_ON')}: ${new Date().toLocaleDateString('fr-FR')}`, 14, 30);

    const rows = this.pagedFuelVendorData?.data || [];

    autoTable(doc, {
      startY: 35,
      head: [['ID', this.t('VENDOR_NAME')]],
      body: rows.map(r => [r.id, r.name]),
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    doc.save('fournisseurs_carburant.pdf');
  }
}