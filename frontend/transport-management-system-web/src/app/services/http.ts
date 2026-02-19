import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { PagedData } from '../types/paged-data';
import { IUser } from '../types/user';
import { ITruck } from '../types/truck';
import { IDriver } from '../types/driver';
import { CreateTripDto, IDelivery, ITrip, TripStatus, UpdateTripDto } from '../types/trip';
import { ICustomer } from '../types/customer';
import { IFuelVendor } from '../types/fuel-vendor';
import { IFuel } from '../types/fuel';
import { IMechanic } from '../types/mechanic';
import { IVendor } from '../types/vendor';
import { catchError, forkJoin, map, Observable, of, shareReplay, tap } from 'rxjs';
import { IUserGroup } from '../types/userGroup';
import { CreateOrderDto, IOrder, UpdateOrderDto } from '../types/order';
import { ICreateTrajectDto, IPagedTrajectData, ITraject, IUpdateTrajectDto } from '../types/traject';
import { ApiResponse, ICreateLocationDto, ILocation, IUpdateLocationDto } from '../types/location';
import { IConvoyeur } from '../types/convoyeur';
import { IDayOff } from '../types/dayoff';
import { ICreateOvertimeSetting, IOvertimeSetting } from '../types/overtime';
import { IMaintenance } from '../types/maintenance';
import { ICreateZoneDto, IUpdateZoneDto, IZone } from '../types/zone';
import { DailyForecast, WeatherData } from '../types/weather';
import { ApiResponses, ICreateCityDto, ICity, IUpdateCityDto } from '../types/city';
import { AvailabilityRequestDto, DriverAvailabilityDto, DriverOvertimeCheckDto, DriverOvertimeResultDto } from '../types/driver-overtime';
import { ITypeTruck } from '../types/type-truck';
import { ICategorys } from '../types/categorys';

@Injectable({
  providedIn: 'root'
})
export class Http {
  http = inject(HttpClient);
  constructor(){}
  
  private buildParams(filter: any): HttpParams {
  let params = new HttpParams();

  if (!filter) return params;

  Object.keys(filter).forEach(key => {
    const value = filter[key];

    if (
      value !== null &&
      value !== undefined &&
      value !== ''
    ) {
      params = params.set(key, value.toString());
    }
  });

  return params;
}

getUsersList(filter: any) {
    const params = new HttpParams({ fromObject: filter });
    return this.http.get<PagedData<IUser>>(environment.apiUrl + '/api/User?' + params.toString());
  }

  getUserById(id: number) {
    return this.http.get<IUser>(environment.apiUrl + '/api/User/' + id);
  }

  addUser(user: any) {
    return this.http.post(environment.apiUrl + '/api/User', user);
  }


 UpdateUserById(id:number, user:any){
    return this.http.put(environment.apiUrl+'/api/User/' +id, user);
      
}
  deleteUser(id: number) {
    return this.http.delete(environment.apiUrl + '/api/User/' + id);
  }
   
  getTrucksList(filter: any) {
    const params = new HttpParams({ fromObject: filter });
    return this.http.get<PagedData<ITruck>>(environment.apiUrl + '/api/Trucks?' + params.toString());
  }

  getTruck(id: number) {
    return this.http.get<ITruck>(environment.apiUrl + '/api/Trucks/' + id);
  }

  addTruck(truck: any) {
    return this.http.post(environment.apiUrl + '/api/Trucks', truck);
  }

  updateTruck(id: number, truck: any) {
    return this.http.put(environment.apiUrl + '/api/Trucks/' + id, truck);
  }

  deleteTruck(id: number) {
    return this.http.delete(environment.apiUrl + '/api/Trucks/' + id);
  }

