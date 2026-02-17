import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ITripSettings } from '../types/trip';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class TripSettingsService {
  private apiUrl = `${environment.apiUrl}/api/TripSettings`;
  
  // Add settingsChanges Subject
  private settingsChangesSource = new Subject<ITripSettings>();
  settingsChanges$ = this.settingsChangesSource.asObservable();

  constructor(private http: HttpClient) {}

  getSettings(): Observable<ITripSettings> {
    return this.http.get<ITripSettings>(this.apiUrl);
  }

  updateSettings(settings: ITripSettings): Observable<ITripSettings> {
    return this.http.put<ITripSettings>(this.apiUrl, settings).pipe(
      tap(updatedSettings => {
        // Emit the updated settings
        this.settingsChangesSource.next(updatedSettings);
      })
    );
  }
}