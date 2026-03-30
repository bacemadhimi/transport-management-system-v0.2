import { Injectable, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

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
}

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubConnection!: signalR.HubConnection;
  private authService = inject(AuthService);
  
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  public connectionStatus$ = this.connectionStatusSubject.asObservable();

  private tripUpdateSubject = new BehaviorSubject<TripNotification | null>(null);
  public tripUpdate$ = this.tripUpdateSubject.asObservable();

  constructor() {
    this.initializeConnection();
  }

  private initializeConnection() {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/triphub`, {
        accessTokenFactory: () => this.authService.getToken() || ''
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .build();

    this.startConnection();
    this.registerHandlers();
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
    this.hubConnection.on('ReceiveNotification', (notification: TripNotification) => {
      console.log('📬 Received:', notification);
      notification.timestamp = new Date(notification.timestamp);
      
      if (notification.tripId) {
        this.tripUpdateSubject.next(notification);
      }
    });
  }

  disconnect() {
    if (this.hubConnection) {
      this.hubConnection.stop();
    }
  }
}