  getDriversList(filter: any) {
  const params = new HttpParams({ fromObject: filter });
  return this.http.get<PagedData<IDriver>>(environment.apiUrl + '/api/Driver/Pagination and Search?' + params.toString());
}


getdisableDriver(filter: any) {
    const params = new HttpParams({ fromObject: filter });
  return this.http.get<PagedData<IDriver>>(environment.apiUrl + '/api/Driver/PaginationDisableDriver?' + params.toString());
} 

getDriver(id: number) {
  return this.http.get<IDriver>(environment.apiUrl + '/api/Driver/' + id);
}

addDriver(driver: any) {
  return this.http.post(environment.apiUrl + '/api/Driver/', driver);
}

updateDriver(id: number, driver: any) {
  return this.http.put(environment.apiUrl + '/api/Driver/' + id, driver);
}

deleteDriver(id: number) {
  return this.http.delete(environment.apiUrl + '/api/Driver/' + id);
}

enableDriver(id: number) {
  return this.http.put(environment.apiUrl + `/api/Driver/DriverStatus?driverId=${id}`, {});
}
 

disableDriver(id: number) {
  return this.http.put(environment.apiUrl + '/api/Driver/DisableDriverFromList/' + id, {});
} 

getTripsList(filters: any) {
  const cleanFilters: any = {};
  
  Object.keys(filters).forEach(key => {
    const value = filters[key];
    if (value !== null && value !== undefined && value !== '') {
      cleanFilters[key] = value;
    }
  });


  if (cleanFilters.startDate) {
    cleanFilters.startDate = this.formatDateForApi(cleanFilters.startDate);
  }
  if (cleanFilters.endDate) {
    cleanFilters.endDate = this.formatDateForApi(cleanFilters.endDate);
  }

  const params = new HttpParams({ fromObject: cleanFilters });
  return this.http.get<ApiResponse<PagedData<ITrip>>>(
    `${environment.apiUrl}/api/Trips/PaginationAndSearch`,
    { params }
  );
}

private formatDateForApi(date: string | Date): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}
  getTrip(id: number) {
    return this.http.get<ITrip>(environment.apiUrl + '/api/Trips/' + id);
  }

  deleteTrip(id: number) {
    return this.http.delete(environment.apiUrl + '/api/Trips/' + id);
  }
  getTrucks() {
    return this.http.get<ITruck[]>(environment.apiUrl + '/api/Trucks/list');
  }

  getDrivers() {
    return this.http.get<IDriver[]>(environment.apiUrl + '/api/Driver/ListOfDrivers');
  }
 getCustomersList(filter: any) {

  const cleanedFilter: any = {};

  Object.keys(filter).forEach(key => {
    const value = filter[key];
    if (value !== null && value !== undefined && value !== '') {
      cleanedFilter[key] = value;
    }
  });

  const params = new HttpParams({ fromObject: cleanedFilter });

  return this.http.get<PagedData<ICustomer>>(
    environment.apiUrl + '/api/Customer/PaginationAndSearch',
    { params }
  );
}


  getCustomer(id: number) {
    return this.http.get<ICustomer>(environment.apiUrl + '/api/Customer/' + id);
  }

 getCustomers() {
  return this.http.get<ICustomer[]>(`${environment.apiUrl}/api/Customer`);
}


 addCustomer(customer: any) {
  return this.http.post(environment.apiUrl + '/api/Customer', customer);
}

  updateCustomer(id: number, customer: any) {
    return this.http.put<ICustomer>(environment.apiUrl + '/api/Customer/' + id, customer);
  }

  deleteCustomer(id: number) {
    return this.http.delete(environment.apiUrl + '/api/Customer/' + id);
  }

  getFuelVendorsList(filter: any) {
    const params = new HttpParams({ fromObject: filter });
    return this.http.get<PagedData<IFuelVendor>>(environment.apiUrl + '/api/FuelVendor/Search?' + params.toString());
  }



 getCategoriesList(filter: any) {
    const params = new HttpParams({ fromObject: filter });
    return this.http.get<PagedData<ICategorys>>(environment.apiUrl + '/api/Category/PaginationAndSearch?' + params.toString());
  }

  getFuelVendor(id: number) {
    return this.http.get<IFuelVendor>(environment.apiUrl + '/api/FuelVendor/' + id);
  }

  getCategory(id: number) {
    return this.http.get<ICategorys>(environment.apiUrl + '/api/Category/' + id);
  }
  addFuelVendor(vendor: any) {
    return this.http.post<IFuelVendor>(environment.apiUrl + '/api/FuelVendor', vendor);
  }

  //ADD CATEGORY
   addCategory(category: any) {
    return this.http.post<ICategorys>(environment.apiUrl + '/api/Category', category);
  }

  updateFuelVendor(id: number, vendor: any) {
    return this.http.put<IFuelVendor>(environment.apiUrl + '/api/FuelVendor/' + id, vendor);
  }
  
  //UPDATE CATEGORY
  updateCategory(id: number, category: any) {
    return this.http.put<ICategorys>(environment.apiUrl + '/api/Category/' + id, category);
  }

  deleteFuelVendor(id: number) {
    return this.http.delete(environment.apiUrl + '/api/FuelVendor/' + id);
  }

   deleteCategory(id: number) {
    return this.http.delete(environment.apiUrl + '/api/Category/' + id);
  }

  getFuelVendors() {
    return this.http.get<IFuelVendor[]>(environment.apiUrl + '/api/FuelVendor');
  }

  getFuelsList(filter: any) {
    const params = new HttpParams({ fromObject: filter });
    return this.http.get<PagedData<IFuel>>(environment.apiUrl + '/api/Fuel/Search?' + params.toString());
  }

  getFuel(id: number) {
    return this.http.get<IFuel>(environment.apiUrl + '/api/Fuel/' + id);
  }

  addFuel(fuel: any) {
    return this.http.post<IFuel>(environment.apiUrl + '/api/Fuel', fuel);
  }

  updateFuel(id: number, fuel: any) {
    return this.http.put<IFuel>(environment.apiUrl + '/api/Fuel/' + id, fuel);
  }

  deleteFuel(id: number) {
    return this.http.delete(environment.apiUrl + '/api/Fuel/' + id);
  }

  getFuels() {
    return this.http.get<IFuel[]>(environment.apiUrl + '/api/Fuel/All');
  }

  getMechanicsList(filter: any) {
    const params = new HttpParams({ fromObject: filter });
    return this.http.get<PagedData<IMechanic>>(environment.apiUrl + '/api/Mechanic/Pagination and Search?' + params.toString());
  }

  getMechanic(id: number) {
    return this.http.get<IMechanic>(environment.apiUrl + '/api/Mechanic/' + id);
  }

  addMechanic(mechanic: any) {
    return this.http.post<IMechanic>(environment.apiUrl + '/api/Mechanic', mechanic);
  }

  updateMechanic(id: number, mechanic: any) {
    return this.http.put<IMechanic>(environment.apiUrl + '/api/Mechanic/' + id, mechanic);
  }

  deleteMechanic(id: number) {
    return this.http.delete(environment.apiUrl + '/api/Mechanic/' + id);
  }

  getMechanics() {
    return this.http.get<IMechanic[]>(environment.apiUrl + '/api/Mechanic/All');
  }

  getVendorsList(filter: any) {
    const params = new HttpParams({ fromObject: filter });
    return this.http.get<PagedData<IVendor>>(
      `${environment.apiUrl}/api/Vendor/Pagination and Search?${params.toString()}`
    );
  }


  getVendor(id: number) {
    return this.http.get<IVendor>(`${environment.apiUrl}/api/Vendor/${id}`);
  }


  addVendor(vendor: any) {
    return this.http.post<IVendor>(`${environment.apiUrl}/api/Vendor`, vendor);
  }

  
  updateVendor(id: number, vendor: any) {
    return this.http.put<IVendor>(`${environment.apiUrl}/api/Vendor/${id}`, vendor);
  }


  deleteVendor(id: number) {
    return this.http.delete(`${environment.apiUrl}/api/Vendor/${id}`);
  }

  getAllVendors() {
    return this.http.get<IVendor[]>(`${environment.apiUrl}/api/Vendor/All`);
  }

  getRolesList(filter: any) {
  const params = new HttpParams({ fromObject: filter });
  return this.http.get<PagedData<IUserGroup>>(environment.apiUrl + '/api/UserGroup?' + params.toString());
}

