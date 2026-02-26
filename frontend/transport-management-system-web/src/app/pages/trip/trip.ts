import { Component, inject, OnInit, OnDestroy, Input } from '@angular/core';
import { Http } from '../../services/http';
import { Table } from '../../components/table/table';
import { ITrip, TripStatus, TripStatusOptions } from '../../types/trip';
import { MatButtonModule } from '@angular/material/button';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { debounceTime, Subscription } from 'rxjs';
import { PagedData } from '../../types/paged-data';
import { Router } from '@angular/router';
import { TripForm } from './trip-form/trip-form';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Auth } from '../../services/auth';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/Notification';
import Swal from 'sweetalert2';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ITruck } from '../../types/truck';
import { IDriver } from '../../types/driver';
import { SettingsService } from '../../services/settings.service'; 
import { Translation } from '../../services/Translation';
import { SignalRService, TripNotification } from '../../services/signalr.service';

// Status transition rules (matching the backend C# class)
const VALID_STATUS_TRANSITIONS: { [key in TripStatus]?: TripStatus[] } = {
  [TripStatus.Planned]: [TripStatus.Accepted, TripStatus.Cancelled],
  [TripStatus.Accepted]: [TripStatus.LoadingInProgress, TripStatus.Cancelled],
  [TripStatus.LoadingInProgress]: [TripStatus.DeliveryInProgress, TripStatus.Cancelled],
  [TripStatus.DeliveryInProgress]: [TripStatus.Receipt, TripStatus.Cancelled],
  [TripStatus.Receipt]: [], // End state
  [TripStatus.Cancelled]: [] // End state
};

// Helper function to check if a status transition is valid
function isValidStatusTransition(currentStatus: TripStatus, newStatus: TripStatus): boolean {
  // Same status is always valid (no change)
  if (currentStatus === newStatus) return true;
  
  // Check if the transition is allowed
  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions ? allowedTransitions.includes(newStatus) : false;
}

@Component({
  selector: 'app-trip',
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
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    Table
  ],
  templateUrl: './trip.html',
  styleUrls: ['./trip.scss']
})
export class Trip implements OnInit, OnDestroy {
  constructor(
    public auth: Auth,  
    private notificationService: NotificationService,
    private snackBar: MatSnackBar,
    private settingsService: SettingsService 
  ) {}  
 
  //Get translation Language 
   private translation = inject(Translation);
    t(key: string): string { return this.translation.t(key); } 
    //
getActions(row: any, actions: string[]) {
  const permittedActions: string[] = [];
 
  for (const a of actions) {
    if (a === 'Modifier' && this.auth.hasPermission('TRAVEL_EDIT') && this.allowEditTrip) {
      permittedActions.push(a);
    }
    if (a === 'Supprimer' && this.auth.hasPermission('TRAVEL_DISABLE') && this.allowDeleteTrip) {
      permittedActions.push(a);
    }
  }
 
  return permittedActions;
}
 
  private sanitizer = inject(DomSanitizer);
  httpService = inject(Http);
  signalRService = inject(SignalRService);
  pagedTripData!: PagedData<ITrip>;
  totalData!: number;
  allowEditTrip: boolean = false;
  allowDeleteTrip: boolean = false;
 
 
  filter: any = {
    pageIndex: 0,
    pageSize: 10,
    search: null,
    tripStatus: null,
    truckId: null,
    driverId: null,
    startDate: null,
    endDate: null
  };
 
 
  searchControl = new FormControl('');
  statusControl = new FormControl(null);
  truckControl = new FormControl(null);
  driverControl = new FormControl(null);
  startDateControl = new FormControl<Date | null>(null);
  endDateControl = new FormControl<Date | null>(null);
 
  trucks: ITruck[] = [];
  drivers: IDriver[] = [];
  tripStatuses = TripStatusOptions;
 
  router = inject(Router);
  readonly dialog = inject(MatDialog);
 
