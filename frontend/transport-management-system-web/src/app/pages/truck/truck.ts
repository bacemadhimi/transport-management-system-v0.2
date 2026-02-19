import { Component, inject, OnInit } from '@angular/core';
import { Http } from '../../services/http';
import { Table } from '../../components/table/table';
import { ITruck } from '../../types/truck';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common'; 
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { TruckForm } from './truck-form/truck-form';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { debounceTime } from 'rxjs';
import { PagedData } from '../../types/paged-data';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Auth } from '../../services/auth';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Translation } from '../../services/Translation';
import { OrderSettingsService } from '../../services/order-settings.service';
import { IMarque } from '../../types/marque';

@Component({
  selector: 'app-truck',
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
  templateUrl: './truck.html',
  styleUrls: ['./truck.scss']
})
export class Truck implements OnInit {
  constructor(public auth: Auth) {}  
  loadingUnit: string = ''; 
  capacityUnits: { value: string; label: string }[] = [];
  marques: IMarque[] = [];
  marqueMap: Map<number, string> = new Map();

  getActions(row: any, actions: string[]) {
    const permittedActions: string[] = [];

    for (const a of actions) {
      if (a === 'Modifier' && this.auth.hasPermission('TRUCK_EDIT')) {
        permittedActions.push(a);
      }
      if (a === 'Supprimer' && this.auth.hasPermission('TRUCK_DISABLE')) {
        permittedActions.push(a);
      }
    }

    return permittedActions;
  }
    
  httpService = inject(Http);
  authService = inject(Auth);
  orderSettingsService = inject(OrderSettingsService); 
  pagedTruckData!: PagedData<ITruck>;
  totalData!: number;
  filter: any = {
    pageIndex: 0,
    pageSize: 10
  };
  searchControl = new FormControl('');
  router = inject(Router);
  readonly dialog = inject(MatDialog);
  private sanitizer = inject(DomSanitizer);

  get showCols() {
    return [
      {
        key: 'immatriculation',
        label: this.t('IMMATRICULATION')
      },
      {
        key: 'marque',
        label: this.t('BRAND_LABEL'),
        format: (row: ITruck) => {
          const marqueName = this.getMarqueName(row.marqueTruckId);
          return marqueName || 'N/A';
        }
      },
      {
        key: 'capacity',
        label: this.t('CAPACITY_LABEL'),
        format: (row: ITruck) => {
          // Get capacity from typeTruck only
          const capacity = row.typeTruck?.capacity || 'N/A';
          const unit = row.typeTruck?.unit || this.loadingUnit || 'tonnes';
          const unitLabel = this.getCapacityUnitLabel(unit);
          
          return this.sanitizer.bypassSecurityTrustHtml(`
            <span style="display:flex; align-items:center; gap:8px;">
              <strong>${capacity} ${unitLabel}</strong>
              <img 
                src="${this.getLoadingUnitImage(unit)}" 
                width="50" 
                height="50" 
                style="object-fit:contain"
                onerror="this.style.display='none'"
              />
            </span>
          `);
        },
        html: true
      },
      {
        key: 'technicalVisitDate',
        label: this.t('DATE_VISITE_TRUCK'),
        format: (row: ITruck) => {
          if (!row.technicalVisitDate) return '';
          const date = new Date(row.technicalVisitDate);
          return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        }
      },
      {
        key: 'status',
        label: this.t('Status'),
        format: (row: any) => {
          let color = '#6b7280';
          let bg = '#f3f4f6';

          switch (row.status?.toLowerCase()) {
            case 'disponible':
              color = '#16a34a';
              bg = '#dcfce7';
              break;
            case 'en mission':
              color = '#1b0ddf';
              bg = '#dbeafe';
              break;
            case 'maintenance':
              color = '#e6b30e';
              bg = '#fef9c3';
              break;
            case 'hors service':
              color = '#dc2626';
              bg = '#fee2e2';
              break;
          }

          return this.sanitizer.bypassSecurityTrustHtml(`
            <span class="status-pill"
              style="
                color: ${color};
                background-color: ${bg};
                border: 1px solid ${color}33;
                padding:4px 10px;
                border-radius:20px;
                font-weight:500;
                font-size:12px;
                display:inline-block;
              ">
              ${row.status ?? ''}
            </span>
          `);
        },
        html: true
      },
      {
        key: 'color',
        label: this.t('COLOR_TRUCK'),
        format: (row: ITruck) => row.color
      },
      {
        key: 'imageBase64',
        label: this.t('PHOTO_TRUCK'),
        format: (row: ITruck) => this.getImage(row.imageBase64),
        html: true
      },
      {
        key: 'Action',
        label: this.t('Action'),
        format: () => [this.t('ACTION_EDIT'), this.t('ACTION_DELETE')]
      }
    ];
  }

