import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';

import {
  StorageLocationDetail,
  StorageLocationSearchOptions
} from '../types/StorageLocationDTO';

@Injectable({
  providedIn: 'root'
})
export class StorageLocationService {

  // ✅ IMPORTANT : toujours passer par environment.apiUrl
  private baseUrl = environment.apiUrl + '/api/storagelocation';

  constructor(private http: HttpClient) {}

  /**
   * Récupérer les emplacements par warehouse
   */
  getStorageLocationsByWarehouse(
    options: StorageLocationSearchOptions
  ): Observable<any> {

    let params = new HttpParams();

    Object.keys(options || {}).forEach(key => {
      const value = (options as any)[key];
      if (value !== undefined && value !== null) {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get(`${this.baseUrl}/bywarehouse`, { params });
  }

  /**
   * Récupérer les informations d'un warehouse
   */
  getWarehouseInfo(warehouseKey: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/warehouse/${warehouseKey}`);
  }
}