getRole(id: number) {
  return this.http.get<IUserGroup>(environment.apiUrl + '/api/UserGroup/' + id);
}

createRoleWithInheritance(group: any) {
  return this.http.post(environment.apiUrl + '/api/UserGroup/inherit', group);
}

addRole(group: any) {
  return this.http.post(environment.apiUrl + '/api/UserGroup/', group);
}

updateRole(id: number, group: any) {
  return this.http.put(environment.apiUrl + '/api/UserGroup/' + id, group);
}

deleteRole(id: number) {
  return this.http.delete(environment.apiUrl + '/api/UserGroup/' + id);
}

getRoles() {
  return this.http.get<IUserGroup[]>(environment.apiUrl + '/api/UserGroup/All');
}

createRole(groupData: { name: string; description?: string }): Observable<IUserGroup> {
  return this.http.post<IUserGroup>(`${environment.apiUrl}/api/UserGroup`, groupData);
}

getAllRoles(): Observable<IUserGroup[]> {
  return this.http.get<IUserGroup[]>(`${environment.apiUrl}/api/UserGroup/All`);
}

getRolesByUserId(userId: number): Observable<IUserGroup[]> {
  return this.http.get<IUserGroup[]>(`${environment.apiUrl}/api/User/${userId}/groups`);
}


updateUserById(id: number, userData: any): Observable<any> {
  return this.http.put<any>(`${environment.apiUrl}/user/${id}`, userData);
}

getMaintenancesList(filter: any): Observable<PagedData<IMaintenance>> {
  const params = new HttpParams({ fromObject: filter });
  return this.http.get<PagedData<IMaintenance>>(
    `${environment.apiUrl}/api/Maintenance/PaginationAndSearch?${params.toString()}`
  );
}

getMaintenance(id: number): Observable<IMaintenance> {
  return this.http.get<IMaintenance>(`${environment.apiUrl}/api/Maintenance/${id}`);
}

addMaintenance(maintenance: any): Observable<IMaintenance> {
  return this.http.post<IMaintenance>(`${environment.apiUrl}/api/Maintenance`, maintenance);
}

updateMaintenance(id: number, maintenance: any): Observable<IMaintenance> {
  return this.http.put<IMaintenance>(`${environment.apiUrl}/api/Maintenance/${id}`, maintenance);
}

deleteMaintenance(id: number): Observable<void> {
  return this.http.delete<void>(`${environment.apiUrl}/api/Maintenance/${id}`);
}

getMaintenances(): Observable<IMaintenance[]> {
  return this.http.get<IMaintenance[]>(`${environment.apiUrl}/api/Maintenance/All`);
}

getTripsForDropdown(): Observable<ITrip[]> {
  return this.http.get<ITrip[]>(`${environment.apiUrl}/api/Trips/ForDropdown`);
}

getMechanicsForDropdown(): Observable<IMechanic[]> {
  return this.http.get<IMechanic[]>(`${environment.apiUrl}/api/Mechanic/ForDropdown`);
}

getVendorsForDropdown(): Observable<IVendor[]> {
  return this.http.get<IVendor[]>(`${environment.apiUrl}/api/Vendor/ForDropdown`);
}


getMaintenanceStatistics(): Observable<any> {
  return this.http.get<any>(`${environment.apiUrl}/api/Maintenance/Statistics`);
}

getMaintenanceByStatus(status: string): Observable<IMaintenance[]> {
  return this.http.get<IMaintenance[]>(`${environment.apiUrl}/api/Maintenance/ByStatus/${status}`);
}

getUpcomingMaintenances(): Observable<IMaintenance[]> {
  return this.http.get<IMaintenance[]>(`${environment.apiUrl}/api/Maintenance/Upcoming`);
}


getMaintenanceByTruckId(truckId: number): Observable<IMaintenance[]> {
  return this.http.get<IMaintenance[]>(`${environment.apiUrl}/api/Maintenance/ByTruck/${truckId}`);
}


getMaintenanceByMechanicId(mechanicId: number): Observable<IMaintenance[]> {
  return this.http.get<IMaintenance[]>(`${environment.apiUrl}/api/Maintenance/ByMechanic/${mechanicId}`);
}


sendMaintenanceNotification(maintenanceId: number, notificationType: string): Observable<any> {
  return this.http.post<any>(`${environment.apiUrl}/api/Maintenance/${maintenanceId}/SendNotification`, {
    notificationType
  });
}


generateMaintenanceReport(filter: any): Observable<Blob> {
  const params = new HttpParams({ fromObject: filter });
  return this.http.get(`${environment.apiUrl}/api/Maintenance/Report`, {
    params,
    responseType: 'blob'
  });
}


getMaintenanceCostSummary(filter: any): Observable<any> {
  const params = new HttpParams({ fromObject: filter });
  return this.http.get<any>(`${environment.apiUrl}/api/Maintenance/CostSummary?${params.toString()}`);
}


getMaintenanceCalendar(startDate: string, endDate: string): Observable<any> {
  return this.http.get<any>(
    `${environment.apiUrl}/api/Maintenance/Calendar?startDate=${startDate}&endDate=${endDate}`
  );
}


bulkUpdateMaintenances(maintenances: any[]): Observable<any> {
  return this.http.put<any>(`${environment.apiUrl}/api/Maintenance/BulkUpdate`, maintenances);
}


uploadMaintenanceDocument(maintenanceId: number, file: File): Observable<any> {
  const formData = new FormData();
  formData.append('file', file);
  return this.http.post<any>(
    `${environment.apiUrl}/api/Maintenance/${maintenanceId}/Documents`,
    formData
  );
}

getMaintenanceDocuments(maintenanceId: number): Observable<any[]> {
  return this.http.get<any[]>(`${environment.apiUrl}/api/Maintenance/${maintenanceId}/Documents`);
}

deleteMaintenanceDocument(maintenanceId: number, documentId: number): Observable<void> {
  return this.http.delete<void>(
    `${environment.apiUrl}/api/Maintenance/${maintenanceId}/Documents/${documentId}`
  );
}

 getAllTrips() {
    return this.http.get<ITrip[]>(environment.apiUrl + '/api/Trips/list');
  }
