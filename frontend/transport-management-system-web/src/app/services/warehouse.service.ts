import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment.development';

import { PagedData } from '../types/paged-data';
import { WarehouseDTO, WarehouseSearchOptions } from '../types/WarehouseDTO';


@Injectable({
  providedIn: 'root'
})
export class WarehouseService {
  private baseUrl = environment.apiUrl + '/api/Warehouse';

  constructor(private http: HttpClient) {}

  getWarehouses(searchOptions: WarehouseSearchOptions): Observable<PagedData<WarehouseDTO>> {
    let params = new HttpParams();
    if (searchOptions.Search) params = params.set('Search', searchOptions.Search);
    if (searchOptions.Type != null) params = params.set('Type', searchOptions.Type.toString());
    if (searchOptions.PageIndex != null) params = params.set('PageIndex', searchOptions.PageIndex.toString());
    if (searchOptions.PageSize != null) params = params.set('PageSize', searchOptions.PageSize.toString());
    if (searchOptions.SortField) params = params.set('SortField', searchOptions.SortField);
    if (searchOptions.SortDirection) params = params.set('SortDirection', searchOptions.SortDirection);

return this.http.get<PagedData<WarehouseDTO>>(`${this.baseUrl}/PaginationAndSearch`, { params })
  .pipe(
    catchError(err => {
      console.error('Erreur lors de la récupération des dépôts', err);
      // CORRECT : utiliser camelCase
      return of({ totalData: 0, data: [] } as PagedData<WarehouseDTO>);
    })
  );
  }
}