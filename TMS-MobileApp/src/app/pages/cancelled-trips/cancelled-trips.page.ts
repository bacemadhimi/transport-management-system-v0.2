import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TripService } from '../../services/trip.service';
import { ITrip } from '../../types/trip';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-cancelled-trips',
  templateUrl: './cancelled-trips.page.html',
  styleUrls: ['./cancelled-trips.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class CancelledTripsPage implements OnInit {

  tripService = inject(TripService);
  authService = inject(AuthService);

  cancelledTrips$: Observable<ITrip[]> | null = null;

  constructor() {}

  ngOnInit() {
    console.log('CancelledTripsPage ngOnInit called');
    this.loadCancelledTrips();
  }

  loadCancelledTrips() {
    console.log('Loading cancelled trips - method called');
    const userEmail = this.authService.currentUser()?.email;
    console.log('Current user email:', userEmail);
    this.cancelledTrips$ = this.tripService.getAllTrips().pipe(
      map(trips => {
        console.log('All trips received:', trips);
        
        let filteredTrips = trips.filter(trip => trip.tripStatus === 'Cancelled');
        console.log('Filtered cancelled trips:', filteredTrips);

        if (userEmail) {
          filteredTrips = filteredTrips.filter(trip => trip.driver?.email === userEmail);
          console.log('Filtered by user email:', filteredTrips);
        }

        
        return filteredTrips.sort((a, b) => {
          const dateA = new Date(a.updatedAt || a.createdAt || '').getTime();
          const dateB = new Date(b.updatedAt || b.createdAt || '').getTime();
          return dateB - dateA;
        });
      })
    );

    console.log('Cancelled trips observable created');
  }

  trackByTripId(index: number, trip: ITrip): number {
    return trip.id;
  }
}