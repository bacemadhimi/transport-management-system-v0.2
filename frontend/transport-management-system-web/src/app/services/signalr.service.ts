import { Injectable, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environment';
import { Auth } from './auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { NotificationService } from './notification.service';
import { filter } from 'rxjs/operators';

export interface TripNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  timestamp: Date;
  tripId?: number;
  tripReference?: string;
  oldStatus?: string;
  newStatus?: string;
  driverName?: string;
  truckImmatriculation?: string;
  isRead: boolean;
  additionalData?: any;
}

export interface GPSPosition {
  id: number;
  driverId: number | null;
  truckId: number | null;
  latitude: number;
  longitude: number;
  timestamp: string;
  source: string;
}

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  // Deux connexions séparées
  private gpsHubConnection!: signalR.HubConnection;
  private tripHubConnection!: signalR.HubConnection;
  
  private authService = inject(Auth);
  private notificationService = inject(NotificationService);

  // Expose hub connections for external use
  public getGPSHubConnection(): signalR.HubConnection | undefined {
    return this.gpsHubConnection;
  }

  public getTripHubConnection(): signalR.HubConnection | undefined {
    return this.tripHubConnection;
  }

  private notificationsSubject = new BehaviorSubject<TripNotification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  public connectionStatus$ = this.connectionStatusSubject.asObservable();

  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  private positionSubject = new BehaviorSubject<GPSPosition | null>(null);
  public position$ = this.positionSubject.asObservable();
  
  // Observable filtré pour les positions non-null
  public validPosition$ = this.position$.pipe(
    filter((position): position is GPSPosition => position !== null)
  );

