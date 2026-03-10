import { Component, OnInit, inject } from '@angular/core';
import { Http } from '../../services/http';
import { SettingsService } from '../../services/settings.service';
import { Table } from '../../components/table/table';
import { MatButtonModule } from '@angular/material/button';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { EmployeeForm } from './employee-form/employee-form';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { PagedData } from '../../types/paged-data';
import { Router } from '@angular/router';
import { IEmployee } from '../../types/employee';
import { IGeneralSettings } from '../../types/general-settings';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Auth } from '../../services/auth';
import { CommonModule } from '@angular/common';
import { Translation } from '../../services/Translation';
import { MatIconModule } from '@angular/material/icon';
import Swal from 'sweetalert2';

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
  settingsService = inject(SettingsService);
  pagedEmployeeData!: PagedData<IEmployee>;
  totalData!: number;
  router = inject(Router);
  readonly dialog = inject(MatDialog);

  filter: any = { pageIndex: 0, pageSize: 10 };
  searchControl = new FormControl('');
  categoryFilterControl = new FormControl(null);
  showDisabled: boolean = false;

  // Dynamic categories from general settings
  employeeCategories: IGeneralSettings[] = [];
  categoryOptions: { value: string; label: string }[] = [];

  loadingUnit: string = 'tonnes';

