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
import { Translation } from '../../services/Translation';
import { IGeographicalEntity } from '../../types/general-settings';

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

  // Replace zones with geographical entities
  geographicalEntities: IGeographicalEntity[] = [];

  showCols = [
    { key: 'matricule', label: 'Matricule' },
    { key: 'name', label: 'Nom' },
    { key: 'phone', label: 'Téléphone' },
    { key: 'email', label: 'Email' },
    // Remove adress column since it's not in the interface
    { key: 'contact', label: 'Contact' },
    // Replace zone with geographical entity
    { key: 'entity', label: 'Entité', format: (row: ICustomer) => this.getEntityNames(row.geographicalEntities) },
    { key: 'sourceSystem', label: 'Source' },
    { key: 'Action', format: (row: ICustomer) => [this.t('EDIT'), this.t('DELETE')] }
  ];

  ngOnInit() {
    this.loadGeographicalEntities(); // Load geographical entities instead of zones
    this.getLatestData();

    this.searchControl.valueChanges.pipe(debounceTime(250)).subscribe((value: string | null) => {
      this.filter.search = value;
      this.filter.pageIndex = 0;
      this.getLatestData();
    });
  }

loadGeographicalEntities() {
  this.httpService.getGeographicalEntities().subscribe({
    next: (response: any) => {
      // Handle different response formats
      let entitiesData: IGeographicalEntity[] = [];
      
      if (response && typeof response === 'object') {
        // Check if response has a data property (ApiResponse wrapper)
        if ('data' in response && Array.isArray(response.data)) {
          entitiesData = response.data;
        } 
        // Check if response is directly an array
        else if (Array.isArray(response)) {
          entitiesData = response;
        }
        // Check if response has an items property
        else if ('items' in response && Array.isArray(response.items)) {
          entitiesData = response.items;
        }
      }
      
      this.geographicalEntities = entitiesData;
      console.log('✅ Geographical entities loaded:', this.geographicalEntities.length);
    },
    error: (err) => {
      console.error('Failed to load geographical entities', err);
      this.geographicalEntities = []; // Set empty array on error
    }
  });
}

  // Replace getZoneName with getEntityNames
  getEntityNames(geoEntities?: any[]): string {
    if (!geoEntities || geoEntities.length === 0) return 'Non assigné';
    
    const entityIds = geoEntities.map(ge => ge.geographicalEntityId);
    const entityNames = this.geographicalEntities
      .filter(e => entityIds.includes(e.id))
      .map(e => e.name);
    
    return entityNames.join(', ') || 'Non assigné';
  }

  // Helper method to get entity name by ID
  getEntityName(entityId: number): string {
    const entity = this.geographicalEntities.find(e => e.id === entityId);
    return entity?.name || '';
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
      ['ID', 'Nom', 'Téléphone', 'Email', 'Contact', 'Entité(s)', 'Matricule', 'Source'],
      ...rows.map(d => [
        d.id, 
        d.name, 
        d.phone, 
        d.email, 
        d.contact || '', 
        this.getEntityNames(d.geographicalEntities),
        d.matricule,
        d.sourceSystem
      ])
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
      ID: d.id,
      Nom: d.name,
      Téléphone: d.phone,
      Email: d.email,
      Contact: d.contact || '',
      'Entité(s)': this.getEntityNames(d.geographicalEntities),
      Matricule: d.matricule,
      Source: d.sourceSystem
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
      head: [['ID', 'Nom', 'Téléphone', 'Email', 'Contact', 'Entité(s)', 'Matricule', 'Source']],
      body: rows.map(d => [
        d.id ?? '',
        d.name ?? '',
        d.phone ?? '',
        d.email ?? '',
        d.contact ?? '',
        this.getEntityNames(d.geographicalEntities),
        d.matricule ?? '',
        d.sourceSystem ?? ''
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