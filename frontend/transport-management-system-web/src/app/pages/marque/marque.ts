import { Component, inject, OnInit } from '@angular/core';
import { Http } from '../../services/http';
import { Table } from '../../components/table/table';
import { IMarque } from '../../types/marque';
import { MatButtonModule } from '@angular/material/button';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MarqueForm } from './marque-form/marque-form';
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
  selector: 'app-marque',
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
  templateUrl: './marque.html',
  styleUrls: ['./marque.scss']
})
export class Marque implements OnInit {
  constructor(public auth: Auth) {}

  httpService = inject(Http);
  pagedMarqueData!: PagedData<IMarque>;
  totalData!: number;

  private translation = inject(Translation);
  t(key: string): string { return this.translation.t(key); }

  filter: any = {
    pageIndex: 0,
    pageSize: 10,
    search: ''
  };

  searchControl = new FormControl('');
  readonly dialog = inject(MatDialog);

  get showCols() {
    return [
      { key: 'name', label: this.t('MARQUE_NAME_LABEL') },
      {
        key: 'Action',
        format: () => [this.t('ACTION_EDIT'), this.t('ACTION_DELETE')]
      }
    ];
  }

  getActions(row: any, actions: string[]) {
    const permittedActions: string[] = [];
    for (const a of actions) {
      if (a === this.t('ACTION_EDIT') && this.auth.hasPermission('MARQUE_EDIT')) {
        permittedActions.push(a);
      }
      if (a === this.t('ACTION_DELETE') && this.auth.hasPermission('MARQUE_DISABLE')) {
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
    this.httpService.getMarques(this.filter).subscribe(result => {
      this.pagedMarqueData = result;
      this.totalData = result.totalData;
      console.log('Marques loaded:', this.pagedMarqueData);
    });
  }

  add() {
    this.openDialog();
  }

  edit(marque: IMarque) {
    const ref = this.dialog.open(MarqueForm, {
      panelClass: 'm-auto',
      width: '500px',
      data: { marqueId: marque.id }
    });

    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.getLatestData();
      }
    });
  }

  delete(marque: IMarque) {
    Swal.fire({
      title: this.t('CONFIRMATION'),
      text: `${this.t('MARQUE_DELETE_CONFIRM')} "${marque.name}" ?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: this.t('YES_DELETE'),
      cancelButtonText: this.t('CANCEL')
    }).then((result) => {
      if (result.isConfirmed) {
        this.httpService.deleteMarque(marque.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: this.t('SUCCESS'),
              text: this.t('MARQUE_DELETE_SUCCESS'),
              timer: 2000,
              showConfirmButton: false
            });
            this.getLatestData();
          },
          error: (error) => {
            console.error('Error deleting marque:', error);
            Swal.fire({
              icon: 'error',
              title: this.t('ERROR'),
              text: error.error?.message || this.t('MARQUE_DELETE_ERROR'),
              confirmButtonText: this.t('OK')
            });
          }
        });
      }
    });
  }

  openDialog(): void {
    const ref = this.dialog.open(MarqueForm, {
      panelClass: 'm-auto',
      width: '500px',
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
    const rows = this.pagedMarqueData?.data || [];
    const csvContent = [
      ['ID', this.t('MARQUE_NAME_LABEL')],
      ...rows.map(m => [m.id, m.name])
    ].map(e => e.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'marques.csv';
    link.click();
  }

  exportExcel() {
    const data = this.pagedMarqueData?.data.map(m => ({
      ID: m.id,
      [this.t('MARQUE_NAME_LABEL')]: m.name
    })) || [];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = {
      Sheets: { 'Marques': worksheet },
      SheetNames: ['Marques']
    };

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const blob = new Blob([excelBuffer], {
      type: 'application/octet-stream'
    });

    saveAs(blob, 'marques.xlsx');
  }

  exportPDF() {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text(this.t('MARQUE_LIST_TITLE'), 14, 22);
    doc.setFontSize(10);
    doc.text(`${this.t('GENERATED_ON')}: ${new Date().toLocaleDateString('fr-FR')}`, 14, 30);

    const rows = this.pagedMarqueData?.data || [];

    autoTable(doc, {
      startY: 35,
      head: [['ID', this.t('MARQUE_NAME_LABEL')]],
      body: rows.map(m => [m.id.toString(), m.name]),
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    doc.save('marques.pdf');
  }
}