  private signalRSubscription?: Subscription;
 
showCols = [
  {
    key: 'bookingId',
    label: 'Référence',
    sortable: true  
  },
  {
    key: 'tripReference',
    label: 'Référence métier',
    sortable: true  
  },
  {
    key: 'vehicleDriver',
    label: 'Camion & Chauffeur',
    format: (row: any): SafeHtml => {
      return this.sanitizer.bypassSecurityTrustHtml(`
        <div>
          <div style="margin-bottom: 4px;">
            <span style="color:#666; font-size:12px;">Camion: </span>
            <span style="font-weight:500;">${row.truck ?? 'N/A'}</span>
          </div>
          <div>
            <span style="color:#666; font-size:12px;">Chauffeur: </span>
            <span style="font-weight:500;">${row.driver ?? 'N/A'}</span>
          </div>
        </div>
      `);
    },
    html: true
  },
  {
    key: 'deliveriesInfo',
    label: 'Livraisons',
    sortable: false,
    format: (row: any): SafeHtml => {
      return this.sanitizer.bypassSecurityTrustHtml(`
        <div>
          <div style="margin-bottom: 4px;">
            <span style="color:#666; font-size:12px;">Total: </span>
            <span style="font-weight:500;">${row.deliveryCount ?? 0}</span>
          </div>
          <div>
            <span style="color:#666; font-size:12px;">Livrées: </span>
              <span style="font-weight:500; color: ${
                row.completedDeliveries === row.deliveryCount ? '#28a745' : '#ffc107'
              }">
                ${row.completedDeliveries ?? 0}
              </span>
          </div>
        </div>
      `);
    },
    html: true
  },
  {
    key: 'dates',
    label: 'Dates estimées',
    sortable: true,
    format: (row: any): SafeHtml => {
      const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        try {
          const date = new Date(dateString);
          return date.toLocaleDateString('fr-FR');
        } catch {
          return 'Date invalide';
        }
      };
 
      return this.sanitizer.bypassSecurityTrustHtml(`
        <div>
          <div style="margin-bottom: 4px;">
            <span style="color:#666; font-size:12px;">Début: </span>
            <span>${formatDate(row.estimatedStartDate)}</span>
          </div>
          <div>
            <span style="color:#666; font-size:12px;">Fin: </span>
            <span>${formatDate(row.estimatedEndDate)}</span>
          </div>
        </div>
      `);
    },
    html: true
  },
  {
    key: 'distanceDuration',
    label: 'Distance & Durée',
    sortable: true,  
    format: (row: any): SafeHtml => {
      return this.sanitizer.bypassSecurityTrustHtml(`
        <div>
          <div style="margin-bottom: 4px;">
            <span style="color:#666; font-size:12px;">Distance: </span>
            <span style="font-weight:500;">${row.estimatedDistance || 0} km</span>
          </div>
          <div>
            <span style="color:#666; font-size:12px;">Durée: </span>
            <span style="font-weight:500;">${row.estimatedDuration || 0} h</span>
          </div>
        </div>
      `);
    },
    html: true
  },
  {
    key: 'tripStatus',
    label: 'Statut',
    sortable: true,  
    format: (row: any): SafeHtml => {
      const tripStatus = this.tripStatuses.find(t => t.value === row.tripStatus);
      const status = tripStatus ? tripStatus.label : row.tripStatus || 'N/A';
 
      let color = '#6c757d';
      let bgColor = '#f8f9fa';
      let icon = '📋';
 
      switch(row.tripStatus) {
        case TripStatus.Planned:
          color = '#3b82f6';
          bgColor = '#dbeafe';
          icon = '📅';
          break;
        case TripStatus.Accepted:
          color = '#d97706';    
          bgColor = '#fef3c7';
          icon = '✅';
          break;
        case TripStatus.LoadingInProgress:
          color = '#f97316';
          bgColor = '#ffedd5';
          icon = '🚚';
          break;
        case TripStatus.DeliveryInProgress:
          color = '#d563f1';
          bgColor = '#e0e7ff';
          icon = '🚚';
          break;
        case TripStatus.Receipt:
          color = '#059669';
          bgColor = '#d1fae5';
          icon = '🏁';
          break;
        case TripStatus.Cancelled:
          color = '#dc2626';
          bgColor = '#fee2e2';
          icon = '❌';
          break;
      }
 
      return this.sanitizer.bypassSecurityTrustHtml(`
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 14px;">${icon}</span>
          <span style="
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
            color: ${color};
            background-color: ${bgColor};
            border: 1px solid ${color}20;
            white-space: nowrap;
            min-width: 120px;
            text-align: center;
          ">
            ${status}
          </span>
        </div>
      `);
    },
    html: true
  },
  {
    key: 'createdInfo',
    label: 'Création',
    sortable: true,  
    format: (row: any): SafeHtml => {
      const formatDateTime = (dateString: string) => {
        if (!dateString) return 'N/A';
        try {
          const date = new Date(dateString);
          return date.toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        } catch {
          return 'Date invalide';
        }
      };
 
      return this.sanitizer.bypassSecurityTrustHtml(`
        <div>
          <div style="margin-bottom: 4px;">
            <span style="color:#666; font-size:11px;">Par: </span>
            <span style="font-weight:500;">${row.createdByName || row.createdBy || 'N/A'}</span>
          </div>
          <div>
            <span style="color:#666; font-size:11px;">Le: </span>
            <span>${formatDateTime(row.createdAt)}</span>
          </div>
        </div>
      `);
    },
    html: true
  },
  {
    key: 'updatedInfo',
    label: 'Dernière modification',
    sortable: true,  
    format: (row: any): SafeHtml => {
      const formatDateTime = (dateString: string) => {
        if (!dateString) return 'N/A';
        try {
          const date = new Date(dateString);
          return date.toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        } catch {
          return 'Date invalide';
        }
      };
 
      const displayName = row.updatedByName || row.updatedBy || 'N/A';
      const displayDate = formatDateTime(row.updatedAt);
 
      return this.sanitizer.bypassSecurityTrustHtml(`
        <div>
          <div style="margin-bottom: 4px;">
            <span style="color:#666; font-size:11px;">Par: </span>
            <span style="font-weight:500;">${displayName}</span>
          </div>
          <div>
            <span style="color:#666; font-size:11px;">Le: </span>
            <span>${displayDate}</span>
          </div>
        </div>
      `);
    },
    html: true
  },
{
  key: 'Action',
  label: 'Actions',
  sortable: false,  
  format: (row: any) => {
    const actions = [];
   
    if (this.auth.hasPermission('TRAVEL_EDIT')) {
      actions.push('Modifier');
    }
   
    if (this.auth.hasPermission('TRAVEL_DISABLE')) {
      actions.push('Supprimer');
    }
   
    return actions;
  }
}
 
];
  ngOnInit() {
    this.loadTripSettings();
    this.checkForDraftOnLoad();
    this.getLatestData();
    this.loadTrucks();
    this.loadDrivers();
    
    // Initialize SignalR for real-time status updates
    this.initializeSignalR();
 
 
    this.searchControl.valueChanges.pipe(debounceTime(250))
      .subscribe((value: string | null) => {
        this.filter.search = value;
        this.filter.pageIndex = 0;
        this.getLatestData();
      });
 
 
    this.statusControl.valueChanges
      .subscribe((value: any) => {
        this.filter.tripStatus = value;
        this.filter.pageIndex = 0;
        this.getLatestData();
      });
 
 
    this.truckControl.valueChanges
      .subscribe((value: any) => {
        this.filter.truckId = value;
        this.filter.pageIndex = 0;
        this.getLatestData();
      });
 
 
    this.driverControl.valueChanges
      .subscribe((value: any) => {
        this.filter.driverId = value;
        this.filter.pageIndex = 0;
        this.getLatestData();
      });
 
 
    this.startDateControl.valueChanges
      .subscribe((date: Date | null) => {
        if (this.isDateRangeInvalid()) {
          this.snackBar.open(
            "La date de début doit être inférieure à la date de fin",
            "OK",
            { duration: 3000, verticalPosition: 'top' }
          );
          return;
        }
        this.filter.startDate = date ? this.formatDateLocal(date) : null;
        this.filter.pageIndex = 0;
        this.getLatestData();
      });
 
 
    this.endDateControl.valueChanges
      .subscribe((date: Date | null) => {
        if (this.isDateRangeInvalid()) {
          this.snackBar.open(
            "La date de fin doit être supérieure à la date de début",
            "OK",
            { duration: 3000, verticalPosition: 'top' }
          );
          return;
        }
        this.filter.endDate = date ? this.formatDateLocal(date) : null;
        this.filter.pageIndex = 0;
        this.getLatestData();
      });
  }
 
  private initializeSignalR(): void {
    // Subscribe to all notifications and update table when status changes
    this.signalRSubscription = this.signalRService.notifications$.subscribe({
      next: (notifications) => {
        if (notifications.length > 0) {
          // Process ALL notifications to maintain status sequence
          notifications.forEach(notification => {
            this.updateTripStatusInTable(notification);
          });
        }
      }
    });
 
    // Log connection status (optional, for debugging)
    this.signalRService.connectionStatus$.subscribe(isConnected => {
      console.log('🔌 SignalR for trips:', isConnected ? 'connected - real-time updates active' : 'disconnected');
    });
  }
 
  private updateTripStatusInTable(notification: TripNotification): void {
    // Only process if we have data and the notification has a tripId
    if (!this.pagedTripData?.data || !notification.tripId) return;
 
    // Find the trip in the current page data
    const tripIndex = this.pagedTripData.data.findIndex(t => t.id === notification.tripId);
    
    if (tripIndex !== -1) {
      // Get current trip
      const currentTrip = this.pagedTripData.data[tripIndex];
      const currentStatus = currentTrip.tripStatus;
      
      // Determine new status based on notification type
      let newStatus: TripStatus | undefined;
      
      if (notification.type === 'STATUS_CHANGE' && notification.newStatus) {
        newStatus = notification.newStatus as TripStatus;
      } else if (notification.type === 'TRIP_CANCELLED') {
        newStatus = TripStatus.Cancelled;
      }
      
      // If no new status, exit
      if (!newStatus) return;
      
      // Check if this is a valid status transition
      const isValidTransition = isValidStatusTransition(currentStatus, newStatus);
      
      console.log(`🔄 Status transition: ${currentStatus} → ${newStatus} - Valid: ${isValidTransition}`);
      
      // Only update if the transition is valid
      if (isValidTransition) {
        // Create a copy of the trip with updated values
        const updatedTrip = { ...currentTrip };
        updatedTrip.tripStatus = newStatus;
        
        const updatedData = [...this.pagedTripData.data];
        updatedData[tripIndex] = updatedTrip;
        
        // Update the paged data (creates new reference to trigger change detection)
        this.pagedTripData = {
          ...this.pagedTripData,
          data: updatedData
        };
        
        console.log(`✅ Trip ${notification.tripReference} status updated from ${currentStatus} to ${newStatus} in table`);
      } else {
        console.log(`⚠️ Invalid status transition: ${currentStatus} → ${newStatus} - Refreshing data from server`);
        // If invalid transition, refresh data from server to get correct state
        this.getLatestData();
      }
    } else {
      // Trip not in current page - refresh data to ensure consistency
      console.log(`Trip ${notification.tripReference} not in current view - refreshing data`);
      this.getLatestData();
    }
  }
 
    private loadTrucks() {
    this.httpService.getTrucks().subscribe({
      next: (trucks) => {
        this.trucks = trucks;
      },
      error: (error) => {
        console.error('Error loading trucks:', error);
      }
    });
  }
 
  private loadDrivers() {
    this.httpService.getDrivers().subscribe({
      next: (drivers) => {
        this.drivers = drivers;
      },
      error: (error) => {
        console.error('Error loading drivers:', error);
      }
    });
  }
 
 
  private isDateRangeInvalid(): boolean {
    const start = this.startDateControl.value;
    const end = this.endDateControl.value;
 
    if (!start || !end) {
      return false;
    }
 
    return new Date(start) > new Date(end);
  }
 
 
  private formatDateLocal(date: Date | null): string | null {
    if (!date) return null;
   
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
   
    return `${year}-${month}-${day}`;
  }
 
 
  resetFilters() {
 
    this.searchControl.setValue('');
    this.statusControl.setValue(null);
    this.truckControl.setValue(null);
    this.driverControl.setValue(null);
    this.startDateControl.setValue(null);
    this.endDateControl.setValue(null);
 
 
    this.filter = {
      pageIndex: 0,
      pageSize: 10,
      search: null,
      status: null,
      truckId: null,
      driverId: null,
      startDate: null,
      endDate: null
    };
 
 
    this.getLatestData();
 
   
    this.snackBar.open('Filtres réinitialisés', 'OK', {
      duration: 2000,
      verticalPosition: 'top'
    });
  }
 
  ngOnDestroy() {
    // Clean up SignalR subscription
    if (this.signalRSubscription) {
      this.signalRSubscription.unsubscribe();
    }
  }
 
  add() {
    this.router.navigate(['trips/create']);
  }
 