saveGroupPermissions(groupId: number, permissions: string[]) {
  return this.http.post(`${environment.apiUrl}/api/UserGroup/group/${groupId}/permissions`, permissions);
}

getGroupPermissions(groupId: number) {
  return this.http.get<string[]>(`${environment.apiUrl}/api/UserGroup/group/${groupId}/permissions`);
}



addTrip(trip: CreateTripDto) {
  return this.createTrip(trip);
}

updateTripStatus(id: number, statusDto: { status: string }) {
  return this.http.put(environment.apiUrl + '/api/Trips/' + id + '/status', statusDto);
}

getTripSummary(id: number) {
  return this.http.get<any>(environment.apiUrl + '/api/Trips/' + id + '/summary');
}

getTripDeliveries(tripId: number) {
  return this.http.get<IDelivery[]>(environment.apiUrl + '/api/Trips/' + tripId + '/deliveries');
}

getTripRoute(tripId: number) {
  return this.http.get<any>(environment.apiUrl + '/api/Trips/' + tripId + '/route');
}

reorderDeliveries(tripId: number, reorderList: any[]) {
  return this.http.put(environment.apiUrl + '/api/Trips/' + tripId + '/reorder-deliveries', reorderList);
}


getOrders(filter?: any): Observable<IOrder[]> {
  const params = filter ? new HttpParams({ fromObject: filter }) : new HttpParams();
  return this.http.get<IOrder[]>(environment.apiUrl + '/api/Orders?' + params.toString());
}

getOrder(id: number): Observable<IOrder> {
  return this.http.get<IOrder>(environment.apiUrl + '/api/Orders/' + id);
}

getOrdersByCustomer(customerId: number): Observable<IOrder[]> {
  return this.http.get<IOrder[]>(environment.apiUrl + '/api/Orders/by-customer/' + customerId);
}

markOrdersReadyToLoad(orderIds: number[]) {
  return this.http.put(
    `${environment.apiUrl}/api/orders/mark-ready`,
    {
      orderIds: orderIds,
      status: "ReadyToLoad"
    }
  );
}




getAvailableTrucks(date: string, zoneId?: number | null, excludeTripId?: number) {
  let url = `${environment.apiUrl}/api/Trucks/available?date=${date}`;
  
  if (zoneId) {
    url += `&zoneId=${zoneId}`;
  }
  
  if (excludeTripId) {
    url += `&excludeTripId=${excludeTripId}`;
  }
  
  console.log('📡 Appel API:', url);
  return this.http.get(url);
}


getAvailableDrivers() {
  return this.http.get<IDriver[]>(environment.apiUrl + '/api/Driver/available');
}


getDashboardStats(startDate?: Date, endDate?: Date) {
  let params = new HttpParams();
  if (startDate) {
    params = params.set('startDate', startDate.toISOString());
  }
  if (endDate) {
    params = params.set('endDate', endDate.toISOString());
  }
  return this.http.get<any>(environment.apiUrl + '/api/Trips/dashboard?' + params.toString());
}


checkTruckAvailability(truckId: number, startDate: string, endDate: string) {
  const params = new HttpParams()
    .set('truckId', truckId.toString())
    .set('startDate', startDate)
    .set('endDate', endDate);
  
  return this.http.get<{ available: boolean; conflictingTripId?: number }>(
    environment.apiUrl + '/api/Trips/check-truck-availability?' + params.toString()
  );
}

checkDriverAvailability(driverId: number, startDate: string, endDate: string) {
  const params = new HttpParams()
    .set('driverId', driverId.toString())
    .set('startDate', startDate)
    .set('endDate', endDate);
  
  return this.http.get<{ available: boolean; conflictingTripId?: number }>(
    environment.apiUrl + '/api/Trips/check-driver-availability?' + params.toString()
  );
}



getOrdersByCustomerId(customerId: number): Observable<IOrder[]> {
  return this.http.get<any>(environment.apiUrl + `/api/orders/customer/${customerId}`).pipe(
    map(response => {
      if (Array.isArray(response)) {
        return response as IOrder[];
      }
      
      if (response && typeof response === 'object') {
        if (Array.isArray(response.data)) {
          return response.data as IOrder[];
        }
        if (response.success && Array.isArray(response.data)) {
          return response.data as IOrder[];
        }
      }
      
      return [];
    }),
    catchError(error => {
      console.error('Error in getOrdersByCustomerId:', error);
      return of([]);
    })
  );
}

updateTrip(tripId: number, data: UpdateTripDto): Observable<any> {
  return this.http.put(`${environment.apiUrl}/api/Trips/${tripId}`, data);
}


createTrip(trip: CreateTripDto) {
  return this.http.post<ITrip>(environment.apiUrl + '/api/Trips', trip);
}

getTrajectsList(filter: any): Observable<IPagedTrajectData> {
  return this.http.get<IPagedTrajectData>(`${environment.apiUrl}/api/Traject/PaginationAndSearch`, {
    params: filter
  });
}

getAllTrajects(): Observable<ITraject[]> {
  return this.http.get<ITraject[]>(`${environment.apiUrl}/api/Traject/ListOfTrajects`);
}

getTrajectById(id: number): Observable<ITraject> {
  return this.http.get<ITraject>(`${environment.apiUrl}/api/Traject/${id}`);
}

createTraject(traject: ICreateTrajectDto): Observable<ITraject> {
  return this.http.post<ITraject>(`${environment.apiUrl}/api/Traject`, traject);
}

updateTraject(id: number, traject: IUpdateTrajectDto): Observable<ITraject> {
  return this.http.put<ITraject>(`${environment.apiUrl}/api/Traject/${id}`, traject);
}

deleteTraject(id: number | undefined): Observable<void> {
  return this.http.delete<void>(`${environment.apiUrl}/api/Traject/${id}`);
}

getLocationsList(filter?: any): Observable<PagedData<ILocation>> {
  const params = new HttpParams({ fromObject: filter || {} });
  return this.http.get<PagedData<ILocation>>(`${environment.apiUrl}/api/locations/PaginationAndSearch`, { params });
}