  ngOnInit() {
    this.loadCapacityUnits(); 
    this.loadMarques();
    this.getLatestData();

    console.log('loadingUnit'+this.loadingUnit)

    this.searchControl.valueChanges.pipe(debounceTime(250))
      .subscribe((value: string | null) => {
        this.filter.search = value;
        this.filter.pageIndex = 0;
        this.getLatestData();
      });
  }

  private loadMarques(): void {
    this.httpService.getMarqueTrucks().subscribe({
      next: (response) => {
        let marquesData: IMarque[];
        
        if (response && typeof response === 'object' && 'data' in response) {
          marquesData = (response as any).data;
        } else if (Array.isArray(response)) {
          marquesData = response;
        } else {
          marquesData = [];
        }
        
        this.marques = marquesData;
        
        this.marqueMap.clear();
        this.marques.forEach(marque => {
          this.marqueMap.set(marque.id, marque.name);
        });
        
        console.log('Marques loaded:', this.marques);
      },
      error: (error) => {
        console.error('Error loading marques:', error);
      }
    });
  }

  getMarqueName(marqueId?: number): string {
    if (!marqueId) return 'N/A';
    return this.marqueMap.get(marqueId) || 'N/A';
  }

  getLoadingUnitImage(unit: string): string {
    switch (unit?.toLowerCase()) {
      case 'palettes':
        return '/palette.jpg';
      case 'cartons':
        return '/carton.webp';
      case 'tonnes':
        return '/tonne.png';
      case 'kg':
        return '/kg.png';
      case 'bouteilles':
        return '/b.png';
      default:
        return '/palette.jpg';
    }
  }

  private loadCapacityUnits(): void {
    this.orderSettingsService.getSettings().subscribe({
      next: (settings: any) => {
        const units: string[] = Array.isArray(settings.loadingUnit)
          ? settings.loadingUnit
          : typeof settings.loadingUnit === 'string'
            ? [settings.loadingUnit]
            : [];

        this.capacityUnits = units.length
          ? units.map(u => ({ value: u, label: this.getCapacityUnitLabel(u) }))
          : [{ value: 'tonnes', label: 'Tonnes' }];

        if (units.length > 0) {
          this.loadingUnit = units[0]; 
        }
      },
      error: (err) => {
        console.error('Erreur récupération loadingUnit', err);
        this.loadingUnit = 'tonne';
        this.capacityUnits = [{ value: 'tonnes', label: 'Tonnes' }];
      }
    });

    if (this.orderSettingsService.settingsChanges) {
      this.orderSettingsService.settingsChanges.subscribe(settings => {
        if (settings && settings.loadingUnit) {
          const units: string[] = Array.isArray(settings.loadingUnit)
            ? settings.loadingUnit
            : [settings.loadingUnit];

          this.capacityUnits = units.map(u => ({ value: u, label: this.getCapacityUnitLabel(u) }));
          this.loadingUnit = units[0];
        }
      });
    }
  }

  private getCapacityUnitLabel(unit: string): string {
    console.log('unit',unit)
    switch(unit) {
      case 'palettes': return 'Palettes';
      case 'cartons': return 'Cartons';
      case 'tonnes': return 'Tonnes';
      default: return unit;
    }
  }

  getLatestData() {
    this.httpService.getTrucksList(this.filter).subscribe(result => {
      this.pagedTruckData = result;
      this.totalData = result.totalData;
      
      if (result.data && result.data.length > 0) {
        console.log('Sample truck data:', result.data[0]);
      }
    });
  }

  add() {
    this.openDialog();
  }

  edit(truck: ITruck) {
    const ref = this.dialog.open(TruckForm, {
      panelClass: 'm-auto',
      width: '90vw',
      maxWidth: '1200px',
      minWidth: '400px',
      height: 'auto',
      maxHeight: '90vh',
      data: { truckId: truck.id }
    });

    ref.afterClosed().subscribe(() => this.getLatestData());
  }
   
