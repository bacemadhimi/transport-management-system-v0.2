// src/app/services/auth.ts
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal, NgZone } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { IAuthToken } from '../types/auth';
import { Router } from '@angular/router';
import { IUser } from '../types/user';
import { Observable, tap } from 'rxjs';
import { JwtHelperService } from '@auth0/angular-jwt';
import { LogoService } from './logo.service';
import { GoogleAuthService } from './google-auth.service';

@Injectable({ providedIn: 'root' })
export class Auth {
  http = inject(HttpClient);
  user = signal<IUser | null>(null);
  router = inject(Router);
  private ngZone = inject(NgZone);
  private jwtHelper = new JwtHelperService();
  private logoService = inject(LogoService);
  private googleAuthService = inject(GoogleAuthService);

  private logoutTimer: any;
  private tokenCheckInterval: any;

  login(email: string, password: string) {
    return this.http.post<IAuthToken>(`${environment.apiUrl}/api/Auth/login`, { email, password })
      .pipe(
        tap((authToken) => {
          this.saveToken(authToken);
          this.setLogoutTimer(authToken.token);
          this.startTokenCheck();
          this.logoService.refresh();
          this.loadLoggedInUser(); 
        })
      );
  }

  // MÉTHODE CORRIGÉE : Login avec Google
  loginWithGoogle(): Observable<IAuthToken> {
    return new Observable(observer => {
      // Définir cleanup d'abord
      const cleanup = () => {
        window.removeEventListener('google-auth-success', successHandler as EventListener);
        window.removeEventListener('google-auth-error', errorHandler as EventListener);
      };

      const successHandler = (event: Event) => {
        const customEvent = event as CustomEvent;
        const googleData = customEvent.detail;
        console.log('🔐 Google auth success, sending to backend...');
        
        // Envoyer les données Google à votre backend
        this.http.post<IAuthToken>(`${environment.apiUrl}/api/Auth/google-login`, {
          email: googleData.email,
          name: googleData.name,
          picture: googleData.picture,
          googleToken: googleData.accessToken,
          idToken: googleData.idToken
        }).subscribe({
          next: (authToken) => {
            console.log('✅ Backend auth success');
            this.saveToken(authToken);
            this.setLogoutTimer(authToken.token);
            this.startTokenCheck();
            this.logoService.refresh();
            this.loadLoggedInUser();
            
            observer.next(authToken);
            observer.complete();
            cleanup();
          },
          error: (error) => {
            console.error('❌ Backend Google auth error:', error);
            observer.error(error);
            cleanup();
          }
        });
      };

      const errorHandler = (event: Event) => {
        const customEvent = event as CustomEvent;
        console.error('❌ Google auth error:', customEvent.detail);
        observer.error(customEvent.detail);
        cleanup();
      };

      window.addEventListener('google-auth-success', successHandler as EventListener);
      window.addEventListener('google-auth-error', errorHandler as EventListener);

      // Déclencher le login Google
      this.googleAuthService.login();
    });
  }

  saveToken(authToken: IAuthToken) {
    localStorage.setItem("authLila", JSON.stringify(authToken));
    localStorage.setItem('token', authToken.token);
  }

  logout() {
    console.log('Logging out - user initiated or token expired');

    // Nettoyer les timers
    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
      this.logoutTimer = null;
    }

    if (this.tokenCheckInterval) {
      clearInterval(this.tokenCheckInterval);
      this.tokenCheckInterval = null;
    }

    // Déconnexion de Google si l'utilisateur s'est connecté via Google
    try {
      // Optionnel : déconnecter de Google aussi
      if (typeof google !== 'undefined' && google?.accounts) {
        google.accounts.id.disableAutoSelect();
      }
    } catch (e) {
      console.warn('Could not sign out from Google', e);
    }

    // Nettoyer le localStorage
    localStorage.removeItem('authLila');
    localStorage.removeItem('token');
    localStorage.removeItem('google_user_data');
    this.user.set(null);

