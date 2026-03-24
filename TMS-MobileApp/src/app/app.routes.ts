import { Routes } from '@angular/router';
import { LoginPage } from './pages/login/login.page';
import { HomePage } from './pages/home/home.page';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginPage
  },
  {
    path: 'home',
    component: HomePage,
    canActivate: [authGuard]
  },
  {
    path: 'cancelled-trips',
    loadComponent: () => import('./pages/cancelled-trips/cancelled-trips.page').then( m => m.CancelledTripsPage),
    canActivate: [authGuard]
  },
  {
    path: 'notifications',
    loadComponent: () => import('./pages/notifications/notifications.page').then( m => m.NotificationsPage),
    canActivate: [authGuard]
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile.page').then( m => m.ProfilePage),
    canActivate: [authGuard]
  },
  {
    path: 'trip/:tripId',
    loadComponent: () => import('./pages/trip-workflow/trip-workflow.page').then( m => m.TripWorkflowPage),
    canActivate: [authGuard]
  },
  {
    path: 'trip/:tripId/gps',
    loadComponent: () => import('./pages/gps-tracking/gps-tracking.page').then( m => m.GPSTrackingPage),
    canActivate: [authGuard]
  },
  {
    path: 'gps-tracking',
    loadComponent: () => import('./pages/gps-tracking/gps-tracking.page').then( m => m.GPSTrackingPage),
    canActivate: [authGuard]
  },
  {
    path: 'my-trips',
    loadComponent: () => import('./pages/my-trips/my-trips.page').then( m => m.MyTripsPage),
    canActivate: [authGuard]
  },
  {
    path: 'trip-history',
    loadComponent: () => import('./pages/trip-history/trip-history.page').then( m => m.TripHistoryPage),
    canActivate: [authGuard]
  }

  // Future routes will be added here
];