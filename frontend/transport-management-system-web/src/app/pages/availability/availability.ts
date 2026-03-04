
import { Component, OnInit, inject, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Http } from '../../services/http';
import { MatButtonModule } from '@angular/material/button';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MAT_DATE_FORMATS } from '@angular/material/core';
import { debounceTime, Subject, takeUntil } from 'rxjs';
import { IDriver } from '../../types/driver';
import { CommonModule } from '@angular/common';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MatIconModule } from '@angular/material/icon';
import { PagedData } from '../../types/paged-data';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Auth } from '../../services/auth';


interface IDriverAvailability extends IDriver {
  availability: {
    [date: string]: {
      isAvailable: boolean;
      isDayOff: boolean;
      reason?: string;
    };
  };
  dayOffs: string[];
  imageBase64: string | null;
}

interface IDateColumn {
  date: Date;
  label: string;
  dayOfWeek: string;
  fullDayName: string;
  isWeekend: boolean;
  isDayOffForAll?: boolean;
}


const FR_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@Component({
  selector: 'app-availability',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule
  ],
  providers: [
    { provide: MAT_DATE_FORMATS, useValue: FR_DATE_FORMATS }
  ],
  templateUrl: './availability.html',
  styleUrls: ['./availability.scss']
})
export class AvailabilityComponent implements OnInit, OnDestroy {
    constructor(public auth: Auth) {}

    getActions(row: any, actions: string[]) {
      const permittedActions: string[] = [];

      for (const a of actions) {
        if (a === 'Modifier' && this.auth.hasPermission('DRIVER_AVAILABILITY_EDIT')) {
          permittedActions.push(a);
        }
        if (a === 'Supprimer' && this.auth.hasPermission('DRIVER_AVAILABILITY_DISABLE')) {
          permittedActions.push(a);
        }
      }

      return permittedActions;
    }

  private destroy$ = new Subject<void>();

  httpService = inject(Http);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);


  pagedDriverData: PagedData<IDriverAvailability> = {
    data: [],
    totalData: 0
  };

  totalData!: number;

  filter: any = {
    pageIndex: 0,
    pageSize: 10,
    search: ''
  };


  dateColumns: IDateColumn[] = [];
  currentWeekStart: Date = new Date();
  weeks: { start: Date; end: Date; label: string }[] = [];
  selectedWeekIndex: number = 0;


  daysToShow: number = 7;
  companyDayOffs: string[] = [];

  searchControl = new FormControl('');
  readonly dialog = inject(MatDialog);

  ngOnInit() {
    this.initializeWeeks();
    this.loadCompanyDayOffsWithData();

    this.searchControl.valueChanges
      .pipe(debounceTime(250), takeUntil(this.destroy$))
      .subscribe((value: string | null) => {
        this.filter.search = value || '';
        this.filter.pageIndex = 0;
        this.getLatestData();
      });
  }
loadCompanyDayOffsWithData() {
  this.httpService.getCompanyDayOffs().subscribe(
    (response: any) => {
      if (response && response.dayOffs) {
        this.companyDayOffs = response.dayOffs.map((d: any) => d.date);

      }
      this.updateDateColumns();

      this.getLatestData();
    },
    (error) => {
      console.error('Error loading company day offs:', error);
      this.updateDateColumns();

      this.getLatestData();
    }
  );
}
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }


  getCurrentPageData(): IDriverAvailability[] {
   return this.pagedDriverData.data || [];
  }

  getStartIndex(): number {
    return this.filter.pageIndex * this.filter.pageSize;
  }

  getEndIndex(): number {
     const end = (this.filter.pageIndex + 1) * this.filter.pageSize;

     return Math.min(end, this.pagedDriverData.totalData);
  }

  getTotalPages(): number {
    return Math.ceil(this.pagedDriverData.totalData / this.filter.pageSize);
  }

  isLastPage(): boolean {
    return (this.filter.pageIndex + 1) >= this.getTotalPages();
  }

  previousPage() {
    if (this.filter.pageIndex > 0) {
      this.filter.pageIndex--;
      this.getLatestData();
      this.cdr.detectChanges();
    }
  }

  nextPage() {
    if (!this.isLastPage()) {
      this.filter.pageIndex++;
      this.getLatestData();
      this.cdr.detectChanges();
    }
  }


  getCellClasses(driver: IDriverAvailability, dateCol: IDateColumn): string {
    const classes = [];

    if (dateCol.isWeekend || dateCol.isDayOffForAll) {
      classes.push('not-clickable');
    } else {
      classes.push('clickable');
    }

    const status = this.getAvailabilityStatus(driver, dateCol.date);
    classes.push(`${status}-cell`);

    return classes.join(' ');
  }

