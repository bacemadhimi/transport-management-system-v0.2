import { Component, ViewChild, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Http } from '../../services/http';
import { MatDatepicker, MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Translation } from '../../services/Translation';

@Component({
  selector: 'app-historic-trip',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './historic-trip.html',
  styleUrls: ['./historic-trip.scss']
})
export class HistoricTrip implements OnInit {
  startDate = new FormControl<Date | null>(null);
  endDate = new FormControl<Date | null>(null);
  truckControl = new FormControl<string | null>('');
  trucks: string[] = [];
  driverControl = new FormControl<string | null>('');
  drivers: string[] = [];
  allTrips: any[] = [];
  visibleTrips: any[] = [];
  pageSize = 10;
  pageIndex = 0;

  pagedTripsArray: any[] = [];

  get totalPages() {
    return Math.max(0, Math.ceil((this.visibleTrips?.length || 0) / this.pageSize));
  }

  private updatePagedTrips() {
    const start = this.pageIndex * this.pageSize;
    this.pagedTripsArray = (this.visibleTrips || []).slice(start, start + this.pageSize);
  }

  get pageRangeText(): string {
    const total = this.visibleTrips?.length || 0;
    if (total === 0) return '0 - 0 de 0';
    const start = this.pageIndex * this.pageSize + 1;
    const end = Math.min((this.pageIndex + 1) * this.pageSize, total);
    return `${start} - ${end} de ${total}`;
  }

  private http = inject(Http);

  @ViewChild('startPicker') startPicker!: MatDatepicker<Date>;
  @ViewChild('endPicker') endPicker!: MatDatepicker<Date>;

  openStart() {
    this.startPicker.open();
  }

  openEnd() {
    this.endPicker.open();
  }

  ngOnInit(): void {
    this.http.getTripsList({ pageIndex: 0, pageSize: 1000 }).subscribe({
      next: (res: any) => {
        const data = res?.data || [];
        const names = data.map((d: any) => d.truck).filter((x: any) => !!x);
        this.trucks = Array.from(new Set(names));
        const drv = data.map((d: any) => d.driver).filter((x: any) => !!x);
        this.drivers = Array.from(new Set(drv));
        this.allTrips = data;
      },
      error: (err: any) => console.error('Failed to load trips for trucks list', err)
    });
  }

  onSearch() {
    const start: Date | null = this.startDate.value ?? null;
    const end: Date | null = this.endDate.value ?? null;

    if (!start || !end) {
      console.warn('Veuillez sélectionner Date de début et Date de fin');
      return;
    }

    const s = new Date(start);
    const e = new Date(end);


    s.setHours(0, 0, 0, 0);
    e.setHours(23, 59, 59, 999);
    const truckFilter = (this.truckControl.value ?? '').toString().trim();
    const driverFilter = (this.driverControl.value ?? '').toString().trim();

    const filtered = this.allTrips.filter(trip => {
      if (!trip.estimatedStartDate || !trip.estimatedEndDate) return false;
      const ts = new Date(trip.estimatedStartDate);
      const te = new Date(trip.estimatedEndDate);

      if (!(ts >= s && te <= e)) return false;

      if (truckFilter && String(trip.truck).trim() !== truckFilter) return false;
      if (driverFilter && String(trip.driver).trim() !== driverFilter) return false;

      return true;
    });

    console.log('Filtered trips between', s.toISOString(), 'and', e.toISOString(), 'truck=', truckFilter || 'ALL', 'driver=', driverFilter || 'ALL', filtered);

    this.visibleTrips = filtered;
    this.pageIndex = 0;
    this.updatePagedTrips();
  }


  viewDetails(trip: any) {
    console.log('View trip details', trip);
  }

  edit(trip: any) {
    console.log('Edit trip', trip);
  }

  delete(trip: any) {
    console.log('Delete trip (no-op)', trip);
  }

  prevPage() {
    if (this.pageIndex > 0) {
      this.pageIndex--;
      this.updatePagedTrips();
    }
  }

