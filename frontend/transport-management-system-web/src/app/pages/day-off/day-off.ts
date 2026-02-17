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
import { IDayOff } from '../../types/dayoff';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { DayOffForm } from './day-off-form/day-off-form';
import { Auth } from '../../services/auth';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dayoff',
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
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './day-off.html',
  styleUrls: ['./day-off.scss']
})
export class DayOff implements OnInit {
      constructor(public auth: Auth) {}  
    
      getActions(row: any, actions: string[]) {
        const permittedActions: string[] = [];
    
        for (const a of actions) {
          if (a === 'Modifier' && this.auth.hasPermission('DAYOFF_EDIT')) {
            permittedActions.push(a);
          }
          if (a === 'Supprimer' && this.auth.hasPermission('DAYOFF_DISABLE')) {
            permittedActions.push(a);
          }
        }
    
        return permittedActions;
      }
      
  httpService = inject(Http);
  pagedDayOffData!: PagedData<IDayOff>;
  totalData!: number;

  filter: any = {
    pageIndex: 0,
    pageSize: 10,
    search: '',
    country: '',
    year: null
  };

  searchControl = new FormControl('');
  countryControl = new FormControl('');
  yearControl = new FormControl<number | null>(null);

  readonly dialog = inject(MatDialog);

  showCols = [
 
    { key: 'name', label: 'Nom' },
    { key: 'country', label: 'Pays' },
    { 
    key: 'date', 
    label: 'Date',
    format: (row: any) => {
      if (!row || !row.date) return '-';
      
      const date = new Date(row.date);
      if (isNaN(date.getTime())) return '-';
      
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  },
    { key: 'description', label: 'Description' },
    {
      key: 'Action',
      format: () => ["Modifier", "Supprimer"]
    }
  ];

  currentYear = new Date().getFullYear();
  yearOptions = Array.from({length: 10}, (_, i) => this.currentYear - 5 + i);

  ngOnInit() {
    this.getLatestData();
    
    this.searchControl.valueChanges.pipe(debounceTime(250))
      .subscribe((value: string | null) => {
        this.filter.search = value;
        this.filter.pageIndex = 0;
        this.getLatestData();
      });

    this.countryControl.valueChanges.pipe(debounceTime(250))
      .subscribe((value: string | null) => {
        this.filter.country = value;
        this.filter.pageIndex = 0;
        this.getLatestData();
      });

    this.yearControl.valueChanges.pipe(debounceTime(250))
      .subscribe((value: number | null) => {
        this.filter.year = value;
        this.filter.pageIndex = 0;
        this.getLatestData();
      });
  }

  getLatestData() {
    const params = this.buildParams();
    this.httpService.getDayOffs(params).subscribe(result => {
      this.pagedDayOffData = result;
      this.totalData = result.totalData;
    });
  }

  private buildParams() {
    const params: any = {
      pageIndex: this.filter.pageIndex,
      pageSize: this.filter.pageSize
    };

    if (this.filter.search) params.search = this.filter.search;
    if (this.filter.country) params.country = this.filter.country;
    if (this.filter.year) params.year = this.filter.year;

    return params;
  }

  add() {
    this.openDialog();
  }

  edit(dayOff: IDayOff) {
    const ref = this.dialog.open(DayOffForm, {
      panelClass: 'm-auto',
      data: { dayOffId: dayOff.id }
    });

    ref.afterClosed().subscribe(() => this.getLatestData());
  }

  delete(dayOff: IDayOff) {
    if (confirm(`Voulez-vous vraiment supprimer le jour férié "${dayOff.name}"?`)) {
      this.httpService.deleteDayOff(dayOff.id).subscribe(() => {
        alert("Jour férié supprimé avec succès");
        this.getLatestData();
      });
    }
  }

  openDialog(): void {
    const ref = this.dialog.open(DayOffForm, {
      panelClass: 'm-auto',
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
    const rows = this.pagedDayOffData?.data || [];
    const csvContent = [
      ['ID', 'Nom', 'Pays', 'Date', 'Description'],
      ...rows.map(d => [
        d.id,
        d.name,
        d.country,
        new Date(d.date).toLocaleDateString('fr-FR'),
        d.description || ''
      ])
    ].map(e => e.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'jours-feries.csv';
    link.click();
  }

  exportExcel() {
    const data = this.pagedDayOffData?.data.map(d => ({
      ID: d.id,
      Nom: d.name,
      Pays: d.country,
      Date: new Date(d.date).toLocaleDateString('fr-FR'),
      Description: d.description || ''
    })) || [];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = {
      Sheets: { 'JoursFeries': worksheet },
      SheetNames: ['JoursFeries']
    };

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const blob = new Blob([excelBuffer], {
      type: 'application/octet-stream'
    });

    saveAs(blob, 'jours-feries.xlsx');
  }

  exportPDF() {
    const doc = new jsPDF();
    const rows = this.pagedDayOffData?.data || [];

    autoTable(doc, {
      head: [['ID', 'Nom', 'Pays', 'Date', 'Description']],
      body: rows.map(d => [
        d.id.toString(),
        d.name,
        d.country,
        new Date(d.date).toLocaleDateString('fr-FR'),
        d.description || ''
      ])
    });

    doc.save('jours-feries.pdf');
  }
}