getAvailabilityStatus(driver: IDriverAvailability, date: Date): string {
  const dateKey = this.formatDateForStorage(date);


  const dateCol = this.dateColumns.find(col =>
    this.formatDateForStorage(col.date) === dateKey
  );

  if (!dateCol) {
    return 'available';
  }


  if (dateCol.isWeekend) {
    return 'weekend';
  }


  if (dateCol.isDayOffForAll) {
    return 'holiday';
  }


  const availability = driver.availability?.[dateKey];

  if (availability) {

    if (availability.isDayOff) {

      if (availability.reason?.toLowerCase().includes('weekend')) {
        return 'weekend';
      }
      if (availability.reason?.toLowerCase().includes('férié') ||
          availability.reason?.toLowerCase().includes('holiday')) {
        return 'holiday';
      }

      return 'dayoff';
    }


    if (!availability.isAvailable) {
      return 'unavailable';
    }


    return 'available';
  }


  return 'available';
}

getAvailabilityEmoji(driver: IDriverAvailability, dateCol: IDateColumn): string {
  const status = this.getAvailabilityStatus(driver, dateCol.date);

  switch (status) {
    case 'available':
      return '✅';
    case 'unavailable':
      return '❌';
    case 'weekend':
      return '🌴';
    case 'holiday':
      return '🎉';
    case 'dayoff':
      return '🏖️';
    default:
      return '✅';
  }
}

initializeWeeks() {
  const today = new Date();
  this.currentWeekStart = this.getStartOfWeek(today);

  this.generateWeeks(52);


  const currentWeekStart = this.getStartOfWeek(today);
  this.selectedWeekIndex = this.weeks.findIndex(week =>
    week.start.getTime() === currentWeekStart.getTime()
  );

  if (this.selectedWeekIndex === -1) {
    this.selectedWeekIndex = Math.floor(this.weeks.length / 2);
  }

  this.updateDateColumns();
}

  generateWeeks(count: number) {
    this.weeks = [];
    const today = new Date();

    for (let i = -count; i <= count; i++) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() + (i * 7));
      const weekStartDate = this.getStartOfWeek(weekStart);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekStartDate.getDate() + 6);

      this.weeks.push({
        start: weekStartDate,
        end: weekEndDate,
        label: this.getWeekLabel(weekStartDate, weekEndDate)
      });
    }

    this.selectedWeekIndex = count;
  }

  updateDateColumns() {
    const startDate = this.weeks[this.selectedWeekIndex]?.start || new Date();
    this.dateColumns = [];

    for (let i = 0; i < this.daysToShow; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      date.setHours(0, 0, 0, 0);

      const label = this.formatDateLabel(date);
      const dayOfWeek = this.getFrenchDayOfWeekShort(date);
      const fullDayName = this.getFrenchDayOfWeekFull(date);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const isDayOffForAll = this.isCompanyDayOff(date);

      this.dateColumns.push({
        date: new Date(date),
        label: label,
        dayOfWeek: dayOfWeek,
        fullDayName: fullDayName,
        isWeekend: isWeekend,
        isDayOffForAll: isDayOffForAll
      });
    }

    this.cdr.detectChanges();
  }