getCityList(filter?: any): Observable<PagedData<ICity>> {
  const params = new HttpParams({ fromObject: filter || {} });
  return this.http.get<PagedData<ICity>>(`${environment.apiUrl}/api/Cities/PaginationAndSearch`, { params });
}

getLocation(locationId: number) {
  return this.http.get<ApiResponse<ILocation>>(
    `${environment.apiUrl}/api/locations/${locationId}`
  );
}

getCity(cityId: number) {
  return this.http.get<ApiResponses<ICity>>(
    `${environment.apiUrl}/api/Cities/${cityId}`
  );
}


createLocation(data: ICreateLocationDto): Observable<ILocation> {
  return this.http.post<ILocation>(`${environment.apiUrl}/api/locations`, data);
}

createCity(data: ICreateCityDto): Observable<ICity> {
  return this.http.post<ICity>(`${environment.apiUrl}/api/Cities`, data);
}

updateLocation(id: number, data: IUpdateLocationDto): Observable<ILocation> {
  return this.http.put<ILocation>(`${environment.apiUrl}/api/locations/${id}`, data);
}

updateCity(id: number, data: IUpdateCityDto): Observable<ICity> {
  return this.http.put<ICity>(`${environment.apiUrl}/api/Cities/${id}`, data);
}


deleteLocation(id: number): Observable<any> {
  return this.http.delete(`${environment.apiUrl}/api/locations/${id}`);
}

deleteCity(id: number): Observable<any> {
  return this.http.delete(`${environment.apiUrl}/api/Cities/${id}`);
}

getLocations(): Observable<ILocation[]> {
  return this.http.get<ILocation[]>(`${environment.apiUrl}/api/locations`);
}
getConvoyeursList(filter: any) {
  const params = new HttpParams({ fromObject: filter });
  return this.http.get<PagedData<IConvoyeur>>(
    environment.apiUrl + '/api/Convoyeur/Pagination and Search?' + params.toString()
  );
}
getConvoyeurs(): Observable<IConvoyeur[]> {
  return this.http.get<IConvoyeur[]>(`${environment.apiUrl}/api/Convoyeur/ListOfConvoyeurs`);
}
getConvoyeur(id: number) {
  return this.http.get<IConvoyeur>(
    environment.apiUrl + '/api/Convoyeur/' + id
  );
}

addConvoyeur(convoyeur: any) {
  return this.http.post(
    environment.apiUrl + '/api/Convoyeur/',
    convoyeur
  );
}

updateConvoyeur(id: number, convoyeur: any) {
  return this.http.put(
    environment.apiUrl + '/api/Convoyeur/' + id,
    convoyeur
  );
}

deleteConvoyeur(id: number) {
  return this.http.delete(
    environment.apiUrl + '/api/Convoyeur/' + id
  );
}

getDayOffs(params?: any): Observable<PagedData<IDayOff>> {
  return this.http.get<PagedData<IDayOff>>(`${environment.apiUrl}/api/DayOff/Pagination and Search`, { params });
}

getDayOff(id: number): Observable<IDayOff> {
  return this.http.get<IDayOff>(`${environment.apiUrl}/api/DayOff/${id}`);
}

addDayOff(dayOff: IDayOff): Observable<IDayOff> {
  return this.http.post<IDayOff>(`${environment.apiUrl}/api/DayOff`, dayOff);
}

updateDayOff(id: number, dayOff: IDayOff): Observable<any> {
  return this.http.put(`${environment.apiUrl}/api/DayOff/${id}`, dayOff);
}

deleteDayOff(id: number): Observable<any> {
  return this.http.delete(`${environment.apiUrl}/api/DayOff/${id}`);
}

getOvertimeSettings(params?: any): Observable<PagedData<IOvertimeSetting>> {
  return this.http.get<PagedData<IOvertimeSetting>>(`${environment.apiUrl}/api/OvertimeSetting`, { params });
}

getOvertimeSetting(id: number): Observable<IOvertimeSetting> {
  return this.http.get<IOvertimeSetting>(`${environment.apiUrl}/api/OvertimeSetting/${id}`);
}

getOvertimeSettingByDriver(driverId: number): Observable<IOvertimeSetting> {
  return this.http.get<IOvertimeSetting>(`${environment.apiUrl}/api/OvertimeSetting/driver/${driverId}`);
}

addOvertimeSetting(overtimeSetting: ICreateOvertimeSetting): Observable<IOvertimeSetting> {
  return this.http.post<IOvertimeSetting>(`${environment.apiUrl}/api/OvertimeSetting`, overtimeSetting);
}

updateOvertimeSetting(id: number, overtimeSetting: ICreateOvertimeSetting): Observable<any> {
  return this.http.put(`${environment.apiUrl}/api/OvertimeSetting/${id}`, overtimeSetting);
}

deleteOvertimeSetting(id: number): Observable<any> {
  return this.http.delete(`${environment.apiUrl}/api/OvertimeSetting/${id}`);
}

toggleOvertimeStatus(id: number): Observable<any> {
  return this.http.patch(`${environment.apiUrl}/api/OvertimeSetting/${id}/toggle-status`, {});
}

getAllDriversAvailability(params: any): Observable<any> {
  return this.http.get(`${environment.apiUrl}/api/DriverAvailability`, { params });
}


updateDriverAvailability(driverId: number, updateDto: any): Observable<any> {
  return this.http.post(`${environment.apiUrl}/api/DriverAvailability/${driverId}`, updateDto);
}


getCompanyDayOffs(): Observable<any> {
  return this.http.get(`${environment.apiUrl}/api/DriverAvailability/CompanyDayOffs`);
}


initializeDriverAvailability(driverId: number, dates: string[]): Observable<any> {
  return this.http.post(`${environment.apiUrl}/api/DriverAvailability/Initialize/${driverId}`, dates);
}


getAvailabilityStats(date: string): Observable<any> {
  return this.http.get(`${environment.apiUrl}/api/DriverAvailability/Stats`, { params: { date } });
}

