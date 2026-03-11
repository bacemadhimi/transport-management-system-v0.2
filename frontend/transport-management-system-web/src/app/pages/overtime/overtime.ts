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
    MatCheckboxModule
  ],
  templateUrl: './overtime.html',
  styleUrls: ['./overtime.scss']
})
export class Overtime implements OnInit {
      constructor(public auth: Auth) {}

      getActions(row: any, actions: string[]) {
        const permittedActions: string[] = [];

        for (const a of actions) {
          if (a === 'Modifier' && this.auth.hasPermission('OVERTIME_EDIT')) {
            permittedActions.push(a);
          }
          if (a === 'Supprimer' && this.auth.hasPermission('OVERTIME_DISABLE')) {
            permittedActions.push(a);
          }
        }

        return permittedActions;
      }

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

showCols = [

  { key: 'driverName', label: this.t('DRIVER') },
  {
    key: 'isActive', label: this.t('DRIVER_STATUS'),
    format: (row: any) => {
      const value = row.isActive;
      return value ?
        '<span class="status-badge status-active">Actif</span>' :
        '<span class="status-badge status-inactive">Inactif</span>';
    }
  },
  {
    key: 'maxDailyHours', label: this.t('MAX_DAILY_HOURS'),
    format: (row: any) => {
      const value = row.maxDailyHours;
      if (value === null || value === undefined) return '-';
      return `${Number(value).toFixed(1)}h`;
    }
  },
  {
    key: 'maxWeeklyHours', label: this.t('MAX_WEEKLY_HOURS'),
    format: (row: any) => {
      const value = row.maxWeeklyHours;
      if (value === null || value === undefined) return '-';
      return `${Number(value).toFixed(1)}h`;
    }
  },
  {
    key: 'overtimeRatePerHour', label:  this.t('OVERTIME_RATE_PER_HOUR'),
    format: (row: any) => {
      const value = row.overtimeRatePerHour;
      if (value === null || value === undefined) return '-';
      return `${Number(value).toFixed(2)} dinar`;
    }
  },
  {
    key: 'weekendRateMultiplier', label: this.t('WEEKEND_RATE_MULTIPLIER'),
    format: (row: any) => {
      const value = row.weekendRateMultiplier;
      if (value === null || value === undefined) return '-';
      return `×${Number(value).toFixed(2)}`;
    }
  },
  {
    key: 'holidayRateMultiplier', label:this.t('HOLIDAY_RATE_MULTIPLIER'),
    format: (row: any) => {
      const value = row.holidayRateMultiplier;
      if (value === null || value === undefined) return '-';
      return `×${Number(value).toFixed(2)}`;
    }
  },
  {
    key: 'Action',

    format: (row: any) => [this.t('ACTION_EDIT'),
            this.t('ACTION_DELETE'), row.active?
            this.t('ACTION_DEACTIVATE'):
             this.t('ACTION_TOGGLE')
]
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

    this.isActiveControl.valueChanges
      .subscribe((value: boolean | null) => {
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
    if (confirm(`Voulez-vous vraiment supprimer les paramètres d'heures supplémentaires pour ${overtime.driverName}?`)) {
      this.httpService.deleteOvertimeSetting(overtime.id).subscribe(() => {
        alert("Paramètres supprimés avec succès");
        this.getLatestData();
      });
    }
  }

  toggleStatus(overtime: IOvertimeSetting) {
    const action = overtime.isActive ? "désactiver" : "activer";
    if (confirm(`Voulez-vous vraiment ${action} les heures supplémentaires pour ${overtime.driverName}?`)) {
      this.httpService.toggleOvertimeStatus(overtime.id).subscribe(() => {
        alert(`Heures supplémentaires ${action === "activer" ? "activées" : "désactivées"} avec succès`);
        this.getLatestData();
      });
    }
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
      const toggleLabel = this.t('ACTION_TOGGLE');
      if (event.btn === editLabel) {
        this.edit(event.rowData);
      }

      if (event.btn === deleteLabel) {
        this.delete(event.rowData);
      }

      if (
        event.btn === toggleLabel
      ) {
        this.toggleStatus(event.rowData);
      }
    }



  exportCSV() {
    const rows = this.pagedOvertimeData?.data || [];
    const csvContent = [
      ['ID', 'Chauffeur', 'Statut', 'Heures Max/Jour', 'Heures Max/Semaine', 'Taux Heure Sup.', 'Multiplicateur WE', 'Multiplicateur Férié', 'Notes'],
      ...rows.map(d => [
        d.id,
        d.driverName,
        d.isActive ? 'Actif' : 'Inactif',
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
      Chauffeur: d.driverName,
      Statut: d.isActive ? 'Actif' : 'Inactif',
      'Heures Max/Jour': d.maxDailyHours,
      'Heures Max/Semaine': d.maxWeeklyHours,
      'Taux Heure Sup. (dinar)': d.overtimeRatePerHour,
      'Multiplicateur WE': d.weekendRateMultiplier || '-',
      'Multiplicateur Férié': d.holidayRateMultiplier || '-',
      Notes: d.notes || ''
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
    const rows = this.pagedOvertimeData?.data || [];

    autoTable(doc, {
      head: [['ID', 'Chauffeur', 'Statut', 'Max/Jour', 'Max/Semaine', 'Taux dinar/h', 'Multi WE', 'Multi Férié', 'Notes']],
      body: rows.map(d => [
        d.id.toString(),
        d.driverName,
        d.isActive ? 'Actif' : 'Inactif',
        d.maxDailyHours.toString(),
        d.maxWeeklyHours.toString(),
        d.overtimeRatePerHour.toFixed(2),
        d.weekendRateMultiplier?.toString() || '-',
        d.holidayRateMultiplier?.toString() || '-',
        d.notes?.substring(0, 30) || ''
      ])
    });

    doc.save('heures-supplementaires.pdf');
  }
}