getLatestData() {
  const startDate = this.weeks[this.selectedWeekIndex]?.start || new Date();
  const endDate = this.weeks[this.selectedWeekIndex]?.end || new Date();

  const params = {
    PageIndex: this.filter.pageIndex,
    PageSize: this.filter.pageSize,
    Search: this.filter.search || '',
    StartDate: this.formatDateForStorage(startDate),
    EndDate: this.formatDateForStorage(endDate)
  };


  this.httpService.getAllDriversAvailability(params).subscribe(
    (response: any) => {

      let driversData = [];
      let totalCount = 0;


      if (response && Array.isArray(response)) {

        driversData = response;
        totalCount = response.length;
      } else if (response && response.data && Array.isArray(response.data)) {

        driversData = response.data;
        totalCount = response.totalData || 0;
      } else if (response && response.drivers && Array.isArray(response.drivers)) {

        driversData = response.drivers;
        totalCount = response.totalDrivers || 0;
      }


      if (driversData.length > 0) {
        this.processAvailabilityData(driversData);
        this.pagedDriverData.totalData = totalCount;
        this.totalData = totalCount;
      } else {

        this.pagedDriverData = {
          data: [],
          totalData: 0
        };
      }

      this.cdr.detectChanges();
    },
    (error) => {
      console.error('Error loading availability:', error);
      this.loadFallbackData();
      this.cdr.detectChanges();
    }
  );
}

processAvailabilityData(data: any[]) {
  if (!data || !Array.isArray(data)) {
    console.warn('No valid data received, using fallback');
    this.loadFallbackData();
    return;
  }

  const processedData = data.map((driverData: any) => {
    const availability: { [date: string]: { isAvailable: boolean; isDayOff: boolean; reason?: string } } = {};

    if (driverData.availability && typeof driverData.availability === 'object') {
      Object.keys(driverData.availability).forEach(dateKey => {
        const availData = driverData.availability[dateKey] || {};

        const isAvailable = typeof availData.isAvailable === 'boolean' ? availData.isAvailable : true;
        const isDayOff = typeof availData.isDayOff === 'boolean' ? availData.isDayOff : false;

        availability[dateKey] = {
          isAvailable: isAvailable,
          isDayOff: isDayOff,
          reason: availData.reason || ''
        };
      });
    }

    this.dateColumns.forEach(dateCol => {
      const dateKey = this.formatDateForStorage(dateCol.date);

      const isWeekend = dateCol.isWeekend === true;
      const isDayOffForAll = dateCol.isDayOffForAll === true;
      const isDayOff = isWeekend || isDayOffForAll;

      if (!availability[dateKey]) {
        availability[dateKey] = {
          isAvailable: !isDayOff,
          isDayOff: isDayOff,
          reason: isWeekend ? 'Weekend' :
                  (isDayOffForAll ? 'Jour férié' : '')
        };
      } else if (isDayOff) {
        const currentAvail = availability[dateKey];
        availability[dateKey] = {
          ...currentAvail,
          isDayOff: true,
          reason: currentAvail.reason || (isWeekend ? 'Weekend' : 'Jour férié')
        };
      }
    });


    return {
      id: driverData.driverId || driverData.id || Math.random(),
      name: driverData.driverName || driverData.name || 'N/A',
      email: driverData.email || driverData.driverEmail || '',


      idNumber: driverData.idNumber || '',
      phoneNumber: driverData.phoneNumber || driverData.phone || '',
      drivingLicense: driverData.drivingLicense || driverData.permisNumber || '',
      typeTruckId: driverData.typeTruckId || null,
      isEnable: driverData.isEnable === true,
      employeeCategory: driverData.employeeCategory || 'DRIVER',
      isInternal: driverData.isInternal !== false,
      createdAt: driverData.createdAt ? new Date(driverData.createdAt) : undefined,
      updatedAt: driverData.updatedAt ? new Date(driverData.updatedAt) : undefined,


      permisNumber: driverData.permisNumber || driverData.drivingLicense || '',
      phone: driverData.phone || driverData.phoneNumber || '',
      phoneCountry: driverData.phoneCountry || 'tn',
      status: driverData.status || 'Disponible',
      idCamion: driverData.idCamion || 0,
      zoneId: driverData.zoneId,
      zoneName: driverData.zoneName,
      cityId: driverData.cityId,
      imageBase64: driverData.imageBase64 || null,


      availability: availability,
      dayOffs: driverData.dayOffs || []
    };
  });

  this.pagedDriverData = {
    data: processedData,
    totalData: processedData.length
  };
}
  loadFallbackData() {
  this.httpService.getDrivers().subscribe({
    next: (drivers: IDriver[]) => {
      const processedData = drivers.map(driver => {

        const driverWithAvailability: IDriverAvailability = {
          ...driver,
          availability: this.generateDefaultAvailability(),
          dayOffs: [],
          imageBase64: driver.imageBase64 || null
        };
        return driverWithAvailability;
      });

      this.pagedDriverData = {
        data: processedData,
        totalData: processedData.length
      };
    },
    error: (error) => {
      console.error('Error loading fallback data:', error);
      this.pagedDriverData = {
        data: [],
        totalData: 0
      };
    }
  });
}

