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
import { IOvertimeSetting } from '../../types/overtime';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OvertimeForm } from './overtime-form/overtime-form';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Auth } from '../../services/auth';
import { CommonModule } from '@angular/common';
import { Translation } from '../../services/Translation';
import Swal from 'sweetalert2';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-overtime',
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
    MatCheckboxModule,
    MatIconModule
  ],
  templateUrl: './overtime.html',
  styleUrls: ['./overtime.scss']
})
export class Overtime implements OnInit {
  constructor(public auth: Auth) {}

  httpService = inject(Http);
  pagedOvertimeData!: PagedData<IOvertimeSetting>;
  totalData!: number;

  private translation = inject(Translation);
  t(key: string): string { return this.translation.t(key); }

  filter: any = {
    pageIndex: 0,
    pageSize: 10,
    search: '',
    driverId: null,
    isActive: null
  };

  searchControl = new FormControl('');
  isActiveControl = new FormControl<boolean | null>(null);

  readonly dialog = inject(MatDialog);

  // ✅ Change to getter so translations are evaluated when accessed
  get showCols() {
    return [
      { key: 'driverName', label: this.t('DRIVER') },
      {
        key: 'isActive', 
        label: this.t('DRIVER_STATUS'),
        format: (row: any) => {
          const value = row.isActive;
          return value ?
            '<span class="status-badge status-active">' + this.t('ACTIVE') + '</span>' :
            '<span class="status-badge status-inactive">' + this.t('INACTIVE') + '</span>';
        }
      },
      {
        key: 'maxDailyHours', 
        label: this.t('MAX_DAILY_HOURS'),
        format: (row: any) => {
          const value = row.maxDailyHours;
          if (value === null || value === undefined) return '-';
          return `${Number(value).toFixed(1)}h`;
        }
      },
      {
        key: 'maxWeeklyHours', 
        label: this.t('MAX_WEEKLY_HOURS'),
        format: (row: any) => {
          const value = row.maxWeeklyHours;
          if (value === null || value === undefined) return '-';
          return `${Number(value).toFixed(1)}h`;
        }
      },
      {
        key: 'overtimeRatePerHour', 
        label: this.t('OVERTIME_RATE_PER_HOUR'),
        format: (row: any) => {
          const value = row.overtimeRatePerHour;
          if (value === null || value === undefined) return '-';
          return `${Number(value).toFixed(2)} ${this.t('DINAR_PER_HOUR')}`;
        }
      },
      {
        key: 'weekendRateMultiplier', 
        label: this.t('WEEKEND_RATE_MULTIPLIER'),
        format: (row: any) => {
          const value = row.weekendRateMultiplier;
          if (value === null || value === undefined) return '-';
          return `×${Number(value).toFixed(2)}`;
        }
      },
      {
        key: 'holidayRateMultiplier', 
        label: this.t('HOLIDAY_RATE_MULTIPLIER'),
        format: (row: any) => {
          const value = row.holidayRateMultiplier;
          if (value === null || value === undefined) return '-';
          return `×${Number(value).toFixed(2)}`;
        }
      },
      {
        key: 'Action',
        format: (row: any) => [
          this.t('ACTION_EDIT'),
          this.t('ACTION_DELETE'),
          row.isActive ? this.t('ACTION_DEACTIVATE') : this.t('ACTION_ACTIVATE')
        ]
      }
    ];
  }

