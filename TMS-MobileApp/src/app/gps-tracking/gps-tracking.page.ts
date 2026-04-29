import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SignalRService } from '../services/signal-r.service';
import { TripService } from '../services/trip.service';
import { Geolocation } from '@capacitor/geolocation';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-gps-tracking',
  templateUrl: './gps-tracking.page.html',
  styleUrls: ['./gps-tracking.page.scss'],
})
export class GpsTrackingPage implements OnInit {
  trips: any[] = [];
  currentTrip: any = null;
  driverId: string | null = null;

  constructor(
    private signalRService: SignalRService,
    private tripService: TripService,
    private router: Router,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.driverId = localStorage.getItem('driverId');
    this.loadCurrentTrips();
    
    // Subscribe to SignalR updates
    this.signalRService.tripStatusUpdated.subscribe((data) => {
      this.updateTripStatus(data);
    });
  }

  ionViewDidEnter() {
    this.loadCurrentTrips();
  }

  loadCurrentTrips() {
    if (this.driverId) {
      this.tripService.getDriverCurrentTrips(this.driverId).subscribe(
        (trips) => {
          this.trips = trips;
          if (this.trips.length > 0) {
            this.currentTrip = this.trips[0];
            // Update local storage to keep state consistent across pages
            localStorage.setItem('currentTrip', JSON.stringify(this.currentTrip));
          }
        },
        (error) => {
          console.error('Error loading trips:', error);
        }
      );
    }
  }

  updateTripStatus(data: any) {
    // Update trip status based on SignalR notification
    if (this.currentTrip && this.currentTrip.id === data.tripId) {
      this.currentTrip.status = data.status;
      this.currentTrip.updatedAt = data.timestamp;
      
      // Update localStorage to maintain consistency
      localStorage.setItem('currentTrip', JSON.stringify(this.currentTrip));
    }
    
    // Update in the list as well
    const index = this.trips.findIndex(t => t.id === data.tripId);
    if (index !== -1) {
      this.trips[index] = { ...this.trips[index], status: data.status, updatedAt: data.timestamp };
      localStorage.setItem('currentTrip', JSON.stringify(this.currentTrip));
    }
  }

  async startTrip() {
    if (this.currentTrip) {
      try {
        await this.tripService.updateTripStatus(this.currentTrip.id, 'In Progress').toPromise();
        
        // Update local state
        this.currentTrip.status = 'In Progress';
        this.currentTrip.updatedAt = new Date().toISOString();
        localStorage.setItem('currentTrip', JSON.stringify(this.currentTrip));
        
        // Notify admin via SignalR
        this.signalRService.broadcastTripStatusChange({
          tripId: this.currentTrip.id,
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
  }

  async acceptTrip() {
    if (this.currentTrip) {
      try {
        await this.tripService.updateTripStatus(this.currentTrip.id, 'Accepted').toPromise();
        
        // Update local state
        this.currentTrip.status = 'Accepted';
        this.currentTrip.updatedAt = new Date().toISOString();
        localStorage.setItem('currentTrip', JSON.stringify(this.currentTrip));
        
        // Notify admin via SignalR
        this.signalRService.broadcastTripStatusChange({
          tripId: this.currentTrip.id,
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
  }

  async refuseTrip() {
    if (this.currentTrip) {
      try {
        await this.tripService.updateTripStatus(this.currentTrip.id, 'Rejected').toPromise();
        
        // Update local state
        this.currentTrip.status = 'Rejected';
        this.currentTrip.updatedAt = new Date().toISOString();
        localStorage.setItem('currentTrip', JSON.stringify(this.currentTrip));
        
        // Notify admin via SignalR
        this.signalRService.broadcastTripStatusChange({
          tripId: this.currentTrip.id,
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
  }

  async startLoading() {
    if (this.currentTrip) {
      try {
        await this.tripService.updateTripStatus(this.currentTrip.id, 'Loading').toPromise();
        
        // Update local state
        this.currentTrip.status = 'Loading';
        this.currentTrip.updatedAt = new Date().toISOString();
        localStorage.setItem('currentTrip', JSON.stringify(this.currentTrip));
        
        // Notify admin via SignalR
        this.signalRService.broadcastTripStatusChange({
          tripId: this.currentTrip.id,
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
  }

  async startDelivery() {
    if (this.currentTrip) {
      try {
        await this.tripService.updateTripStatus(this.currentTrip.id, 'Delivering').toPromise();
        
        // Update local state
        this.currentTrip.status = 'Delivering';
        this.currentTrip.updatedAt = new Date().toISOString();
        localStorage.setItem('currentTrip', JSON.stringify(this.currentTrip));
        
        // Notify admin via SignalR
        this.signalRService.broadcastTripStatusChange({
          tripId: this.currentTrip.id,
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
  }

  async completeTrip() {
    if (this.currentTrip) {
      try {
        await this.tripService.updateTripStatus(this.currentTrip.id, 'Completed').toPromise();
        
        // Update local state
        this.currentTrip.status = 'Completed';
        this.currentTrip.updatedAt = new Date().toISOString();
        localStorage.setItem('currentTrip', JSON.stringify(this.currentTrip));
        
        // Notify admin via SignalR
        this.signalRService.broadcastTripStatusChange({
          tripId: this.currentTrip.id,
          status: 'Completed',
          driverId: this.driverId,
          timestamp: new Date().toISOString()
        });
        
        const toast = await this.toastController.create({
          message: 'Trip completed successfully!',
          duration: 2000
        });
        await toast.present();
      } catch (error) {
        console.error('Error completing trip:', error);
      }
    }
  }

  async scanQRCode() {
    // Request camera permission
    await BarcodeScanner.requestPermissions();

    // Start scanning
    const result = await BarcodeScanner.scan();
    
    if (result.barcode) {
      // Process the QR code content
      const qrContent = result.barcode.value;
      
      // Verify this QR code corresponds to the current trip
      if (qrContent === `TRIP_${this.currentTrip?.id}`) {
        // Complete the trip
        if (this.currentTrip) {
          try {
            await this.tripService.updateTripStatus(this.currentTrip.id, 'Completed').toPromise();
            
            // Update local state
            this.currentTrip.status = 'Completed';
            this.currentTrip.updatedAt = new Date().toISOString();
            localStorage.setItem('currentTrip', JSON.stringify(this.currentTrip));
            
            // Notify admin via SignalR
            this.signalRService.broadcastTripStatusChange({
              tripId: this.currentTrip.id,
              status: 'Completed',
              driverId: this.driverId,
              timestamp: new Date().toISOString()
            });
            
            const toast = await this.toastController.create({
              message: 'Trip completed via QR scan!',
              duration: 2000
            });
            await toast.present();
          } catch (error) {
            console.error('Error completing trip via QR:', error);
          }
        }
      } else {
        const toast = await this.toastController.create({
          message: 'Invalid QR code for this trip!',
          duration: 2000
        });
        await toast.present();
      }
    }
  }

  // Get next possible action based on current status
  getNextAction() {
    if (!this.currentTrip) return '';
    
    switch (this.currentTrip.status) {
      case 'Pending':
        return 'accept';
      case 'Accepted':
        return 'start';
      case 'In Progress':
        return 'loading';
      case 'Loading':
        return 'delivery';
      case 'Delivering':
        return 'complete';
      default:
        return '';
    }
  }
}