generateDefaultAvailability(): { [date: string]: { isAvailable: boolean; isDayOff: boolean; reason?: string } } {
  const availability: { [date: string]: { isAvailable: boolean; isDayOff: boolean; reason?: string } } = {};

  this.dateColumns.forEach(dateCol => {
    const dateKey = this.formatDateForStorage(dateCol.date);
    const isDayOff = dateCol.isWeekend || dateCol.isDayOffForAll;

    availability[dateKey] = {
      isAvailable: !isDayOff,
      isDayOff: isDayOff || false,
      reason: isDayOff ? (dateCol.isWeekend ? 'Weekend' : 'Jour férié') : ''
    };
  });

  return availability;
}

  getStartOfWeek(date: Date): Date {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(date);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  getWeekLabel(start: Date, end: Date): string {
    const startStr = this.formatDateLabel(start);
    const endStr = this.formatDateLabel(end);
    return `${startStr} - ${endStr}`;
  }

  formatDateLabel(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = this.getFrenchMonth(date.getMonth()).substring(0, 3).toUpperCase();
    return `${day} ${month}`;
  }

  getFrenchDayOfWeekShort(date: Date): string {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return days[date.getDay()];
  }

  getFrenchDayOfWeekFull(date: Date): string {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return days[date.getDay()];
  }

  getFrenchMonth(month: number): string {
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return months[month];
  }

  isCompanyDayOff(date: Date): boolean {
    const dateStr = this.formatDateForStorage(date);
    return this.companyDayOffs.includes(dateStr);
  }

  loadCompanyDayOffs() {
    this.httpService.getCompanyDayOffs().subscribe(
      (response: any) => {
        if (response && response.dayOffs) {
          this.companyDayOffs = response.dayOffs.map((d: any) => d.date);

        }
        this.updateDateColumns();
      },
      (error) => {
        console.error('Error loading company day offs:', error);
        this.updateDateColumns();
      }
    );
  }

  formatDateForStorage(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }


  previousWeek() {
    if (this.selectedWeekIndex > 0) {
      this.selectedWeekIndex--;
      this.updateDateColumns();
      this.getLatestData();
    }
  }

  nextWeek() {
    if (this.selectedWeekIndex < this.weeks.length - 1) {
      this.selectedWeekIndex++;
      this.updateDateColumns();
      this.getLatestData();
    }
  }

  goToWeek(index: number) {
    this.selectedWeekIndex = index;
    this.updateDateColumns();
    this.getLatestData();
  }

  goToToday() {
    const today = new Date();
    const weekStart = this.getStartOfWeek(today);

    const weekIndex = this.weeks.findIndex(week =>
      week.start.getTime() === weekStart.getTime()
    );

    if (weekIndex !== -1) {
      this.selectedWeekIndex = weekIndex;
    } else {

      const weekEndDate = new Date(weekStart);
      weekEndDate.setDate(weekStart.getDate() + 6);

      this.weeks.push({
        start: weekStart,
        end: weekEndDate,
        label: this.getWeekLabel(weekStart, weekEndDate)
      });

      this.selectedWeekIndex = this.weeks.length - 1;
    }

    this.updateDateColumns();
    this.getLatestData();
  }


  onCellClick(driverId: number, dateIndex: number) {

    if (dateIndex >= this.dateColumns.length) return;


    const driver = this.pagedDriverData?.data?.find(d => d.id === driverId);
    if (!driver) {
      console.error('Driver not found:', driverId);
      return;
    }

    const dateCol = this.dateColumns[dateIndex];
    const dateKey = this.formatDateForStorage(dateCol.date);


    if (dateCol.isDayOffForAll || dateCol.isWeekend) {
      let message = '';
      if (dateCol.isWeekend) {
        message = `${dateCol.fullDayName} (weekend) ne peut pas être modifié`;
      } else if (dateCol.isDayOffForAll) {
        message = `Jour férié (${dateCol.fullDayName}) ne peut pas être modifié`;
      }

      if (message) {
        this.snackBar.open(message, 'OK', {
          duration: 3000,
          panelClass: 'info-snackbar'
        });
      }
      return;
    }

    const availability = driver.availability[dateKey];
    if (!availability) {
      console.error('Availability not found for date:', dateKey);
      return;
    }


    const newAvailability = !availability.isAvailable;
    availability.isAvailable = newAvailability;


    const updatedData = [...this.pagedDriverData.data];
    const driverIndex = updatedData.findIndex(d => d.id === driverId);
    if (driverIndex !== -1) {
      updatedData[driverIndex] = {
        ...updatedData[driverIndex],
        availability: {
          ...updatedData[driverIndex].availability,
          [dateKey]: { ...availability }
        }
      };

      this.pagedDriverData.data = updatedData;
      this.cdr.detectChanges();
    }


    const updateDto = {
      Date: dateKey,
      IsAvailable: newAvailability,
      IsDayOff: false,
      Reason: newAvailability ? '' : 'Indisponibilité'
    };

    this.httpService.updateDriverAvailability(driverId, updateDto).subscribe({
      next: (response: any) => {
        const status = newAvailability ? 'Disponible' : 'Indisponible';
        this.snackBar.open(
          `${driver.name} pour le ${dateCol.label} ${dateCol.dayOfWeek}: ${status}`,
          'OK',
          { duration: 2000 }
        );
      },
      error: (error: any) => {
        console.error('Error updating availability:', error);


        let errorMessage = 'Erreur lors de la mise à jour';
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        }


        availability.isAvailable = !newAvailability;


        const revertedData = [...this.pagedDriverData.data];
        const revertDriverIndex = revertedData.findIndex(d => d.id === driverId);
        if (revertDriverIndex !== -1) {
          revertedData[revertDriverIndex] = {
            ...revertedData[revertDriverIndex],
            availability: {
              ...revertedData[revertDriverIndex].availability,
              [dateKey]: { ...availability }
            }
          };

          this.pagedDriverData.data = revertedData;
          this.cdr.detectChanges();
        }

        this.snackBar.open(errorMessage, 'OK', {
          duration: 3000,
          panelClass: 'error-snackbar'
        });
      }
    });
  }