edit(trip: any) {
if (!this.allowEditTrip) {
    Swal.fire({
      title: 'Modification non autorisée',
      html: `
        <div style="text-align: center; padding: 10px;">
          <mat-icon style="font-size: 48px; color: #ff9800; margin-bottom: 16px;">warning</mat-icon>
          <p style="font-size: 16px; margin-bottom: 8px;">La modification des voyages est désactivée</p>
          <p style="color: #666; font-size: 14px;">Veuillez contacter votre administrateur</p>
        </div>
      `,
      icon: 'warning',
      confirmButtonText: 'OK',
      confirmButtonColor: '#3085d6',
      width: 450,
      customClass: {
        popup: 'swal-custom-popup'
      }
    });
    return;
  }
  this.router.navigate(['trips/edit', trip.id]);
}
  delete(trip: any) {
   if (!this.allowDeleteTrip) {
    Swal.fire({
      title: 'Suppression non autorisée',
      html: `
        <div style="text-align: center; padding: 10px;">
          <mat-icon style="font-size: 48px; color: #f44336; margin-bottom: 16px;">block</mat-icon>
          <p style="font-size: 16px; margin-bottom: 8px;">La suppression des voyages est désactivée</p>
          <p style="color: #666; font-size: 14px;">Veuillez contacter votre administrateur</p>
        </div>
      `,
      icon: 'error',
      confirmButtonText: 'OK',
      confirmButtonColor: '#3085d6',
      width: 450,
      customClass: {
        popup: 'swal-custom-popup'
      }
    });
    return;
  }
    Swal.fire({
      title: 'Êtes-vous sûr?',
      html: `
        <div style="text-align: left; padding: 10px;">
          <p><strong>Référence:</strong> ${trip.bookingId}</p>
          <p><strong>Chauffeur:</strong> ${trip.driver || 'N/A'}</p>
          <p><strong>Camion:</strong> ${trip.truck || 'N/A'}</p>
          <p style="color: #d33; margin-top: 15px; font-weight: bold;">
            ⚠️ Cette action est irréversible !
          </p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, supprimer!',
      cancelButtonText: 'Annuler',
      width: 500,
      customClass: {
        popup: 'swal-custom-popup'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.httpService.deleteTrip(trip.id).subscribe({
          next: () => {
            Swal.fire({
              title: 'Supprimé!',
              text: 'Le voyage a été supprimé avec succès.',
              icon: 'success',
              confirmButtonColor: '#3085d6',
              timer: 2000,
              showConfirmButton: false
            });
            this.getLatestData();
          },
          error: (error) => {
            console.error('Error deleting trip:', error);
            Swal.fire({
              title: 'Erreur!',
              text: 'Impossible de supprimer le voyage.',
              icon: 'error',
              confirmButtonColor: '#d33'
            });
          }
        });
      }
    });
  }
 
  viewDetails(trip: any) {
    this.router.navigate(['/trips', trip.id]);
  }
 
  openDialog(): void {
    const ref = this.dialog.open(TripForm, {
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
    switch(event.btn) {
      case "Modifier":
        this.edit(event.rowData);
        break;
      case "Supprimer":
        this.delete(event.rowData);
        break;
      case "Voir détails":
        this.viewDetails(event.rowData);
        break;
    }
  }
 
  exportCSV() {
    const rows: any[] = this.pagedTripData?.data || [];
 
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
        d.estimatedStartDate
          ? new Date(d.estimatedStartDate).toLocaleString()
          : '',
        d.estimatedEndDate
          ? new Date(d.estimatedEndDate).toLocaleString()
          : '',
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
 
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;'
    });
 
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'voyages.csv';
    link.click();
  }
 
  exportExcel() {
    const data: any[] = this.pagedTripData?.data || [];
 
    const excelData = data.map(d => ({
      ID: d.id ?? '',
      'Référence': d.bookingId ?? '',
      'Référence métier': d.tripReference ?? '',
      'Camion': d.truck ?? '',
      'Chauffeur': d.driver ?? '',
      'Début estimé': d.estimatedStartDate
        ? new Date(d.estimatedStartDate).toLocaleString()
        : '',
      'Fin estimée': d.estimatedEndDate
        ? new Date(d.estimatedEndDate).toLocaleString()
        : '',
      'Distance (km)': d.estimatedDistance ?? 0,
      'Durée (h)': d.estimatedDuration ?? 0,
      'Livraisons totales': d.deliveryCount ?? 0,
      'Livraisons terminées': d.completedDeliveries ?? 0,
      'Statut': d.tripStatus ?? ''
    }));
 
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = {
      Sheets: { Voyages: worksheet },
      SheetNames: ['Voyages']
    } as any;
 
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });
 
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
 
    saveAs(blob, 'voyages.xlsx');
  }
 
  exportPDF() {
    const doc = new jsPDF();
    const rows: any[] = this.pagedTripData?.data || [];
 
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
        d.estimatedStartDate
          ? new Date(d.estimatedStartDate).toLocaleString()
          : '',
        d.estimatedEndDate
          ? new Date(d.estimatedEndDate).toLocaleString()
          : '',
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
 
sortColumn: string = '';
sortDirection: 'asc' | 'desc' = 'asc';
sortableColumns = ['bookingId', 'tripReference', 'dates', 'distanceDuration', 'tripStatus', 'createdInfo', 'updatedInfo'];
 
 
onSort(event: any): void {
  const { column, direction } = event;
 
  if (this.sortableColumns.includes(column.key)) {
    this.sortColumn = column.key;
    this.sortDirection = direction;
   
   
    this.filter.sortColumn = column.key;
    this.filter.sortDirection = direction;
    this.filter.pageIndex = 0;
   
    this.getLatestData();
  }
}
 
 
getLatestData() {
  const apiFilter = {
    ...this.filter,
    sortColumn: this.sortColumn,
    sortDirection: this.sortDirection
  };
 
  this.httpService.getTripsList(apiFilter).subscribe({
    next: (result: any) => {
      if (result && result.data) {
        this.pagedTripData = {
          data: result.data.data || [],
          totalData: result.data.totalData || 0
        };
        this.totalData = result.data.totalData || 0;
       
        const cancelled = (result.data.data || []).filter((t: any) => t.tripStatus === 'Cancelled').length;
        this.notificationService.setCancelledTripsCount(cancelled);
      } else {
        this.pagedTripData = { data: [], totalData: 0 };
        this.totalData = 0;
      }
    },
    error: (error) => {
      console.error('Error loading trips:', error);
      this.snackBar.open('Erreur lors du chargement des voyages', 'OK', {
        duration: 3000,
        verticalPosition: 'top'
      });
    }
  });
}
 
 
clearSorting(): void {
  this.sortColumn = '';
  this.sortDirection = 'asc';
  this.filter.sortColumn = undefined;
  this.filter.sortDirection = undefined;
  this.getLatestData();
}
 
getColumnLabel(columnKey: string): string {
  const column = this.showCols.find(col => col.key === columnKey);
  return column ? column.label : columnKey;
}
 
private readonly DRAFT_KEY = 'trip_draft_v1';
 
 
private checkForDraftOnLoad(): void {
  const draft = this.loadDraft();
 
  if (draft) {
    this.showDraftRestoreNotification(draft);
  }
}
 
private loadDraft(): any {
  try {
    const saved = localStorage.getItem(this.DRAFT_KEY);
    if (!saved) return null;
   
    const draft = JSON.parse(saved);
   
   
    if (draft.savedAt) {
      const savedDate = new Date(draft.savedAt);
      const now = new Date();
      const diffHours = (now.getTime() - savedDate.getTime()) / (1000 * 60 * 60);
     
      if (diffHours > 24) {
        console.log('Draft too old, auto-clearing');
        this.clearDraft();
        return null;
      }
    }
   
    return draft;
  } catch (error) {
    console.error('Error loading draft:', error);
    this.clearDraft();
    return null;
  }
}
 
private clearDraft(): void {
  localStorage.removeItem(this.DRAFT_KEY);
}
 
private showDraftRestoreNotification(draft: any): void {
  const deliveryCount = draft.deliveries?.length || 0;
  const dateStr = draft.formData?.estimatedStartDate ?
    new Date(draft.formData.estimatedStartDate).toLocaleDateString() : 'Date non définie';
  const lastSaved = draft.savedAt ? new Date(draft.savedAt).toLocaleTimeString() : 'Inconnue';
 
  Swal.fire({
    title: '📋 Brouillon disponible',
    html: `
      <div style="text-align: left; padding: 10px;">
        <div style="display: flex; align-items: flex-start; margin-bottom: 20px;">
          <div style="background-color: #3b82f6; color: white; padding: 8px; border-radius: 8px; margin-right: 15px;">
            <svg style="width: 24px; height: 24px;" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
            </svg>
          </div>
          <div>
            <h4 style="margin: 0 0 8px 0; color: #1f2937;">Un brouillon de voyage a été trouvé</h4>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              Vous avez un voyage en cours de création non terminé
            </p>
          </div>
        </div>
       
        <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #bae6fd;">
          <h5 style="margin: 0 0 12px 0; color: #0369a1; font-size: 15px;">📋 Détails du brouillon</h5>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
            <div>
              <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">📦 Livraisons</div>
              <div style="font-weight: 700; font-size: 18px; color: #1f2937;">${deliveryCount}</div>
            </div>
            <div>
              <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">📅 Date prévue</div>
              <div style="font-weight: 700; font-size: 18px; color: #1f2937;">${dateStr}</div>
            </div>
            <div>
              <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">⏰ Dernière sauvegarde</div>
              <div style="font-weight: 700; font-size: 18px; color: #1f2937;">${lastSaved}</div>
            </div>
            <div>
              <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">📝 Statut</div>
              <div style="font-weight: 700; font-size: 18px; color: #059669;">Brouillon</div>
            </div>
          </div>
        </div>
       
        <p style="color: #4b5563; margin-bottom: 20px; font-size: 14px; line-height: 1.5;">
          Voulez-vous restaurer ce brouillon pour continuer votre travail ou
          préférez-vous commencer un nouveau voyage ?
        </p>
      </div>
    `,
    icon: 'info',
    showDenyButton: true,
    showCancelButton: true,
    confirmButtonText: '📥 Restaurer le brouillon',
    denyButtonText: '🗑️ Effacer et recommencer',
    cancelButtonText: '✕ Plus tard',
    confirmButtonColor: '#3b82f6',
    denyButtonColor: '#ef4444',
    cancelButtonColor: '#6b7280',
    reverseButtons: true,
    width: '550px',
    backdrop: true,
    allowOutsideClick: false,
    allowEscapeKey: false,
    customClass: {
      container: 'draft-restore-swal',
      popup: 'draft-restore-swal-popup',
      title: 'draft-restore-swal-title',
      htmlContainer: 'draft-restore-swal-html',
      confirmButton: 'draft-restore-swal-confirm-btn',
      denyButton: 'draft-restore-swal-deny-btn',
      cancelButton: 'draft-restore-swal-cancel-btn'
    }
  }).then((result) => {
    if (result.isConfirmed) {
 
      this.redirectToTripFormWithDraft(draft);
    } else if (result.isDenied) {
   
      this.clearDraft();
      this.snackBar.open('Brouillon effacé', 'Fermer', {
        duration: 3000,
        panelClass: ['info-snackbar']
      });
    } else {
     
      this.snackBar.open('Brouillon conservé pour plus tard', 'Fermer', { duration: 2000 });
    }
  });
}
 
private redirectToTripFormWithDraft(draft: any): void {
  localStorage.setItem('trip_draft_to_restore', JSON.stringify(draft));
  this.clearDraft();
  this.router.navigate(['/trips/create']);
}
private loadTripSettings(): void {
  this.settingsService.getTripSettings().subscribe({
    next: (settings) => {
      this.allowEditTrip = settings.allowEditTrips;
      this.allowDeleteTrip = settings.allowDeleteTrips;
    },
    error: (err) => {
      console.error('Erreur récupération des settings :', err);
      this.allowEditTrip = true;
      this.allowDeleteTrip = true;
    }
  });
}
isEditDisabled(): boolean {
  return !this.allowEditTrip;
}
 
isDeleteDisabled(): boolean {
  return !this.allowDeleteTrip;
}
}