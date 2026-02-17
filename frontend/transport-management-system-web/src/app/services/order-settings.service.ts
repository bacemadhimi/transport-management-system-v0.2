import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';

import { HttpClient } from '@angular/common/http';
import { IOrderSettings } from '../types/order';

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
    allowLoadLateOrders: true,
    acceptOrdersWithoutAddress: true,
    planningHorizon: 30,
   loadingUnit: 'palette' 
  });
  settingsChanges = this._settings$.asObservable();

  constructor(private http: HttpClient) {}

  getSettings(): Observable<IOrderSettings> {
    return this.http.get<IOrderSettings>(this.apiUrl);
  }

  updateSettings(settings: IOrderSettings): Observable<IOrderSettings> {
    return this.http.put<IOrderSettings>(this.apiUrl, settings).pipe(
      // mettre à jour le BehaviorSubject pour propagation immédiate
      tap(updated => this._settings$.next(updated))
    );
  }

  // Permet de récupérer la valeur actuelle synchronisée
  get currentSettings(): IOrderSettings {
    return this._settings$.value;
  }
}
