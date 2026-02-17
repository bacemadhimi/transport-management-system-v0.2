import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ITrip } from '../types/trip';
import { PagedData } from '../types/paged-data';

@Injectable({
  providedIn: 'root'
})
export class TripService {

  constructor(private http: HttpClient) { }

  getAllTrips(): Observable<ITrip[]> {
    return this.http.get<ITrip[]>(`${environment.apiUrl}/api/Trips/list`);
  }

  getTripsList(filter: any): Observable<PagedData<ITrip>> {
    const params = new HttpParams({ fromObject: filter });
    return this.http.get<PagedData<ITrip>>(`${environment.apiUrl}/api/Trips?${params.toString()}`);
  }

  getTrip(id: number): Observable<ITrip> {
    return this.http.get<ITrip>(`${environment.apiUrl}/api/Trips/${id}`);
  }

  updateTripStatus(tripId: number, statusDto: { status: string, proofImage?: string }): Observable<any> {
    return this.http.put(`${environment.apiUrl}/api/Trips/${tripId}/status`, statusDto);
  }

  cancelTrip(tripId: number, cancelDto: { message: string }): Observable<any> {
    return this.http.put(`${environment.apiUrl}/api/Trips/${tripId}/cancel`, cancelDto);
  }
}