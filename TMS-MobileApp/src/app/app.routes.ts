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
    loadComponent: () => import('./profile/profile.page').then( m => m.ProfilePage)
  },
{
    path: 'chat',
    loadComponent: () => import('./pages/chat/chat.component').then( m => m.ChatComponent),
    canActivate: [authGuard]
  },
  {
    path: 'barcode-test',
    loadComponent: () => import('./pages/barcode-test/barcode-test.page').then( m => m.BarcodeTestPage),
    canActivate: [authGuard]
  }
 
];