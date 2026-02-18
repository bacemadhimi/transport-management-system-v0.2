// app.routes.ts
import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Profile } from './pages/profile/profile';
import { AuthGuard } from './services/auth.guard'; 
import { User } from './pages/user/user';
import { Truck } from './pages/truck/truck';
import { Driver } from './pages/driver/driver';
import { Employee } from './pages/employee/employee';
import { Trip } from './pages/trip/trip';
import { HistoricTrip } from './pages/historic-trip/historic-trip';

import { Customer } from './pages/customer/customer';
import { FuelVendor } from './pages/fuel-vendor/fuel-vendor';
import { Fuel } from './pages/fuel/fuel';
import { Mechanic } from './pages/mechanic/mechanic';
import { Vendor } from './pages/vendor/vendor';

import { Permissions } from './pages/permissions/permissions';
import { Maintenance } from './pages/maintenance/maintenance';
import { Role } from './pages/role/role';
import { TrajectComponent } from './pages/traject/traject';
import { LocationComponent } from './pages/location/location';
import { Convoyeur } from './pages/convoyeur/convoyeur';
import { DayOff } from './pages/day-off/day-off';
import { Overtime } from './pages/overtime/overtime';
import { AvailabilityComponent } from './pages/availability/availability';
import { OrdersComponent } from './pages/order/order';
import { TruckAvailabilityComponent } from './pages/truck-availability/truck-availability';
import { SyncComponent } from './pages/sync/sync';
import { ZoneComponent } from './pages/zone/zone';
import { CityComponent } from './pages/city/city';

import { StatisticsComponent } from './pages/statistics/statistics.component';
import { OrderSettingsComponent } from './pages/order-settings/order-settings';
import { TripCreatePageComponent } from './pages/trip-create-page.component/trip-create-page.component';
import { TripEditPageComponent } from './pages/trip-edit-page.component/trip-edit-page.component';
import { TripsSettingsComponent } from './pages/trips-settings/trips-settings';


export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: "login",
    component: Login,
  },
  {
    path: "home",
    component: Home,
    canActivate: [AuthGuard]
  },
  {
    path: 'drivers',
    component: Driver,
    canActivate: [AuthGuard]
  },

  {
    path: 'employees',
    component: Employee,
    canActivate: [AuthGuard]
  },

  {
    path: 'profile',
    component: Profile,
    canActivate: [AuthGuard]
  },

  {
  path: 'user',
  component: User,
},
  {
    path: "trucks",
    component: Truck,
    canActivate: [AuthGuard]  
  },
  {
    path: "trips",
    component: Trip,
    canActivate: [AuthGuard]  
  },
    {
    path: "historic-trips",
    component: HistoricTrip,
    canActivate: [AuthGuard]  
  },
  {
    path: "customers",
    component: Customer,
    canActivate: [AuthGuard]  
  },
  {
    path: "fuel-vendors",
    component: FuelVendor,
    canActivate: [AuthGuard]  
  },
  {
    path: "fuels",
    component: Fuel,
    canActivate: [AuthGuard]  
  },
{
    path: "mechanics",
    component: Mechanic,
    canActivate: [AuthGuard]  
  },
{
    path: "vendors",
    component: Vendor,
    canActivate: [AuthGuard]  
  },

{
    path: "roles",
    component: Role,
    canActivate: [AuthGuard]  
  },
 
{
  path: "permissions",
  component: Permissions,
  canActivate: [AuthGuard]
},
{
    path: 'trajects',
    component: TrajectComponent,
    canActivate: [AuthGuard]
  },
   {
    path: 'locations',
    component: LocationComponent,
    canActivate: [AuthGuard]
  },
  {
  path: 'convoyeurs',
  component: Convoyeur,
  canActivate: [AuthGuard]
},
{
    path: 'dayoff', 
    component: DayOff,
    canActivate: [AuthGuard]
  },
{
    path: 'overtime',
    component: Overtime,
    canActivate: [AuthGuard]
  },
  {
  path: 'availability',
  component: AvailabilityComponent,
  canActivate: [AuthGuard]
},

  {
  path: 'maintenance',
  component: Maintenance,
  canActivate: [AuthGuard]
},
{
    path: 'orders',
    component: OrdersComponent,
    canActivate: [AuthGuard]
  }
  ,
  {
  path: 'truck-availability',
  component: TruckAvailabilityComponent,
  canActivate: [AuthGuard]
},
{
  path: 'sync',
  component: SyncComponent,
  canActivate: [AuthGuard] // si tu en as un
},
   {
    path: 'zones',
    component: ZoneComponent,
    canActivate: [AuthGuard]
  },

  {
    path: 'city',
    component: CityComponent,
    canActivate: [AuthGuard]
  }
  ,

  {
  path: 'statics',
  component: StatisticsComponent,
  canActivate: [AuthGuard]
},
  {
  path: 'order-settings',
  component: OrderSettingsComponent,
  canActivate: [AuthGuard]
}
,
  {
    path: 'trips/create',
    component: TripCreatePageComponent
  },
  {
    path: 'trips/edit/:id',
    component: TripEditPageComponent
  },
   {
  path: 'trips-settings',
  component: TripsSettingsComponent,
  canActivate: [AuthGuard]
}
];