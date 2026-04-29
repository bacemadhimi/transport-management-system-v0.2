import { Component, inject, OnInit } from '@angular/core';
import { Http } from '../../services/http';
import { Table } from '../../components/table/table';
import { IVendor } from '../../types/vendor';
import { MatButtonModule } from '@angular/material/button';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { VendorForm } from './vendor-form/vendor-form';
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
  selector: 'app-vendor',
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
  templateUrl: './vendor.html',
  styleUrls: ['./vendor.scss']
})
export class Vendor implements OnInit {
  constructor(public auth: Auth) {}

  httpService = inject(Http);
  pagedvendorData!: PagedData<IVendor>;
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
      { key: 'name', label: this.t('NAME') },
      { key: 'email', label: this.t('EMAIL') },
      { key: 'phone', label: this.t('PHONE') },
      {
        key: 'createdDate',
        label: this.t('CREATED_DATE'),
        format: (row: IVendor) => {
          if (!row.createdDate) return this.t('NOT_AVAILABLE');
          const date = new Date(row.createdDate);
          return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
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
      if (a === this.t('ACTION_EDIT') && this.auth.hasPermission('VENDOR_EDIT')) {
        permittedActions.push(a);
      }
      if (a === this.t('ACTION_DELETE') && this.auth.hasPermission('VENDOR_DISABLE')) {
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
    this.httpService.getVendorsList(this.filter).subscribe(result => {
      this.pagedvendorData = result;
      this.totalData = result.totalData;
    });
  }

  add() {
    this.openDialog();
  }

  edit(vendor: IVendor) {
    const ref = this.dialog.open(VendorForm, {
      panelClass: 'm-auto',
      width: '500px',
      data: { vendorId: vendor.id }
    });

    ref.afterClosed().subscribe(() => this.getLatestData());
  }

  delete(vendor: IVendor) {
    Swal.fire({
      title: this.t('CONFIRMATION'),
      text: `${this.t('VENDOR_DELETE_CONFIRM')} "${vendor.name}" ?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: this.t('YES_DELETE'),
      cancelButtonText: this.t('CANCEL')
    }).then((result) => {
      if (result.isConfirmed) {
        this.httpService.deleteVendor(vendor.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: this.t('SUCCESS'),
              text: this.t('VENDOR_DELETE_SUCCESS'),
              timer: 2000,
              showConfirmButton: false
            });
            this.getLatestData();
          },
          error: (err) => {
            console.error('Error deleting vendor:', err);
            Swal.fire({
              icon: 'error',
              title: this.t('ERROR'),
              text: err?.error?.message || this.t('VENDOR_DELETE_ERROR'),
              confirmButtonText: this.t('OK')
            });
          }
        });
      }
    });
  }

  openDialog(): void {
    const ref = this.dialog.open(VendorForm, {
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
    const rows = this.pagedvendorData?.data || [];

    const escape = (v: any) => {
      if (v === null || v === undefined) return '""';
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    };

    const csvContent = [
      ['ID', this.t('NAME'), this.t('EMAIL'), this.t('PHONE'), this.t('CREATED_DATE')],
      ...rows.map(v => [
        v.id,
        v.name,
        v.email,
        v.phone,
        v.createdDate ? new Date(v.createdDate).toLocaleDateString('fr-FR') : this.t('NOT_AVAILABLE')
      ])
    ]
      .map(row => row.map(escape).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'vendeurs.csv';
    link.click();
  }

  exportExcel() {
    const data = this.pagedvendorData?.data.map(v => ({
      ID: v.id,
      [this.t('NAME')]: v.name,
      [this.t('EMAIL')]: v.email,
      [this.t('PHONE')]: v.phone,
      [this.t('CREATED_DATE')]: v.createdDate ? new Date(v.createdDate).toLocaleDateString('fr-FR') : this.t('NOT_AVAILABLE')
    })) || [];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = {
      Sheets: { Vendeurs: worksheet },
      SheetNames: ['Vendeurs']
    };

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const blob = new Blob([excelBuffer], {
      type: 'application/octet-stream'
    });

    saveAs(blob, 'vendeurs.xlsx');
  }

  exportPDF() {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text(this.t('VENDOR_LIST_TITLE'), 14, 22);
    doc.setFontSize(10);
    doc.text(`${this.t('GENERATED_ON')}: ${new Date().toLocaleDateString('fr-FR')}`, 14, 30);

    const rows = this.pagedvendorData?.data || [];

    autoTable(doc, {
      startY: 35,
      head: [['ID', this.t('NAME'), this.t('EMAIL'), this.t('PHONE'), this.t('CREATED_DATE')]],
      body: rows.map(v => [
        v.id,
        v.name,
        v.email,
        v.phone,
        v.createdDate ? new Date(v.createdDate).toLocaleDateString('fr-FR') : this.t('NOT_AVAILABLE')
      ]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    doc.save('vendeurs.pdf');
  }
}