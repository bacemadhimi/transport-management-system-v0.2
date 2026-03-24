import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';

import { HttpClient } from '@angular/common/http';
import { IOrderSettings } from '../types/order-settings';

import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class OrderSettingsService {
  private apiUrl = `${environment.apiUrl}/api/OrderSettings`;

  // Flux réactif pour les composants
  private _settings$ = new BehaviorSubject<IOrderSettings>({
    allowEditOrder: true,
    allowEditDeliveryDate: true,
    planningHorizon: 50
  });
  settingsChanges = this._settings$.asObservable();

  constructor(private http: HttpClient) {}

  getSettings(): Observable<IOrderSettings> {
    return this.http.get<IOrderSettings>(this.apiUrl);
  }

  updateSettings(settings: IOrderSettings): Observable<IOrderSettings> {
    return this.http.put<IOrderSettings>(this.apiUrl, settings).pipe(
    
      tap(updated => this._settings$.next(updated))
    );
  }

  get currentSettings(): IOrderSettings {
    return this._settings$.value;
  }
}
