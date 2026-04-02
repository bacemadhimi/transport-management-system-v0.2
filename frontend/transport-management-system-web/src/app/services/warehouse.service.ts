import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment.development';

import { PagedData } from '../types/paged-data';



@Injectable({
  providedIn: 'root'
})
export class WarehouseService {
  private baseUrl = environment.apiUrl + '/api/Warehouse';

  constructor(private http: HttpClient) {}

  // warehouse.service.ts
getParentOptions(): Observable<any> {
  return this.http.get(`${this.baseUrl}/ParentOptions`);
}

// warehouse.service.ts
getWarehousesPlantIt(searchOptions: any): Observable<any> {
  let params = new HttpParams();
  
  if (searchOptions.search) {
    params = params.set('search', searchOptions.search);
  }
  if (searchOptions.status !== undefined && searchOptions.status !== null) {
    params = params.set('status', searchOptions.status.toString());
  }
  // NOUVEAU: Remplacer processUnitClassLink par warehouseType
  if (searchOptions.warehouseType !== undefined && searchOptions.warehouseType !== null) {
    params = params.set('warehouseType', searchOptions.warehouseType.toString());
  }
  if (searchOptions.parentLink !== undefined && searchOptions.parentLink !== null) {
    params = params.set('parentLink', searchOptions.parentLink.toString());
  }
  if (searchOptions.pageIndex !== undefined) {
    params = params.set('pageIndex', searchOptions.pageIndex.toString());
  }
  if (searchOptions.pageSize !== undefined) {
    params = params.set('pageSize', searchOptions.pageSize.toString());
  }
  if (searchOptions.sortField) {
    params = params.set('sortField', searchOptions.sortField);
  }
  if (searchOptions.sortDirection) {
    params = params.set('sortDirection', searchOptions.sortDirection);
  }
  
  return this.http.get<any>(environment.apiUrl + '/api/Warehouse/PaginationAndSearch', { params });
}

// Méthode pour récupérer un entrepôt Plant IT par son ID
getWarehousePlantItById(id: number): Observable<any> {
  return this.http.get<any>(environment.apiUrl + '/api/Warehouse/' + id);
}

// Méthode pour créer un nouvel entrepôt Plant IT
createWarehousePlantIt(warehouse: any): Observable<any> {
  return this.http.post<any>(environment.apiUrl + '/api/Warehouse', warehouse);
}

// Méthode pour mettre à jour un entrepôt Plant IT
updateWarehousePlantIt(id: number, warehouse: any): Observable<any> {
  return this.http.put<any>(environment.apiUrl + '/api/Warehouse/' + id, warehouse);
}

// Méthode pour supprimer un entrepôt Plant IT
deleteWarehousePlantIt(id: number): Observable<any> {
  return this.http.delete<any>(environment.apiUrl + '/api/Warehouse/' + id);
}

// Méthode pour récupérer tous les entrepôts Plant IT (sans pagination)
getAllWarehousesPlantIt(): Observable<any> {
  return this.http.get<any>(environment.apiUrl + '/api/Warehouse/All');
}

// Méthode pour récupérer les options de filtres (unités de traitement, etc.)
getWarehouseFilterOptions(): Observable<any> {
  return this.http.get<any>(environment.apiUrl + '/api/Warehouse/FilterOptions');
}

// Méthode pour activer/désactiver un entrepôt
toggleWarehouseStatus(id: number): Observable<any> {
  return this.http.patch<any>(environment.apiUrl + '/api/Warehouse/' + id + '/toggle-status', {});
}

// Méthode pour récupérer les zones d'un entrepôt
getWarehouseZones(warehouseId: number): Observable<any> {
  return this.http.get<any>(environment.apiUrl + '/api/Warehouse/' + warehouseId + '/zones');
}

// Méthode pour ajouter une zone à un entrepôt
addZoneToWarehouse(warehouseId: number, zone: any): Observable<any> {
  return this.http.post<any>(environment.apiUrl + '/api/Warehouse/' + warehouseId + '/zones', zone);
}

// Méthode pour supprimer une zone d'un entrepôt
deleteZoneFromWarehouse(warehouseId: number, zoneId: number): Observable<any> {
  return this.http.delete<any>(environment.apiUrl + '/api/Warehouse/' + warehouseId + '/zones/' + zoneId);
}

// Méthode pour récupérer les statistiques des entrepôts
getWarehouseStats(): Observable<any> {
  return this.http.get<any>(environment.apiUrl + '/api/Warehouse/Stats');
}

// Méthode pour exporter la liste des entrepôts
exportWarehousesToExcel(searchOptions: any): Observable<Blob> {
  let params = new HttpParams();
  
  if (searchOptions.search) {
    params = params.set('search', searchOptions.search);
  }
  if (searchOptions.status !== undefined && searchOptions.status !== null) {
    params = params.set('status', searchOptions.status.toString());
  }
  
  return this.http.get(environment.apiUrl + '/api/Warehouse/Export', {
    params: params,
    responseType: 'blob'
  });
}}