  nextPage() {
    if (this.pageIndex < this.totalPages - 1) {
      this.pageIndex++;
      this.updatePagedTrips();
    }
  }

  goToPage(n: number) {
    if (n >= 0 && n < this.totalPages) {
      this.pageIndex = n;
      this.updatePagedTrips();
    }
  }

  trackByTrip(index: number, item: any) {
    return item?.id ?? index;
  }

  get pages() {
    return Array.from({ length: this.totalPages }, (_, i) => i);
  }

  canPrev() {
    return this.pageIndex > 0;
  }

  canNext() {
    return this.pageIndex < this.totalPages - 1;
  }


  exportCSV() {
    const rows: any[] = this.visibleTrips || [];

    const csvContent = [
      [
        'ID',
        'Référence',
        'Référence métier',
        'Camion',
        'Chauffeur',
        'Début estimé',
        'Fin estimée',
        'Distance (km)',
        'Durée (h)',
        'Livraisons totales',
        'Livraisons terminées',
        'Statut'
      ],
      ...rows.map(d => [
        d.id ?? '',
        d.bookingId ?? '',
        d.tripReference ?? '',
        d.truck ?? '',
        d.driver ?? '',
        d.estimatedStartDate ? new Date(d.estimatedStartDate).toLocaleString() : '',
        d.estimatedEndDate ? new Date(d.estimatedEndDate).toLocaleString() : '',
        d.estimatedDistance ?? 0,
        d.estimatedDuration ?? 0,
        d.deliveryCount ?? 0,
        d.completedDeliveries ?? 0,
        d.tripStatus ?? ''
      ])
    ]
      .map(row =>
        row
          .map(value => `"${String(value).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'voyages.csv';
    link.click();
  }

  exportExcel() {
    const data: any[] = this.visibleTrips || [];

    const excelData = data.map(d => ({
      ID: d.id ?? '',
      'Référence': d.bookingId ?? '',
      'Référence métier': d.tripReference ?? '',
      'Camion': d.truck ?? '',
      'Chauffeur': d.driver ?? '',
      'Début estimé': d.estimatedStartDate ? new Date(d.estimatedStartDate).toLocaleString() : '',
      'Fin estimée': d.estimatedEndDate ? new Date(d.estimatedEndDate).toLocaleString() : '',
      'Distance (km)': d.estimatedDistance ?? 0,
      'Durée (h)': d.estimatedDuration ?? 0,
      'Livraisons totales': d.deliveryCount ?? 0,
      'Livraisons terminées': d.completedDeliveries ?? 0,
      'Statut': d.tripStatus ?? ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData as any[]);
    const workbook = { Sheets: { Voyages: worksheet }, SheetNames: ['Voyages'] } as any;

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'voyages.xlsx');
  }

  exportPDF() {
    const doc = new jsPDF();
    const rows: any[] = this.visibleTrips || [];

    autoTable(doc, {
      head: [[
        'ID',
        'Référence',
        'Référence métier',
        'Camion',
        'Chauffeur',
        'Début estimé',
        'Fin estimée',
        'Distance',
        'Durée',
        'Livraisons',
        'Statut'
      ]],
      body: rows.map(d => [
        d.id ?? '',
        d.bookingId ?? '',
        d.tripReference ?? '',
        d.truck ?? '',
        d.driver ?? '',
        d.estimatedStartDate ? new Date(d.estimatedStartDate).toLocaleString() : '',
        d.estimatedEndDate ? new Date(d.estimatedEndDate).toLocaleString() : '',
        `${d.estimatedDistance ?? 0} km`,
        `${d.estimatedDuration ?? 0} h`,
        `${d.completedDeliveries ?? 0} / ${d.deliveryCount ?? 0}`,
        d.tripStatus ?? ''
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    doc.save('voyages.pdf');
  }
    private translation = inject(Translation);
    t(key: string): string { return this.translation.t(key); }
}