showCols = [
  { key: 'idNumber', label: this.t('CUSTOMER_REG_NUMBER') },
  { key: 'name', label: this.t('TABLE_NAME') },
  { key: 'email', label: this.t('Email') },
  { key: 'phoneNumber', label: this.t('TABLE_PHONE') },
  { key: 'drivingLicense', label: this.t('TABLE_LICENSE_NUMBER')},
  { 
    key: 'isInternal', 
    label: this.t('INTERNAL_EMPLOYEE'),
    format: (row: IEmployee) => {
      return row.isInternal ? this.t('YES') : this.t('NO');
    }
  },
  { key: 'employeeCategory', label: this.t('CATEGORY_TABLE')},
  {
    key: 'truckType',
    label: this.t('TYPE_VEHICULE_LABEL'),
    format: (row: IEmployee) => {
      if (!row.typeTruck) return '-';
      
      const capacity = row.typeTruck.capacity || 'N/A';
      const unit =  this.loadingUnit || 'tonnes';
      
      return `${row.typeTruck.type || 'N/A'} (${capacity} ${unit})`;
    }
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
    this.loadSettings();
    this.loadEmployeeCategories();
    this.getLatestData();
    
    // Search filter
    this.searchControl.valueChanges.pipe(
      debounceTime(250),
      distinctUntilChanged()
    ).subscribe((value: string | null) => {
      this.filter.search = value;
      this.filter.pageIndex = 0;
      this.getLatestData();
    });

    // Category filter
    this.categoryFilterControl.valueChanges.pipe(
      debounceTime(250)
    ).subscribe((value: string | null) => {
      if (value) {
        this.filter.employeeCategory = value;
      } else {
        delete this.filter.employeeCategory;
      }
      this.filter.pageIndex = 0;
      this.getLatestData();
    });
  }

  private loadSettings(): void {
    this.settingsService.getOrderSettings().subscribe({
      next: (settings) => {
        this.loadingUnit = settings.loadingUnit || 'tonnes';
      },
      error: (err) => {
        console.error('Error loading settings:', err);
        this.loadingUnit = 'tonnes';
      }
    });

    this.settingsService.orderSettings$.subscribe(settings => {
      if (settings) {
        this.loadingUnit = settings.loadingUnit || 'tonnes';
      }
    });
  }

  // Load employee categories from general settings
  private loadEmployeeCategories(): void {
    this.httpService.getAllSettingsByType('EMPLOYEE_CATEGORY').subscribe({
      next: (categories) => {
        this.employeeCategories = categories;
        this.transformCategoriesToOptions();
      },
      error: (error) => {
        console.error('Error loading employee categories:', error);
        // Fallback to default categories if API fails
        this.categoryOptions = [
          { value: 'DRIVER', label: 'Chauffeurs' },
          { value: 'CONVOYEUR', label: 'Convoyeurs' },
          { value: 'EMPLOYEE', label: 'Employés' }
        ];
      }
    });
  }

  // Transform categories from general settings to dropdown options
  private transformCategoriesToOptions(): void {
    this.categoryOptions = this.employeeCategories.map(category => {
      const code = this.extractCode(category.parameterCode);
      const value = this.extractValue(category.parameterCode);
      
      return {
        value: code, // e.g., "DRIVER"
        label: category.description || code // Use description as label, fallback to code
      };
    });
  }

  // Helper method to extract code from parameterCode (e.g., "DRIVER=Driver" -> "DRIVER")
  private extractCode(parameterCode: string): string {
    return parameterCode.split('=')[0];
  }

  // Helper method to extract value from parameterCode (e.g., "DRIVER=Driver" -> "Driver")
  private extractValue(parameterCode: string): string {
    const parts = parameterCode.split('=');
    return parts.length === 2 ? parts[1] : '';
  }

getLatestData() {
  // Create a clean filter object with all parameters
  const apiFilter: any = {
    pageIndex: this.filter.pageIndex || 0,
    pageSize: this.filter.pageSize || 10
  };
  
  // Add search if present
  if (this.filter.search) {
    apiFilter.search = this.filter.search;
  }
  
  // Add category filter if present
  if (this.filter.employeeCategory) {
    apiFilter.employeeCategory = this.filter.employeeCategory;
  }
  
  // IMPORTANT: Always send isEnable based on showDisabled
  // When showDisabled is true, we want isEnable = false (show disabled)
  // When showDisabled is false, we want isEnable = true (show enabled)
  apiFilter.isEnable = !this.showDisabled;
  
  console.log('Sending to API:', apiFilter);
  
  this.httpService.getEmployeesList(apiFilter).subscribe({
    next: (result) => {
      console.log('API response:', result);
      this.pagedEmployeeData = result;
      this.totalData = result.totalData;
    },
    error: (error) => {
      console.error('Error loading employees:', error);
    }
  });
}
    
toggleListe(checked: boolean) {
  this.showDisabled = checked;
  
  // When checked (true), we want to show disabled employees (isEnable = false)
  // When unchecked (false), we want to show enabled employees (isEnable = true)
  
  this.filter.pageIndex = 0;
  this.getLatestData();
  
  console.log('Toggle changed:', { 
    showDisabled: this.showDisabled,
    isEnable: !this.showDisabled  // This is what will be sent to API
  });
}

  add() {
    this.openDialog();
  }

  edit(employee: IEmployee) {
    const ref = this.dialog.open(EmployeeForm, {
      panelClass: 'm-auto',
      data: { employeeId: employee.id, defaultUnit: this.loadingUnit },
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
      data: { defaultUnit: this.loadingUnit },
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
    if (confirm(`${this.t('EMPLOYEE_DELETE_CONFIRM')} ${employee.name}?`)) {
      this.httpService.deleteEmployee(employee.id).subscribe(() => {
        alert(this.t('EMPLOYEE_DELETE_SUCCESS'));
        this.getLatestData();
      });
    }
  }

onRowClick(event: any) {
  if (event.column === 'attachment' && event.rowData.attachmentFileType) {
    this.viewAttachment(event.rowData);
    return;
  }

  if (event.btn === this.t('ACTION_EDIT')) {
    this.edit(event.rowData);
  } else if (event.btn === this.t('ACTION_DISABLE')) {
    this.disableEmployee(event.rowData);
  } else if (event.btn === this.t('ACTION_ENABLE')) {
    this.enableEmployee(event.rowData);
  }
}
disableEmployee(employee: IEmployee) {
  Swal.fire({
    title: this.t('CONFIRMATION'),
    text: `${this.t('EMPLOYEE_DISABLE_CONFIRM')} ${employee.name}?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: this.t('YES_DISABLE'),
    cancelButtonText: this.t('CANCEL')
  }).then((result) => {
    if (result.isConfirmed) {
      this.httpService.deleteEmployee(employee.id).subscribe({
        next: (response: any) => {
          Swal.fire({
            icon: 'success',
            title: this.t('SUCCESS'),
            text: response.message || this.t('EMPLOYEE_DISABLE_SUCCESS'),
            timer: 2000,
            showConfirmButton: false
          });
          this.getLatestData();
        },
        error: (error) => {
          console.error('Error disabling employee:', error);
          let errorMessage = this.t('EMPLOYEE_DISABLE_ERROR');
          
          if (error.error?.message) {
            errorMessage = error.error.message;
          }
          
          Swal.fire({
            icon: 'error',
            title: this.t('ERROR'),
            text: errorMessage,
            confirmButtonText: this.t('OK')
          });
        }
      });
    }
  });
}

enableEmployee(employee: IEmployee) {
  Swal.fire({
    title: this.t('CONFIRMATION'),
    text: `${this.t('EMPLOYEE_ENABLE_CONFIRM')} ${employee.name}?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#28a745',
    cancelButtonColor: '#3085d6',
    confirmButtonText: this.t('YES_ENABLE'),
    cancelButtonText: this.t('CANCEL')
  }).then((result) => {
    if (result.isConfirmed) {
      this.httpService.enableEmployee(employee.id).subscribe({
        next: (response: any) => {
          Swal.fire({
            icon: 'success',
            title: this.t('SUCCESS'),
            text: response.message || this.t('EMPLOYEE_ENABLE_SUCCESS'),
            timer: 2000,
            showConfirmButton: false
          });
          this.getLatestData();
        },
        error: (error) => {
          console.error('Error enabling employee:', error);
          let errorMessage = this.t('EMPLOYEE_ENABLE_ERROR');
          
          if (error.error?.message) {
            errorMessage = error.error.message;
          }
          
          Swal.fire({
            icon: 'error',
            title: this.t('ERROR'),
            text: errorMessage,
            confirmButtonText: this.t('OK')
          });
        }
      });
    }
  });
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

        if (employee.attachmentFileType && ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'pdf'].includes(employee.attachmentFileType.toLowerCase())) {
          window.open(url, '_blank');
        } else {
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.click();
        }

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
        'Category': emp.employeeCategory,
        'Internal': emp.isInternal ? 'Yes' : 'No',
        'Truck Type': emp.typeTruck ? 
          `${emp.typeTruck.type} (${emp.typeTruck.capacity} ${ this.loadingUnit})` : '-',
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
      ['ID Number', 'Name', 'Email', 'Phone', 'License', 'Category', 'Internal', 'Truck Type', 'Status'],
      ...this.pagedEmployeeData.data.map((emp: IEmployee) => [
        emp.idNumber,
        emp.name,
        emp.email,
        emp.phoneNumber,
        emp.drivingLicense,
        emp.employeeCategory,
        emp.isInternal ? 'Yes' : 'No',
        emp.typeTruck ? 
          `${emp.typeTruck.type} (${emp.typeTruck.capacity} ${ this.loadingUnit})` : '-',
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
    const tableColumn = ['ID Number', 'Name', 'Email', 'Phone', 'License', 'Category', 'Truck Type'];
    const tableRows: any[] = [];

    this.pagedEmployeeData.data.forEach((emp: IEmployee) => {
      tableRows.push([
        emp.idNumber,
        emp.name,
        emp.email,
        emp.phoneNumber,
        emp.drivingLicense,
        emp.employeeCategory,
        emp.typeTruck ? 
          `${emp.typeTruck.type} (${emp.typeTruck.capacity} ${ this.loadingUnit})` : '-'
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