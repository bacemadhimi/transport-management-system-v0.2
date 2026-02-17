// auth.guard.ts
import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Auth } from './auth';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  private authService = inject(Auth);
  private router = inject(Router);

canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
  if (this.authService.isLoggedIn) {
    return true;
  } else {
    this.authService.logout(); 
    this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
}
}