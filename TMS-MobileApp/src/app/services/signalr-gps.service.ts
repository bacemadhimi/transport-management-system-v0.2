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

  /**
   * Get current driver ID from localStorage
   */
  private getCurrentDriverId(): number | null {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.driverId || user.id || null;
      }
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.driverId || payload.sub || null;
      }
    } catch (e) {
      console.warn('⚠️ Could not get current driverId:', e);
    }
    return null;
  }

  async connect(driverId?: number): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      // If already connected and driverId provided, join the driver group
      if (driverId) {
        await this.joinDriverGroup(driverId);
      }
      return;
    }

    // Remove '/api' suffix for SignalR hub URLs
    const baseUrl = environment.apiUrl.replace('/api', '');

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${baseUrl}/hubs/gps`)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.hubConnection.on('ReceiveGPSPosition', (payload: IPositionGPS) => {
      this.positionSubject.next(payload);
    });

    this.hubConnection.on('ReceivePosition', (payload: IPositionGPS) => {
      this.positionSubject.next(payload);
    });

    // Listen for new trip assignments - FILTER by driverId
    this.hubConnection.on('NewTripAssigned', (tripData: any) => {
      console.log('🔔 NewTripAssigned received:', tripData);

      // ✅ FILTER: Only process if notification is for THIS driver
      const currentDriverId = this.getCurrentDriverId();
      if (tripData.driverId && currentDriverId && tripData.driverId !== currentDriverId) {
        console.log(`🚫 Ignoring NewTripAssigned for driver ${tripData.driverId} (current: ${currentDriverId})`);
        return;
      }

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
