import { Component, OnInit, inject } from '@angular/core';
import { Http } from '../../services/http';
import { Table } from '../../components/table/table';
import { MatButtonModule } from '@angular/material/button';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { DriverForm } from './driver-form/driver-form';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { debounceTime } from 'rxjs';
import { PagedData } from '../../types/paged-data';
import { Router } from '@angular/router';
import { IDriver } from '../../types/driver';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Auth } from '../../services/auth';
import { CommonModule } from '@angular/common';
import { Translation } from '../../services/Translation';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-driver',
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
  templateUrl: './driver.html',
  styleUrls: ['./driver.scss']
})
export class Driver implements OnInit {
  constructor(public auth: Auth) {}
  
  private translation = inject(Translation);
  private sanitizer = inject(DomSanitizer);
  t(key:string):string { return this.translation.t(key); }

  httpService = inject(Http);
  pagedDriverData!: PagedData<IDriver>;
  totalData!: number;
  router = inject(Router);
  readonly dialog = inject(MatDialog);

  filter: any = { pageIndex: 0, pageSize: 10 };
  searchControl = new FormControl('');
  showDisabled: boolean = false;

  showCols = [
    {
      key: 'imageBase64',
      label: 'Photo',
      format: (row: IDriver) => this.getImage(row.imageBase64)
    },
    { key: 'name', label: this.t('TABLE_NAME') },
    { key: 'email', label: this.t('TABLE_EMAIL') },
    { key: 'permisNumber', label: this.t('TABLE_LICENSE_NUMBER') },
    { key: 'phone', label: this.t('TABLE_PHONE') },
    { key: 'status', label: this.t('TABLE_STATUS') },
    
    {
      key: 'Action',
      format: (row: IDriver) =>
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
    this.httpService.getDriversList(this.filter).subscribe(result => {
      this.pagedDriverData = result;
      this.totalData = result.totalData;
    });
  }

  toggleListe(checked: boolean) {
    this.showDisabled = checked;
    if (checked) this.loadDisabledDrivers();
    else this.loadActiveDrivers();
  }

  loadActiveDrivers() {
    this.httpService.getDriversList(this.filter).subscribe(result => {
      this.pagedDriverData = result;
      this.totalData = result.totalData;
    });
  }

  loadDisabledDrivers() {
    this.httpService.getdisableDriver(this.filter).subscribe(result => {
      this.pagedDriverData = result;
      this.totalData = result.totalData;
    });
  }

 add() { 
  this.openDialog(); 
}

edit(driver: IDriver) {
  const ref = this.dialog.open(DriverForm, { 
    panelClass: 'm-auto', 
    data: { driverId: driver.id },
    width: '600px',  
    maxWidth: '90vw', 
    disableClose: false 
  });
  ref.afterClosed().subscribe(() => this.getLatestData());
}

openDialog() {
  const ref = this.dialog.open(DriverForm, { 
    panelClass: 'm-auto', 
    data: {},
    width: '600px',
    maxWidth: '90vw'
  });
  ref.afterClosed().subscribe(() => this.getLatestData());
}

  delete(driver: IDriver) {
    if (confirm(`Voulez-vous vraiment supprimer le chauffeur ${driver.name}?`)) {
      this.httpService.deleteDriver(driver.id).subscribe(() => {
        alert("Chauffeur supprimé avec succès");
        this.getLatestData();
      });
    }
  }

  pageChange(event: any) {
    this.filter.pageIndex = event.pageIndex;
    this.getLatestData();
  }

  onRowClick(event: any) {
    const driver: IDriver = event.rowData;
    const btnLabel = event.btn; 

    if (btnLabel === this.t('ACTION_EDIT')) this.edit(driver);
    if (btnLabel === this.t('ACTION_ENABLE')) this.enable(driver);
    if (btnLabel === this.t('ACTION_DISABLE') && !this.showDisabled) this.disable(driver);
  }

  enable(driver: IDriver) {
    if (confirm(this.t('CONFIRM_ENABLE_DRIVER').replace('{{name}}', driver.name))) {
      this.httpService.enableDriver(driver.id).subscribe(() => {
        alert(this.t('SUCCESS_DRIVER_ENABLED'));
        this.showDisabled = false;
        this.loadActiveDrivers();
      });
    }
  }

  disable(driver: IDriver) {
    if (confirm(this.t('CONFIRM_DISABLE_DRIVER').replace('{{name}}', driver.name))) {
      this.httpService.disableDriver(driver.id).subscribe(() => {
        alert(this.t('SUCCESS_DRIVER_DISABLED'));
        this.getLatestData();
      });
    }
  }

  // ✅ MÉTHODE getImage() - IDENTIQUE AU CAMION
  getImage(base64?: string | null): SafeHtml {
    if (!base64) {
      return this.sanitizer.bypassSecurityTrustHtml(`
        <span style="color:#999">—</span>
      `);
    }

    return this.sanitizer.bypassSecurityTrustHtml(`
      <img 
        src="data:image/jpeg;base64,${base64}" 
        style="width:60px;height:40px;object-fit:cover;border-radius:4px;border:1px solid #e9ecef;"
        alt="Photo chauffeur"
        onerror="this.style.display='none'; this.parentElement.innerHTML='<span style=\\'color:#999\\'>—</span>';"
      />
    `);
  }

  exportCSV() {
    const rows = this.pagedDriverData?.data || [];
    
    const csvContent = [
      ['ID', 'Nom', 'Email', 'Permis', 'Téléphone', 'Status', 'Photo'],
      ...rows.map(d => [
        d.id,
        d.name,
        d.email || '',
        d.permisNumber,
        d.phone || '',
        d.status,
        d.imageBase64 ? 'Oui' : 'Non'
      ])
    ].map(e => e.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'chauffeurs.csv';
    link.click();
  }

  exportExcel() {
    const data = this.pagedDriverData?.data || [];
    
    const excelData = data.map(d => ({
      ID: d.id,
      Nom: d.name,
      Email: d.email || '',
      'Permis': d.permisNumber,
      Téléphone: d.phone || '',
      Status: d.status,
      Photo: d.imageBase64 ? 'Présente' : 'Absente'
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = { Sheets: { Chauffeurs: worksheet }, SheetNames: ['Chauffeurs'] };
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'chauffeurs.xlsx');
  }

  exportPDF() {
    const doc = new jsPDF();
    const rows = this.pagedDriverData?.data || [];
    
    autoTable(doc, {
      head: [['ID', 'Nom', 'Email', 'Permis', 'Téléphone', 'Status', 'Photo']],
      body: rows.map(d => [
        d.id,
        d.name,
        d.email || '',
        d.permisNumber,
        d.phone || '',
        d.status,
        d.imageBase64 ? 'Oui' : 'Non'
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 }
    });
    
    doc.save('chauffeurs.pdf');
  }
}