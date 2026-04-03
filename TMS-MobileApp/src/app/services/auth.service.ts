import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IAuthToken, ILoginRequest } from '../types/auth';
import { SignalrGpsService } from './signalr-gps.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  http = inject(HttpClient);
  router = inject(Router);
  private signalrGpsService = inject(SignalrGpsService);


  isLoggedInSignal = signal<boolean>(false);
  currentUser = signal<IAuthToken | null>(null);

  constructor() {

    this.checkAuthStatus();
  }

  isLoggedIn(): boolean {
    return this.isLoggedInSignal();
  }

  async login(credentials: ILoginRequest): Promise<IAuthToken> {

    return new Promise<IAuthToken>((resolve, reject) => {
      setTimeout(async () => {
        if (credentials.email && credentials.password) {
          const mockToken: IAuthToken = {
            id: 1,
            email: credentials.email,
            token: 'mock-jwt-token',
            role: 'driver'
          };
          await this.saveToken(mockToken);
          resolve(mockToken);
        } else {
          reject({ message: 'Invalid credentials' });
        }
      }, 1000);
    });
  }

  async saveToken(authToken: IAuthToken) {
    localStorage.setItem('authToken', JSON.stringify(authToken));
    localStorage.setItem('token', authToken.token);
    this.currentUser.set(authToken);
    this.isLoggedInSignal.set(true);

    // Connect to SignalR GPS hub if user is a driver
    if (authToken.role === 'driver' || authToken.role === 'Driver') {
      console.log('🔌 Driver logged in, connecting to GPS SignalR hub...');
      try {
        // Pass driver ID (for drivers, UserId = DriverId)
        await this.signalrGpsService.connect(authToken.id);
        console.log('✅ Connected to GPS SignalR hub and joined driver group');
      } catch (error) {
        console.error('❌ Error connecting to GPS SignalR hub:', error);
      }
    }
  }

  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    this.currentUser.set(null);
    this.isLoggedInSignal.set(false);
    this.router.navigate(['/login']);
  }

  private checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const authData = JSON.parse(token);
        this.currentUser.set(authData);
        this.isLoggedInSignal.set(true);
      } catch (error) {
        this.logout();
      }
    }
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
 updateCurrentUser(updatedData: any) {
  const currentUser = this.currentUser();
  if (currentUser) {
    const updatedUser = { ...currentUser, ...updatedData };
     
    localStorage.setItem('authToken', JSON.stringify(updatedUser));
    
    this.currentUser.set(updatedUser);
    
    return updatedUser;
  }
  return null;
}
  getCurrentUserId(): number {
  const user = this.currentUser();
  return user?.id || 0;
}
  getCurrentUserName(): string {
    const user = this.currentUser();
    return user?.name || user?.email?.split('@')[0] || 'Unknown User';
  }
  getCurrentUserIdString(): string {
  const user = this.currentUser();
  return user?.id?.toString() || '';
}
}