getFilteredOrderIds(filter?: any): Observable<number[]> {
  const params = filter ? new HttpParams({ fromObject: filter }) : new HttpParams();
  return this.http.get<number[]>(`${environment.apiUrl}/api/Orders/filteredIds`, { params });
}

getOrdersList(filter: any): Observable<PagedData<IOrder>> {
  const params = this.buildParams(filter);
    return this.http.get<PagedData<IOrder>>(`${environment.apiUrl}/api/orders/PaginationAndSearch`, { params });
  }

  getPendingOrders(filter: any): Observable<PagedData<IOrder>> {
    const params = this.createParams(filter);
    return this.http.get<PagedData<IOrder>>(`${environment.apiUrl}/api/orders/pending`, { params });
  }

  getOrderById(id: number): Observable<IOrder> {
    return this.http.get<IOrder>(`${environment.apiUrl}/api/orders/${id}`);
  }

  createOrder(order: CreateOrderDto): Observable<IOrder> {
    return this.http.post<IOrder>(`${environment.apiUrl}/api/orders`, order);
  }

  updateOrder(id: number, order: UpdateOrderDto): Observable<IOrder> {
    return this.http.put<IOrder>(`${environment.apiUrl}/api/orders/${id}`, order);
  }

  deleteOrder(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/orders/${id}`);
  }
 private createParams(filter: any): HttpParams {
    let params = new HttpParams();
    
    if (filter.pageIndex !== undefined) {
      params = params.set('pageIndex', filter.pageIndex.toString());
    }
    
    if (filter.pageSize !== undefined) {
      params = params.set('pageSize', filter.pageSize.toString());
    }
    
    if (filter.search) {
      params = params.set('search', filter.search);
    }
    
    if (filter.status) {
      params = params.set('status', filter.status);
    }
    
      if (filter.sourceSystem) {
    params = params.set('sourceSystem', filter.sourceSystem);
  }
    if (filter.deliveryDateStart) {
    params = params.set('deliveryDateStart', filter.deliveryDateStart);
  }

  if (filter.deliveryDateEnd) {
    params = params.set('deliveryDateEnd', filter.deliveryDateEnd);
  }
  if (filter.zoneId) {
  params = params.set('zoneId', filter.zoneId.toString());
}

    return params;
  }

 
uploadMaintenanceFile(formData: FormData): Observable<any> {
  return this.http.post(`${environment.apiUrl}/api/maintenances/upload`, formData);
}

getUpcomingVidanges(): Observable<any> {
  return this.http.get(`${environment.apiUrl}/api/maintenances/upcoming-vidanges`);
}

getTruckVidangesHistory(truckId: number): Observable<any> {
  return this.http.get(`${environment.apiUrl}/api/maintenances/truck/${truckId}/vidanges`);
}

getAvailableDriversList(dateStr: string, excludeTripId?: number): Observable<any> {
  let url = `${environment.apiUrl}/api/DriverAvailability/AvailableDrivers?date=${dateStr}`;
  
  if (excludeTripId) {
    url += `&excludeTripId=${excludeTripId}`;
  }
  
  return this.http.get(url);
}

checkDriverAvailabilityList(driverId: number, dateStr: string, excludeTripId?: number): Observable<any> {
  let url = `${environment.apiUrl}/api/DriverAvailability/CheckDriverAvailability/${driverId}?date=${dateStr}`;
  
  if (excludeTripId) {
    url += `&excludeTripId=${excludeTripId}`;
  }
  
  return this.http.get(url);
}

getTrajectForTrip(tripId: number): Observable<ITraject | null> {
  return this.http.get<any>(`${environment.apiUrl}/trips/${tripId}/traject`).pipe(
    map(response => {
      
      if (response && response.data !== undefined) {
        return response.data as ITraject;
      }
      return response as ITraject;
    }),
    catchError(error => {
      console.error('Error fetching traject for trip:', error);
      return of(null);
    })
  );
}
getAllTrucksAvailability(params: any): Observable<any> {
  return this.http.get(
    `${environment.apiUrl}/api/TruckAvailability`,
    { params }
  );
}


updateTruckAvailability(truckId: number, updateDto: any): Observable<any> {
  return this.http.post(
    `${environment.apiUrl}/api/TruckAvailability/${truckId}`,
    updateDto
  );
}


getTruckCompanyDayOffs(): Observable<any> {
  return this.http.get(
    `${environment.apiUrl}/api/TruckAvailability/CompanyDayOffs`
  );
}


initializeTruckAvailability(truckId: number, dates: string[]): Observable<any> {
  return this.http.post(
    `${environment.apiUrl}/api/TruckAvailability/Initialize/${truckId}`,
    dates
  );
}


getTruckAvailabilityStats(date: string): Observable<any> {
  return this.http.get(
    `${environment.apiUrl}/api/TruckAvailability/Stats`,
    { params: { date } }
  );
}

getAvailableTrucksList(dateStr: string, excludeTripId?: number): Observable<any> {
  let url = `${environment.apiUrl}/api/TruckAvailability/AvailableTrucks?date=${dateStr}`;

  if (excludeTripId) {
    url += `&excludeTripId=${excludeTripId}`;
  }

  return this.http.get(url);
}

checkTruckAvailabilityList(
  truckId: number,
  dateStr: string,
  excludeTripId?: number
): Observable<any> {
  let url = `${environment.apiUrl}/api/TruckAvailability/CheckTruckAvailability/${truckId}?date=${dateStr}`;

  if (excludeTripId) {
    url += `&excludeTripId=${excludeTripId}`;
  }

  return this.http.get(url);
}


startSync() {
  return this.http.post(`${environment.apiUrl}/api/sync/start`, {});
}

getSyncStatus() {
  return this.http.get<any>(`${environment.apiUrl}/api/sync/status`);
}

getSyncHistory() {
  return this.http.get<any[]>(`${environment.apiUrl}/api/sync/history`);
}

  getTranslations(lang: string) {
    return this.http.get<{ [key: string]: string }>(`${environment.apiUrl}/api/Translation/${lang}`);
  ;
  }

getCustomersWithReadyToLoadOrders(): Observable<ICustomer[]> {
  
   return this.http.get<ICustomer[]>(`${environment.apiUrl}/api/customer/with-ready-to-load-orders`);
}
getZonesList(filter?: any): Observable<PagedData<IZone>> {
  const params = new HttpParams({ fromObject: filter || {} });
  return this.http.get<PagedData<IZone>>(
    `${environment.apiUrl}/api/zones/PaginationAndSearch`,
    { params }
  );
}

getZone(zoneId: number) {
  return this.http.get<ApiResponse<IZone>>(
    `${environment.apiUrl}/api/zones/${zoneId}`
  );
}

createZone(data: ICreateZoneDto): Observable<IZone> {
  return this.http.post<IZone>(
    `${environment.apiUrl}/api/zones`,
    data
  );
}

updateZone(id: number, data: IUpdateZoneDto): Observable<IZone> {
  return this.http.put<IZone>(
    `${environment.apiUrl}/api/zones/${id}`,
    data
  );
}

deleteZone(id: number): Observable<any> {
  return this.http.delete(
    `${environment.apiUrl}/api/zones/${id}`
  );
}

getActiveZones(): Observable<ApiResponse<IZone[]>> {
  return this.http.get<ApiResponse<IZone[]>>(`${environment.apiUrl}/api/zones?activeOnly=true`);
}
getActiveCitiesByZone(zoneId: number): Observable<ApiResponse<ICity[]>> {
  return this.http.get<ApiResponse<ICity[]>>(`${environment.apiUrl}/api/cities/zone/${zoneId}?activeOnly=true`);
}


getActiveCities(): Observable<ApiResponse<ICity[]>> {
  return this.http.get<ApiResponse<ICity[]>>(`${environment.apiUrl}/api/cities/zone/activeOnly=true`);
}


  getWeatherByCity(city: string): Observable<WeatherData | null> {
    const url = `${environment.apiUrl}/api/weather?q=${city},TN`;
    return this.http.get<any>(url).pipe(
      map(res => ({
        location: city,
        temperature: Math.round(res.main.temp),
        feels_like: Math.round(res.main.feels_like),
        description: res.weather[0].description,
        icon: `https://openweathermap.org/img/wn/${res.weather[0].icon}@2x.png`,
        humidity: res.main.humidity,
        wind_speed: Math.round(res.wind.speed * 3.6),
        precipitation: res.rain?.['1h'] || res.snow?.['1h'] || 0
      })),
      catchError(err => {
        console.error('Weather error:', err);
        return of(null);
      })
    );
  }

  getWeatherByCoords(lat: number, lon: number, location: string): Observable<WeatherData | null> {
    const url = `${environment.apiUrl}/api/weather/coords?lat=${lat}&lon=${lon}`;
    return this.http.get<any>(url).pipe(
      map(res => ({
        location,
        temperature: Math.round(res.main.temp),
        feels_like: Math.round(res.main.feels_like),
        description: res.weather[0].description,
        icon: `https://openweathermap.org/img/wn/${res.weather[0].icon}@2x.png`,
        humidity: res.main.humidity,
        wind_speed: Math.round(res.wind.speed * 3.6),
        precipitation: res.rain?.['1h'] || res.snow?.['1h'] || 0
      })),
      catchError(err => {
        console.error('Coords error:', err);
        return of(null);
      })
    );
  }

  getWeatherForecast(city: string): Observable<DailyForecast[] | null> {
    const url = `${environment.apiUrl}/api/weather/forecast?q=${city},TN`;
    return this.http.get<any>(url).pipe(
      map(res => {
        if (!res?.list) return null;
        return res.list.map((item: any) => ({
          date: new Date(item.dt * 1000).toISOString().split('T')[0],
          day: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][new Date(item.dt * 1000).getDay()],
          temperature_min: Math.round(item.main.temp_min),
          temperature_max: Math.round(item.main.temp_max),
          description: item.weather[0].description,
          icon: `https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png`,
          precipitation_chance: item.pop ?? 0
        }));
      }),
      catchError(err => {
        console.error('Forecast error:', err);
        return of(null);
      })
    );
  }
    getWeatherForLocations(start: string, end: string) {
    return forkJoin({
      start: this.getWeatherByCity(start),
      end: this.getWeatherByCity(end)
    });
  }
  getWeatherIconClass(iconCode: string): string {
    const iconMap: { [key: string]: string } = {
      '01d': 'wb_sunny', // clear sky day
      '01n': 'nights_stay', // clear sky night
      '02d': 'partly_cloudy_day', // few clouds day
      '02n': 'partly_cloudy_night', // few clouds night
      '03d': 'cloud', // scattered clouds
      '03n': 'cloud',
      '04d': 'cloud_queue', // broken clouds
      '04n': 'cloud_queue',
      '09d': 'rainy', // shower rain
      '09n': 'rainy',
      '10d': 'rainy', // rain
      '10n': 'rainy',
      '11d': 'thunderstorm', // thunderstorm
      '11n': 'thunderstorm',
      '13d': 'ac_unit', // snow
      '13n': 'ac_unit',
      '50d': 'foggy', // mist
      '50n': 'foggy'
    };
    
    return iconMap[iconCode] || 'help_outline';
  }

  getAvailableDriversByDateAndZone(date: string, zoneId?: number, excludeTripId?: number): Observable<any> {
  let url = `${environment.apiUrl}/api/driverAvailability/AvailableDrivers?date=${date}`;
  
  if (zoneId) {
    url += `&zoneId=${zoneId}`;
  }
  
  if (excludeTripId) {
    url += `&excludeTripId=${excludeTripId}`;
  }
  
  return this.http.get<any>(url).pipe(
    catchError(error => {
      console.error('Error loading available drivers by date and zone:', error);
      return of({
        availableDrivers: [],
        unavailableDrivers: [],
        isWeekend: false,
        isCompanyDayOff: false,
        filteredZoneId: zoneId || null,
        date: date
      });
    })
  );
}

