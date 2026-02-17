import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { TripService } from '../../services/trip.service';
import { ITrip, TripStatus } from '../../types/trip';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule]
})
export class NotificationsPage implements OnInit, OnDestroy {
  tripService = inject(TripService);

  allNotifications: (ITrip & { notificationType?: 'cancelled' | 'new' })[] = [];
  cancelledTrips: (ITrip & { notificationType?: 'cancelled' })[] = [];
  newTrips: (ITrip & { notificationType?: 'new' })[] = [];

  private _sub: Subscription | null = null;

  ngOnInit() {
    this.loadNotifications();
  }

  ngOnDestroy() {
    this._sub?.unsubscribe();
  }

  loadNotifications() {
    this._sub = this.tripService.getAllTrips().subscribe({
      next: (trips) => {
        this.cancelledTrips = trips
          .filter(t => t.tripStatus === TripStatus.Cancelled)
          .map(t => ({ ...t, notificationType: 'cancelled' as const }));

        this.newTrips = trips
          .filter(t => t.tripStatus === TripStatus.Planned)
          .map(t => ({ ...t, notificationType: 'new' as const }));

        this.allNotifications = [
          ...this.cancelledTrips,
          ...this.newTrips
        ];
      },
      error: (err) => {
        console.error('Error loading notifications:', err);
      }
    });
  }

  getReasonOrVehicle(trip: ITrip): string {
    if (trip.tripStatus === 'Cancelled' && trip.message) {
      return trip.message;
    }
    return trip.truck?.immatriculation || 'No vehicle';
  }

  getStatusLabel(status: TripStatus): string {
    const labels: { [key: string]: string } = {
      'Planned': 'Planifié',
      'Cancelled': 'Annulé'
    };
    return labels[status] || status;
  }

  getSectionTitle(type: 'cancelled' | 'new'): string {
    return type === 'cancelled' ? '🚫 CANCELLED TRIPS' : '✨ NEW TRIPS';
  }
}
