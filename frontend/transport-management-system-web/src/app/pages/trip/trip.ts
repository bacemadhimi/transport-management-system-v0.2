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


const VALID_STATUS_TRANSITIONS: { [key in TripStatus]?: TripStatus[] } = {
  [TripStatus.Planned]: [TripStatus.Accepted, TripStatus.Cancelled],
  [TripStatus.Accepted]: [TripStatus.LoadingInProgress, TripStatus.Cancelled],
  [TripStatus.LoadingInProgress]: [TripStatus.DeliveryInProgress, TripStatus.Cancelled],
  [TripStatus.DeliveryInProgress]: [TripStatus.Receipt, TripStatus.Cancelled],
  [TripStatus.Receipt]: [],
  [TripStatus.Cancelled]: []
};


function isValidStatusTransition(currentStatus: TripStatus, newStatus: TripStatus): boolean {

  if (currentStatus === newStatus) return true;


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


   private translation = inject(Translation);
    t(key: string): string { return this.translation.t(key); }

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
  maxTripsPerDay: number = 10; 
  tripsCreatedToday: number = 0;
  createButtonDisabled: boolean = false;
  createButtonTooltip: string = '';
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
      // ✅ EXACTEMENT les MÊMES noms de statut que le mobile (français)
      // Supporte les statuts backend ET les notifications françaises
      const statusLabels: any = {
        // Backend status values
        'Pending': '⏳ En attente',
        'Planned': '📋 Planifié',
        'Accepted': '✅ Accepté',
        'Loading': '📦 Chargement',
        'LoadingInProgress': '📦 Chargement',
        'InDelivery': '🚚 Livraison',
        'DeliveryInProgress': '🚚 Livraison',
        'Receipt': '🚚 Terminé',
        'Completed': '🚚 Terminé',
        'Cancelled': '❌ Annulé',
        'Refused': '⛔ Refusé',
        // French notification labels (also map to same display)
        'En attente': '⏳ En attente',
        'Planifié': '📋 Planifié',
        'Accepté': '✅ Accepté',
        'Chargement': '📦 Chargement',
        'En cours de chargement': '📦 Chargement',
        'Livraison': '🚚 Livraison',
        'En cours de livraison': '🚚 Livraison',
        'Terminé': '🚚 Terminé',
        'Annulé': '❌ Annulé',
        'Refusé': '⛔ Refusé'
      };

      const status = statusLabels[row.tripStatus] || row.tripStatus || 'N/A';

      let color = '#6c757d';
      let bgColor = '#f8f9fa';

      // Support BOTH backend and French values for coloring
      const rawStatus = row.tripStatus;
      if (rawStatus === 'Pending' || rawStatus === 'Planned' || rawStatus === 'En attente' || rawStatus === 'Planifié') {
        color = '#ff8c00';
        bgColor = '#fff5e6';
      } else if (rawStatus === 'Accepted' || rawStatus === 'Accepté') {
        color = '#4caf50';
        bgColor = '#e8f5e9';
      } else if (rawStatus === 'Loading' || rawStatus === 'LoadingInProgress' || rawStatus === 'Chargement' || rawStatus === 'En cours de chargement') {
        color = '#5856d6';
        bgColor = '#f0edff';
      } else if (rawStatus === 'InDelivery' || rawStatus === 'DeliveryInProgress' || rawStatus === 'Livraison' || rawStatus === 'En cours de livraison') {
        color = '#ff9500';
        bgColor = '#fff8e6';
      } else if (rawStatus === 'Receipt' || rawStatus === 'Completed' || rawStatus === 'Terminé') {
        color = '#4caf50';
        bgColor = '#e8f5e9';
      } else if (rawStatus === 'Cancelled' || rawStatus === 'Refused' || rawStatus === 'Annulé' || rawStatus === 'Refusé') {
        color = '#f44336';
        bgColor = '#ffebee';
      }

      return this.sanitizer.bypassSecurityTrustHtml(`
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="
            padding: 6px 14px;
            border-radius: 14px;
            font-size: 13px;
            font-weight: 600;
            color: ${color};
            background-color: ${bgColor};
            border: 1px solid ${color}30;
            white-space: nowrap;
            min-width: 140px;
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


    this.initializeSignalR();

    setInterval(() => {
        this.refreshTodayTripsCount();
      }, 300000);
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

    // ✅ Écouter TripStatusChanged en temps réel - MISE À JOUR DIRECTE SANS REFRESH
    this.signalRService.onTripStatusChanged((update: any) => {
      console.log('📊 Trip status changed REAL TIME:', update);
      
      // ✅ Utiliser TripId (nombre) pour la comparaison
      const tripId = update.TripId || update.tripId;
      const newStatus = update.NewStatus || update.newStatus || update.status;
      
      if (tripId && newStatus && this.pagedTripData?.data) {
        // ✅ Comparaison stricte en convertissant les deux en nombres
        const trip = this.pagedTripData.data.find(t => Number(t.id) === Number(tripId));
        if (trip) {
          console.log(`🔄 Updating trip ${tripId} status in memory: ${trip.tripStatus} → ${newStatus}`);
          trip.tripStatus = newStatus;
          
          // ✅ Mettre à jour l'affichage immédiatement (trigger change detection)
          this.pagedTripData = { ...this.pagedTripData };
          
          console.log(`✅ Trip ${trip.tripReference} display updated to ${newStatus} - NO refresh!`);
        } else {
          console.warn(`⚠️ Trip ${tripId} not found in current view, reloading...`);
          this.getLatestData();
        }
      }
    });

    // Écouter aussi les notifications existantes
    this.signalRSubscription = this.signalRService.notifications$.subscribe({
      next: (notifications) => {
        if (notifications.length > 0) {
          notifications.forEach(notification => {
            this.updateTripStatusInTable(notification);
          });
        }
      }
    });


    this.signalRService.connectionStatus$.subscribe(isConnected => {
      console.log('🔌 SignalR for trips:', isConnected ? 'connected - real-time updates active' : 'disconnected');
    });
  }

  private updateTripStatusInTable(notification: TripNotification): void {

    if (!this.pagedTripData?.data || !notification.tripId) return;

    const tripId = notification.tripId;
    const tripIndex = this.pagedTripData.data.findIndex(t => t.id === tripId);

    if (tripIndex !== -1) {
      // Trip found on current page - update directly
      const currentTrip = this.pagedTripData.data[tripIndex];
      const currentStatus = currentTrip.tripStatus;

      // ✅ Accepter le statut tel quel (français ou backend)
      let newStatus: string = '';

      if (notification.type === 'STATUS_CHANGE' && notification.newStatus) {
        newStatus = notification.newStatus;
      } else if (notification.type === 'TRIP_CANCELLED') {
        newStatus = 'Cancelled';
      }

      if (!newStatus) return;

      // ✅ TOUJOURS mettre à jour en mémoire SANS refresh
      const updatedTrip = { ...currentTrip };
      updatedTrip.tripStatus = newStatus as any;

      const updatedData = [...this.pagedTripData.data];
      updatedData[tripIndex] = updatedTrip;

      this.pagedTripData = {
        ...this.pagedTripData,
        data: updatedData
      };

      console.log(`✅ Trip ${notification.tripReference} status updated: ${currentStatus} → ${newStatus} - NO refresh!`);
    } else {
      // ✅ Trip not on current page - mais on le met à jour quand même en rechargeant
      // C'est le seul moyen car on n'a pas le trip en mémoire
      console.log(`🔄 Trip ${notification.tripReference} not on current page - reloading to update...`);
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

    if (this.signalRSubscription) {
      this.signalRSubscription.unsubscribe();
    }
  }

add() {
  console.log('Add clicked - Today trips:', this.tripsCreatedToday, 'Max:', this.maxTripsPerDay);
  
  if (this.tripsCreatedToday >= this.maxTripsPerDay) {
    console.log('Limit reached, showing alert');
    Swal.fire({
      title: 'Limite journalière atteinte',
      html: `
        <div style="text-align: center; padding: 20px;">
          <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
          <p style="font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #f59e0b;">
            Vous avez atteint la limite de ${this.maxTripsPerDay} voyage par jour
          </p>
          <p style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">
            Vous avez déjà créé ${this.tripsCreatedToday} voyage aujourd'hui.
          </p>
          <p style="color: #6b7280; font-size: 14px;">
            Réessayez demain ou contactez votre administrateur.
          </p>
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

     ref.afterClosed().subscribe(() => {
    this.getLatestData();
    this.refreshTodayTripsCount();
  });
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

isEditDisabled(): boolean {
  return !this.allowEditTrip;
}

isDeleteDisabled(): boolean {
  return !this.allowDeleteTrip;
}
private loadTripSettings(): void {
  this.settingsService.getTripSettings().subscribe({
    next: (settings) => {
      console.log('Trip settings loaded:', settings);
      this.allowEditTrip = settings.allowEditTrips;
      this.allowDeleteTrip = settings.allowDeleteTrips;
      
      // Make sure we're getting the numeric value
      this.maxTripsPerDay = Number(settings.maxTripsPerDay) || 10;
      
      console.log('Max trips per day set to:', this.maxTripsPerDay);
      
      // Check today's count after loading settings
      setTimeout(() => {
        this.checkTodayTripsCount();
      }, 500);
    },
    error: (err) => {
      console.error('Erreur récupération des settings :', err);
      this.allowEditTrip = true;
      this.allowDeleteTrip = true;
      this.maxTripsPerDay = 10;
    }
  });
}
refreshTodayTripsCount(): void {
  this.checkTodayTripsCount();
}

private checkTodayTripsCount(): void {
  const today = new Date();
  
  console.log('Checking trips for date:', this.formatDateForAPI(today));

  this.httpService.getTodayTripCount().subscribe({
    next: (result: any) => {
      console.log('Today trips result:', result);
      
      if (result) {
        this.tripsCreatedToday = result.tripsCreatedToday || 0;
        this.maxTripsPerDay = result.maxTripsPerDay || 10;
        
        this.updateCreateButtonState();
        console.log(`Trips created today: ${this.tripsCreatedToday}/${this.maxTripsPerDay}`);
        console.log(`Has reached limit: ${result.hasReachedLimit}`);
      }
    },
    error: (error) => {
      console.error('Error checking today\'s trips count:', error);
      // Fallback to default values
      this.tripsCreatedToday = 0;
      this.maxTripsPerDay = 10;
      this.updateCreateButtonState();
    }
  });
}


private formatDateForAPI(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

private updateCreateButtonState(): void {
  const limitReached = this.tripsCreatedToday >= this.maxTripsPerDay;
  this.createButtonDisabled = limitReached;
  
  if (limitReached) {
    this.createButtonTooltip = `Limite journalière atteinte: ${this.maxTripsPerDay} voyages maximum par jour`;
  } else {
    this.createButtonTooltip = `Créer un nouveau voyage (${this.tripsCreatedToday}/${this.maxTripsPerDay} aujourd'hui)`;
  }
}
}