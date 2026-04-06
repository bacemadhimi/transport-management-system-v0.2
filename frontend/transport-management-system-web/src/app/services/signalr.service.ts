
 
import { Injectable, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environment';
import { Auth } from './auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { NotificationService } from './notification.service';

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
  private hubConnection!: signalR.HubConnection;
  private authService = inject(Auth);
  private notificationService = inject(NotificationService);

  // Expose hubConnection for GPS tracking
  public getHubConnection(): signalR.HubConnection | undefined {
    return this.hubConnection;
  }

  private notificationsSubject = new BehaviorSubject<TripNotification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  public connectionStatus$ = this.connectionStatusSubject.asObservable();

  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  // Connect method for GPS tracking
  public async connect(): Promise<void> {
    if (this.hubConnection) {
      return;
    }
    await this.startConnection();
  }

  private positionSubject = new BehaviorSubject<GPSPosition | null>(null);
  public position$ = this.positionSubject.asObservable();

  // Listen for GPS positions
  public onGPSPosition(callback: (position: GPSPosition) => void): void {
    this.hubConnection?.on('ReceivePosition', callback);
  }

  // Listen for trip status changes
  public onTripStatusChanged(callback: (update: any) => void): void {
    this.hubConnection?.on('TripStatusChanged', callback);
  }

  // Invoke server methods
  public async invokeGetActiveTrips(): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      await this.hubConnection.invoke('GetActiveTrips');
    } else {
      console.warn('SignalR not connected, cannot get active trips');
    }
  }

  public onActiveTrips(callback: (trips: any[]) => void): void {
    this.hubConnection?.on('ActiveTrips', callback);
  }

  // Request active trips for real-time tracking
  public async requestActiveTrips(): Promise<void> {
    await this.invokeGetActiveTrips();
  }

  constructor() {
    this.initializeConnection();
    this.loadInitialNotifications();
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

  private initializeConnection() {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/gpshub`, {
        accessTokenFactory: () => this.authService.getToken() || ''
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.startConnection();
    this.registerHandlers();
  }

  private startConnection() {
    this.hubConnection
      .start()
      .then(() => {
        console.log('✅✅✅=================================');
        console.log('✅ SignalR connection established');
        console.log('✅ Hub URL:', `${environment.apiUrl}/gpshub`);
        console.log('✅ Connection ID:', this.hubConnection.connectionId);
        console.log('✅✅✅=================================');

        this.connectionStatusSubject.next(true);

        // Join Admins group explicitly for real-time notifications
        this.joinAdminGroup();

        this.joinAllTripsGroup();

        // CRITICAL: Load notifications AFTER connection is established
        setTimeout(() => {
          console.log('🔄 Loading notifications after SignalR connection...');
          this.loadInitialNotifications();
          // Start polling as fallback
          this.startNotificationPolling();
        }, 1000);
      })
      .catch(err => {
        console.error('❌❌❌=================================');
        console.error('❌ Error establishing SignalR connection: ', err);
        console.error('❌ Hub URL:', `${environment.apiUrl}/gpshub`);
        console.error('❌❌❌=================================');
        this.connectionStatusSubject.next(false);

        setTimeout(() => this.startConnection(), 5000);
      });

    this.hubConnection.onreconnecting(() => {
      console.log('🔄 SignalR reconnecting...');
      this.connectionStatusSubject.next(false);
    });

    this.hubConnection.onreconnected(() => {
      console.log('✅ SignalR reconnected');
      this.connectionStatusSubject.next(true);
      this.joinAdminGroup();
      this.joinAllTripsGroup();
      this.loadInitialNotifications();
    });

    this.hubConnection.onclose(() => {
      console.log('❌ SignalR connection closed');
      this.connectionStatusSubject.next(false);
    });
  }

  private registerHandlers() {

    // Handler for New Trip Assignment - REAL TIME NOTIFICATION TO DRIVER
    this.hubConnection.on('NewTripAssigned', (data: any) => {
      console.log('🚛🚛🚛=================================');
      console.log('🚛 NEW TRIP ASSIGNED - REAL TIME SIGNALR!');
      console.log('🚛 Data:', JSON.stringify(data, null, 2));
      console.log('🚛🚛🚛=================================');

      const notification: TripNotification = {
        id: Date.now(),
        type: 'NEW_TRIP_ASSIGNMENT',
        title: '🚛 Nouvelle Mission Assignée',
        message: `Trip ${data.tripReference || ''} assigné - Destination: ${data.destination || 'Non définie'}`,
        timestamp: new Date(data.timestamp) || new Date(),
        tripId: data.tripId,
        tripReference: data.tripReference,
        driverName: data.driverName,
        truckImmatriculation: data.truckImmatriculation,
        newStatus: 'Planifié',
        isRead: false,
        additionalData: data
      };

      this.addNotification(notification, 20);
      this.showBrowserNotification(notification);

      // Reload notifications from DB to ensure sync
      setTimeout(() => this.loadInitialNotifications(), 500);
    });

    this.hubConnection.on('ReceiveNotification', (notification: TripNotification) => {
      console.log('🔔 Received new notification:', notification);
      this.addNotification(notification, 20);
      this.showBrowserNotification(notification);

      // Reload notifications from DB to ensure sync (for offline persistence)
      setTimeout(() => this.loadInitialNotifications(), 500);
    });

    // Handler for Trip Status Changed (Accepted/Refused) - REAL TIME
    this.hubConnection.on('TripStatusChanged', (data: any) => {
      console.log('🔄🔄🔄=================================');
      console.log('🔄 Trip Status Changed - REAL TIME SIGNALR!');
      console.log('🔄 Data:', JSON.stringify(data, null, 2));
      console.log('🔄🔄🔄=================================');

      // Determine notification type based on new status
      let type, title, message, newStatus;

      if (data.NewStatus === 'Accepted' || data.status === 'Accepted') {
        type = 'TRIP_ACCEPTED';
        title = '✅ Mission Acceptée';
        message = `Le chauffeur ${data.DriverName || 'inconnu'} a accepté la mission ${data.TripReference || ''}`;
        newStatus = 'Acceptée';
      } else if (data.NewStatus === 'Refused' || data.status === 'Refused') {
        type = 'TRIP_REJECTED';
        title = '❌ Mission Refusée';
        message = `Le chauffeur ${data.DriverName || 'inconnu'} a refusé la mission ${data.TripReference || ''}. Raison: ${data.Reason || 'Non spécifiée'}`;
        newStatus = 'Refusée';
      } else if (data.NewStatus === 'Completed' || data.status === 'Completed') {
        type = 'MISSION_COMPLETED';
        title = '✅ Mission Terminée';
        message = `Mission ${data.TripReference || ''} terminée par ${data.DriverName || 'inconnu'}`;
        newStatus = 'Terminée';
      } else if (data.NewStatus === 'InDelivery' || data.status === 'InDelivery') {
        type = 'DELIVERY_STARTED';
        title = '🚚 Livraison démarrée';
        message = `Mission ${data.TripReference || ''} en cours de livraison par ${data.DriverName || 'inconnu'}`;
        newStatus = 'En livraison';
      } else if (data.NewStatus === 'Loading' || data.status === 'Loading') {
        type = 'LOADING_STARTED';
        title = '📦 Chargement démarré';
        message = `Mission ${data.TripReference || ''} en chargement par ${data.DriverName || 'inconnu'}`;
        newStatus = 'Chargement';
      } else if (data.NewStatus === 'Arrived' || data.status === 'Arrived') {
        type = 'ARRIVED_AT_DESTINATION';
        title = '📍 Arrivé à destination';
        message = `Mission ${data.TripReference || ''} - arrivé à destination`;
        newStatus = 'Arrivé';
      } else {
        type = 'STATUS_CHANGE';
        title = '🔄 Status changé';
        message = `Mission ${data.TripReference || ''} - Nouveau status: ${data.NewStatus || data.status}`;
        newStatus = data.NewStatus || data.status;
      }

      const notification: TripNotification = {
        id: Date.now() + Math.random(), // ✅ Unique ID
        type: type as any,
        title: title,
        message: message,
        timestamp: new Date(),
        tripId: data.TripId || data.tripId,
        tripReference: data.TripReference || data.tripReference,
        driverName: data.DriverName || data.driverName,
        truckImmatriculation: data.TruckImmatriculation || data.truckImmatriculation,
        newStatus: newStatus,
        isRead: false,
        additionalData: data
      };

      console.log('📬 Created notification:', notification);
      this.addNotification(notification, 20);
      this.showBrowserNotification(notification);

      // Reload notifications from DB to ensure sync (for offline persistence)
      setTimeout(() => this.loadInitialNotifications(), 500);
    });

    // Handler for Trip Accepted by driver - REAL TIME
    this.hubConnection.on('TripAccepted', (data: any) => {
      console.log('✅✅✅=================================');
      console.log('✅ Trip Accepted by driver - REAL TIME SIGNALR!');
      console.log('✅ Data:', JSON.stringify(data, null, 2));
      console.log('✅✅✅=================================');

      const notification: TripNotification = {
        id: Date.now(),
        type: 'TRIP_ACCEPTED',
        title: '✅ Mission Acceptée',
        message: `Le chauffeur ${data.DriverName || 'inconnu'} a accepté la mission ${data.TripReference || ''}`,
        timestamp: new Date(),
        tripId: data.TripId,
        tripReference: data.TripReference,
        driverName: data.DriverName,
        truckImmatriculation: data.TruckImmatriculation,
        newStatus: 'Acceptée',
        isRead: false,
        additionalData: data
      };

      this.addNotification(notification, 20);
      this.showBrowserNotification(notification);

      // Reload notifications from DB to ensure sync
      setTimeout(() => this.loadInitialNotifications(), 500);
    });

    // Handler for Trip Rejected by driver - REAL TIME
    this.hubConnection.on('TripRejected', (data: any) => {
      console.log('❌❌❌=================================');
      console.log('❌ Trip Rejected by driver - REAL TIME SIGNALR!');
      console.log('❌ Data:', JSON.stringify(data, null, 2));
      console.log('❌❌❌=================================');

      const notification: TripNotification = {
        id: Date.now(),
        type: 'TRIP_REJECTED',
        title: '❌ Mission Refusée',
        message: `Le chauffeur ${data.DriverName || 'inconnu'} a refusé la mission ${data.TripReference || ''}. Raison: ${data.Reason || 'Non spécifiée'}`,
        timestamp: new Date(),
        tripId: data.TripId,
        tripReference: data.TripReference,
        driverName: data.DriverName,
        truckImmatriculation: data.TruckImmatriculation,
        newStatus: 'Refusée',
        isRead: false,
        additionalData: data
      };

      this.addNotification(notification, 20);
      this.showBrowserNotification(notification);

      // Reload notifications from DB to ensure sync
      setTimeout(() => this.loadInitialNotifications(), 500);
    });

    // Handler for Trip Cancelled (alternative event name for compatibility)
    this.hubConnection.on('TripCancelled', (data: any) => {
      console.log('❌❌❌=================================');
      console.log('❌ Trip Cancelled received - REAL TIME SIGNALR!');
      console.log('❌ Data:', JSON.stringify(data, null, 2));
      console.log('❌❌❌=================================');

      const notification: TripNotification = {
        id: Date.now(),
        type: 'TRIP_CANCELLED',
        title: '❌ Mission Annulée/Refusée',
        message: `Le chauffeur ${data.DriverName || 'inconnu'} a annulé/refusé la mission ${data.TripReference || ''}`,
        timestamp: new Date(),
        tripId: data.TripId,
        tripReference: data.TripReference,
        driverName: data.DriverName,
        truckImmatriculation: data.TruckImmatriculation,
        newStatus: 'Annulée',
        isRead: false,
        additionalData: data
      };

      this.addNotification(notification, 20);
      this.showBrowserNotification(notification);

      // Reload notifications from DB to ensure sync
      setTimeout(() => this.loadInitialNotifications(), 500);
    });


    this.hubConnection.on('UpdateUnreadCount', (count: number) => {
      console.log('📊 Unread count updated:', count);
      this.unreadCountSubject.next(count);
    });


    this.hubConnection.on('UserConnected', (userId: string) => {
      console.log('User connected:', userId);
    });

    this.hubConnection.on('UserDisconnected', (userId: string) => {
      console.log('User disconnected:', userId);
    });

    // GPS position handler
    this.hubConnection.on('ReceiveGPSPosition', (position: GPSPosition) => {
      console.log('📍 Received GPS position:', position);
      this.positionSubject.next(position);
    });

    console.log('✅ All SignalR handlers registered successfully');
  }


private addNotification(notification: TripNotification, pageSize: number = 20) {
  console.log('📬 Adding notification:', notification);

  const currentNotifications = this.notificationsSubject.value;
  notification.timestamp = new Date(notification.timestamp);

  // Check for duplicates based on id (for numeric IDs) or tripId+type+timestamp combo
  const exists = currentNotifications.some(n => {
    if (n.id === notification.id && notification.id !== 0) return true;
    if (n.tripId === notification.tripId && n.type === notification.type &&
        Math.abs(new Date(n.timestamp).getTime() - new Date(notification.timestamp).getTime()) < 5000) {
      return true;
    }
    return false;
  });

  if (!exists) {
    const updatedNotifications = [notification, ...currentNotifications];

    const maxNotifications = pageSize * 2;
    if (updatedNotifications.length > maxNotifications) {
      updatedNotifications.pop();
    }

    this.notificationsSubject.next(updatedNotifications);

    const currentUnread = this.unreadCountSubject.value;
    this.unreadCountSubject.next(currentUnread + 1);

    console.log(`✅ Notification added: ${notification.type}`);
  } else {
    console.log(`⚠️ Duplicate ${notification.type} notification ignored`);
  }
}

  joinAllTripsGroup() {
    if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
      this.hubConnection.invoke('JoinAllTripsGroup')
        .catch(err => console.error('Error joining all trips group:', err));
    }
  }

  joinAdminGroup() {
    if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
      this.hubConnection.invoke('JoinAdminGroup')
        .then(() => console.log('✅ Joined admins group'))
        .catch(err => console.error('Error joining admins group:', err));
    }
  }


  joinTripGroup(tripId: number) {
    if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
      this.hubConnection.invoke('JoinTripGroup', tripId)
        .catch(err => console.error(`Error joining trip ${tripId} group:`, err));
    }
  }


  leaveTripGroup(tripId: number) {
    if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
      this.hubConnection.invoke('LeaveTripGroup', tripId)
        .catch(err => console.error(`Error leaving trip ${tripId} group:`, err));
    }
  }


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

  /**
   * Polling de secours - Vérifie les nouvelles notifications toutes les 5 secondes
   */
  private notificationPollingInterval: any = null;

  public startNotificationPolling(): void {
    if (this.notificationPollingInterval) {
      clearInterval(this.notificationPollingInterval);
    }

    console.log('🔄 Starting notification polling (every 5 seconds)...');

    // Poll immediately
    this.loadInitialNotifications();

    // Then poll every 5 seconds
    this.notificationPollingInterval = setInterval(() => {
      this.loadInitialNotifications();
    }, 5000);
  }

  public stopNotificationPolling(): void {
    if (this.notificationPollingInterval) {
      clearInterval(this.notificationPollingInterval);
      this.notificationPollingInterval = null;
      console.log('⏸️ Notification polling stopped');
    }
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
    if (this.hubConnection) {
      this.hubConnection.stop()
        .then(() => console.log('SignalR connection stopped'))
        .catch(err => console.error('Error stopping SignalR connection:', err));
    }
  }


  stopConnection() {
    this.disconnect();
  }

  
  reconnect() {
    this.disconnect();
    setTimeout(() => this.startConnection(), 1000);
  }
}