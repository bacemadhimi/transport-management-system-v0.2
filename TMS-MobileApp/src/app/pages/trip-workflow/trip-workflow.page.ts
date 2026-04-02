import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { GPSTrackingService, GPSPosition, TripStatusUpdate } from '../../services/gps-tracking.service';
import { AuthService } from '../../services/auth.service';

interface TripDetails {
  id: number;
  tripReference: string;
  status: string;
  driverName?: string;
  truckImmatriculation?: string;
  estimatedDistance?: number;
  estimatedDuration?: number;
  destination?: string;
  deliveries?: any[];
}

@Component({
  selector: 'app-trip-workflow',
  templateUrl: './trip-workflow.page.html',
  styleUrls: ['./trip-workflow.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule
  ]
})
export class TripWorkflowPage implements OnInit, OnDestroy {
  trip?: TripDetails;
  tripId?: number;
  driverId?: number;
  currentStatus: string = 'Pending';
  isLoading: boolean = false;
  showRejectModal: boolean = false;
  rejectReason: string = '';
  rejectReasonCode: string = 'Other';
  gpsTrackingActive: boolean = false;
  connectionStatus: boolean = false;
  currentLatitude?: number;
  currentLongitude?: number;
  lastPositionUpdate?: Date;

  private subscriptions: Subscription[] = [];

  readonly rejectionReasons = [
    { code: 'BadWeather', label: 'Mauvais temps', icon: 'cloud' },
    { code: 'Unavailable', label: 'Camion/Chauffeur non disponible', icon: 'close-circle' },
    { code: 'Medical', label: 'Raison médicale', icon: 'medkit' },
    { code: 'PersonalEmergency', label: 'Urgence personnelle', icon: 'alert' },
    { code: 'RouteIssue', label: 'Problème d\'itinéraire', icon: 'map' },
    { code: 'VehicleMaintenance', label: 'Maintenance véhicule', icon: 'construct' },
    { code: 'Other', label: 'Autre', icon: 'ellipsis-horizontal' }
  ];

