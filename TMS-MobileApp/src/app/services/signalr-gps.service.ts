import { Injectable, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr/dist/esm/index';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { IPositionGPS } from '../types/gps';

@Injectable({
  providedIn: 'root'
})
export class SignalrGpsService implements OnDestroy {
  private hubConnection?: signalR.HubConnection;
  private connectedSubject = new BehaviorSubject<boolean>(false);
  private positionSubject = new BehaviorSubject<IPositionGPS | null>(null);

  connected$ = this.connectedSubject.asObservable();
  position$ = this.positionSubject.asObservable();

  async connect(): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
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

    this.hubConnection.onclose(() => this.connectedSubject.next(false));
    this.hubConnection.onreconnecting(() => this.connectedSubject.next(false));
    this.hubConnection.onreconnected(() => this.connectedSubject.next(true));

    await this.hubConnection.start();
    this.connectedSubject.next(true);
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