getDriversByZone(zoneId: number): Observable<IDriver[]> {
  return this.http.get<IDriver[]>(`${environment.apiUrl}/api/drivers/zone/${zoneId}`);
}
getCitiesByZone(zoneId: number): Observable<any> {

  return this.http.get(`${environment.apiUrl}/api/cities/zone/${zoneId}`);
  
}
getDriversAvailability(request: AvailabilityRequestDto): Observable<DriverAvailabilityDto[]> {
  return this.http.post<DriverAvailabilityDto[]>(
    `${environment.apiUrl}/api/driverovertime/availability`, 
    request
  );
}

checkDriverOvertime(data: DriverOvertimeCheckDto): Observable<DriverOvertimeResultDto> {
  return this.http.post<DriverOvertimeResultDto>(
    `${environment.apiUrl}/api/driverovertime/check`, 
    data
  );
}


checkDriverRealTimeAvailability(
  driverId: number, 
  date: string, 
  startTime: Date, 
  tripDuration: number, 
  excludeTripId?: number
): Observable<any> {
  const body = {
    driverId,
    date,
    startTime,
    tripDuration,
    excludeTripId
  };
  return this.http.post(`${environment.apiUrl}/api/DriverOvertime/check-driver-availability-real-time`, body);
}

checkDriverAvailabilityWithTripDuration(
  driverId: number, 
  date: string, 
  tripDuration: number, 
  excludeTripId?: number
): Observable<any> {
  const body = {
    driverId,
    date,
    tripDuration,
    excludeTripId
  };
  return this.http.post(`${environment.apiUrl}/api/DriverOvertime/check-driver-with-trip-duration`, body);
}


