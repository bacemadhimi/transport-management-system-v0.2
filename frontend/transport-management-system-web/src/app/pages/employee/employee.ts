import { Component, OnInit, inject } from '@angular/core';
import { Http } from '../../services/http';
import { Table } from '../../components/table/table';
import { MatButtonModule } from '@angular/material/button';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { EmployeeForm } from './employee-form/employee-form';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { debounceTime } from 'rxjs';
import { PagedData } from '../../types/paged-data';
import { Router } from '@angular/router';
import { IEmployee } from '../../types/employee';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Auth } from '../../services/auth';
import { CommonModule } from '@angular/common';
import { Translation } from '../../services/Translation';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-employee',
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
  templateUrl: './employee.html',
  styleUrls: ['./employee.scss']
})
export class Employee implements OnInit {
  constructor(public auth: Auth) {}
  
  private translation = inject(Translation);
  t(key: string): string { return this.translation.t(key); }

  httpService = inject(Http);
  pagedEmployeeData!: PagedData<IEmployee>;
  totalData!: number;
  router = inject(Router);
  readonly dialog = inject(MatDialog);

  filter: any = { pageIndex: 0, pageSize: 10 };
  searchControl = new FormControl('');
  showDisabled: boolean = false;

  showCols = [
    { key: 'idNumber', label: this.t('CUSTOMER_REG_NUMBER') },
    { key: 'name', label: this.t('TABLE_NAME') },
    { key: 'email', label: this.t('Email') },
    { key: 'phoneNumber', label: this.t('TABLE_PHONE') },
    { key: 'drivingLicense', label: this.t('TABLE_LICENSE_NUMBER')},
    {
      key: 'truckType',
      label: this.t('TYPE_VEHICULE_LABEL'),
    },
    {
      key: 'attachment',
      label: this.t('TABLE_ATTACHMENT'),
      format: (row: IEmployee) => {
        if (row.attachmentFileType) {
          return `<span class="attachment-cell" data-employee-id="${row.id}">
                    ✓ ${row.attachmentFileType} 
                    <span class="view-icon">👁️</span>
                  </span>`;
        }
        return '-';
      }
    },
    {
      key: 'Action',
      format: (row: IEmployee) =>
        row.isEnable
          ? [this.t('ACTION_EDIT'), this.t('ACTION_DISABLE')]
          : [this.t('ACTION_EDIT'), this.t('ACTION_ENABLE')]
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
    this.httpService.getEmployeesList(this.filter).subscribe(result => {
      this.pagedEmployeeData = result;
      this.totalData = result.totalData;
    });
  }

  toggleListe(checked: boolean) {
    this.showDisabled = checked;
    if (checked) this.loadDisabledEmployees();
    else this.loadActiveEmployees();
  }

  loadActiveEmployees() {
    this.httpService.getEmployeesList(this.filter).subscribe(result => {
      this.pagedEmployeeData = result;
      this.totalData = result.totalData;
    });
  }

  loadDisabledEmployees() {
    this.filter.isEnable = false;
    this.httpService.getEmployeesList(this.filter).subscribe(result => {
      this.pagedEmployeeData = result;
      this.totalData = result.totalData;
    });
  }

  add() { 
    this.openDialog(); 
  }

  
  edit(employee: IEmployee) {
    const ref = this.dialog.open(EmployeeForm, { 
      panelClass: 'm-auto', 
      data: { employeeId: employee.id },
      width: '90vw',
      maxWidth: '1200px',
      minWidth: '400px',
      height: 'auto',
      maxHeight: '90vh',
    });
    ref.afterClosed().subscribe(() => this.getLatestData());
  }

  openDialog() {
    const ref = this.dialog.open(EmployeeForm, { 
      data: {},
      panelClass: 'm-auto',
      width: '90vw',
      maxWidth: '1200px',
      minWidth: '400px',
      height: 'auto',
      maxHeight: '90vh',
    });
    ref.afterClosed().subscribe(() => this.getLatestData());
  }

  delete(employee: IEmployee) {
    if (confirm(`Voulez-vous vraiment supprimer l'employé ${employee.name}?`)) {
      this.httpService.deleteEmployee(employee.id).subscribe(() => {
        alert("Employé supprimé avec succès");
        this.getLatestData();
      });
    }
  }

  onRowClick(event: any) {
    console.log('Row clicked:', event);
    
    // Handle attachment column click
    if (event.column === 'attachment' && event.rowData.attachmentFileType) {
      this.viewAttachment(event.rowData);
      return;
    }
    
    if (event.btn === this.t('ACTION_EDIT')) {
        console.log('Edit action triggered for:', event.rowData);
      this.edit(event.rowData);
    } else if (event.btn === this.t('ACTION_DISABLE')) {
      this.delete(event.rowData);
    } else if (event.btn === this.t('ACTION_ENABLE')) {
      if (confirm(`Voulez-vous activer l'employé ${event.rowData.name}?`)) {
        this.httpService.enableEmployee(event.rowData.id).subscribe(() => {
          alert("Employé activé avec succès");
          this.getLatestData();
        });
      }
    }
  }

  pageChange(pageEvent: any) {
    this.filter.pageIndex = pageEvent.pageIndex;
    this.filter.pageSize = pageEvent.pageSize;
    this.getLatestData();
  }

  viewAttachment(employee: IEmployee) {
    if (!employee.id) return;
    
    this.httpService.downloadEmployeeAttachment(employee.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const fileName = employee.attachmentFileName || `employee_${employee.id}_attachment.${employee.attachmentFileType}`;
        
        // Check if it's a viewable file (image or PDF)
        if (employee.attachmentFileType && ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'pdf'].includes(employee.attachmentFileType.toLowerCase())) {
          // Open in new tab for viewing
          window.open(url, '_blank');
        } else {
          // Download the file
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.click();
        }
        
        // Clean up
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
      },
      error: (err) => {
        console.error('Error downloading attachment:', err);
        alert('Erreur lors du téléchargement de la pièce jointe');
      }
    });
  }

  exportExcel() {
    if (!this.pagedEmployeeData?.data?.length) {
      alert('Aucune donnée à exporter');
      return;
    }

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(
      this.pagedEmployeeData.data.map((emp: IEmployee) => ({
        'ID Number': emp.idNumber,
        'Name': emp.name,
        'Email': emp.email,
        'Phone': emp.phoneNumber,
        'License': emp.drivingLicense,
        'Truck Type': emp.typeTruck ? `${emp.typeTruck.type} (${emp.typeTruck.capacity} ${emp.typeTruck.unit})` : '-',
        'Status': emp.isEnable ? 'Active' : 'Inactive'
      }))
    );
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    XLSX.writeFile(wb, 'employees.xlsx');
  }

  exportCSV() {
    if (!this.pagedEmployeeData?.data?.length) {
      alert('Aucune donnée à exporter');
      return;
    }

    const csvData = [
      ['ID Number', 'Name', 'Email', 'Phone', 'License', 'Truck Type', 'Status'],
      ...this.pagedEmployeeData.data.map((emp: IEmployee) => [
        emp.idNumber,
        emp.name,
        emp.email,
        emp.phoneNumber,
        emp.drivingLicense,
        emp.typeTruck ? `${emp.typeTruck.type} (${emp.typeTruck.capacity} ${emp.typeTruck.unit})` : '-',
        emp.isEnable ? 'Active' : 'Inactive'
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'employees.csv');
  }

  exportPDF() {
    if (!this.pagedEmployeeData?.data?.length) {
      alert('Aucune donnée à exporter');
      return;
    }

    const doc = new jsPDF();
    const tableColumn = ['ID Number', 'Name', 'Email', 'Phone', 'License', 'Truck Type'];
    const tableRows: any[] = [];

    this.pagedEmployeeData.data.forEach((emp: IEmployee) => {
      tableRows.push([
        emp.idNumber,
        emp.name,
        emp.email,
        emp.phoneNumber,
        emp.drivingLicense,
        emp.typeTruck ? `${emp.typeTruck.type} (${emp.typeTruck.capacity} ${emp.typeTruck.unit})` : '-'
      ]);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 10
    });

    doc.save('employees.pdf');
  }
}