  getActions(row: any, actions: string[]) {
    const permittedActions: string[] = [];

    for (const a of actions) {
      if (a === this.t('ACTION_EDIT') && this.auth.hasPermission('OVERTIME_EDIT')) {
        permittedActions.push(a);
      }
      if (a === this.t('ACTION_DELETE') && this.auth.hasPermission('OVERTIME_DISABLE')) {
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

    this.isActiveControl.valueChanges.subscribe((value: boolean | null) => {
      this.filter.isActive = value;
      this.filter.pageIndex = 0;
      this.getLatestData();
    });
  }

  getLatestData() {
    const params = this.buildParams();
    this.httpService.getOvertimeSettings(params).subscribe(result => {
      this.pagedOvertimeData = result;
      this.totalData = result.totalData;
    });
  }

  private buildParams() {
    const params: any = {
      pageIndex: this.filter.pageIndex,
      pageSize: this.filter.pageSize
    };

    if (this.filter.search) params.search = this.filter.search;
    if (this.filter.isActive !== null) params.isActive = this.filter.isActive;

    return params;
  }

  add() {
    this.openDialog();
  }

  edit(overtime: IOvertimeSetting) {
    const ref = this.dialog.open(OvertimeForm, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: ['dialog-overlay', 'wide-dialog'],
      data: { overtimeId: overtime.id }
    });

    ref.afterClosed().subscribe(() => this.getLatestData());
  }

  delete(overtime: IOvertimeSetting) {
    Swal.fire({
      title: this.t('CONFIRMATION'),
      text: `${this.t('DELETE_CONFIRM_OVERTIME')} ${overtime.driverName} ?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: this.t('YES_DELETE'),
      cancelButtonText: this.t('CANCEL')
    }).then((result) => {
      if (result.isConfirmed) {
        this.httpService.deleteOvertimeSetting(overtime.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: this.t('SUCCESS'),
              text: this.t('DELETE_SUCCESS_OVERTIME'),
              timer: 2000,
              showConfirmButton: false
            });
            this.getLatestData();
          },
          error: (err) => {
            console.error('Error deleting overtime setting:', err);
            Swal.fire({
              icon: 'error',
              title: this.t('ERROR'),
              text: err?.error?.message || this.t('DELETE_ERROR_OVERTIME'),
              confirmButtonText: 'OK'
            });
          }
        });
      }
    });
  }

  toggleStatus(overtime: IOvertimeSetting) {
    const action = overtime.isActive ? 'deactivate' : 'activate';
    const confirmText = overtime.isActive ? this.t('TOGGLE_CONFIRM_DEACTIVATE') : this.t('TOGGLE_CONFIRM_ACTIVATE');
    const successText = overtime.isActive ? this.t('TOGGLE_SUCCESS_DEACTIVATE') : this.t('TOGGLE_SUCCESS_ACTIVATE');
    const actionLabel = overtime.isActive ? this.t('ACTION_DEACTIVATE') : this.t('ACTION_ACTIVATE');
    
    Swal.fire({
      title: this.t('CONFIRMATION'),
      text: `${confirmText} ${overtime.driverName} ?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: overtime.isActive ? '#d33' : '#28a745',
      cancelButtonColor: '#3085d6',
      confirmButtonText: actionLabel,
      cancelButtonText: this.t('CANCEL')
    }).then((result) => {
      if (result.isConfirmed) {
        this.httpService.toggleOvertimeStatus(overtime.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: this.t('SUCCESS'),
              text: successText,
              timer: 2000,
              showConfirmButton: false
            });
            this.getLatestData();
          },
          error: (err) => {
            console.error('Error toggling overtime status:', err);
            Swal.fire({
              icon: 'error',
              title: this.t('ERROR'),
              text: err?.error?.message || this.t('TOGGLE_ERROR'),
              confirmButtonText: 'OK'
            });
          }
        });
      }
    });
  }

  openDialog(): void {
    const ref = this.dialog.open(OvertimeForm, {
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
    const activateLabel = this.t('ACTION_ACTIVATE');
    const deactivateLabel = this.t('ACTION_DEACTIVATE');
    
    if (event.btn === editLabel) {
      this.edit(event.rowData);
    }

    if (event.btn === deleteLabel) {
      this.delete(event.rowData);
    }

    if (event.btn === activateLabel || event.btn === deactivateLabel) {
      this.toggleStatus(event.rowData);
    }
  }

  exportCSV() {
    const rows = this.pagedOvertimeData?.data || [];
    const csvContent = [
      ['ID', this.t('DRIVER'), this.t('STATUS'), this.t('MAX_DAILY_HOURS'), this.t('MAX_WEEKLY_HOURS'), this.t('OVERTIME_RATE_PER_HOUR'), this.t('WEEKEND_RATE_MULTIPLIER'), this.t('HOLIDAY_RATE_MULTIPLIER'), this.t('NOTES')],
      ...rows.map(d => [
        d.id,
        d.driverName,
        d.isActive ? this.t('ACTIVE') : this.t('INACTIVE'),
        d.maxDailyHours,
        d.maxWeeklyHours,
        d.overtimeRatePerHour,
        d.weekendRateMultiplier || '-',
        d.holidayRateMultiplier || '-',
        d.notes || ''
      ])
    ].map(e => e.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'heures-supplementaires.csv';
    link.click();
  }

  exportExcel() {
    const data = this.pagedOvertimeData?.data.map(d => ({
      ID: d.id,
      [this.t('DRIVER')]: d.driverName,
      [this.t('STATUS')]: d.isActive ? this.t('ACTIVE') : this.t('INACTIVE'),
      [this.t('MAX_DAILY_HOURS')]: d.maxDailyHours,
      [this.t('MAX_WEEKLY_HOURS')]: d.maxWeeklyHours,
      [this.t('OVERTIME_RATE_PER_HOUR')]: d.overtimeRatePerHour,
      [this.t('WEEKEND_RATE_MULTIPLIER')]: d.weekendRateMultiplier || '-',
      [this.t('HOLIDAY_RATE_MULTIPLIER')]: d.holidayRateMultiplier || '-',
      [this.t('NOTES')]: d.notes || ''
    })) || [];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = {
      Sheets: { 'HeuresSupplementaires': worksheet },
      SheetNames: ['HeuresSupplementaires']
    };

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const blob = new Blob([excelBuffer], {
      type: 'application/octet-stream'
    });

    saveAs(blob, 'heures-supplementaires.xlsx');
  }

  exportPDF() {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text(this.t('OVERTIME_LIST_TITLE'), 14, 22);
    doc.setFontSize(10);
    doc.text(`${this.t('GENERATED_ON')}: ${new Date().toLocaleDateString('fr-FR')}`, 14, 30);

    const rows = this.pagedOvertimeData?.data || [];

    autoTable(doc, {
      startY: 35,
      head: [['ID', this.t('DRIVER'), this.t('STATUS'), this.t('MAX_DAILY_HOURS'), this.t('MAX_WEEKLY_HOURS'), this.t('OVERTIME_RATE_PER_HOUR'), this.t('WEEKEND_RATE_MULTIPLIER'), this.t('HOLIDAY_RATE_MULTIPLIER')]],
      body: rows.map(d => [
        d.id.toString(),
        d.driverName,
        d.isActive ? this.t('ACTIVE') : this.t('INACTIVE'),
        d.maxDailyHours.toString(),
        d.maxWeeklyHours.toString(),
        d.overtimeRatePerHour.toFixed(2),
        d.weekendRateMultiplier?.toString() || '-',
        d.holidayRateMultiplier?.toString() || '-'
      ]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    doc.save('heures-supplementaires.pdf');
  }
}