  delete(truck: ITruck) {
    if (confirm(`${this.t('TRUCK_DELETE_CONFIRM')} ${truck.immatriculation}?`)) {
      this.httpService.deleteTruck(truck.id).subscribe(() => {
        alert(this.t('TRUCK_DELETED_SUCCESS'));
        this.getLatestData();
      });
    }
  }

  openDialog(): void {
    const ref = this.dialog.open(TruckForm, {
      panelClass: 'm-auto',
      width: '90vw',
      maxWidth: '1200px',
      minWidth: '400px',
      height: 'auto',
      maxHeight: '90vh',
      data: {}
    });

    ref.afterClosed().subscribe(() => this.getLatestData());
  }

  pageChange(event: any) {
    this.filter.pageIndex = event.pageIndex;
    this.getLatestData();
  }

  onRowClick(event: any) {
    if (event.btn === this.t('ACTION_EDIT')) {
      this.edit(event.rowData);
    }
    if (event.btn === this.t('ACTION_DELETE')) {
      this.delete(event.rowData);
    }
  }

  exportCSV() {
    const rows = this.pagedTruckData?.data || [];

    const escape = (v: any) => {
      if (v === null || v === undefined) return '""';
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    };

    const csvContent = [
      ['ID', 'Immatriculation', 'Marque', 'Capacité', 'Unité', 'Date Visite', 'Status', 'Couleur'],
      ...rows.map(r => [
        r.id,
        r.immatriculation,
        this.getMarqueName(r.marqueTruckId),
        r.typeTruck?.capacity || '',
        r.typeTruck?.unit || this.loadingUnit || '',
        r.technicalVisitDate ? new Date(r.technicalVisitDate).toLocaleDateString('fr-FR') : '',
        r.status,
        r.color
      ])
    ]
      .map(row => row.map(escape).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'camions.csv';
    link.click();
  }

  exportExcel() {
    const data = this.pagedTruckData?.data || [];

    const excelData = data.map(r => ({
      ID: r.id,
      Immatriculation: r.immatriculation,
      Marque: this.getMarqueName(r.marqueTruckId),
      Capacité: r.typeTruck?.capacity || '',
      Unité: r.typeTruck?.unit || this.loadingUnit || '',
      'Date Visite': r.technicalVisitDate ? new Date(r.technicalVisitDate).toLocaleDateString('fr-FR') : '',
      Status: r.status,
      Couleur: r.color
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = {
      Sheets: { Camions: worksheet },
      SheetNames: ['Camions']
    };

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const blob = new Blob([excelBuffer], {
      type: 'application/octet-stream'
    });

    saveAs(blob, 'camions.xlsx');
  }

  exportPDF() {
    const doc = new jsPDF();
    const rows = this.pagedTruckData?.data || [];

    const tableData = rows.map(r => [
      r.id,
      r.immatriculation,
      this.getMarqueName(r.marqueTruckId),
      r.typeTruck ? `${r.typeTruck.capacity || ''} ${r.typeTruck.unit || ''}` : '',
      r.technicalVisitDate ? new Date(r.technicalVisitDate).toLocaleDateString('fr-FR') : '',
      r.status,
      r.color
    ]);

    autoTable(doc, {
      head: [['ID', 'Immatriculation', 'Marque', 'Capacité', 'Date Visite', 'Status', 'Couleur']],
      body: tableData,
      startY: 20,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 }
    });

    doc.setFontSize(10);
    doc.text(`Liste des Camions - ${new Date().toLocaleDateString('fr-FR')}`, 14, 10);
    
    doc.save('camions.pdf');
  }

  getImage(base64?: string | null): SafeHtml {
    if (!base64) {
      return this.sanitizer.bypassSecurityTrustHtml(`
        <span style="color:#999">—</span>
      `);
    }

    return this.sanitizer.bypassSecurityTrustHtml(`
      <img 
        src="data:image/jpeg;base64,${base64}" 
        style="width:60px;height:40px;object-fit:cover;border-radius:4px"
        onerror="this.style.display='none'"
      />
    `);
  }

  private translation = inject(Translation);
  t(key: string): string { return this.translation.t(key); }
}