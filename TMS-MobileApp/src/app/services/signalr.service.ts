import { Injectable, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import { NotificationStorageService } from './notification-storage.service';

export interface TripNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  timestamp: Date;
  tripId?: number;
  tripReference?: string;
  driverId?: number;
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
  private authService = inject(AuthService);
  private notificationStorage = inject(NotificationStorageService);
  
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  public connectionStatus$ = this.connectionStatusSubject.asObservable();

  private tripUpdateSubject = new BehaviorSubject<TripNotification | null>(null);
  public tripUpdate$ = this.tripUpdateSubject.asObservable();

  // ✅ BehaviorSubject pour les changements de statut en temps réel
  private tripStatusChangedSubject = new BehaviorSubject<any>(null);
  public tripStatusChanged$ = this.tripStatusChangedSubject.asObservable();

  constructor() {
    this.initializeConnection();
  }

  private initializeConnection() {
    // Remove '/api' suffix for SignalR hub URLs
    const baseUrl = environment.apiUrl.replace('/api', '');
    
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${baseUrl}/triphub`, {  // ✅ Reverted to triphub (gps-tracking.service handles gpshub notifications)
        accessTokenFactory: () => this.authService.getToken() || ''
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .build();

    // ✅ REGISTER HANDLERS BEFORE STARTING CONNECTION
    this.registerHandlers();
    this.startConnection();
  }

  private startConnection() {
    this.hubConnection
      .start()
      .then(() => {
        console.log('✅ SignalR connected');
        this.connectionStatusSubject.next(true);
      })
      .catch(err => {
        console.error('❌ SignalR error: ', err);
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
    });

    this.hubConnection.onclose(() => {
      console.log('🔌 SignalR disconnected');
      this.connectionStatusSubject.next(false);
    });
  }

  private registerHandlers() {
    // ✅ Handler TripStatusChanged - enregistré UNE SEULE FOIS ici (depuis TripHub)
    this.hubConnection.on('TripStatusChanged', (update: any) => {
      console.log('📡 TripStatusChanged received from TripHub:', update);
      this.tripStatusChangedSubject.next(update);
    });

    // ✅ Poller localStorage pour les événements venant de GPSHub
    setInterval(() => {
      const lastChange = localStorage.getItem('lastTripStatusChanged');
      if (lastChange) {
        try {
          const update = JSON.parse(lastChange);
          // Vérifier si c'est un nouvel événement
          const lastProcessed = localStorage.getItem('lastProcessedTripId');
          if (lastProcessed !== `${update.TripId}_${update.NewStatus}`) {
            console.log('📡 TripStatusChanged received from GPSHub via localStorage:', update);
            this.tripStatusChangedSubject.next(update);
            localStorage.setItem('lastProcessedTripId', `${update.TripId}_${update.NewStatus}`);
          }
        } catch (e) {
          console.warn('⚠️ Error parsing TripStatusChanged:', e);
        }
      }
    }, 2000); // Vérifier toutes les 2 secondes

    this.hubConnection.on('ReceiveNotification', (notification: TripNotification) => {
      console.log('📬📬📬 ==========================================');
      console.log('📬📬📬 ReceiveNotification received on TripHub!');
      console.log('📬📬📬 Full data:', JSON.stringify(notification, null, 2));
      console.log('📬📬📬 ==========================================');
      notification.timestamp = new Date(notification.timestamp);

      // ✅ FILTER: Only process if notification is for THIS driver
      const currentDriverId = this.getCurrentDriverId();
      console.log(`🔍 Comparing: notification.driverId=${notification.driverId} vs currentDriverId=${currentDriverId}`);
      
      if (notification.driverId && currentDriverId && String(notification.driverId) !== String(currentDriverId)) {
        console.log(`🚫 Ignoring ReceiveNotification for driver ${notification.driverId} (current: ${currentDriverId})`);
        return;
      }

      console.log('✅✅✅ Processing notification for current driver!');

      // ✅ SAVE to NotificationStorageService (this updates the badge!)
      const saved = this.notificationStorage.addNotification({
        type: notification.type as any,
        title: notification.title || '🚛 Nouvelle Mission',
        message: notification.message || 'Vous avez une nouvelle mission',
        tripId: notification.tripId || 0,
        tripReference: notification.tripReference || '',
        driverId: notification.driverId,
        driverName: notification.driverName,
        truckImmatriculation: notification.truckImmatriculation,
        destination: notification.additionalData?.destination,
        timestamp: notification.timestamp.toISOString(),
        additionalData: notification
      });

      if (saved) {
        console.log('✅ Notification saved to storage - badge count updated!');
      }

      // Also emit for trip status updates
      if (notification.tripId) {
        this.tripUpdateSubject.next(notification);
      }
    });
  }

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

  disconnect() {
    if (this.hubConnection) {
      this.hubConnection.stop();
    }
  }
}