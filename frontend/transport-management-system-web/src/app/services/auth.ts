import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { IAuthToken } from '../types/auth';
import { Router } from '@angular/router';
import { IUser } from '../types/user';
import { Observable } from 'rxjs';
import { JwtHelperService } from '@auth0/angular-jwt';

@Injectable({ providedIn: 'root' })
export class Auth {
  http = inject(HttpClient);
  user = signal<IUser | null>(null);
  router = inject(Router);
  private jwtHelper = new JwtHelperService();

  // ----------- Auth & Token ----------------
  login(email: string, password: string) {
    return this.http.post<IAuthToken>(`${environment.apiUrl}/api/Auth/login`, { email, password });
  }

  saveToken(authToken: IAuthToken) {
    localStorage.setItem("authLila", JSON.stringify(authToken));
    localStorage.setItem('token', authToken.token);
  }

  logout() {
    localStorage.removeItem('authLila');
    localStorage.removeItem('token');
    this.router.navigateByUrl("/login");
  }

  get isLoggedIn(): boolean {
    const token = localStorage.getItem('token');
    if (!token) return false;
    return !this.jwtHelper.isTokenExpired(token);
  }

  get authDetail(): IAuthToken | null {
    const token = localStorage.getItem('authLila');
    return token ? JSON.parse(token) : null;
  }

  // ----------- Roles & Permissions ----------------
  hasRole(role: string): boolean {
    const roles = this.authDetail?.roles ?? [];
    return roles.includes(role);
  }

  hasPermission(permission: string): boolean {
    if (this.hasRole('SuperAdmin')) return true; // SuperAdmin a tout
    const permissions = this.authDetail?.permissions ?? [];
    return permissions.includes(permission);
  }

  /**
   * Vérifie si l'utilisateur a au moins un droit sur une entité
   * @param entity : nom de l'entité, ex: 'CONVOYEUR', 'TRUCK'
   */
  hasEntityAccess(entity: string): boolean {
    if (this.hasRole('SuperAdmin')) return true;
    const perms = this.authDetail?.permissions ?? [];
    // Cherche si l'utilisateur a au moins un droit CRUD ou PRINT sur l'entité
    return perms.some(p => p.startsWith(entity + '_'));
  }

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
  // Dans votre service Auth, ajoutez cette méthode
loginWithGoogle(): Observable<any> {
  // Implémentation selon votre backend
  // Exemple avec AngularFire ou OAuth2
  return this.http.post(`${environment.apiUrl}/auth/google`, {});
  
  // Ou avec Firebase
  // return from(this.afAuth.signInWithPopup(new GoogleAuthProvider()));
}
}
