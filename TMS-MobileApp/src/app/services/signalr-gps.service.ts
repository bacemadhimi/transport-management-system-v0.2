import { Injectable, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr/dist/esm/index';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { IPositionGPS } from '../types/gps';
import { NotificationStorageService } from './notification-storage.service';

@Injectable({
  providedIn: 'root'
})
export class SignalrGpsService implements OnDestroy {
  private hubConnection?: signalR.HubConnection;
  private connectedSubject = new BehaviorSubject<boolean>(false);
  private positionSubject = new BehaviorSubject<IPositionGPS | null>(null);
  private newTripSubject = new BehaviorSubject<any>(null);

  connected$ = this.connectedSubject.asObservable();
  position$ = this.positionSubject.asObservable();
  newTrip$ = this.newTripSubject.asObservable();

  constructor(private notificationStorage: NotificationStorageService) {}

  async connect(driverId?: number): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      // If already connected and driverId provided, join the driver group
      if (driverId) {
        await this.joinDriverGroup(driverId);
      }
      return;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/hubs/gps`)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.hubConnection.on('ReceiveGPSPosition', (payload: IPositionGPS) => {
      this.positionSubject.next(payload);
    });

    this.hubConnection.on('ReceivePosition', (payload: IPositionGPS) => {
      this.positionSubject.next(payload);
    });

    // Listen for new trip assignments
    this.hubConnection.on('NewTripAssigned', (tripData: any) => {
      console.log('🔔 NewTripAssigned received:', tripData);
      this.newTripSubject.next(tripData);

      // Save notification to local storage
      if (tripData) {
        this.notificationStorage.addNotification({
          type: 'NEW_TRIP_ASSIGNMENT',
          title: tripData.title || 'Nouvelle Mission',
          message: tripData.message || `Nouveau voyage: ${tripData.tripReference}`,
          tripId: tripData.tripId,
          tripReference: tripData.tripReference,
          driverId: tripData.driverId,
          timestamp: new Date().toISOString()
        });
      }
    });

    this.hubConnection.onclose(() => this.connectedSubject.next(false));
    this.hubConnection.onreconnecting(() => this.connectedSubject.next(false));
    this.hubConnection.onreconnected(() => this.connectedSubject.next(true));

    await this.hubConnection.start();
    this.connectedSubject.next(true);

    // Join driver group if driverId is provided
    if (driverId) {
      await this.joinDriverGroup(driverId);
    }
  }

  async joinDriverGroup(driverId: number): Promise<void> {
    if (!this.hubConnection) {
      console.error('❌ Cannot join driver group: hub connection not established');
      return;
    }

    try {
      console.log(`🔗 Joining driver group: driver-${driverId}`);
      await this.hubConnection.invoke('JoinDriverGroup', driverId);
      console.log(`✅ Joined driver group: driver-${driverId}`);
    } catch (error) {
      console.error(`❌ Error joining driver group:`, error);
    }
  }

  async disconnect(): Promise<void> {
    if (this.hubConnection) {
      await this.hubConnection.stop();
      this.connectedSubject.next(false);
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
