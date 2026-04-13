import { Component, OnInit, inject } from '@angular/core';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TripDetailsModalComponent } from '../trip-details-modal/trip-details-modal.component';

interface TripHistory {
  id: number;
  tripReference: string;
  status: string;
  date: string;
  distance: number;
  deliveriesCount: number;
  estimatedStartDate: string;
  estimatedEndDate?: string;
  driver?: { name: string };
  truck?: { immatriculation: string };
  deliveries?: any[];
}

@Component({
  selector: 'app-trip-history',
  templateUrl: './trip-history.page.html',
  styleUrls: ['./trip-history.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class TripHistoryPage implements OnInit {
  private router = inject(Router);
  private modalController = inject(ModalController);
  private authService = inject(AuthService);
  private toastController = inject(ToastController);

  history: TripHistory[] = [];
  filteredHistory: TripHistory[] = [];
  filterStatus: string = 'all';
  loading: boolean = true;

  ngOnInit() {
    this.loadHistory();
  }

  async loadHistory() {
    this.loading = true;
    try {
      const user = this.authService.currentUser();
      const userEmail = user?.email;
      
      // Charger depuis localStorage
      const offlineTrips = localStorage.getItem('offlineTrips');
      let allTrips: any[] = [];
      
      if (offlineTrips) {
        allTrips = JSON.parse(offlineTrips);
      }
      
      // Filtrer les trajets du conducteur connecté
      if (userEmail) {
        allTrips = allTrips.filter((trip: any) => 
          trip.driver?.email === userEmail || 
          trip.driverId === user?.id
        );
      }
      
      console.log('📊 Total trips loaded for history:', allTrips.length);
      
      // Mapper les trajets pour l'historique
      this.history = allTrips.map((trip: any) => ({
        id: trip.id,
        tripReference: trip.tripReference || `TRIP-${trip.id}`,
        status: trip.tripStatus || trip.status || 'Planned',
        date: trip.actualEndDate || trip.estimatedEndDate || trip.estimatedStartDate,
        distance: trip.estimatedDistance || 0,
        deliveriesCount: trip.deliveries?.length || 0,
        estimatedStartDate: trip.estimatedStartDate,
        estimatedEndDate: trip.estimatedEndDate,
        driver: trip.driver,
        truck: trip.truck,
        deliveries: trip.deliveries || []
      }));
      
      console.log('✅ History trips:', this.history.length);
      console.log('📋 Statuses in history:', this.history.map(t => t.status));
      
      this.applyFilter();
      this.loading = false;
    } catch (error) {
      console.error('❌ Error loading history:', error);
      await this.showToast('Erreur de chargement de l\'historique', 'danger');
      this.loading = false;
    }
  }

  /**
   * Obtenir le texte d'affichage du statut
   */
  getStatusText(status: string): string {
    const statusTextMap: { [key: string]: string } = {
      'Receipt': '🎉 Terminé',
      'Completed': '🎉 Terminé',
      'Cancelled': '❌ Annulé',
      'Refused': '⛔ Refusé',
      'Pending': '⏳ En attente',
      'Planned': '📋 Planifié',
      'Accepted': '✅ Accepté',
      'Loading': '📦 Chargement',
      'LoadingInProgress': '📦 Chargement',
      'InDelivery': '🚚 Livraison',
      'DeliveryInProgress': '🚚 Livraison'
    };
    return statusTextMap[status] || status;
  }

  /**
   * Obtenir l'icône du statut
   */
  getStatusIcon(status: string): string {
    const iconMap: { [key: string]: string } = {
      'Receipt': 'checkmark-done-circle',
      'Completed': 'checkmark-done-circle',
      'Cancelled': 'close-circle',
      'Refused': 'ban',
      'Pending': 'time',
      'Planned': 'calendar',
      'Accepted': 'checkmark-circle',
      'Loading': 'cube',
      'LoadingInProgress': 'cube',
      'InDelivery': 'boat',
      'DeliveryInProgress': 'boat'
    };
    return iconMap[status] || 'help-circle';
  }

  /**
   * Obtenir le gradient du statut
   */
  getStatusGradient(status: string): string {
    const gradientMap: { [key: string]: string } = {
      'Receipt': 'linear-gradient(135deg, #4caf50, #45a049)',
      'Completed': 'linear-gradient(135deg, #4caf50, #45a049)',
      'Cancelled': 'linear-gradient(135deg, #f44336, #da190b)',
      'Refused': 'linear-gradient(135deg, #f44336, #da190b)',
      'Pending': 'linear-gradient(135deg, #ff8c00, #ffcc00)',
      'Planned': 'linear-gradient(135deg, #ff8c00, #ffcc00)',
      'Accepted': 'linear-gradient(135deg, #4caf50, #45a049)',
      'Loading': 'linear-gradient(135deg, #5856d6, #5e5ce0)',
      'LoadingInProgress': 'linear-gradient(135deg, #5856d6, #5e5ce0)',
      'InDelivery': 'linear-gradient(135deg, #ff9500, #ff9f0a)',
      'DeliveryInProgress': 'linear-gradient(135deg, #ff9500, #ff9f0a)'
    };
    return gradientMap[status] || 'linear-gradient(135deg, #94a3b8, #64748b)';
  }

  /**
   * Obtenir la couleur du texte pour le badge
   */
  getStatusTextColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'Receipt': '#ffffff',
      'Completed': '#ffffff',
      'Cancelled': '#ffffff',
      'Refused': '#ffffff',
      'Pending': '#000000',
      'Planned': '#000000',
      'Accepted': '#ffffff',
      'Loading': '#ffffff',
      'LoadingInProgress': '#ffffff',
      'InDelivery': '#ffffff',
      'DeliveryInProgress': '#ffffff'
    };
    return colorMap[status] || '#ffffff';
  }

  /**
   * Appliquer le filtre
   */
  applyFilter() {
    console.log('🔍 Applying filter:', this.filterStatus);
    
    if (this.filterStatus === 'all') {
      // Tous les trajets
      this.filteredHistory = this.history;
    } else if (this.filterStatus === 'Completed') {
      // Trajets avec livraisons terminées (Receipt ou Completed)
      this.filteredHistory = this.history.filter(trip =>
        trip.status === 'Receipt' || trip.status === 'Completed'
      );
    } else if (this.filterStatus === 'Cancelled') {
      // Trajets annulés ou refusés
      this.filteredHistory = this.history.filter(trip =>
        trip.status === 'Cancelled' || trip.status === 'Refused'
      );
    }
    
    console.log('✅ Filtered history:', this.filteredHistory.length, 'trips');
  }

  /**
   * Formater la date
   */
  formatDate(dateString: string): string {
    if (!dateString) return 'Date non disponible';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Voir les détails du trajet
   */
  async viewDetails(trip: TripHistory) {
    // Récupérer le trajet complet
    const offlineTrips = localStorage.getItem('offlineTrips');
    if (offlineTrips) {
      const trips = JSON.parse(offlineTrips);
      const fullTrip = trips.find((t: any) => t.id === trip.id);

      if (fullTrip) {
        const modal = await this.modalController.create({
          component: TripDetailsModalComponent,
          componentProps: { trip: fullTrip },
          cssClass: 'trip-details-modal'
        });
        await modal.present();

        const { data } = await modal.onWillDismiss();
        if (data?.action === 'updateStatus') {
          this.loadHistory(); // Recharger si le statut a changé
        }
      }
    } else {
      await this.showToast('Détails du trajet non disponibles', 'warning');
    }
  }

  /**
   * Naviguer vers la carte GPS
   */
  async viewOnGPS(trip: TripHistory) {
    this.router.navigate(['/gps-tracking'], {
      queryParams: {
        tripId: trip.id,
        tripReference: trip.tripReference
      }
    });
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}