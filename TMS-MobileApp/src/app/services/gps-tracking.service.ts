import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { NotificationStorageService, TripNotification } from './notification-storage.service';

const API_URL = 'http://localhost:5191';

export interface GPSPosition {
  driverId?: number;
  truckId?: number;
  tripId?: number;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
}

export interface TripStatusUpdate {
  tripId: number;
  status: string;
  timestamp: Date;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GPSTrackingService {
  private hubConnection?: HubConnection;
  private notificationHubConnection?: HubConnection;
  private connectionStatus = new BehaviorSubject<boolean>(false);
  private positionSubject = new Subject<GPSPosition>();
  private statusUpdateSubject = new Subject<TripStatusUpdate>();
  private notificationSubject = new Subject<any>();

  private readonly gpsUpdateInterval = 5000;
  private gpsTrackingInterval?: any;
  private isTracking = false;
  private processedTripIds = new Set<number>(); // Track processed trip IDs to avoid duplicates

  constructor(private notificationStorage: NotificationStorageService) {}

  /**
   * Connecter au GPS Hub et écouter les notifications
   */
  public async connect(driverId?: number, truckId?: number): Promise<void> {
    if (this.hubConnection?.state === HubConnectionState.Connected) {
      console.log('✅ GPS Hub already connected');
      return;
    }

    try {
      console.log('🔌 Connecting to GPS Hub...', `${API_URL}/gpshub`);
      
      // Get token from localStorage
      const token = localStorage.getItem('token') || '';
      console.log('📋 Token for GPS Hub:', token ? 'PRESENT (length: ' + token.length + ')' : 'MISSING');

      this.hubConnection = new HubConnectionBuilder()
        .withUrl(`${API_URL}/gpshub`, {
          accessTokenFactory: () => token
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .build();

      // Also connect to NotificationHub for better notification handling
      await this.connectToNotificationHub(driverId);

      // Écouter les notifications de nouveau trip - GPSHub (PRIMARY - only show native alert from here)
      this.hubConnection.on('NewTripAssigned', (data: any) => {
        console.log('🔔🔔🔔=================================');
        console.log('🔔 NEW TRIP ASSIGNED via GPSHub!');
        console.log('🔔 Data:', JSON.stringify(data, null, 2));
        console.log('🔔🔔🔔=================================');
        
        // Avoid processing same trip twice
        if (this.processedTripIds.has(data.tripId)) {
          console.log('⚠️ Trip already processed:', data.tripId);
          return;
        }
        this.processedTripIds.add(data.tripId);
        
        // Store notification
        const stored = this.notificationStorage.addNotification({
          type: 'NEW_TRIP_ASSIGNMENT',
          title: data.title || 'Nouvelle Mission',
          message: data.message || `Trip ${data.tripReference} assigné`,
          tripId: data.tripId,
          tripReference: data.tripReference,
          driverName: data.driverName,
          truckImmatriculation: data.truckImmatriculation,
          destination: data.destination,
          customerName: data.customerName,
          deliveriesCount: data.deliveriesCount,
          estimatedDistance: data.estimatedDistance,
          estimatedDuration: data.estimatedDuration,
          estimatedStartDate: data.estimatedStartDate,
          estimatedEndDate: data.estimatedEndDate,
          timestamp: data.timestamp || new Date().toISOString()
        });
        
        // Only show native notification if successfully stored (not duplicate)
        if (stored) {
          this.showNativeNotification(
            '🚛 Nouvelle Mission!',
            `Trip ${data.tripReference} assigné!\nDestination: ${data.destination || 'Non définie'}`
          );
        }
        
        this.notificationSubject.next(data);
      });

      // Écouter les notifications générales
      this.hubConnection.on('ReceiveNotification', (notification: any) => {
        console.log('🔔 Notification via GPSHub:', notification);
        this.showNativeNotification(notification.title, notification.message);
        this.notificationSubject.next(notification);
      });

      // Écouter les mises à jour de statut
      this.hubConnection.on('StatusUpdated', (update: any) => {
        console.log('📊 Status Updated:', update);
        this.statusUpdateSubject.next(update);
      });

      // Écouter les positions GPS
      this.hubConnection.on('ReceivePosition', (position: any) => {
        console.log('📍 Position received:', position);
        this.positionSubject.next(position);
      });

      this.hubConnection.onreconnecting(() => {
        console.log('🔄 Reconnecting...');
        this.connectionStatus.next(false);
      });

      this.hubConnection.onreconnected(() => {
        console.log('✅ Reconnected');
        this.connectionStatus.next(true);
      });

      this.hubConnection.onclose((error: any) => {
        console.error('❌ Closed:', error);
        this.connectionStatus.next(false);
      });

      await this.hubConnection.start();
      this.connectionStatus.next(true);
      console.log('✅ GPS Hub connected successfully');

      // Join driver group si driverId fourni
      if (driverId) {
        await this.hubConnection.invoke('JoinDriverGroup', driverId);
        console.log(`✅ Joined driver-${driverId} group`);
      }

      // Join admin group
      await this.hubConnection.invoke('JoinAdminGroup');
      console.log('✅ Joined Admins group');

      // Demander la permission pour les notifications
      this.requestNotificationPermission();

    } catch (error) {
      console.error('❌ Connection failed:', error);
      this.connectionStatus.next(false);
    }
  }

  /**
   * Connect to NotificationHub for dedicated notification handling
   */
  private async connectToNotificationHub(driverId?: number): Promise<void> {
    try {
      console.log('🔌 Connecting to NotificationHub...', `${API_URL}/notificationhub`);
      
      // Get token from localStorage
      const token = localStorage.getItem('token') || '';
      console.log('📋 Token for NotificationHub:', token ? 'PRESENT (length: ' + token.length + ')' : 'MISSING');

      this.notificationHubConnection = new HubConnectionBuilder()
        .withUrl(`${API_URL}/notificationhub`, {
          accessTokenFactory: () => token
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .build();

      // Listen for trip assignment notifications - NotificationHub (SECONDARY - no native alert, just storage)
      this.notificationHubConnection.on('NewTripAssigned', (data: any) => {
        console.log('🔔🔔🔔=================================');
        console.log('🔔 NEW TRIP ASSIGNED via NotificationHub!');
        console.log('🔔 Data:', JSON.stringify(data, null, 2));
        console.log('🔔🔔🔔=================================');
        
        // Avoid processing same trip twice
        if (this.processedTripIds.has(data.tripId)) {
          console.log('⚠️ Trip already processed via NotificationHub:', data.tripId);
          return;
        }
        this.processedTripIds.add(data.tripId);
        
        // Store notification (no native alert from NotificationHub)
        const notification: Omit<TripNotification, 'id' | 'isRead'> = {
          type: 'NEW_TRIP_ASSIGNMENT',
          title: data.title || 'Nouvelle Mission',
          message: data.message || `Trip ${data.tripReference} assigné`,
          tripId: data.tripId,
          tripReference: data.tripReference,
          driverName: data.driverName,
          truckImmatriculation: data.truckImmatriculation,
          destination: data.destination,
          customerName: data.customerName,
          deliveriesCount: data.deliveriesCount,
          estimatedDistance: data.estimatedDistance,
          estimatedDuration: data.estimatedDuration,
          estimatedStartDate: data.estimatedStartDate,
          estimatedEndDate: data.estimatedEndDate,
          timestamp: data.timestamp || new Date().toISOString()
        };
        
        this.notificationStorage.addNotification(notification);
        // No native notification from NotificationHub - only from GPSHub
      });

      this.notificationHubConnection.on('ReceiveNotification', (notification: any) => {
        console.log('🔔 Notification via NotificationHub:', notification);
        this.notificationSubject.next(notification);
      });

      this.notificationHubConnection.onreconnecting(() => {
        console.log('🔄 NotificationHub reconnecting...');
      });

      this.notificationHubConnection.onreconnected(() => {
        console.log('✅ NotificationHub reconnected');
      });

      this.notificationHubConnection.onclose((error: any) => {
        console.error('❌ NotificationHub closed:', error);
      });

      await this.notificationHubConnection.start();
      console.log('✅ NotificationHub connected successfully');

      // Join driver group in NotificationHub
      if (driverId) {
        await this.notificationHubConnection.invoke('JoinDriverGroup', driverId);
        console.log(`✅ Joined driver_${driverId} group in NotificationHub`);
      }

    } catch (error) {
      console.error('❌ NotificationHub connection failed:', error);
      // Continue anyway - GPSHub will handle notifications as fallback
    }
  }

  public getNotifications(): Observable<any> {
    return this.notificationSubject.asObservable();
  }

  private requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
        if (permission === 'granted') {
          new Notification('TMS Mobile', {
            body: 'Notifications activées!',
            icon: '/assets/icon.png'
          });
        }
      });
    }
  }

  private showNativeNotification(title: string, body: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/assets/icon.png',
        badge: '/assets/icon.png',
        requireInteraction: true,
        tag: 'tms-notification'
      });
    }
    console.log(`🔔 ${title}: ${body}`);
  }

  /**
   * Rejoindre le suivi d'un trip
   */
  public async joinTripTracking(tripId: number): Promise<void> {
    if (!this.hubConnection) return;
    
    try {
      await this.hubConnection.invoke('JoinTripTracking', tripId);
      console.log(`✅ Joined trip ${tripId} tracking`);
    } catch (error) {
      console.error('Error joining trip tracking:', error);
    }
  }

  /**
   * Envoyer une position GPS
   */
  public async sendPosition(position: GPSPosition): Promise<void> {
    if (!this.hubConnection || this.hubConnection.state !== HubConnectionState.Connected) {
      console.warn('⚠️ Not connected, cannot send position');
      return;
    }

    try {
      await this.hubConnection.invoke('SendPosition', {
        driverId: position.driverId,
        truckId: position.truckId,
        tripId: position.tripId,
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
        source: 'Mobile'
      });
    } catch (error) {
      console.error('Error sending position:', error);
    }
  }

  /**
   * Démarrer le tracking GPS
   */
  public startTracking(driverId: number, truckId?: number, tripId?: number): void {
    if (this.isTracking) {
      console.log('⚠️ GPS tracking already started');
      return;
    }

    this.isTracking = true;
    console.log('🚀 Starting GPS tracking...');

    this.gpsTrackingInterval = setInterval(async () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const gpsPosition: GPSPosition = {
              driverId,
              truckId,
              tripId,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: new Date()
            };

            await this.sendPosition(gpsPosition);
            this.positionSubject.next(gpsPosition);
          },
          (error) => {
            console.error('❌ Geolocation error:', error);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 3000
          }
        );
      }
    }, this.gpsUpdateInterval);
  }

  /**
   * Arrêter le tracking
   */
  public stopTracking(): void {
    if (this.gpsTrackingInterval) {
      clearInterval(this.gpsTrackingInterval);
      this.gpsTrackingInterval = undefined;
    }
    this.isTracking = false;
    console.log('⏹️ GPS tracking stopped');
  }

  /**
   * Accepter un trip
   */
  public async acceptTrip(tripId: number): Promise<void> {
    console.log('📢📢📢 acceptTrip called with tripId:', tripId);
    console.log('📢 HubConnection state:', this.hubConnection?.state);
    
    if (!this.hubConnection) {
      console.error('❌❌❌ hubConnection is NULL!');
      return;
    }
    
    if (this.hubConnection.state !== HubConnectionState.Connected) {
      console.error('❌❌❌ hubConnection is NOT connected! State:', this.hubConnection.state);
      return;
    }

    try {
      console.log('✅ Invoking AcceptTrip on server via SignalR...');
      await this.hubConnection.invoke('AcceptTrip', tripId);
      console.log(`✅✅✅ Trip ${tripId} accepted - SignalR call completed!`);
      
      // FALLBACK: Also save directly to database via HTTP to guarantee admin receives notification
      console.log('🔄 Saving notification to database via HTTP fallback...');
      await this.saveAcceptanceToDatabase(tripId);
      
    } catch (error) {
      console.error('❌❌❌ Error accepting trip:', error);
      throw error;
    }
  }

  /**
   * Fallback: Save acceptance directly to database
   */
  private async saveAcceptanceToDatabase(tripId: number): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      console.log('🔄 HTTP Fallback - Calling POST /api/Trips/' + tripId + '/accept');
      console.log('🔄 Token length:', token ? token.length : 0);
      
      const response = await fetch(`http://localhost:5191/api/Trips/${tripId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('🔄 HTTP Fallback - Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅✅✅ Fallback: Acceptance saved to database for trip ${tripId}`, result);
      } else {
        const errorText = await response.text();
        console.warn('⚠️ Fallback: Failed to save acceptance to database - Status:', response.status, 'Body:', errorText);
      }
    } catch (error) {
      console.error('❌ Fallback: Error saving acceptance:', error);
    }
  }

  /**
   * Refuser un trip
   */
  public async rejectTrip(tripId: number, reason: string, reasonCode: string): Promise<void> {
    console.log('📢📢📢 rejectTrip called with tripId:', tripId, 'reason:', reason, 'reasonCode:', reasonCode);
    console.log('📢 HubConnection state:', this.hubConnection?.state);
    
    if (!this.hubConnection) {
      console.error('❌❌❌ hubConnection is NULL!');
      return;
    }
    
    if (this.hubConnection.state !== HubConnectionState.Connected) {
      console.error('❌❌❌ hubConnection is NOT connected! State:', this.hubConnection.state);
      return;
    }

    try {
      console.log('✅ Invoking RejectTrip on server via SignalR...');
      await this.hubConnection.invoke('RejectTrip', tripId, reason, reasonCode);
      console.log(`✅✅✅ Trip ${tripId} rejected - SignalR call completed!`);
      
      // FALLBACK: Also save directly to database via HTTP to guarantee admin receives notification
      console.log('🔄 Saving rejection to database via HTTP fallback...');
      await this.saveRejectionToDatabase(tripId, reason, reasonCode);
      
    } catch (error) {
      console.error('❌❌❌ Error rejecting trip:', error);
      throw error;
    }
  }

  /**
   * Fallback: Save rejection directly to database
   */
  private async saveRejectionToDatabase(tripId: number, reason: string, reasonCode: string): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5191/api/Trips/${tripId}/reject?reason=${encodeURIComponent(reason)}&reasonCode=${encodeURIComponent(reasonCode)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        console.log(`✅✅✅ Fallback: Rejection saved to database for trip ${tripId}`);
      } else {
        console.warn('⚠️ Fallback: Failed to save rejection to database');
      }
    } catch (error) {
      console.error('❌ Fallback: Error saving rejection:', error);
    }
  }

  /**
   * Démarrer le chargement
   */
  public async startLoading(tripId: number): Promise<void> {
    await this.updateTripStatus(tripId, 'Loading', 'Chargement démarré');
  }

  /**
   * Démarrer la livraison
   */
  public async startDelivery(tripId: number): Promise<void> {
    await this.updateTripStatus(tripId, 'InDelivery', 'Livraison démarrée');
  }

  /**
   * Arrivé à destination
   */
  public async arrivedAtDestination(tripId: number): Promise<void> {
    await this.updateTripStatus(tripId, 'Arrived', 'Arrivé à destination');
  }

  /**
   * Compléter le trip
   */
  public async completeTrip(tripId: number): Promise<void> {
    await this.updateTripStatus(tripId, 'Completed', 'Livraison terminée');
  }

  /**
   * Mettre à jour le statut
   */
  private async updateTripStatus(tripId: number, status: string, notes?: string): Promise<void> {
    if (!this.hubConnection) return;

    try {
      await this.hubConnection.invoke('UpdateTripStatus', tripId, status, notes);
      console.log(`📊 Trip ${tripId} status: ${status}`);
    } catch (error) {
      console.error('Error updating status:', error);
      throw error;
    }
  }

  /**
   * Observer les positions
   */
  public getPositionUpdates(): Observable<GPSPosition> {
    return this.positionSubject.asObservable();
  }

  /**
   * Observer les statuts
   */
  public getStatusUpdates(): Observable<TripStatusUpdate> {
    return this.statusUpdateSubject.asObservable();
  }

  /**
   * Observer la connexion
   */
  public getConnectionStatus(): Observable<boolean> {
    return this.connectionStatus.asObservable();
  }

  /**
   * Déconnecter
   */
  public async disconnect(): Promise<void> {
    this.stopTracking();

    if (this.hubConnection) {
      await this.hubConnection.stop();
      this.hubConnection = undefined;
      this.connectionStatus.next(false);
      console.log('🔌 GPS Hub disconnected');
    }

    if (this.notificationHubConnection) {
      await this.notificationHubConnection.stop();
      this.notificationHubConnection = undefined;
      console.log('🔌 NotificationHub disconnected');
    }
  }
}
