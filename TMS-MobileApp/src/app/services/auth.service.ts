import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IAuthToken, ILoginRequest } from '../types/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  http = inject(HttpClient);
  router = inject(Router);

 
  isLoggedInSignal = signal<boolean>(false);
  currentUser = signal<IAuthToken | null>(null);

  constructor() {
   
    this.checkAuthStatus();
  }

  isLoggedIn(): boolean {
    return this.isLoggedInSignal();
  }

  login(credentials: ILoginRequest) {

    return new Promise<IAuthToken>((resolve, reject) => {
      setTimeout(() => {
        if (credentials.email && credentials.password) {
          const mockToken: IAuthToken = {
            id: 1,
            email: credentials.email,
            token: 'mock-jwt-token',
            role: 'driver'
          };
          this.saveToken(mockToken);
          resolve(mockToken);
        } else {
          reject({ message: 'Invalid credentials' });
        }
      }, 1000);
    });
  }

  saveToken(authToken: IAuthToken) {
    localStorage.setItem('authToken', JSON.stringify(authToken));
    localStorage.setItem('token', authToken.token);
    this.currentUser.set(authToken);
    this.isLoggedInSignal.set(true);
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
}