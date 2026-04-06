import { Component, OnInit, inject } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  
  history: TripHistory[] = [];
  filteredHistory: TripHistory[] = [];
  filterStatus: string = 'all';

  ngOnInit() {
    this.loadHistory();
  }

  loadHistory() {
    // Charger l'historique depuis le localStorage ou l'API
    try {
      const offlineTrips = localStorage.getItem('offlineTrips');
      if (offlineTrips) {
        const trips = JSON.parse(offlineTrips);
        this.history = trips
          .filter((trip: any) => trip.tripStatus === 'Receipt' || trip.tripStatus === 'Completed' || trip.tripStatus === 'Cancelled')
          .map((trip: any) => ({
            id: trip.id,
            tripReference: trip.tripReference,
            status: trip.tripStatus,
            date: trip.actualEndDate || trip.estimatedEndDate || trip.estimatedStartDate,
            distance: trip.estimatedDistance || 0,
            deliveriesCount: trip.deliveries?.length || 0,
            estimatedStartDate: trip.estimatedStartDate,
            estimatedEndDate: trip.estimatedEndDate,
            driver: trip.driver,
            truck: trip.truck
          }));
        
        this.applyFilter();
      }
    } catch (error) {
      console.error('Error loading history:', error);
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
      'Pending': '⏳ En attente',
      'Planned': '📋 Planifié',
      'Accepted': '✅ Accepté',
      'LoadingInProgress': '📦 Chargement',
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
      'Pending': 'time',
      'Planned': 'calendar',
      'Accepted': 'checkmark-circle',
      'LoadingInProgress': 'cube',
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
      'Pending': 'linear-gradient(135deg, #ff8c00, #ffcc00)',
      'Planned': 'linear-gradient(135deg, #ff8c00, #ffcc00)',
      'Accepted': 'linear-gradient(135deg, #4caf50, #45a049)',
      'LoadingInProgress': 'linear-gradient(135deg, #5856d6, #5e5ce0)',
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
      'Pending': '#000000',
      'Planned': '#000000',
      'Accepted': '#ffffff',
      'LoadingInProgress': '#ffffff',
      'DeliveryInProgress': '#ffffff'
    };
    return colorMap[status] || '#ffffff';
  }

  /**
   * Appliquer le filtre
   */
  applyFilter() {
    if (this.filterStatus === 'all') {
      this.filteredHistory = this.history;
    } else {
      this.filteredHistory = this.history.filter(trip => 
        trip.status === this.filterStatus || 
        (this.filterStatus === 'Completed' && (trip.status === 'Receipt' || trip.status === 'Completed'))
      );
    }
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
    }
  }
}