  readonly statusWorkflow = [
    { status: 'Pending', label: 'En attente', icon: 'time', color: 'medium' },
    { status: 'Assigned', label: 'Assigné', icon: 'person', color: 'primary' },
    { status: 'Accepted', label: 'Accepté', icon: 'checkmark-circle', color: 'success' },
    { status: 'Loading', label: 'Chargement', icon: 'download', color: 'warning' },
    { status: 'InDelivery', label: 'En livraison', icon: 'car', color: 'primary' },
    { status: 'Arrived', label: 'Arrivé', icon: 'location', color: 'success' },
    { status: 'Completed', label: 'Terminé', icon: 'checkmark-done-circle', color: 'success' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gpsService: GPSTrackingService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.tripId = Number(this.route.snapshot.paramMap.get('tripId'));
    const user = this.authService.currentUser();
<<<<<<< HEAD
<<<<<<< HEAD
    this.driverId = user?.driverId;
=======
    this.driverId = user?.id;
>>>>>>> dev
=======
    this.driverId = user?.driverId;
>>>>>>> 937f419bcbe87468db350f976736fa00128c160d

    if (this.tripId) {
      this.loadTripDetails();
      this.connectToGPSHub();
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
    this.gpsService.disconnect();
  }

  private async connectToGPSHub() {
    try {
      await this.gpsService.connect(this.driverId);
      
      // Observer connection status
      this.subscriptions.push(
        this.gpsService.getConnectionStatus().subscribe(status => {
          this.connectionStatus = status;
          console.log('Connection status:', status);
        })
      );

      // Observer position updates
      this.subscriptions.push(
        this.gpsService.getPositionUpdates().subscribe(position => {
          this.currentLatitude = position.latitude;
          this.currentLongitude = position.longitude;
          this.lastPositionUpdate = position.timestamp;
        })
      );

      // Observer status updates
      this.subscriptions.push(
        this.gpsService.getStatusUpdates().subscribe(update => {
          if (update.tripId === this.tripId) {
            this.currentStatus = update.status;
            this.trip = { ...this.trip!, status: update.status };
          }
        })
      );

      // Start GPS tracking if trip is accepted
      if (this.currentStatus === 'Accepted' || this.currentStatus === 'InDelivery') {
        this.startGPSTracking();
      }

    } catch (error) {
      console.error('Failed to connect to GPS Hub:', error);
    }
  }

  private async loadTripDetails() {
    this.isLoading = true;
    try {
      // TODO: Call API to load trip details
      // For now, mock data
      this.trip = {
        id: this.tripId!,
        tripReference: `TRIP-${this.tripId}`,
        status: 'Assigned',
        driverName: 'Ahmed Driver 1',
        truckImmatriculation: '120 TN 1001',
        estimatedDistance: 111,
        estimatedDuration: 1,
        destination: 'Centre Logistique Ariana 9'
      };
      this.currentStatus = this.trip.status;
    } catch (error) {
      console.error('Error loading trip details:', error);
    } finally {
      this.isLoading = false;
    }
  }

  public async acceptTrip() {
    if (!this.tripId) return;

    try {
      await this.gpsService.acceptTrip(this.tripId);
      this.currentStatus = 'Accepted';
      this.trip = { ...this.trip!, status: 'Accepted' };
      this.startGPSTracking();
      
      // Show success message
      this.showSuccessToast('Trip accepté avec succès !');
    } catch (error) {
      console.error('Error accepting trip:', error);
      this.showErrorToast('Erreur lors de l\'acceptation du trip');
    }
  }

  public showRejectPopup() {
    this.showRejectModal = true;
  }

  public async rejectTrip() {
    if (!this.tripId || !this.rejectReason) return;

    try {
      await this.gpsService.rejectTrip(this.tripId, this.rejectReason, this.rejectReasonCode);
      this.currentStatus = 'Refused';
      this.trip = { ...this.trip!, status: 'Refused' };
      this.showRejectModal = false;
      
      this.showSuccessToast('Trip refusé');
      this.router.navigate(['/trips']);
    } catch (error) {
      console.error('Error rejecting trip:', error);
      this.showErrorToast('Erreur lors du refus du trip');
    }
  }

  public async startLoading() {
    if (!this.tripId) return;
    try {
      await this.gpsService.startLoading(this.tripId);
      this.currentStatus = 'Loading';
      this.trip = { ...this.trip!, status: 'Loading' };
      this.showSuccessToast('Chargement démarré');
    } catch (error) {
      this.showErrorToast('Erreur lors du démarrage du chargement');
    }
  }

  public async startDelivery() {
    if (!this.tripId) return;
    try {
      await this.gpsService.startDelivery(this.tripId);
      this.currentStatus = 'InDelivery';
      this.trip = { ...this.trip!, status: 'InDelivery' };
      this.startGPSTracking();
      this.showSuccessToast('Livraison démarrée');
    } catch (error) {
      this.showErrorToast('Erreur lors du démarrage de la livraison');
    }
  }

  public async arrivedAtDestination() {
    if (!this.tripId) return;
    try {
      await this.gpsService.arrivedAtDestination(this.tripId);
      this.currentStatus = 'Arrived';
      this.trip = { ...this.trip!, status: 'Arrived' };
      this.showSuccessToast('Arrivé à destination');
    } catch (error) {
      this.showErrorToast('Erreur lors de la confirmation d\'arrivée');
    }
  }

  public async completeTrip() {
    if (!this.tripId) return;
    try {
      await this.gpsService.completeTrip(this.tripId);
      this.currentStatus = 'Completed';
      this.trip = { ...this.trip!, status: 'Completed' };
      this.stopGPSTracking();
      this.showSuccessToast('Livraison terminée !');
      
      // Navigate back after delay
      setTimeout(() => {
        this.router.navigate(['/trips']);
      }, 2000);
    } catch (error) {
      this.showErrorToast('Erreur lors de la finalisation du trip');
    }
  }

  private startGPSTracking() {
    if (this.driverId && this.tripId) {
      this.gpsService.startTracking(this.driverId, undefined, this.tripId);
      this.gpsTrackingActive = true;
      console.log('GPS tracking started');
    }
  }

  private stopGPSTracking() {
    this.gpsService.stopTracking();
    this.gpsTrackingActive = false;
    console.log('GPS tracking stopped');
  }

  private showSuccessToast(message: string) {
    // TODO: Implement toast
    alert(message);
  }

  private showErrorToast(message: string) {
    // TODO: Implement toast
    alert(message);
  }

  public canAccept(): boolean {
    return this.currentStatus === 'Assigned' || this.currentStatus === 'Pending';
  }

  public canStartLoading(): boolean {
    return this.currentStatus === 'Accepted';
  }

  public canStartDelivery(): boolean {
    return this.currentStatus === 'Loading';
  }

  public canArrive(): boolean {
    return this.currentStatus === 'InDelivery';
  }

  public canComplete(): boolean {
    return this.currentStatus === 'Arrived';
  }

  public getStatusColor(status: string): string {
    const workflowItem = this.statusWorkflow.find(w => w.status === status);
    return workflowItem?.color || 'medium';
  }

  public getStatusIcon(status: string): string {
    const workflowItem = this.statusWorkflow.find(w => w.status === status);
    return workflowItem?.icon || 'help-circle';
  }

  public isStatusCompleted(status: string): boolean {
    const statusIndex = this.statusWorkflow.findIndex(s => s.status === status);
    const currentIndex = this.statusWorkflow.findIndex(s => s.status === this.currentStatus);
    return statusIndex < currentIndex;
  }

  public getStatusDescription(status: string): string {
    const descriptions: Record<string, string> = {
      'Pending': 'En attente d\'assignment',
      'Assigned': 'Assigné à un chauffeur',
      'Accepted': 'Trip accepté',
      'Loading': 'Chargement en cours',
      'InDelivery': 'Livraison en cours',
      'Arrived': 'Arrivé à destination',
      'Completed': 'Livraison terminée',
      'Cancelled': 'Trip annulé',
      'Refused': 'Trip refusé'
    };
    return descriptions[status] || 'Statut inconnu';
  }
}