    // Rediriger vers la page de login
    this.ngZone.run(() => {
      this.router.navigateByUrl('/login', { replaceUrl: true });
    });
  }

  private startTokenCheck() {
    if (this.tokenCheckInterval) {
      clearInterval(this.tokenCheckInterval);
    }

    this.ngZone.runOutsideAngular(() => {
      this.tokenCheckInterval = setInterval(() => {
        this.ngZone.run(() => {
          this.checkTokenExpiration();
        });
      }, 1000);
    });
  }

  private checkTokenExpiration() {
    const token = localStorage.getItem('token');
    const currentUrl = this.router.url;

    if (currentUrl.includes('/login')) {
      return;
    }

    if (token) {
      try {
        if (this.jwtHelper.isTokenExpired(token)) {
          console.log('Token expired at:', new Date().toLocaleTimeString());
          this.logout();
        }
      } catch (error) {
        console.error('Error checking token:', error);
        this.logout();
      }
    } else if (!currentUrl.includes('/login')) {
      this.logout();
    }
  }

  private setLogoutTimer(token: string) {
    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
    }

    const expirationDate = this.jwtHelper.getTokenExpirationDate(token);
    if (!expirationDate) return;

    const expiresIn = expirationDate.getTime() - new Date().getTime();
    console.log(`Token expires in ${Math.floor(expiresIn / 1000)} seconds`);

    this.logoutTimer = setTimeout(() => {
      console.log('Token expiration timer triggered');
      this.logout();
    }, expiresIn);
  }

  checkTokenOnInit() {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        if (this.jwtHelper.isTokenExpired(token)) {
          console.log('Token expired on init');
          this.logout();
          return false;
        } else {
          console.log('Token valid on init');
          this.setLogoutTimer(token);
          this.startTokenCheck();
          return true;
        }
      } catch (error) {
        console.error('Error checking token on init:', error);
        this.logout();
        return false;
      }
    }
    return false;
  }

  get isLoggedIn(): boolean {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
      if (this.jwtHelper.isTokenExpired(token)) {
        console.log('Token expired in getter');
        // Ne pas appeler logout() ici pour éviter les boucles infinies
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error in isLoggedIn:', error);
      return false;
    }
  }

  get authDetail(): IAuthToken | null {
    const token = localStorage.getItem('authLila');
    return token ? JSON.parse(token) : null;
  }

  hasRole(role: string): boolean {
    const roles = this.authDetail?.roles ?? [];
    return roles.includes(role);
  }

  hasPermission(permission: string): boolean {
    if (this.hasRole('SuperAdmin')) return true;
    const permissions = this.authDetail?.permissions ?? [];
    return permissions.includes(permission);
  }

  hasEntityAccess(entity: string): boolean {
    if (this.hasRole('SuperAdmin')) return true;
    const perms = this.authDetail?.permissions ?? [];
    return perms.some(p => p.startsWith(entity + '_'));
  }

  // Méthodes d'accès spécifiques
  hasAccueilAccess(): boolean { return this.hasEntityAccess('ACCUEIL'); }
  hasChauffeurAccess(): boolean { return this.hasEntityAccess('CHAUFFEUR'); }
  hasConvoyeurAccess(): boolean { return this.hasEntityAccess('CONVOYEUR'); }
  hasTruckAccess(): boolean { return this.hasEntityAccess('TRUCK'); }
  hasOrderAccess(): boolean { return this.hasEntityAccess('ORDER'); }
  hasTravelAccess(): boolean { return this.hasEntityAccess('TRAVEL'); }
  hasHistoriqueTravelAccess(): boolean { return this.hasEntityAccess('HISTORIQUE_TRAVEL'); }
  hasLocationAccess(): boolean { return this.hasEntityAccess('LOCATION'); }
  hasUserAccess(): boolean { return this.hasEntityAccess('USER'); }
  hasUserGroupAccess(): boolean { return this.hasEntityAccess('USER_GROUP'); }
  hasPermissionAccess(): boolean { return this.hasEntityAccess('PERMISSION'); }
  hasCustomerAccess(): boolean { return this.hasEntityAccess('CUSTOMER'); }
  hasFuelVendorAccess(): boolean { return this.hasEntityAccess('FUEL_VENDOR'); }
  hasFuelAccess(): boolean { return this.hasEntityAccess('FUEL'); }
  hasMechanicAccess(): boolean { return this.hasEntityAccess('MECHANIC'); }
  hasVendorAccess(): boolean { return this.hasEntityAccess('VENDOR'); }
  hasTruckMaintenanceAccess(): boolean { return this.hasEntityAccess('TRUCK_MAINTENANCE'); }
  hasOvertimeAccess(): boolean { return this.hasEntityAccess('OVERTIME'); }
  hasAvailabilityAccess(): boolean { return this.hasEntityAccess('AVAILABILITY'); }
  hasDayoffAccess(): boolean { return this.hasEntityAccess('DAYOFF'); }

  get profileImage(): string | null {
    const pic = this.user()?.profileImage;
    return pic ? `data:image/jpeg;base64,${pic}` : null;
  }

  getProfile() {
    return this.http.get(`${environment.apiUrl}/api/Auth/profile`);
  }

  updateProfile(profile: any) {
    return this.http.post(`${environment.apiUrl}/api/Auth/profile`, profile);
  }

  forgotPassword(email: string) {
    return this.http.post(`${environment.apiUrl}/api/Auth/forgot-password`, { email });
  }

  loadLoggedInUser(): void {
    const userId = this.authDetail?.id;
    if (!userId) return;

    this.http.get<IUser>(`${environment.apiUrl}/api/user/${userId}`).subscribe({
      next: user => this.user.set(user),
      error: () => this.user.set(null)
    });
  }

  changePassword(data: { oldPassword: string; newPassword: string }): Observable<any> {
    return this.http.post(`${environment.apiUrl}/api/auth/change-password`, data);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isTokenValid(): boolean {
    const token = this.getToken();
    if (!token) return false;
    
    try {
      return !this.jwtHelper.isTokenExpired(token);
    } catch {
      return false;
    }
  }

  ensureAuthentication(): boolean {
    if (!this.isLoggedIn || !this.isTokenValid()) {
      console.warn('Token invalide ou expiré, redirection vers login');
      this.logout();
      return false;
    }
    return true;
  }

  // Méthode utilitaire pour savoir si l'utilisateur s'est connecté via Google
  isGoogleLogin(): boolean {
    const googleData = localStorage.getItem('google_user_data');
    return !!googleData;
  }

  // Méthode pour rafraîchir le token
  refreshToken(): Observable<IAuthToken> {
    const currentToken = this.getToken();
    return this.http.post<IAuthToken>(`${environment.apiUrl}/api/Auth/refresh-token`, {
      token: currentToken
    }).pipe(
      tap((authToken) => {
        this.saveToken(authToken);
        this.setLogoutTimer(authToken.token);
      })
    );
  }
}

// Déclaration pour l'objet global google
declare const google: any;