
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

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubConnection!: signalR.HubConnection;
  private authService = inject(Auth);
  private notificationService = inject(NotificationService);

  private notificationsSubject = new BehaviorSubject<TripNotification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  public connectionStatus$ = this.connectionStatusSubject.asObservable();

  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

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
      .withUrl(`${environment.apiUrl}/triphub`, {
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
        console.log('SignalR connection established');
        this.connectionStatusSubject.next(true);
        this.joinAllTripsGroup();
      })
      .catch(err => {
        console.error('Error establishing SignalR connection: ', err);
        this.connectionStatusSubject.next(false);

        setTimeout(() => this.startConnection(), 5000);
      });

    this.hubConnection.onreconnecting(() => {
      console.log('SignalR reconnecting...');
      this.connectionStatusSubject.next(false);
    });

    this.hubConnection.onreconnected(() => {
      console.log('SignalR reconnected');
      this.connectionStatusSubject.next(true);
      this.joinAllTripsGroup();
      this.loadInitialNotifications();
    });

    this.hubConnection.onclose(() => {
      console.log('SignalR connection closed');
      this.connectionStatusSubject.next(false);
    });
  }

  private registerHandlers() {

    this.hubConnection.on('ReceiveNotification', (notification: TripNotification) => {
    console.log('🔔 Received new notification:', notification);

    this.addNotification(notification, 20);
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
  }


private addNotification(notification: TripNotification, pageSize: number = 20) {
  console.log('📬 Adding notification:', notification);

  const currentNotifications = this.notificationsSubject.value;
  notification.timestamp = new Date(notification.timestamp);



  if (notification.type === 'STATUS_CHANGE') {

    const updatedNotifications = [notification, ...currentNotifications];

    const maxNotifications = pageSize * 2;
    if (updatedNotifications.length > maxNotifications) {
      updatedNotifications.pop();
    }

    this.notificationsSubject.next(updatedNotifications);


    const currentUnread = this.unreadCountSubject.value;
    this.unreadCountSubject.next(currentUnread + 1);

    console.log('✅ STATUS_CHANGE notification added');
  }

  else if (notification.type === 'TRIP_CANCELLED') {

    const exists = currentNotifications.some(n => n.id === notification.id);
    if (!exists) {
      const updatedNotifications = [notification, ...currentNotifications];

      const maxNotifications = pageSize * 2;
      if (updatedNotifications.length > maxNotifications) {
        updatedNotifications.pop();
      }

      this.notificationsSubject.next(updatedNotifications);

      const currentUnread = this.unreadCountSubject.value;
      this.unreadCountSubject.next(currentUnread + 1);

      console.log('✅ TRIP_CANCELLED notification added');
    } else {
      console.log('⚠️ Duplicate TRIP_CANCELLED notification ignored');
    }
  }

  else {
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
}

  joinAllTripsGroup() {
    if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
      this.hubConnection.invoke('JoinAllTripsGroup')
        .catch(err => console.error('Error joining all trips group:', err));
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


  reconnect() {
    this.disconnect();
    setTimeout(() => this.startConnection(), 1000);
  }
}