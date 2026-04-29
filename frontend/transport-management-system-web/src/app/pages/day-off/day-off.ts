import { Component, OnInit, inject } from '@angular/core';
import { Http } from '../../services/http';
import { HttpClient } from '@angular/common/http';
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
import { Translation } from '../../services/Translation';
import Swal from 'sweetalert2';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../environments/environment';

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
    MatNativeDateModule,
    MatIconModule
  ],
  templateUrl: './day-off.html',
  styleUrls: ['./day-off.scss']
})
export class DayOff implements OnInit {
  constructor(public auth: Auth) {}

  httpService = inject(Http);
  private httpClient = inject(HttpClient);
  pagedDayOffData!: PagedData<IDayOff>;
  totalData!: number;

  private translation = inject(Translation);
  t(key: string): string { return this.translation.t(key); }

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

  get showCols() {
    return [
      { key: 'name', label: this.t('NAME') },
      { key: 'country', label: this.t('COUNTRY') },
      {
        key: 'date',
        label: this.t('DATE'),
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
      { key: 'description', label: this.t('DESCRIPTION') },
      {
        key: 'Action',
        format: () => [this.t('ACTION_EDIT'), this.t('ACTION_DELETE')]
      }
    ];
  }

  getActions(row: any, actions: string[]) {
    const permittedActions: string[] = [];

    for (const a of actions) {
      if (a === this.t('ACTION_EDIT') && this.auth.hasPermission('DAYOFF_EDIT')) {
        permittedActions.push(a);
      }
      if (a === this.t('ACTION_DELETE') && this.auth.hasPermission('DAYOFF_DISABLE')) {
        permittedActions.push(a);
      }
    }

    return permittedActions;
  }

  currentYear = new Date().getFullYear();
  yearOptions = Array.from({length: 10}, (_, i) => this.currentYear - 5 + i);

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

    this.countryControl.valueChanges.pipe(
      debounceTime(250),
      distinctUntilChanged()
    ).subscribe((value: string | null) => {
      this.filter.country = value;
      this.filter.pageIndex = 0;
      this.getLatestData();
    });

    this.yearControl.valueChanges.pipe(
      debounceTime(250),
      distinctUntilChanged()
    ).subscribe((value: number | null) => {
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
      width: '500px',
      data: { dayOffId: dayOff.id }
    });

    ref.afterClosed().subscribe(() => this.getLatestData());
  }

  delete(dayOff: IDayOff) {
    Swal.fire({
      title: this.t('CONFIRMATION'),
      text: `${this.t('DAYOFF_DELETE_CONFIRM')} "${dayOff.name}" ?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: this.t('YES_DELETE'),
      cancelButtonText: this.t('CANCEL')
    }).then((result) => {
      if (result.isConfirmed) {
        this.httpService.deleteDayOff(dayOff.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: this.t('SUCCESS'),
              text: this.t('DAYOFF_DELETE_SUCCESS'),
              timer: 2000,
              showConfirmButton: false
            });
            this.getLatestData();
          },
          error: (err) => {
            console.error('Error deleting day off:', err);
            Swal.fire({
              icon: 'error',
              title: this.t('ERROR'),
              text: err?.error?.message || this.t('DAYOFF_DELETE_ERROR'),
              confirmButtonText: this.t('OK')
            });
          }
        });
      }
    });
  }

  openDialog(): void {
    const ref = this.dialog.open(DayOffForm, {
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

  // ==================== IMPORT PUBLIC HOLIDAYS ====================

  openImportDialog() {
    Swal.fire({
      title: this.t('IMPORT_HOLIDAYS_TITLE'),
      html: `
        <div style="text-align: left;">
          <p style="margin-bottom: 16px; color: #6b7280;">${this.t('IMPORT_HOLIDAYS_DESC')}</p>
          <div style="margin: 16px 0;">
            <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">${this.t('YEAR')}</label>
            <select id="importYear" class="swal2-input" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #d1d5db;">
              <option value="${this.currentYear}">${this.currentYear}</option>
              <option value="${this.currentYear + 1}">${this.currentYear + 1}</option>
            </select>
          </div>
          <div style="margin: 16px 0;">
            <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">${this.t('COUNTRY')}</label>
            <select id="importCountry" class="swal2-input" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #d1d5db;">
              <option value="TN">${this.t('TUNISIA')}</option>
              <option value="FR">${this.t('FRANCE')}</option>
              <option value="DZ">${this.t('ALGERIA')}</option>
              <option value="MA">${this.t('MOROCCO')}</option>
            </select>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: this.t('IMPORT'),
      cancelButtonText: this.t('CANCEL'),
      confirmButtonColor: '#10b981',
      preConfirm: () => {
        const year = (document.getElementById('importYear') as HTMLSelectElement)?.value;
        const country = (document.getElementById('importCountry') as HTMLSelectElement)?.value;
        if (!year || !country) {
          Swal.showValidationMessage(this.t('PLEASE_SELECT_YEAR_COUNTRY'));
          return false;
        }
        return { year, country };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.fetchPublicHolidays(result.value.year, result.value.country);
      }
    });
  }

