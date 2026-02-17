import { ZoneComponent } from './../zone/zone';
import { Component, inject, OnInit } from '@angular/core';
import { Http } from '../../services/http';
import { Table } from '../../components/table/table';
import { ICustomer } from '../../types/customer';
import { MatButtonModule } from '@angular/material/button';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { debounceTime } from 'rxjs';
import { PagedData } from '../../types/paged-data';
import { CustomerFormComponent } from './customer-form/customer-form';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Auth } from '../../services/auth';
import { CommonModule } from '@angular/common';
import { IZone } from '../../types/zone';
import { Translation } from '../../services/Translation';

@Component({
  selector: 'app-customers',
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
  templateUrl: './customer.html',
  styleUrls: ['./customer.scss']
})
export class Customer implements OnInit {
  constructor(public auth: Auth) {}

  httpService = inject(Http);
  pagedCustomerData!: PagedData<ICustomer>;
  totalData!: number;

  filter: any = {
    pageIndex: 0,
    pageSize: 20,
    sourceSystem: null
  };

  searchControl = new FormControl('');
  readonly dialog = inject(MatDialog);

  zones: IZone[] = []; // All zones

  showCols = [
    { key: 'matricule', label: 'Matricule' },
    { key: 'name', label: 'Nom' },
    { key: 'phone', label: 'Téléphone' },
    { key: 'email', label: 'Email' },
    { key: 'adress', label: 'Adresse', format: (row: ICustomer) => row.adress || 'N/A' },
    
    { key: 'contact', label: 'Contact' },
    { key: 'zone', label: 'Zone', format: (row: ICustomer) => this.getZoneName(row.zoneId) },
    { key: 'city', label: 'Ville' },
    { key: 'sourceSystem', label: 'Source' },
    //{ key: 'Action', format: () => ['Modifier', 'Supprimer'] }
      {key: 'Action',format: (row: ICustomer) => [this.t('EDIT'), this.t('DELETE')]}
  ];

  ngOnInit() {
    this.loadZones(); // Load all zones
    this.getLatestData();

    this.searchControl.valueChanges.pipe(debounceTime(250)).subscribe((value: string | null) => {
      this.filter.search = value;
      this.filter.pageIndex = 0;
      this.getLatestData();
    });
  }

  loadZones() {
    this.httpService.getActiveZones().subscribe({
      next: (res) => {
        // Assuming your API returns { success: true, message: '', data: IZone[] }
        this.zones = res.data || [];
      },
      error: (err) => {
        console.error('Failed to load zones', err);
      }
    });
  }

  getZoneName(zoneId?: number): string {
    return this.zones.find(z => z.id === zoneId)?.name || '';
  }

  getLatestData() {
    this.httpService.getCustomersList(this.filter).subscribe(result => {
      this.pagedCustomerData = result;
      this.totalData = result.totalData;
    });
  }

  add() {
    this.openDialog();
  }

  edit(customer: ICustomer) {
    const ref = this.dialog.open(CustomerFormComponent, {
      panelClass: 'm-auto',
      data: { customerId: customer.id }
    });

    ref.afterClosed().subscribe(() => this.getLatestData());
  }

  // delete(customer: ICustomer) {
  //   if (confirm(`Voulez-vous vraiment supprimer le client ${customer.name}?`)) {
  //     this.httpService.deleteCustomer(customer.id).subscribe(() => {
  //       alert('Client supprimé avec succès');
  //       this.getLatestData();
  //     });
  //   }
  // }

  delete(customer: ICustomer) {
  const confirmMessage = this.t('CONFIRM_DELETE_CUSTOMER')
    .replace('{{name}}', customer.name);

  if (confirm(confirmMessage)) {
    this.httpService.deleteCustomer(customer.id).subscribe({
      next: () => {
        this.showSuccess(this.t('CUSTOMER_DELETED_SUCCESS'));
        this.getLatestData();
      },
      error: (error) => {
        console.error('Error deleting customer:', error);
        this.showError(this.t('CUSTOMER_DELETE_FAILED'));
      }
    });
  }
}

  private showSuccess(message: string): void {
    alert(message);
  }
    private showError(message: string): void {
    alert(message);
  }
  
  openDialog(): void {
    const ref = this.dialog.open(CustomerFormComponent, {
      panelClass: 'm-auto',
      data: {}
    });

    ref.afterClosed().subscribe(() => this.getLatestData());
  }

  pageChange(event: any) {
    this.filter.pageIndex = event.pageIndex;
    this.getLatestData();
  }

  // onRowClick(event: any) {
  //   if (event.btn === 'Modifier') this.edit(event.rowData);
  //   if (event.btn === 'Supprimer') this.delete(event.rowData);
  // }

  
  onRowClick(event: any) {
  const editLabel = this.t('EDIT');
  const deleteLabel = this.t('DELETE');

  switch(event.btn) {
    case editLabel:
      this.edit(event.rowData);
      break;
    case deleteLabel:
      this.delete(event.rowData);
      break;
  }
}

  exportCSV() {
    const rows = this.pagedCustomerData?.data || [];
    const csvContent = [
      ['ID', 'Nom', 'Téléphone', 'Email', 'Adresse', 'Zone'],
      ...rows.map(d => [d.id, d.name, d.phone, d.email, d.adress, this.getZoneName(d.zoneId)])
    ]
      .map(e => e.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'clients.csv';
    link.click();
  }
 onSourceChange() {
  this.filter.pageIndex = 0; // reset pagination
  this.getLatestData();      // reload customers with new filter
}

  exportExcel() {
    const data = (this.pagedCustomerData?.data || []).map(d => ({
      ...d,
      zone: this.getZoneName(d.zoneId)
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = {
      Sheets: { Clients: worksheet },
      SheetNames: ['Clients']
    };

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'clients.xlsx');
  }

  exportPDF() {
    const doc = new jsPDF();
    const rows = this.pagedCustomerData?.data || [];

    autoTable(doc, {
      head: [['ID', 'Nom', 'Téléphone', 'Email', 'Adresse', 'Matricule', 'City', 'Contact', 'Zone']],
      body: rows.map(d => [
        d.id ?? '',
        d.name ?? '',
        d.phone ?? '',
        d.email ?? '',
        d.adress ?? '',
        d.matricule ?? '',
        d.city ?? '',
        d.contact ?? '',
        this.getZoneName(d.zoneId)
      ])
    });

    doc.save('clients.pdf');
  }

  getActions(row: any, actions: string[]) {
    const permittedActions: string[] = [];
    for (const a of actions) {
      if (a === 'Modifier' && this.auth.hasPermission('CUSTOMER_EDIT')) permittedActions.push(a);
      if (a === 'Supprimer' && this.auth.hasPermission('CUSTOMER_DISABLE')) permittedActions.push(a);
    }
    return permittedActions;
  }
  
  //Call the services to get the translations for the current language
  private translation = inject(Translation);
  t(key: string): string { return this.translation.t(key); }
}