constructor() {
  if (this.authService.isLoggedIn && this.authService.isTokenValid?.()) {
    this.initializeConnections();
    this.loadInitialNotifications();
  } else {
    console.log('⏭️ SignalR: Not authenticated, skipping connection initialization');
  }
}

  private async loadInitialNotifications() {
    try {
      const response = await this.notificationService.getNotifications({ pageSize: 50 }).toPromise();
      if (response?.success) {
        this.notificationsSubject.next(response.data.notifications);
        this.unreadCountSubject.next(response.data.unreadCount);
      }
    } catch (error) {
      console.error('Error loading initial notifications:', error);
    }
  }

  private initializeConnections() {
    // 1. Connexion au GPS Hub
    this.gpsHubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/gpshub`, {
        accessTokenFactory: () => this.authService.getToken() || ''
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // 2. Connexion au Trip Hub (pour les notifications)
    this.tripHubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/triphub`, {
        accessTokenFactory: () => this.authService.getToken() || ''
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // Démarrer les deux connexions
    this.startGPSConnection();
    this.startTripConnection();
    this.registerGPSHandlers();
    this.registerTripHandlers();
  }

  private startGPSConnection() {
    this.gpsHubConnection
      .start()
      .then(() => {
        console.log('✅ GPS Hub connection established');
      })
      .catch(err => {
        console.error('❌ Error establishing GPS Hub connection: ', err);
        setTimeout(() => this.startGPSConnection(), 5000);
      });

    this.gpsHubConnection.onreconnecting(() => {
      console.log('🔄 GPS Hub reconnecting...');
    });

    this.gpsHubConnection.onreconnected(() => {
      console.log('✅ GPS Hub reconnected');
    });

    this.gpsHubConnection.onclose(() => {
      console.log('🔌 GPS Hub connection closed');
    });
  }

  private startTripConnection() {
    this.tripHubConnection
      .start()
      .then(() => {
        console.log('✅ Trip Hub connection established');
        this.connectionStatusSubject.next(true);
        this.joinAllTripsGroup();
      })
      .catch(err => {
        console.error('❌ Error establishing Trip Hub connection: ', err);
        this.connectionStatusSubject.next(false);
        setTimeout(() => this.startTripConnection(), 5000);
      });

    this.tripHubConnection.onreconnecting(() => {
      console.log('🔄 Trip Hub reconnecting...');
      this.connectionStatusSubject.next(false);
    });

    this.tripHubConnection.onreconnected(() => {
      console.log('✅ Trip Hub reconnected');
      this.connectionStatusSubject.next(true);
      this.joinAllTripsGroup();
      this.loadInitialNotifications();
    });

    this.tripHubConnection.onclose(() => {
      console.log('🔌 Trip Hub connection closed');
      this.connectionStatusSubject.next(false);
    });
  }

  private registerGPSHandlers() {
    // GPS position handler
    this.gpsHubConnection.on('ReceiveGPSPosition', (position: GPSPosition) => {
      console.log('📍 Received GPS position:', position);
      this.positionSubject.next(position);
    });

    this.gpsHubConnection.on('ReceivePosition', (position: GPSPosition) => {
      console.log('📍 Received position:', position);
      this.positionSubject.next(position);
    });
  }

  private registerTripHandlers() {
    // Receive notifications
    this.tripHubConnection.on('ReceiveNotification', (notification: TripNotification) => {
      console.log('🔔 Received new notification:', notification);
      this.addNotification(notification, 20);
    });

    // Trip assigned handler
    this.tripHubConnection.on('TripAssigned', (tripData: any) => {
      console.log('📋 Trip assigned:', tripData);
    });

    // Update unread count
    this.tripHubConnection.on('UpdateUnreadCount', (count: number) => {
      console.log('📊 Unread count updated:', count);
      this.unreadCountSubject.next(count);
    });

    // User connection events
    this.tripHubConnection.on('UserConnected', (userId: string) => {
      console.log('User connected:', userId);
    });

    this.tripHubConnection.on('UserDisconnected', (userId: string) => {
      console.log('User disconnected:', userId);
    });
  }

  private addNotification(notification: TripNotification, pageSize: number = 20) {
    console.log('📬 Adding notification:', notification);

    const currentNotifications = this.notificationsSubject.value;
    notification.timestamp = new Date(notification.timestamp);

    const updatedNotifications = [notification, ...currentNotifications];

    const maxNotifications = pageSize * 2;
    if (updatedNotifications.length > maxNotifications) {
      updatedNotifications.pop();
    }

    this.notificationsSubject.next(updatedNotifications);

    const currentUnread = this.unreadCountSubject.value;
    this.unreadCountSubject.next(currentUnread + 1);

    console.log('✅ Notification added');
  }

  // Trip Hub methods
  private joinAllTripsGroup() {
    if (this.tripHubConnection?.state === signalR.HubConnectionState.Connected) {
      this.tripHubConnection.invoke('JoinAllTripsGroup')
        .catch(err => console.error('Error joining all trips group:', err));
    }
  }

  public joinTripGroup(tripId: number) {
    if (this.tripHubConnection?.state === signalR.HubConnectionState.Connected) {
      this.tripHubConnection.invoke('JoinTripGroup', tripId)
        .catch(err => console.error(`Error joining trip ${tripId} group:`, err));
    }
  }

  public leaveTripGroup(tripId: number) {
    if (this.tripHubConnection?.state === signalR.HubConnectionState.Connected) {
      this.tripHubConnection.invoke('LeaveTripGroup', tripId)
        .catch(err => console.error(`Error leaving trip ${tripId} group:`, err));
    }
  }

  // GPS Hub methods
  public async invokeGetActiveTrips(): Promise<void> {
    if (this.gpsHubConnection?.state === signalR.HubConnectionState.Connected) {
      await this.gpsHubConnection.invoke('GetActiveTrips');
    } else {
      console.warn('GPS Hub not connected, cannot get active trips');
    }
  }

  public onActiveTrips(callback: (trips: any[]) => void): void {
    this.gpsHubConnection?.on('ActiveTrips', callback);
  }

  public async requestActiveTrips(): Promise<void> {
    await this.invokeGetActiveTrips();
  }

  // Listen for GPS positions (corrigé pour gérer les null)
  public onGPSPosition(callback: (position: GPSPosition) => void): void {
    this.validPosition$.subscribe(callback);
  }

  public onTripStatusChanged(callback: (update: any) => void): void {
    this.tripHubConnection?.on('TripStatusChanged', callback);
  }

  // Notification methods
  async markAsRead(notificationId: number) {
    try {
      await this.notificationService.markAsRead(notificationId).toPromise();

      const notifications = this.notificationsSubject.value;
      const index = notifications.findIndex(n => n.id === notificationId);
      if (index !== -1) {
        notifications[index].isRead = true;
        this.notificationsSubject.next([...notifications]);

        const unreadCount = notifications.filter(n => !n.isRead).length;
        this.unreadCountSubject.next(unreadCount);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async markAllAsRead() {
    try {
      await this.notificationService.markAllAsRead().toPromise();

      const notifications = this.notificationsSubject.value.map(n => ({ ...n, isRead: true }));
      this.notificationsSubject.next(notifications);
      this.unreadCountSubject.next(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  async clearNotifications() {
    try {
      await this.notificationService.deleteAllNotifications().toPromise();

      this.notificationsSubject.next([]);
      this.unreadCountSubject.next(0);

      console.log('🗑️ All notifications cleared from database and local state');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  async refreshNotifications() {
    await this.loadInitialNotifications();
  }

  getUnreadCount(): number {
    return this.unreadCountSubject.value;
  }

  private playNotificationSound() {
    const audio = new Audio('/assets/sounds/notification.mp3');
    audio.play().catch(err => console.log('Could not play notification sound:', err));
  }

  private showBrowserNotification(notification: TripNotification) {
    if (!('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/assets/icons/notification-icon.png',
        silent: true
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }

  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  disconnect() {
    // Déconnecter les deux hubs
    if (this.gpsHubConnection) {
      this.gpsHubConnection.stop()
        .then(() => console.log('GPS Hub disconnected'))
        .catch(err => console.error('Error stopping GPS Hub:', err));
    }
    
    if (this.tripHubConnection) {
      this.tripHubConnection.stop()
        .then(() => console.log('Trip Hub disconnected'))
        .catch(err => console.error('Error stopping Trip Hub:', err));
    }
  }

  stopConnection() {
    this.disconnect();
  }

  reconnect() {
    this.disconnect();
    setTimeout(() => {
      this.initializeConnections();
    }, 1000);
  }
  // signalr.service.ts - Ajoutez cette méthode

// Connect method for backward compatibility
public async connect(): Promise<void> {
    // S'assurer que les deux connexions sont démarrées
    if (!this.gpsHubConnection && !this.tripHubConnection) {
        this.initializeConnections();
    }
    
    // Attendre que les connexions soient établies
    if (this.gpsHubConnection?.state === signalR.HubConnectionState.Connecting ||
        this.tripHubConnection?.state === signalR.HubConnectionState.Connecting) {
        // Attendre un peu que les connexions se fassent
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('SignalR connections initialized');
}
}