  fetchPublicHolidays(year: string, countryCode: string) {
    Swal.fire({
      title: this.t('FETCHING_HOLIDAYS'),
      text: this.t('PLEASE_WAIT'),
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`;
    
    this.httpClient.get<any[]>(url).subscribe({
      next: (holidays) => {
        Swal.close();
        
        if (!holidays || holidays.length === 0) {
          Swal.fire({
            icon: 'info',
            title: this.t('NO_HOLIDAYS_FOUND'),
            text: this.t('NO_HOLIDAYS_FOUND_DESC'),
            confirmButtonText: this.t('OK')
          });
          return;
        }

        const previewHtml = holidays.slice(0, 10).map(h => 
          `<tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${h.localName || h.name}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${new Date(h.date).toLocaleDateString('fr-FR')}</td>
          </tr>`
        ).join('');

        Swal.fire({
          title: `${holidays.length} ${this.t('HOLIDAYS_FOUND')}`,
          html: `
            <div style="text-align: left;">
              <p style="margin-bottom: 12px; color: #6b7280;">${this.t('IMPORT_CONFIRM_DESC')}</p>
              <div style="max-height: 250px; overflow-y: auto; margin: 12px 0;">
                <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                  <thead>
                    <tr style="background: #f9fafb;">
                      <th style="padding: 8px; text-align: left; font-weight: 600;">${this.t('NAME')}</th>
                      <th style="padding: 8px; text-align: left; font-weight: 600;">${this.t('DATE')}</th>
                    </tr>
                  </thead>
                  <tbody>${previewHtml}</tbody>
                </table>
                ${holidays.length > 10 ? `<p style="text-align: center; margin-top: 8px; color: #6b7280;">... ${this.t('AND')} ${holidays.length - 10} ${this.t('MORE_HOLIDAYS')}</p>` : ''}
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: this.t('IMPORT'),
          cancelButtonText: this.t('CANCEL'),
          confirmButtonColor: '#10b981'
        }).then((result) => {
          if (result.isConfirmed) {
            this.importHolidaysToBackend(year, countryCode);
          }
        });
      },
      error: (error) => {
        Swal.close();
        console.error('Error fetching holidays:', error);
        Swal.fire({
          icon: 'error',
          title: this.t('ERROR'),
          text: this.t('IMPORT_FETCH_ERROR'),
          confirmButtonText: this.t('OK')
        });
      }
    });
  }

  importHolidaysToBackend(year: string, countryCode: string) {
    Swal.fire({
      title: this.t('IMPORTING'),
      text: this.t('PLEASE_WAIT'),
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.httpClient.post(`${environment.apiUrl}/api/DayOff/import-public-holidays`, {
      year: parseInt(year),
      countryCode: countryCode
    }).subscribe({
      next: (response: any) => {
        Swal.close();
        Swal.fire({
          icon: 'success',
          title: this.t('IMPORT_SUCCESS'),
          text: `${this.t('IMPORTED')}: ${response.importedCount} | ${this.t('SKIPPED')}: ${response.skippedCount}`,
          confirmButtonText: this.t('OK')
        }).then(() => {
          this.getLatestData();
        });
      },
      error: (error) => {
        Swal.close();
        console.error('Error importing holidays:', error);
        Swal.fire({
          icon: 'error',
          title: this.t('ERROR'),
          text: this.t('IMPORT_SAVE_ERROR'),
          confirmButtonText: this.t('OK')
        });
      }
    });
  }

  // ==================== EXPORTS ====================

  exportCSV() {
    const rows = this.pagedDayOffData?.data || [];
    const csvContent = [
      ['ID', this.t('NAME'), this.t('COUNTRY'), this.t('DATE'), this.t('DESCRIPTION')],
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
      [this.t('NAME')]: d.name,
      [this.t('COUNTRY')]: d.country,
      [this.t('DATE')]: new Date(d.date).toLocaleDateString('fr-FR'),
      [this.t('DESCRIPTION')]: d.description || ''
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
    
    doc.setFontSize(16);
    doc.text(this.t('DAYOFF_LIST_TITLE'), 14, 22);
    doc.setFontSize(10);
    doc.text(`${this.t('GENERATED_ON')}: ${new Date().toLocaleDateString('fr-FR')}`, 14, 30);

    const rows = this.pagedDayOffData?.data || [];

    autoTable(doc, {
      startY: 35,
      head: [['ID', this.t('NAME'), this.t('COUNTRY'), this.t('DATE'), this.t('DESCRIPTION')]],
      body: rows.map(d => [
        d.id.toString(),
        d.name,
        d.country,
        new Date(d.date).toLocaleDateString('fr-FR'),
        d.description || ''
      ]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    doc.save('jours-feries.pdf');
  }
}