exportCSV() {
  if (!this.pagedDriverData?.data?.length) {
    this.snackBar.open('Aucune donnée à exporter', 'OK', { duration: 3000 });
    return;
  }

  const headers = ['Nom', 'Téléphone', 'Statut', ...this.dateColumns.map(d => `${d.label} ${d.dayOfWeek}`)];

  const csvContent = [
    headers.join(','),
    ...(this.pagedDriverData.data || []).map(driver => [
      `"${driver.name || ''}"`,
      `"${driver.phoneNumber || ''}"`,
      `"${driver.status || ''}"`,
      ...this.dateColumns.map(dateCol => {
        const status = this.getAvailabilityStatus(driver, dateCol.date);
        const emoji = status === 'available' ? '✅' :
                      status === 'unavailable' ? '❌' :
                      status === 'weekend' ? '🌴' :
                      status === 'holiday' ? '🎉' :
                      status === 'dayoff' ? '🏖️' : '';
        return `"${emoji}"`;
      })
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `disponibilite_chauffeurs_${this.getWeekLabel(this.weeks[this.selectedWeekIndex].start, this.weeks[this.selectedWeekIndex].end)}.csv`;
  link.click();
}

 exportExcel() {
  if (!this.pagedDriverData?.data?.length) {
    this.snackBar.open('Aucune donnée à exporter', 'OK', { duration: 3000 });
    return;
  }

  const data = (this.pagedDriverData.data || []).map(driver => {
    const row: any = {
      'Nom': driver.name || '',
      'Téléphone': driver.phoneNumber || '',
      'Statut': driver.status || ''
    };

    this.dateColumns.forEach((dateCol) => {
      const status = this.getAvailabilityStatus(driver, dateCol.date);
      row[`${dateCol.label} ${dateCol.dayOfWeek}`] =
        status === 'available' ? '✅' :
        status === 'unavailable' ? '❌' :
        status === 'weekend' ? '🌴' :
        status === 'holiday' ? '🎉' :
        status === 'dayoff' ? '🏖️' : '';
    });

    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = {
    Sheets: { 'Disponibilité': worksheet },
    SheetNames: ['Disponibilité']
  };

  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array'
  });

  const blob = new Blob([excelBuffer], {
    type: 'application/octet-stream'
  });

  saveAs(blob, `disponibilite_chauffeurs_${this.getWeekLabel(this.weeks[this.selectedWeekIndex].start, this.weeks[this.selectedWeekIndex].end)}.xlsx`);
}

 exportPDF() {
  if (!this.pagedDriverData?.data?.length) {
    this.snackBar.open('Aucune donnée à exporter', 'OK', { duration: 3000 });
    return;
  }

  const doc = new jsPDF('landscape');

  const headers = ['Nom', 'Téléphone', ...this.dateColumns.map(d => `${d.label} ${d.dayOfWeek}`)];


  const body = (this.pagedDriverData.data || []).map(driver => [
    driver.name || '',
    driver.phoneNumber || '',
    driver.status || '',
    ...this.dateColumns.map(dateCol => {
      const status = this.getAvailabilityStatus(driver, dateCol.date);
      const emoji = status === 'available' ? '✅' :
                    status === 'unavailable' ? '❌' :
                    status === 'weekend' ? '🌴' :
                    status === 'holiday' ? '🎉' :
                    status === 'dayoff' ? '🏖️' : '';
      return emoji;
    })
  ]);

  doc.setFontSize(10);
  doc.text(`Disponibilité des Chauffeurs - ${this.getWeekLabel(this.weeks[this.selectedWeekIndex].start, this.weeks[this.selectedWeekIndex].end)}`, 14, 10);

  autoTable(doc, {
    startY: 15,
    head: [headers],
    body: body,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    margin: { left: 14, right: 14 }
  });

  doc.setFontSize(8);
  doc.text('Légende: ✅ = Disponible, ❌ = Indisponible, 🌴 = Weekend, 🎉 = Férié, 🏖️ = Jour Off', 14, doc.internal.pageSize.height - 10);

  doc.save(`disponibilite_chauffeurs_${this.getWeekLabel(this.weeks[this.selectedWeekIndex].start, this.weeks[this.selectedWeekIndex].end)}.pdf`);
}
  get hasPagedData(): boolean {
  return !!this.pagedDriverData?.data?.length;
}


}