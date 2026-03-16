import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpService } from '../../services/http.service';
import { IDriver } from '../../types/driver';
import { ITruck } from '../../types/truck';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonBackButton,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonRefresher,
  IonRefresherContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonText
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-gps',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    IonContent, 
    IonHeader, 
    IonTitle, 
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonBackButton,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonRefresher,
    IonRefresherContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonText
  ],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/home"></ion-back-button>
        </ion-buttons>
        <ion-title>🛰️ GPS Tracking</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <!-- Test Position Form -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>📍 Send GPS Position</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list>
            <ion-item>
              <ion-label position="stacked">Latitude</ion-label>
              <ion-input type="number" [(ngModel)]="testLat" placeholder="36.8065" step="0.000001"></ion-input>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Longitude</ion-label>
              <ion-input type="number" [(ngModel)]="testLng" placeholder="10.1815" step="0.000001"></ion-input>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Driver</ion-label>
              <ion-select [(ngModel)]="testDriverId" interface="popover">
                <ion-select-option [value]="null">None</ion-select-option>
                <ion-select-option *ngFor="let driver of drivers" [value]="driver.id">
                  {{ driver.name }}
                </ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Truck</ion-label>
              <ion-select [(ngModel)]="testTruckId" interface="popover">
                <ion-select-option [value]="null">None</ion-select-option>
                <ion-select-option *ngFor="let truck of trucks" [value]="truck.id">
                  {{ truck.immatriculation }}
                </ion-select-option>
              </ion-select>
            </ion-item>
          </ion-list>
          <ion-button expand="block" (click)="sendTestPosition()" [disabled]="sendingPosition">
            {{ sendingPosition ? 'Sending...' : '📤 Send Position' }}
          </ion-button>
        </ion-card-content>
      </ion-card>

      <!-- Latest Positions -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>📊 Latest Positions ({{ positions.length }})</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list *ngIf="positions.length > 0">
            <ion-item *ngFor="let pos of positions">
              <ion-label>
                <h2>Driver: {{ getDriverName(pos.driverId) }}</h2>
                <p>Truck: {{ getTruckName(pos.truckId) }}</p>
                <p>📍 {{ pos.latitude | number:'1.6-6' }}, {{ pos.longitude | number:'1.6-6' }}</p>
                <p>🕐 {{ formatDate(pos.timestamp) }}</p>
                <p *ngIf="pos.source">Source: {{ pos.source }}</p>
              </ion-label>
            </ion-item>
          </ion-list>
          <ion-text *ngIf="positions.length === 0" class="ion-text-center">
            <p>No GPS positions found</p>
          </ion-text>
        </ion-card-content>
      </ion-card>
    </ion-content>
  `
})
export class GpsPage implements OnInit {
  positions: any[] = [];
  drivers: IDriver[] = [];
  trucks: ITruck[] = [];
  
  // Test GPS position
  testLat = 36.8065;
  testLng = 10.1815;
  testDriverId: number | null = null;
  testTruckId: number | null = null;
  sendingPosition = false;

  constructor(private httpService: HttpService) {}

  ngOnInit() {
    this.loadDrivers();
    this.loadTrucks();
    this.loadLatestPositions();
  }

  loadDrivers() {
    this.httpService.getDrivers().subscribe({
      next: (data) => this.drivers = data || [],
      error: (err) => console.error('Error loading drivers:', err)
    });
  }

  loadTrucks() {
    this.httpService.getTrucks().subscribe({
      next: (data) => this.trucks = data || [],
      error: (err) => console.error('Error loading trucks:', err)
    });
  }

  loadLatestPositions() {
    this.httpService.getLatestPositions(50).subscribe({
      next: (data) => this.positions = data || [],
      error: (err) => console.error('Error loading positions:', err)
    });
  }

  handleRefresh(event: any) {
    this.loadLatestPositions();
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  sendTestPosition() {
    if (!this.testLat || !this.testLng) {
      alert('Please enter valid coordinates');
      return;
    }

    this.sendingPosition = true;
    this.httpService.sendGPSPosition({
      driverId: this.testDriverId,
      truckId: this.testTruckId,
      latitude: this.testLat,
      longitude: this.testLng,
      source: 'Mobile App'
    }).subscribe({
      next: () => {
        alert('GPS Position sent successfully!');
        this.sendingPosition = false;
        this.loadLatestPositions();
      },
      error: (err) => {
        alert('Error sending position');
        this.sendingPosition = false;
      }
    });
  }

  formatDate(timestamp: string): string {
    return new Date(timestamp).toLocaleString('fr-FR');
  }

  getDriverName(driverId: number | null | undefined): string {
    if (!driverId) return '-';
    const driver = this.drivers.find(d => d.id === driverId);
    return driver ? driver.name : `ID: ${driverId}`;
  }

  getTruckName(truckId: number | null | undefined): string {
    if (!truckId) return '-';
    const truck = this.trucks.find(t => t.id === truckId);
    return truck ? truck.immatriculation : `ID: ${truckId}`;
  }
}