getDateStatistics(date: string): Observable<any> {
  return this.http.get(`${environment.apiUrl}/api/trips/statistics/date/${date}`).pipe(
    catchError(error => {
      console.error('Erreur statistiques date:', error);
      return of({
        totalClients: 0,
        totalOrders: 0,
        plannedTrips: 0,
        availableDrivers: 0
      });
    })
  );
}
getAvailableTrucksByDate(date: string, excludeTripId?: number): Observable<any> {
  let url = `${environment.apiUrl}/api/trucks/available?date=${date}`;
  if (excludeTripId) {
    url += `&excludeTripId=${excludeTripId}`;
  }
  return this.http.get(url);
}
getAvailableTrucksByZoneAndDate(zoneId: number, date: string, excludeTripId?: number): Observable<any> {

  return this.getAvailableTrucksByDate(date, excludeTripId)
    .pipe(
      map(response => {

        if (response && response.data) {
          const data = response.data;
          
          return {
            data: {
              availableTrucks: data.availableTrucks?.filter((truck: any) => {
                const truckZoneId = truck.ZoneId || truck.zoneId;
                return truckZoneId === zoneId;
              }) || [],
              unavailableTrucks: data.unavailableTrucks?.filter((truck: any) => {
                const truckZoneId = truck.ZoneId || truck.zoneId;
                return truckZoneId === zoneId;
              }) || []
            }
          };
        }
        return response;
      })
    );
}

getClientName(customerId: number): Observable<string> {
  if (!customerId) return of('Non spécifié');

  return this.http
    .get(`${environment.apiUrl}/api/customer/${customerId}/name`, { 
      responseType: 'text' 
    })
    .pipe(
      tap(name => console.log('API Response:', name)),
      catchError((error) => {
        console.error('API Error:', error);
        return of('Client inconnu');
      })
    );
}
 getAllCustomers() {
    return this.http.get<ICustomer[]>(environment.apiUrl + '/api/customer/list');
  }

  // ===== EMPLOYEE =====
  getEmployeesList(filter: any) {
    const params = new HttpParams({ fromObject: filter });
    return this.http.get<PagedData<any>>(environment.apiUrl + '/api/Employee/PaginationAndSearch?' + params.toString());
  }

  getEmployee(id: number) {
    return this.http.get<any>(environment.apiUrl + '/api/Employee/' + id);
  }

  addEmployee(employeeData: any) {
    return this.http.post(environment.apiUrl + '/api/Employee', employeeData);
  }

  updateEmployee(id: number, employeeData: any) {
    return this.http.put(environment.apiUrl + '/api/Employee/' + id, employeeData);
  }

  deleteEmployee(id: number) {
    return this.http.delete(environment.apiUrl + '/api/Employee/' + id);
  }

  enableEmployee(id: number) {
    return this.http.put(environment.apiUrl + `/api/Employee/${id}`, { isEnable: true });
  }

  downloadEmployeeAttachment(id: number) {
    return this.http.get(environment.apiUrl + `/api/Employee/${id}/download-attachment`, {
      responseType: 'blob'
    });
  }

  getTruckTypes() {
    return this.http.get<any[]>(environment.apiUrl + '/api/TruckType');
  }
  getTypeTrucksList(filter: any) {
  return this.http.get<PagedData<ITypeTruck>>(`${environment.apiUrl}/api/TypeTruck`, { params: filter });
}

getTypeTruck(id: number) {
  return this.http.get<ITypeTruck>(`${environment.apiUrl}/api/TypeTruck/${id}`);
}

addTypeTruck(typeTruck: ITypeTruck) {
  return this.http.post<ITypeTruck>(`${environment.apiUrl}/api/TypeTruck`, typeTruck);
}

updateTypeTruck(id: number, typeTruck: ITypeTruck) {
  return this.http.put<ITypeTruck>(`${environment.apiUrl}/api/TypeTruck/${id}`, typeTruck);
}

deleteTypeTruck(id: number) {
  return this.http.delete(`${environment.apiUrl}/api/TypeTruck/${id}`);
}
 getTypeTrucks() {
    return this.http.get<ICustomer[]>(environment.apiUrl + '/api/TypeTruck/list');
  }
getTrucksByDate(date: Date, locationId?: number): Observable<ITruck[]> {
  const params = new HttpParams()
    .set('date', date.toISOString())
    .set('locationId', locationId?.toString() || '');
    
  return this.http.get<ITruck[]>(`${environment.apiUrl}/api/trucks/available`, { params }).pipe(
    catchError(error => {
      console.error('Error in getTrucksByDate:', error);
      return of([]);
    })
  );
}
}



