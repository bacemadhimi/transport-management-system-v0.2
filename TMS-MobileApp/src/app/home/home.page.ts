import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SignalRService } from '../services/signal-r.service';
import { TripService } from '../services/trip.service';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  recentTrips: any[] = [];
  driverId: string | null = null;

  constructor(
    private tripService: TripService,
    private signalRService: SignalRService,
    private router: Router,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.driverId = localStorage.getItem('driverId');
    
    // Load initial trips
    this.loadRecentTrips();
    
    // Subscribe to SignalR updates to keep state synchronized
    this.signalRService.tripStatusUpdated.subscribe((data) => {
      this.updateTripStatus(data);
    });
    
    // Listen for changes in localStorage to stay in sync with GPS page
    window.addEventListener('storage', (event) => {
      if (event.key === 'currentTrip' && event.newValue) {
        const updatedTrip = JSON.parse(event.newValue);
        this.updateLocalTrip(updatedTrip);
      }
    });
  }

  ionViewDidEnter() {
    this.loadRecentTrips();
    
    // Check if current trip was updated from another page
    const currentTripStr = localStorage.getItem('currentTrip');
    if (currentTripStr) {
      const currentTrip = JSON.parse(currentTripStr);
      this.updateLocalTrip(currentTrip);
    }
  }

  loadRecentTrips() {
    if (this.driverId) {
      this.tripService.getDriverCurrentTrips(this.driverId).subscribe(
        (trips) => {
          this.recentTrips = trips;
          
          // Update localStorage to keep state consistent
          if (trips.length > 0) {
            localStorage.setItem('currentTrip', JSON.stringify(trips[0]));
          }
        },
        (error) => {
          console.error('Error loading recent trips:', error);
        }
      );
    }
  }

  updateTripStatus(data: any) {
    // Update trip status based on SignalR notification
    const index = this.recentTrips.findIndex(t => t.id === data.tripId);
    if (index !== -1) {
      this.recentTrips[index] = { ...this.recentTrips[index], status: data.status, updatedAt: data.timestamp };
      
      // Update localStorage to maintain consistency
      if (this.recentTrips.length > 0) {
        localStorage.setItem('currentTrip', JSON.stringify(this.recentTrips[0]));
      }
    }
  }

  updateLocalTrip(updatedTrip: any) {
    // Find and update the trip in our local array
    const index = this.recentTrips.findIndex(t => t.id === updatedTrip.id);
    if (index !== -1) {
      this.recentTrips[index] = updatedTrip;
    } else {
      // If not found, add it to the beginning of the list
      this.recentTrips.unshift(updatedTrip);
    }
  }

  async acceptTrip(trip: any) {
    try {
      await this.tripService.updateTripStatus(trip.id, 'Accepted').toPromise();
      
      // Update local state
      trip.status = 'Accepted';
      trip.updatedAt = new Date().toISOString();
      localStorage.setItem('currentTrip', JSON.stringify(trip));
      
      // Notify admin via SignalR
      this.signalRService.broadcastTripStatusChange({
        tripId: trip.id,
        status: 'Accepted',
        driverId: this.driverId,
        timestamp: new Date().toISOString()
      });
      
      const toast = await this.toastController.create({
        message: 'Trip accepted successfully!',
        duration: 2000
      });
      await toast.present();
    } catch (error) {
      console.error('Error accepting trip:', error);
    }
  }

  async refuseTrip(trip: any) {
    try {
      await this.tripService.updateTripStatus(trip.id, 'Rejected').toPromise();
      
      // Update local state
      trip.status = 'Rejected';
      trip.updatedAt = new Date().toISOString();
      localStorage.setItem('currentTrip', JSON.stringify(trip));
      
      // Notify admin via SignalR
      this.signalRService.broadcastTripStatusChange({
        tripId: trip.id,
        status: 'Rejected',
        driverId: this.driverId,
        timestamp: new Date().toISOString()
      });
      
      const toast = await this.toastController.create({
        message: 'Trip refused successfully!',
        duration: 2000
      });
      await toast.present();
    } catch (error) {
      console.error('Error refusing trip:', error);
    }
  }

  async startTrip(trip: any) {
    try {
      await this.tripService.updateTripStatus(trip.id, 'In Progress').toPromise();
      
      // Update local state
      trip.status = 'In Progress';
      trip.updatedAt = new Date().toISOString();
      localStorage.setItem('currentTrip', JSON.stringify(trip));
      
      // Notify admin via SignalR
      this.signalRService.broadcastTripStatusChange({
        tripId: trip.id,
        status: 'In Progress',
        driverId: this.driverId,
        timestamp: new Date().toISOString()
      });
      
      const toast = await this.toastController.create({
        message: 'Trip started successfully!',
        duration: 2000
      });
      await toast.present();
    } catch (error) {
      console.error('Error starting trip:', error);
    }
  }

  async startLoading(trip: any) {
    try {
      await this.tripService.updateTripStatus(trip.id, 'Loading').toPromise();
      
      // Update local state
      trip.status = 'Loading';
      trip.updatedAt = new Date().toISOString();
      localStorage.setItem('currentTrip', JSON.stringify(trip));
      
      // Notify admin via SignalR
      this.signalRService.broadcastTripStatusChange({
        tripId: trip.id,
        status: 'Loading',
        driverId: this.driverId,
        timestamp: new Date().toISOString()
      });
      
      const toast = await this.toastController.create({
        message: 'Loading started successfully!',
        duration: 2000
      });
      await toast.present();
    } catch (error) {
      console.error('Error starting loading:', error);
    }
  }

  async startDelivery(trip: any) {
    try {
      await this.tripService.updateTripStatus(trip.id, 'Delivering').toPromise();
      
      // Update local state
      trip.status = 'Delivering';
      trip.updatedAt = new Date().toISOString();
      localStorage.setItem('currentTrip', JSON.stringify(trip));
      
      // Notify admin via SignalR
      this.signalRService.broadcastTripStatusChange({
        tripId: trip.id,
        status: 'Delivering',
        driverId: this.driverId,
        timestamp: new Date().toISOString()
      });
      
      const toast = await this.toastController.create({
        message: 'Delivery started successfully!',
        duration: 2000
      });
      await toast.present();
    } catch (error) {
      console.error('Error starting delivery:', error);
    }
  }

  navigateToGpsTracking() {
    this.router.navigate(['/gps-tracking']);
  }

  getStatusClass(status: string): string {
    return `status-${status.toLowerCase().replace(' ', '-')}`;
  }
}